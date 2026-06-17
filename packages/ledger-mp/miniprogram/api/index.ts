import { http } from '../utils/request'
import { invalidateCache } from '../utils/request'

/** 鉴权（登录类 auth:false 不带 token） */
export const authApi = {
  // 公开配置（是否开放自助注册等）；silent 让页面自行兜底默认值
  config: () =>
    http.get<{ allowSelfRegister: boolean; logoUrl?: string }>('/l/auth/config', undefined, {
      auth: false,
      silent: true,
    }),
  login: (phone: string, password: string) =>
    http.post('/l/auth/login', { phone, password }, { auth: false }),
  register: (data: { phone: string; password: string; nickname?: string; inviteCode?: string }) =>
    http.post('/l/auth/register', data, { auth: false }),
  smsCode: (phone: string) => http.post('/l/auth/sms-code', { phone }, { auth: false }),
  smsLogin: (phone: string, code: string) =>
    http.post('/l/auth/sms-login', { phone, code }, { auth: false }),
  changePassword: (oldPassword: string | undefined, newPassword: string) =>
    http.post('/l/auth/change-password', { oldPassword, newPassword }),
  // 微信一键登录（openid 须已绑定）；silent 让登录页自行处理"未绑定"提示
  wechatLogin: (code: string) =>
    http.post('/l/auth/wechat-login', { code }, { auth: false, silent: true }),
  // 绑定/解绑微信（需登录 + 密码确认）
  bindWechat: (code: string, password: string) =>
    http.post('/l/auth/wechat/bind', { code, password }),
  unbindWechat: (password: string) => http.post('/l/auth/wechat/unbind', { password }),
}

/** 账户 / 会员（仅需登录） */
export const meApi = {
  me: () => http.get('/l/me', undefined, { cache: true }),
  membership: () => http.get('/l/membership', undefined, { cache: true }),
  // 强制拉最新会员状态（绕过缓存）：在线支付成功后轮询用
  refreshMembership: () => {
    invalidateCache(['/l/me', '/l/membership'])
    return http.get('/l/membership')
  },
  // 会员在线支付下单 → 返回小程序 wx.requestPayment 所需参数
  createMembershipPay: (planKey: string, code?: string) =>
    http.post('/l/membership/pay', { planKey, code }),
  // 领取体验卡（一次性，免费套餐专用，不走支付）
  claimTrial: () => {
    invalidateCache(['/l/me', '/l/membership'])
    return http.post('/l/membership/claim-trial', {})
  },
  updateProfile: (data: { nickname?: string; avatar?: string }) =>
    http.patch('/l/profile', data).then((r) => {
      invalidateCache(['/l/me', '/l/membership'])
      return r
    }),
}

/** 订单（需会员） */
// 订单改动会牵动列表/统计/客户聚合，统一失效
const invalidateOrders = () => invalidateCache(['/l/orders', '/l/stats', '/l/customers'])
export const orderApi = {
  list: (params: Record<string, any> = {}) => http.get('/l/orders', params, { cache: true }),
  create: (data: any) =>
    http.post('/l/orders', data).then((r) => {
      invalidateOrders()
      return r
    }),
  get: (id: string) => http.get('/l/orders/' + id, undefined, { cache: true }),
  update: (id: string, data: any) =>
    http.patch('/l/orders/' + id, data).then((r) => {
      invalidateOrders()
      return r
    }),
  remove: (id: string) =>
    http.del('/l/orders/' + id).then((r) => {
      invalidateOrders()
      return r
    }),
}

/** 客户（需会员） */
const invalidateCustomers = () => invalidateCache(['/l/customers', '/l/orders'])
export const customerApi = {
  list: () => http.get('/l/customers', undefined, { cache: true }),
  get: (id: string) => http.get('/l/customers/' + id, undefined, { cache: true }),
  create: (data: any) =>
    http.post('/l/customers', data).then((r) => {
      invalidateCustomers()
      return r
    }),
  // 无档客户（订单自动生成）按姓名幂等建档 + 关联同名历史订单，返回正式档案
  ensureByName: (name: string) =>
    http.post('/l/customers/ensure', { name }).then((r) => {
      invalidateCustomers()
      return r
    }),
  update: (id: string, data: any) =>
    http.patch('/l/customers/' + id, data).then((r) => {
      invalidateCustomers()
      return r
    }),
  remove: (id: string) =>
    http.del('/l/customers/' + id).then((r) => {
      invalidateCustomers()
      return r
    }),
}

