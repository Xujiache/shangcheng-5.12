import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const vendor = path.join(root, 'third_party/ibest-ui')
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, 'scripts/generated-vendor-resources.json')),
)
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex')
const canonical = (bytes) => Buffer.from(bytes.toString().replace(/\r\n/g, '\n'))
const allowed = new Set([
  'library/BuildProfile.ets',
  'library/src/main/ets/components/loading/circular.ets',
])
for (const item of manifest) {
  const tracked = 'library/' + item.target
  allowed.add(tracked)
  const original = canonical(execFileSync('git', ['show', 'HEAD:' + tracked], { cwd: vendor }))
  assert.equal(hash(original), item.originalSha256, `Upstream drift: ${tracked}`)
  let expected = fs.readFileSync(path.join(root, item.source))
  if (item.textReplacement) {
    const edit = JSON.parse(expected.toString())
    assert(original.toString().includes(edit.find), tracked)
    expected = Buffer.from(original.toString().replace(edit.find, edit.replace))
  }
  const target = 'library/' + (item.pngTarget || item.target)
  allowed.add(target)
  assert(
    fs.readFileSync(path.join(vendor, target)).equals(expected),
    `Unexpected adapter content: ${target}`,
  )
  if (item.pngTarget)
    assert(!fs.existsSync(path.join(vendor, tracked)), `Legacy SVG remains: ${tracked}`)
}
const status = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], {
  cwd: vendor,
  encoding: 'utf8',
})
for (const line of status.split('\n').filter(Boolean))
  assert(allowed.has(line.slice(3)), `Unexpected vendor change: ${line}`)
console.log(
  'Vendor generated artwork adaptation matches reviewed source, manifest and exact resource bytes.',
)
