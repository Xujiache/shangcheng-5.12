import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import './prepare-generated-icons.cjs'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const walk = (p) =>
  fs
    .readdirSync(p, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(p, e.name)) : [path.join(p, e.name)]))
const map = JSON.parse(read('scripts/generated-icon-map.json'))
const registry = read('entry/src/main/ets/core/theme/GeneratedIconRegistry.ets')
for (const [name, asset] of Object.entries(map)) {
  assert(
    registry.includes(`icons.set('${name}', $r('app.media.${asset}'))`),
    `Registry drift: ${name}`,
  )
  const png = fs.readFileSync(
    path.join(root, 'entry/src/main/resources/base/media', asset + '.png'),
  )
  assert.equal(png.subarray(1, 4).toString(), 'PNG', name)
  assert.equal(png.readUInt32BE(16), 256, name)
  assert.equal(png.readUInt32BE(20), 256, name)
  assert.equal(png[25], 6, `RGBA required: ${name}`)
}
const manifest = JSON.parse(read('scripts/generated-ui-icons.sources.json'))
for (const item of [...manifest.icons, manifest.launcher]) {
  const bytes = fs.readFileSync(path.join(root, item.asset))
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), item.sha256, item.name)
  assert(item.sourceSha256 && item.prompt && item.source, `Missing provenance: ${item.name}`)
}
const appFiles = walk(path.join(root, 'entry/src/main/ets')).filter((f) => f.endsWith('.ets'))
for (const scope of ['AppScope/resources', 'entry/src/main/resources']) {
  assert(
    !walk(path.join(root, scope)).some((p) => p.endsWith('.svg')),
    `Application SVG remains: ${scope}`,
  )
}
for (const file of appFiles) {
  const source = fs.readFileSync(file, 'utf8')
  if (!file.endsWith('MerchantIcon.ets'))
    assert(!/\bIBestIcon\s*\(/.test(source), `Unreviewed direct icon: ${file}`)
  assert(!/SymbolGlyph\s*\(|\.svg['"]|\bPath\s*\(/.test(source), `Non-bitmap icon path: ${file}`)
  for (const match of source.matchAll(/MerchantIcon\(\{\s*name:\s*['"]([^'"]+)['"]/g))
    assert(map[match[1]], `${file}: ${match[1]}`)
  for (const match of source.matchAll(
    /(?:leftIcon|rightIcon|prefixIcon|suffixIcon|icon)\s*:\s*['"]([a-z][a-z-]+)['"]/g,
  ))
    assert(map[match[1]], `${file}: ${match[1]}`)
}
const wrapper = read('entry/src/main/ets/core/theme/MerchantIcon.ets')
for (const match of wrapper
  .slice(wrapper.indexOf('export type'), wrapper.indexOf('@Component'))
  .matchAll(/'([^']+)'/g))
  assert(map[match[1]], `Unmapped union: ${match[1]}`)
const vendor = 'third_party/ibest-ui/library/src/main'
assert(
  !walk(path.join(root, vendor, 'resources')).some((p) => p.endsWith('.svg')),
  'Vendor SVG remains',
)
assert(
  !/Text\(|fontFamily\(|fillColor\(/.test(read(`${vendor}/ets/components/icon/index.ets`)),
  'Font fallback remains',
)
const known = new Set(
  [
    ...read(`${vendor}/ets/components/icon/config.ets`).matchAll(/["']([a-z][a-z0-9-]+)["']\s*:/g),
  ].map((x) => x[1]),
)
for (const file of walk(path.join(root, vendor, 'ets')).filter(
  (p) => p.endsWith('.ets') && !/config.ets|index.type.ets|theme-chalk/.test(p),
)) {
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!/name:|[iI]con/.test(line)) continue
    for (const match of line.matchAll(/["']([a-z][a-z0-9-]+)["']/g)) {
      if (known.has(match[1]))
        assert(map[match[1]], `Unmapped vendor default: ${file}: ${match[1]}`)
    }
  }
}
console.log(
  `Generated icons: ${manifest.icons.length} new PNGs, ${Object.keys(map).length} semantic mappings; all current app/library icon paths covered. System permission sheets, keyboard and progress indicators are OS controls, not replaced artwork.`,
)
