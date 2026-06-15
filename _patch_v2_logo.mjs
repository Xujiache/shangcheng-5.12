import fs from 'fs'
let changed = []
function patch(p, fn) {
  const b = fs.readFileSync(p, 'utf8')
  const a = fn(b)
  if (a == null) throw new Error(`null ${p}`)
  if (a !== b) {
    fs.writeFileSync(p, a, 'utf8')
    changed.push(p)
  }
}
function must(s, anc, f) {
  if (!s.includes(anc)) throw new Error(`ANCHOR NOT FOUND ${f}:\n${anc}`)
}

const SRV = 'packages/server/src/modules/ledger'
const MP = 'packages/ledger-mp/miniprogram'

// ── 1) 后端：getPublicConfig 附带 logoUrl（取 system_settings.site.logo）──
patch(`${SRV}/ledger-auth.service.ts`, (s) => {
  if (s.includes('logoUrl')) return s
  const a = `  async getPublicConfig() {
    const cfg = await this.readConfig()
    return { allowSelfRegister: cfg.allowSelfRegister }
  }`
  must(s, a, 'ledger-auth.service')
  return s.replace(
    a,
    `  async getPublicConfig() {
    const cfg = await this.readConfig()
    // 站点 LOGO：来自平台「系统设置」site.logo（管理后台可上传/填写），缺失则空串（端上回退本地图标）
    let logoUrl = ''
    try {
      const row = await this.prisma.systemConfig.findUnique({ where: { key: 'system_settings' } })
      logoUrl = ((row?.value as any)?.site?.logo as string) || ''
    } catch (e) {
      /* 配置缺失忽略 */
    }
    return { allowSelfRegister: cfg.allowSelfRegister, logoUrl }
  }`,
  )
})

// ── 2) MP api：config 返回类型加 logoUrl ──
patch(`${MP}/api/index.ts`, (s) => {
  if (s.includes('allowSelfRegister: boolean; logoUrl')) return s
  const a = `http.get<{ allowSelfRegister: boolean }>('/l/auth/config', undefined, {`
  must(s, a, 'api/index')
  return s.replace(
    a,
    `http.get<{ allowSelfRegister: boolean; logoUrl?: string }>('/l/auth/config', undefined, {`,
  )
})

// ── 3) store：LOGO 本地缓存读写 ──
patch(`${MP}/utils/store.ts`, (s) => {
  if (s.includes('LOGO_KEY')) return s
  const a = `export function setGlass(v: boolean) {
  wx.setStorageSync(GLASS_KEY, v)
}`
  must(s, a, 'store')
  return s.replace(
    a,
    `${a}

/* ---- 小程序 LOGO（管理后台 system_settings.site.logo 下发，登录/关于页展示，本地缓存兜底） ---- */
const LOGO_KEY = 'ledger_logo'
export function getLogo(): string {
  return wx.getStorageSync(LOGO_KEY) || ''
}
export function setLogo(v: string) {
  wx.setStorageSync(LOGO_KEY, v || '')
}`,
  )
})

// ── 4) login.ts：拉取并展示 logo ──
patch(`${MP}/pages/login/index.ts`, (s) => {
  let out = s
  if (!out.includes('getLogo')) {
    const a = `import { setAuth, setUser, getUser, getToken, getBioLock, getBioVerified } from '../../utils/store'`
    must(out, a, 'login(import)')
    out = out.replace(
      a,
      `import {
  setAuth,
  setUser,
  getUser,
  getToken,
  getBioLock,
  getBioVerified,
  getLogo,
  setLogo,
} from '../../utils/store'`,
    )
  }
  if (!out.includes('logoUrl: string')) {
    const a = `  allowRegister: boolean
}`
    must(out, a, 'login(interface)')
    out = out.replace(a, `  allowRegister: boolean\n  logoUrl: string\n}`)
  }
  if (!out.includes('logoUrl: getLogo()')) {
    const a = `    allowRegister: true,
    // 隐私合规：默认不勾选，用户须自行阅读后勾选同意才能登录（不得默认同意）
    agreed: false,`
    must(out, a, 'login(data)')
    out = out.replace(
      a,
      `    allowRegister: true,
    logoUrl: getLogo(),
    // 隐私合规：默认不勾选，用户须自行阅读后勾选同意才能登录（不得默认同意）
    agreed: false,`,
    )
  }
  if (!out.includes('logoUrl: (c && c.logoUrl)')) {
    const a = `      .then((c: any) => this.setData({ allowRegister: !c || c.allowSelfRegister !== false }))
      .catch(() => {})`
    must(out, a, 'login(config)')
    out = out.replace(
      a,
      `      .then((c: any) => {
        this.setData({
          allowRegister: !c || c.allowSelfRegister !== false,
          logoUrl: (c && c.logoUrl) || '',
        })
        setLogo((c && c.logoUrl) || '')
      })
      .catch(() => {})`,
    )
  }
  return out
})

