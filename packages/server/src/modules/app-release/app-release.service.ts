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
      throw new BizException(BizCode.BUSINESS_ERROR, `该平台已存在 versionCode=${versionCode} 的发布`)
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

  async remove(id: string) {
    const row = await this.prisma.appRelease.findUnique({ where: { id } })
    if (!row) throw new BizException(BizCode.NOT_FOUND, '发布不存在')
    // 删除 MinIO 对象 + 数据库记录
    try {
      const key = row.url.split('/').slice(-3).join('/') // apk/yyyy/mm/xxx.apk
      await this.files.remove(key)
    } catch {
      // MinIO 失败不阻塞 — 至少要把库里记录清掉
    }
    await this.prisma.appRelease.delete({ where: { id } })
    return { ok: true }
  }

  /** 公开：APP 启动时调用，返回该平台最新发布 */
  async latest(platform?: string) {
    const p = this.assertPlatform(platform)
    const row = await this.prisma.appRelease.findFirst({
      where: { platform: p },
      orderBy: { versionCode: 'desc' },
    })
    if (!row) {
      // 没有发布时返回一个"占位"，让端上 UI 不至于崩
      return {
        version: '0.0.0',
        versionCode: 0,
        url: '',
        size: 0,
        changelog: '',
        force: false,
        publishedAt: new Date().toISOString(),
      }
    }
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
