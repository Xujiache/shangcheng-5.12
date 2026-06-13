import { http } from '../utils/request'

/** 鉴权（登录类 auth:false 不带 token） */
export const authApi = {
  // 公开配置（是否开放自助注册等）；silent 让页面自行兜底默认值
  config: () =>
    http.get<{ allowSelfRegister: boolean }>('/l/auth/config', undefined, {
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
  me: () => http.get('/l/me'),
  membership: () => http.get('/l/membership'),
  updateProfile: (data: { nickname?: string; avatar?: string }) => http.patch('/l/profile', data),
}

/** 订单（需会员） */
export const orderApi = {
  list: (params: Record<string, any> = {}) => http.get('/l/orders', params),
  create: (data: any) => http.post('/l/orders', data),
  get: (id: string) => http.get('/l/orders/' + id),
  update: (id: string, data: any) => http.patch('/l/orders/' + id, data),
  remove: (id: string) => http.del('/l/orders/' + id),
}

/** 客户（需会员） */
export const customerApi = {
  list: () => http.get('/l/customers'),
  get: (id: string) => http.get('/l/customers/' + id),
  create: (data: any) => http.post('/l/customers', data),
  update: (id: string, data: any) => http.patch('/l/customers/' + id, data),
  remove: (id: string) => http.del('/l/customers/' + id),
}

/** 统计（需会员） */
export const statsApi = {
  overview: (period: string) => http.get('/l/stats/overview', { period }),
  monthly: (year?: number) => http.get('/l/stats/monthly', year ? { year } : {}),
  series: (granularity: string) => http.get('/l/stats/series', { granularity }),
}

/** 经营目标（需会员） */
export const goalApi = {
  get: () => http.get('/l/goal'),
  set: (data: { monthly?: number; yearly?: number }) => http.put('/l/goal', data),
}

/** 消息中心（仅需登录） */
export const notificationApi = {
  list: () => http.get('/l/notifications'),
  unreadCount: () => http.get<{ count: number }>('/l/notifications/unread-count'),
  read: (id: string) => http.post('/l/notifications/' + id + '/read'),
  readAll: () => http.post('/l/notifications/read-all'),
}

/** 偏好设置（仅需登录） */
export const settingApi = {
  get: () => http.get('/l/settings'),
  update: (data: Record<string, any>) => http.put('/l/settings', data),
}

/** 意见反馈（仅需登录） */
export const feedbackApi = {
  submit: (data: { content: string; contact?: string; type?: string }) =>
    http.post('/l/feedback', data),
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
  list: () => http.get('/l/cut/plans'),
  create: (data: { title: string; material: string; input: any; summary: any }) =>
    http.post('/l/cut/plans', data),
  update: (id: string, data: { title?: string; material?: string; input?: any; summary?: any }) =>
    http.put('/l/cut/plans/' + id, data),
  remove: (id: string) => http.del('/l/cut/plans/' + id),
}

/** 邀请（仅需登录） */
export const inviteApi = {
  get: () =>
    http.get<{
      inviteCode: string
      invitedCount: number
      rewardDays: number
      allowSelfRegister: boolean
    }>('/l/invite'),
}
