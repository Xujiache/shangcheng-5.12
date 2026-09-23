import assert from 'node:assert/strict'
import { clearAllCache, invalidateCache, request, wasStale } from '../miniprogram/utils/request'

const storage = new Map<string, any>()
const pending: any[] = []
const app: any = { globalData: { token: 'account-a-token', online: true } }
;(globalThis as any).getApp = () => app
;(globalThis as any).wx = {
  getStorageSync: (key: string) => storage.get(key),
  setStorageSync: (key: string, value: any) => storage.set(key, value),
  removeStorageSync: (key: string) => storage.delete(key),
  getStorageInfoSync: () => ({ keys: [...storage.keys()] }),
  request: (options: any) => pending.push(options),
  showToast: () => {},
}

async function main() {
  const a1 = request({ url: '/l/orders', cache: true })
  const a2 = request({ url: '/l/orders', cache: true })
  assert.equal(pending.length, 1, 'same-session GET should be coalesced')
  pending.shift().success({ statusCode: 200, data: { code: 0, data: { list: [{ id: 'a' }] } } })
  assert.deepEqual(await a1, await a2)
  assert.ok([...storage.keys()].every((key) => !key.includes('account-a-token')))

  app.globalData.online = false
  const cached = await request<{ list: Array<{ id: string }> }>({ url: '/l/orders', cache: true })
  assert.equal(cached.list[0].id, 'a')
  assert.equal(wasStale(cached), true)
  assert.equal(pending.length, 0)

  app.globalData.token = 'account-b-token'
  const other = request({ url: '/l/orders', cache: true, silent: true })
  assert.equal(pending.length, 1, 'other account cannot read first account cache')
  pending.shift().fail(new Error('offline'))
  await assert.rejects(other)

  app.globalData.token = 'account-a-token'
  invalidateCache('/l/orders')
  const afterWrite = request({ url: '/l/orders', cache: true, silent: true })
  assert.equal(pending.length, 1, 'write invalidates cached GET')
  pending.shift().fail(new Error('offline'))
  await assert.rejects(afterWrite)

  app.globalData.online = true
  const oldSession = request({ url: '/l/orders', cache: true, silent: true })
  assert.equal(pending.length, 1)
  app.globalData.token = 'account-b-token'
  clearAllCache()
  pending.shift().success({ statusCode: 200, data: { code: 0, data: { list: [{ id: 'a' }] } } })
  await assert.rejects(oldSession, /请求会话已变化/)
  clearAllCache()
  assert.equal(storage.size, 0)
  console.log(
    'request cache verified: coalescing, account isolation, stale marker, write invalidation, late-response rejection',
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
