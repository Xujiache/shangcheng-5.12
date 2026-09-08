import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { contracts } from './audit-api-contracts.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const defaultServerRoot = path.resolve(projectRoot, '../../packages/server/src')
const serverRootArg = process.argv.indexOf('--server-root')
const serverRoot = path.resolve(serverRootArg >= 0 ? process.argv[serverRootArg + 1] : defaultServerRoot)

if (!fs.existsSync(serverRoot)) {
  throw new Error(`Nest backend source is unavailable: ${serverRoot}`)
}

function sourceFiles(directory) {
  const files = []
  for (const name of fs.readdirSync(directory)) {
    const full = path.join(directory, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) files.push(...sourceFiles(full))
    else if (name.endsWith('.controller.ts')) files.push(full)
  }
  return files
}

function literalArgument(raw, location) {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const match = trimmed.match(/^(['"`])([^'"`]*)\1$/s)
  if (!match) throw new Error(`Non-literal Nest route decorator at ${location}: ${trimmed}`)
  return match[2]
}

function routePath(base, child) {
  return `/${[base, child].filter(Boolean).join('/')}`.replace(/\/+/g, '/')
}

const serverRoutes = new Map()
for (const file of sourceFiles(serverRoot)) {
  const source = fs.readFileSync(file, 'utf8')
  const tokens = []
  for (const match of source.matchAll(/@Controller\(([^)]*)\)/gs)) {
    tokens.push({ index: match.index, kind: 'controller', value: literalArgument(match[1], file) })
  }
  for (const match of source.matchAll(/@(Get|Post|Put|Patch|Delete)\(([^)]*)\)/gs)) {
    tokens.push({
      index: match.index,
      kind: 'route',
      method: match[1].toUpperCase(),
      value: literalArgument(match[2], file)
    })
  }
  tokens.sort((left, right) => left.index - right.index)
  let controller = null
  for (const token of tokens) {
    if (token.kind === 'controller') {
      controller = token.value
      continue
    }
    if (controller === null) throw new Error(`Method decorator appears before @Controller in ${file}`)
    const key = `${token.method} ${routePath(controller, token.value)}`
    const owners = serverRoutes.get(key) || []
    owners.push(path.relative(serverRoot, file))
    serverRoutes.set(key, owners)
  }
}

function nativeRoute(route) {
  return route
    .split('?')[0]
    .replace(/^\/api\/v1/, '')
    .replace(/\$\{([A-Za-z0-9_]+)\}/g, ':$1')
}

const expected = []
for (const [, entries] of contracts) {
  for (const [method, route] of entries) {
    expected.push(`${method === 'request' ? 'POST' : method.toUpperCase()} ${nativeRoute(route)}`)
  }
}
expected.push('POST /files/upload')

const missing = [...new Set(expected)].filter((contract) => !serverRoutes.has(contract))
if (missing.length > 0) {
  throw new Error(`Native contracts missing from Nest controllers:\n${missing.join('\n')}`)
}

const realtimeSourcePath = path.join(serverRoot, 'modules/harmony-merchant/harmony-realtime.service.ts')
if (!fs.existsSync(realtimeSourcePath)) {
  throw new Error(`Harmony JSON WebSocket service is unavailable: ${realtimeSourcePath}`)
}
const realtimeSource = fs.readFileSync(realtimeSourcePath, 'utf8')
for (const fragment of [
  "path !== '/ws/harmony/merchant'",
  'interface HarmonyEnvelope',
  'v: 1',
  "envelope.event === 'auth' || envelope.event === 'token.update'",
  "case 'heartbeat'",
  "case 'chat.join'",
  "case 'chat.typing'",
  "case 'chat.read'",
  "case 'chat.send'",
  'requestIds.size > 200'
]) {
  if (!realtimeSource.includes(fragment)) {
    throw new Error(`Harmony JSON WebSocket server contract is missing: ${fragment}`)
  }
}

const reportPath = path.join(projectRoot, 'reports/release/backend-route-parity.json')
fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, `${JSON.stringify({
  checkedAt: new Date().toISOString(),
  serverRoot,
  controllerFiles: sourceFiles(serverRoot).length,
  serverRouteCount: serverRoutes.size,
  nativeHttpContracts: new Set(expected).size,
  nativeWebSocketContracts: 1,
  missing
}, null, 2)}\n`)

console.log(`Backend source parity passed: ${new Set(expected).size} native HTTP contracts and 1 JSON WebSocket protocol resolve to Nest source implementations.`)
