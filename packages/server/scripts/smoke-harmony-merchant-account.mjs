#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import process from 'node:process'
import { JwtService } from '@nestjs/jwt'
import { PrismaClient } from '@prisma/client'
import { WebSocket } from 'ws'

function loadPrivateEnvironment() {
  let source = ''
  try {
    source = readFileSync('.env', 'utf8')
  } catch {
    return
  }
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match || process.env[match[1]] !== undefined) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    process.env[match[1]] = value
  }
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close((error) => (error ? reject(error) : resolve(port)))
    })
  })
}

async function waitForHealth(baseUrl, child, output) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`production candidate exited during bootstrap\n${output.value.slice(-4_000)}`)
    }
    try {
      if ((await fetch(`${baseUrl}/health`)).status === 200) return
    } catch {
      // Candidate is still bootstrapping.
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`production candidate did not become healthy\n${output.value.slice(-4_000)}`)
}

async function api(baseUrl, token, path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Client-Platform': 'merchant-harmony',
      'X-Client-Version': '1.0.0',
    },
  })
  let body = null
  try {
    body = await response.json()
  } catch {
    // Report invalid JSON as a failed endpoint without printing the body.
  }
  if (response.status !== 200 || Number(body?.code) !== 0) {
    throw new Error(`${path} failed: HTTP ${response.status}, code ${body?.code ?? 'invalid-json'}`)
  }
  return body.data
}

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value
}

function keys(value, required, label) {
  const row = object(value, label)
  const missing = required.filter((key) => !Object.prototype.hasOwnProperty.call(row, key))
  if (missing.length) throw new Error(`${label} is missing fields: ${missing.join(', ')}`)
  return row
}

