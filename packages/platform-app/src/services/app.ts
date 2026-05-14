/**
 * APP 安装包 / 自更新服务(平台端)
 *
 * platform-app 通过 GET /api/v1/m/app/latest?platform=platform 拉自己的最新包。
 * 该接口在后端是公开的(@Public 装饰器),不需要 token。
 *
 * 类型定义统一来源:`services/index.ts` 的 AppRelease(完整字段含 id / platform /
 * createdById),这里 re-export 以便其它位置仅 import 'services/app' 也能拿到类型,
 * 避免双重定义不一致导致的赋值兼容性 lint。
 */
import { http } from '../utils/request'
import type { AppRelease as FullAppRelease, AppReleasePlatform } from './index'

export type AppPlatform = AppReleasePlatform
export type AppRelease = FullAppRelease

export const appService = {
  /**
   * 拉最新发布包 —— 失败抛错,调用方应展示"获取失败"提示并允许重试。
   * 不再返回 PLACEHOLDER 占位对象,避免在 UI 上误显示 v0.0.0 误导用户。
   */
  async getLatest(platform: AppPlatform): Promise<AppRelease> {
    return http.get<AppRelease>('/api/v1/m/app/latest', { platform }, { silent: true })
  },
}
