/**
 * Smoke 测试脚本：逐条请求后端关键接口，验证无 404 / 500
 *
 * 用法：
 *   1) 启动依赖：cd deploy && docker compose -f docker-compose.dev.yml up -d
 *   2) prisma migrate + seed：
 *      pnpm --filter @jiujiu/server prisma:migrate
 *      pnpm --filter @jiujiu/server prisma:seed
 *   3) 启动后端：pnpm --filter @jiujiu/server start:dev
 *   4) 跑 smoke：tsx packages/server/scripts/smoke.ts
 */
import { setTimeout as wait } from 'node:timers/promises'

const BASE = process.env.SMOKE_BASE || 'http://localhost:3001'

interface Case {
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  url: string
  body?: any
  needsAuth?: 'merchant' | 'admin' | 'super' | 'customer'
  expectCode?: number[]
}

const tokens: Record<string, string> = {}

async function http(method: string, path: string, body?: any, auth?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth && tokens[auth]) headers.Authorization = `Bearer ${tokens[auth]}`
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  let data: any = null
  try { data = JSON.parse(text) } catch { data = text }
  return { status: res.status, data }
}

async function login(username: string, password: string) {
  const r = await http('POST', '/api/v1/auth/admin-login', { username, password })
  return r.data?.data?.accessToken || r.data?.data?.token
}

