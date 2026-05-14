/**
 * APP 安装包 / 自更新服务
 *
 * 已接 AppReleaseController.merchantLatest (GET /api/v1/m/app/latest),
 * 见 packages/server/src/modules/app-release/app-release.controller.ts。
 *
 * P2-16: 删除 PLACEHOLDER 兜底
 *   - 旧实现:接口失败时返回"0.1.0 / 初始版本"占位包,会让用户误以为有可下载新包,
 *     甚至点击下载会把假 url 当作真包打开。
 *   - 新实现:失败时返回 null,调用方自行展示"暂无新版本 / 获取失败"等真实状态。
 */
import { http } from '../utils/request'

export type AppPlatform = 'merchant' | 'platform'

export interface AppRelease {
  version: string           // 例:1.0.2
  versionCode: number       // 例:102
  url: string               // APK 下载直链
  size: number              // 文件大小(字节)
  changelog: string         // 更新说明
  force: boolean            // 是否强制更新
  publishedAt: string       // ISO 时间
}

export const appService = {
  async getLatest(platform: AppPlatform): Promise<AppRelease | null> {
    try {
      return await http.get<AppRelease>(`/api/v1/m/app/latest`, { platform }, { silent: true })
    } catch {
      return null
    }
  },
}
