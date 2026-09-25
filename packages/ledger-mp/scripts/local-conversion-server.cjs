#!/usr/bin/env node
'use strict'

// Local test adapter for the bundled FlyingMouse CLI. No production backend is started.
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const { spawn, spawnSync } = require('node:child_process')
const { pipeline } = require('node:stream/promises')
const { createRequire } = require('node:module')

const vendor = path.resolve(__dirname, '../../../vendor/flyingmouse-format/v0.7.10')
const vendorRequire = createRequire(path.join(vendor, 'package.json'))
const express = vendorRequire('express')
const multer = vendorRequire('multer')
const mime = vendorRequire('mime-types')
const { targetsForExt } = vendorRequire('./utils')
const root = process.env.LEDGER_LOCAL_DATA_DIR || path.join(os.homedir(), 'Library/Application Support/ledger-local-conversion')
const port = Number(process.env.LEDGER_LOCAL_PORT || 3000)
const host = process.env.LEDGER_LOCAL_HOST || '127.0.0.1'
const lanHost = process.env.LEDGER_LOCAL_LAN_HOST || ''
const prefix = '/api/v1/l/conversions'
const chunkBytes = 8 * 1024 * 1024
const maxFileBytes = 64 * 1024 * 1024
const maxBatchBytes = 256 * 1024 * 1024
const maxFiles = 100
const uploads = new Map()
const jobs = new Map()
const processes = new Map()
let operations = []

const ok = (res, data) => res.json({ code: 0, data })
function fail(res, status, message) { return res.status(status).json({ code: status, message }) }
function safeName(name) {
  return path.basename(String(name || 'file')).replace(/[\x00-\x1f/\\]/g, '_').slice(0, 180)
}
function saveIndex() {
  const index = path.join(root, 'index.json')
  fs.writeFileSync(index + '.tmp', JSON.stringify({ uploads: [...uploads.values()], jobs: [...jobs.values()] }))
  fs.renameSync(index + '.tmp', index)
}
function viewJob(job) {
  return { ...job, assets: job.assets.map(({ path: _path, ...asset }) => asset) }
}
function cli(args, processKey) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(vendor, 'cli.js'), ...args, '--json'], {
      cwd: vendor,
      env: { ...process.env, HTTP_PROXY: '', HTTPS_PROXY: '', ALL_PROXY: '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', data => { stdout += data; if (stdout.length > 2_000_000) child.kill() })
    child.stderr.on('data', data => { stderr = (stderr + data).slice(-8000) })
    child.on('error', reject)
    child.on('close', code => {
      if (processKey) processes.delete(processKey)
      if (code !== 0) {
        let message = stderr.trim() || `CLI exited ${code}`
        try { message = JSON.parse(message.split('\n').at(-1)).error || message } catch {}
        reject(new Error(message))
      } else {
        try { resolve(JSON.parse(stdout)) } catch { reject(new Error('转换引擎返回了无效结果')) }
      }
    })
    if (processKey) processes.set(processKey, child)
  })
}
function buildOperations(capabilities) {
  const byTarget = new Map()
  for (const group of Object.values(capabilities.groups || {})) {
    for (const input of group.inputs || []) {
      for (const target of targetsForExt(input, capabilities.tools)) {
        if (!byTarget.has(target)) byTarget.set(target, new Set())
        byTarget.get(target).add(input)
      }
    }
  }
  for (const target of targetsForExt('zip', capabilities.tools)) {
    if (!byTarget.has(target)) byTarget.set(target, new Set())
    byTarget.get(target).add('zip')
  }
  const list = [...byTarget].sort(([a], [b]) => a.localeCompare(b)).map(([target, inputs]) => ({
    id: `convert:${target}`,
    label: `转为 ${target.toUpperCase()}`,
    inputExtensions: [...inputs].sort(),
    targetExtension: target,
    kind: 'convert',
    options: target === 'pdf' ? ['pdfAction', 'password', 'splitMode', 'groupSize']
      : ['mp4', 'mov', 'mkv', 'webm'].includes(target) ? ['videoCodec', 'alphaBackground']
      : target === 'epub' ? ['textEncoding'] : [],
  }))
  const images = capabilities.groups?.image?.inputs || []
  if (images.length) list.push({ id: 'images-to-pdf', label: '多图合成 PDF', inputExtensions: images, targetExtension: 'pdf', kind: 'images-to-pdf', options: [] })
  if (capabilities.groups?.pdf?.inputs?.includes('pdf')) list.push({ id: 'merge-pdfs', label: '合并 PDF', inputExtensions: ['pdf'], targetExtension: 'pdf', kind: 'merge-pdfs', options: [] })
  return list
}
async function runJob(job) {
  if (job.status === 'cancelled') return
  job.status = 'running'; job.progress = 10; job.error = ''; saveIndex()
  try {
    const dir = path.join(root, 'jobs', job.id)
    await fsp.mkdir(dir, { recursive: true })
    const files = job.uploads.map(item => uploads.get(item.id).path)
    const operation = operations.find(item => item.id === job.operationId)
    const args = operation.kind === 'convert'
      ? ['convert', ...files, '--to', operation.targetExtension]
      : [operation.kind, ...files]
    args.push('--output-dir', dir)
    for (const key of ['videoCodec', 'alphaBackground', 'pdfAction', 'splitMode', 'groupSize', 'textEncoding', 'password']) {
      const value = job.options?.[key]
      if (value) args.push('--' + key.replace(/[A-Z]/g, char => '-' + char.toLowerCase()), value)
    }
    const result = await cli(args, job.id)
    if (job.status === 'cancelled') return
    job.assets = await Promise.all(result.outputs.map(async output => {
      const stat = await fsp.stat(output.path)
      const fileName = output.fileName.replace(/^[0-9a-f]{8}-[0-9a-f-]{27}-/, '')
      return { id: randomUUID(), fileName, mimeType: output.mimeType || mime.lookup(fileName) || 'application/octet-stream', sizeBytes: stat.size, path: output.path }
    }))
    job.status = 'succeeded'; job.progress = 100
  } catch (error) {
    job.status = job.status === 'cancelled' ? 'cancelled' : 'failed'
    job.error = job.status === 'cancelled' ? '' : String(error.message || error).slice(0, 500)
  } finally { saveIndex() }
}

