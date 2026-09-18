import assert from 'node:assert/strict'
import test from 'node:test'
import { appendQuery, parseQuery, stringifyQuery } from '../src/utils/query'
import { shouldPresentAppUpdate } from '../src/utils/app-update'

test('查询参数序列化不依赖 URLSearchParams', () => {
  const original = (globalThis as any).URLSearchParams
  try {
    ;(globalThis as any).URLSearchParams = undefined
    assert.equal(
      appendQuery('/api/latest', { platform: '商家 端', force: false, empty: null }),
      '/api/latest?platform=%E5%95%86%E5%AE%B6%20%E7%AB%AF&force=false',
    )
  } finally {
    ;(globalThis as any).URLSearchParams = original
  }
})

test('数组使用重复 key，已有 query 使用 & 连接', () => {
  assert.equal(stringifyQuery({ status: ['paid', 'done'], page: 1 }), 'status=paid&status=done&page=1')
  assert.equal(appendQuery('/orders?source=home', { status: 'pending' }), '/orders?source=home&status=pending')
})

test('解析中文、加号和无效转义时安全降级', () => {
  assert.deepEqual(parseQuery('?name=%E9%97%A8%E7%AA%97+APP&status=pending'), {
    name: '门窗 APP',
    status: 'pending',
  })
  assert.deepEqual(parseQuery('bad=%E0%A4%A'), { bad: '%E0%A4%A' })
})

test('版本策略区分最新版、当前进程忽略、手动检查和强制更新', () => {
  const base = {
    currentVersionCode: 107,
    latestVersionCode: 108,
    force: false,
    source: 'foreground' as const,
  }
  assert.equal(shouldPresentAppUpdate(base), true)
  assert.equal(shouldPresentAppUpdate({ ...base, latestVersionCode: 107 }), false)
  assert.equal(shouldPresentAppUpdate({ ...base, dismissedVersionCode: 108 }), false)
  assert.equal(shouldPresentAppUpdate({ ...base, source: 'manual', dismissedVersionCode: 108 }), true)
  assert.equal(shouldPresentAppUpdate({ ...base, force: true, dismissedVersionCode: 108 }), true)
})
