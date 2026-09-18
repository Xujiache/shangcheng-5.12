/**
 * APP 安装包 / 自更新服务
 *
 * 已接 AppReleaseController.merchantLatest (GET /api/v1/m/app/latest),
 * 见 packages/server/src/modules/app-release/app-release.controller.ts。
 *
 * 不提供占位安装包；网络失败交给更新器区分“检查失败”和“已是最新版本”。
 */
import { http } from '../utils/request'

export type AppPlatform = 'merchant' | 'platform'

export interface AppRelease {
  version: string // 例:1.0.2
  versionCode: number // 例:102
  url: string // APK 下载直链
  size: number // 文件大小(字节)
  changelog: string // 更新说明
  force: boolean // 是否强制更新
  publishedAt: string // ISO 时间
}

export const appService = {
  async getLatest(platform: AppPlatform): Promise<AppRelease | null> {
    return await http.get<AppRelease>(
      `/api/v1/m/app/latest`,
      { platform, _: Date.now() },
      { silent: true, auth: 'none', timeout: 5000 },
    )
  },
}