async function main() {
  await fsp.mkdir(path.join(root, 'uploads'), { recursive: true })
  await fsp.mkdir(path.join(root, 'jobs'), { recursive: true })
  const index = path.join(root, 'index.json')
  if (fs.existsSync(index)) {
    const saved = JSON.parse(await fsp.readFile(index, 'utf8'))
    for (const upload of saved.uploads || []) uploads.set(upload.id, upload)
    for (const job of saved.jobs || []) {
      if (['queued', 'running'].includes(job.status)) { job.status = 'failed'; job.error = '本地服务重启，请重试'; job.progress = 0 }
      jobs.set(job.id, job)
    }
  }
  const capabilities = await cli(['capabilities'])
  const pdfEncryption = spawnSync(process.env.FLYINGMOUSE_QPDF_PATH || 'qpdf', ['--version'], { stdio: 'ignore' }).status === 0
  operations = buildOperations(capabilities)
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '64kb' }))
  const oneChunk = multer({ storage: multer.memoryStorage(), limits: { fileSize: chunkBytes } }).single('file')

  app.get('/health', (_req, res) => ok(res, { local: true, operations: operations.length, tools: capabilities.tools }))
  app.get(prefix + '/capabilities', (_req, res) => ok(res, {
    available: true, operations,
    features: { pdfEncryption },
    limits: { maxFileBytes, maxBatchBytes, maxFiles, chunkBytes, retentionDays: 0, deviceVerified: false },
  }))
  app.post(prefix + '/uploads', (req, res) => {
    const fileName = safeName(req.body?.fileName)
    const sizeBytes = Number(req.body?.sizeBytes)
    if (!fileName || !Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > maxFileBytes) return fail(res, 400, '文件大小或名称无效')
    const upload = { id: randomUUID(), fileName, sizeBytes, chunkCount: Math.ceil(sizeBytes / chunkBytes), uploadedParts: [], complete: false }
    uploads.set(upload.id, upload); saveIndex()
    ok(res, { id: upload.id, chunkBytes, chunkCount: upload.chunkCount })
  })
  app.get(prefix + '/uploads/:id', (req, res) => {
    const upload = uploads.get(req.params.id)
    return upload ? ok(res, { uploadedParts: upload.uploadedParts, chunkBytes, chunkCount: upload.chunkCount }) : fail(res, 404, '上传不存在')
  })
  app.post(prefix + '/uploads/:id/chunks', oneChunk, async (req, res) => {
    const upload = uploads.get(req.params.id)
    const index = Number(req.body?.index)
    if (!upload || upload.complete || !Number.isInteger(index) || index < 0 || index >= upload.chunkCount || !req.file) return fail(res, 400, '分片无效')
    const expected = Math.min(chunkBytes, upload.sizeBytes - index * chunkBytes)
    if (req.file.size !== expected) return fail(res, 400, '分片长度不匹配')
    await fsp.writeFile(path.join(root, 'uploads', `${upload.id}.${index}`), req.file.buffer)
    if (!upload.uploadedParts.includes(index)) upload.uploadedParts.push(index)
    saveIndex(); ok(res, {})
  })
  app.post(prefix + '/uploads/:id/complete', async (req, res) => {
    const upload = uploads.get(req.params.id)
    if (!upload || upload.uploadedParts.length !== upload.chunkCount) return fail(res, 400, '文件尚未上传完整')
    if (!upload.complete) {
      const dest = path.join(root, 'uploads', upload.id + '-' + upload.fileName)
      const out = fs.createWriteStream(dest)
      for (let i = 0; i < upload.chunkCount; i++) {
        await pipeline(fs.createReadStream(path.join(root, 'uploads', `${upload.id}.${i}`)), out, { end: false })
        await fsp.unlink(path.join(root, 'uploads', `${upload.id}.${i}`))
      }
      out.end(); await new Promise(resolve => { out.on('finish', resolve) })
      upload.path = dest; upload.complete = true; saveIndex()
    }
    ok(res, {})
  })
  app.post(prefix + '/jobs', (req, res) => {
    const operation = operations.find(item => item.id === req.body?.operationId)
    const ids = req.body?.uploadIds
    if (!operation || !Array.isArray(ids) || !ids.length || ids.length > maxFiles) return fail(res, 400, '转换操作或文件无效')
    const input = ids.map(id => uploads.get(id))
    if (input.some(item => !item?.complete || !operation.inputExtensions.includes(path.extname(item.fileName).slice(1).toLowerCase()))) return fail(res, 400, '文件格式不适用于该操作')
    if (input.reduce((sum, item) => sum + item.sizeBytes, 0) > maxBatchBytes) return fail(res, 400, '批量大小超限')
    const job = { id: randomUUID(), operationId: operation.id, status: 'queued', progress: 0, createdAt: new Date().toISOString(), uploads: input.map(item => ({ id: item.id, fileName: item.fileName, totalBytes: item.sizeBytes })), options: req.body?.options || {}, assets: [] }
    jobs.set(job.id, job); saveIndex(); ok(res, { id: job.id })
    setImmediate(() => runJob(job))
  })
  app.get(prefix + '/jobs', (req, res) => ok(res, [...jobs.values()].reverse().slice(Number(req.query.skip) || 0, (Number(req.query.skip) || 0) + 30).map(viewJob)))
  app.get(prefix + '/jobs/:id', (req, res) => {
    const job = jobs.get(req.params.id)
    return job ? ok(res, viewJob(job)) : fail(res, 404, '任务不存在')
  })
  app.get(prefix + '/jobs/:id/assets/:assetId', (req, res) => {
    const asset = jobs.get(req.params.id)?.assets.find(item => item.id === req.params.assetId)
    if (!asset || !fs.existsSync(asset.path)) return fail(res, 404, '结果文件不存在')
    res.type(asset.mimeType); res.download(asset.path, asset.fileName)
  })
  app.post(prefix + '/jobs/:id/retry', (req, res) => {
    const job = jobs.get(req.params.id)
    if (!job || !['failed', 'cancelled'].includes(job.status)) return fail(res, 400, '任务不可重试')
    job.status = 'queued'; job.progress = 0; job.error = ''; job.assets = []; saveIndex(); ok(res, {})
    setImmediate(() => runJob(job))
  })
  app.post(prefix + '/jobs/:id/cancel', (req, res) => {
    const job = jobs.get(req.params.id)
    if (!job || !['queued', 'running'].includes(job.status)) return fail(res, 400, '任务不可取消')
    job.status = 'cancelled'; processes.get(job.id)?.kill(); saveIndex(); ok(res, {})
  })
  app.delete(prefix + '/jobs/:id', async (req, res) => {
    const job = jobs.get(req.params.id)
    if (!job || job.status === 'running') return fail(res, 400, '任务不可删除')
    jobs.delete(job.id)
    await fsp.rm(path.join(root, 'jobs', job.id), { recursive: true, force: true })
    for (const upload of job.uploads) {
      if ([...jobs.values()].some(item => item.uploads.some(row => row.id === upload.id))) continue
      const source = uploads.get(upload.id)
      if (source?.path) await fsp.rm(source.path, { force: true })
      uploads.delete(upload.id)
    }
    saveIndex()
    ok(res, {})
  })
  app.use((error, _req, res, _next) => fail(res, 400, error.message || '请求失败'))
  app.listen(port, host, () => console.log(`Ledger local conversion: http://${host}:${port} (${operations.length} operations)`))
  if (lanHost && lanHost !== host) app.listen(port, lanHost, () => console.log(`Ledger local conversion LAN: http://${lanHost}:${port}`))
}

main().catch(error => { console.error(error); process.exitCode = 1 })
