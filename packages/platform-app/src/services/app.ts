/**
 * APP 安装包 / 自更新服务（平台端）
 *
 * platform-app 通过 GET /api/v1/m/app/latest?platform=platform 拉自己的最新包。
 * 该接口在后端是公开的（@Public 装饰器），不需要 token。
 */
import { http } from '../utils/request'

export type AppPlatform = 'merchant' | 'platform'

export interface AppRelease {
  version: string
  versionCode: number
  url: string
  size: number
  changelog: string
  force: boolean
  publishedAt: string
}

const PLACEHOLDER: AppRelease = {
  version: '0.0.0',
  versionCode: 0,
  url: '',
  size: 0,
  changelog: '',
  force: false,
  publishedAt: new Date().toISOString(),
}

export const appService = {
  async getLatest(platform: AppPlatform): Promise<AppRelease> {
    try {
      return await http.get<AppRelease>('/api/v1/m/app/latest', { platform }, { silent: true })
    } catch {
      return { ...PLACEHOLDER }
    }
  },
}
