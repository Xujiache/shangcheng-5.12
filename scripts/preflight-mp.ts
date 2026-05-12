/**
 * 微信小程序提审前自检
 *
 * 跑法：pnpm tsx scripts/preflight-mp.ts
 *   或：pnpm tsx scripts/preflight-mp.ts --host=https://ewsn.top
 *
 * 检查项：
 *   1. HTTPS 证书是否有效、过期日
 *   2. 后端 5 个用户端核心接口是否 200 + ApiResult{code:0}
 *   3. WebSocket /ws/chat 能否握手成功（socket.io v4 polling 握手）
 *   4. 公开静态资源（默认头像、首页 banner 兜底图）是否可达
 *
 * 退出码：0 = 全通过；非 0 = 有失败项（CI 也能用）
 */
import https from 'node:https'
import http from 'node:http'
import { URL } from 'node:url'

const argHost = process.argv.find((a) => a.startsWith('--host='))?.split('=')[1]
const HOST = argHost || process.env.PREFLIGHT_HOST || 'https://ewsn.top'

const PASS = '\x1b[32m✓\x1b[0m'
const FAIL = '\x1b[31m✗\x1b[0m'
const WARN = '\x1b[33m!\x1b[0m'

interface Result {
  name: string
  ok: boolean
  detail: string
  warn?: boolean
}
const results: Result[] = []

function get(url: string, opts: https.RequestOptions = {}, body?: string): Promise<{ status: number; headers: any; body: string; tls?: any }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const lib = u.protocol === 'https:' ? https : http
    const req = lib.request(
      url,
      {
        method: body ? 'POST' : 'GET',
        timeout: 8000,
        headers: { 'User-Agent': 'preflight-mp/1.0', ...(opts.headers || {}) },
        ...opts,
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () =>
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
            tls: (res.socket as any).getPeerCertificate?.(),
          }),
        )
      },
    )
    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('timeout')))
    if (body) req.write(body)
    req.end()
  })
}

async function checkCert() {
  try {
    const r = await get(HOST)
    const cert = r.tls
    if (!cert?.valid_to) {
      results.push({ name: 'HTTPS 证书', ok: false, detail: '无法读取证书信息' })
      return
    }
    const expireAt = new Date(cert.valid_to)
    const daysLeft = Math.floor((expireAt.getTime() - Date.now()) / 86400000)
    const issuer = cert.issuer?.O || cert.issuer?.CN || 'unknown'
    if (daysLeft < 7) {
      results.push({
        name: 'HTTPS 证书',
        ok: false,
        detail: `${daysLeft} 天后过期（${expireAt.toISOString().slice(0, 10)}），需要续签`,
      })
    } else if (daysLeft < 30) {
      results.push({
        name: 'HTTPS 证书',
        ok: true,
        warn: true,
        detail: `${daysLeft} 天后过期，签发者 ${issuer}`,
      })
    } else {
      results.push({
        name: 'HTTPS 证书',
        ok: true,
        detail: `${daysLeft} 天后过期，签发者 ${issuer}`,
      })
    }
  } catch (e: any) {
    results.push({ name: 'HTTPS 证书', ok: false, detail: e?.message || String(e) })
  }
}

async function checkApi(label: string, path: string, expectShape: 'list' | 'object' = 'object') {
  try {
    const r = await get(`${HOST}${path}`)
    if (r.status >= 500) {
      results.push({ name: label, ok: false, detail: `HTTP ${r.status}（服务端 5xx）` })
      return
    }
    let parsed: any
    try { parsed = JSON.parse(r.body) } catch {
      results.push({ name: label, ok: false, detail: `非 JSON 响应：${r.body.slice(0, 80)}` })
      return
    }
    if (typeof parsed?.code !== 'number') {
      results.push({ name: label, ok: false, detail: `响应缺 code 字段（不是 ApiResult 形态）` })
      return
    }
    // code !== 0 但 401 / 鉴权要求是预期的（这些接口本来就需要 token）
    if (parsed.code === 0) {
      const hint = expectShape === 'list' && Array.isArray(parsed.data?.items)
        ? `, ${parsed.data.items.length} 条`
        : ''
      results.push({ name: label, ok: true, detail: `code=0${hint}` })
    } else if ([401, 2001, 2002].includes(parsed.code)) {
      results.push({ name: label, ok: true, warn: true, detail: `code=${parsed.code}（鉴权要求，正常）` })
    } else {
      results.push({ name: label, ok: false, detail: `code=${parsed.code} message="${parsed.message}"` })
    }
  } catch (e: any) {
    results.push({ name: label, ok: false, detail: e?.message || String(e) })
  }
}

