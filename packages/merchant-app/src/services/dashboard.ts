/**
 * 仪表盘 / 数据统计 服务
 */
import { http } from '../utils/request'
import type { MerchantDashboard, MerchantStats } from '@jiujiu/shared/types'

export const dashboardService = {
  /** 商家首页 */
  getDashboard() {
    return http.get<MerchantDashboard>('/api/v1/m/dashboard')
  },
  /**
   * 数据统计
   *
   * @param period 周期：today / week / month / year（后端必传）
   * @param date   可选指定日期（YYYY-MM-DD）：日期 picker 点选时携带；
   *               后端 controller 用 q:any 接收，未来若支持按天过滤可直接生效
   */
  getStats(period: 'today' | 'week' | 'month' | 'year', date?: string) {
    return http.get<MerchantStats>('/api/v1/m/stats', date ? { period, date } : { period })
  },
}
