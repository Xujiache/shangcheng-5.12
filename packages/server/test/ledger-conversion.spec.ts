import { createHash } from 'node:crypto'
import { Client } from 'minio'
import { ConversionService } from '../src/modules/ledger-conversion/conversion.service'
import {
  findConversionOperation,
  VERIFIED_CONVERSION_OPERATIONS,
} from '../src/modules/ledger-conversion/conversion.operations'
import { assertPrivateConversionBucket } from '../src/modules/ledger-conversion/conversion.storage'

describe('ledger conversion gate', () => {
  test('only Linux-observed pairs are advertised', () => {
    expect(VERIFIED_CONVERSION_OPERATIONS).toHaveLength(27)
    expect(findConversionOperation('convert:md', ['txt'])).toBeTruthy()
    expect(findConversionOperation('convert:md', ['docx'])).toBeTruthy()
    expect(findConversionOperation('convert:md', ['gif'])).toBeTruthy()
    expect(findConversionOperation('convert:md', ['pdf'])).toBeNull()
    expect(findConversionOperation('convert:docx', ['md'])).toBeTruthy()
    expect(findConversionOperation('convert:docx', ['png'])).toBeTruthy()
    expect(findConversionOperation('convert:docx', ['pdf'])).toBeNull()
    expect(findConversionOperation('convert:txt', ['png'])).toBeTruthy()
    expect(findConversionOperation('convert:txt', ['jpg'])).toBeTruthy()
    expect(findConversionOperation('convert:txt', ['jpeg'])).toBeTruthy()
    expect(findConversionOperation('convert:png', ['jpg'])).toBeTruthy()
    expect(findConversionOperation('convert:png', ['jpeg'])).toBeTruthy()
    expect(findConversionOperation('convert:png', ['webp'])).toBeTruthy()
    expect(findConversionOperation('convert:png', ['pdf'])).toBeTruthy()
    expect(findConversionOperation('convert:png', ['ico'])).toBeTruthy()
    expect(findConversionOperation('convert:jpg', ['pdf'])).toBeTruthy()
    expect(findConversionOperation('convert:webp', ['jpg'])).toBeTruthy()
    expect(findConversionOperation('convert:webp', ['jpeg'])).toBeTruthy()
    expect(findConversionOperation('convert:webp', ['png'])).toBeTruthy()
    expect(findConversionOperation('convert:webp', ['pdf'])).toBeTruthy()
    expect(findConversionOperation('convert:pdf', ['png'])).toBeTruthy()
    expect(findConversionOperation('convert:pdf', ['md'])).toBeTruthy()
    expect(findConversionOperation('convert:pdf', ['docx'])).toBeNull()
    expect(findConversionOperation('convert:flac', ['mp3'])).toBeTruthy()
    expect(findConversionOperation('convert:flac', ['flac'])).toBeNull()
    expect(findConversionOperation('convert:wma', ['opus'])).toBeTruthy()
    expect(findConversionOperation('convert:jxl', ['webp'])).toBeTruthy()
    expect(findConversionOperation('convert:tiff', ['png'])).toBeTruthy()
    expect(findConversionOperation('convert:tiff', ['webp'])).toBeNull()
    expect(findConversionOperation('images-to-pdf', ['png', 'jpeg'])).toBeTruthy()
    expect(findConversionOperation('images-to-pdf', ['pdf'])).toBeNull()
    expect(findConversionOperation('merge-pdfs', ['pdf'])).toBeNull()
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
    ;(instance as any).storage = { putObject: jest.fn(), getObject: jest.fn() }
    return instance
  }

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
    jest.spyOn((instance as any).redis, 'exists').mockResolvedValue(0)
    await expect(instance.capabilities()).resolves.toMatchObject({
      available: false,
      operations: [],
    })
    await instance.onModuleDestroy()
  })

  test('capabilities hide operations during a storage outage and recover afterward', async () => {
    const instance = service({})
    jest.spyOn((instance as any).redis, 'exists').mockResolvedValue(1)
    const bucket = jest
      .fn()
      .mockRejectedValueOnce(new Error('storage offline'))
      .mockResolvedValue(true)
    ;(instance as any).storage.bucketExists = bucket
    await expect(instance.capabilities()).resolves.toMatchObject({
      available: false,
      operations: [],
    })
    await expect(instance.capabilities()).resolves.toMatchObject({ available: true })
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
    await expect(
      instance.putChunk('u1', 'a', '0', { buffer: Buffer.from('test'), size: 4 }),
    ).rejects.toThrow('内容不同')
    expect((instance as any).storage.putObject).not.toHaveBeenCalled()
    await instance.onModuleDestroy()
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
    await expect(
      instance.putChunk('u1', 'a', '0', { buffer: Buffer.from('test'), size: 4 }),
    ).resolves.toEqual({ index: 0, sha256, uploaded: true })
    expect((instance as any).storage.putObject).not.toHaveBeenCalled()
    await instance.onModuleDestroy()
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
      ledgerConversionJob: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      ledgerConversionUpload: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    }
    const instance = service(prisma)
    jest.spyOn(instance as any, 'enqueue').mockResolvedValue(undefined)
    await expect(instance.retryJob('u1', 'j1')).resolves.toEqual({ id: 'j1', status: 'queued' })
    expect(prisma.ledgerConversionJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'j1', userId: 'u1', status: 'failed', expiresAt: { gt: expect.any(Date) } },
        data: expect.objectContaining({ status: 'queued', leaseId: null, expiresAt: null }),
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
            options: {},
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
    await instance.onModuleDestroy()
  })
})
