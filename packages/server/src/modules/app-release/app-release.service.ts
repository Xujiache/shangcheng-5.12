/**
 * APP 发布管理 #7 软件自更新
 *
 * - platform-admin: 上传 APK + 创建 / 列出 / 删除发布记录
 * - 公开（端上）: 获取最新版（用于启动时检查更新）
 */
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { FilesService } from '../files/files.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'

export type AppPlatform = 'merchant' | 'platform'

export interface CreateReleaseDto {
  platform: AppPlatform
  version: string
  versionCode: number
  changelog?: string
  force?: boolean
}

@Injectable()
export class AppReleaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
  ) {}

  private assertPlatform(p?: string): AppPlatform {
    if (p === 'merchant' || p === 'platform') return p
    throw new BizException(BizCode.INVALID_PARAMS, 'platform 仅支持 merchant / platform')
  }

  /** 创建发布：先上传 APK，再写库 */
  async create(file: any, dto: CreateReleaseDto, createdById?: string) {
    const platform = this.assertPlatform(dto.platform)
    if (!dto.version) throw new BizException(BizCode.INVALID_PARAMS, '请填写 version')
    const versionCode = Number(dto.versionCode)
    if (!versionCode || !Number.isInteger(versionCode) || versionCode <= 0) {
      throw new BizException(BizCode.INVALID_PARAMS, 'versionCode 必须是正整数')
    }

    const exists = await this.prisma.appRelease.findUnique({
      where: { platform_versionCode: { platform, versionCode } },
    })
    if (exists) {
      throw new BizException(
        BizCode.BUSINESS_ERROR,
        `该平台已存在 versionCode=${versionCode} 的发布`,
      )
    }

    const uploaded = await this.files.uploadApk(file, createdById)

    const row = await this.prisma.appRelease.create({
      data: {
        platform,
        version: dto.version,
        versionCode,
        url: uploaded.url,
        size: uploaded.size,
        changelog: dto.changelog || '',
        force: !!(dto.force === true || String(dto.force) === 'true'),
        createdById: createdById || null,
      },
    })
    return row
  }

  async list(platform?: string) {
    const where = platform ? { platform: this.assertPlatform(platform) } : {}
    return this.prisma.appRelease.findMany({
      where,
      orderBy: [{ platform: 'asc' }, { versionCode: 'desc' }],
    })
  }

  async remove(id: string, actor: { userId: string; role: string } | null) {
    const row = await this.prisma.appRelease.findUnique({ where: { id } })
    if (!row) throw new BizException(BizCode.NOT_FOUND, '发布不存在')
    // 删除 MinIO 对象 + 数据库记录。
    //
    // 注意：早期实现用 row.url.split('/').slice(-3).join('/') 推导 key，
    // 拿到的是 "yyyy/mm/xxx.apk" 而缺少 bizType 前缀（实际 key 是 "apk/yyyy/mm/xxx.apk"），
    // 导致 files.remove 找不到 UploadedFile，S3 对象残留。
    // 正确做法：用 url 反查 UploadedFile 表拿真实 key（在 files.uploadApk 时已写入）。
    const uploaded = await this.prisma.uploadedFile.findFirst({ where: { url: row.url } })
    const key = uploaded?.key
    if (key) {
      try {
        // controller 层已经强制 admin/platform/super-admin，调用 files.remove
        // 需要传 actor 以通过 owner 校验；这里直接透传上层来的 actor，符合最小权限原则
        await this.files.remove(key, actor)
      } catch {
        // MinIO/UploadedFile 删除失败不阻塞 — 至少要把 AppRelease 表清掉，避免无效记录残留
      }
    }
    await this.prisma.appRelease.delete({ where: { id } })
    return { ok: true }
  }

  /**
   * 公开：APP 启动时调用，返回该平台最新发布（无发布时返回 null）
   *
   * 零假数据 P0：之前没有记录时返回 `version: '0.0.0'` 占位 JSON，
   * 会让客户端误以为线上有"0.0.0 版本"导致一直触发"有新版本可更新"逻辑。
   *
   * 行为变更（Wave5）：从抛 NOT_FOUND（404 噪音）改为返回 `null`。
   * 原因：商家 APP onLaunch 会调一次本接口做静默更新检查，那时数据库可能根本就没人发布过包 ——
   * 这是"空态"而不是"错误"，404 会污染浏览器控制台并让前端 silent 拦截器也无法完全隐藏。
   * 改为 200 + null：前端拿到 null 走"暂无新版本"分支即可，符合 REST 语义。
   */
  async latest(platform?: string) {
    const p = this.assertPlatform(platform)
    const row = await this.prisma.appRelease.findFirst({
      where: { platform: p },
      orderBy: { versionCode: 'desc' },
    })
    if (!row) return null
    return {
      version: row.version,
      versionCode: row.versionCode,
      url: row.url,
      size: row.size,
      changelog: row.changelog,
      force: row.force,
      publishedAt: row.publishedAt.toISOString(),
    }
  }
}