// ── 5) login.wxml：logo 条件渲染 ──
patch(`${MP}/pages/login/index.wxml`, (s) => {
  if (s.includes('login__logo-img')) return s
  const a = `    <view class="login__logo">
      <lz-icon name="cube" size="40" color="white" stroke="2" />
    </view>`
  must(s, a, 'login.wxml')
  return s.replace(
    a,
    `    <view class="login__logo">
      <image wx:if="{{logoUrl}}" class="login__logo-img" src="{{logoUrl}}" mode="aspectFit" />
      <lz-icon wx:else name="cube" size="40" color="white" stroke="2" />
    </view>`,
  )
})

// ── 6) login.wxss：logo 图片样式 ──
patch(`${MP}/pages/login/index.wxss`, (s) => {
  if (s.includes('.login__logo-img')) return s
  const a = `.login__logo {`
  must(s, a, 'login.wxss')
  return s.replace(
    a,
    `.login__logo-img {
  width: 64%;
  height: 64%;
  border-radius: 14px;
}
.login__logo {`,
  )
})

// ── 7) about.ts：拉取并展示 logo ──
patch(`${MP}/pages/about/index.ts`, (s) => {
  let out = s
  if (!out.includes('import { authApi }')) {
    const a = `const FALLBACK_VERSION = '1.0.2'`
    must(out, a, 'about(top)')
    out = out.replace(
      a,
      `import { authApi } from '../../api/index'
import { getLogo, setLogo } from '../../utils/store'

const FALLBACK_VERSION = '1.0.2'`,
    )
  }
  if (!out.includes('logoUrl:')) {
    const a = `  data: {
    appVersion: FALLBACK_VERSION,
  },
  onLoad() {
    this.setData({ appVersion: readVersion() })
  },`
    must(out, a, 'about(data)')
    out = out.replace(
      a,
      `  data: {
    appVersion: FALLBACK_VERSION,
    logoUrl: getLogo(),
  },
  onLoad() {
    this.setData({ appVersion: readVersion(), logoUrl: getLogo() })
    // 拉取最新 LOGO（管理后台可配），成功则更新并缓存
    authApi
      .config()
      .then((c: any) => {
        const url = (c && c.logoUrl) || ''
        if (url) {
          this.setData({ logoUrl: url })
          setLogo(url)
        }
      })
      .catch(() => {})
  },`,
    )
  }
  return out
})

// ── 8) about.wxml：logo 条件渲染 ──
patch(`${MP}/pages/about/index.wxml`, (s) => {
  if (s.includes('ab__logo-img')) return s
  const a = `      <view class="ab__logo"><lz-icon name="cube" size="40" color="white" stroke="2" /></view>`
  must(s, a, 'about.wxml')
  return s.replace(
    a,
    `      <view class="ab__logo">
        <image wx:if="{{logoUrl}}" class="ab__logo-img" src="{{logoUrl}}" mode="aspectFit" />
        <lz-icon wx:else name="cube" size="40" color="white" stroke="2" />
      </view>`,
  )
})

// ── 9) about.wxss：logo 图片样式 ──
patch(`${MP}/pages/about/index.wxss`, (s) => {
  if (s.includes('.ab__logo-img')) return s
  const a = `.ab__logo {`
  must(s, a, 'about.wxss')
  return s.replace(
    a,
    `.ab__logo-img {
  width: 64%;
  height: 64%;
  border-radius: 14px;
}
.ab__logo {`,
  )
})

console.log('changed:\n  ' + changed.join('\n  '))
