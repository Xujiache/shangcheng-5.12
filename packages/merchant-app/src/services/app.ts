/**
 * APP 安装包 / 自更新服务
 *
 * 已接 AppReleaseController.merchantLatest (GET /api/v1/m/app/latest)，
 * 见 packages/server/src/modules/app-release/app-release.controller.ts。
 *
 * PLACEHOLDER 仅作为接口故障 / 离线时的兜底（保证页面不崩），
 * 正常情况下 getLatest() 会拿到后端真实发布数据。
 */
import { http } from '../utils/request'

export type AppPlatform = 'merchant' | 'platform'

export interface AppRelease {
  version: string           // 例：1.0.2
  versionCode: number       // 例：102
  url: string               // APK 下载直链
  size: number              // 文件大小（字节）
  changelog: string         // 更新说明
  force: boolean            // 是否强制更新
  publishedAt: string       // ISO 时间
}

const PLACEHOLDER: Record<AppPlatform, AppRelease> = {
  merchant: {
    version: '0.1.0',
    versionCode: 100,
    url: 'https://ewsn.top/downloads/merchant-app-latest.apk',
    size: 0,
    changelog: '初始版本',
    force: false,
    publishedAt: new Date().toISOString(),
  },
  platform: {
    version: '0.1.0',
    versionCode: 100,
    url: 'https://ewsn.top/downloads/platform-app-latest.apk',
    size: 0,
    changelog: '初始版本',
    force: false,
    publishedAt: new Date().toISOString(),
  },
}

export const appService = {
  async getLatest(platform: AppPlatform): Promise<AppRelease> {
    try {
      return await http.get<AppRelease>(`/api/v1/m/app/latest`, { platform }, { silent: true })
    } catch {
      return PLACEHOLDER[platform]
    }
  },
}