function list(value, itemFields, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`)
  if (value.length && itemFields.length) keys(value[0], itemFields, `${label}[0]`)
}

function page(value, itemFields, label) {
  const row = keys(value, ['list', 'total', 'page', 'pageSize'], label)
  list(row.list, itemFields, `${label}.list`)
}

/**
 * Read-only production smoke must prove response semantics, not merely HTTP 200.
 * Fields below are the ArkTS merchant client's actual rendering contract.  No
 * payload values are logged, so the check cannot leak customer or merchant PII.
 */
function validateResponseShape(path, value) {
  const route = path.split('?')[0]
  switch (route) {
    case '/api/v1/auth/user-info':
      keys(value, ['id', 'role', 'status', 'merchantId'], route)
      break
    case '/api/v1/m/dashboard': {
      const dashboard = keys(value, ['workbench'], route)
      const workbench = keys(dashboard.workbench, ['updatedAt', 'overview', 'trend7d', 'actions'], `${route}.workbench`)
      keys(workbench.overview, ['paidAmount', 'paidOrders', 'paidCustomers', 'versusYesterday'], `${route}.overview`)
      keys(workbench.overview.versusYesterday, ['paidAmountPct', 'paidOrdersPct', 'paidCustomersPct'], `${route}.versusYesterday`)
      keys(workbench.actions, ['pendingShipment', 'pendingRefund', 'unreadMessages', 'rejectedProducts', 'auditingProducts', 'pendingStoreAuth'], `${route}.actions`)
      list(workbench.trend7d, ['date', 'paidAmount'], `${route}.trend7d`)
      break
    }
    case '/api/v1/m/feature-flags':
      keys(value, ['homeEntry', 'roleButton', 'sideMenu'], route)
      break
    case '/api/v1/m/products':
      page(value, ['id', 'name', 'images', 'status', 'priceRetailMin', 'priceRetailMax', 'totalStock', 'sales', 'updatedAt'], route)
      break
    case '/api/v1/m/categories':
      list(value, ['id', 'name', 'sort', 'type'], route)
      break
    case '/api/v1/m/orders':
      page(value, ['id', 'no', 'status', 'payAmount', 'address', 'createdAt'], route)
      break
    case '/api/v1/m/refunds':
      page(value, ['id', 'no', 'orderId', 'type', 'reason', 'evidence', 'applyAmount', 'status', 'createdAt'], route)
      break
    case '/api/v1/m/customers':
      page(value, ['id', 'nickname', 'phone', 'kind', 'priceTier', 'orderCount', 'totalSpent', 'priceAuthorized', 'commissionEnabled', 'blocked'], route)
      break
    case '/api/v1/m/commission/rules': {
      const rules = keys(value, ['default', 'productRules'], route)
      keys(rules.default, ['level1Percent', 'level2Percent', 'visibleToPromoter', 'allowOffline', 'enabled'], `${route}.default`)
      list(rules.productRules, ['productId', 'productName', 'productImage', 'level1Percent', 'level2Percent'], `${route}.productRules`)
      break
    }
    case '/api/v1/m/stores':
      page(value, ['id', 'name', 'contact', 'phone', 'region', 'address', 'level', 'status'], route)
      break
    case '/api/v1/m/staffs':
      page(value, ['id', 'name', 'phone', 'role', 'status', 'permissions'], route)
      break
    case '/api/v1/m/shop/decorate':
      keys(value, ['merchantId', 'themeColor', 'fontStyle', 'banners', 'productLayout'], route)
      break
    case '/api/v1/m/marketing/overview': {
      const overview = keys(value, ['coupons', 'flashSales', 'groupBuys'], route)
      keys(overview.coupons, ['total', 'active', 'totalReceived', 'totalUsed'], `${route}.coupons`)
      keys(overview.flashSales, ['total', 'active', 'planned', 'sold'], `${route}.flashSales`)
      keys(overview.groupBuys, ['total', 'active', 'planned', 'sold'], `${route}.groupBuys`)
      break
    }
    case '/api/v1/m/marketing/activities':
      page(value, ['id', 'kind', 'name', 'status', 'createdAt'], route)
      break
    case '/api/v1/m/marketing/coupons':
      page(value, ['id', 'name', 'type', 'stock', 'received', 'used', 'validFrom', 'validTo', 'perUserLimit', 'scope', 'status'], route)
      break
    case '/api/v1/m/chat/sessions':
      list(value, ['id', 'userId', 'userName', 'userAvatar', 'lastMessageAt', 'unreadCount', 'status', 'online'], route)
      break
    case '/api/v1/m/chat/quick-replies':
      list(value, ['id', 'label', 'content'], route)
      break
    case '/api/v1/m/plaza/products':
      page(value, ['productId', 'productName', 'productImage', 'factoryName', 'factoryId', 'startPrice', 'agencyCount'], route)
      break
    case '/api/v1/m/plaza/factories':
      list(value, ['id', 'name', 'logo', 'region', 'categories', 'gmv', 'rating', 'ratingCount', 'tags'], route)
      break
    case '/api/v1/m/plaza/visibility':
      keys(value, ['scope'], route)
      break
    case '/api/v1/m/plaza/applications':
      list(value, ['id', 'applicationId', 'productId', 'productName', 'factoryId', 'factoryName', 'factoryPrice', 'myRetailPrice', 'markupRatio', 'syncStatus', 'status', 'appliedAt'], route)
      break
    case '/api/v1/m/profile':
      keys(value, ['shopName', 'merchantNo', 'contactName', 'contactPhone', 'email', 'categories', 'address', 'description', 'region', 'status', 'type', 'latitude', 'longitude'], route)
      break
    case '/api/v1/m/shop/price-rule':
      keys(value, ['guestAllow', 'customerPrice', 'agencyPrice', 'memberPrice'], route)
      break
    case '/api/v1/m/membership/plans':
      list(value, ['id', 'code', 'name', 'type', 'price', 'period', 'periodCount', 'rights', 'status'], route)
      break
    case '/api/v1/m/membership':
      if (value !== null) keys(value, ['id', 'planId', 'planCode', 'startAt', 'endAt', 'status', 'autoRenew'], route)
      break
    case '/api/v1/m/membership/quota':
      keys(value, ['pushSlotsLimit', 'pushSlotsUsed', 'bannerLimit', 'bannerUsed', 'impressionLimit', 'impressionUsed', 'periodStart', 'periodEnd'], route)
      break
    case '/api/v1/m/membership/payments':
      list(value, ['id', 'no', 'planName', 'amount', 'paymentMethod', 'status', 'createdAt'], route)
      break
    case '/api/v1/m/membership/notices':
      list(value, ['type', 'text'], route)
      break
    case '/api/v1/m/stats':
      keys(value, ['period', 'orderCount', 'totalSales', 'avgOrderValue', 'salesTrend', 'topProducts', 'customerAnalysis', 'categoryBars'], route)
      break
    case '/api/v1/m/push/preferences':
      keys(value, ['orders', 'refunds', 'chat'], route)
      break
    default:
      throw new Error(`No Harmony response-shape contract registered for ${route}`)
  }
}

function authenticateSocket(url, token, sessionId) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url)
    const timeout = setTimeout(() => {
      socket.terminate()
      reject(new Error('authenticated Harmony WebSocket smoke timed out'))
    }, 8_000)
    let authenticated = false
    socket.on('message', (raw) => {
      try {
        const envelope = JSON.parse(raw.toString())
        if (envelope.event === 'connection.ready') {
          socket.send(JSON.stringify({
            v: 1,
            event: 'auth',
            requestId: 'smoke-auth',
            ts: Date.now(),
            data: { token },
          }))
          return
        }
        if (envelope.event === 'auth.ok') {
          authenticated = true
          if (sessionId) {
            socket.send(JSON.stringify({
              v: 1,
              event: 'chat.join',
              requestId: 'smoke-chat-join',
              ts: Date.now(),
              data: { sessionId },
            }))
          } else {
            clearTimeout(timeout)
            socket.close()
            resolve()
          }
          return
        }
        if (authenticated && envelope.event === 'chat.joined') {
          clearTimeout(timeout)
          socket.close()
          resolve()
        } else if (envelope.event === 'auth.failed' || envelope.event === 'error') {
          throw new Error(`Harmony WebSocket rejected ${envelope.event}`)
        }
      } catch (error) {
        clearTimeout(timeout)
        socket.terminate()
        reject(error)
      }
    })
    socket.once('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
  })
}

loadPrivateEnvironment()
if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  throw new Error('DATABASE_URL and JWT_SECRET are required for the authenticated smoke test')
}

const phone = String(process.env.HARMONY_SMOKE_PHONE || '18195819181').trim()
const prisma = new PrismaClient()
let user
try {
  user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, role: true, status: true, merchantId: true },
  })
} finally {
  await prisma.$disconnect()
}
if (!user || user.status !== 'active' || !user.merchantId) {
  throw new Error('The configured Harmony smoke account is not an active merchant')
}

const token = await new JwtService({ secret: process.env.JWT_SECRET }).signAsync({
  sub: user.id,
  role: user.role,
  merchantId: user.merchantId,
  jti: `harmony-smoke-${Date.now()}`,
}, { expiresIn: 300 })

const externalBaseUrl = String(process.env.HARMONY_SMOKE_BASE_URL || '').trim().replace(/\/+$/, '')
const port = externalBaseUrl ? 0 : await freePort()
const host = '127.0.0.1'
const baseUrl = externalBaseUrl || `http://${host}:${port}`
const output = { value: '' }
const child = externalBaseUrl ? null : spawn(process.execPath, ['dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'production',
    SERVER_HOST: host,
    SERVER_PORT: String(port),
    CORS_ORIGIN: process.env.CORS_ORIGIN || baseUrl,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})
if (child) {
  for (const stream of [child.stdout, child.stderr]) {
    stream.setEncoding('utf8')
    stream.on('data', (chunk) => {
      output.value = `${output.value}${chunk}`.slice(-20_000)
    })
  }
}

const reads = [
  '/api/v1/auth/user-info',
  '/api/v1/m/dashboard',
  '/api/v1/m/feature-flags',
  '/api/v1/m/products?page=1&pageSize=2',
  '/api/v1/m/categories',
  '/api/v1/m/orders?page=1&pageSize=2',
  '/api/v1/m/refunds?page=1&pageSize=2',
  '/api/v1/m/customers?page=1&pageSize=2',
  '/api/v1/m/commission/rules',
  '/api/v1/m/stores?page=1&pageSize=2',
  '/api/v1/m/staffs?page=1&pageSize=2',
  '/api/v1/m/shop/decorate',
  '/api/v1/m/marketing/overview',
  '/api/v1/m/marketing/activities?kind=flash&page=1&pageSize=2',
  '/api/v1/m/marketing/coupons?page=1&pageSize=2',
  '/api/v1/m/chat/sessions',
  '/api/v1/m/chat/quick-replies',
  '/api/v1/m/plaza/products?page=1&pageSize=2',
  '/api/v1/m/plaza/factories',
  '/api/v1/m/plaza/visibility',
  '/api/v1/m/plaza/applications',
  '/api/v1/m/profile',
  '/api/v1/m/shop/price-rule',
  '/api/v1/m/membership/plans',
  '/api/v1/m/membership',
  '/api/v1/m/membership/quota',
  '/api/v1/m/membership/payments',
  '/api/v1/m/membership/notices',
  '/api/v1/m/stats?period=week',
  '/api/v1/m/push/preferences',
]

try {
  if (child) await waitForHealth(baseUrl, child, output)
  let sessions = []
  for (const path of reads) {
    const data = await api(baseUrl, token, path)
    validateResponseShape(path, data)
    if (path === '/api/v1/m/chat/sessions' && Array.isArray(data)) sessions = data
  }
  await authenticateSocket(
    `${baseUrl.replace(/^http/, 'ws')}/ws/harmony/merchant`,
    token,
    sessions.length > 0 ? String(sessions[0].id || '') : '',
  )
  process.stdout.write(
    `Authenticated Harmony merchant smoke passed against ${externalBaseUrl ? 'deployed service' : 'local production candidate'}: ${reads.length} read-only REST surfaces, ${reads.length} response contract shapes and JSON WebSocket auth${sessions.length > 0 ? '/chat ownership' : ''}.\n`,
  )
} finally {
  if (child) {
    if (child.exitCode === null) child.kill('SIGTERM')
    await Promise.race([
      new Promise((resolve) => child.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 3_000)),
    ])
    if (child.exitCode === null) child.kill('SIGKILL')
  }
}
