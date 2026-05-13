import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { Client } from 'minio'
import { customAlphabet } from 'nanoid'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'

const nano = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16)

/** Multer 文件结构（避免依赖 @types/multer） */
interface MulterFile {
  buffer: Buffer
  originalname: string
  mimetype: string
  size: number
}

const IMAGE_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const VIDEO_MIME = ['video/mp4', 'video/webm']
const IMAGE_MAX = 10 * 1024 * 1024
const VIDEO_MAX = 50 * 1024 * 1024

@Injectable()
export class FilesService implements OnModuleInit {
  private readonly logger = new Logger(FilesService.name)
  private client: Client | null = null
  private bucket = process.env.S3_BUCKET || 'jiujiu-mall'
  private publicUrl = process.env.S3_PUBLIC_URL || 'http://localhost:9000/jiujiu-mall'

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const endpoint = (process.env.S3_ENDPOINT || 'http://localhost:9000').replace(/^https?:\/\//, '')
      const useSSL = (process.env.S3_ENDPOINT || '').startsWith('https')
      const [host, port] = endpoint.split(':')
      this.client = new Client({
        endPoint: host,
        port: port ? Number(port) : useSSL ? 443 : 80,
        useSSL,
        accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
      })
      const exists = await this.client.bucketExists(this.bucket).catch(() => false)
      if (!exists) {
        await this.client.makeBucket(this.bucket, process.env.S3_REGION || 'cn-east-1')
        this.logger.log(`bucket created: ${this.bucket}`)
      }
    } catch (e: any) {
      this.logger.warn(`MinIO init failed: ${e?.message} (uploads will fail until configured)`)
      this.client = null
    }
  }

  private validateFile(file: MulterFile) {
    const isImage = IMAGE_MIME.includes(file.mimetype)
    const isVideo = VIDEO_MIME.includes(file.mimetype)
    if (!isImage && !isVideo) {
      throw new BizException(BizCode.INVALID_PARAMS, `不支持的文件类型：${file.mimetype}`)
    }
    if (isImage && file.size > IMAGE_MAX) {
      throw new BizException(BizCode.INVALID_PARAMS, '图片不能超过 10MB')
    }
    if (isVideo && file.size > VIDEO_MAX) {
      throw new BizException(BizCode.INVALID_PARAMS, '视频不能超过 50MB')
    }
  }

  async upload(file: MulterFile, bizType: string, ownerId?: string) {
    if (!file) throw new BizException(BizCode.INVALID_PARAMS, '未上传文件')
    this.validateFile(file)
    if (!this.client) throw new BizException(BizCode.BUSINESS_ERROR, '对象存储未配置')

    const ext = (file.originalname.split('.').pop() || 'bin').toLowerCase()
    const d = new Date()
    const key = `${bizType}/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${nano()}.${ext}`
    await this.client.putObject(this.bucket, key, file.buffer, file.size, { 'Content-Type': file.mimetype })
    const url = `${this.publicUrl}/${key}`

    await this.prisma.uploadedFile.create({
      data: { key, url, size: file.size, mimeType: file.mimetype, bizType, ownerId: ownerId || null },
    })
    return { url, key, size: file.size, mimeType: file.mimetype }
  }

  async batchUpload(files: MulterFile[], bizType: string, ownerId?: string) {
    const out: any[] = []
    for (const f of files) out.push(await this.upload(f, bizType, ownerId))
    return out
  }

  /**
   * 上传 APK（独立通道，绕开常规图片/视频的 mime + size 校验）。
   * 仅给 AppReleaseService 用 —— controller 层不直接暴露。
   *
   * 限制：
   *   - mime 必须是 application/vnd.android.package-archive 或 application/octet-stream
   *   - 后缀必须是 .apk
   *   - 大小 ≤ 300MB
   */
  async uploadApk(file: MulterFile, ownerId?: string) {
    if (!file) throw new BizException(BizCode.INVALID_PARAMS, '未上传文件')
    const ext = (file.originalname.split('.').pop() || '').toLowerCase()
    if (ext !== 'apk') {
      throw new BizException(BizCode.INVALID_PARAMS, '仅支持 .apk 文件')
    }
    const okMime = file.mimetype === 'application/vnd.android.package-archive'
      || file.mimetype === 'application/octet-stream'
    if (!okMime) {
      throw new BizException(BizCode.INVALID_PARAMS, `不支持的 APK mime：${file.mimetype}`)
    }
    if (file.size > 300 * 1024 * 1024) {
      throw new BizException(BizCode.INVALID_PARAMS, 'APK 不能超过 300MB')
    }
    if (!this.client) throw new BizException(BizCode.BUSINESS_ERROR, '对象存储未配置')

    const d = new Date()
    const key = `apk/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${nano()}.apk`
    await this.client.putObject(this.bucket, key, file.buffer, file.size, {
      'Content-Type': 'application/vnd.android.package-archive',
    })
    const url = `${this.publicUrl}/${key}`

    await this.prisma.uploadedFile.create({
      data: { key, url, size: file.size, mimeType: 'application/vnd.android.package-archive', bizType: 'apk', ownerId: ownerId || null },
    })
    return { url, key, size: file.size }
  }

  async remove(key: string) {
    if (!this.client) throw new BizException(BizCode.BUSINESS_ERROR, '对象存储未配置')
    await this.client.removeObject(this.bucket, key).catch(() => null)
    await this.prisma.uploadedFile.deleteMany({ where: { key } })
    return { ok: true }
  }
}
