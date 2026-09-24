import { Injectable, OnModuleInit, Logger, Optional } from '@nestjs/common'
import { Client } from 'minio'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { customAlphabet } from 'nanoid'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import {
  ContentSecurityService,
  WechatContentScope,
} from '../content-security/content-security.service'
import {
  createSquareThumbnail,
  IMMUTABLE_CACHE_CONTROL,
  thumbnailKeyForObjectKey,
} from './image-thumbnail.util'

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
const FEEDBACK_URL_TTL_SECONDS = 3600
function ledgerImageMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])))
    return 'image/jpeg'
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')))
    return 'image/png'
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6)))
    return 'image/gif'
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  )
    return 'image/webp'
  return null
}

@Injectable()
export class FilesService implements OnModuleInit {
  private readonly logger = new Logger(FilesService.name)
  private client: Client | null = null
  private bucket = process.env.S3_BUCKET || 'jiujiu-mall'
  private publicUrl = process.env.S3_PUBLIC_URL || 'http://localhost:9000/jiujiu-mall'
  private privateBucket = process.env.S3_PRIVATE_BUCKET || ''

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly contentSecurity?: ContentSecurityService,
  ) {}

  async onModuleInit() {
    const isProd = process.env.NODE_ENV === 'production'
    const accessKey = process.env.S3_ACCESS_KEY || ''
    const secretKey = process.env.S3_SECRET_KEY || ''

    // 生产环境必须显式配置 S3 凭据，绝不能使用 minioadmin 默认值，
    // 否则有"管理员密码裸奔"的严重风险。
    if (isProd && (!accessKey || !secretKey)) {
      this.logger.error('[files] 生产环境缺少 S3_ACCESS_KEY / S3_SECRET_KEY，上传服务将不可用')
      this.client = null
      return
    }

    try {
      const endpoint = (process.env.S3_ENDPOINT || 'http://localhost:9000').replace(
        /^https?:\/\//,
        '',
      )
      const useSSL = (process.env.S3_ENDPOINT || '').startsWith('https')
      const [host, port] = endpoint.split(':')
      this.client = new Client({
        endPoint: host,
        port: port ? Number(port) : useSSL ? 443 : 80,
        useSSL,
        // 非生产兜底 minioadmin（与 docker-compose 默认一致），生产则使用真实凭据
        accessKey: accessKey || (isProd ? '' : 'minioadmin'),
        secretKey: secretKey || (isProd ? '' : 'minioadmin'),
      })
      const exists = await this.client.bucketExists(this.bucket).catch(() => false)
      if (!exists) {
        await this.client.makeBucket(this.bucket, process.env.S3_REGION || 'cn-east-1')
        this.logger.log(`bucket created: ${this.bucket}`)
      }
      if (this.privateBucket) {
        if (this.privateBucket === this.bucket)
          throw new Error('S3_PRIVATE_BUCKET 必须独立于公开桶')
        const privateExists = await this.client.bucketExists(this.privateBucket)
        if (!privateExists)
          await this.client.makeBucket(this.privateBucket, process.env.S3_REGION || 'cn-east-1')
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

  async upload(
    file: MulterFile,
    bizType: string,
    ownerId?: string,
    contentScope: WechatContentScope = bizType === 'ledger-ad' ? 'ledger' : 'mall',
  ) {
    if (!file) throw new BizException(BizCode.INVALID_PARAMS, '未上传文件')
    this.validateFile(file)
    if (contentScope === 'ledger') {
      const actual = ledgerImageMime(file.buffer)
      const claimed = file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype
      if (!actual || actual !== claimed || file.buffer.length !== file.size) {
        throw new BizException(BizCode.INVALID_PARAMS, '图片内容与文件类型不匹配')
      }
    }
    if (IMAGE_MIME.includes(file.mimetype)) {
      if (!this.contentSecurity && process.env.NODE_ENV === 'production') {
        throw new BizException(BizCode.BUSINESS_ERROR, '内容安全服务未初始化，暂时无法上传图片')
      }
      // 先同步过微信图片安全检测，再写对象存储和数据库，避免不合规头像/UGC 被发布。
      await this.contentSecurity?.assertImageSafe(file.buffer, {
        scope: contentScope,
        scene: bizType === 'avatar' ? 1 : 2,
        filename: file.originalname,
        mimeType: file.mimetype,
      })
    }
    if (!this.client) throw new BizException(BizCode.BUSINESS_ERROR, '对象存储未配置')

    const ext =
      contentScope === 'ledger'
        ? (
            {
              'image/jpeg': 'jpg',
              'image/png': 'png',
              'image/gif': 'gif',
              'image/webp': 'webp',
            } as Record<string, string>
          )[ledgerImageMime(file.buffer)!]
        : (file.originalname.split('.').pop() || 'bin').toLowerCase()
    const d = new Date()
    const key = `${bizType}/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${nano()}.${ext}`
    await this.client.putObject(this.bucket, key, file.buffer, file.size, {
      'Content-Type': file.mimetype,
      'Cache-Control': IMMUTABLE_CACHE_CONTROL,
    })
    const url = `${this.publicUrl}/${key}`
    let thumbnailUrl: string | undefined
    if (IMAGE_MIME.includes(file.mimetype)) {
      const thumbnailKey = thumbnailKeyForObjectKey(key)
      if (thumbnailKey) {
        try {
          const thumbnail = await createSquareThumbnail(file.buffer)
          await this.client.putObject(this.bucket, thumbnailKey, thumbnail, thumbnail.length, {
            'Content-Type': 'image/webp',
            'Cache-Control': IMMUTABLE_CACHE_CONTROL,
          })
          thumbnailUrl = `${this.publicUrl}/${thumbnailKey}`
        } catch (error: any) {
          this.logger.warn(`thumbnail failed for ${key}: ${error?.message || 'unknown error'}`)
        }
      }
    }

    await this.prisma.uploadedFile.create({
      data: {
        key,
        url,
        size: file.size,
        mimeType: file.mimetype,
        bizType,
        ownerId: ownerId || null,
      },
    })
    return { url, key, size: file.size, mimeType: file.mimetype, thumbnailUrl }
  }

  async batchUpload(
    files: MulterFile[],
    bizType: string,
    ownerId?: string,
    contentScope: WechatContentScope = bizType === 'ledger-ad' ? 'ledger' : 'mall',
  ) {
    const out: any[] = []
    for (const f of files) out.push(await this.upload(f, bizType, ownerId, contentScope))
    return out
  }

  private mediaSecret(): string {
    const secret = process.env.LEDGER_MEDIA_SIGN_SECRET || ''
    if (secret.length < 32) throw new BizException(BizCode.BUSINESS_ERROR, '反馈图片签名密钥未配置')
    return secret
  }

  feedbackViewUrl(id: string): string {
    const base = (process.env.LEDGER_MEDIA_BASE_URL || '').replace(/\/$/, '')
    if (!base || (process.env.NODE_ENV === 'production' && !base.startsWith('https://')))
      throw new BizException(BizCode.BUSINESS_ERROR, '反馈图片访问地址未配置')
    const exp = Math.floor(Date.now() / 1000) + FEEDBACK_URL_TTL_SECONDS
    const sig = createHmac('sha256', this.mediaSecret()).update(`${id}:${exp}`).digest('hex')
    return `${base}/${encodeURIComponent(id)}?exp=${exp}&sig=${sig}`
  }

  private validFeedbackSignature(
    id: string,
    exp: string,
    sig: string,
    requireFresh = true,
  ): boolean {
    const expires = Number(exp)
    if (
      !/^\d+$/.test(exp) ||
      (requireFresh && expires < Date.now() / 1000) ||
      expires > Date.now() / 1000 + FEEDBACK_URL_TTL_SECONDS
    )
      return false
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id) || !/^[a-f0-9]{64}$/.test(sig)) return false
    const expected = createHmac('sha256', this.mediaSecret()).update(`${id}:${exp}`).digest()
    return timingSafeEqual(Buffer.from(sig, 'hex'), expected)
  }

  async openPrivateFeedback(id: string, exp: string, sig: string) {
    if (!this.validFeedbackSignature(id, exp, sig))
      throw new BizException(BizCode.FORBIDDEN, '图片访问链接无效或已过期')
    if (!this.client || !this.privateBucket)
      throw new BizException(BizCode.BUSINESS_ERROR, '私有存储未配置')
    const file = await this.prisma.uploadedFile.findFirst({
      where: { id, bizType: 'ledger-feedback-private' },
    })
    if (!file) throw new BizException(BizCode.NOT_FOUND, '图片不存在')
    const stream = await this.client.getObject(this.privateBucket, file.key)
    return { stream, mimeType: file.mimeType, size: file.size }
  }

  async uploadPrivateFeedback(file: MulterFile, ownerId: string) {
    if (!file) throw new BizException(BizCode.INVALID_PARAMS, '未上传文件')
    this.feedbackViewUrl('configuration-check')
    this.validateFile(file)
    const mime = ledgerImageMime(file.buffer)
    if (
      !mime ||
      mime !== (file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype) ||
      file.size !== file.buffer.length
    )
      throw new BizException(BizCode.INVALID_PARAMS, '图片内容与文件类型不匹配')
    if (!this.contentSecurity && process.env.NODE_ENV === 'production')
      throw new BizException(BizCode.BUSINESS_ERROR, '内容安全服务未初始化')
    await this.contentSecurity?.assertImageSafe(file.buffer, {
      scope: 'ledger',
      scene: 2,
      filename: file.originalname,
      mimeType: mime,
    })
    if (!this.client || !this.privateBucket)
      throw new BizException(BizCode.BUSINESS_ERROR, '私有存储未配置')
    const ext = (
      {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
      } as Record<string, string>
    )[mime]
    const d = new Date()
    const key = `feedback/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${nano()}.${ext}`
    await this.client.putObject(this.privateBucket, key, file.buffer, file.size, {
      'Content-Type': mime,
    })
    const row = await this.prisma.uploadedFile.create({
      data: {
        key,
        url: `feedback-private:${key}`,
        size: file.size,
        mimeType: mime,
        bizType: 'ledger-feedback-private',
        ownerId,
      },
    })
    return { url: this.feedbackViewUrl(row.id), key: `feedback-private:${row.id}` }
  }

  async normalizeFeedbackImages(ownerId: string, images: string[]): Promise<string[]> {
    const base = (process.env.LEDGER_MEDIA_BASE_URL || '').replace(/\/$/, '')
    const legacyPrefix = this.publicUrl.replace(/\/$/, '') + '/feedback/'
    const result: string[] = []
    for (const image of images.slice(0, 9)) {
      let id = ''
      if (image.startsWith('feedback-private:')) id = image.slice('feedback-private:'.length)
      else if (base && image.startsWith(base + '/')) {
        let u: URL
        try {
          u = new URL(image)
          id = decodeURIComponent(u.pathname.slice(new URL(base).pathname.length + 1))
        } catch {
          throw new BizException(BizCode.INVALID_PARAMS, '反馈图片链接无效')
        }
        if (
          !this.validFeedbackSignature(
            id,
            u.searchParams.get('exp') || '',
            u.searchParams.get('sig') || '',
            false,
          )
        )
          throw new BizException(BizCode.INVALID_PARAMS, '反馈图片链接无效')
      } else if (image.startsWith(legacyPrefix)) {
        let key: string
        try {
          key = decodeURIComponent(image.slice(this.publicUrl.replace(/\/$/, '').length + 1))
        } catch {
          throw new BizException(BizCode.INVALID_PARAMS, '反馈图片路径无效')
        }
        if (!/^feedback\/[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|gif|webp)$/.test(key))
          throw new BizException(BizCode.INVALID_PARAMS, '反馈图片路径无效')
        const row = await this.prisma.uploadedFile.findFirst({
          where: { key, ownerId, bizType: 'feedback' },
        })
        if (!row) throw new BizException(BizCode.FORBIDDEN, '无权使用该反馈图片')
        result.push(image)
        continue
      } else throw new BizException(BizCode.INVALID_PARAMS, '反馈图片来源无效')
      const row = await this.prisma.uploadedFile.findFirst({
        where: { id, ownerId, bizType: 'ledger-feedback-private' },
      })
      if (!row) throw new BizException(BizCode.FORBIDDEN, '无权使用该反馈图片')
      result.push(`feedback-private:${id}`)
    }
    return result
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
    const okMime =
      file.mimetype === 'application/vnd.android.package-archive' ||
      file.mimetype === 'application/octet-stream'
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
      data: {
        key,
        url,
        size: file.size,
        mimeType: 'application/vnd.android.package-archive',
        bizType: 'apk',
        ownerId: ownerId || null,
      },
    })
    return { url, key, size: file.size }
  }

  /**
   * 删除上传文件。
   *
   * 越权防护：
   *   - 普通账号只能删自己上传的文件（按 ownerId 匹配）
   *   - admin / platform / super-admin 可以删任意文件
   * 若文件不存在或当前用户既不是 owner 也不是管理员，抛 FORBIDDEN，绝不静默成功，
   * 否则攻击者可以遍历文件 key 删别人的图片/视频。
   */
  async remove(key: string, actor: { userId: string; role: string } | null) {
    if (!this.client) throw new BizException(BizCode.BUSINESS_ERROR, '对象存储未配置')
    const file = await this.prisma.uploadedFile.findUnique({ where: { key } })
    if (!file) {
      // 文件已经不存在：返回成功，前端清理掉本地引用即可（兼容历史用法）
      return { ok: true }
    }
    // 通用文件端点只管理公开桶；私有反馈图由 ledger 生命周期管理，禁止误删 DB 引用。
    if (file.bizType === 'ledger-feedback-private') {
      throw new BizException(BizCode.FORBIDDEN, '私有反馈图片不可通过通用文件接口删除')
    }
    const isAdmin = !!actor && ['admin', 'platform', 'super-admin'].includes(actor.role)
    const isOwner = !!actor?.userId && file.ownerId === actor.userId
    if (!isAdmin && !isOwner) {
      throw new BizException(BizCode.FORBIDDEN, '无权删除该文件')
    }
    await this.client.removeObject(this.bucket, key).catch(() => null)
    const thumbnailKey = thumbnailKeyForObjectKey(key)
    if (thumbnailKey) await this.client.removeObject(this.bucket, thumbnailKey).catch(() => null)
    await this.prisma.uploadedFile.delete({ where: { key } })
    return { ok: true }
  }
}
