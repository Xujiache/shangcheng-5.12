import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { detectVideoPlatform, looksLikeVideoLink } from '../miniprogram/utils/video-parser-platform'

assert.equal(detectVideoPlatform('https://v.douyin.com/abc/').id, 'douyin')
assert.equal(detectVideoPlatform('https://v.kuaishou.com/abc/').id, 'kuaishou')
assert.equal(detectVideoPlatform('https://www.bilibili.com/video/BV1xx411c7mD').id, 'bilibili')
assert.equal(detectVideoPlatform('https://www.tiktok.com/@demo/video/123').id, 'tiktok')
assert.equal(detectVideoPlatform('https://example.com/video').id, 'other')
assert.equal(looksLikeVideoLink('复制这段内容 https://v.douyin.com/abc/'), true)
assert.equal(looksLikeVideoLink('抖音分享口令'), false)
const pageCandidates = [
  path.resolve(process.cwd(), 'packages/ledger-mp/miniprogram/subpackages/more-tools/video-parser/index.ts'),
  path.resolve(process.cwd(), 'miniprogram/subpackages/more-tools/video-parser/index.ts'),
]
const pagePath = pageCandidates.find(candidate => existsSync(candidate))
assert.ok(pagePath, 'video parser page must exist')
const page = readFileSync(pagePath, 'utf8')
assert.equal(page.includes('wx.request'), false, 'page must use the shared request wrapper')
assert.equal(page.includes('http://'), false, 'page must not call insecure or third-party URLs')
assert.match(page, /from ['"]\.\.\/\.\.\/\.\.\/api\/index['"]/, 'mini-program imports must name api/index explicitly')
console.log('video parser logic verified')
