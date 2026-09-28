import assert from 'node:assert/strict'

const storage = new Map<string, any>()
const pending: any[] = []
const app: any = { globalData: { token: '', online: true } }
const token = (id: string) => {
  const payload = Buffer.from(JSON.stringify({ scope: 'ledger', sub: id })).toString('base64url')
  return `header.${payload}.signature`
}
;(globalThis as any).getApp = () => app
;(globalThis as any).wx = {
  getStorageSync: (key: string) => storage.get(key),
  setStorageSync: (key: string, value: any) => storage.set(key, value),
  base64ToArrayBuffer: (value: string) => {
    const bytes = Buffer.from(value, 'base64')
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  },
  request: (options: any) => pending.push(options),
  showToast: () => {},
}

async function tick() { await new Promise<void>((resolve) => { setImmediate(resolve) }) }

async function main() {
  const { reportToolEvent, flushToolEvents } = await import('../miniprogram/utils/tool-events')
  reportToolEvent('triangle', 'open')
  assert.equal(storage.size, 0, 'guest actions must not be recorded')

  app.globalData.token = token('alice')
  reportToolEvent('triangle', 'success')
  assert.equal(pending.length, 1)
  assert.equal(pending[0].data.events[0].tool, 'triangle')
  assert.deepEqual(Object.keys(pending[0].data.events[0]).sort(), ['id', 'occurredAt', 'status', 'tool'])
  pending.shift().fail(new Error('offline'))
  await tick()
  assert.equal(storage.get('ledger_tool_events_v1:alice').length, 1)

  app.globalData.token = token('bob')
  reportToolEvent('arc', 'open')
  assert.equal(pending.length, 1)
  assert.equal(pending[0].header.Authorization, `Bearer ${app.globalData.token}`)
  pending.shift().success({ statusCode: 200, data: { code: 0, data: { accepted: 1 } } })
  await tick()
  assert.equal(storage.get('ledger_tool_events_v1:bob').length, 0)
  assert.equal(storage.get('ledger_tool_events_v1:alice').length, 1)

  app.globalData.token = token('alice')
  const replay = flushToolEvents()
  assert.equal(pending.length, 1)
  pending.shift().success({ statusCode: 200, data: { code: 0, data: { accepted: 1 } } })
  await replay
  assert.equal(storage.get('ledger_tool_events_v1:alice').length, 0)

  reportToolEvent('format', 'success')
  assert.equal(pending.length, 0, 'format terminal events belong to the server')
  console.log('tool event queue verified: guest omission, metadata only, offline replay, account isolation')
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
