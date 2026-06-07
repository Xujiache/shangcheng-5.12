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
