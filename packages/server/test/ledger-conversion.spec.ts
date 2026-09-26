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
    expect(VERIFIED_CONVERSION_OPERATIONS).toHaveLength(46)
    expect(findConversionOperation('convert:md', ['txt'])).toBeTruthy()
    expect(findConversionOperation('convert:md', ['docx'])).toBeTruthy()
    expect(findConversionOperation('convert:md', ['gif'])).toBeTruthy()
    expect(findConversionOperation('convert:md', ['pdf'])).toBeTruthy()
    expect(findConversionOperation('convert:docx', ['md'])).toBeTruthy()
    expect(findConversionOperation('convert:docx', ['png'])).toBeTruthy()
    expect(findConversionOperation('convert:docx', ['pdf'])).toBeTruthy()
    expect(findConversionOperation('convert:txt', ['png'])).toBeTruthy()
    expect(findConversionOperation('convert:txt', ['jpg'])).toBeTruthy()
    expect(findConversionOperation('convert:txt', ['jpeg'])).toBeTruthy()
    expect(findConversionOperation('convert:txt', ['pdf'])).toBeTruthy()
    expect(findConversionOperation('convert:html', ['pdf'])).toBeTruthy()
    expect(findConversionOperation('convert:png', ['jpg'])).toBeTruthy()
    expect(findConversionOperation('convert:png', ['jpeg'])).toBeTruthy()
    expect(findConversionOperation('convert:png', ['webp'])).toBeTruthy()
    expect(findConversionOperation('convert:png', ['pdf'])).toBeTruthy()
    expect(findConversionOperation('convert:png', ['ico'])).toBeTruthy()
    expect(findConversionOperation('convert:png', ['heic'])).toBeTruthy()
    expect(findConversionOperation('convert:png', ['psd'])).toBeTruthy()
    expect(findConversionOperation('convert:jpg', ['pdf'])).toBeTruthy()
    expect(findConversionOperation('convert:webp', ['jpg'])).toBeTruthy()
    expect(findConversionOperation('convert:webp', ['jpeg'])).toBeTruthy()
    expect(findConversionOperation('convert:webp', ['png'])).toBeTruthy()
    expect(findConversionOperation('convert:webp', ['pdf'])).toBeTruthy()
    expect(findConversionOperation('convert:pdf', ['png'])).toBeTruthy()
    expect(findConversionOperation('convert:pdf', ['md'])).toBeTruthy()
    expect(findConversionOperation('convert:pdf', ['docx'])).toBeTruthy()
    expect(findConversionOperation('convert:pdf', ['zip'])).toBeTruthy()
    expect(findConversionOperation('convert:pdf', ['pdf'])).toMatchObject({
      options: ['splitMode', 'groupSize'],
    })
    expect(findConversionOperation('convert:flac', ['mp3'])).toBeTruthy()
    expect(findConversionOperation('convert:flac', ['flac'])).toBeNull()
    expect(findConversionOperation('convert:wma', ['opus'])).toBeTruthy()
    expect(findConversionOperation('convert:wma', ['mp4'])).toBeTruthy()
    expect(findConversionOperation('convert:mp4', ['webm'])).toBeTruthy()
    expect(findConversionOperation('convert:mp4', ['svg'])).toBeTruthy()
    expect(findConversionOperation('convert:mp4', ['mp4'])).toBeNull()
    expect(findConversionOperation('convert:gif', ['m4s'])).toBeTruthy()
    expect(findConversionOperation('convert:ass', ['vtt'])).toBeTruthy()
    expect(findConversionOperation('convert:txt', ['ssa'])).toBeTruthy()
    expect(findConversionOperation('convert:epub', ['yaml'])).toBeTruthy()
    expect(findConversionOperation('convert:xlsx', ['csv'])).toBeTruthy()
    expect(findConversionOperation('convert:csv', ['tsv'])).toBeTruthy()
    expect(findConversionOperation('convert:csv', ['xlsm'])).toBeTruthy()
    expect(findConversionOperation('convert:html', ['xlsm'])).toBeTruthy()
    expect(findConversionOperation('convert:pdf', ['xlsm'])).toBeTruthy()
    expect(findConversionOperation('convert:xlsx', ['xlsm'])).toBeNull()
    expect(findConversionOperation('convert:xlsx', ['pdf'])).toBeTruthy()
    expect(findConversionOperation('convert:pdf', ['html'])).toBeTruthy()
    expect(findConversionOperation('convert:pdf', ['htm'])).toBeTruthy()
    expect(findConversionOperation('convert:jxl', ['webp'])).toBeTruthy()
    expect(findConversionOperation('convert:jxl', ['avif'])).toBeTruthy()
    expect(findConversionOperation('convert:jxl', ['jpeg'])).toBeTruthy()
    expect(findConversionOperation('convert:tiff', ['png'])).toBeTruthy()
    expect(findConversionOperation('convert:tiff', ['webp'])).toBeNull()
    expect(findConversionOperation('convert:tiff', ['gif'])).toBeNull()
    expect(findConversionOperation('convert:jpg', ['jfif'])).toBeNull()
    expect(findConversionOperation('convert:txt', ['mobi'])).toBeNull()
    expect(findConversionOperation('images-to-pdf', ['png', 'jpeg'])).toBeTruthy()
    expect(findConversionOperation('images-to-pdf', ['pdf'])).toBeNull()
    expect(findConversionOperation('merge-pdfs', ['pdf', 'pdf'])).toBeTruthy()
    expect(findConversionOperation('merge-pdfs', ['png'])).toBeNull()
  })

  test('advertises the 70 Office pairs verified with Chinese and numeric content', () => {
    const officePairs: Record<string, string[]> = {
      docx: ['pdf', 'odt', 'rtf', 'txt', 'html', 'md'],
      doc: ['pdf', 'docx', 'odt', 'rtf', 'txt', 'html', 'md'],
      odt: ['pdf', 'docx', 'rtf', 'txt', 'html', 'md'],
      rtf: ['pdf', 'docx', 'odt', 'txt', 'html', 'md'],
      xlsx: ['pdf', 'xls', 'ods', 'csv', 'html'],
      xls: ['pdf', 'xlsx', 'ods', 'csv', 'html'],
      ods: ['pdf', 'xlsx', 'xls', 'csv', 'html'],
      csv: ['pdf', 'xlsx', 'html', 'txt', 'md', 'json', 'epub'],
      tsv: ['pdf', 'xlsx', 'html', 'txt', 'md', 'json', 'epub'],
      pptx: ['pdf', 'odp', 'html', 'png', 'jpg'],
      ppt: ['pdf', 'pptx', 'odp', 'html', 'png', 'jpg'],
      odp: ['pdf', 'pptx', 'html', 'png', 'jpg'],
    }
    expect(Object.values(officePairs).reduce((count, targets) => count + targets.length, 0)).toBe(70)
    for (const [source, targets] of Object.entries(officePairs)) {
      for (const target of targets) {
        expect(findConversionOperation(`convert:${target}`, [source])).toBeTruthy()
      }
    }
  })

  test('opens verified camera and Illustrator outputs without exposing unverified OCR or RAW video', () => {
    const illustratorTargets = [
      'png', 'jpg', 'webp', 'gif', 'avif', 'tiff', 'ico',
      'bmp', 'tga', 'jp2', 'jxl', 'qoi', 'ppm', 'pdf',
    ]
    for (const target of illustratorTargets)
      expect(findConversionOperation(`convert:${target}`, ['ai'])).toBeTruthy()
    for (const source of ['cr2', 'dng']) {
      for (const target of ['png', 'jpg', 'webp', 'gif', 'tiff', 'ico', 'bmp', 'tga', 'qoi', 'ppm'])
        expect(findConversionOperation(`convert:${target}`, [source])).toBeTruthy()
      for (const target of ['avif', 'jp2', 'jxl', 'pdf', 'txt', 'md', 'docx', 'mp4', 'webm'])
        expect(findConversionOperation(`convert:${target}`, [source])).toBeNull()
    }
    expect(findConversionOperation('convert:txt', ['ai'])).toBeTruthy()
    expect(findConversionOperation('convert:docx', ['ai'])).toBeTruthy()
    expect(findConversionOperation('convert:md', ['ai'])).toBeNull()
    for (const target of ['mp4', 'webm']) {
      expect(findConversionOperation(`convert:${target}`, ['ai'])).toBeTruthy()
    }
  })

  test('limits newly sampled camera RAW inputs to verified image outputs', () => {
    const sources = [
      'cr3', 'nef', 'arw', 'raf', 'rw2', 'orf', 'pef', 'srw',
      'crw', '3fr', 'erf', 'iiq', 'kdc', 'mrw',
    ]
    for (const source of sources) {
      for (const target of ['png', 'jpg', 'webp', 'gif', 'tiff', 'ico', 'bmp', 'tga', 'qoi', 'ppm'])
        expect(findConversionOperation(`convert:${target}`, [source])).toBeTruthy()
      for (const target of ['pdf', 'jp2', 'jxl', 'txt', 'md', 'docx', 'mp4', 'webm'])
        expect(findConversionOperation(`convert:${target}`, [source])).toBeNull()
    }
    for (const source of ['fff', 'mef', 'x3f'])
      expect(findConversionOperation('convert:png', [source])).toBeNull()
  })

  test('allows checked EPUB to PDF while keeping unverified EPUB to Word closed', () => {
    expect(findConversionOperation('convert:pdf', ['epub'])).toBeTruthy()
    expect(findConversionOperation('convert:docx', ['epub'])).toBeNull()
  })

  test('opens only content-checked Kingsoft template conversions', () => {
    const checkedPairs: Record<string, string[]> = {
      wps: ['pdf', 'docx', 'odt', 'rtf', 'txt', 'html', 'md'],
      wpt: ['pdf', 'docx', 'odt', 'rtf', 'txt', 'html'],
      et: ['pdf', 'xlsx', 'xls', 'ods', 'csv', 'html'],
      ett: ['pdf', 'xlsx', 'xls', 'ods', 'html'],
      dpt: ['pdf', 'pptx', 'odp', 'png', 'jpg'],
    }
    for (const [source, targets] of Object.entries(checkedPairs))
      for (const target of targets)
        expect(findConversionOperation(`convert:${target}`, [source])).toBeTruthy()
    expect(findConversionOperation('convert:pdf', ['dps'])).toBeNull()
    expect(findConversionOperation('convert:md', ['wpt'])).toBeNull()
    expect(findConversionOperation('convert:csv', ['ett'])).toBeNull()
    expect(findConversionOperation('convert:html', ['dpt'])).toBeNull()
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

  test('accepts 96 MB media without allocating it while text stays at 64 MiB', async () => {
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
      jest.spyOn((instance as any).redis, 'exists').mockResolvedValue(0)
      await expect(instance.capabilities()).resolves.toMatchObject({
        limits: {
          maxFileBytes: 96_000_000,
          textFileBytes: 64 * 1024 ** 2,
          maxBatchBytes: 256 * 1024 ** 2,
          maxFiles: 100,
        },
      })
      await expect(instance.startUpload('u1', 'large.mp4', 96_000_000)).resolves.toMatchObject({
        chunkCount: 12,
      })
      expect(prisma.ledgerConversionUpload.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ totalBytes: 96_000_000n }),
      })
      await expect(instance.startUpload('u1', 'too-large.mp4', 96_000_001))
        .rejects.toThrow('文件大小超过当前已验证的上限')
      await expect(instance.startUpload('u1', 'large.txt', 96_000_000))
        .rejects.toThrow('文件大小超过当前已验证的上限')
      expect(prisma.ledgerConversionUpload.create).toHaveBeenCalledTimes(1)
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
    prisma.ledgerConversionUpload.findMany.mockResolvedValueOnce([
      { id: 'a', extension: 'png', totalBytes: 12n },
    ])
    await expect(instance.createJob('u1', {
      operationId: 'convert:pdf', uploadIds: ['a'], options: { splitMode: 'page' },
    })).rejects.toThrow('PDF 拆分选项不正确')
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
