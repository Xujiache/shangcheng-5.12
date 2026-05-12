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
  /** 数据统计 */
  getStats(period: 'today' | 'week' | 'month' | 'year') {
    return http.get<MerchantStats>('/api/v1/m/stats', { period })
  },
}
