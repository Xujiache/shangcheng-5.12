import { createHash, randomUUID } from 'node:crypto'
import { spawn, ChildProcess } from 'node:child_process'
import { createRequire } from 'node:module'
import { createWriteStream } from 'node:fs'
import { lstat, mkdir, mkdtemp, realpath, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, extname, join, resolve, sep } from 'node:path'
import { finished, pipeline } from 'node:stream/promises'
import { Transform } from 'node:stream'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
import { Client } from 'minio'
import { assertPrivateConversionBucket } from '../modules/ledger-conversion/conversion.storage'

const QUEUE = 'ledger:conversions:queue'
const WORKER_HEARTBEAT = 'ledger:conversions:worker:online'
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000
const sourceDir = process.env.FLYINGMOUSE_SOURCE_DIR || '/app/flyingmouse'
const bucket = process.env.CONVERSION_BUCKET || 'jiujiu-conversions'
const prisma = new PrismaClient()
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: null,
})
let running = true
let activeChild: ChildProcess | null = null
const safeOutputName = (name: string) =>
  basename(String(name || '').replaceAll('\\', '/'))
    .replace(/[\x00-\x1f\x7f]/g, '')
    .slice(0, 180)

function minioClient() {
  const url = new URL(process.env.S3_ENDPOINT || 'http://127.0.0.1:9000')
  const accessKey = process.env.S3_ACCESS_KEY || ''
  const secretKey = process.env.S3_SECRET_KEY || ''
  if (process.env.NODE_ENV === 'production' && (!accessKey || !secretKey))
    throw new Error('S3 credentials missing')
  return new Client({
    endPoint: url.hostname,
    port: Number(url.port) || (url.protocol === 'https:' ? 443 : 80),
    useSSL: url.protocol === 'https:',
    accessKey: accessKey || 'minioadmin',
    secretKey: secretKey || 'minioadmin',
  })
}
const storage = minioClient()

function terminate(child: ChildProcess) {
  if (!child.pid) return
  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    child.kill('SIGTERM')
  }
  const timer = setTimeout(() => {
    try {
      process.kill(-child.pid!, 'SIGKILL')
    } catch {
      child.kill('SIGKILL')
    }
  }, 5000)
  timer.unref()
}

async function downloadUpload(upload: any, directory: string) {
  const original = basename(upload.fileName.replaceAll('\\', '/'))
  const extension = extname(original)
  const stem = original
    .slice(0, -extension.length || undefined)
    .replace(/[^\p{L}\p{N}._-]/gu, '_')
    .slice(0, 100)
  const fileName = `${stem}${extension}`
  const uploadDir = join(directory, upload.id)
  await mkdir(uploadDir)
  const filePath = join(uploadDir, fileName)
  for (const part of upload.chunks) {
    const hash = createHash('sha256')
    const verify = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        hash.update(chunk)
        callback(null, chunk)
      },
    })
    await pipeline(
      await storage.getObject(bucket, part.objectKey),
      verify,
      createWriteStream(filePath, { flags: 'a' }),
    )
    if (hash.digest('hex') !== part.sha256)
      throw new Error(`输入分片校验失败: ${upload.id}/${part.index}`)
  }
  if ((await stat(filePath)).size !== Number(upload.totalBytes))
    throw new Error(`输入文件长度不符: ${upload.id}`)
  return filePath
}

function operationArgs(
  operationId: string,
  files: string[],
  options: Record<string, string>,
  outputDir: string,
) {
  if (operationId === 'images-to-pdf')
    return ['images-to-pdf', ...files, '--output-dir', outputDir, '--json']
  if (operationId === 'merge-pdfs')
    return ['merge-pdfs', ...files, '--output-dir', outputDir, '--json']
  if (!operationId.startsWith('convert:')) throw new Error('未知转换操作')
  const target = operationId.slice('convert:'.length)
  if (!/^[a-z0-9]{2,8}$/.test(target)) throw new Error('目标格式不正确')
  const args = ['convert', ...files, '--to', target, '--output-dir', outputDir, '--json']
  for (const [key, flag] of Object.entries({
    videoCodec: '--video-codec',
    textEncoding: '--text-encoding',
    pdfAction: '--pdf-action',
  })) {
    if (options[key]) args.push(flag, options[key])
  }
  return args
}

