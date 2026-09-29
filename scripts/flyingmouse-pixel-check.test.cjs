const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const { test } = require('node:test')
const { hashRgbOutput } = require('./flyingmouse-pixel-check.cjs')

const run = (code, bytes = 6, timeout) =>
  hashRgbOutput(process.execPath, ['-e', code], bytes, timeout)

test('RGB hashing includes the last pixel and detects changed content', async () => {
  const original = await run('process.stdout.write(Buffer.from([0,0,0,0,0,1]))')
  const changed = await run('process.stdout.write(Buffer.from([0,0,0,0,0,2]))')
  assert.equal(original.bytes, 6)
  assert.equal(original.sha256, createHash('sha256').update(Buffer.from([0,0,0,0,0,1])).digest('hex'))
  assert.notEqual(original.sha256, changed.sha256)
})

test('blank, incomplete, excess and failed decoder output cannot pass', async () => {
  await assert.rejects(run('process.stdout.write(Buffer.alloc(6))'), /blank or truncated/)
  await assert.rejects(run('process.stdout.write(Buffer.from([1,2,3]))'), /blank or truncated/)
  await assert.rejects(run('process.stdout.write(Buffer.alloc(9,1))'), /extra pixels/)
  await assert.rejects(run('process.stdout.write(Buffer.alloc(6,1)); process.exitCode=2'), /exited 2/)
  await assert.rejects(run('setInterval(()=>{},1000)', 6, 100), /timed out/)
})

test('large RGB streams are checked with a small Node heap', async () => {
  // 144 MiB RGB exceeds the historical full-buffer copies; respect pipe backpressure.
  const code = 'const b=Buffer.alloc(65536,7); let n=2304;' +
    'function send(){while(n-- > 0){if(!process.stdout.write(b)){' +
    'process.stdout.once("drain",send);return;}}}send();'
  const before = process.resourceUsage().maxRSS
  const actual = await hashRgbOutput(process.execPath, ['--max-old-space-size=32', '-e', code],
    144 * 1024 ** 2)
  assert.ok(process.resourceUsage().maxRSS - before < 64 * 1024,
    'checker must not retain a full 144 MiB RGB buffer')
  const hash = createHash('sha256')
  const block = Buffer.alloc(65536, 7)
  for (let index = 0; index < 2304; index++) hash.update(block)
  assert.equal(actual.sha256, hash.digest('hex'))
})
