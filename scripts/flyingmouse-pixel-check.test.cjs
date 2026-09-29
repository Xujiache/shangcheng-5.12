const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
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
  // Isolate the checker and its GC budget from the test runner's prior allocations.
  const checker = 'const {hashRgbOutput}=require(process.argv[1]);' +
    'const before=process.resourceUsage().maxRSS;' +
    `hashRgbOutput(process.execPath,['-e',${JSON.stringify(code)}],144*1024**2)` +
    '.then(result=>console.log(JSON.stringify({...result,' +
    'rssGrowthKiB:process.resourceUsage().maxRSS-before})))' +
    '.catch(error=>{console.error(error);process.exitCode=1});'
  const actual = JSON.parse(execFileSync(process.execPath,
    ['--max-old-space-size=32', '-e', checker, require.resolve('./flyingmouse-pixel-check.cjs')],
    { encoding: 'utf8', timeout: 30000 }))
  assert.ok(actual.rssGrowthKiB < 96 * 1024,
    'checker must not retain a full 144 MiB RGB buffer')
  const hash = createHash('sha256')
  const block = Buffer.alloc(65536, 7)
  for (let index = 0; index < 2304; index++) hash.update(block)
  assert.equal(actual.sha256, hash.digest('hex'))
})
