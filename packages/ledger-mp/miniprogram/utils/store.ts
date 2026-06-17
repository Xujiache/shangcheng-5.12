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

/* ---- 玻璃质感（iOS 毛玻璃导航/标题栏）本地开关，默认开启 ---- */
const GLASS_KEY = 'ledger_glass'
export function getGlass(): boolean {
  const v = wx.getStorageSync(GLASS_KEY)
  // 未设置过（空串/undefined）视为默认开启
  return v === '' || v === undefined || v === null ? true : !!v
}
export function setGlass(v: boolean) {
  wx.setStorageSync(GLASS_KEY, v)
}

/* ---- 玻璃通透度（0-100，越大越通透/越透出背景光，越小越磨砂厚实），默认 50 ≈ 现状 ---- */
const GLASS_OPACITY_KEY = 'ledger_glass_opacity'
export function getGlassOpacity(): number {
  const v = wx.getStorageSync(GLASS_OPACITY_KEY)
  if (v === '' || v === undefined || v === null) return 50
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 50
}
export function setGlassOpacity(t: number) {
  wx.setStorageSync(GLASS_OPACITY_KEY, Math.min(100, Math.max(0, Math.round(t))))
}
/** 由通透度生成「顶亮底暗」半透明镜面渐变：t 越大填充越淡(越通透)。topMax=t最小(最实)时上沿不透明度，ratio=下沿/上沿。 */
function glassGradient(t: number, topMax: number, ratio: number): string {
  const f = 1 - Math.min(100, Math.max(0, t)) / 100 // 填充强度：t=0 最实, t=100 最透
  const top = +(0.14 + f * (topMax - 0.14)).toFixed(3)
  const bot = +(top * ratio).toFixed(3)
  return `linear-gradient(180deg, rgba(255,255,255,${top}) 0%, rgba(255,255,255,${bot}) 100%)`
}
/** 导航/标题栏玻璃背景（默认 t=50 ≈ 现状 0.5/0.26）。 */
export function glassNavBg(t: number = getGlassOpacity()): string {
  return glassGradient(t, 0.88, 0.52)
}
/** 底部 tabBar 玻璃背景（默认 t=50 ≈ 现状 0.55/0.32）。 */
export function glassTabBg(t: number = getGlassOpacity()): string {
  return glassGradient(t, 0.96, 0.58)
}

/* ---- 小程序 LOGO（管理后台 system_settings.site.logo 下发，登录/关于页展示，本地缓存兜底） ---- */
const LOGO_KEY = 'ledger_logo'
export function getLogo(): string {
  return wx.getStorageSync(LOGO_KEY) || ''
}
export function setLogo(v: string) {
  wx.setStorageSync(LOGO_KEY, v || '')
}

/* ---- 特效模式：normal=常规特效(默认) / max=性能模式全开(含触摸流光，每帧 setData，老机更耗电) ---- */
const FX_KEY = 'ledger_fxmode'
export function getFxMode(): 'normal' | 'max' {
  return wx.getStorageSync(FX_KEY) === 'max' ? 'max' : 'normal'
}
export function setFxMode(m: 'normal' | 'max') {
  wx.setStorageSync(FX_KEY, m === 'max' ? 'max' : 'normal')
}

// 本次冷启动是否已通过生物验证（仅内存，每次冷启动重置 → 重新要求解锁）
let bioVerified = false

export function getBioVerified(): boolean {
  return bioVerified
}

export function setBioVerified(v: boolean) {
  bioVerified = v
}