async function main() {
  console.log(`▶  Smoke test against ${BASE}\n`)

  // 登录
  tokens.merchant = await login('merchant@demo', '123456')
  tokens.admin = await login('admin@demo', '123456')
  tokens.super = await login('super@demo', '123456')
  console.log('  ✓ 3 seed accounts logged in\n')

  const cases: Case[] = [
    { name: 'health', method: 'GET', url: '/health' },
    { name: 'wechat-login', method: 'POST', url: '/api/v1/auth/wechat-login', body: { code: 'smoke' } },
    { name: 'sms-code', method: 'POST', url: '/api/v1/auth/sms-code', body: { phone: '13800001234' } },
    { name: 'phone-login', method: 'POST', url: '/api/v1/auth/phone-login', body: { phone: '13800001234', code: '0000' } },
    // user-mp public
    { name: 'u/products', method: 'GET', url: '/api/v1/u/products' },
    { name: 'u/categories', method: 'GET', url: '/api/v1/u/categories' },
    { name: 'u/banners', method: 'GET', url: '/api/v1/u/banners' },
    { name: 'u/stores/nearby', method: 'GET', url: '/api/v1/u/stores/nearby' },
    // merchant 鉴权
    { name: 'm/dashboard', method: 'GET', url: '/api/v1/m/dashboard', needsAuth: 'merchant' },
    { name: 'm/stats', method: 'GET', url: '/api/v1/m/stats?period=today', needsAuth: 'merchant' },
    { name: 'm/products', method: 'GET', url: '/api/v1/m/products', needsAuth: 'merchant' },
    { name: 'm/orders', method: 'GET', url: '/api/v1/m/orders', needsAuth: 'merchant' },
    { name: 'm/refunds', method: 'GET', url: '/api/v1/m/refunds', needsAuth: 'merchant' },
    { name: 'm/customers', method: 'GET', url: '/api/v1/m/customers', needsAuth: 'merchant' },
    { name: 'm/commission/rules', method: 'GET', url: '/api/v1/m/commission/rules', needsAuth: 'merchant' },
    { name: 'm/withdraws', method: 'GET', url: '/api/v1/m/withdraws', needsAuth: 'merchant' },
    { name: 'm/balance', method: 'GET', url: '/api/v1/m/balance', needsAuth: 'merchant' },
    { name: 'm/stores', method: 'GET', url: '/api/v1/m/stores', needsAuth: 'merchant' },
    { name: 'm/staffs', method: 'GET', url: '/api/v1/m/staffs', needsAuth: 'merchant' },
    { name: 'm/shop/decorate', method: 'GET', url: '/api/v1/m/shop/decorate', needsAuth: 'merchant' },
    { name: 'm/marketing/overview', method: 'GET', url: '/api/v1/m/marketing/overview', needsAuth: 'merchant' },
    { name: 'm/marketing/coupons', method: 'GET', url: '/api/v1/m/marketing/coupons', needsAuth: 'merchant' },
    { name: 'm/chat/sessions', method: 'GET', url: '/api/v1/m/chat/sessions', needsAuth: 'merchant' },
    { name: 'm/chat/quick-replies', method: 'GET', url: '/api/v1/m/chat/quick-replies', needsAuth: 'merchant' },
    { name: 'm/plaza/products', method: 'GET', url: '/api/v1/m/plaza/products', needsAuth: 'merchant' },
    { name: 'm/plaza/factories', method: 'GET', url: '/api/v1/m/plaza/factories', needsAuth: 'merchant' },
    { name: 'm/feature-flags', method: 'GET', url: '/api/v1/m/feature-flags', needsAuth: 'merchant' },
    { name: 'm/membership/plans', method: 'GET', url: '/api/v1/m/membership/plans', needsAuth: 'merchant' },
    { name: 'm/membership', method: 'GET', url: '/api/v1/m/membership', needsAuth: 'merchant' },
    { name: 'm/membership/quota', method: 'GET', url: '/api/v1/m/membership/quota', needsAuth: 'merchant' },
    { name: 'm/membership/payments', method: 'GET', url: '/api/v1/m/membership/payments', needsAuth: 'merchant' },
    { name: 'm/membership/notices', method: 'GET', url: '/api/v1/m/membership/notices', needsAuth: 'merchant' },
    // platform 鉴权
    { name: 'p/dashboard', method: 'GET', url: '/api/v1/p/dashboard', needsAuth: 'admin' },
    { name: 'p/merchants', method: 'GET', url: '/api/v1/p/merchants', needsAuth: 'admin' },
    { name: 'p/audit/merchants', method: 'GET', url: '/api/v1/p/audit/merchants', needsAuth: 'admin' },
    { name: 'p/orders', method: 'GET', url: '/api/v1/p/orders', needsAuth: 'admin' },
    { name: 'p/audit/products', method: 'GET', url: '/api/v1/p/audit/products', needsAuth: 'admin' },
    { name: 'p/audit/products/config', method: 'GET', url: '/api/v1/p/audit/products/config', needsAuth: 'admin' },
    { name: 'p/ads/slots', method: 'GET', url: '/api/v1/p/ads/slots', needsAuth: 'admin' },
    { name: 'p/ads/creatives', method: 'GET', url: '/api/v1/p/ads/creatives', needsAuth: 'admin' },
    { name: 'p/plaza/pushes', method: 'GET', url: '/api/v1/p/plaza/pushes', needsAuth: 'admin' },
    { name: 'p/plaza/products', method: 'GET', url: '/api/v1/p/plaza/products', needsAuth: 'admin' },
    { name: 'p/plaza/factories', method: 'GET', url: '/api/v1/p/plaza/factories', needsAuth: 'admin' },
    { name: 'p/plaza/records', method: 'GET', url: '/api/v1/p/plaza/records', needsAuth: 'admin' },
    { name: 'p/member-plans', method: 'GET', url: '/api/v1/p/member-plans', needsAuth: 'admin' },
    { name: 'p/member-pay-orders', method: 'GET', url: '/api/v1/p/member-pay-orders', needsAuth: 'admin' },
    { name: 'p/feature-flags', method: 'GET', url: '/api/v1/p/feature-flags', needsAuth: 'admin' },
    { name: 'p/feature-flags/gray', method: 'GET', url: '/api/v1/p/feature-flags/gray', needsAuth: 'admin' },
    { name: 'p/admins', method: 'GET', url: '/api/v1/p/admins', needsAuth: 'admin' },
    { name: 'p/roles', method: 'GET', url: '/api/v1/p/roles', needsAuth: 'admin' },
    { name: 'p/system/settings', method: 'GET', url: '/api/v1/p/system/settings', needsAuth: 'admin' },
    { name: 'auth/user-info', method: 'GET', url: '/api/v1/auth/user-info', needsAuth: 'merchant' },
    { name: 'auth/menus', method: 'GET', url: '/api/v1/auth/menus', needsAuth: 'merchant' },
  ]

  const fail: string[] = []
  for (const c of cases) {
    const r = await http(c.method, c.url, c.body, c.needsAuth)
    const ok = r.status >= 200 && r.status < 300 && (r.data?.code === 0 || r.data?.code === 200)
    const mark = ok ? '✓' : '✗'
    console.log(`  ${mark}  ${c.method.padEnd(5)} ${c.url.padEnd(50)}  HTTP ${r.status}  code=${r.data?.code}`)
    if (!ok) fail.push(`${c.method} ${c.url} → HTTP ${r.status} code=${r.data?.code} msg=${r.data?.msg || r.data?.message}`)
    await wait(20)
  }

  console.log(`\n${fail.length === 0 ? '✅' : '❌'} ${cases.length - fail.length}/${cases.length} passed`)
  if (fail.length) {
    console.log('\nFailures:')
    fail.forEach((f) => console.log('  ' + f))
    process.exit(1)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