async function runCli(jobId: string, leaseId: string, args: string[]) {
  const child = spawn(process.execPath, [join(sourceDir, 'cli.js'), ...args], {
    cwd: sourceDir,
    env: { ...process.env, FLYINGMOUSE_LOG_STDERR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  })
  activeChild = child
  let stdout = ''
  let stderr = ''
  child.stdout?.on('data', (chunk) => {
    stdout += String(chunk)
    if (stdout.length > 2_000_000) terminate(child)
  })
  child.stderr?.on('data', (chunk) => {
    stderr = (stderr + String(chunk)).slice(-16_000)
  })
  const watcher = setInterval(async () => {
    try {
      const heartbeat = await prisma.ledgerConversionJob.updateMany({
        where: { id: jobId, leaseId, status: 'running' },
        data: { heartbeatAt: new Date() },
      })
      if (!heartbeat.count) terminate(child)
    } catch {
      /* DB recovery will reclaim the lease if heartbeats stop. */
    }
  }, 10_000)
  try {
    const exitCode: number = await new Promise((resolveExit, rejectExit) => {
      child.once('error', rejectExit)
      child.once('exit', (code) => resolveExit(code ?? 1))
    })
    if (exitCode !== 0) throw new Error(`转换引擎退出 ${exitCode}: ${stderr.slice(-1000)}`)
    const parsed = JSON.parse(stdout.trim())
    if (!parsed.ok || !Array.isArray(parsed.outputs)) throw new Error('转换引擎未返回结果清单')
    return parsed.outputs as {
      path: string
      fileName: string
      mimeType: string
      warnings: unknown[]
    }[]
  } finally {
    clearInterval(watcher)
    activeChild = null
  }
}

async function zipOutputs(files: { path: string; fileName: string }[], dest: string) {
  const vendorRequire = createRequire(join(sourceDir, 'package.json'))
  const yazl = vendorRequire('yazl')
  const zip = new yazl.ZipFile()
  const used = new Set<string>()
  for (const file of files) {
    let name = safeOutputName(file.fileName)
    if (!name) throw new Error('转换引擎结果文件名无效')
    let suffix = 2
    while (used.has(name)) name = `${suffix++}-${safeOutputName(file.fileName)}`
    used.add(name)
    zip.addFile(file.path, name)
  }
  zip.end()
  const out = createWriteStream(dest)
  zip.outputStream.pipe(out)
  await finished(out)
}

async function processJob(id: string) {
  const leaseId = randomUUID()
  const claimed = await prisma.ledgerConversionJob.updateMany({
    where: { id, status: 'queued' },
    data: {
      status: 'running',
      leaseId,
      startedAt: new Date(),
      heartbeatAt: new Date(),
      progress: 1,
    },
  })
  if (!claimed.count) return
  const work = await mkdtemp(join(tmpdir(), 'ledger-conversion-'))
  const writtenKeys: string[] = []
  let leaseLost = false
  const heartbeat = setInterval(async () => {
    try {
      const current = await prisma.ledgerConversionJob.updateMany({
        where: { id, leaseId, status: 'running' },
        data: { heartbeatAt: new Date() },
      })
      if (!current.count) {
        leaseLost = true
        if (activeChild) terminate(activeChild)
      }
    } catch {
      /* A stale lease will be recovered by the API scheduler. */
    }
  }, 10_000)
  const assertLease = async () => {
    if (leaseLost) throw new Error('任务已取消或租约已过期')
    const current = await prisma.ledgerConversionJob.findUnique({
      where: { id },
      select: { status: true, leaseId: true },
    })
    if (current?.status !== 'running' || current.leaseId !== leaseId)
      throw new Error('任务已取消或租约已过期')
  }
  try {
    const job = await prisma.ledgerConversionJob.findUniqueOrThrow({
      where: { id },
      include: {
        uploads: {
          include: { chunks: { orderBy: { index: 'asc' } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!job.uploads.length) throw new Error('任务没有输入文件')
    const order = Array.isArray(job.uploadOrder) ? job.uploadOrder.map(String) : []
    job.uploads.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    const inputDir = join(work, 'inputs')
    const outputDir = join(work, 'outputs')
    await mkdir(inputDir)
    await mkdir(outputDir)
    const files: string[] = []
    for (const upload of job.uploads) files.push(await downloadUpload(upload, inputDir))
    await assertLease()
    await prisma.ledgerConversionJob.updateMany({
      where: { id, leaseId, status: 'running' },
      data: { progress: 10 },
    })
    const options = (job.options || {}) as Record<string, string>
    const outputs = await runCli(
      id,
      leaseId,
      operationArgs(job.operationId, files, options, outputDir),
    )
    await assertLease()
    if (!outputs.length) throw new Error('转换没有产生文件')
    await prisma.ledgerConversionJob.updateMany({
      where: { id, leaseId, status: 'running' },
      data: { progress: 80 },
    })
    const outputRoot = await realpath(outputDir)
    const assets: {
      id: string
      objectKey: string
      fileName: string
      mimeType: string
      sizeBytes: bigint
    }[] = []
    for (const output of outputs) {
      const filePath = resolve(output.path)
      if (!filePath.startsWith(outputRoot + sep)) throw new Error('转换引擎输出路径越界')
      const info = await lstat(filePath)
      if (!info.isFile() || (await realpath(filePath)) !== filePath)
        throw new Error('转换引擎输出不是普通文件')
      const fileName = safeOutputName(output.fileName)
      if (!fileName) throw new Error('转换引擎结果文件名无效')
      const assetId = randomUUID()
      const objectKey = `ledger-conversions/${job.userId}/jobs/${id}/assets/${assetId}`
      await storage.fPutObject(bucket, objectKey, filePath, {
        'Content-Type': output.mimeType || 'application/octet-stream',
      })
      writtenKeys.push(objectKey)
      await assertLease()
      assets.push({
        id: assetId,
        objectKey,
        fileName,
        mimeType: output.mimeType || 'application/octet-stream',
        sizeBytes: BigInt(info.size),
      })
    }
    if (outputs.length > 1) {
      const zipPath = join(work, 'all-results.zip')
      await zipOutputs(outputs, zipPath)
      const assetId = randomUUID()
      const objectKey = `ledger-conversions/${job.userId}/jobs/${id}/assets/${assetId}`
      await storage.fPutObject(bucket, objectKey, zipPath, { 'Content-Type': 'application/zip' })
      writtenKeys.push(objectKey)
      await assertLease()
      assets.push({
        id: assetId,
        objectKey,
        fileName: '全部结果.zip',
        mimeType: 'application/zip',
        sizeBytes: BigInt((await stat(zipPath)).size),
      })
    }
    const finishedAt = new Date()
    await prisma.$transaction(async (tx) => {
      const done = await tx.ledgerConversionJob.updateMany({
        where: { id, leaseId, status: 'running' },
        data: {
          status: 'succeeded',
          leaseId: null,
          heartbeatAt: null,
          progress: 100,
          finishedAt,
          expiresAt: new Date(finishedAt.getTime() + RETENTION_MS),
        },
      })
      if (!done.count) throw new Error('任务已取消或租约已过期')
      await tx.ledgerConversionAsset.createMany({
        data: assets.map((asset) => ({ ...asset, jobId: id })),
      })
      await tx.ledgerConversionUpload.updateMany({
        where: { jobId: id },
        data: { expiresAt: new Date(finishedAt.getTime() + RETENTION_MS) },
      })
    })
  } catch (error: any) {
    if (writtenKeys.length) await storage.removeObjects(bucket, writtenKeys).catch(() => undefined)
    const finishedAt = new Date()
    const publicError = String(error?.message || '').startsWith('输入分片校验失败')
      ? '上传文件校验失败，请重新选择文件'
      : '转换失败，请检查文件是否损坏或更换格式后重试'
    await prisma.ledgerConversionJob.updateMany({
      where: { id, leaseId, status: 'running' },
      data: {
        status: 'failed',
        leaseId: null,
        heartbeatAt: null,
        error: publicError,
        finishedAt,
        expiresAt: new Date(finishedAt.getTime() + RETENTION_MS),
      },
    })
    await prisma.ledgerConversionUpload.updateMany({
      where: { jobId: id },
      data: { expiresAt: new Date(finishedAt.getTime() + RETENTION_MS) },
    })
    console.error(`[conversion-worker] ${id}: ${error?.message || error}`)
  } finally {
    clearInterval(heartbeat)
    await rm(work, { recursive: true, force: true })
  }
}

async function main() {
  if (bucket === (process.env.S3_BUCKET || 'jiujiu-mall'))
    throw new Error('Conversion bucket must be private and separate')
  let timer: ReturnType<typeof setInterval> | undefined
  try {
    if (!(await storage.bucketExists(bucket))) await storage.makeBucket(bucket)
    await assertPrivateConversionBucket(storage, bucket)
    await prisma.$connect()
    await redis.connect()
    const heartbeat = () => redis.set(WORKER_HEARTBEAT, '1', 'EX', 30)
    await heartbeat()
    timer = setInterval(() => {
      heartbeat().catch((error) => console.error('[conversion-worker] heartbeat:', error))
    }, 10_000)
    while (running) {
      try {
        const item = await redis.brpop(QUEUE, 5)
        if (!item) continue
        const id = item[1]
        await redis.del(`ledger:conversions:enqueued:${id}`)
        await processJob(id)
      } catch (error) {
        console.error('[conversion-worker] loop:', error)
        await new Promise((resolveSleep) => {
          setTimeout(resolveSleep, 3000)
        })
      }
    }
  } finally {
    if (timer) clearInterval(timer)
    await prisma.$disconnect().catch(() => undefined)
    redis.disconnect()
  }
}

for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.on(signal, () => {
    running = false
    if (activeChild) terminate(activeChild)
  })
main().catch((error) => {
  console.error('[conversion-worker] fatal:', error)
  process.exitCode = 1
})
