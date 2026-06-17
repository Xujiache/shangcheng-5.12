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
/* 通透度 → 玻璃外观：t 越大越通透（填充更淡 + 模糊更弱、更清晰），t 越小越磨砂厚实
   （填充更浓 + 模糊更强）。同时调「透明度 + 模糊」才看得出明显区别——白玻璃在浅色底上
   只动透明度几乎无感，模糊强度变化最直观（尤其卡片浮在彩色光晕上）。默认 t=50 ≈ 现状。 */
function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f
}
/** 由通透度得出模糊滤镜与渐变上/下沿不透明度。f=0 最厚(30px) → f=1 最通透(4px)。 */
function glassParts(t: number) {
  const f = Math.min(100, Math.max(0, t)) / 100
  return { f, blur: Math.round(lerp(30, 4, f)), sat: Math.round(lerp(185, 120, f)) }
}
function gradient(deg: number, topSolid: number, ratio: number, f: number): string {
  const top = +lerp(topSolid, 0.1, f).toFixed(3) // f=0 最实(topSolid) → f=1 最透(0.1)
  const bot = +(top * ratio).toFixed(3)
  return `linear-gradient(${deg}deg, rgba(255,255,255,${top}) 0%, rgba(255,255,255,${bot}) 100%)`
}
/** 卡片（.lz-card）玻璃：设在页面内容根节点上，级联覆盖该页所有卡片的 --glass-card-bg / --glass-blur。 */
export function glassCardStyle(t: number = getGlassOpacity()): string {
  const { f, blur, sat } = glassParts(t)
  return `--glass-card-bg:${gradient(160, 0.92, 0.62, f)};--glass-blur:blur(${blur}px) saturate(${sat}%);`
}
/** 导航/标题栏玻璃：覆盖 --glass-nav-bg 与 --glass-blur-strong（标题栏模糊略强）。 */
export function glassNavStyle(t: number = getGlassOpacity()): string {
  const { f, blur, sat } = glassParts(t)
  return `--glass-nav-bg:${gradient(180, 0.9, 0.52, f)};--glass-blur-strong:blur(${blur + 4}px) saturate(${sat + 10}%);`
}
/** 底部 tabBar 玻璃（独立渲染上下文读不到 page 变量，直接给出 background + backdrop-filter 内联值）。 */
export function glassTabStyle(t: number = getGlassOpacity()): string {
  const { f, blur, sat } = glassParts(t)
  const filter = `blur(${blur}px) saturate(${sat}%)`
  return `background:${gradient(180, 0.92, 0.6, f)};-webkit-backdrop-filter:${filter};backdrop-filter:${filter};`
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
