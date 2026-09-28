#!/usr/bin/env node
// Synthetic office and Photoshop fixtures. No customer content.
const { createHash } = require('node:crypto')
const { mkdirSync, writeFileSync } = require('node:fs')
const { join, resolve } = require('node:path')
const { Document, Packer, Paragraph, Table, TableRow, TableCell, ImageRun, WidthType } =
  require('../vendor/flyingmouse-format/upstream-a7b9b15/node_modules/docx')
const JSZip = require('../vendor/flyingmouse-format/upstream-a7b9b15/node_modules/jszip')
const sharp = require('../vendor/flyingmouse-format/upstream-a7b9b15/node_modules/sharp')

const out = resolve(process.argv[2] || 'packages/server/test/fixtures/platform-parity')
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')

async function main() {
  mkdirSync(out, { recursive: true })
  const image = await sharp(Buffer.from('<svg width="160" height="90" xmlns="http://www.w3.org/2000/svg"><rect width="160" height="90" fill="#eff6ff"/><rect x="20" y="19" width="70" height="50" fill="#2563eb"/><circle cx="117" cy="44" r="25" fill="#f97316"/></svg>')).png().toBuffer()
  const cell = (value) => new TableCell({ width: { size: 4200, type: WidthType.DXA },
    children: [new Paragraph(value)] })
  const doc = new Document({ sections: [{ children: [
    new Paragraph('量窗助手中文验收：门窗订单和客户资料'),
    new Paragraph('第一段记录铝合金门窗规格、玻璃与五金配件；订单编号 A-102，金额 315.50 元。'),
    new Paragraph('第二段记录安装工序、经营分析和成本记录；订单数量 37，平均利润 82.25 元。'),
    new Table({ width: { size: 8400, type: WidthType.DXA }, columnWidths: [4200, 4200], rows: [
      new TableRow({ children: [cell('项目'), cell('金额')] }),
      new TableRow({ children: [cell('门窗订单'), cell('315.50')] }),
      new TableRow({ children: [cell('安装费用'), cell('48.20')] }),
    ] }),
    new Paragraph({ children: [new ImageRun({ data: image, transformation: { width: 160, height: 90 }, type: 'png' })] }),
  ] }] })
  const archive = await JSZip.loadAsync(await Packer.toBuffer(doc))
  const core = await archive.file('docProps/core.xml').async('string')
  archive.file('docProps/core.xml', core.replace(/<dcterms:(created|modified)[^>]*>[^<]*<\/dcterms:\1>/g,
    (_, tag) => `<dcterms:${tag} xsi:type="dcterms:W3CDTF">2026-09-29T00:00:00.000Z</dcterms:${tag}>`))
  for (const entry of Object.values(archive.files)) entry.date = new Date('2026-09-29T00:00:00Z')
  const docx = await archive.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  writeFileSync(join(out, 'office-chinese.docx'), docx)

  const width = 96; const height = 64
  const pixels = await sharp(image).resize(width, height).removeAlpha().raw().toBuffer()
  const psd = Buffer.alloc(26 + 12 + 2 + width * height * 3)
  psd.write('8BPS', 0)
  psd.writeUInt16BE(1, 4)
  psd.writeUInt16BE(3, 12)
  psd.writeUInt32BE(height, 14)
  psd.writeUInt32BE(width, 18)
  psd.writeUInt16BE(8, 22)
  psd.writeUInt16BE(3, 24)
  for (let pixel = 0; pixel < width * height; pixel++)
    for (let channel = 0; channel < 3; channel++)
      psd[40 + channel * width * height + pixel] = pixels[pixel * 3 + channel]
  writeFileSync(join(out, 'graphic.psd'), psd)

  const textWidth = 1200; const textHeight = 480
  const textImage = await sharp(Buffer.from(`<svg width="${textWidth}" height="${textHeight}" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="480" fill="#f5f9ff"/>
    <rect x="40" y="35" width="1120" height="410" rx="28" fill="#ffffff" stroke="#2563eb" stroke-width="8"/>
    <rect x="75" y="70" width="30" height="300" fill="#f97316"/>
    <text x="145" y="205" fill="#14213d" font-family="Arial" font-size="83" font-weight="bold">WINDOW ORDER</text>
    <text x="145" y="330" fill="#173f35" font-family="Arial" font-size="78" font-weight="bold">TOTAL 315.50</text>
  </svg>`)).removeAlpha().raw().toBuffer()
  const textPsd = Buffer.alloc(40 + textWidth * textHeight * 3)
  textPsd.write('8BPS', 0)
  textPsd.writeUInt16BE(1, 4)
  textPsd.writeUInt16BE(3, 12)
  textPsd.writeUInt32BE(textHeight, 14)
  textPsd.writeUInt32BE(textWidth, 18)
  textPsd.writeUInt16BE(8, 22)
  textPsd.writeUInt16BE(3, 24)
  for (let pixel = 0; pixel < textWidth * textHeight; pixel++)
    for (let channel = 0; channel < 3; channel++)
      textPsd[40 + channel * textWidth * textHeight + pixel] = textImage[pixel * 3 + channel]
  writeFileSync(join(out, 'graphic-text.psd'), textPsd)

  writeFileSync(join(out, 'office-SHA256.json'), JSON.stringify({
    generator: 'scripts/generate-parity-office-fixtures.cjs',
    files: { 'office-chinese.docx': sha(docx), 'graphic.psd': sha(psd), 'graphic-text.psd': sha(textPsd) },
    graphicTextPsd: {
      source: 'SVG rasterized by sharp to 1200x480 RGB pixels',
      encoding: '8BPS version 1, 8-bit planar RGB, uncompressed',
      expectedOcr: ['WINDOW ORDER', 'TOTAL 315.50'],
    },
  }, null, 2) + '\n')
  console.log(JSON.stringify({ docx: sha(docx), psd: sha(psd), textPsd: sha(textPsd) }))
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
