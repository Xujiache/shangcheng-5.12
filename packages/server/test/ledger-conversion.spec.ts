import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Client } from 'minio'
import { ConversionService } from '../src/modules/ledger-conversion/conversion.service'
import {
  findConversionOperation,
  ORIGINAL_CONVERSION_OPERATIONS,
} from '../src/modules/ledger-conversion/conversion.operations'
import { assertPrivateConversionBucket } from '../src/modules/ledger-conversion/conversion.storage'
import catalog from '../src/modules/ledger-conversion/conversion.catalog.json'
import { decryptConversionPassword, encryptConversionPassword } from '../src/modules/ledger-conversion/conversion.secrets'

describe('ledger conversion gate', () => {
  test('PDF password is authenticated encryption at rest', () => {
    const original = process.env.CONVERSION_PASSWORD_KEY
    process.env.CONVERSION_PASSWORD_KEY = 'a'.repeat(64)
    try {
      const stored = encryptConversionPassword('correct horse battery staple')
      expect(stored).not.toContain('correct horse battery staple')
      expect(decryptConversionPassword(stored)).toBe('correct horse battery staple')
      const tampered = stored.split(':')
      tampered[2] = Buffer.alloc(16).toString('base64url')
      expect(() => decryptConversionPassword(tampered.join(':'))).toThrow()
    } finally {
      if (original === undefined) delete process.env.CONVERSION_PASSWORD_KEY
      else process.env.CONVERSION_PASSWORD_KEY = original
    }
  })
  test('catalogue follows every pair in pinned original source', () => {
    const pairs = ORIGINAL_CONVERSION_OPERATIONS
      .filter((operation) => operation.kind === 'convert')
      .flatMap((operation) => operation.inputExtensions.map((source) => `${source}:${operation.targetExtension}`))
    expect(pairs).toHaveLength(1174)
    expect(new Set(pairs).size).toBe(1174)
    expect(findConversionOperation('convert:pdf', ['ofd'])).toBeTruthy()
    expect(findConversionOperation('convert:png', ['x3f'])).toBeTruthy()
    expect(findConversionOperation('convert:pdf', ['pdf'])?.options).toEqual(
      expect.arrayContaining(['pdfAction', 'password', 'splitMode', 'groupSize']),
    )
    const video = findConversionOperation('convert:mp4', ['png'])
    expect(video?.optionInputExtensions?.videoCodec).not.toContain('png')
    expect(video?.optionInputExtensions?.videoCodec).toContain('mov')
    expect(video?.optionInputExtensions?.alphaBackground).not.toContain('mp3')
    expect(video?.optionInputExtensions?.alphaBackground).toContain('mov')
    expect(findConversionOperation('images-to-pdf', ['png', 'jpeg'])?.options).toContain('blanks')
    expect(findConversionOperation('merge-pdfs', ['pdf', 'pdf'])).toBeTruthy()
    expect(findConversionOperation('convert:png', ['exe'])).toBeNull()
  })

  test('dedicated conversion bucket rejects anonymous read policy', async () => {
    const storage = {
      getBucketPolicy: jest.fn().mockResolvedValue(
        JSON.stringify({
          Statement: [{ Effect: 'Allow', Principal: '*', Action: 's3:GetObject' }],
        }),
      ),
    }
    await expect(assertPrivateConversionBucket(storage as any, 'private')).rejects.toThrow(
      '匿名访问',
    )
    storage.getBucketPolicy.mockRejectedValue({ code: 'NoSuchBucketPolicy' })
    await expect(assertPrivateConversionBucket(storage as any, 'private')).resolves.toBeUndefined()
  })

  function service(prisma: any) {
    const instance = new ConversionService(prisma)
    ;(instance as any).ready = true
    ;(instance as any).accepting = true
    ;(instance as any).storage = {
      putObject: jest.fn(), getObject: jest.fn(), bucketExists: jest.fn().mockResolvedValue(true),
    }
    jest.spyOn(instance as any, 'workerCapacity').mockResolvedValue({
      maxFileBytes: 16 * 1024 ** 3,
      maxBatchBytes: 32 * 1024 ** 3,
      maxFiles: 1000,
    })
    return instance
  }

  test('worker capacity is tied to the pinned engine revision', async () => {
    const instance = service({})
    ;((instance as any).workerCapacity as jest.Mock).mockRestore()
    const heartbeat = jest.spyOn((instance as any).redis, 'get')
    heartbeat.mockResolvedValueOnce(JSON.stringify({
      sourceRevision: 'wrong', maxFileBytes: 10, maxBatchBytes: 10, maxFiles: 1,
    })).mockResolvedValueOnce(JSON.stringify({
      sourceRevision: catalog.sourceRevision, maxFileBytes: 10, maxBatchBytes: 20, maxFiles: 1,
    }))
    await expect((instance as any).workerCapacity()).resolves.toBeNull()
    await expect((instance as any).workerCapacity()).resolves.toEqual({
      maxFileBytes: 10, maxBatchBytes: 20, maxFiles: 1,
    })
    await instance.onModuleDestroy()
  })

  test('recovers storage initialization after a dependency starts late', async () => {
    const keys = ['CONVERSION_FEATURE_ENABLED', 'CONVERSION_BUCKET', 'S3_BUCKET'] as const
    const previous = keys.map((key) => process.env[key])
    process.env.CONVERSION_FEATURE_ENABLED = 'true'
    process.env.CONVERSION_BUCKET = 'private'
    process.env.S3_BUCKET = 'public'
    const bucket = jest
      .spyOn(Client.prototype, 'bucketExists')
      .mockRejectedValueOnce(new Error('storage offline'))
      .mockResolvedValue(true)
    const policy = jest
      .spyOn(Client.prototype, 'getBucketPolicy')
      .mockRejectedValue({ code: 'NoSuchBucketPolicy' })
    const instance = new ConversionService({} as any)
    const ping = jest.spyOn((instance as any).redis, 'ping').mockResolvedValue('PONG')
    jest.spyOn((instance as any).logger, 'error').mockImplementation(() => undefined)
    try {
      await instance.onModuleInit()
      expect((instance as any).ready).toBe(false)
      await Promise.all([instance.retryInitialization(), instance.retryInitialization()])
      expect((instance as any).ready).toBe(true)
      expect(bucket).toHaveBeenCalledTimes(2)
      expect(ping).toHaveBeenCalledTimes(1)
    } finally {
      await instance.onModuleDestroy()
      bucket.mockRestore()
      policy.mockRestore()
      keys.forEach((key, index) => {
        if (previous[index] === undefined) delete process.env[key]
        else process.env[key] = previous[index]
      })
    }
  })

  test('capabilities fail closed without a live worker heartbeat', async () => {
    const instance = service({})
    jest.spyOn(instance as any, 'workerCapacity').mockResolvedValue(null)
    await expect(instance.capabilities()).resolves.toMatchObject({
      available: false,
      operations: [],
    })
    await instance.onModuleDestroy()
  })

  test('capabilities hide operations during a storage outage and recover afterward', async () => {
    const instance = service({})
    const bucket = jest
      .fn()
      .mockRejectedValueOnce(new Error('storage offline'))
      .mockResolvedValue(true)
    ;(instance as any).storage.bucketExists = bucket
    await expect(instance.capabilities()).resolves.toMatchObject({
      available: false,
      operations: [],
    })
    const restored = await instance.capabilities()
    expect(restored.available).toBe(true)
    expect(restored.operations.find((operation) => operation.id === 'convert:csv')).toMatchObject({
      inputExtensions: expect.arrayContaining(['tsv']),
    })
    expect(bucket).toHaveBeenCalledTimes(2)
    await instance.onModuleDestroy()
  })

  test('rejects unsupported extension before creating upload', async () => {
    const prisma = { ledgerConversionUpload: { create: jest.fn() } }
    const instance = service(prisma)
    await expect(instance.startUpload('u1', 'secret.exe', 10)).rejects.toThrow('尚未开放')
    expect(prisma.ledgerConversionUpload.create).not.toHaveBeenCalled()
    await instance.onModuleDestroy()
  })

  test('uses original per-file and batch limits without a text-only cap', async () => {
    const previous = process.env.CONVERSION_MAX_FILE_BYTES
    delete process.env.CONVERSION_MAX_FILE_BYTES
    const prisma = {
      ledgerConversionUpload: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({
          id: 'upload', chunkSize: data.chunkSize, chunkCount: data.chunkCount,
        })),
      },
    }
    const instance = service(prisma)
    try {
      await expect(instance.capabilities()).resolves.toMatchObject({
        limits: {
          maxFileBytes: 16 * 1024 ** 3,
          maxBatchBytes: 32 * 1024 ** 3,
          maxFiles: 1000,
        },
      })
      await expect(instance.startUpload('u1', 'large.mp4', 96_000_000)).resolves.toMatchObject({ chunkCount: 12 })
      await expect(instance.startUpload('u1', 'large.txt', 96_000_000)).resolves.toMatchObject({ chunkCount: 12 })
      await expect(instance.startUpload('u1', 'too-large.mp4', 16 * 1024 ** 3 + 1))
        .rejects.toThrow('文件大小超过当前上限')
      expect(prisma.ledgerConversionUpload.create).toHaveBeenCalledTimes(2)
    } finally {
      await instance.onModuleDestroy()
      if (previous === undefined) delete process.env.CONVERSION_MAX_FILE_BYTES
      else process.env.CONVERSION_MAX_FILE_BYTES = previous
    }
  })

  test('rejects another user upload when creating job', async () => {
    const prisma = { ledgerConversionUpload: { findMany: jest.fn().mockResolvedValue([]) } }
    const instance = service(prisma)
    await expect(
      instance.createJob('u1', { operationId: 'convert:md', uploadIds: ['foreign'], options: {} }),
    ).rejects.toThrow('文件不可用')
    expect(prisma.ledgerConversionUpload.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'u1' }) }),
    )
    await instance.onModuleDestroy()
  })

  test('rejects malformed upload IDs before Prisma', async () => {
    const prisma = { ledgerConversionUpload: { findMany: jest.fn() } }
    const instance = service(prisma)
    await expect(
      instance.createJob('u1', { operationId: 'convert:md', uploadIds: [42 as any] }),
    ).rejects.toThrow('文件数超限')
    expect(prisma.ledgerConversionUpload.findMany).not.toHaveBeenCalled()
    await instance.onModuleDestroy()
  })

  test('requires two PDFs for merge and validates PDF split options', async () => {
    const prisma = {
      ledgerConversionUpload: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'a', extension: 'pdf', totalBytes: 12n },
        ]),
      },
      $transaction: jest.fn(),
    }
    const instance = service(prisma)
    await expect(instance.createJob('u1', {
      operationId: 'merge-pdfs', uploadIds: ['a'],
    })).rejects.toThrow('至少需要两个文件')
    for (const options of [
      { splitMode: 'bogus' },
      { splitMode: 'group' },
      { splitMode: 'group', groupSize: '0' },
      { splitMode: 'group', groupSize: '1000' },
      { splitMode: 'page', groupSize: '2' },
    ]) {
      await expect(instance.createJob('u1', {
        operationId: 'convert:pdf', uploadIds: ['a'], options,
      })).rejects.toThrow('PDF 拆分选项不正确')
    }
    for (const options of [
      { pdfAction: 'encrypt' },
      { pdfAction: 'invalid', password: 'secret' },
      { password: 'secret' },
      { pdfAction: 'decrypt', password: 'secret', splitMode: 'page' },
    ]) {
      await expect(instance.createJob('u1', {
        operationId: 'convert:pdf', uploadIds: ['a'], options,
      })).rejects.toThrow('PDF 加解密选项不正确')
    }
    prisma.ledgerConversionUpload.findMany.mockResolvedValueOnce([
      { id: 'a', extension: 'png', totalBytes: 12n },
    ])
    await expect(instance.createJob('u1', {
      operationId: 'convert:pdf', uploadIds: ['a'], options: { splitMode: 'page' },
    })).rejects.toThrow('PDF 拆分选项不正确')
    expect(prisma.$transaction).not.toHaveBeenCalled()
    await instance.onModuleDestroy()
  })

  test('validates repeated blank page positions against image order', async () => {
    const prisma = {
      ledgerConversionUpload: { findMany: jest.fn().mockResolvedValue([
        { id: 'a', extension: 'png', totalBytes: 12n },
        { id: 'b', extension: 'jpeg', totalBytes: 12n },
      ]) },
      $transaction: jest.fn().mockRejectedValue(new Error('validation passed')),
    }
    const instance = service(prisma)
    for (const blanks of ['3', '-1', '1.5', '1,,2', 'abc', '1,']) {
      await expect(instance.createJob('u1', {
        operationId: 'images-to-pdf', uploadIds: ['a', 'b'], options: { blanks },
      })).rejects.toThrow('空白页位置不正确')
    }
    expect(prisma.$transaction).not.toHaveBeenCalled()
    await expect(instance.createJob('u1', {
      operationId: 'images-to-pdf', uploadIds: ['a', 'b'], options: { blanks: '0,1,1,2' },
    })).rejects.toThrow('validation passed')
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    await instance.onModuleDestroy()
  })

  test('rejects options the original ignores for this input', async () => {
    const prisma = {
      ledgerConversionUpload: { findMany: jest.fn().mockResolvedValue([
        { id: 'a', extension: 'png', totalBytes: 12n },
      ]) },
      $transaction: jest.fn(),
    }
    const instance = service(prisma)
    await expect(instance.createJob('u1', {
      operationId: 'convert:mp4', uploadIds: ['a'], options: { videoCodec: 'h265' },
    })).rejects.toThrow('该输入格式不支持所选选项')
    expect(prisma.$transaction).not.toHaveBeenCalled()
    await instance.onModuleDestroy()
  })

  test('rejects AV1 in MOV before enqueueing a job', async () => {
    const prisma = {
      ledgerConversionUpload: { findMany: jest.fn().mockResolvedValue([
        { id: 'a', extension: 'webm', totalBytes: 12n },
      ]) },
      $transaction: jest.fn(),
    }
    const instance = service(prisma)
    await expect(instance.createJob('u1', {
      operationId: 'convert:mov', uploadIds: ['a'], options: { videoCodec: 'av1' },
    })).rejects.toThrow('AV1 无法写入 MOV 容器')
    expect(prisma.$transaction).not.toHaveBeenCalled()
    await instance.onModuleDestroy()
  })

  test('does not overwrite a previously uploaded chunk with different bytes', async () => {
    const prisma = {
      ledgerConversionUpload: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'a',
          userId: 'u1',
          status: 'uploading',
          jobId: null,
          expiresAt: new Date(Date.now() + 60000),
          chunkCount: 1,
          chunkSize: 8,
          totalBytes: 4n,
          chunks: [{ sha256: 'different' }],
        }),
      },
    }
    const instance = service(prisma)
    const directory = await mkdtemp(join(tmpdir(), 'ledger-chunk-test-'))
    const path = join(directory, 'chunk')
    await writeFile(path, 'test')
    await expect(instance.putChunk('u1', 'a', '0', { path, size: 4 })).rejects.toThrow('内容不同')
    expect((instance as any).storage.putObject).not.toHaveBeenCalled()
    await instance.onModuleDestroy()
    await rm(directory, { recursive: true, force: true })
  })

  test('accepts replay of an identical chunk without storing twice', async () => {
    const sha256 = createHash('sha256').update('test').digest('hex')
    const prisma = {
      ledgerConversionUpload: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'a',
          userId: 'u1',
          status: 'uploading',
          jobId: null,
          expiresAt: new Date(Date.now() + 60000),
          chunkCount: 1,
          chunkSize: 8,
          totalBytes: 4n,
          chunks: [{ sha256 }],
        }),
      },
    }
    const instance = service(prisma)
    const directory = await mkdtemp(join(tmpdir(), 'ledger-chunk-test-'))
    const path = join(directory, 'chunk')
    await writeFile(path, 'test')
    await expect(instance.putChunk('u1', 'a', '0', { path, size: 4 }))
      .resolves.toEqual({ index: 0, sha256, uploaded: true })
    expect((instance as any).storage.putObject).not.toHaveBeenCalled()
    await instance.onModuleDestroy()
    await rm(directory, { recursive: true, force: true })
  })

  test('will not mark an incomplete upload ready', async () => {
    const prisma = {
      ledgerConversionUpload: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'a',
          userId: 'u1',
          status: 'uploading',
          jobId: null,
          expiresAt: new Date(Date.now() + 60000),
          chunkCount: 2,
          totalBytes: 4n,
          chunks: [{ index: 0, sizeBytes: 2 }],
        }),
      },
    }
    const instance = service(prisma)
    await expect(instance.completeUpload('u1', 'a')).rejects.toThrow('分片未全部上传')
    await instance.onModuleDestroy()
  })

  test('finishes complete chunks and records retention after cancellation', async () => {
    const prisma = {
      ledgerConversionUpload: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'a',
          userId: 'u1',
          status: 'uploading',
          jobId: null,
          expiresAt: new Date(Date.now() + 60000),
          chunkCount: 2,
          totalBytes: 4n,
          chunks: [
            { index: 0, sizeBytes: 2 },
            { index: 1, sizeBytes: 2 },
          ],
        }),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      ledgerConversionJob: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    }
    const instance = service(prisma)
    await expect(instance.completeUpload('u1', 'a')).resolves.toEqual({ id: 'a', status: 'ready' })
    await expect(instance.cancelJob('u1', 'j1')).resolves.toEqual({ id: 'j1', status: 'cancelled' })
    const data = prisma.ledgerConversionJob.updateMany.mock.calls[0][0].data
    expect(data.expiresAt.getTime() - data.finishedAt.getTime()).toBe(30 * 24 * 60 * 60 * 1000)
    await instance.onModuleDestroy()
  })

  test('asset read is scoped to the owning ledger user', async () => {
    const prisma = { ledgerConversionAsset: { findFirst: jest.fn().mockResolvedValue(null) } }
    const instance = service(prisma)
    await expect(instance.asset('u1', 'j1', 'a1')).rejects.toThrow('结果不存在')
    expect(prisma.ledgerConversionAsset.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'a1',
        jobId: 'j1',
        job: { userId: 'u1', status: 'succeeded', expiresAt: { gt: expect.any(Date) } },
      },
      select: { id: true, objectKey: true, fileName: true, mimeType: true, sizeBytes: true },
    })
    await instance.onModuleDestroy()
  })

  test('asset ranges retain owner checks and return exact byte lengths', async () => {
    const asset = { id: 'a1', objectKey: 'private/result', sizeBytes: 10n }
    const prisma = { ledgerConversionAsset: { findFirst: jest.fn().mockResolvedValue(asset) } }
    const instance = service(prisma)
    const storage = {
      getObject: jest.fn().mockResolvedValue('whole'),
      getPartialObject: jest.fn().mockResolvedValue('part'),
    }
    ;(instance as any).storage = storage

    await expect(instance.asset('u1', 'j1', 'a1')).resolves.toMatchObject({
      stream: 'whole', statusCode: 200, contentLength: 10,
    })
    await expect(instance.asset('u1', 'j1', 'a1', 'bytes=3-6')).resolves.toMatchObject({
      stream: 'part', statusCode: 206, contentLength: 4, contentRange: 'bytes 3-6/10',
    })
    expect(storage.getPartialObject).toHaveBeenCalledWith('jiujiu-conversions', 'private/result', 3, 4)
    await expect(instance.asset('u1', 'j1', 'a1', 'bytes=8-20')).resolves.toMatchObject({
      contentLength: 2, contentRange: 'bytes 8-9/10',
    })
    await expect(instance.asset('u1', 'j1', 'a1', 'bytes=-4')).resolves.toMatchObject({
      contentLength: 4, contentRange: 'bytes 6-9/10',
    })
    for (const range of ['bytes=10-', 'bytes=6-3', 'bytes=0-1,4-5', 'bytes=-0', 'bytes=-']) {
      await expect(instance.asset('u1', 'j1', 'a1', range)).rejects.toMatchObject({ status: 416 })
    }
    expect(storage.getPartialObject).toHaveBeenCalledTimes(3)
    expect(prisma.ledgerConversionAsset.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'a1', jobId: 'j1',
        job: { userId: 'u1', status: 'succeeded', expiresAt: { gt: expect.any(Date) } },
      },
      select: { id: true, objectKey: true, fileName: true, mimeType: true, sizeBytes: true },
    })
    await instance.onModuleDestroy()
  })

  test('upload resume checks the ledger owner and expiry', async () => {
    const prisma = {
      ledgerConversionUpload: { findFirst: jest.fn().mockResolvedValue(null) },
    }
    const instance = service(prisma)
    await expect(instance.uploadStatus('u1', 'foreign')).rejects.toThrow('不存在或已过期')
    expect(prisma.ledgerConversionUpload.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'foreign', userId: 'u1' } }),
    )
    await instance.onModuleDestroy()
  })

  test('failed job retry is owner-scoped and requeues only an unexpired job', async () => {
    const prisma = {
      ledgerConversionJob: {
        findFirst: jest.fn().mockResolvedValue({
          options: { password: 'secret', textEncoding: 'utf-8', __conversionWarnings: ['old warning'] },
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      ledgerConversionUpload: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    }
    const instance = service(prisma)
    jest.spyOn(instance as any, 'enqueue').mockResolvedValue(undefined)
    await expect(instance.retryJob('u1', 'j1')).resolves.toEqual({ id: 'j1', status: 'queued' })
    expect(prisma.ledgerConversionJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'j1', userId: 'u1', status: 'failed', expiresAt: { gt: expect.any(Date) } },
        data: expect.objectContaining({
          status: 'queued', leaseId: null, expiresAt: null,
          options: { password: 'secret', textEncoding: 'utf-8' },
        }),
      }),
    )
    await instance.onModuleDestroy()
  })

  test('expired job cleanup deletes private result and input objects', async () => {
    const prisma = {
      ledgerConversionJob: {
        findMany: jest.fn().mockResolvedValue([{ id: 'j1' }]),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ userId: 'u1' }),
        delete: jest.fn().mockResolvedValue({}),
      },
      ledgerConversionUpload: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([{ id: 'up1' }])
          .mockResolvedValueOnce([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    }
    const instance = service(prisma)
    const storage = {
      listObjectsV2: jest.fn().mockImplementation((_bucket: string, prefix: string) =>
        (async function* () {
          yield { name: prefix + 'file' }
        })(),
      ),
      removeObjects: jest.fn().mockResolvedValue(undefined),
    }
    ;(instance as any).storage = storage
    await instance.cleanupExpired()
    expect(storage.removeObjects).toHaveBeenCalledWith('jiujiu-conversions', [
      'ledger-conversions/u1/jobs/j1/file',
    ])
    expect(storage.removeObjects).toHaveBeenCalledWith('jiujiu-conversions', [
      'ledger-conversions/u1/uploads/up1/file',
    ])
    expect(prisma.ledgerConversionJob.delete).toHaveBeenCalledWith({ where: { id: 'j1' } })
    await instance.onModuleDestroy()
  })

  test('expired orphan cleanup keeps the upload owner in the object prefix', async () => {
    const prisma = {
      ledgerConversionJob: { findMany: jest.fn().mockResolvedValue([]) },
      ledgerConversionUpload: {
        findMany: jest.fn().mockResolvedValue([{ id: 'up1', userId: 'u1' }]),
        delete: jest.fn().mockResolvedValue({}),
      },
    }
    const instance = service(prisma)
    const storage = {
      listObjectsV2: jest.fn().mockImplementation((_bucket: string, prefix: string) =>
        (async function* () {
          yield { name: prefix + 'file' }
        })(),
      ),
      removeObjects: jest.fn().mockResolvedValue(undefined),
    }
    ;(instance as any).storage = storage

    await instance.cleanupExpired()

    expect(storage.listObjectsV2).toHaveBeenCalledWith(
      'jiujiu-conversions',
      'ledger-conversions/u1/uploads/up1/',
      true,
    )
    expect(prisma.ledgerConversionUpload.delete).toHaveBeenCalledWith({ where: { id: 'up1' } })
    await instance.onModuleDestroy()
  })

  test('manual deletion failure still schedules queued job cleanup', async () => {
    const prisma = {
      ledgerConversionJob: {
        findFirst: jest.fn().mockResolvedValue({ id: 'j1', status: 'queued', expiresAt: null }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    }
    const instance = service(prisma)
    jest.spyOn(instance as any, 'removeJobObjects').mockRejectedValue(new Error('storage offline'))
    await expect(instance.deleteJob('u1', 'j1')).rejects.toThrow('storage offline')
    expect(prisma.ledgerConversionJob.updateMany.mock.calls[0][0].data.expiresAt).toBeInstanceOf(
      Date,
    )
    await instance.onModuleDestroy()
  })

  test('job history converts BigInt and omits internal lease identifiers', async () => {
    const prisma = {
      ledgerConversionJob: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'j1',
            operationId: 'convert:md',
            status: 'succeeded',
            progress: 100,
            options: { password: 'secret', __conversionWarnings: ['请核对 secret'] },
            uploadOrder: ['u2', 'u1'],
            leaseId: 'internal-secret',
            uploads: [
              { id: 'u1', fileName: 'a.txt', totalBytes: 1n },
              { id: 'u2', fileName: 'b.txt', totalBytes: 2n },
            ],
            assets: [{ id: 'a1', fileName: 'a.md', sizeBytes: 3n }],
          },
        ]),
      },
    }
    const instance = service(prisma)
    const jobs = await instance.listJobs('u1')
    expect(jobs[0].uploads.map((item: any) => item.id)).toEqual(['u2', 'u1'])
    expect(JSON.stringify(jobs)).not.toContain('internal-secret')
    expect(jobs[0].assets[0].sizeBytes).toBe(3)
    expect(jobs[0].warnings).toEqual(['请核对 ***'])
    expect(jobs[0].options).toEqual({})
    expect(JSON.stringify(jobs)).not.toContain('secret')
    await instance.onModuleDestroy()
  })
})