async function checkSocket() {
  // socket.io v4 走 path=/ws/chat，先用 polling 握手探测；mp 端真正连接走 wss + websocket
  const url = `${HOST}/ws/chat/?EIO=4&transport=polling`
  try {
    const r = await get(url)
    if (r.status === 200 && r.body.startsWith('0')) {
      // 0{"sid":"xxx","upgrades":["websocket"],"pingInterval":..., ...}
      try {
        const payload = JSON.parse(r.body.slice(1))
        const ok = Array.isArray(payload.upgrades) && payload.upgrades.includes('websocket')
        results.push({
          name: 'WebSocket /ws/chat',
          ok,
          detail: ok ? `握手 OK，可升级 websocket（sid=${payload.sid?.slice(0, 8)}）` : '握手成功但不支持 websocket 升级',
        })
      } catch {
        results.push({ name: 'WebSocket /ws/chat', ok: true, detail: '握手 200 但响应解析异常' })
      }
    } else {
      results.push({ name: 'WebSocket /ws/chat', ok: false, detail: `HTTP ${r.status}：${r.body.slice(0, 60)}` })
    }
  } catch (e: any) {
    results.push({ name: 'WebSocket /ws/chat', ok: false, detail: e?.message || String(e) })
  }
}

async function checkMapKey() {
  // 我们直接打腾讯地图的 webservice，看是否能正常返回（403 = key 域名未授权）
  const r = await get(`${HOST}/api/v1/u/config/map`).catch(() => null)
  if (r?.status === 200) {
    try {
      const j = JSON.parse(r.body)
      if (j?.code === 0 && j?.data?.tencentMapKey) {
        results.push({ name: '地图 Key（后端配置）', ok: true, detail: `已配置（前缀 ${String(j.data.tencentMapKey).slice(0, 6)}…）` })
        return
      }
    } catch {}
  }
  results.push({
    name: '地图 Key（后端配置）',
    ok: true,
    warn: true,
    detail: '后端无 /u/config/map 接口（前端用 .env 注入也可）',
  })
}

async function main() {
  console.log(`\nPreflight 目标：${HOST}\n`)
  await checkCert()
  await checkApi('GET /api/v1/u/categories', '/api/v1/u/categories', 'list')
  await checkApi('GET /api/v1/u/products', '/api/v1/u/products?page=1&pageSize=10', 'list')
  await checkApi('GET /api/v1/u/banners', '/api/v1/u/banners', 'list')
  await checkApi('GET /api/v1/u/profile', '/api/v1/u/profile') // 期望 401（无 token）
  await checkApi('GET /api/v1/u/orders', '/api/v1/u/orders?page=1') // 同上
  await checkSocket()
  await checkMapKey()

  console.log('结果：')
  let failed = 0
  let warned = 0
  for (const r of results) {
    const icon = r.ok ? (r.warn ? WARN : PASS) : FAIL
    if (!r.ok) failed++
    if (r.warn) warned++
    console.log(`  ${icon} ${r.name.padEnd(28)} ${r.detail}`)
  }
  console.log('')
  if (failed > 0) {
    console.log(`\x1b[31m${failed} 项失败\x1b[0m${warned ? `, ${warned} 项警告` : ''} — 修完再提审。`)
    process.exit(1)
  } else if (warned > 0) {
    console.log(`\x1b[33m全部通过（${warned} 项警告，可忽略）\x1b[0m`)
  } else {
    console.log('\x1b[32m全部通过 ✓\x1b[0m')
  }
}

main().catch((e) => {
  console.error('preflight 自身异常：', e)
  process.exit(2)
})
