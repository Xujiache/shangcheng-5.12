import { createHash } from 'node:crypto'
import { basename, extname } from 'node:path'
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { Prisma } from '@prisma/client'
import Redis from 'ioredis'
import { Client } from 'minio'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import { PrismaService } from '../../prisma/prisma.service'
import {
  CONVERSION_BATCH_LIMIT,
  CONVERSION_CHUNK_BYTES,
  CONVERSION_COUNT_LIMIT,
  CONVERSION_FILE_LIMIT,
  CONVERSION_RETENTION_MS,
  CONVERSION_UPLOAD_TTL_MS,
  VERIFIED_CONVERSION_OPERATIONS,
  findConversionOperation,
} from './conversion.operations'
import { assertPrivateConversionBucket } from './conversion.storage'

const QUEUE = 'ledger:conversions:queue'
const WORKER_HEARTBEAT = 'ledger:conversions:worker:online'
const safeName = (name: string) =>
  basename(name.replaceAll('\\', '/'))
    .replace(/[\x00-\x1f\x7f]/g, '')
    .slice(0, 180)
const deadline = (milliseconds: number) => new Date(Date.now() + milliseconds)
const integer = (value: unknown) => (Number.isSafeInteger(Number(value)) ? Number(value) : NaN)
const boundedLimit = (raw: string | undefined, fallback: number, ceiling: number) => {
  const value = raw === undefined ? fallback : Number(raw)
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, ceiling) : fallback
}

