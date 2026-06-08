import { http } from '../utils/request'

/** 鉴权（登录类 auth:false 不带 token） */
export const authApi = {
  login: (phone: string, password: string) =>
    http.post('/l/auth/login', { phone, password }, { auth: false }),
  smsCode: (phone: string) => http.post('/l/auth/sms-code', { phone }, { auth: false }),
  smsLogin: (phone: string, code: string) =>
    http.post('/l/auth/sms-login', { phone, code }, { auth: false }),
  changePassword: (oldPassword: string | undefined, newPassword: string) =>
    http.post('/l/auth/change-password', { oldPassword, newPassword }),
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
