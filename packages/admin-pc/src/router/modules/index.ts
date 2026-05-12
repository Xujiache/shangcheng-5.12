import { AppRouteRecord } from '@/types/router'
import { merchantRoutes } from './merchant'
import { platformRoutes } from './platform'

/**
 * 导出所有模块化路由
 *
 * 仅保留商家与平台两个工作台。
 * 由 MenuProcessor 按用户 role / 超管 currentWorkspace 过滤显示。
 */
export const routeModules: AppRouteRecord[] = [merchantRoutes, platformRoutes]