@Injectable()
export class ConversionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConversionService.name)
  private readonly bucket = process.env.CONVERSION_BUCKET || 'jiujiu-conversions'
  private readonly redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  })
  private storage: Client | null = null
  private ready = false
  private readonly accepting = process.env.CONVERSION_FEATURE_ENABLED === 'true'
  // 真机大文件验收之前保持保守运行限制；部署后只可在原版上限内逐级放宽。
  private readonly maxFileBytes = boundedLimit(
    process.env.CONVERSION_MAX_FILE_BYTES,
    64 * 1024 ** 2,
    CONVERSION_FILE_LIMIT,
  )
  private readonly maxBatchBytes = boundedLimit(
    process.env.CONVERSION_MAX_BATCH_BYTES,
    256 * 1024 ** 2,
    CONVERSION_BATCH_LIMIT,
  )
  private readonly maxFiles = boundedLimit(
    process.env.CONVERSION_MAX_FILES,
    100,
    CONVERSION_COUNT_LIMIT,
  )

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    if (this.bucket === (process.env.S3_BUCKET || 'jiujiu-mall')) {
      this.logger.error('转换存储不得复用公开下载 bucket；转换功能已关闭')
      return
    }
    const accessKey = process.env.S3_ACCESS_KEY || ''
    const secretKey = process.env.S3_SECRET_KEY || ''
    if (process.env.NODE_ENV === 'production' && (!accessKey || !secretKey)) {
      this.logger.error('私有转换存储凭据缺失；转换功能已关闭')
      return
    }
    try {
      const url = new URL(process.env.S3_ENDPOINT || 'http://127.0.0.1:9000')
      this.storage = new Client({
        endPoint: url.hostname,
        port: Number(url.port) || (url.protocol === 'https:' ? 443 : 80),
        useSSL: url.protocol === 'https:',
        accessKey: accessKey || 'minioadmin',
        secretKey: secretKey || 'minioadmin',
      })
      if (!(await this.storage.bucketExists(this.bucket)))
        await this.storage.makeBucket(this.bucket)
      await assertPrivateConversionBucket(this.storage, this.bucket)
      await this.redis.connect()
      this.ready = true
    } catch (error: any) {
      this.logger.error(`转换服务初始化失败：${error?.message || error}`)
      this.storage = null
    }
  }

  async onModuleDestroy() {
    this.redis.disconnect()
  }

  private requireReady(): Client {
    if (!this.ready || !this.storage)
      throw new BizException(BizCode.BUSINESS_ERROR, '格式转换服务暂不可用')
    return this.storage
  }

  async capabilities() {
    const workerOnline = this.ready
      ? await this.redis
          .exists(WORKER_HEARTBEAT)
          .then((count) => count > 0)
          .catch(() => false)
      : false
    return {
      available: workerOnline && this.accepting && VERIFIED_CONVERSION_OPERATIONS.length > 0,
      operations: workerOnline && this.accepting ? VERIFIED_CONVERSION_OPERATIONS : [],
      limits: {
        maxFileBytes: this.maxFileBytes,
        maxBatchBytes: this.maxBatchBytes,
        maxFiles: this.maxFiles,
        chunkBytes: CONVERSION_CHUNK_BYTES,
        retentionDays: 30,
        deviceVerified: false,
      },
    }
  }

  async startUpload(userId: string, fileNameInput: unknown, sizeInput: unknown) {
    this.requireReady()
    if (!this.accepting) throw new BizException(BizCode.BUSINESS_ERROR, '格式转换尚未开放')
    const fileName = safeName(String(fileNameInput || ''))
    const totalBytes = integer(sizeInput)
    const extension = extname(fileName).slice(1).toLowerCase()
    if (
      !fileName ||
      !extension ||
      !VERIFIED_CONVERSION_OPERATIONS.some((op) => op.inputExtensions.includes(extension))
    ) {
      throw new BizException(BizCode.INVALID_PARAMS, '尚未开放该文件格式')
    }
    if (!Number.isSafeInteger(totalBytes) || totalBytes <= 0 || totalBytes > this.maxFileBytes) {
      throw new BizException(BizCode.INVALID_PARAMS, '文件大小超过当前已验证的上限')
    }
    const upload = await this.prisma.ledgerConversionUpload.create({
      data: {
        userId,
        fileName,
        extension,
        totalBytes: BigInt(totalBytes),
        chunkSize: CONVERSION_CHUNK_BYTES,
        chunkCount: Math.ceil(totalBytes / CONVERSION_CHUNK_BYTES),
        expiresAt: deadline(CONVERSION_UPLOAD_TTL_MS),
      },
    })
    return {
      id: upload.id,
      chunkBytes: upload.chunkSize,
      chunkCount: upload.chunkCount,
      uploadedParts: [],
    }
  }

  async uploadStatus(userId: string, id: string) {
    const upload = await this.prisma.ledgerConversionUpload.findFirst({
      where: { id, userId },
      include: { chunks: { select: { index: true }, orderBy: { index: 'asc' } } },
    })
    if (!upload || upload.expiresAt < new Date())
      throw new BizException(BizCode.INVALID_PARAMS, '上传会话不存在或已过期')
    return {
      id,
      status: upload.status,
      chunkBytes: upload.chunkSize,
      chunkCount: upload.chunkCount,
      uploadedParts: upload.chunks.map((part) => part.index),
    }
  }

  async putChunk(
    userId: string,
    id: string,
    indexInput: unknown,
    file: { buffer: Buffer; size: number },
  ) {
    const storage = this.requireReady()
    const index = integer(indexInput)
    if (!Number.isInteger(index) || index < 0)
      throw new BizException(BizCode.INVALID_PARAMS, '分片编号不正确')
    const upload = await this.prisma.ledgerConversionUpload.findFirst({
      where: { id, userId },
      include: { chunks: { where: { index } } },
    })
    if (!upload || upload.status !== 'uploading' || upload.expiresAt < new Date() || upload.jobId) {
      throw new BizException(BizCode.INVALID_PARAMS, '上传会话不可写')
    }
    const expected = Math.min(
      upload.chunkSize,
      Number(upload.totalBytes) - index * upload.chunkSize,
    )
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= upload.chunkCount ||
      !file?.buffer ||
      file.size !== expected ||
      file.buffer.length !== expected
    ) {
      throw new BizException(BizCode.INVALID_PARAMS, '分片编号或长度不正确')
    }
    const sha256 = createHash('sha256').update(file.buffer).digest('hex')
    if (upload.chunks.length) {
      if (upload.chunks[0].sha256 !== sha256)
        throw new BizException(BizCode.INVALID_PARAMS, '该分片已存在且内容不同')
      return { index, sha256, uploaded: true }
    }
    const objectKey = `ledger-conversions/${userId}/uploads/${id}/parts/${index}-${sha256}`
    await storage.putObject(this.bucket, objectKey, file.buffer, file.size, {
      'Content-Type': 'application/octet-stream',
    })
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.ledgerConversionChunk.create({
          data: { uploadId: id, index, objectKey, sizeBytes: file.size, sha256 },
        })
        await tx.ledgerConversionUpload.update({
          where: { id },
          data: { receivedBytes: { increment: BigInt(file.size) } },
        })
      })
    } catch (error) {
      const prior = await this.prisma.ledgerConversionChunk.findUnique({
        where: { uploadId_index: { uploadId: id, index } },
      })
      if (prior?.sha256 !== sha256) {
        await storage.removeObject(this.bucket, objectKey).catch(() => undefined)
        throw error
      }
    }
    return { index, sha256, uploaded: true }
  }

  async completeUpload(userId: string, id: string) {
    this.requireReady()
    const upload = await this.prisma.ledgerConversionUpload.findFirst({
      where: { id, userId },
      include: { chunks: { orderBy: { index: 'asc' } } },
    })
    if (!upload || upload.expiresAt < new Date() || upload.jobId)
      throw new BizException(BizCode.INVALID_PARAMS, '上传会话不存在或已过期')
    if (upload.status === 'ready') return { id, status: 'ready' }
    if (
      upload.chunks.length !== upload.chunkCount ||
      upload.chunks.some((part, index) => part.index !== index) ||
      upload.chunks.reduce((sum, part) => sum + part.sizeBytes, 0) !== Number(upload.totalBytes)
    ) {
      throw new BizException(BizCode.INVALID_PARAMS, '分片未全部上传')
    }
    await this.prisma.ledgerConversionUpload.update({
      where: { id },
      data: { status: 'ready', completedAt: new Date() },
    })
    return { id, status: 'ready' }
  }

  private async enqueue(id: string) {
    const key = `ledger:conversions:enqueued:${id}`
    const fresh = await this.redis.set(key, '1', 'EX', 60, 'NX')
    if (fresh) await this.redis.lpush(QUEUE, id)
  }

  async createJob(
    userId: string,
    body: { operationId?: string; uploadIds?: string[]; options?: Record<string, unknown> },
  ) {
    this.requireReady()
    if (!this.accepting) throw new BizException(BizCode.BUSINESS_ERROR, '格式转换尚未开放')
    const uploadIds = Array.isArray(body?.uploadIds) ? [...new Set(body.uploadIds)] : []
    if (
      !uploadIds.length ||
      uploadIds.length > this.maxFiles ||
      uploadIds.length !== body.uploadIds?.length ||
      uploadIds.some((id) => typeof id !== 'string' || !id || id.length > 64)
    ) {
      throw new BizException(BizCode.INVALID_PARAMS, '文件数超限或包含重复文件')
    }
    const uploads = await this.prisma.ledgerConversionUpload.findMany({
      where: {
        id: { in: uploadIds },
        userId,
        status: 'ready',
        jobId: null,
        expiresAt: { gt: new Date() },
      },
    })
    if (
      uploads.length !== uploadIds.length ||
      uploads.reduce((sum, upload) => sum + Number(upload.totalBytes), 0) > this.maxBatchBytes
    ) {
      throw new BizException(BizCode.INVALID_PARAMS, '文件不可用或批量大小超限')
    }
    const operation = findConversionOperation(
      String(body.operationId || ''),
      uploads.map((upload) => upload.extension),
    )
    if (!operation) throw new BizException(BizCode.INVALID_PARAMS, '该转换组合尚未通过 Linux 验证')
    const options = body.options || {}
    if (
      typeof options !== 'object' ||
      Array.isArray(options) ||
      Object.entries(options).some(
        ([key, value]) =>
          !operation.options.includes(key) || typeof value !== 'string' || value.length > 80,
      )
    ) {
      throw new BizException(BizCode.INVALID_PARAMS, '转换选项不正确')
    }
    const job = await this.prisma.$transaction(async (tx) => {
      const created = await tx.ledgerConversionJob.create({
        data: {
          userId,
          operationId: operation.id,
          uploadOrder: uploadIds as Prisma.InputJsonValue,
          options: options as Prisma.InputJsonValue,
        },
      })
      const attached = await tx.ledgerConversionUpload.updateMany({
        where: { id: { in: uploadIds }, userId, status: 'ready', jobId: null },
        data: {
          jobId: created.id,
          expiresAt: deadline(CONVERSION_RETENTION_MS + CONVERSION_UPLOAD_TTL_MS),
        },
      })
      if (attached.count !== uploadIds.length)
        throw new BizException(BizCode.INVALID_PARAMS, '文件已被其他任务使用')
      return created
    })
    await this.enqueue(job.id).catch((error) =>
      this.logger.error(`任务入队失败，定时恢复：${error}`),
    )
    return { id: job.id, status: job.status }
  }

  async listJobs(userId: string, skipInput: unknown = 0) {
    const skip = Math.max(0, Math.min(10000, integer(skipInput) || 0))
    const jobs = await this.prisma.ledgerConversionJob.findMany({
      where: { userId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      orderBy: { createdAt: 'desc' },
      skip,
      take: 30,
      include: {
        uploads: { select: { id: true, fileName: true, totalBytes: true } },
        assets: {
          select: { id: true, fileName: true, mimeType: true, sizeBytes: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    return jobs.map((job) => this.serializeJob(job))
  }

  async getJob(userId: string, id: string) {
    const job = await this.prisma.ledgerConversionJob.findFirst({
      where: { id, userId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      include: {
        uploads: { select: { id: true, fileName: true, totalBytes: true } },
        assets: {
          select: { id: true, fileName: true, mimeType: true, sizeBytes: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!job) throw new BizException(BizCode.INVALID_PARAMS, '任务不存在')
    return this.serializeJob(job)
  }

  private serializeJob(job: any) {
    const order = Array.isArray(job.uploadOrder) ? job.uploadOrder : []
    return {
      id: job.id,
      operationId: job.operationId,
      options: Object.fromEntries(
        Object.entries(job.options || {}).filter(([key]) => key !== 'password'),
      ),
      status: job.status,
      progress: job.progress,
      error: job.error,
      createdAt: job.createdAt,
      finishedAt: job.finishedAt,
      expiresAt: job.expiresAt,
      uploads: job.uploads
        .map((item: any) => ({ ...item, totalBytes: Number(item.totalBytes) }))
        .sort((a: any, b: any) => order.indexOf(a.id) - order.indexOf(b.id)),
      assets: job.assets.map((item: any) => ({ ...item, sizeBytes: Number(item.sizeBytes) })),
    }
  }

  async cancelJob(userId: string, id: string) {
    const finishedAt = new Date()
    const result = await this.prisma.ledgerConversionJob.updateMany({
      where: { id, userId, status: { in: ['queued', 'running'] } },
      data: {
        status: 'cancelled',
        leaseId: null,
        finishedAt,
        expiresAt: new Date(finishedAt.getTime() + CONVERSION_RETENTION_MS),
      },
    })
    if (!result.count) throw new BizException(BizCode.INVALID_PARAMS, '任务不存在或不可取消')
    await this.prisma.ledgerConversionUpload.updateMany({
      where: { jobId: id },
      data: { expiresAt: deadline(CONVERSION_RETENTION_MS) },
    })
    return { id, status: 'cancelled' }
  }

  async retryJob(userId: string, id: string) {
    this.requireReady()
    if (!this.accepting) throw new BizException(BizCode.BUSINESS_ERROR, '格式转换尚未开放')
    const result = await this.prisma.ledgerConversionJob.updateMany({
      where: { id, userId, status: 'failed', expiresAt: { gt: new Date() } },
      data: {
        status: 'queued',
        progress: 0,
        error: null,
        startedAt: null,
        heartbeatAt: null,
        leaseId: null,
        finishedAt: null,
        expiresAt: null,
      },
    })
    if (!result.count) throw new BizException(BizCode.INVALID_PARAMS, '任务不存在或不可重试')
    await this.prisma.ledgerConversionUpload.updateMany({
      where: { jobId: id },
      data: { expiresAt: deadline(CONVERSION_RETENTION_MS + CONVERSION_UPLOAD_TTL_MS) },
    })
    await this.enqueue(id).catch((error) => this.logger.error(`重试入队失败，定时恢复：${error}`))
    return { id, status: 'queued' }
  }

  async deleteJob(userId: string, id: string) {
    const job = await this.prisma.ledgerConversionJob.findFirst({ where: { id, userId } })
    if (!job) throw new BizException(BizCode.INVALID_PARAMS, '任务不存在')
    if (job.status === 'running')
      throw new BizException(BizCode.INVALID_PARAMS, '请先取消运行中的任务')
    const locked = await this.prisma.ledgerConversionJob.updateMany({
      where: { id, userId, status: { not: 'running' } },
      data: {
        status: 'cancelled',
        finishedAt: job.finishedAt || new Date(),
        expiresAt: job.expiresAt || deadline(CONVERSION_RETENTION_MS),
      },
    })
    if (!locked.count) throw new BizException(BizCode.INVALID_PARAMS, '任务状态已变化，请重试')
    await this.removeJobObjects(id)
    await this.prisma.ledgerConversionJob.delete({ where: { id } })
    return { id, deleted: true }
  }

  async purgeUser(userId: string) {
    this.requireReady()
    await this.prisma.ledgerConversionJob.updateMany({
      where: { userId, status: { in: ['queued', 'running'] } },
      data: { status: 'cancelled', leaseId: null, finishedAt: new Date() },
    })
    const jobs = await this.prisma.ledgerConversionJob.findMany({
      where: { userId },
      select: { id: true },
    })
    for (const job of jobs) {
      await this.removeJobObjects(job.id)
      await this.prisma.ledgerConversionJob.delete({ where: { id: job.id } })
    }
    const uploads = await this.prisma.ledgerConversionUpload.findMany({
      where: { userId },
      select: { id: true },
    })
    for (const upload of uploads) {
      await this.removePrefix(`ledger-conversions/${userId}/uploads/${upload.id}/`)
      await this.prisma.ledgerConversionUpload.delete({ where: { id: upload.id } })
    }
    return { userId, jobsDeleted: jobs.length, pendingUploadsDeleted: uploads.length }
  }

  async asset(userId: string, jobId: string, assetId: string) {
    const storage = this.requireReady()
    const asset = await this.prisma.ledgerConversionAsset.findFirst({
      where: {
        id: assetId,
        jobId,
        job: { userId, status: 'succeeded', expiresAt: { gt: new Date() } },
      },
    })
    if (!asset) throw new BizException(BizCode.INVALID_PARAMS, '结果不存在')
    return { asset, stream: await storage.getObject(this.bucket, asset.objectKey) }
  }

  private async removeJobObjects(id: string) {
    const job = await this.prisma.ledgerConversionJob.findUniqueOrThrow({
      where: { id },
      select: { userId: true },
    })
    const uploads = await this.prisma.ledgerConversionUpload.findMany({
      where: { jobId: id },
      select: { id: true },
    })
    await this.removePrefix(`ledger-conversions/${job.userId}/jobs/${id}/`)
    for (const upload of uploads)
      await this.removePrefix(`ledger-conversions/${job.userId}/uploads/${upload.id}/`)
    await this.prisma.ledgerConversionUpload.deleteMany({ where: { jobId: id } })
  }

  private async removePrefix(prefix: string) {
    const storage = this.requireReady()
    const keys: string[] = []
    for await (const entry of storage.listObjectsV2(this.bucket, prefix, true)) {
      if (entry.name?.startsWith(prefix)) keys.push(entry.name)
    }
    for (let i = 0; i < keys.length; i += 1000)
      await storage.removeObjects(this.bucket, keys.slice(i, i + 1000))
  }

  @Cron('0 * * * *')
  async cleanupExpired() {
    if (!this.ready) return
    const jobs = await this.prisma.ledgerConversionJob.findMany({
      where: { expiresAt: { lt: new Date() } },
      take: 50,
    })
    for (const job of jobs) {
      try {
        await this.removeJobObjects(job.id)
        await this.prisma.ledgerConversionJob.delete({ where: { id: job.id } })
      } catch (error) {
        this.logger.error(`清理任务 ${job.id} 失败：${error}`)
      }
    }
    const orphans = await this.prisma.ledgerConversionUpload.findMany({
      where: { jobId: null, expiresAt: { lt: new Date() } },
      take: 100,
    })
    for (const upload of orphans) {
      try {
        await this.removePrefix(`ledger-conversions/${upload.userId}/uploads/${upload.id}/`)
        await this.prisma.ledgerConversionUpload.delete({ where: { id: upload.id } })
      } catch (error) {
        this.logger.error(`清理上传 ${upload.id} 失败：${error}`)
      }
    }
  }

  @Cron('*/1 * * * *')
  async recoverQueue() {
    if (!this.ready) return
    await this.prisma.ledgerConversionJob.updateMany({
      where: { status: 'running', heartbeatAt: { lt: new Date(Date.now() - 120_000) } },
      data: { status: 'queued', heartbeatAt: null, leaseId: null, progress: 0 },
    })
    const jobs = await this.prisma.ledgerConversionJob.findMany({
      where: { status: 'queued' },
      select: { id: true },
      take: 100,
    })
    for (const job of jobs) await this.enqueue(job.id).catch(() => undefined)
  }
}