/** 统计（需会员） */
export const statsApi = {
  overview: (period: string) => http.get('/l/stats/overview', { period }, { cache: true }),
  monthly: (year?: number) => http.get('/l/stats/monthly', year ? { year } : {}, { cache: true }),
  series: (granularity: string) => http.get('/l/stats/series', { granularity }, { cache: true }),
}

/** 经营目标（需会员） */
export const goalApi = {
  get: () => http.get('/l/goal', undefined, { cache: true }),
  set: (data: { monthly?: number; yearly?: number }) =>
    http.put('/l/goal', data).then((r) => {
      invalidateCache(['/l/goal', '/l/stats'])
      return r
    }),
}

/** 消息中心（仅需登录） */
export const notificationApi = {
  list: () => http.get('/l/notifications', undefined, { cache: true }),
  unreadCount: () => http.get<{ count: number }>('/l/notifications/unread-count'),
  read: (id: string) =>
    http.post('/l/notifications/' + id + '/read').then((r) => {
      invalidateCache('/l/notifications')
      return r
    }),
  readAll: () =>
    http.post('/l/notifications/read-all').then((r) => {
      invalidateCache('/l/notifications')
      return r
    }),
}

/** 偏好设置（仅需登录） */
export const settingApi = {
  get: () => http.get('/l/settings', undefined, { cache: true }),
  update: (data: Record<string, any>) =>
    http.put('/l/settings', data).then((r) => {
      invalidateCache('/l/settings')
      return r
    }),
}

/** 意见反馈（仅需登录） */
export const feedbackApi = {
  submit: (data: { content: string; contact?: string; type?: string; images?: string[] }) =>
    http.post('/l/feedback', data),
}

/** 更新日志（仅需登录） */
export const changelogApi = {
  list: () =>
    http.get<Array<{ version: string; title: string; content: string; date: string }>>(
      '/l/changelogs',
    ),
  byVersion: (version: string) =>
    http.get<{ version: string; title: string; content: string } | null>('/l/changelog', {
      version,
    }),
}

/** 数据加密导出 / 导入（仅需登录） */
export const dataApi = {
  exportData: (allowShare: boolean) =>
    http.post<{ package: string; orders: number; customers: number; allowShare: boolean }>(
      '/l/data/export',
      { allowShare },
    ),
  importData: (pkg: string) =>
    http.post<{ ok: boolean; orders: number; customers: number }>('/l/data/import', { pkg }),
}

/** 首页广告（仅需登录） */
export const adApi = {
  list: () => http.get<Array<{ id: string; image: string; link: string; title: string }>>('/l/ads'),
}

/** 优化下料试用/会员闸门（仅需登录） */
export const cutApi = {
  access: () => http.get('/l/cut/access'),
}

/** 下料方案云端历史（需会员，userId 维度，服务端从不信任客户端传 userId） */
export const cutPlanApi = {
  list: () => http.get('/l/cut/plans', undefined, { cache: true }),
  create: (data: { title: string; material: string; input: any; summary: any }) =>
    http.post('/l/cut/plans', data).then((r) => {
      invalidateCache('/l/cut/plans')
      return r
    }),
  update: (id: string, data: { title?: string; material?: string; input?: any; summary?: any }) =>
    http.put('/l/cut/plans/' + id, data).then((r) => {
      invalidateCache('/l/cut/plans')
      return r
    }),
  remove: (id: string) =>
    http.del('/l/cut/plans/' + id).then((r) => {
      invalidateCache('/l/cut/plans')
      return r
    }),
}

/** 邀请（仅需登录） */
export const inviteApi = {
  get: () =>
    http.get<{
      inviteCode: string
      invitedCount: number
      rewardDays: number
      allowSelfRegister: boolean
    }>('/l/invite', undefined, { cache: true }),
}
