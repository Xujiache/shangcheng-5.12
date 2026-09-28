#!/usr/bin/env node
// Direct-engine evidence for the exact fixture bytes on Windows or Linux.
const { createHash } = require('node:crypto')
const { execFileSync, spawnSync } = require('node:child_process')
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs')
const { basename, dirname, extname, join, resolve } = require('node:path')
const { pathToFileURL } = require('node:url')

const args = process.argv.slice(2)
const arg = (flag) => { const index = args.indexOf(flag); return index < 0 ? undefined : args[index + 1] }
const manifestPath = arg('--cases')
const out = arg('--out')
if (!manifestPath || !out) throw new Error('Usage: node scripts/flyingmouse-platform-reference.cjs --cases cases.json --out evidence-dir')
const source = resolve(process.env.FLYINGMOUSE_TEST_SOURCE_DIR || 'vendor/flyingmouse-format/upstream-a7b9b15')
const cli = join(source, 'cli.js')
const soffice = process.env.FLYINGMOUSE_LIBREOFFICE_PATH
const pdftoppm = process.env.FLYINGMOUSE_PDFTOPPM_PATH
const pdftotext = process.env.FLYINGMOUSE_PDFTOTEXT_PATH ||
  (pdftoppm ? join(dirname(pdftoppm), process.platform === 'win32' ? 'pdftotext.exe' : 'pdftotext') : undefined)
if (!existsSync(cli) || !soffice || !pdftoppm || !pdftotext)
  throw new Error('Original CLI, LibreOffice, pdftoppm and pdftotext are required')
const { PDFDocument } = require(join(source, 'node_modules/pdf-lib'))
const sharp = require(join(source, 'node_modules/sharp'))
const ExcelJS = require(join(source, 'node_modules/exceljs'))
const unzipper = require(join(source, 'node_modules/unzipper'))
const cases = JSON.parse(readFileSync(manifestPath, 'utf8'))
if (!Array.isArray(cases) || !cases.length) throw new Error('Empty cases')
const hashesPath = join(dirname(manifestPath), 'SHA256.json')
const hashes = existsSync(hashesPath) ? JSON.parse(readFileSync(hashesPath, 'utf8')).files : {}
mkdirSync(out, { recursive: true })
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const text = (value) => String(value || '').replace(/\s+/g, '')
const child = (command, argv, options = {}) => execFileSync(command, argv, {
  encoding: options.encoding, timeout: options.timeout || 12 * 60 * 1000,
  maxBuffer: 32 * 1024 * 1024, env: process.env,
})
const version = (command, flag = '--version') => {
  const result = spawnSync(command, [flag], { encoding: 'utf8', timeout: 10000 })
  return String(result.stdout || result.stderr || result.error?.message || '').trim().split('\n')[0]
}
writeFileSync(join(out, 'environment.json'), JSON.stringify({
  platform: process.platform, arch: process.arch, node: process.version,
  sourceCliSha256: sha(readFileSync(cli)), sourcePackageVersion: require(join(source, 'package.json')).version,
  libreOffice: version(soffice), poppler: version(pdftoppm, '-v'),
  ffmpeg: process.env.FLYINGMOUSE_FFMPEG_PATH ? version(process.env.FLYINGMOUSE_FFMPEG_PATH) : null,
  sharp: sharp.versions,
}, null, 2) + '\n')

async function render(pdfPath, key) {
  const pdf = await PDFDocument.load(readFileSync(pdfPath))
  const pages = []
  for (let page = 1; page <= pdf.getPageCount(); page++) {
    const prefix = join(out, `${key}-page-${page}`)
    child(pdftoppm, ['-f', String(page), '-l', String(page), '-r', '120',
      '-singlefile', '-png', pdfPath, prefix])
    const png = readFileSync(`${prefix}.png`)
    const image = sharp(png)
    const metadata = await image.metadata()
    const pixels = await image.removeAlpha().raw().toBuffer()
    pages.push({ page, width: metadata.width, height: metadata.height,
      pngSha256: sha(png), pixelSha256: sha(pixels) })
  }
  return { pageCount: pages.length, pages }
}

