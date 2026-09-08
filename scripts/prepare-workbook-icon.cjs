// User approved code-only background/alpha/size cleanup; the generated object is unchanged.
const fs = require('node:fs')
const path = require('node:path')
const sharp = require('../packages/server/node_modules/sharp')
async function main() {
  const input = process.argv[2]
  if (!input) throw Error('Usage: node scripts/prepare-workbook-icon.cjs <generated.png>')
  const { data, info } = await sharp(input)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const n = w * h
  const seen = new Uint8Array(n)
  const q = new Uint32Array(n)
  let tail = 0,
    head = 0
  const gray = (i) => {
    const p = i * 3
    return (
      Math.max(data[p], data[p + 1], data[p + 2]) - Math.min(data[p], data[p + 1], data[p + 2]) <=
      18
    )
  }
  const visit = (i) => {
    if (!seen[i] && gray(i)) {
      seen[i] = 1
      q[tail++] = i
    }
  }
  for (let x = 0; x < w; x++) {
    visit(x)
    visit((h - 1) * w + x)
  }
  for (let y = 0; y < h; y++) {
    visit(y * w)
    visit(y * w + w - 1)
  }
  while (head < tail) {
    const i = q[head++],
      x = i % w,
      y = Math.floor(i / w)
    if (x) visit(i - 1)
    if (x < w - 1) visit(i + 1)
    if (y) visit(i - w)
    if (y < h - 1) visit(i + w)
  }
  const rgba = Buffer.alloc(n * 4)
  for (let i = 0; i < n; i++) {
    data.copy(rgba, i * 4, i * 3, i * 3 + 3)
    rgba[i * 4 + 3] = seen[i] ? 0 : 255
  }
  const out = 'packages/ledger-mp/miniprogram/assets/tools/tool-work-log.png'
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .resize(192, 192)
    .png()
    .toFile(out)
  fs.mkdirSync('docs/记工系统/assets', { recursive: true })
  fs.copyFileSync(input, 'docs/记工系统/assets/tool-work-log-source.png')
  const names = ['tool-triangle', 'tool-arc', 'tool-cut', 'tool-work-log']
  const composite = []
  for (let i = 0; i < names.length; i++) {
    const icon = await sharp('packages/ledger-mp/miniprogram/assets/tools/' + names[i] + '.png')
      .resize(96, 96)
      .toBuffer()
    composite.push({ input: icon, left: 24 + i * 144, top: 20 })
    composite.push({ input: icon, left: 24 + i * 144, top: 160 })
  }
  await sharp({ create: { width: 576, height: 280, channels: 4, background: '#f1f5f2' } })
    .composite(composite)
    .png()
    .toFile('docs/记工系统/assets/tool-icons-review.png')
  console.log(await sharp(out).metadata())
  console.log('transparent pixels removed:', tail)
}
main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
