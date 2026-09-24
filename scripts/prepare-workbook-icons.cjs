// Only background/alpha/size cleanup, as authorized by the user. No glyphs are drawn here.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const sharp = require('../packages/server/node_modules/sharp')
const docs = path.resolve('docs/记工系统/assets/generated-icons')
const output = path.resolve('packages/ledger-mp/miniprogram/assets/workbook-icons')
// The largest current UI use is 32 px; 128 px keeps 3x display detail without bloating the main package.
const size = 128,
  contentSize = 116
async function prepare(item) {
  fs.mkdirSync(output, { recursive: true })
  const archived = path.join(docs, item.name + '-source.png')
  if (fs.existsSync(item.source)) fs.copyFileSync(item.source, archived)
  else if (!fs.existsSync(archived)) throw Error('Missing original generation: ' + item.name)
  const { data, info } = await sharp(archived)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info,
    n = w * h
  const seen = new Uint8Array(n),
    queue = new Uint32Array(n)
  let head = 0,
    tail = 0
  const background = (i) => {
    const p = i * 4,
      min = Math.min(data[p], data[p + 1], data[p + 2]),
      max = Math.max(data[p], data[p + 1], data[p + 2])
    return data[p + 3] === 0 || (max - min <= 24 && (item.name === 'home' || min >= 228))
  }
  const add = (i) => {
    if (!seen[i] && background(i)) {
      seen[i] = 1
      queue[tail++] = i
    }
  }
  for (let x = 0; x < w; x++) {
    add(x)
    add((h - 1) * w + x)
  }
  for (let y = 0; y < h; y++) {
    add(y * w)
    add(y * w + w - 1)
  }
  // The magnifying glass's empty lens is background as well.
  if (item.name === 'search') add(Math.round(h * 0.43) * w + Math.round(w * 0.44))
  while (head < tail) {
    const i = queue[head++],
      x = i % w,
      y = Math.floor(i / w)
    if (x) add(i - 1)
    if (x < w - 1) add(i + 1)
    if (y) add(i - w)
    if (y < h - 1) add(i + w)
  }
  let minX = w,
    minY = h,
    maxX = 0,
    maxY = 0
  for (let i = 0; i < n; i++) {
    if (seen[i]) data[i * 4 + 3] = 0
    if (data[i * 4 + 3]) {
      const x = i % w,
        y = Math.floor(i / w)
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
  }
  if (maxX <= minX || maxY <= minY) throw Error('Empty icon: ' + item.name)
  const crop = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
  const icon = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .extract(crop)
    .resize(contentSize, contentSize, { fit: 'inside' })
    .png()
    .toBuffer()
  const m = await sharp(icon).metadata()
  const final = await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      {
        input: icon,
        left: Math.floor((size - m.width) / 2),
        top: Math.floor((size - m.height) / 2),
      },
    ])
    .png({ palette: true, colours: 256, effort: 10 })
    .toBuffer()
  fs.writeFileSync(path.join(output, item.name + '.png'), final)
  return {
    name: item.name,
    source: path.relative(process.cwd(), archived),
    output: path.relative(process.cwd(), path.join(output, item.name + '.png')),
    sourceSha256: crypto.createHash('sha256').update(fs.readFileSync(archived)).digest('hex'),
    sha256: crypto.createHash('sha256').update(final).digest('hex'),
    width: size,
    height: size,
    bytes: final.length,
    removedBackgroundPixels: tail,
    crop,
  }
}
async function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(docs, 'manifest.json'), 'utf8'))
  const results = []
  for (const item of manifest) results.push(await prepare(item))
  fs.writeFileSync(path.join(docs, 'processed.json'), JSON.stringify(results, null, 2))
  // Small-size visual QA on real interface backgrounds; original and derived files stay separate.
  const columns = 6,
    cellW = 144,
    cellH = 144,
    rows = Math.ceil(results.length / columns),
    composite = []
  for (let i = 0; i < results.length; i++) {
    const x = (i % columns) * cellW,
      y = Math.floor(i / columns) * cellH
    for (const [size, dx, dy] of [
      [64, 40, 8],
      [26, 20, 91],
      [18, 63, 95],
      [14, 101, 97],
    ])
      composite.push({
        input: await sharp(results[i].output).resize(size, size).toBuffer(),
        left: x + dx,
        top: y + dy,
      })
    const label = Buffer.from(
      `<svg width="144" height="22"><text x="72" y="16" font-family="Arial" font-size="12" fill="#345746" text-anchor="middle">${results[i].name}</text></svg>`,
    )
    composite.push({ input: label, left: x, top: y + 119 })
  }
  for (const bg of ['#f1f5f2', '#0e7c66'])
    await sharp({
      create: { width: columns * cellW, height: rows * cellH, channels: 4, background: bg },
    })
      .composite(composite)
      .png()
      .toFile(path.join(docs, 'review-' + (bg === '#f1f5f2' ? 'light' : 'green') + '.png'))
  console.log(
    JSON.stringify({
      icons: results.length,
      bytes: results.reduce((n, r) => n + r.bytes, 0),
      output,
    }),
  )
}
main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