async function inspect(file, target, key) {
  const bytes = readFileSync(file)
  const evidence = { outputSha256: sha(bytes), outputBytes: bytes.length }
  if (target === 'docx') {
    const archive = await unzipper.Open.file(file)
    const names = archive.files.map((entry) => entry.path)
    const document = archive.files.find((entry) => entry.path === 'word/document.xml')
    if (!document) throw new Error('DOCX document.xml missing')
    const xml = (await document.buffer()).toString('utf8')
    evidence.content = text(xml.replace(/<[^>]+>/g, ''))
    evidence.paragraphs = (xml.match(/<w:p(?:\s|>)/g) || []).length
    evidence.tables = (xml.match(/<w:tbl(?:\s|>)/g) || []).length
    evidence.assets = names.filter((name) => name.startsWith('word/media/')).length
  } else if (target === 'xlsx') {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(file)
    evidence.sheets = workbook.worksheets.map((sheet) => {
      const cells = []
      sheet.eachRow((row, rowNumber) => row.eachCell((cell, columnNumber) => {
        cells.push({ row: rowNumber, column: columnNumber,
          value: String(cell.value ?? ''), formula: cell.formula || null })
      }))
      return { name: sheet.name, cells }
    })
    evidence.content = text(evidence.sheets.flatMap((sheet) => sheet.cells.map((cell) => cell.value)).join(' '))
    evidence.tables = evidence.sheets.reduce((count, sheet) => count + sheet.cells.length, 0)
  } else if (target === 'pdf') {
    evidence.content = text(child(pdftotext, [file, '-'], { encoding: 'utf8' }))
  } else if (['mp4', 'mov', 'mkv', 'webm'].includes(target)) {
    const ffprobe = process.env.FLYINGMOUSE_FFPROBE_PATH || 'ffprobe'
    evidence.codec = JSON.parse(child(ffprobe, ['-v', 'error', '-show_streams',
      '-show_format', '-of', 'json', file], { encoding: 'utf8' }))
  }
  if (evidence.content != null) evidence.contentSha256 = sha(Buffer.from(evidence.content))
  if (['docx', 'xlsx'].includes(target)) {
    if (!soffice) return evidence
    const renderDir = join(out, `${key}-render`)
    mkdirSync(renderDir, { recursive: true })
    child(soffice, [`-env:UserInstallation=${pathToFileURL(resolve(renderDir, 'profile')).href}`,
      '--headless', '--convert-to', 'pdf', '--outdir', renderDir, file])
    const rendered = join(renderDir, `${basename(file, extname(file))}.pdf`)
    if (!existsSync(rendered)) throw new Error('LibreOffice did not render output')
    evidence.render = await render(rendered, key)
  } else if (target === 'pdf') evidence.render = await render(file, key)
  return evidence
}

async function main() {
  const report = []
  for (const item of cases) {
    const input = resolve(dirname(manifestPath), item.path)
    const sourceBytes = readFileSync(input)
    if (hashes[item.path] && sha(sourceBytes) !== hashes[item.path])
      throw new Error(`Fixture SHA-256 mismatch: ${item.path}`)
    const pdfimages = join(dirname(pdftoppm), process.platform === 'win32' ? 'pdfimages.exe' : 'pdfimages')
    const imageList = child(pdfimages, ['-list', input], { encoding: 'utf8' }).trim().split('\n')
    const sourceImages = Math.max(0, imageList.length - 2)
    for (const target of item.targets || ['docx', 'xlsx']) {
      const key = `${item.kind}-${target}`.replace(/[^a-z0-9-]/gi, '_')
      const file = join(out, `${key}.${target}`)
      const row = { label: `${item.kind}:${target}:${basename(input)}`,
        inputSha256: sha(sourceBytes), inputBytes: sourceBytes.length,
        source: basename(input), sourceImages, target, status: 'fail' }
      try {
        if (sourceImages < 1) throw new Error('Fixture lacks a genuine embedded bitmap')
        const response = child(process.execPath, [cli, 'convert', input, '--to', target,
          '--output', file, '--json'], { encoding: 'utf8' })
        const cliResult = JSON.parse(response.trim())
        row.warnings = cliResult.outputs?.flatMap((output) => output.warnings || []) || []
        if (row.warnings.some((warning) => warning.code === 'PDF_DOCX_LAYOUT_FALLBACK'))
          throw new Error('PDF_DOCX_LAYOUT_FALLBACK: original engine degraded layout')
        Object.assign(row, await inspect(file, target, key))
        if (target === 'docx' && row.assets < (item.expectAssets?.docx || 0))
          throw new Error(`Embedded graphic missing: expected ${item.expectAssets.docx}, got ${row.assets}`)
        const missing = (item.expect || []).filter((phrase) => !row.content?.includes(text(phrase)))
        if (missing.length) throw new Error(`Expected content missing: ${missing.join(', ')}`)
        row.status = 'pass'
      } catch (error) { row.error = String(error.message || error).slice(0, 1000) }
      report.push(row)
      writeFileSync(join(out, 'reference.json'), JSON.stringify(report, null, 2) + '\n')
      console.log(`${row.status.toUpperCase()} ${row.label}${row.error ? `: ${row.error}` : ''}`)
    }
  }
  if (report.some((row) => row.status !== 'pass')) process.exitCode = 1
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
