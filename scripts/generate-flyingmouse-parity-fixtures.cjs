#!/usr/bin/env node
// Generate synthetic, shareable PDF fixtures. Never use customer documents.
const { createHash } = require('node:crypto')
const { execFileSync } = require('node:child_process')
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs')
const { join, resolve } = require('node:path')
const { PDFDocument, rgb } = require('../vendor/flyingmouse-format/upstream-a7b9b15/node_modules/pdf-lib')
const fontkit = require('../vendor/flyingmouse-format/upstream-a7b9b15/node_modules/@pdf-lib/fontkit')
const sharp = require('../vendor/flyingmouse-format/upstream-a7b9b15/node_modules/sharp')

const out = resolve(process.argv[2] || 'packages/server/test/fixtures/platform-parity')
const fontPath = process.env.PARITY_CJK_FONT ||
  '/Users/mac/Library/Caches/ledger-flyingmouse-engines/ofd-fonts-regular/NotoSansCJKsc-Regular.ttf'
const pdftoppm = process.env.FLYINGMOUSE_PDFTOPPM_PATH || 'pdftoppm'
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const fixedDate = new Date('2026-09-29T00:00:00Z')

async function document() {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  pdf.setTitle('Synthetic conversion parity fixture')
  pdf.setAuthor('FlyingMouse parity test')
  pdf.setCreationDate(fixedDate)
  pdf.setModificationDate(fixedDate)
  return pdf
}

async function main() {
  mkdirSync(out, { recursive: true })
  const fontBytes = readFileSync(fontPath)
  const logoSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#eff6ff"/><rect x="20" y="19" width="70" height="50" fill="#2563eb"/><circle cx="117" cy="44" r="25" fill="#f97316"/></svg>')
  const logo = await sharp(logoSvg).png().toBuffer()
  const native = await document()
  const font = await native.embedFont(fontBytes, { subset: true })
  const page = native.addPage([595, 842])
  const ink = rgb(0.12, 0.17, 0.25)
  const draw = (text, x, y, size = 15) => page.drawText(text, { x, y, size, font, color: ink })
  draw('量窗助手 订单验收', 48, 770, 23)
  draw('左栏：客户资料与门窗规格', 48, 720)
  draw('客户：测试样本  编号：A-102', 48, 686)
  draw('右栏：经营分析与成本记录', 314, 720)
  draw('利润：82.25  数量：37', 314, 686)
  draw('项目', 70, 586)
  draw('金额', 327, 586)
  draw('门窗订单', 70, 536)
  draw('315.50', 327, 536)
  draw('安装费用', 70, 486)
  draw('48.20', 327, 486)
  for (const y of [615, 565, 515, 465]) page.drawLine({ start: { x: 55, y }, end: { x: 520, y }, thickness: 1 })
  for (const x of [55, 290, 520]) page.drawLine({ start: { x, y: 465 }, end: { x, y: 615 }, thickness: 1 })
  page.drawImage(await native.embedPng(logo), { x: 70, y: 260, width: 160, height: 90 })
  draw('图例：蓝色矩形与橙色圆形', 250, 303, 13)
  const nativeBytes = Buffer.from(await native.save({ useObjectStreams: false }))
  const nativePath = join(out, 'native-table.pdf')
  writeFileSync(nativePath, nativeBytes)

  const rasterBase = join(out, 'scan-source')
  execFileSync(pdftoppm, ['-f', '1', '-l', '1', '-r', '180', '-singlefile', '-png', nativePath, rasterBase])
  const scanImage = readFileSync(`${rasterBase}.png`)
  const scan = await document()
  scan.addPage([595, 842]).drawImage(await scan.embedPng(scanImage),
    { x: 0, y: 0, width: 595, height: 842 })
  const scanBytes = Buffer.from(await scan.save({ useObjectStreams: false }))
  writeFileSync(join(out, 'scan-table.pdf'), scanBytes)

  const mixed = await document()
  const [nativePage] = await mixed.copyPages(native, [0])
  mixed.addPage(nativePage)
  mixed.addPage([595, 842]).drawImage(await mixed.embedPng(scanImage),
    { x: 0, y: 0, width: 595, height: 842 })
  const mixedBytes = Buffer.from(await mixed.save({ useObjectStreams: false }))
  writeFileSync(join(out, 'mixed-table.pdf'), mixedBytes)

  const cases = [
    { kind: 'native', path: 'native-table.pdf', expect: ['量窗助手', '订单', '315.50'], expectAssets: { docx: 1 } },
    { kind: 'scan', path: 'scan-table.pdf', expect: ['量窗助手', '订单', '315.50'], expectAssets: { docx: 1 } },
    { kind: 'mixed', path: 'mixed-table.pdf', expect: ['量窗助手', '订单', '315.50'], expectAssets: { docx: 1 } },
  ]
  writeFileSync(join(out, 'cases.json'), JSON.stringify(cases, null, 2) + '\n')
  const hashes = Object.fromEntries([[nativePath, nativeBytes], [join(out, 'scan-table.pdf'), scanBytes],
    [join(out, 'mixed-table.pdf'), mixedBytes]].map(([path, bytes]) => [path.split('/').pop(), sha(bytes)]))
  writeFileSync(join(out, 'SHA256.json'), JSON.stringify({ fontSha256: sha(fontBytes),
    scanPngSha256: sha(scanImage), files: hashes }, null, 2) + '\n')
  console.log(JSON.stringify(hashes))
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
