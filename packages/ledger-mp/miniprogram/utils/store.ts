import { TOKEN_KEY } from '../config'

export function app(): IAppOption | undefined {
  return getApp<IAppOption>()
}

export function getToken(): string {
  return app()?.globalData?.token || wx.getStorageSync(TOKEN_KEY) || ''
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

export function setAuth(token: string, user?: LedgerUserInfo) {
  const a = app()
  if (!a) return
  a.setToken?.(token)
  if (user) {
    a.globalData.user = user
    a.globalData.membership = user.membership
  }
  // setAuth 仅在用户刚提交过凭证（密码/短信/微信授权）时调用，等同已完成身份验证：
  // 视作本次冷启动已解锁，避免登录后一切后台又被生物锁拦一次
  bioVerified = true
}

export function setUser(user: LedgerUserInfo) {
  const a = app()
  if (!a) return
  a.globalData.user = user
  if (user.membership) a.globalData.membership = user.membership
}

export function getUser(): LedgerUserInfo | null {
  return app()?.globalData?.user || null
}

export function getMembership(): MembershipStatus | null {
  return app()?.globalData?.membership || null
}

export function logout() {
  app()?.clearAuth?.()
  wx.reLaunch({ url: '/pages/login/index' })
}

/* ---- 隐私设置本地镜像（设置页保存成功后写入，供各页同步读取） ---- */

const HIDE_AMOUNT_KEY = 'ledger_hide_amount'
const BIO_LOCK_KEY = 'ledger_bio_lock'

export function getHideAmount(): boolean {
  return !!wx.getStorageSync(HIDE_AMOUNT_KEY)
}

export function setHideAmount(v: boolean) {
  wx.setStorageSync(HIDE_AMOUNT_KEY, v)
}

export function getBioLock(): boolean {
  return !!wx.getStorageSync(BIO_LOCK_KEY)
}

export function setBioLock(v: boolean) {
  wx.setStorageSync(BIO_LOCK_KEY, v)
}

// 本次冷启动是否已通过生物验证（仅内存，每次冷启动重置 → 重新要求解锁）
let bioVerified = false

export function getBioVerified(): boolean {
  return bioVerified
}

export function setBioVerified(v: boolean) {
  bioVerified = v
}
