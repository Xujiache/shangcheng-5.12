#!/usr/bin/env node
const { createHash, randomUUID } = require('node:crypto')
const { execFileSync, spawn } = require('node:child_process')
const { appendFile, copyFile, mkdir, open, readFile, writeFile, mkdtemp, rm, stat } = require('node:fs/promises')
const { homedir, tmpdir } = require('node:os')
const { basename, dirname, join } = require('node:path')
const { pathToFileURL } = require('node:url')
const { PrismaClient } = require('@prisma/client')
const { JwtService } = require('@nestjs/jwt')
const sharp = require('sharp')
const engineSource = process.env.FLYINGMOUSE_TEST_SOURCE_DIR ||
  join(__dirname, '../../../vendor/flyingmouse-format/upstream-a7b9b15')
const { PDFDocument, StandardFonts } = require(join(engineSource, 'node_modules/pdf-lib'))
const { ZipFile } = require(join(engineSource, 'node_modules/yazl'))

const base = new URL(process.env.CONVERSION_TEST_API || 'http://127.0.0.1:3001')
const database = new URL(process.env.DATABASE_URL || 'postgres://missing:missing@invalid/db')
if (process.env.NODE_ENV === 'production' || !['127.0.0.1', 'localhost'].includes(base.hostname)
  || !['127.0.0.1', 'localhost'].includes(database.hostname)) {
  throw new Error('This smoke test may run only against a local development API and database')
}

const prisma = new PrismaClient()
let userId
let cleanupJob
const outstanding = new Set()

async function saveOcrInspection(inspection, backendPath, directPath) {
  if (!process.env.CONVERSION_PAIR_EVIDENCE) return
  const directory = process.env.CONVERSION_PAIR_EVIDENCE.replace(/\.jsonl$/, '') + '-ocr'
  await mkdir(directory, { recursive: true })
  for (const [label, file] of [['backend', backendPath], ['direct', directPath]]) {
    const bytes = await readFile(file)
    const name = `${inspection.input}-${label}.${inspection.output}`
    await writeFile(join(directory, name), bytes, { flag: 'wx' })
    inspection[label] = { file: name, bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex') }
  }
  await writeFile(join(directory, `${inspection.input}-${inspection.output}.json`),
    JSON.stringify(inspection, null, 2) + '\n', { flag: 'wx' })
}

function rtfText(file) {
  const work = require('node:fs').mkdtempSync(join(tmpdir(), 'ledger-rtf-text-'))
  try {
    execFileSync(originalCliEnv().FLYINGMOUSE_LIBREOFFICE_PATH,
      [`-env:UserInstallation=${pathToFileURL(join(work, 'profile')).href}`,
        '--headless', '--convert-to', 'txt:Text', '--outdir', work, file])
    return require('node:fs').readFileSync(join(work, `${basename(file, '.rtf')}.txt`), 'utf8')
  } finally { require('node:fs').rmSync(work, { recursive: true, force: true }) }
}

function originalCliEnv() {
  const source = engineSource
  const engines = process.env.CONVERSION_ENGINE_ROOT ||
    join(homedir(), 'Library/Caches/ledger-flyingmouse-engines/darwin-arm64')
  return {
    ...process.env,
    FLYINGMOUSE_FFMPEG_PATH: process.env.FLYINGMOUSE_FFMPEG_PATH || join(engines, 'runtime/bin/ffmpeg'),
    FLYINGMOUSE_DCRAW_PATH: process.env.FLYINGMOUSE_DCRAW_PATH || process.env.CONVERSION_DCRAW_PATH ||
      join(homedir(), 'Library/Caches/LibRaw-0.21.5/bin/dcraw_emu'),
    FLYINGMOUSE_LIBREOFFICE_PATH: process.env.FLYINGMOUSE_LIBREOFFICE_PATH || join(engines, 'libreoffice/LibreOffice.app/Contents/MacOS/soffice'),
    FLYINGMOUSE_PDFTOPPM_PATH: process.env.FLYINGMOUSE_PDFTOPPM_PATH || join(engines, 'runtime/bin/pdftoppm'),
    FLYINGMOUSE_TESSDATA_PATH: process.env.FLYINGMOUSE_TESSDATA_PATH || join(engines, 'tessdata'),
    FLYINGMOUSE_PANDOC_PATH: process.env.FLYINGMOUSE_PANDOC_PATH || join(source, 'bin/pandoc/pandoc'),
    FLYINGMOUSE_OFD_FONT_DIR: process.env.FLYINGMOUSE_OFD_FONT_DIR ||
      join(homedir(), 'Library/Caches/ledger-flyingmouse-engines/ofd-fonts-regular'),
    FLYINGMOUSE_QPDF_PATH: process.env.FLYINGMOUSE_QPDF_PATH || join(homedir(), 'Library/Caches/ledger-qpdf-osx-arm64/bin/qpdf'),
    ...(process.platform === 'darwin' ? { DYLD_LIBRARY_PATH: join(engines, 'runtime/lib') +
      (process.env.DYLD_LIBRARY_PATH ? `:${process.env.DYLD_LIBRARY_PATH}` : '') } : {}),
  }
}

async function pdfPage(label) {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  pdf.addPage([300, 300]).drawText(label, { x: 40, y: 150, size: 18, font })
  return Buffer.from(await pdf.save())
}

async function writeZip(file, entries) {
  const archive = new ZipFile()
  for (const [name, bytes] of entries) archive.addBuffer(bytes, name)
  archive.end()
  const chunks = []
  for await (const chunk of archive.outputStream) chunks.push(chunk)
  await writeFile(file, Buffer.concat(chunks))
}

async function verifyBaseline(convert) {
  const section = process.env.CONVERSION_BASELINE_SECTION
  if (!section || section === 'baseline') {
  const recordMerge = async (operationId, status, inputs, output, directOutput, evidence) => {
    if (!process.env.CONVERSION_OPERATION_EVIDENCE) return
    await appendFile(process.env.CONVERSION_OPERATION_EVIDENCE, JSON.stringify({ operationId, status,
      inputs: inputs.map(([name, bytes]) => ({ name, sha256: createHash('sha256').update(bytes).digest('hex'),
        bytes: bytes.length })),
      output: output && { sha256: createHash('sha256').update(output).digest('hex'), bytes: output.length },
      directOutput: directOutput && { sha256: createHash('sha256').update(directOutput).digest('hex'),
        bytes: directOutput.length },
      evidence, at: new Date().toISOString() }) + '\n')
  }
  const renderedPages = async (file, work, name, count) => {
    const pages = []
    for (let page = 1; page <= count; page++) {
      const output = join(work, `${name}-${page}`)
      execFileSync(originalCliEnv().FLYINGMOUSE_PDFTOPPM_PATH,
        ['-f', String(page), '-l', String(page), '-r', '72', '-singlefile', '-png', file, output])
      const bitmap = sharp(`${output}.png`)
      const { data, info } = await bitmap.removeAlpha().raw().toBuffer({ resolveWithObject: true })
      pages.push({ width: info.width, height: info.height, pixels: data })
    }
    return pages
  }
  const markdown = await convert('convert:md', [['sample.txt', Buffer.from('你好，原版转换验收。\n')]])
  if (!markdown.bytes.toString('utf8').includes('你好，原版转换验收。')) throw new Error('Chinese text was lost')
  console.log('PASS txt:md, authenticated upload/download and Chinese content')

  const first = await pdfPage('First page')
  const second = await pdfPage('Second page')
  const pdfInputs = [['first.pdf', first], ['second.pdf', second]]
  let merged
  let directMerged
  try {
    merged = await convert('merge-pdfs', pdfInputs)
    if ((await PDFDocument.load(merged.bytes)).getPageCount() !== 2) throw new Error('PDF merge lost pages')
    const work = await mkdtemp(join(tmpdir(), 'ledger-merge-quality-'))
    try {
      const file = join(work, 'backend.pdf')
      const direct = join(work, 'direct.pdf')
      const firstFile = join(work, 'first.pdf')
      const secondFile = join(work, 'second.pdf')
      await writeFile(firstFile, first)
      await writeFile(secondFile, second)
      await writeFile(file, merged.bytes)
      execFileSync(process.execPath, [join(engineSource, 'cli.js'), 'merge-pdfs', firstFile, secondFile,
        '--output', direct, '--json'], { env: originalCliEnv() })
      directMerged = await readFile(direct)
      if ((await PDFDocument.load(directMerged)).getPageCount() !== 2)
        throw new Error('Original PDF merge lost pages')
      const text = (path) => execFileSync(join(dirname(originalCliEnv().FLYINGMOUSE_PDFTOPPM_PATH),
        'pdftotext'), [path, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ')
      const backendText = text(file)
      if (!backendText.includes('First page') || !backendText.includes('Second page') ||
        backendText !== text(direct)) throw new Error('PDF merge lost source text or differs from original')
      const backendPages = await renderedPages(file, work, 'backend', 2)
      const directPages = await renderedPages(direct, work, 'direct', 2)
      if (backendPages.some((page, index) => page.width !== directPages[index].width ||
        page.height !== directPages[index].height || !page.pixels.equals(directPages[index].pixels)))
        throw new Error('PDF merge rendered pages differ from original')
    } finally { await rm(work, { recursive: true, force: true }) }
    await recordMerge('merge-pdfs', 'pass', pdfInputs, merged.bytes, directMerged,
      'two source pages, text and rendered pixels match original CLI')
  } catch (error) {
    await recordMerge('merge-pdfs', 'fail', pdfInputs, merged?.bytes, directMerged,
      String(error.message || error))
    throw error
  }
  console.log('PASS merge-pdfs, two input pages retained')

  const encrypted = await convert('convert:pdf', [['input.pdf', merged.bytes]], {
    pdfAction: 'encrypt', password: 'local-smoke-password',
  })
  let protectedPdf = false
  try { await PDFDocument.load(encrypted.bytes) } catch { protectedPdf = true }
  if (!protectedPdf) throw new Error('PDF encryption did not protect the result')
  const decrypted = await convert('convert:pdf', [['protected.pdf', encrypted.bytes]], {
    pdfAction: 'decrypt', password: 'local-smoke-password',
  })
  if ((await PDFDocument.load(decrypted.bytes)).getPageCount() !== 2)
    throw new Error('PDF decrypt lost pages')
  console.log('PASS PDF encrypt/decrypt, two pages retained')

  const split = await convert('convert:pdf', [['two-pages.pdf', merged.bytes]], { splitMode: 'page' })
  const splitWork = await mkdtemp(join(tmpdir(), 'ledger-pdf-split-check-'))
  try {
    const input = join(splitWork, 'input.pdf')
    const backendZip = join(splitWork, 'backend.pdf.zip')
    const directZip = join(splitWork, 'direct.pdf.zip')
    await writeFile(input, merged.bytes)
    await writeFile(backendZip, split.bytes)
    const source = engineSource
    execFileSync(process.execPath, [join(source, 'cli.js'), 'convert', input,
      '--to', 'pdf', '--output', directZip, '--json'], { env: originalCliEnv() })
    const pageTexts = (archive) => {
      const names = execFileSync('unzip', ['-Z', '-1', archive], { encoding: 'utf8' })
        .trim().split('\n').filter((name) => name.endsWith('.pdf'))
      if (names.length !== 2) throw new Error('PDF split did not produce two pages')
      return names.map((name) => {
        const bytes = execFileSync('unzip', ['-p', archive, name])
        const part = join(splitWork, `${randomUUID()}.pdf`)
        require('node:fs').writeFileSync(part, bytes)
        const text = execFileSync(join(dirname(process.env.FLYINGMOUSE_PDFTOPPM_PATH || 'pdftoppm'), 'pdftotext'),
          [part, '-'], { encoding: 'utf8' }).trim()
        return text
      }).sort()
    }
    const backendPages = pageTexts(backendZip)
    if (JSON.stringify(backendPages) !== JSON.stringify(pageTexts(directZip)) ||
      !backendPages.some((text) => text.includes('First page')) ||
      !backendPages.some((text) => text.includes('Second page')))
      throw new Error('PDF split differs from original or lost page text')
    execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
      '--record', 'pdf', 'pdf', createHash('sha256').update(merged.bytes).digest('hex'),
      'two-page PDF: direct original and authenticated backend split into same page texts'])
  } finally { await rm(splitWork, { recursive: true, force: true }) }
  console.log('PASS pdf:pdf split, two page texts match direct original')

  const imageA = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#008866' } }).png().toBuffer()
  const imageB = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#cc4455' } }).jpeg().toBuffer()
  const imageInputs = [['first.png', imageA], ['second.jpg', imageB]]
  let images
  let directImages
  try {
    images = await convert('images-to-pdf', imageInputs)
    if ((await PDFDocument.load(images.bytes)).getPageCount() !== 2)
      throw new Error('Image merge lost pages')
    const work = await mkdtemp(join(tmpdir(), 'ledger-image-merge-quality-'))
    try {
      const file = join(work, 'backend.pdf')
      const direct = join(work, 'direct.pdf')
      const firstFile = join(work, 'first.png')
      const secondFile = join(work, 'second.jpg')
      await writeFile(firstFile, imageA)
      await writeFile(secondFile, imageB)
      await writeFile(file, images.bytes)
      execFileSync(process.execPath, [join(engineSource, 'cli.js'), 'images-to-pdf', firstFile, secondFile,
        '--output', direct, '--json'], { env: originalCliEnv() })
      directImages = await readFile(direct)
      if ((await PDFDocument.load(directImages)).getPageCount() !== 2)
        throw new Error('Original image merge lost pages')
      const backendPages = await renderedPages(file, work, 'backend', 2)
      const directPages = await renderedPages(direct, work, 'direct', 2)
      for (const [page, color] of [[1, 'green'], [2, 'red']]) {
        const backend = backendPages[page - 1]
        const reference = directPages[page - 1]
        if (backend.width !== reference.width || backend.height !== reference.height ||
          !backend.pixels.equals(reference.pixels))
          throw new Error(`Image merge page ${page} differs from original`)
        const pixels = backend.pixels
        let colored = 0
        for (let index = 0; index < pixels.length; index += 3) {
          const [red, green, blue] = [pixels[index], pixels[index + 1], pixels[index + 2]]
          if (color === 'green' ? green > red + 40 && green > blue + 20
            : red > green + 40 && red > blue + 40) colored++
        }
        if (colored < 20) throw new Error(`Image merge lost ${color} source pixels on page ${page}`)
      }
    } finally { await rm(work, { recursive: true, force: true }) }
    await recordMerge('images-to-pdf', 'pass', imageInputs, images.bytes, directImages,
      'two pages retain ordered source colors and rendered pixels match original CLI')
  } catch (error) {
    await recordMerge('images-to-pdf', 'fail', imageInputs, images?.bytes, directImages,
      String(error.message || error))
    throw error
  }
  console.log('PASS images-to-pdf, two images retained')
  }

  if (!section || section === 'text') {
  const textSources = {
    txt: '量窗助手中文验收\n第二行 12345\n',
    md: '# 量窗助手中文验收\n\n第二行 12345\n',
    markdown: '# 量窗助手中文验收\n\n第二行 12345\n',
    log: '2026-09-27 量窗助手中文验收 12345\n',
    yaml: 'title: 量窗助手中文验收\ncount: 12345\n',
    yml: 'title: 量窗助手中文验收\ncount: 12345\n',
    xml: '<root><title>量窗助手中文验收</title><count>12345</count></root>\n',
    json: '{"title":"量窗助手中文验收","count":12345}\n',
    html: '<html><body><h1>量窗助手中文验收</h1><p>第二行 12345</p></body></html>\n',
    htm: '<html><body><h1>量窗助手中文验收</h1><p>第二行 12345</p></body></html>\n',
    csv: '标题,数值\n量窗助手中文验收,12345\n',
    tsv: '标题\t数值\n量窗助手中文验收\t12345\n',
  }
  const textWork = await mkdtemp(join(tmpdir(), 'ledger-text-pairs-'))
  try {
    const source = engineSource
    const catalog = require('../src/modules/ledger-conversion/conversion.catalog.json')
    for (const inputExtension of (process.env.CONVERSION_TEXT_INPUTS || 'txt').split(',')) {
      if (!Object.hasOwn(textSources, inputExtension))
        throw new Error(`Unsupported text fixture generator: ${inputExtension}`)
      const textFixture = Buffer.from(textSources[inputExtension])
      const input = join(textWork, `sample.${inputExtension}`)
      await writeFile(input, textFixture)
      const targets = catalog.operations.filter((operation) => operation.kind === 'convert' &&
        operation.inputExtensions.includes(inputExtension)).map((operation) => operation.targetExtension)
      for (const target of targets) {
        const directPath = join(textWork, `direct-${inputExtension}.${target}`)
        const backend = await convert(`convert:${target}`, [[`sample.${inputExtension}`, textFixture]])
        execFileSync(process.execPath, [join(source, 'cli.js'), 'convert', input,
          '--to', target, '--output', directPath, '--json'], { env: originalCliEnv() })
        const direct = await readFile(directPath)
        const content = (bytes, label) => {
          if (target === 'pdf') {
            const file = join(textWork, `${label}.pdf`)
            require('node:fs').writeFileSync(file, bytes)
            return execFileSync(join(dirname(process.env.FLYINGMOUSE_PDFTOPPM_PATH || 'pdftoppm'), 'pdftotext'),
              [file, '-'], { encoding: 'utf8' })
          }
          if (['docx', 'epub', 'xlsx'].includes(target)) {
            const file = join(textWork, `${label}.${target}`)
            require('node:fs').writeFileSync(file, bytes)
            execFileSync('unzip', ['-tqq', file])
            let entry = 'word/document.xml'
            if (target === 'epub') entry = execFileSync('unzip', ['-Z', '-1', file], { encoding: 'utf8' })
              .split('\n').find((name) => name.endsWith('.xhtml'))
            if (target === 'xlsx') {
              const strings = execFileSync('unzip', ['-p', file, 'xl/sharedStrings.xml'], { encoding: 'utf8' })
              const sheet = execFileSync('unzip', ['-p', file, 'xl/worksheets/sheet1.xml'], { encoding: 'utf8' })
              if (!sheet.includes('<row r="2"')) throw new Error('XLSX lost data rows')
              return strings + sheet
            }
            return execFileSync('unzip', ['-p', file, entry], { encoding: 'utf8' })
              .replace(/<[^>]+>/g, '')
          }
          const value = bytes.toString('utf8')
          if (target === 'json') JSON.parse(value)
          return value
        }
        if (target === 'pdf' && (await PDFDocument.load(backend.bytes)).getPageCount() !== 1)
          throw new Error(`${inputExtension} to PDF page count differs from source`)
        const backendText = content(backend.bytes, 'backend')
        const normalized = backendText.replace(/\s+/g, '')
        if (!normalized.includes('量窗助手中文验收') ||
          normalized !== content(direct, 'direct').replace(/\s+/g, ''))
          throw new Error(`${inputExtension} to ${target} differs from original or lost Chinese text`)
        execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
          '--record', inputExtension, target, createHash('sha256').update(textFixture).digest('hex'),
          'valid Chinese text: direct original and authenticated backend, decoded content matched'])
        console.log(`PASS ${inputExtension}:${target}, Chinese content matches direct original`)
      }
    }
  } finally { await rm(textWork, { recursive: true, force: true }) }
  }

  if (!section || section === 'image') {
  const imageSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="320">' +
    '<rect width="600" height="320" fill="white"/>' +
    `<text x="45" y="125" font-family="${process.platform === 'darwin' ? 'PingFang SC' : 'Noto Sans CJK SC'}" font-size="54">量窗助手 12345</text>` +
    '<rect x="45" y="185" width="220" height="80" fill="#008866"/></svg>'
  const imagePng = await sharp(Buffer.from(imageSvg)).png().toBuffer()
  const imageWork = await mkdtemp(join(tmpdir(), 'ledger-image-pairs-'))
  const imageFailures = []
  try {
    const source = engineSource
    const ffmpeg = originalCliEnv().FLYINGMOUSE_FFMPEG_PATH
    const ffprobe = join(dirname(ffmpeg), 'ffprobe')
    const decoded = (file) => {
      const info = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-select_streams', 'v',
        '-show_entries', 'stream=codec_name,width,height:format=duration', '-of', 'json', file],
      { encoding: 'utf8' }))
      const pixels = execFileSync(ffmpeg, ['-v', 'error', '-i', file, '-frames:v', '1',
        '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'], { maxBuffer: 4 * 1024 ** 2 })
      let green = 0
      for (let index = 0; index < pixels.length; index += 4)
        if (pixels[index + 1] > pixels[index] + 50 &&
          pixels[index + 1] > pixels[index + 2] + 15) green++
      const selected = info.streams.find((stream) => pixels.length === stream.width * stream.height * 4)
      if (green < 50 || !selected)
        throw new Error(`${file}: decoded ${pixels.length} bytes, ${green} green pixels, ` +
          `streams ${info.streams.map((stream) => `${stream.width}x${stream.height}`).join(',')}`)
      return { info: { ...info, streams: [selected] }, pixels }
    }
    const catalog = require('../src/modules/ledger-conversion/conversion.catalog.json')
    const inputExtensions = (process.env.CONVERSION_IMAGE_INPUTS || 'png').split(',')
    for (const inputExtension of inputExtensions) {
      if (!['png', 'svg', 'avif', 'bmp', 'gif', 'ico', 'jp2', 'j2k', 'jpg', 'jpe', 'jpeg',
        'jfif', 'jxl', 'ppm', 'qoi', 'tga', 'tif', 'tiff', 'webp', 'heic', 'heif', 'psd']
        .includes(inputExtension))
        throw new Error(`Unsupported image fixture generator: ${inputExtension}`)
      const input = join(imageWork, `sample.${inputExtension}`)
      if (inputExtension === 'png') await writeFile(input, imagePng)
      else if (inputExtension === 'svg') await writeFile(input, imageSvg)
      else {
        const png = join(imageWork, 'source.png')
        await writeFile(png, imagePng)
        if (inputExtension === 'j2k')
          execFileSync(ffmpeg, ['-v', 'error', '-i', png, '-c:v', 'jpeg2000', '-format',
            'j2k', '-f', 'image2', input])
        else if (inputExtension === 'psd') {
          if (!process.env.CONVERSION_PSD_SAMPLE)
            throw new Error('PSD requires CONVERSION_PSD_SAMPLE pointing to a genuine PSD fixture')
          await writeFile(input, await readFile(process.env.CONVERSION_PSD_SAMPLE))
        }
        else if (inputExtension === 'jxl')
          execFileSync(ffmpeg, ['-v', 'error', '-i', png, '-c:v', 'libjxl',
            '-distance', '0', '-effort', '7', input])
        else if (inputExtension === 'heic' || inputExtension === 'heif') {
          const heic = join(imageWork, 'source.heic')
          if (!require('node:fs').existsSync(heic))
            execFileSync(process.platform === 'darwin' ? 'sips' : 'heif-enc',
              process.platform === 'darwin'
                ? ['-s', 'format', 'heic', png, '--out', heic] : [png, '-o', heic])
          await writeFile(input, await readFile(heic))
        } else if (['jpe', 'jpeg', 'jfif', 'tif'].includes(inputExtension)) {
          const target = inputExtension === 'tif' ? 'tiff' : 'jpg'
          const generated = join(imageWork, `source.${target}`)
          if (!require('node:fs').existsSync(generated))
            execFileSync(process.execPath, [join(source, 'cli.js'), 'convert', png,
              '--to', target, '--output', generated, '--json'], { env: originalCliEnv() })
          await writeFile(input, await readFile(generated))
        } else
          execFileSync(process.execPath, [join(source, 'cli.js'), 'convert', png,
            '--to', inputExtension, '--output', input, '--json'], { env: originalCliEnv() })
      }
      const imageFixture = await readFile(input)
      if (inputExtension === 'j2k' && imageFixture.subarray(0, 4).toString('hex') !== 'ff4fff51')
        throw new Error('J2K fixture is not a JPEG 2000 codestream')
      const targets = catalog.operations.filter((operation) => operation.kind === 'convert' &&
        operation.inputExtensions.includes(inputExtension)).map((operation) => operation.targetExtension)
      for (const target of targets) {
        let stage = 'backend'
        try {
        const backend = await convert(`convert:${target}`, [[`sample.${inputExtension}`, imageFixture]])
        const directPath = join(imageWork, `direct-${inputExtension}.${target}`)
        const backendPath = join(imageWork, `backend-${inputExtension}.${target}`)
        stage = 'original'
        execFileSync(process.execPath, [join(source, 'cli.js'), 'convert', input,
          '--to', target, '--output', directPath, '--json'], { env: originalCliEnv() })
        stage = 'quality'
        await writeFile(backendPath, backend.bytes)
        if (['txt', 'md', 'docx'].includes(target)) {
          const xml = (file) => {
            execFileSync('unzip', ['-tqq', file])
            return execFileSync('unzip', ['-p', file, 'word/document.xml'], { encoding: 'utf8' })
              .replace(/<[^>]+>/g, '')
          }
          const text = target === 'docx'
            ? { backend: xml(backendPath), direct: xml(directPath) }
            : { backend: backend.bytes.toString('utf8'), direct: await readFile(directPath, 'utf8') }
          const expected = '量窗助手 12345'
          const inspection = { input: inputExtension, output: target, expected, text,
            sourceTextRetained: text.backend.includes(expected),
            directTextRetained: text.direct.includes(expected),
            directBackendEqual: text.backend === text.direct }
          await saveOcrInspection(inspection, backendPath, directPath)
          if (!inspection.sourceTextRetained)
            throw new Error(`${inputExtension} to ${target} OCR lost visible source text; ` +
              `direct/backend equal=${inspection.directBackendEqual}`)
          if (!inspection.directBackendEqual)
            throw new Error(`${inputExtension} to ${target} OCR differs between direct and backend`)
        } else {
          if (target === 'pdf') {
            if ((await PDFDocument.load(backend.bytes)).getPageCount() !== 1)
              throw new Error(`${inputExtension} to PDF page count is wrong`)
            const pdftoppm = originalCliEnv().FLYINGMOUSE_PDFTOPPM_PATH
            for (const [name, file] of [['backend', backendPath], ['direct', directPath]])
              execFileSync(pdftoppm, ['-f', '1', '-l', '1', '-r', '72', '-png', '-singlefile',
                file, join(imageWork, `${name}-render`)])
          }
          const first = decoded(target === 'pdf' ? join(imageWork, 'backend-render.png') : backendPath)
          const second = decoded(target === 'pdf' ? join(imageWork, 'direct-render.png') : directPath)
          if (first.info.streams[0].width !== second.info.streams[0].width ||
            first.info.streams[0].height !== second.info.streams[0].height ||
            first.info.streams[0].codec_name !== second.info.streams[0].codec_name ||
            !first.pixels.equals(second.pixels))
            throw new Error(`${inputExtension} to ${target} pixels differ from original`)
          if (target === 'mp4' || target === 'webm') {
            const duration = Number(first.info.format.duration)
            const expectedDuration = inputExtension === 'gif'
              ? Number(JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-show_entries',
                'format=duration', '-of', 'json', input], { encoding: 'utf8' })).format.duration)
              : 3
            if (Math.abs(duration - expectedDuration) > 0.11 ||
              Math.abs(duration - Number(second.info.format.duration)) > 0.01)
              throw new Error(`${inputExtension} to ${target} video duration is wrong`)
          }
        }
        execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
          '--record', inputExtension, target, createHash('sha256').update(imageFixture).digest('hex'),
          'valid Chinese image: direct original and authenticated backend; OCR or decoded pixels matched'])
        console.log(`PASS ${inputExtension}:${target}, output matches direct original`)
        } catch (error) {
          const message = `${inputExtension}:${target}: ${error.message}`
          imageFailures.push(message)
          execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
            '--fail', inputExtension, target, stage, createHash('sha256').update(imageFixture).digest('hex'), message])
          console.error(`FAIL ${message}`)
        }
      }
    }
    if (imageFailures.length) throw new Error(`${imageFailures.length} image pairs failed; see pair evidence`)
  } finally { await rm(imageWork, { recursive: true, force: true }) }
  }

  if (!section || section === 'audio') {
  const audioWork = await mkdtemp(join(tmpdir(), 'ledger-audio-pairs-'))
  try {
    const source = engineSource
    const ffmpeg = originalCliEnv().FLYINGMOUSE_FFMPEG_PATH
    const ffprobe = join(dirname(ffmpeg), 'ffprobe')
    const tone = join(audioWork, 'tone.wav')
    execFileSync(ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i',
      'sine=frequency=440:duration=3', '-ac', '1', tone])
    const inspect = (file) => {
      const info = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-select_streams', 'a:0',
        '-show_entries', 'stream=codec_name,channels:format=duration', '-of', 'json', file],
      { encoding: 'utf8' }))
      const pcm = execFileSync(ffmpeg, ['-v', 'error', '-i', file, '-map', '0:a:0',
        '-ac', '1', '-ar', '16000', '-f', 's16le', 'pipe:1'])
      let sum = 0
      for (let index = 0; index < pcm.length; index += 2) {
        const value = pcm.readInt16LE(index)
        sum += value * value
      }
      if (!info.streams.length || Number(info.format.duration) < 2.9 ||
        Number(info.format.duration) > 3.2 || pcm.length < 80000 ||
        Math.sqrt(sum / (pcm.length / 2)) < 100)
        throw new Error(`${file}: missing audio, short duration, or silent output`)
      return { info, pcm }
    }
    const catalog = require('../src/modules/ledger-conversion/conversion.catalog.json')
    for (const inputExtension of (process.env.CONVERSION_AUDIO_INPUTS || 'wav').split(',')) {
      if (!['wav', 'aac', 'flac', 'm4a', 'mp3', 'ogg', 'opus', 'wma'].includes(inputExtension))
        throw new Error(`Unsupported audio fixture generator: ${inputExtension}`)
      const input = inputExtension === 'wav' ? tone : join(audioWork, `source.${inputExtension}`)
      if (inputExtension !== 'wav')
        execFileSync(process.execPath, [join(source, 'cli.js'), 'convert', tone,
          '--to', inputExtension, '--output', input, '--json'], { env: originalCliEnv() })
      const fixture = await readFile(input)
      const targets = catalog.operations.filter((operation) => operation.kind === 'convert' &&
        operation.inputExtensions.includes(inputExtension)).map((operation) => operation.targetExtension)
      for (const target of targets) {
        const backend = await convert(`convert:${target}`, [[`tone.${inputExtension}`, fixture]])
        const backendPath = join(audioWork, `backend-${inputExtension}.${target}`)
        const directPath = join(audioWork, `direct-${inputExtension}.${target}`)
        await writeFile(backendPath, backend.bytes)
        execFileSync(process.execPath, [join(source, 'cli.js'), 'convert', input,
          '--to', target, '--output', directPath, '--json'], { env: originalCliEnv() })
        const first = inspect(backendPath)
        const second = inspect(directPath)
        if (first.info.streams[0].codec_name !== second.info.streams[0].codec_name ||
          first.info.streams[0].channels !== second.info.streams[0].channels ||
          !first.pcm.equals(second.pcm))
          throw new Error(`${inputExtension} to ${target} audio differs from original`)
        execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
          '--record', inputExtension, target, createHash('sha256').update(fixture).digest('hex'),
          'valid three-second audio: direct original and authenticated backend, codec/duration/decoded signal matched'])
        console.log(`PASS ${inputExtension}:${target}, audio matches direct original`)
      }
    }
  } finally { await rm(audioWork, { recursive: true, force: true }) }
  }
}

async function main() {
  let pdfParityFailures = 0
  const jobTimeoutSeconds = Number(process.env.CONVERSION_TEST_JOB_TIMEOUT_SECONDS || 90)
  if (!Number.isInteger(jobTimeoutSeconds) || jobTimeoutSeconds < 30 || jobTimeoutSeconds > 720)
    throw new Error('CONVERSION_TEST_JOB_TIMEOUT_SECONDS must be 30 through 720')
  const user = await prisma.ledgerUser.create({
    data: { nickname: '本地转换验收', wxOpenid: `local-conversion-${randomUUID()}` },
  })
  userId = user.id
  const token = await new JwtService({ secret: process.env.JWT_SECRET }).signAsync({
    sub: userId, scope: 'ledger', jti: randomUUID(),
  }, { expiresIn: '3h' })
  const auth = { Authorization: `Bearer ${token}` }
  async function json(route, method = 'GET', data) {
    const response = await fetch(new URL(`/api/v1/l/conversions${route}`, base), {
      method, headers: { ...auth, ...(data ? { 'Content-Type': 'application/json' } : {}) },
      body: data ? JSON.stringify(data) : undefined,
    }).catch((error) => {
      throw new Error(`${method} ${route} transport: ${error.cause?.code || error.message} ` +
        `${error.cause?.message || ''}`, { cause: error })
    })
    const body = await response.json()
    if (!response.ok || body.code !== 0) throw new Error(`${route}: ${body.message || response.status}`)
    return body.data
  }
  cleanupJob = (id) => json(`/jobs/${id}`, 'DELETE')
  const capabilities = await json('/capabilities')
  if (!capabilities.available || !capabilities.operations.some((op) => op.id === 'convert:md'))
    throw new Error('Original conversion worker is unavailable')

  async function upload(name, data) {
    const created = await json('/uploads', 'POST', { fileName: name, sizeBytes: data.length })
    for (let index = 0; index < created.chunkCount; index++) {
      const part = data.subarray(index * created.chunkBytes, (index + 1) * created.chunkBytes)
      const form = new FormData()
      form.set('index', String(index))
      form.set('file', new Blob([part]), 'chunk.bin')
      const response = await fetch(new URL(`/api/v1/l/conversions/uploads/${created.id}/chunks`, base), {
        method: 'POST', headers: auth, body: form,
      }).catch((error) => {
        throw new Error(`POST upload chunk ${index} transport: ${error.cause?.code || error.message} ` +
          `${error.cause?.message || ''}`, { cause: error })
      })
      const body = await response.json()
      if (!response.ok || body.code !== 0) throw new Error(`Chunk upload: ${body.message || response.status}`)
    }
    await json(`/uploads/${created.id}/complete`, 'POST')
    return created.id
  }

  async function convert(operationId, files, options = {}) {
    const jobEvidence = { operationId, options, startedAt: new Date().toISOString(),
      inputs: files.map(([name, bytes]) => ({ name, sha256: createHash('sha256').update(bytes).digest('hex'),
        bytes: bytes.length })), status: 'fail' }
    let job
    let result
    try {
    if (process.env.CONVERSION_INPUT_ARTIFACT_DIR) {
      if (!process.env.CONVERSION_INPUT_FIXTURE_INDEX)
        throw new Error('Input artifact directory requires a fixed-fixture index')
      const fixed = JSON.parse(await readFile(process.env.CONVERSION_INPUT_FIXTURE_INDEX, 'utf8'))
      for (const [index, [name, bytes]] of files.entries()) {
        const input = jobEvidence.inputs[index]
        if (fixed[input.sha256]) {
          Object.assign(input, fixed[input.sha256])
          continue
        }
        const extension = name.toLowerCase().match(/\.([a-z0-9]{1,10})$/)?.[1]
        if (!extension) throw new Error(`Cannot retain generated fixture without an extension: ${name}`)
        const filename = `${input.sha256}.${extension}`
        const path = join(process.env.CONVERSION_INPUT_ARTIFACT_DIR, filename)
        try { await writeFile(path, bytes, { flag: 'wx', mode: 0o600 }) }
        catch (error) { if (error.code !== 'EEXIST') throw error }
        if (createHash('sha256').update(await readFile(path)).digest('hex') !== input.sha256)
          throw new Error(`Stored input fixture SHA-256 mismatch: ${filename}`)
        input.relativePath = join(basename(process.env.CONVERSION_INPUT_ARTIFACT_DIR), filename)
      }
    }
    const uploadIds = []
    for (const [name, bytes] of files) uploadIds.push(await upload(name, bytes))
    job = await json('/jobs', 'POST', { operationId, uploadIds, options })
    jobEvidence.jobId = job.id
    outstanding.add(job.id)
    for (let attempt = 0; attempt < jobTimeoutSeconds; attempt++) {
      result = await json(`/jobs/${job.id}`)
      if (['succeeded', 'failed', 'cancelled'].includes(result.status)) break
      await new Promise((done) => { setTimeout(done, 1000) })
    }
    jobEvidence.terminalStatus = ['succeeded', 'failed', 'cancelled'].includes(result?.status)
      ? result.status : 'timed-out'
    jobEvidence.warnings = result?.warnings || []
    if (result?.status !== 'succeeded' || !result.assets.length)
      throw new Error(`${operationId}: ${result?.status || 'timed out'} ${result?.error || ''}`)
    if (options.password) {
      const stored = await prisma.ledgerConversionJob.findUnique({
        where: { id: job.id }, select: { options: true },
      })
      if (!String(stored?.options?.password || '').startsWith('v1:') ||
        String(stored.options.password).includes(options.password))
        throw new Error('PDF password was stored without encryption')
    }
    const response = await fetch(new URL(`/api/v1/l/conversions/jobs/${job.id}/assets/${result.assets[0].id}`, base), {
      headers: auth,
    }).catch((error) => {
      throw new Error(`GET result ${job.id} transport: ${error.cause?.code || error.message} ` +
        `${error.cause?.message || ''}`, { cause: error })
    })
    if (!response.ok) throw new Error(`${operationId} download failed: ${response.status}`)
    const bytes = Buffer.from(await response.arrayBuffer())
    jobEvidence.output = { sha256: createHash('sha256').update(bytes).digest('hex'),
      bytes: bytes.length }
    await cleanupJob(job.id)
    outstanding.delete(job.id)
    jobEvidence.status = 'pass'
    return { bytes, result }
    } catch (error) {
      jobEvidence.error = String(error.message || error).slice(0, 500)
      if (!jobEvidence.terminalStatus) jobEvidence.terminalStatus = result?.status || 'not-created'
      throw error
    } finally {
      if (process.env.CONVERSION_JOB_EVIDENCE)
        await appendFile(process.env.CONVERSION_JOB_EVIDENCE,
          JSON.stringify({ ...jobEvidence, finishedAt: new Date().toISOString() }) + '\n')
    }
  }

  if (!process.env.CONVERSION_SKIP_BASELINE || process.env.CONVERSION_BASELINE_SECTION)
    await verifyBaseline(convert)

  if (process.env.CONVERSION_AVS)
    await require('./verify-media-codec-conversion.cjs')(convert, engineSource, originalCliEnv())
  if (process.env.CONVERSION_EVC)
    await require('./verify-media-codec-conversion.cjs')(convert, engineSource, originalCliEnv(), 'evc')

  if (process.env.CONVERSION_PDF_PARITY_CASES) {
    const { assertPdfParityQuality } = require('../../../scripts/flyingmouse-pdf-parity-quality.cjs')
    const { REFERENCE_HEADING, validatePdfOfficeDocx } =
      require(join(engineSource, 'pdf-office-docx.js'))
    const cases = JSON.parse(await readFile(process.env.CONVERSION_PDF_PARITY_CASES, 'utf8'))
    if (!Array.isArray(cases) || !cases.length || !process.env.CONVERSION_PARITY_EVIDENCE)
      throw new Error('PDF parity requires cases and CONVERSION_PARITY_EVIDENCE')
    const artifactRoot = join(dirname(process.env.CONVERSION_PARITY_EVIDENCE),
      `${basename(process.env.CONVERSION_PARITY_EVIDENCE, '.jsonl')}-files`)
    await mkdir(artifactRoot)
    const work = await mkdtemp(join(tmpdir(), 'ledger-pdf-parity-'))
    const ExcelJS = require(join(engineSource, 'node_modules/exceljs'))
    const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
    const normalize = (value) => String(value || '').replace(/\s+/g, '')
    const referencePixels = async (file, xml, expectedPages) => {
      await validatePdfOfficeDocx(file, { expectedReferenceImages: expectedPages.length })
      const rels = execFileSync('unzip', ['-p', file, 'word/_rels/document.xml.rels'],
        { encoding: 'utf8' })
      const imagePaths = new Map([...rels.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)]
        .map((match) => [match[1].match(/\bId="([^"]+)"/)?.[1],
          match[1].match(/\bTarget="media\/([^"]+\.png)"/)?.[1]]).filter((pair) => pair[0] && pair[1]))
      const references = [...xml.slice(xml.indexOf(REFERENCE_HEADING)).matchAll(
        /<wp:(?:inline|anchor)\b[\s\S]*?<\/wp:(?:inline|anchor)>/g)]
        .filter((match) => /descr="Original reference page \d+"/.test(match[0]))
      if (references.length !== expectedPages.length)
        throw new Error(`Original reference images: expected ${expectedPages.length}, found ${references.length}`)
      for (let index = 0; index < references.length; index++) {
        const id = references[index][0].match(/<a:blip\b[^>]*\br:embed="([^"]+)"/)?.[1]
        const image = imagePaths.get(id)
        if (!image) throw new Error(`Original reference page ${index + 1} lacks an image`)
        const bytes = execFileSync('unzip', ['-p', file, `word/media/${image}`])
        const { data, info } = await sharp(bytes).removeAlpha().raw().toBuffer({ resolveWithObject: true })
        const expected = expectedPages[index]
        if (info.width !== expected.width || info.height !== expected.height ||
          hash(data) !== expected.pixelSha256)
          throw new Error(`Original reference page ${index + 1} differs from source PDF pixels`)
      }
      return references.length
    }
    const render = async (file, key) => {
      const directory = join(work, `render-${key}`)
      await mkdir(directory)
      execFileSync(originalCliEnv().FLYINGMOUSE_LIBREOFFICE_PATH,
        [`-env:UserInstallation=${pathToFileURL(join(directory, 'profile')).href}`, '--headless',
          '--convert-to', 'pdf', '--outdir', directory, file])
      const pdf = join(directory, `${basename(file, '.docx').replace(/\.xlsx$/, '')}.pdf`)
      const pageCount = (await PDFDocument.load(await readFile(pdf))).getPageCount()
      const pages = []
      for (let page = 1; page <= pageCount; page++) {
        const image = join(directory, `page-${page}`)
        execFileSync(originalCliEnv().FLYINGMOUSE_PDFTOPPM_PATH,
          ['-f', String(page), '-l', String(page), '-r', '120', '-singlefile', '-png', pdf, image])
        const bitmap = sharp(`${image}.png`)
        const metadata = await bitmap.metadata()
        const pixels = await bitmap.removeAlpha().raw().toBuffer()
        const artifact = `${key}-page-${page}.png`
        await copyFile(`${image}.png`, join(artifactRoot, artifact))
        pages.push({ width: metadata.width, height: metadata.height, pixelSha256: hash(pixels),
          pngSha256: hash(await readFile(`${image}.png`)),
          pngPath: join(basename(artifactRoot), artifact) })
      }
      return { pageCount, pages }
    }
    let failures = 0
    try {
      for (const [caseIndex, item] of cases.entries()) {
        if (!['native', 'scan', 'mixed'].includes(item.kind) || !item.path ||
          !Array.isArray(item.expect) || !item.expect.length ||
          !item.expect.every((value) => typeof value === 'string' && value.length))
          throw new Error('PDF parity case requires kind, path and nonempty expect strings')
        const inputPath = require('node:path').resolve(dirname(process.env.CONVERSION_PDF_PARITY_CASES), item.path)
        const source = await readFile(inputPath)
        if (source.subarray(0, 5).toString() !== '%PDF-') throw new Error(`Invalid PDF: ${inputPath}`)
        const sourcePages = (await PDFDocument.load(source)).getPageCount()
        const expectedReferences = item.kind === 'native' ? null : JSON.parse(execFileSync(
          process.env.FLYINGMOUSE_DOCSTRUCTURE_PYTHON || '/opt/docstructure-venv/bin/python',
          [join(__dirname, 'pdf-reference-raster-hashes.py'), inputPath],
          { encoding: 'utf8', timeout: 30000 }))
        for (const target of ['docx', 'xlsx']) {
          const label = `${item.kind}:${target}:${basename(inputPath)}`
          const artifactKey = `${caseIndex + 1}-${item.kind}-${target}`
          const directPath = join(work, `${randomUUID()}.${target}`)
          const evidence = { label, inputSha256: hash(source), sourcePages, target,
            expectedContent: item.expectByTarget?.[target] || item.expect,
            expectedTableRows: target === 'xlsx' ? item.expectTableRows : undefined,
            expectedReferencePixels: target === 'docx' ? expectedReferences : undefined,
            status: 'fail', files: {} }
          try {
            const response = execFileSync(process.execPath, [join(engineSource, 'cli.js'), 'convert',
              inputPath, '--to', target, '--output', directPath, '--json'],
            { env: originalCliEnv(), timeout: 12 * 60 * 1000, encoding: 'utf8' })
            evidence.directWarnings = JSON.parse(response.trim()).outputs?.flatMap((output) =>
              output.warnings || []) || []
            const direct = await readFile(directPath)
            evidence.directSha256 = hash(direct)
            const directOutput = `${artifactKey}-direct.${target}`
            await copyFile(directPath, join(artifactRoot, directOutput))
            evidence.files.directOutput = join(basename(artifactRoot), directOutput)
            if (evidence.directWarnings.some((warning) =>
              warning?.code === 'PDF_DOCX_LAYOUT_FALLBACK'))
              throw new Error('PDF_DOCX_LAYOUT_FALLBACK: direct conversion degraded layout')
            const converted = await convert(`convert:${target}`, [[basename(inputPath), source]])
            const backend = converted.bytes
            evidence.backendSha256 = hash(backend)
            const backendOutput = `${artifactKey}-backend.${target}`
            await writeFile(join(artifactRoot, backendOutput), backend)
            evidence.files.backendOutput = join(basename(artifactRoot), backendOutput)
            evidence.backendWarnings = converted.result.warnings || []
            if ([...evidence.directWarnings, ...evidence.backendWarnings].some((warning) =>
              warning?.code === 'PDF_DOCX_LAYOUT_FALLBACK' ||
              (typeof warning === 'string' && (warning.includes('版式引擎输出存在缺字') ||
                warning.includes('版式引擎不可用')))))
              throw new Error('PDF_DOCX_LAYOUT_FALLBACK: conversion degraded layout')
            const extract = async (bytes, file) => {
              await writeFile(file, bytes)
              if (target === 'docx') {
                execFileSync('unzip', ['-tqq', file])
                const names = execFileSync('unzip', ['-Z', '-1', file], { encoding: 'utf8' })
                  .trim().split('\n')
                const assets = names.filter((name) => name.startsWith('word/media/')).length
                if (file === directCheckPath) evidence.directAssets = assets
                else evidence.backendAssets = assets
                const xml = execFileSync('unzip', ['-p', file, 'word/document.xml'], { encoding: 'utf8' })
                if (expectedReferences) {
                  if (!xml.includes(REFERENCE_HEADING))
                    throw new Error('Structured DOCX lacks original reference section')
                  const referenceCount = await referencePixels(file, xml, expectedReferences)
                  if (file === directCheckPath) evidence.directReferencePages = referenceCount
                  else evidence.backendReferencePages = referenceCount
                }
                return { text: xml.replace(/<[^>]+>/g, ''), assets }
              }
              const book = new ExcelJS.Workbook()
              await book.xlsx.readFile(file)
              const sheets = book.worksheets.map((sheet) => {
                const rows = []
                sheet.eachRow((row) => rows.push(row.values.slice(1).map((cell) => String(cell ?? ''))))
                return { name: sheet.name, rows }
              })
              return { text: sheets.flatMap((sheet) => sheet.rows.flat()).join(' '), sheets }
            }
            const directCheckPath = join(work, `${randomUUID()}-direct.${target}`)
            const backendCheckPath = join(work, `${randomUUID()}-backend.${target}`)
            const directExtract = await extract(direct, directCheckPath)
            const backendExtract = await extract(backend, backendCheckPath)
            const directText = normalize(directExtract.text)
            const backendText = normalize(backendExtract.text)
            evidence.contentSha256 = hash(Buffer.from(backendText))
            evidence.directContentSha256 = hash(Buffer.from(directText))
            evidence.contentLength = backendText.length
            evidence.directRender = await render(directCheckPath, `${artifactKey}-direct`)
            evidence.backendRender = await render(backendCheckPath, `${artifactKey}-backend`)
            assertPdfParityQuality({ item, target, sourcePages,
              direct: { ...directExtract, text: directText, render: evidence.directRender },
              backend: { ...backendExtract, text: backendText, render: evidence.backendRender } })
            execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
              '--record', 'pdf', target, evidence.inputSha256,
              'synthetic PDF: direct original and authenticated backend content, assets, and renders checked'])
            Object.assign(evidence, { status: 'pass', matched: evidence.expectedContent })
            console.log(`PASS ${label}, content retained and direct/backend matched`)
          } catch (error) {
            failures++
            evidence.error = String(error.message || error).slice(0, 500)
            try {
              execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
                '--fail', 'pdf', target, 'quality', evidence.inputSha256, evidence.error])
            } catch (recordError) { evidence.recordError = String(recordError.message || recordError).slice(0, 300) }
            console.error(`FAIL ${label}: ${evidence.error}`)
          }
          await appendFile(process.env.CONVERSION_PARITY_EVIDENCE, JSON.stringify(evidence) + '\n')
        }
      }
    } finally { await rm(work, { recursive: true, force: true }) }
    pdfParityFailures = failures
  }

  if (process.env.CONVERSION_BAD_RAW) {
    let failure
    try {
      await convert('convert:png', [['broken.cr2', Buffer.from('not a camera RAW file')]])
    } catch (error) { failure = error }
    if (!failure?.message.includes('RAW 图片解码失败'))
      throw new Error(`Damaged RAW returned the wrong error: ${failure?.message || 'conversion succeeded'}`)
    console.log('PASS damaged RAW reports a decode error through the authenticated backend')
  }

  const imageLikeSample = process.env.CONVERSION_RAW_SAMPLE || process.env.CONVERSION_VECTOR_SAMPLE
  if (imageLikeSample) {
    const extension = imageLikeSample.split('.').pop().toLowerCase()
    const catalog = require('../src/modules/ledger-conversion/conversion.catalog.json')
    const supported = new Set(catalog.operations.filter((operation) =>
      operation.kind === 'convert' && operation.inputExtensions.includes(extension))
      .map((operation) => operation.targetExtension))
    const targets = (process.env.CONVERSION_RAW_TARGETS || 'png').split(',')
    if (targets.some((target) => !supported.has(target)))
      throw new Error(`Unsupported image target for ${extension}`)
    if (targets.some((target) => ['docx', 'md', 'txt'].includes(target)) &&
      (!process.env.CONVERSION_RAW_OCR_EXPECT ||
        process.env.CONVERSION_RAW_OCR_EXPECT.replace(/\s+/g, '').length < 4))
      throw new Error(`${extension} OCR requires visible fixture text via CONVERSION_RAW_OCR_EXPECT`)
    const work = await mkdtemp(join(tmpdir(), 'ledger-raw-pairs-'))
    const failures = []
    try {
      const fixture = await readFile(imageLikeSample)
      const input = join(work, `sample.${extension}`)
      await writeFile(input, fixture)
      const ffmpeg = originalCliEnv().FLYINGMOUSE_FFMPEG_PATH
      const ffprobe = join(dirname(ffmpeg), 'ffprobe')
      const decoded = (file) => {
        const info = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-select_streams', 'v',
          '-show_entries', 'stream=width,height:format=duration', '-of', 'json', file],
        { encoding: 'utf8' }))
        const pixels = execFileSync(ffmpeg, ['-v', 'error', '-i', file, '-frames:v', '1',
          '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1'],
        { maxBuffer: 256 * 1024 ** 2 })
        const stream = info.streams.find((item) => pixels.length === item.width * item.height * 3)
        if (!stream || pixels.equals(Buffer.alloc(pixels.length)))
          throw new Error(`${file}: image is blank or truncated`)
        return { info, stream, pixels }
      }
      for (const target of targets) {
        let stage = 'original'
        try {
        const direct = join(work, `direct.${target}`)
        const backendPath = join(work, `backend.${target}`)
        execFileSync(process.execPath, [join(engineSource, 'cli.js'), 'convert', input,
          '--to', target, '--output', direct, '--json'], { env: originalCliEnv() })
        stage = 'backend'
        const result = await convert(`convert:${target}`, [[`sample.${extension}`, fixture]])
        stage = 'quality'
        await writeFile(backendPath, result.bytes)
        if (['docx', 'md', 'txt'].includes(target)) {
          const expected = process.env.CONVERSION_RAW_OCR_EXPECT?.replace(/\s+/g, '')
          if (!expected || expected.length < 4)
            throw new Error(`${extension} OCR requires CONVERSION_RAW_OCR_EXPECT from visible fixture text`)
          const extractText = (file) => (target === 'docx'
            ? execFileSync('unzip', ['-p', file, 'word/document.xml'], { encoding: 'utf8' })
              .replace(/<[^>]+>/g, '')
            : require('node:fs').readFileSync(file, 'utf8')).replace(/\s+/g, '')
          const directText = extractText(direct)
          const backendText = extractText(backendPath)
          const inspection = { input: extension, output: target, expected,
            text: { backend: backendText, direct: directText },
            sourceTextRetained: backendText.includes(expected),
            directTextRetained: directText.includes(expected),
            directBackendEqual: backendText === directText }
          await saveOcrInspection(inspection, backendPath, direct)
          if (!inspection.sourceTextRetained)
            throw new Error(`${extension} to ${target}: OCR lost visible source text; ` +
              `direct/backend equal=${inspection.directBackendEqual}`)
          if (!inspection.directBackendEqual)
            throw new Error(`${extension} to ${target}: OCR differs between direct and backend`)
          execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
            '--record', extension, target, createHash('sha256').update(fixture).digest('hex'),
            'genuine image fixture: visible OCR phrase retained by direct original and backend'])
          console.log(`PASS ${extension}:${target}, OCR text matches known fixture phrase and original`)
          continue
        }
        if (target === 'pdf') {
          if ((await PDFDocument.load(result.bytes)).getPageCount() !== 1)
            throw new Error('RAW PDF has wrong page count')
          for (const [name, file] of [['direct', direct], ['backend', backendPath]])
            execFileSync(originalCliEnv().FLYINGMOUSE_PDFTOPPM_PATH,
              ['-f', '1', '-singlefile', '-r', '72', '-png', file, join(work, `pdf-${name}`)])
        }
        const first = decoded(target === 'pdf' ? join(work, 'pdf-backend.png') : backendPath)
        const second = decoded(target === 'pdf' ? join(work, 'pdf-direct.png') : direct)
        if (first.stream.width !== second.stream.width ||
          first.stream.height !== second.stream.height ||
          !first.pixels.equals(second.pixels))
          throw new Error(`${extension} to ${target}: decoded pixels differ from original`)
        if (['mp4', 'webm'].includes(target) &&
          (Math.abs(Number(first.info.format.duration) - 3) > 0.2 ||
            Math.abs(Number(first.info.format.duration) - Number(second.info.format.duration)) > 0.02))
          throw new Error(`${extension} to ${target}: video duration differs from original`)
        execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
          '--record', extension, target, createHash('sha256').update(fixture).digest('hex'),
          extension === 'ai'
            ? 'Illustrator file: direct original and authenticated backend, decoded pixels compared'
            : 'genuine camera RAW: direct original and authenticated backend, decoded pixels compared'])
        console.log(`PASS ${extension}:${target}, decoded pixels match direct original`)
        } catch (error) {
          const message = `${extension}:${target}: ${error.message}`
          failures.push(message)
          execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
            '--fail', extension, target, stage, createHash('sha256').update(fixture).digest('hex'), message])
          console.error(`FAIL ${message}`)
        }
      }
      if (failures.length) throw new Error(`${failures.length} ${extension} pairs failed; see pair evidence`)
    } finally { await rm(work, { recursive: true, force: true }) }
  }

  if (process.env.CONVERSION_OPTIONS) {
    const work = await mkdtemp(join(tmpdir(), 'ledger-conversion-options-'))
    try {
      const originalEnv = originalCliEnv()
      const directHttp = async (name, bytes, target, options) => {
        const child = spawn(process.execPath, ['-e',
          'require(process.argv[1] + "/server.js").startServer(0).then(({server,url}) => {' +
          'process.send(url); process.on("message", () => server.close(() => process.exit(0)))})',
          engineSource], { env: originalEnv, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] })
        let errorOutput = ''
        child.stderr.on('data', (chunk) => { errorOutput += chunk.toString().slice(0, 4000) })
        const url = await new Promise((resolve, reject) => {
          child.once('message', resolve)
          child.once('exit', (code) => reject(new Error(`Original service exited ${code}: ${errorOutput}`)))
        })
        try {
          const form = new FormData()
          form.set('file', new Blob([bytes]), name)
          form.set('targetFormat', target)
          for (const [key, value] of Object.entries(options)) form.set(key, value)
          const response = await fetch(new URL('/api/convert', url), { method: 'POST', body: form })
          const body = await response.json()
          if (!response.ok || !body.downloadUrl)
            throw new Error(`Original ${target} conversion: ${body.error || response.status}`)
          const download = await fetch(new URL(body.downloadUrl, url))
          if (!download.ok) throw new Error(`Original download: ${download.status}`)
          return Buffer.from(await download.arrayBuffer())
        } finally {
          if (child.exitCode === null) {
            const exited = new Promise((done) => child.once('exit', done))
            child.send('stop')
            await exited
          }
        }
      }
      const pages = await Promise.all(['First page', 'Second page', 'Third page'].map(pdfPage))
      const merged = await convert('merge-pdfs', pages.map((bytes, index) =>
        [`page-${index + 1}.pdf`, bytes]))
      const backend = await convert('convert:pdf', [['three-pages.pdf', merged.bytes]],
        { splitMode: 'group', groupSize: '2' })
      const direct = await directHttp('three-pages.pdf', merged.bytes, 'pdf',
        { splitMode: 'group', groupSize: '2' })
      const inspect = async (bytes, name) => {
        const file = join(work, `${name}.zip`)
        await writeFile(file, bytes)
        const names = execFileSync('unzip', ['-Z', '-1', file], { encoding: 'utf8' })
          .trim().split('\n').filter((item) => item.endsWith('.pdf'))
        if (names.length !== 2) throw new Error(`${name}: expected two PDF groups`)
        const groups = []
        for (const item of names) {
          const pdf = execFileSync('unzip', ['-p', file, item])
          const count = (await PDFDocument.load(pdf)).getPageCount()
          const part = join(work, `${name}-${groups.length}.pdf`)
          await writeFile(part, pdf)
          const text = execFileSync(join(dirname(originalEnv.FLYINGMOUSE_PDFTOPPM_PATH),
            'pdftotext'), [part, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ')
          groups.push({ count, text })
        }
        return groups.sort((a, b) => b.count - a.count)
      }
      const first = await inspect(backend.bytes, 'backend')
      const second = await inspect(direct, 'direct')
      if (JSON.stringify(first) !== JSON.stringify(second) ||
        first[0].count !== 2 || first[1].count !== 1 ||
        !first[0].text.includes('First page') || !first[0].text.includes('Second page') ||
        !first[1].text.includes('Third page'))
        throw new Error('PDF group split differs from original or lost page text')
      console.log('PASS PDF groupSize=2, direct original and backend preserve all three pages')

      const phrase = '量窗助手编码验收 12345'
      for (const [option, encoding] of [
        ['gb18030', 'GB18030'], ['utf-16le', 'UTF-16LE'], ['utf-16be', 'UTF-16BE'],
      ]) {
        const fixture = execFileSync('iconv', ['-f', 'UTF-8', '-t', encoding],
          { input: Buffer.from(`${phrase}\n`) })
        const input = join(work, `${option}.txt`)
        const output = join(work, `${option}.epub`)
        await writeFile(input, fixture)
        const result = await convert('convert:epub', [[`${option}.txt`, fixture]],
          { textEncoding: option })
        execFileSync(process.execPath, [join(engineSource, 'cli.js'), 'convert', input,
          '--to', 'epub', '--text-encoding', option, '--output', output, '--json'],
        { env: originalEnv })
        const extract = (file) => {
          const entry = execFileSync('unzip', ['-Z', '-1', file], { encoding: 'utf8' })
            .split('\n').find((name) => name.endsWith('.xhtml'))
          if (!entry) throw new Error(`${option}: EPUB has no XHTML`)
          return execFileSync('unzip', ['-p', file, entry], { encoding: 'utf8' })
            .replace(/<[^>]+>/g, '').replace(/\s+/g, '')
        }
        const backendEpub = join(work, `${option}-backend.epub`)
        await writeFile(backendEpub, result.bytes)
        if (!extract(backendEpub).includes(phrase.replace(/\s+/g, '')) ||
          extract(backendEpub) !== extract(output))
          throw new Error(`${option}: EPUB text differs from original or lost Chinese characters`)
        console.log(`PASS textEncoding=${option}, original and backend EPUB retain Chinese text`)
      }

      const ffmpeg = originalEnv.FLYINGMOUSE_FFMPEG_PATH
      const ffprobe = join(dirname(ffmpeg), 'ffprobe')
      const video = join(work, 'options.webm')
      execFileSync(ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i',
        'testsrc2=size=128x96:rate=8:duration=2', '-c:v', 'libvpx-vp9', video])
      const videoBytes = await readFile(video)
      for (const [option, codec] of [
        ['h264', 'h264'], ['h265', 'hevc'], ['av1', 'av1'],
      ]) {
        const directPath = join(work, `${option}-direct.mp4`)
        const backendPath = join(work, `${option}-backend.mp4`)
        const result = await convert('convert:mp4', [['options.webm', videoBytes]],
          { videoCodec: option })
        await writeFile(backendPath, result.bytes)
        execFileSync(process.execPath, [join(engineSource, 'cli.js'), 'convert', video,
          '--to', 'mp4', '--video-codec', option, '--output', directPath, '--json'],
        { env: originalEnv })
        const probe = (file) => JSON.parse(execFileSync(ffprobe, ['-v', 'error',
          '-show_entries', 'stream=codec_name,width,height:format=duration', '-of', 'json', file],
        { encoding: 'utf8' }))
        const first = probe(backendPath)
        const second = probe(directPath)
        const frames = (file) => execFileSync(ffmpeg, ['-v', 'error', '-i', file,
          '-frames:v', '2', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1'])
        if (first.streams[0]?.codec_name !== codec || second.streams[0]?.codec_name !== codec ||
          first.streams[0].width !== 128 || first.streams[0].height !== 96 ||
          Math.abs(Number(first.format.duration) - 2) > 0.2 ||
          Math.abs(Number(first.format.duration) - Number(second.format.duration)) > 0.02 ||
          !frames(backendPath).equals(frames(directPath)))
          throw new Error(`videoCodec=${option}: codec, duration or frames differ from original`)
        console.log(`PASS videoCodec=${option}, original and backend frames match`)
      }
      const alphaPng = join(work, 'alpha.png')
      const alphaVideo = join(work, 'alpha.mov')
      await sharp({ create: { width: 64, height: 64, channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      } }).composite([{ input: Buffer.from('<svg width="64" height="64">' +
        '<rect x="20" y="20" width="24" height="24" fill="red"/></svg>'),
        top: 0, left: 0 }]).png().toFile(alphaPng)
      execFileSync(ffmpeg, ['-v', 'error', '-loop', '1', '-i', alphaPng,
        '-t', '2', '-c:v', 'qtrle', '-pix_fmt', 'argb', alphaVideo])
      const alphaInput = await readFile(alphaVideo)
      const background = '#0000ff'
      const alphaBackend = await convert('convert:mp4', [['alpha.mov', alphaInput]],
        { alphaBackground: background })
      const alphaDirect = await directHttp('alpha.mov', alphaInput, 'mp4',
        { alphaBackground: background })
      const alphaBackendPath = join(work, 'alpha-backend.mp4')
      const alphaDirectPath = join(work, 'alpha-direct.mp4')
      await writeFile(alphaBackendPath, alphaBackend.bytes)
      await writeFile(alphaDirectPath, alphaDirect)
      const frame = (file) => execFileSync(ffmpeg, ['-v', 'error', '-i', file,
        '-frames:v', '1', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1'])
      const rendered = frame(alphaBackendPath)
      const pixel = (x, y) => [...rendered.subarray((y * 64 + x) * 3,
        (y * 64 + x) * 3 + 3)]
      const corner = pixel(4, 4)
      const center = pixel(32, 32)
      if (rendered.length !== 64 * 64 * 3 || !rendered.equals(frame(alphaDirectPath)) ||
        corner[2] < 170 || corner[0] > 80 || corner[1] > 80 ||
        center[0] < 150 || center[1] > 90 || center[2] > 90)
        throw new Error(`alphaBackground=${background}: colors or frames differ from original ` +
          `corner=${corner} center=${center}`)
      console.log(`PASS alphaBackground=${background}, blue transparent area and red foreground match original`)
    } finally { await rm(work, { recursive: true, force: true }) }
  }

  if (process.env.CONVERSION_CONTROL_FLOW) {
    const waitFor = async (id, expected) => {
      for (let attempt = 0; attempt < 45; attempt++) {
        const job = await json(`/jobs/${id}`)
        if (expected.includes(job.status)) return job
        await new Promise((done) => { setTimeout(done, 1000) })
      }
      throw new Error(`${id}: did not reach ${expected.join('/')}`)
    }
    const invalidUpload = await upload('broken.pdf', Buffer.from('this is not a PDF'))
    const failed = await json('/jobs', 'POST', {
      operationId: 'convert:txt', uploadIds: [invalidUpload], options: {},
    })
    outstanding.add(failed.id)
    await waitFor(failed.id, ['failed'])
    const firstAttempt = await prisma.ledgerConversionJob.findUnique({
      where: { id: failed.id }, select: { startedAt: true },
    })
    const retry = await json(`/jobs/${failed.id}/retry`, 'POST')
    if (retry.status !== 'queued') throw new Error('Failed PDF retry was not queued')
    await waitFor(failed.id, ['failed'])
    const secondAttempt = await prisma.ledgerConversionJob.findUnique({
      where: { id: failed.id }, select: { startedAt: true },
    })
    if (!firstAttempt?.startedAt || !secondAttempt?.startedAt ||
      secondAttempt.startedAt <= firstAttempt.startedAt)
      throw new Error('Retry did not execute a new conversion attempt')
    await cleanupJob(failed.id)
    outstanding.delete(failed.id)
    console.log('PASS failed conversion retried, executed again, and cleaned up')

    const controlWork = await mkdtemp(join(tmpdir(), 'ledger-control-flow-'))
    try {
      const ffmpeg = originalCliEnv().FLYINGMOUSE_FFMPEG_PATH
      const sourceVideo = join(controlWork, 'long.mp4')
      execFileSync(ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i',
        'testsrc2=size=320x180:rate=12:duration=120', '-f', 'lavfi', '-i',
        'sine=frequency=440:duration=120', '-c:v', 'libx264', '-preset', 'ultrafast',
        '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', sourceVideo])
      const longUpload = await upload('long.mp4', await readFile(sourceVideo))
      const running = await json('/jobs', 'POST', {
        operationId: 'convert:webm', uploadIds: [longUpload], options: {},
      })
      outstanding.add(running.id)
      await waitFor(running.id, ['running'])
      const small = await sharp({ create: {
        width: 32, height: 24, channels: 3, background: '#008866',
      } }).png().toBuffer()
      const queuedUpload = await upload('queued.png', small)
      const queued = await json('/jobs', 'POST', {
        operationId: 'convert:webp', uploadIds: [queuedUpload], options: {},
      })
      outstanding.add(queued.id)
      if ((await json(`/jobs/${queued.id}`)).status !== 'queued')
        throw new Error('Serial worker did not leave the second job queued')
      if ((await json(`/jobs/${queued.id}/cancel`, 'POST')).status !== 'cancelled' ||
        (await json(`/jobs/${queued.id}`)).status !== 'cancelled')
        throw new Error('Queued job was not cancelled')
      if ((await json(`/jobs/${running.id}/cancel`, 'POST')).status !== 'cancelled' ||
        (await json(`/jobs/${running.id}`)).status !== 'cancelled')
        throw new Error('Running job was not cancelled')
      await cleanupJob(queued.id)
      await cleanupJob(running.id)
      outstanding.delete(queued.id)
      outstanding.delete(running.id)
      const followup = await convert('convert:webp', [['followup.png', small]])
      if ((await sharp(followup.bytes).metadata()).format !== 'webp')
        throw new Error('Worker did not recover after cancellation')
      console.log('PASS queued/running cancellation, cleanup, and worker recovery')
    } finally { await rm(controlWork, { recursive: true, force: true }) }
  }

  if (process.env.CONVERSION_LARGE_FILE) {
    const largeWork = await mkdtemp(join(tmpdir(), 'ledger-large-conversion-'))
    try {
      const ffmpeg = originalCliEnv().FLYINGMOUSE_FFMPEG_PATH
      const ffprobe = join(dirname(ffmpeg), 'ffprobe')
      const input = join(largeWork, 'long.wav')
      execFileSync(ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i',
        'sine=frequency=440:duration=600', '-ac', '2', '-ar', '44100',
        '-c:a', 'pcm_s16le', input])
      const size = (await stat(input)).size
      if (size <= 96 * 1024 ** 2) throw new Error('Large fixture did not exceed 96 MiB')
      const created = await json('/uploads', 'POST', { fileName: 'long.wav', sizeBytes: size })
      const file = await open(input, 'r')
      try {
        for (let index = 0; index < created.chunkCount; index++) {
          const offset = index * created.chunkBytes
          const part = Buffer.allocUnsafe(Math.min(created.chunkBytes, size - offset))
          const { bytesRead } = await file.read(part, 0, part.length, offset)
          if (bytesRead !== part.length) throw new Error('Large file read was truncated')
          const form = new FormData()
          form.set('index', String(index))
          form.set('file', new Blob([part]), 'chunk.bin')
          const response = await fetch(new URL(`/api/v1/l/conversions/uploads/${created.id}/chunks`, base), {
            method: 'POST', headers: auth, body: form,
          })
          const body = await response.json()
          if (!response.ok || body.code !== 0)
            throw new Error(`Large upload chunk ${index}: ${body.message || response.status}`)
        }
      } finally { await file.close() }
      await json(`/uploads/${created.id}/complete`, 'POST')
      const job = await json('/jobs', 'POST', {
        operationId: 'convert:mp3', uploadIds: [created.id], options: {},
      })
      outstanding.add(job.id)
      let result
      for (let attempt = 0; attempt < 180; attempt++) {
        result = await json(`/jobs/${job.id}`)
        if (['succeeded', 'failed', 'cancelled'].includes(result.status)) break
        await new Promise((done) => { setTimeout(done, 1000) })
      }
      if (result?.status !== 'succeeded' || !result.assets.length)
        throw new Error(`Large WAV to MP3: ${result?.status || 'timed out'} ${result?.error || ''}`)
      const response = await fetch(new URL(`/api/v1/l/conversions/jobs/${job.id}/assets/${result.assets[0].id}`, base), {
        headers: auth,
      })
      if (!response.ok) throw new Error(`Large MP3 download failed: ${response.status}`)
      const backend = join(largeWork, 'backend.mp3')
      const direct = join(largeWork, 'direct.mp3')
      await writeFile(backend, Buffer.from(await response.arrayBuffer()))
      execFileSync(process.execPath, [join(engineSource, 'cli.js'), 'convert', input,
        '--to', 'mp3', '--output', direct, '--json'], { env: originalCliEnv(), timeout: 180000 })
      const duration = (path) => Number(JSON.parse(execFileSync(ffprobe, ['-v', 'error',
        '-show_entries', 'format=duration', '-of', 'json', path], { encoding: 'utf8' })).format.duration)
      if (Math.abs(duration(backend) - 600) > 0.15 ||
        Math.abs(duration(backend) - duration(direct)) > 0.01)
        throw new Error('Large MP3 duration differs from original')
      for (const offset of [0, 300, 597]) {
        const pcm = (path) => execFileSync(ffmpeg, ['-v', 'error', '-ss', String(offset),
          '-i', path, '-t', '2', '-ac', '1', '-ar', '16000', '-f', 's16le', 'pipe:1'])
        const first = pcm(backend)
        if (first.length < 60000 || !first.equals(pcm(direct)))
          throw new Error(`Large MP3 at ${offset}s differs from original or is truncated`)
      }
      await cleanupJob(job.id)
      outstanding.delete(job.id)
      console.log(`PASS ${(size / 1024 ** 2).toFixed(1)} MiB WAV upload, MP3 conversion/download and cleanup`)
    } finally { await rm(largeWork, { recursive: true, force: true }) }
  }

  if (process.env.CONVERSION_VIDEO_INPUTS) {
    const videoWork = await mkdtemp(join(tmpdir(), 'ledger-video-pairs-'))
    try {
      const source = engineSource
      const ffmpeg = originalCliEnv().FLYINGMOUSE_FFMPEG_PATH
      const ffprobe = join(dirname(ffmpeg), 'ffprobe')
      const catalog = require('../src/modules/ledger-conversion/conversion.catalog.json')
      const master = join(videoWork, 'master.mp4')
      execFileSync(ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i',
        'testsrc2=size=320x180:rate=12:duration=3', '-f', 'lavfi', '-i',
        'sine=frequency=440:duration=3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-shortest', master])
      const formats = {
        avi: ['-c:v', 'mpeg4', '-c:a', 'libmp3lame', '-f', 'avi'],
        flv: ['-c:v', 'flv', '-c:a', 'libmp3lame', '-f', 'flv'],
        m4s: ['-c', 'copy', '-movflags', 'frag_keyframe+empty_moov', '-f', 'mp4'],
        m4v: ['-c', 'copy', '-f', 'mp4'],
        wmv: ['-c:v', 'wmv2', '-c:a', 'wmav2', '-f', 'asf'],
        mkv: ['-c', 'copy', '-f', 'matroska'],
        mov: ['-c', 'copy', '-f', 'mov'],
        webm: ['-c:v', 'libvpx-vp9', '-b:v', '350k', '-c:a', 'libopus', '-f', 'webm'],
      }
      const probe = (file) => JSON.parse(execFileSync(ffprobe, ['-v', 'error',
        '-show_entries', 'stream=codec_name,codec_type,width,height:format=duration',
        '-of', 'json', file], { encoding: 'utf8' }))
      const audio = (file) => {
        const pcm = execFileSync(ffmpeg, ['-v', 'error', '-i', file, '-map', '0:a:0',
          '-ac', '1', '-ar', '16000', '-f', 's16le', 'pipe:1'])
        let energy = 0
        for (let index = 0; index < pcm.length; index += 2)
          energy += pcm.readInt16LE(index) ** 2
        if (pcm.length < 80000 || Math.sqrt(energy / (pcm.length / 2)) < 100)
          throw new Error(`${file}: missing or silent three-second audio`)
        return pcm
      }
      const frames = (file) => execFileSync(ffmpeg, ['-v', 'error', '-i', file,
        '-vf', 'fps=1', '-frames:v', '3', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1'],
      { maxBuffer: 2 * 1024 ** 2 })
      for (const inputExtension of process.env.CONVERSION_VIDEO_INPUTS.split(',')) {
        if (!['avi', 'flv', 'm4s', 'm4v', 'wmv', 'mkv', 'mov', 'mp4', 'webm'].includes(inputExtension))
          throw new Error(`Unsupported video fixture generator: ${inputExtension}`)
        const input = inputExtension === 'mp4' ? master : join(videoWork, `input.${inputExtension}`)
        if (inputExtension !== 'mp4')
          execFileSync(ffmpeg, ['-v', 'error', '-i', master, ...formats[inputExtension], input])
        const fixture = await readFile(input)
        const inputInfo = probe(input)
        if (!inputInfo.streams.some((stream) => stream.codec_type === 'video') ||
          !inputInfo.streams.some((stream) => stream.codec_type === 'audio'))
          throw new Error(`${inputExtension}: fixture must have video and audio`)
        const targets = catalog.operations.filter((operation) => operation.kind === 'convert' &&
          operation.inputExtensions.includes(inputExtension)).map((operation) => operation.targetExtension)
        for (const target of targets) {
          const label = `${inputExtension}-${target}`
          const backend = await convert(`convert:${target}`, [[`input.${inputExtension}`, fixture]])
          const backendPath = join(videoWork, `backend-${label}.${target}`)
          const directPath = join(videoWork, `direct-${label}.${target}`)
          await writeFile(backendPath, backend.bytes)
          execFileSync(process.execPath, [join(source, 'cli.js'), 'convert', input,
            '--to', target, '--output', directPath, '--json'], { env: originalCliEnv() })
          const first = probe(backendPath)
          const second = probe(directPath)
          const firstVideo = first.streams.find((stream) => stream.codec_type === 'video')
          const secondVideo = second.streams.find((stream) => stream.codec_type === 'video')
          const firstAudio = first.streams.find((stream) => stream.codec_type === 'audio')
          const secondAudio = second.streams.find((stream) => stream.codec_type === 'audio')
          if (Math.abs(Number(first.format.duration) - 3) > 0.25 ||
            Math.abs(Number(first.format.duration) - Number(second.format.duration)) > 0.03)
            throw new Error(`${label}: duration ${first.format.duration}s differs from ` +
              `source 3s or original ${second.format.duration}s`)
          if (['gif', 'mkv', 'mov', 'mp4', 'webm'].includes(target)) {
            if (!firstVideo || !secondVideo || firstVideo.codec_name !== secondVideo.codec_name ||
              firstVideo.width !== secondVideo.width || firstVideo.height !== secondVideo.height ||
              firstVideo.width < 300 || firstVideo.height < 170)
              throw new Error(`${label}: video codec or dimensions differ from original`)
            const rendered = frames(backendPath)
            if (rendered.length !== 3 * firstVideo.width * firstVideo.height * 3 ||
              rendered.subarray(0, rendered.length / 3).equals(rendered.subarray(2 * rendered.length / 3)) ||
              !rendered.equals(frames(directPath)))
              throw new Error(`${label}: decoded video frames missing, static, or differ from original`)
            if (target === 'gif') {
              if (firstAudio || secondAudio) throw new Error(`${label}: GIF unexpectedly has audio`)
            } else if (!firstAudio || !secondAudio ||
              firstAudio.codec_name !== secondAudio.codec_name ||
              !audio(backendPath).equals(audio(directPath)))
              throw new Error(`${label}: audio track differs from original`)
          } else if (firstVideo || secondVideo || !firstAudio || !secondAudio ||
            firstAudio.codec_name !== secondAudio.codec_name ||
            !audio(backendPath).equals(audio(directPath)))
            throw new Error(`${label}: extracted audio differs from original`)
          execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
            '--record', inputExtension, target, createHash('sha256').update(fixture).digest('hex'),
            'moving video with audio: direct original and authenticated backend, codec/duration/frames/audio compared'])
          console.log(`PASS ${inputExtension}:${target}, video or audio matches direct original`)
        }
      }
    } finally { await rm(videoWork, { recursive: true, force: true }) }
  }

  if (process.env.CONVERSION_SUBTITLE_INPUTS) {
    const subtitleWork = await mkdtemp(join(tmpdir(), 'ledger-subtitle-pairs-'))
    try {
      const source = engineSource
      const catalog = require('../src/modules/ledger-conversion/conversion.catalog.json')
      const cues = ['量窗助手 第一行', '第二行 12345']
      const sources = {
        srt: '1\n00:00:01,000 --> 00:00:02,000\n量窗助手 第一行\n\n' +
          '2\n00:00:02,500 --> 00:00:03,700\n第二行 12345\n',
        vtt: 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n量窗助手 第一行\n\n' +
          '00:00:02.500 --> 00:00:03.700\n第二行 12345\n',
        ass: '[Script Info]\nScriptType: v4.00+\n\n[Events]\n' +
          'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n' +
          'Dialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,量窗助手 第一行\n' +
          'Dialogue: 0,0:00:02.50,0:00:03.70,Default,,0,0,0,,第二行 12345\n',
        ssa: '[Script Info]\nScriptType: v4.00\n\n[Events]\n' +
          'Format: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n' +
          'Dialogue: Marked=0,0:00:01.00,0:00:02.00,Default,,0,0,0,,量窗助手 第一行\n' +
          'Dialogue: Marked=0,0:00:02.50,0:00:03.70,Default,,0,0,0,,第二行 12345\n',
      }
      for (const inputExtension of process.env.CONVERSION_SUBTITLE_INPUTS.split(',')) {
        if (!Object.hasOwn(sources, inputExtension))
          throw new Error(`Unsupported subtitle fixture generator: ${inputExtension}`)
        const fixture = Buffer.from(sources[inputExtension])
        const input = join(subtitleWork, `input.${inputExtension}`)
        await writeFile(input, fixture)
        const targets = catalog.operations.filter((operation) => operation.kind === 'convert' &&
          operation.inputExtensions.includes(inputExtension)).map((operation) => operation.targetExtension)
        for (const target of targets) {
          const backend = await convert(`convert:${target}`, [[`input.${inputExtension}`, fixture]])
          const directPath = join(subtitleWork, `direct-${inputExtension}.${target}`)
          execFileSync(process.execPath, [join(source, 'cli.js'), 'convert', input,
            '--to', target, '--output', directPath, '--json'], { env: originalCliEnv() })
          const result = backend.bytes.toString('utf8')
          if (result !== await readFile(directPath, 'utf8') ||
            cues.some((cue) => !result.includes(cue)) ||
            (result.match(/量窗助手 第一行/g) || []).length !== 1 ||
            (result.match(/第二行 12345/g) || []).length !== 1)
            throw new Error(`${inputExtension} to ${target}: cue text differs from original`)
          if (target === 'txt') {
            if (result.includes('00:00:01') || result.includes('Dialogue:'))
              throw new Error(`${inputExtension} to TXT: timing not removed`)
          } else if (target === 'srt' || target === 'vtt') {
            const separator = target === 'srt' ? ',' : '.'
            if (!result.includes(`00:00:01${separator}000 --> 00:00:02${separator}000`) ||
              !result.includes(`00:00:02${separator}500 --> 00:00:03${separator}700`))
              throw new Error(`${inputExtension} to ${target}: cue timing changed`)
          } else if ((result.match(/^Dialogue:/gm) || []).length !== 2 ||
            !result.includes('0:00:01.00,0:00:02.00') ||
            !result.includes('0:00:02.50,0:00:03.70'))
            throw new Error(`${inputExtension} to ${target}: ASS/SSA timing changed`)
          execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
            '--record', inputExtension, target, createHash('sha256').update(fixture).digest('hex'),
            'two Chinese timed cues: direct original and authenticated backend, text/timing checked'])
          console.log(`PASS ${inputExtension}:${target}, text and timing match direct original`)
        }
      }
    } finally { await rm(subtitleWork, { recursive: true, force: true }) }
  }

  if (process.env.CONVERSION_EPUB) {
    const ebookWork = await mkdtemp(join(tmpdir(), 'ledger-epub-pairs-'))
    try {
      const source = engineSource
      const markdown = join(ebookWork, 'chapters.md')
      const input = join(ebookWork, 'chapters.epub')
      await writeFile(markdown, '# 第一章 量窗助手\n中文正文与数值 12345。\n\n' +
        '# 第二章 经营分析\n第二段内容和数值 67890。\n')
      execFileSync(process.execPath, [join(source, 'cli.js'), 'convert', markdown,
        '--to', 'epub', '--output', input, '--json'], { env: originalCliEnv() })
      execFileSync('unzip', ['-tqq', input])
      if (execFileSync('unzip', ['-p', input, 'mimetype'], { encoding: 'utf8' }) !== 'application/epub+zip')
        throw new Error('EPUB fixture lacks the required mimetype')
      const fixture = await readFile(input)
      const catalog = require('../src/modules/ledger-conversion/conversion.catalog.json')
      const targets = catalog.operations.filter((operation) => operation.kind === 'convert' &&
        operation.inputExtensions.includes('epub')).map((operation) => operation.targetExtension)
        .filter((target) => !process.env.CONVERSION_EPUB_TARGETS ||
          process.env.CONVERSION_EPUB_TARGETS.split(',').includes(target))
      const content = async (file, target) => {
        if (target === 'pdf') {
          const pages = (await PDFDocument.load(await readFile(file))).getPageCount()
          if (pages < 1) throw new Error(`${file}: EPUB produced an empty PDF`)
          return execFileSync(join(dirname(originalCliEnv().FLYINGMOUSE_PDFTOPPM_PATH), 'pdftotext'),
            [file, '-'], { encoding: 'utf8' })
        }
        if (target === 'docx') {
          execFileSync('unzip', ['-tqq', file])
          return execFileSync('unzip', ['-p', file, 'word/document.xml'], { encoding: 'utf8' })
            .replace(/<[^>]+>/g, '')
        }
        const value = await readFile(file, 'utf8')
        return target === 'html' ? value.replace(/<[^>]+>/g, '') : value
      }
      for (const target of targets) {
        const backend = await convert(`convert:${target}`, [['chapters.epub', fixture]])
        const backendPath = join(ebookWork, `backend.${target}`)
        const directPath = join(ebookWork, `direct.${target}`)
        await writeFile(backendPath, backend.bytes)
        execFileSync(process.execPath, [join(source, 'cli.js'), 'convert', input,
          '--to', target, '--output', directPath, '--json'], { env: originalCliEnv() })
        const result = (await content(backendPath, target)).replace(/\s+/g, '')
        if (result !== (await content(directPath, target)).replace(/\s+/g, '') ||
          !result.includes('第一章') || !result.includes('第二章') ||
          !result.includes('量窗助手') || !result.includes('12345') || !result.includes('67890'))
          throw new Error(`EPUB to ${target}: chapters or Chinese text differ from original`)
        execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
          '--record', 'epub', target, createHash('sha256').update(fixture).digest('hex'),
          'two-chapter Chinese EPUB: direct original and authenticated backend, decoded chapters checked'])
        console.log(`PASS epub:${target}, two chapters match direct original`)
      }
    } finally { await rm(ebookWork, { recursive: true, force: true }) }
  }

  if (process.env.CONVERSION_MOBI) {
    const mobiWork = await mkdtemp(join(tmpdir(), 'ledger-mobi-pairs-'))
    try {
      const source = engineSource
      const html = Buffer.from('<h1>第一章 量窗助手</h1><p>中文正文 12345</p>' +
        '<h1>第二章 经营分析</h1><p>第二段 67890</p>')
      const record = Buffer.alloc(40)
      record.writeUInt16BE(1, 0)
      record.writeUInt32BE(html.length, 4)
      record.writeUInt16BE(1, 8)
      record.writeUInt16BE(4096, 10)
      record.write('MOBI', 16)
      record.writeUInt32BE(24, 20)
      record.writeUInt32BE(65001, 28)
      record.writeUInt32BE(6, 36)
      const header = Buffer.alloc(96)
      header.writeUInt16BE(2, 76)
      header.writeUInt32BE(header.length, 78)
      header.writeUInt32BE(header.length + record.length, 86)
      const fixture = Buffer.concat([header, record, html])
      const input = join(mobiWork, 'chapters.mobi')
      await writeFile(input, fixture)
      const { parseMobiText } = require(`${source}/ebook.js`)
      if (parseMobiText(fixture) !== html.toString('utf8'))
        throw new Error('PalmDOC MOBI fixture does not decode to its source HTML')
      const catalog = require('../src/modules/ledger-conversion/conversion.catalog.json')
      const targets = catalog.operations.filter((operation) => operation.kind === 'convert' &&
        operation.inputExtensions.includes('mobi')).map((operation) => operation.targetExtension)
      const content = async (file, target) => {
        if (target !== 'epub') return readFile(file, 'utf8')
        execFileSync('unzip', ['-tqq', file])
        const entries = execFileSync('unzip', ['-Z', '-1', file], { encoding: 'utf8' })
          .trim().split('\n').filter((entry) => entry.endsWith('.xhtml'))
        if (!entries.length) throw new Error(`${file}: EPUB has no XHTML chapter`)
        return entries.map((entry) => execFileSync('unzip', ['-p', file, entry], { encoding: 'utf8' }))
          .join('\n').replace(/<[^>]+>/g, '')
      }
      for (const target of targets) {
        const backend = await convert(`convert:${target}`, [['chapters.mobi', fixture]])
        const backendPath = join(mobiWork, `backend.${target}`)
        const directPath = join(mobiWork, `direct.${target}`)
        await writeFile(backendPath, backend.bytes)
        execFileSync(process.execPath, [join(source, 'cli.js'), 'convert', input,
          '--to', target, '--output', directPath, '--json'], { env: originalCliEnv() })
        const result = (await content(backendPath, target)).replace(/\s+/g, '')
        if (result !== (await content(directPath, target)).replace(/\s+/g, '') ||
          !result.includes('第一章') || !result.includes('第二章') ||
          !result.includes('量窗助手') || !result.includes('12345') || !result.includes('67890'))
          throw new Error(`MOBI to ${target}: chapters or Chinese text differ from original`)
        execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
          '--record', 'mobi', target, createHash('sha256').update(fixture).digest('hex'),
          'valid two-chapter UTF-8 PalmDOC MOBI: direct original and authenticated backend, decoded content checked'])
        console.log(`PASS mobi:${target}, two chapters match direct original`)
      }
    } finally { await rm(mobiWork, { recursive: true, force: true }) }
  }

  if (process.env.CONVERSION_DOCUMENT_INPUTS) {
    if (!process.env.CONVERSION_SAMPLE_DOCX)
      throw new Error('CONVERSION_DOCUMENT_INPUTS requires CONVERSION_SAMPLE_DOCX')
    const documentWork = await mkdtemp(join(tmpdir(), 'ledger-document-pairs-'))
    try {
      const source = engineSource
      const catalog = require('../src/modules/ledger-conversion/conversion.catalog.json')
      const sourceXml = execFileSync('unzip', ['-p', process.env.CONVERSION_SAMPLE_DOCX,
        'word/document.xml'], { encoding: 'utf8' })
      const sourceText = [...sourceXml.matchAll(/<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/g)]
        .map((match) => match[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'"))
        .join('').replace(/\s+/g, '')
      if (process.env.CONVERSION_REQUIRE_OFFICE_STRUCTURE &&
        (!/<w:tbl(?:\s|>)/.test(sourceXml) || !execFileSync('unzip',
        ['-Z', '-1', process.env.CONVERSION_SAMPLE_DOCX], { encoding: 'utf8' })
        .split('\n').some((name) => name.startsWith('word/media/') && !name.endsWith('/'))))
        throw new Error('Document fixture requires an editable table and embedded image')
      const chunks = []
      for (let index = 0; index + 10 <= sourceText.length; index += 10)
        chunks.push(sourceText.slice(index, index + 10))
      if (chunks.length < 10) throw new Error('Document fixture has too little source text')
      const extract = async (file, target) => {
        if (target === 'pdf') {
          if ((await PDFDocument.load(await readFile(file))).getPageCount() < 1)
            throw new Error(`${file}: PDF has no pages`)
          return execFileSync(join(dirname(originalCliEnv().FLYINGMOUSE_PDFTOPPM_PATH), 'pdftotext'),
            [file, '-'], { encoding: 'utf8' })
        }
        if (target === 'docx' || target === 'odt') {
          execFileSync('unzip', ['-tqq', file])
          const entry = target === 'docx' ? 'word/document.xml' : 'content.xml'
          return execFileSync('unzip', ['-p', file, entry], { encoding: 'utf8' })
            .replace(/<[^>]+>/g, '')
        }
        if (target === 'rtf') return rtfText(file)
        const value = await readFile(file, 'utf8')
        return target === 'html' ? value.replace(/<[^>]+>/g, '') : value
      }
      for (const inputExtension of process.env.CONVERSION_DOCUMENT_INPUTS.split(',')) {
        if (!['odt', 'rtf', 'doc'].includes(inputExtension))
          throw new Error(`Unsupported document fixture generator: ${inputExtension}`)
        const input = join(documentWork, `input.${inputExtension}`)
        if (inputExtension === 'doc') {
          execFileSync(originalCliEnv().FLYINGMOUSE_LIBREOFFICE_PATH,
            [`-env:UserInstallation=${pathToFileURL(join(documentWork, 'source-doc-profile')).href}`,
              '--headless', '--convert-to', 'doc:MS Word 97', '--outdir', documentWork,
              process.env.CONVERSION_SAMPLE_DOCX])
          const generated = join(documentWork,
            basename(process.env.CONVERSION_SAMPLE_DOCX).replace(/\.docx$/i, '.doc'))
          await writeFile(input, await readFile(generated))
        } else execFileSync(process.execPath, [join(source, 'cli.js'), 'convert',
          process.env.CONVERSION_SAMPLE_DOCX, '--to', inputExtension,
          '--output', input, '--json'], { env: originalCliEnv() })
        const fixture = await readFile(input)
        const targets = catalog.operations.filter((operation) => operation.kind === 'convert' &&
          operation.inputExtensions.includes(inputExtension)).map((operation) => operation.targetExtension)
        for (const target of targets) {
          const label = `${inputExtension}-${target}`
          const backend = await convert(`convert:${target}`, [[`input.${inputExtension}`, fixture]])
          const backendPath = join(documentWork, `backend-${label}.${target}`)
          const directPath = join(documentWork, `direct-${label}.${target}`)
          await writeFile(backendPath, backend.bytes)
          execFileSync(process.execPath, [join(source, 'cli.js'), 'convert', input,
            '--to', target, '--output', directPath, '--json'], { env: originalCliEnv() })
          const result = (await extract(backendPath, target)).replace(/\s+/g, '')
          if (result !== (await extract(directPath, target)).replace(/\s+/g, '') ||
            chunks.filter((part) => result.includes(part)).length / chunks.length < 0.7)
            throw new Error(`${label}: decoded text differs from original or lost source text`)
          if (target === 'docx' && process.env.CONVERSION_REQUIRE_OFFICE_STRUCTURE) {
            const structure = (file) => ({
              tables: (execFileSync('unzip', ['-p', file, 'word/document.xml'],
                { encoding: 'utf8' }).match(/<w:tbl(?:\s|>)/g) || []).length,
              images: execFileSync('unzip', ['-Z', '-1', file], { encoding: 'utf8' })
                .split('\n').filter((name) => name.startsWith('word/media/') && !name.endsWith('/')).length,
            })
            const directStructure = structure(directPath)
            const backendStructure = structure(backendPath)
            if (directStructure.tables < 1 || directStructure.images < 1 ||
              JSON.stringify(directStructure) !== JSON.stringify(backendStructure))
              throw new Error(`${label}: editable table or embedded image was lost`)
          }
          execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
            '--record', inputExtension, target, createHash('sha256').update(fixture).digest('hex'),
            'real Chinese document roundtrip: direct original and authenticated backend, decoded text retained'])
          console.log(`PASS ${inputExtension}:${target}, Chinese text matches direct original`)
        }
      }
    } finally { await rm(documentWork, { recursive: true, force: true }) }
  }

  if (process.env.CONVERSION_LEGACY_DOCUMENT_SAMPLE) {
    const inputExtension = process.env.CONVERSION_LEGACY_DOCUMENT_SAMPLE.split('.').pop().toLowerCase()
    if (!['wps', 'wpt', 'wpd'].includes(inputExtension))
      throw new Error('Legacy document sample must be WPS, WPT or WPD')
    if (!process.env.CONVERSION_LEGACY_EXPECT)
      throw new Error('Legacy document sample requires CONVERSION_LEGACY_EXPECT')
    const work = await mkdtemp(join(tmpdir(), 'ledger-legacy-document-'))
    try {
      const input = join(work, `input.${inputExtension}`)
      const fixture = await readFile(process.env.CONVERSION_LEGACY_DOCUMENT_SAMPLE)
      await writeFile(input, fixture)
      const normalize = (value) => value.replace(/\s+/g, '')
      const expected = process.env.CONVERSION_LEGACY_EXPECT.split('|').map(normalize)
      const supported = require('../src/modules/ledger-conversion/conversion.catalog.json').operations
        .filter((operation) => operation.kind === 'convert' &&
          operation.inputExtensions.includes(inputExtension))
        .map((operation) => operation.targetExtension)
      const targets = process.env.CONVERSION_LEGACY_DOCUMENT_TARGETS?.split(',') || supported
      if (targets.some((target) => !supported.includes(target)))
        throw new Error(`Unsupported legacy document target for ${inputExtension}`)
      const extract = async (file, target) => {
        if (target === 'pdf') return normalize(execFileSync(
          join(dirname(originalCliEnv().FLYINGMOUSE_PDFTOPPM_PATH), 'pdftotext'),
          [file, '-'], { encoding: 'utf8' }))
        if (target === 'html') return normalize((await readFile(file, 'utf8')).replace(/<[^>]+>/g, ''))
        if (target === 'md' || target === 'txt') return normalize(await readFile(file, 'utf8'))
        if (target === 'docx' || target === 'odt') {
          execFileSync('unzip', ['-tqq', file])
          return normalize(execFileSync('unzip', ['-p', file,
            target === 'docx' ? 'word/document.xml' : 'content.xml'], { encoding: 'utf8' })
            .replace(/<[^>]+>/g, ''))
        }
        if (target === 'rtf') return normalize(rtfText(file))
        throw new Error(`Unexpected legacy document target ${target}`)
      }
      const failures = []
      for (const target of targets) {
        let stage = 'backend'
        try {
        const backend = await convert(`convert:${target}`, [[`input.${inputExtension}`, fixture]])
        const backendPath = join(work, `backend-${target}.${target}`)
        const directPath = join(work, `direct-${target}.${target}`)
        await writeFile(backendPath, backend.bytes)
        stage = 'original'
        execFileSync(process.execPath, [join(engineSource, 'cli.js'), 'convert', input,
          '--to', target, '--output', directPath, '--json'], { env: originalCliEnv() })
        stage = 'quality'
        const backendText = await extract(backendPath, target)
        const directText = await extract(directPath, target)
        const coverage = expected.filter((part) => backendText.includes(part)).length / expected.length
        if (backendText !== directText || coverage < 1)
          throw new Error(`${inputExtension} to ${target}: same=${backendText === directText} ` +
            `source coverage=${coverage.toFixed(2)} backendLength=${backendText.length} ` +
            `directLength=${directText.length}`)
        if (target === 'docx' && process.env.CONVERSION_LEGACY_DOCUMENT_REQUIRE_STRUCTURE) {
          const structure = (file) => ({
            tables: (execFileSync('unzip', ['-p', file, 'word/document.xml'],
              { encoding: 'utf8' }).match(/<w:tbl(?:\s|>)/g) || []).length,
            images: execFileSync('unzip', ['-Z', '-1', file], { encoding: 'utf8' })
              .split('\n').filter((name) => name.startsWith('word/media/') && !name.endsWith('/')).length,
          })
          const directStructure = structure(directPath)
          const backendStructure = structure(backendPath)
          if (directStructure.tables < 1 || directStructure.images < 1 ||
            JSON.stringify(directStructure) !== JSON.stringify(backendStructure))
            throw new Error(`${inputExtension} to DOCX lost editable table or embedded image`)
        }
        execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
          '--record', inputExtension, target, createHash('sha256').update(fixture).digest('hex'),
          'legacy document sample: direct original and authenticated backend, known phrases checked'])
        console.log(`PASS ${inputExtension}:${target}, source text matches direct original`)
        } catch (error) {
          const message = `${inputExtension}:${target}: ${error.message}`
          failures.push(message)
          execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
            '--fail', inputExtension, target, stage, createHash('sha256').update(fixture).digest('hex'), message])
          console.error(`FAIL ${message}`)
        }
      }
      if (failures.length) throw new Error(`${failures.length} ${inputExtension} pairs failed; see pair evidence`)
    } finally { await rm(work, { recursive: true, force: true }) }
  }

  if (process.env.CONVERSION_LEGACY_SHEET_SAMPLE) {
    const inputExtension = process.env.CONVERSION_LEGACY_SHEET_SAMPLE.split('.').pop().toLowerCase()
    if (!['et', 'ett'].includes(inputExtension) || !process.env.CONVERSION_LEGACY_SHEET_EXPECT)
      throw new Error('Legacy sheet sample requires ET/ETT and expected cell text')
    const work = await mkdtemp(join(tmpdir(), 'ledger-legacy-sheet-'))
    try {
      const input = join(work, `input.${inputExtension}`)
      const fixture = await readFile(process.env.CONVERSION_LEGACY_SHEET_SAMPLE)
      await writeFile(input, fixture)
      const expected = process.env.CONVERSION_LEGACY_SHEET_EXPECT.split('|')
        .map((value) => value.replace(/\s+/g, ''))
      const ExcelJS = require(join(engineSource, 'node_modules/exceljs'))
      const inspect = async (file, target, label) => {
        if (['csv', 'html', 'pdf'].includes(target)) {
          const value = target === 'pdf' ? execFileSync(
            join(dirname(originalCliEnv().FLYINGMOUSE_PDFTOPPM_PATH), 'pdftotext'),
            [file, '-'], { encoding: 'utf8' }) : await readFile(file, 'utf8')
          const text = value.replace(/<[^>]+>/g, '').replace(/\s+/g, '')
          if (expected.some((part) => !text.includes(part)))
            throw new Error(`${label}: ${target} lost known cells`)
          if (target === 'pdf' && (await PDFDocument.load(await readFile(file))).getPageCount() < 1)
            throw new Error(`${label}: ${target} lost pages`)
          return text
        }
        let workbookPath = file
        if (target !== 'xlsx') {
          const outdir = join(work, `xlsx-${label}`)
          await mkdir(outdir)
          execFileSync(originalCliEnv().FLYINGMOUSE_LIBREOFFICE_PATH,
            [`-env:UserInstallation=${pathToFileURL(join(work, `profile-${label}`)).href}`,
              '--headless', '--convert-to', 'xlsx', '--outdir', outdir, file])
          workbookPath = join(outdir, `${label}.xlsx`)
        }
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.readFile(workbookPath)
        const sheets = workbook.worksheets.map((sheet) => {
          const cells = []
          sheet.eachRow({ includeEmpty: false }, (row) => row.eachCell({ includeEmpty: false },
            (cell) => cells.push([cell.address, cell.value])))
          return [sheet.name, cells]
        })
        const flat = JSON.stringify(sheets).replace(/\s+/g, '')
        const formulas = (flat.match(/"formula":/g) || []).length
        if (workbook.worksheets.length < Number(process.env.CONVERSION_LEGACY_SHEET_MIN_SHEETS || 1) ||
          formulas < Number(process.env.CONVERSION_LEGACY_SHEET_MIN_FORMULAS || 0) ||
          expected.some((part) => !flat.includes(part)))
          throw new Error(`${label}: ${target} lost sheets, formulas, or known cells`)
        return JSON.stringify(sheets)
      }
      const targets = require('../src/modules/ledger-conversion/conversion.catalog.json').operations
        .filter((operation) => operation.kind === 'convert' &&
          operation.inputExtensions.includes(inputExtension))
        .map((operation) => operation.targetExtension)
      const failures = []
      for (const target of targets) {
        let stage = 'backend'
        try {
        const backend = await convert(`convert:${target}`, [[`input.${inputExtension}`, fixture]])
        const backendPath = join(work, `backend-${target}.${target}`)
        const directPath = join(work, `direct-${target}.${target}`)
        await writeFile(backendPath, backend.bytes)
        stage = 'original'
        execFileSync(process.execPath, [join(engineSource, 'cli.js'), 'convert', input,
          '--to', target, '--output', directPath, '--json'], { env: originalCliEnv() })
        stage = 'quality'
        if ((await inspect(backendPath, target, `backend-${target}`)) !==
          (await inspect(directPath, target, `direct-${target}`)))
          throw new Error(`${inputExtension} to ${target}: workbook differs from original`)
        execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
          '--record', inputExtension, target, createHash('sha256').update(fixture).digest('hex'),
          'legacy sheet: direct original and authenticated backend, cells and formulas checked'])
        console.log(`PASS ${inputExtension}:${target}, cells match direct original`)
        } catch (error) {
          const message = `${inputExtension}:${target}: ${error.message}`
          failures.push(message)
          execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
            '--fail', inputExtension, target, stage, createHash('sha256').update(fixture).digest('hex'), message])
          console.error(`FAIL ${message}`)
        }
      }
      if (failures.length) throw new Error(`${failures.length} ${inputExtension} pairs failed; see pair evidence`)
    } finally { await rm(work, { recursive: true, force: true }) }
  }

  if (process.env.CONVERSION_PDF_TEXT) {
    if (!process.env.CONVERSION_PDF_SIMPLE && !process.env.CONVERSION_SAMPLE_DOCX)
      throw new Error('CONVERSION_PDF_TEXT requires CONVERSION_SAMPLE_DOCX')
    const pdfWork = await mkdtemp(join(tmpdir(), 'ledger-pdf-text-pairs-'))
    try {
      const source = engineSource
      const input = join(pdfWork, 'input.pdf')
      let sourceFile = process.env.CONVERSION_SAMPLE_DOCX
      if (process.env.CONVERSION_PDF_SIMPLE) {
        sourceFile = join(pdfWork, 'input.txt')
        await writeFile(sourceFile, '量窗助手转换验收：这是第一段中文正文，包含门窗订单、客户资料和成本记录。' +
          '请保留文字顺序、标点与数字 12345。\n\n第二段记录经营分析：本月营收 67890 元，' +
          '订单数量 37，平均利润 245 元。转换后必须能够正常编辑这些完整内容。\n\n' +
          '第三段再次检查长句和中文字符：铝合金门窗、玻璃、五金配件与安装工序均应完整保留。\n')
      }
      execFileSync(process.execPath, [join(source, 'cli.js'), 'convert',
        sourceFile, '--to', 'pdf', '--output', input, '--json'],
      { env: originalCliEnv() })
      const fixture = await readFile(input)
      if ((await PDFDocument.load(fixture)).getPageCount() !== 1)
        throw new Error('PDF text fixture must have one page for single-image outputs')
      const pdftotext = join(dirname(originalCliEnv().FLYINGMOUSE_PDFTOPPM_PATH), 'pdftotext')
      const sourceText = execFileSync(pdftotext, [input, '-'], { encoding: 'utf8' })
        .replace(/\s+/g, '')
      const chunks = []
      for (let index = 0; index + 10 <= sourceText.length; index += 10)
        chunks.push(sourceText.slice(index, index + 10))
      if (chunks.length < 10) throw new Error('PDF fixture has insufficient extractable Chinese text')
      const catalog = require('../src/modules/ledger-conversion/conversion.catalog.json')
      const targets = catalog.operations.filter((operation) => operation.kind === 'convert' &&
        operation.inputExtensions.includes('pdf')).map((operation) => operation.targetExtension)
        .filter((target) => !['pdf', 'xlsx'].includes(target) &&
          (!process.env.CONVERSION_PDF_TARGETS ||
            process.env.CONVERSION_PDF_TARGETS.split(',').includes(target)))
      for (const target of targets) {
        const backend = await convert(`convert:${target}`, [['input.pdf', fixture]])
        const backendPath = join(pdfWork, `backend.${target}`)
        const directPath = join(pdfWork, `direct.${target}`)
        await writeFile(backendPath, backend.bytes)
        execFileSync(process.execPath, [join(source, 'cli.js'), 'convert', input,
          '--to', target, '--output', directPath, '--json'], { env: originalCliEnv() })
        if (['jpg', 'png', 'webp'].includes(target)) {
          const first = await sharp(backend.bytes).metadata()
          const second = await sharp(directPath).metadata()
          if (first.width !== second.width || first.height !== second.height ||
            first.width < 500 || first.height < 500)
            throw new Error(`PDF to ${target}: image dimensions differ from original`)
          const preview = async (file) => sharp(file).resize(300, 300, { fit: 'inside' })
            .removeAlpha().raw().toBuffer()
          if (!(await preview(backend.bytes)).equals(await preview(directPath)))
            throw new Error(`PDF to ${target}: decoded pixels differ from original`)
        } else {
          const extract = (file) => {
            if (target !== 'docx') {
              const value = require('node:fs').readFileSync(file, 'utf8')
              return target === 'html' ? value.replace(/<[^>]+>/g, '') : value
            }
            execFileSync('unzip', ['-tqq', file])
            return execFileSync('unzip', ['-p', file, 'word/document.xml'], { encoding: 'utf8' })
              .replace(/<[^>]+>/g, '')
          }
          const result = extract(backendPath).replace(/\s+/g, '')
          if (result !== extract(directPath).replace(/\s+/g, '') ||
            chunks.filter((part) => result.includes(part)).length / chunks.length < 0.7)
            throw new Error(`PDF to ${target}: Chinese text differs from original or source`)
        }
        execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
          '--record', 'pdf', target, createHash('sha256').update(fixture).digest('hex'),
          'real Chinese text-layer PDF: direct original and authenticated backend, text or pixels checked'])
        console.log(`PASS pdf:${target}, text or image matches direct original`)
      }
    } finally { await rm(pdfWork, { recursive: true, force: true }) }
  }

  if (process.env.CONVERSION_PDF_TABLE) {
    const work = await mkdtemp(join(tmpdir(), 'ledger-pdf-table-pair-'))
    try {
      const pdf = await PDFDocument.create()
      const page = pdf.addPage([400, 300])
      const font = await pdf.embedFont(StandardFonts.Helvetica)
      const rows = [['Name', 'Value'], ['Window', '315.50']]
      rows.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
        page.drawText(value, { x: 70 + columnIndex * 130, y: 205 - rowIndex * 70,
          size: 22, font })
      }))
      for (const x of [60, 180, 310]) page.drawLine({
        start: { x, y: 80 }, end: { x, y: 240 }, thickness: 2,
      })
      for (const y of [80, 160, 240]) page.drawLine({
        start: { x: 60, y }, end: { x: 310, y }, thickness: 2,
      })
      const fixture = Buffer.from(await pdf.save())
      const input = join(work, 'input.pdf')
      const direct = join(work, 'direct.xlsx')
      const backend = join(work, 'backend.xlsx')
      await writeFile(input, fixture)
      execFileSync(process.execPath, [join(engineSource, 'cli.js'), 'convert', input,
        '--to', 'xlsx', '--output', direct, '--json'], { env: originalCliEnv() })
      const result = await convert('convert:xlsx', [['input.pdf', fixture]])
      await writeFile(backend, result.bytes)
      const ExcelJS = require(join(engineSource, 'node_modules/exceljs'))
      const cells = async (path) => {
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.readFile(path)
        const sheet = workbook.getWorksheet('P001-T01')
        if (!sheet) throw new Error('PDF table lost its editable worksheet')
        return rows.map((row, rowIndex) => row.map((_, columnIndex) =>
          sheet.getCell(rowIndex + 1, columnIndex + 1).value))
      }
      const actual = await cells(backend)
      if (JSON.stringify(actual) !== JSON.stringify(await cells(direct)) ||
        JSON.stringify(actual) !== JSON.stringify(rows))
        throw new Error(`PDF table cells differ from original or source: ${JSON.stringify(actual)}`)
      console.log('PASS pdf:xlsx English ruled-table smoke; Chinese layout quality remains open')

      const sourceSheet = join(work, 'chinese.xlsx')
      const chinesePdf = join(work, 'chinese.pdf')
      const chineseDirect = join(work, 'chinese-direct.xlsx')
      const chineseBackend = join(work, 'chinese-backend.xlsx')
      const sourceWorkbook = new ExcelJS.Workbook()
      const worksheet = sourceWorkbook.addWorksheet('订单')
      worksheet.addRow(['项目', '金额'])
      worksheet.addRow(['门窗', 315.5])
      worksheet.getColumn(1).width = 20
      worksheet.getColumn(2).width = 18
      worksheet.eachRow({ includeEmpty: false }, (row) => row.eachCell({ includeEmpty: false },
        (cell) => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' } } }))
      await sourceWorkbook.xlsx.writeFile(sourceSheet)
      execFileSync(process.execPath, [join(engineSource, 'cli.js'), 'convert', sourceSheet,
        '--to', 'pdf', '--output', chinesePdf, '--json'], { env: originalCliEnv() })
      execFileSync(process.execPath, [join(engineSource, 'cli.js'), 'convert', chinesePdf,
        '--to', 'xlsx', '--output', chineseDirect, '--json'], { env: originalCliEnv() })
      const chineseResult = await convert('convert:xlsx',
        [['chinese.pdf', await readFile(chinesePdf)]])
      await writeFile(chineseBackend, chineseResult.bytes)
      const readChinese = async (path) => {
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.readFile(path)
        const table = workbook.getWorksheet('P001-T01')
        if (!table) throw new Error('Chinese PDF table lost its editable worksheet')
        return [1, 2].map((row) => [1, 2, 3].map((column) => table.getCell(row, column).value || ''))
      }
      const directRows = await readChinese(chineseDirect)
      const backendRows = await readChinese(chineseBackend)
      if (JSON.stringify(directRows) !== JSON.stringify(backendRows) ||
        JSON.stringify(backendRows) !== JSON.stringify([['项目', '金额', ''], ['门窗', '315.5', '']]))
        throw new Error(`PDF Chinese table column fidelity: direct=${JSON.stringify(directRows)} ` +
          `backend=${JSON.stringify(backendRows)}`)
      execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
        '--record', 'pdf', 'xlsx', createHash('sha256').update(await readFile(chinesePdf)).digest('hex'),
        'English and Chinese ruled tables: direct original and backend retain editable cells'])
      console.log('PASS pdf:xlsx Chinese table, direct and backend retain cells')
    } finally { await rm(work, { recursive: true, force: true }) }
  }

  if (process.env.CONVERSION_OFD_SAMPLE) {
    if (!process.env.CONVERSION_OFD_EXPECT)
      throw new Error('CONVERSION_OFD_SAMPLE requires CONVERSION_OFD_EXPECT')
    const work = await mkdtemp(join(tmpdir(), 'ledger-ofd-pair-'))
    try {
      const input = join(work, 'input.ofd')
      const direct = join(work, 'direct.pdf')
      const backend = join(work, 'backend.pdf')
      const fixture = await readFile(process.env.CONVERSION_OFD_SAMPLE)
      await writeFile(input, fixture)
      execFileSync(process.execPath, [join(engineSource, 'cli.js'), 'convert', input,
        '--to', 'pdf', '--output', direct, '--json'], { env: originalCliEnv() })
      const result = await convert('convert:pdf', [['input.ofd', fixture]])
      await writeFile(backend, result.bytes)
      const pages = (file) => PDFDocument.load(require('node:fs').readFileSync(file))
        .then((document) => document.getPageCount())
      if ((await pages(direct)) < 1 || (await pages(backend)) !== (await pages(direct)))
        throw new Error('OFD PDF page count differs from original')
      const pdftotext = join(dirname(originalCliEnv().FLYINGMOUSE_PDFTOPPM_PATH), 'pdftotext')
      const text = (file) => execFileSync(pdftotext, [file, '-'], { encoding: 'utf8' })
        .replace(/\s+/g, '')
      const originalText = text(direct)
      const backendText = text(backend)
      const expected = process.env.CONVERSION_OFD_EXPECT.replace(/\s+/g, '')
      if (backendText !== originalText || !originalText.includes(expected))
        throw new Error(`OFD PDF text check failed: same=${backendText === originalText} ` +
          `directExpected=${originalText.includes(expected)} ` +
          `backendExpected=${backendText.includes(expected)} ` +
          `directLength=${originalText.length} backendLength=${backendText.length}`)
      const pdftoppm = originalCliEnv().FLYINGMOUSE_PDFTOPPM_PATH
      const render = (file, name) => {
        const prefix = join(work, name)
        execFileSync(pdftoppm, ['-f', '1', '-singlefile', '-r', '72', '-png', file, prefix])
        return `${prefix}.png`
      }
      const directPixels = await sharp(render(direct, 'direct')).removeAlpha().raw().toBuffer()
      const backendPixels = await sharp(render(backend, 'backend')).removeAlpha().raw().toBuffer()
      if (!directPixels.equals(backendPixels))
        throw new Error('OFD PDF rendered pixels differ from original')
      console.log('PASS ofd:pdf structural parity; visual source fidelity requires separate review')
    } finally { await rm(work, { recursive: true, force: true }) }
  }

  if (process.env.CONVERSION_SHEET_INPUTS) {
    const sheetWork = await mkdtemp(join(tmpdir(), 'ledger-sheet-pairs-'))
    try {
      const source = engineSource
      const fixturePath = join(__dirname, '../test/fixtures/conversion/sheet-formula.xlsx')
      const base = await readFile(fixturePath)
      const original = join(sheetWork, 'fixture.xlsx')
      await writeFile(original, base)
      const catalog = require('../src/modules/ledger-conversion/conversion.catalog.json')
      const unzip = (file, name) => execFileSync('unzip', ['-p', file, name], { encoding: 'utf8' })
      const inspect = (file, target, label) => {
        if (target === 'csv') {
          const value = require('node:fs').readFileSync(file, 'utf8').replace(/\s+/g, '')
          if (!value.includes('量窗助手中文验收,12345,24690'))
            throw new Error(`${label}: CSV lost formula result or numeric value`)
          return value
        }
        if (target === 'html') {
          const html = require('node:fs').readFileSync(file, 'utf8')
          const body = (html.match(/<body\b[^>]*>(.*?)<\/body>/s) || [])[1] || ''
          const value = body.replace(/<[^>]+>/g, '').replace(/\s+/g, '')
          if (!value.includes('量窗助手中文验收') || !value.includes('12345') ||
            !value.includes('24690') || !value.includes('附加工作表'))
            throw new Error(`${label}: HTML lost cells or the second sheet`)
          return value
        }
        if (target === 'pdf') {
          const text = execFileSync(join(dirname(originalCliEnv().FLYINGMOUSE_PDFTOPPM_PATH), 'pdftotext'),
            [file, '-'], { encoding: 'utf8' }).replace(/\s+/g, '')
          if (!text.includes('量窗助手中文验收') || !text.includes('12345') ||
            !text.includes('24690') || !text.includes('附加工作表'))
            throw new Error(`${label}: PDF lost cells or the second sheet`)
          return text
        }
        let document = file
        if (target === 'xls') {
          const soffice = originalCliEnv().FLYINGMOUSE_LIBREOFFICE_PATH
          execFileSync(soffice, [`-env:UserInstallation=${pathToFileURL(join(sheetWork, `profile-${label}`)).href}`,
            '--headless', '--convert-to', 'xlsx', '--outdir', sheetWork, file])
          document = file.replace(/\.xls$/, '.xlsx')
        }
        execFileSync('unzip', ['-tqq', document])
        if (target === 'ods') {
          const xml = unzip(document, 'content.xml')
          if (!xml.includes('table:name="验收表"') || !xml.includes('table:name="第二表"') ||
            !xml.includes('量窗助手中文验收') || !xml.includes('附加工作表') ||
            !xml.includes('office:value="12345"') || !xml.includes('office:value="24690"') ||
            !xml.includes('table:formula="of:=[.B1]*2"'))
            throw new Error(`${label}: ODS lost sheets, values, or formula`)
          return JSON.stringify({
            sheets: [...xml.matchAll(/<table:table table:name="([^"]+)/g)].map((item) => item[1]),
            cells: xml.match(/<table:table-row.*?<\/table:table-row>/s)?.[0]
              .replace(/<[^>]+>/g, '').replace(/\s+/g, ''),
            formula: 'B1*2', value: 24690,
          })
        }
        const workbook = unzip(document, 'xl/workbook.xml')
        const strings = unzip(document, 'xl/sharedStrings.xml')
        const first = unzip(document, 'xl/worksheets/sheet1.xml')
        const second = unzip(document, 'xl/worksheets/sheet2.xml')
        if (!workbook.includes('name="验收表"') || !workbook.includes('name="第二表"') ||
          !strings.includes('量窗助手中文验收') || !strings.includes('附加工作表') ||
          !/<f(?:\s[^>]*)?>B1\*2<\/f>/.test(first) || !first.includes('<v>12345</v>') ||
          !first.includes('<v>24690</v>') || !second.includes('<v>7</v>'))
          throw new Error(`${label}: XLS/XLSX lost sheets, values, or formula`)
        return JSON.stringify({ sheets: ['验收表', '第二表'], formula: 'B1*2', values: [12345, 24690, 7] })
      }
      for (const inputExtension of process.env.CONVERSION_SHEET_INPUTS.split(',')) {
        if (!['xlsx', 'ods', 'xls'].includes(inputExtension))
          throw new Error(`Unsupported spreadsheet fixture generator: ${inputExtension}`)
        const input = join(sheetWork, `input.${inputExtension}`)
        if (inputExtension === 'xlsx') await writeFile(input, base)
        else execFileSync(process.execPath, [join(source, 'cli.js'), 'convert', original,
          '--to', inputExtension, '--output', input, '--json'], { env: originalCliEnv() })
        const fixture = await readFile(input)
        const targets = catalog.operations.filter((operation) => operation.kind === 'convert' &&
          operation.inputExtensions.includes(inputExtension)).map((operation) => operation.targetExtension)
        for (const target of targets) {
          const label = `${inputExtension}-${target}`
          const backend = await convert(`convert:${target}`, [[`input.${inputExtension}`, fixture]])
          const backendPath = join(sheetWork, `backend-${label}.${target}`)
          const directPath = join(sheetWork, `direct-${label}.${target}`)
          await writeFile(backendPath, backend.bytes)
          execFileSync(process.execPath, [join(source, 'cli.js'), 'convert', input,
            '--to', target, '--output', directPath, '--json'], { env: originalCliEnv() })
          if (inspect(backendPath, target, `backend-${label}`) !==
            inspect(directPath, target, `direct-${label}`))
            throw new Error(`${label}: backend differs from original`)
          execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
            '--record', inputExtension, target, createHash('sha256').update(fixture).digest('hex'),
            'two-sheet spreadsheet: direct original and authenticated backend, text/numbers/formula checked'])
          console.log(`PASS ${inputExtension}:${target}, two sheets and values match direct original`)
        }
      }
    } finally { await rm(sheetWork, { recursive: true, force: true }) }
  }

  if (process.env.CONVERSION_XLSM) {
    const macroWork = await mkdtemp(join(tmpdir(), 'ledger-xlsm-pairs-'))
    try {
      const source = engineSource
      const input = join(__dirname, '../test/fixtures/xlsm-macro-loss/source.xlsm')
      const fixture = await readFile(input)
      if (execFileSync('unzip', ['-p', input, 'xl/vbaProject.bin']).length < 10000)
        throw new Error('XLSM fixture has no VBA project')
      const expanded = join(macroWork, 'wide-source')
      const wideInput = join(macroWork, 'wide.xlsm')
      execFileSync('unzip', ['-q', input, '-d', expanded])
      const sheetPath = join(expanded, 'xl/worksheets/sheet1.xml')
      const sheetXml = await readFile(sheetPath, 'utf8')
      if (sheetXml.split('<sheetData>').length !== 2)
        throw new Error('XLSM source worksheet is not suitable for column-width adjustment')
      await writeFile(sheetPath, sheetXml.replace('<sheetData>',
        '<cols><col min="1" max="1" width="32" customWidth="1"/>' +
        '<col min="2" max="3" width="18" customWidth="1"/></cols><sheetData>'))
      await writeZip(wideInput, await Promise.all(execFileSync('unzip', ['-Z', '-1', input],
        { encoding: 'utf8' }).split('\n').filter((name) => name && !name.endsWith('/')).map(async (name) =>
        [name, await readFile(join(expanded, name))])))
      execFileSync('unzip', ['-tqq', wideInput])
      if (execFileSync('unzip', ['-p', wideInput, 'xl/vbaProject.bin']).length < 10000)
        throw new Error('Wider XLSM PDF fixture lost its VBA project')
      const wideFixture = await readFile(wideInput)
      const catalog = require('../src/modules/ledger-conversion/conversion.catalog.json')
      const targets = catalog.operations.filter((operation) => operation.kind === 'convert' &&
        operation.inputExtensions.includes('xlsm')).map((operation) => operation.targetExtension)
      const unzip = (file, name) => execFileSync('unzip', ['-p', file, name], { encoding: 'utf8' })
      const inspect = async (file, target, label) => {
        if (target === 'pdf') {
          if ((await PDFDocument.load(await readFile(file))).getPageCount() < 1)
            throw new Error(`${label}: XLSM PDF has no pages`)
          const text = execFileSync(join(dirname(originalCliEnv().FLYINGMOUSE_PDFTOPPM_PATH),
            'pdftotext'), [file, '-'], { encoding: 'utf8' }).replace(/\s+/g, '')
          if (!text.includes('中文内容完整保留') || !text.includes('5682') ||
            !text.includes('11364') || !text.includes('13001'))
            throw new Error(`${label}: XLSM PDF lost cells`)
          return text
        }
        if (target === 'csv' || target === 'html') {
          const raw = await readFile(file, 'utf8')
          const text = (target === 'html' ? raw.replace(/<[^>]+>/g, '') : raw).replace(/\s+/g, '')
          if (!text.includes('中文内容完整保留') || !text.includes('5682') ||
            !text.includes('11364') || !text.includes('13001'))
            throw new Error(`${label}: XLSM ${target} lost cells`)
          return text
        }
        let document = file
        if (target === 'xls') {
          const soffice = originalCliEnv().FLYINGMOUSE_LIBREOFFICE_PATH
          const convertedDir = join(macroWork, `converted-${label}`)
          await mkdir(convertedDir)
          execFileSync(soffice, [`-env:UserInstallation=${pathToFileURL(join(macroWork, `profile-${label}`)).href}`,
            '--headless', '--convert-to', 'xlsx', '--outdir', convertedDir, file])
          document = join(convertedDir, basename(file).replace(/\.xls$/, '.xlsx'))
        }
        execFileSync('unzip', ['-tqq', document])
        if (target === 'ods') {
          const xml = unzip(document, 'content.xml')
          if (!xml.includes('table:name="Sheet1"') || !xml.includes('table:name="Sheet2"') ||
            !xml.includes('中文内容完整保留') || !xml.includes('office:value="5682"') ||
            !xml.includes('office:value="11364"') || !xml.includes('office:value="13001"') ||
            (xml.match(/table:formula=/g) || []).length < 2)
            throw new Error(`${label}: XLSM ODS lost sheets, values, or formulas`)
          return 'Sheet1 Sheet2 中文内容完整保留 5682 11364 13001 two formulas'
        }
        const workbook = unzip(document, 'xl/workbook.xml')
        const strings = unzip(document, 'xl/sharedStrings.xml')
        const cells = unzip(document, 'xl/worksheets/sheet1.xml')
        if (!workbook.includes('name="Sheet1"') || !workbook.includes('name="Sheet2"') ||
          !strings.includes('中文内容完整保留') ||
          !/<f(?:\s[^>]*)?>B2\*2<\/f>/.test(cells) ||
          !/<f(?:\s[^>]*)?>SUM\(B2:B3\)<\/f>/.test(cells) ||
          ['5682', '11364', '7319', '13001'].some((value) => !cells.includes(`<v>${value}</v>`)) ||
          execFileSync('unzip', ['-Z', '-1', document], { encoding: 'utf8' }).includes('xl/vbaProject.bin'))
          throw new Error(`${label}: XLSM ${target} lost sheets/formulas/values or retained unsupported VBA`)
        return 'Sheet1 Sheet2 中文内容完整保留 5682 11364 7319 13001 two formulas'
      }
      for (const target of targets) {
        const sourceFile = target === 'pdf' ? wideInput : input
        const inputBytes = target === 'pdf' ? wideFixture : fixture
        const converted = await convert(`convert:${target}`, [['source.xlsm', inputBytes]])
        const backendPath = join(macroWork, `backend.${target}`)
        const directPath = join(macroWork, `direct.${target}`)
        await writeFile(backendPath, converted.bytes)
        execFileSync(process.execPath, [join(source, 'cli.js'), 'convert', sourceFile,
          '--to', target, '--output', directPath, '--json'], { env: originalCliEnv() })
        if ((await inspect(backendPath, target, `backend-${target}`)) !==
          (await inspect(directPath, target, `direct-${target}`)))
          throw new Error(`XLSM to ${target}: result differs from original`)
        if (!converted.result.warnings?.some((warning) => warning.includes('宏和 VBA')))
          throw new Error(`XLSM to ${target}: macro loss warning was not shown`)
        execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
          '--record', 'xlsm', target, createHash('sha256').update(inputBytes).digest('hex'),
          'real VBA-bearing XLSM: direct original and authenticated backend, cells/formulas and macro warning checked'])
        console.log(`PASS xlsm:${target}, cells match direct original and macro warning is visible`)
      }
    } finally { await rm(macroWork, { recursive: true, force: true }) }
  }

  if (process.env.CONVERSION_PRESENTATIONS) {
    const presentationWork = await mkdtemp(join(tmpdir(), 'ledger-presentation-pairs-'))
    try {
      const source = engineSource
      const catalog = require('../src/modules/ledger-conversion/conversion.catalog.json')
      const pptx = join(presentationWork, 'slides.pptx')
      await writeFile(pptx, await readFile(join(__dirname,
        '../test/fixtures/conversion/presentation-two-slides.pptx')))
      const odp = join(presentationWork, 'slides.odp')
      execFileSync(process.execPath, [join(source, 'cli.js'), 'convert', pptx,
        '--to', 'odp', '--output', odp, '--json'], { env: originalCliEnv() })
      const ppt = join(presentationWork, 'slides.ppt')
      execFileSync(originalCliEnv().FLYINGMOUSE_LIBREOFFICE_PATH,
        [`-env:UserInstallation=${pathToFileURL(join(presentationWork, 'legacy-profile')).href}`,
          '--headless', '--convert-to', 'ppt:MS PowerPoint 97', '--outdir',
          presentationWork, pptx])
      if (!(await readFile(ppt)).subarray(0, 8).equals(Buffer.from('d0cf11e0a1b11ae1', 'hex')))
        throw new Error('Legacy PPT fixture is not an OLE PowerPoint file')
      const unzip = (file, name) => execFileSync('unzip', ['-p', file, name], { encoding: 'utf8' })
      const labels = ['量窗助手', '12345', '经营分析', '订单数量', '37']
      for (const inputExtension of (process.env.CONVERSION_PRESENTATIONS === 'ppt'
        ? ['ppt'] : ['pptx', 'odp', 'ppt'])) {
        const input = { pptx, odp, ppt }[inputExtension]
        const fixture = await readFile(input)
        const targets = catalog.operations.filter((operation) => operation.kind === 'convert' &&
          operation.inputExtensions.includes(inputExtension)).map((operation) => operation.targetExtension)
        for (const target of targets) {
          const backend = await convert(`convert:${target}`, [[`slides.${inputExtension}`, fixture]])
          const backendPath = join(presentationWork, `backend-${inputExtension}.${target}`)
          const directPath = join(presentationWork, `direct-${inputExtension}.${target}`)
          await writeFile(backendPath, backend.bytes)
          execFileSync(process.execPath, [join(source, 'cli.js'), 'convert', input,
            '--to', target, '--output', directPath, '--json'], { env: originalCliEnv() })
          if (target === 'jpg' || target === 'png') {
            const entries = (file) => execFileSync('unzip', ['-Z', '-1', file], { encoding: 'utf8' })
              .trim().split('\n').filter((entry) => entry.endsWith(`.${target}`)).sort()
            const firstNames = entries(backendPath)
            const secondNames = entries(directPath)
            if (firstNames.length !== 2 || JSON.stringify(firstNames) !== JSON.stringify(secondNames))
              throw new Error(`${inputExtension} to ${target}: slides ZIP differs from original`)
            for (let index = 0; index < firstNames.length; index++) {
              const first = execFileSync('unzip', ['-p', backendPath, firstNames[index]])
              const second = execFileSync('unzip', ['-p', directPath, secondNames[index]])
              const meta = await sharp(first).metadata()
              if (meta.width < 500 || meta.height < 300 ||
                !(await sharp(first).resize(300, 180).removeAlpha().raw().toBuffer())
                  .equals(await sharp(second).resize(300, 180).removeAlpha().raw().toBuffer()))
                throw new Error(`${inputExtension} to ${target}: slide pixels differ from original`)
            }
          } else {
            const content = async (file) => {
              if (target === 'pdf') {
                if ((await PDFDocument.load(await readFile(file))).getPageCount() !== 2)
                  throw new Error(`${file}: presentation PDF did not retain two slides`)
                return execFileSync(join(dirname(originalCliEnv().FLYINGMOUSE_PDFTOPPM_PATH),
                  'pdftotext'), [file, '-'], { encoding: 'utf8' })
              }
              if (target === 'html') return (await readFile(file, 'utf8')).replace(/<[^>]+>/g, '')
              execFileSync('unzip', ['-tqq', file])
              if (target === 'odp') return unzip(file, 'content.xml').replace(/<[^>]+>/g, '')
              return [1, 2].map((number) => unzip(file, `ppt/slides/slide${number}.xml`)
                .replace(/<[^>]+>/g, '')).join(' ')
            }
            const text = (await content(backendPath)).replace(/\s+/g, '')
            if (text !== (await content(directPath)).replace(/\s+/g, '') ||
              labels.some((label) => !text.includes(label)))
              throw new Error(`${inputExtension} to ${target}: slide text differs from original`)
          }
          execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
            '--record', inputExtension, target, createHash('sha256').update(fixture).digest('hex'),
            'two-slide Chinese presentation: direct original and authenticated backend, page text or pixels checked'])
          console.log(`PASS ${inputExtension}:${target}, two slides match direct original`)
        }
      }
    } finally { await rm(presentationWork, { recursive: true, force: true }) }
  }

  if (process.env.CONVERSION_LEGACY_PRESENTATION_SAMPLE) {
    const inputExtension = process.env.CONVERSION_LEGACY_PRESENTATION_SAMPLE.split('.').pop().toLowerCase()
    const imageOnly = process.env.CONVERSION_LEGACY_PRESENTATION_IMAGE_ONLY === '1'
    const validTextSample = ['dps', 'dpt'].includes(inputExtension) &&
      process.env.CONVERSION_LEGACY_PRESENTATION_EXPECT
    if (!(imageOnly ? inputExtension === 'pptx' : validTextSample))
      throw new Error('Presentation requires DPS/DPT with text or image-only PPTX')
    const work = await mkdtemp(join(tmpdir(), 'ledger-legacy-presentation-'))
    try {
      const input = join(work, `input.${inputExtension}`)
      const fixture = await readFile(process.env.CONVERSION_LEGACY_PRESENTATION_SAMPLE)
      await writeFile(input, fixture)
      const pages = Number(process.env.CONVERSION_LEGACY_PRESENTATION_PAGES || 1)
      const expected = imageOnly ? [] : process.env.CONVERSION_LEGACY_PRESENTATION_EXPECT.split('|')
        .map((value) => value.replace(/\s+/g, ''))
      const selected = process.env.CONVERSION_LEGACY_PRESENTATION_TARGETS?.split(',')
      const targets = require('../src/modules/ledger-conversion/conversion.catalog.json').operations
        .filter((operation) => operation.kind === 'convert' &&
          operation.inputExtensions.includes(inputExtension))
        .map((operation) => operation.targetExtension).filter((target) =>
          (target !== 'html' || selected?.includes('html')) && (!selected || selected.includes(target)))
      const inspect = async (file, target) => {
        if (target === 'html') {
          const html = await readFile(file, 'utf8')
          const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, '')
          if (expected.some((part) => !text.includes(part)))
            throw new Error('HTML lost known slide text')
          const matches = [...html.matchAll(/<img[^>]+src="data:image\/png;base64,([A-Za-z0-9+/=]+)"/g)]
          const images = []
          for (const match of matches) {
            const bytes = Buffer.from(match[1], 'base64')
            const metadata = await sharp(bytes).metadata()
            if (metadata.width < 500 || metadata.height < 300)
              throw new Error('HTML contains an undersized slide image')
            images.push(await sharp(bytes).resize(500, 300, { fit: 'inside' }).removeAlpha()
              .raw().toBuffer())
          }
          return { text, images }
        }
        if (target === 'jpg' || target === 'png') {
          const names = execFileSync('unzip', ['-Z', '-1', file], { encoding: 'utf8' })
            .trim().split('\n').filter((name) => name.endsWith(`.${target}`)).sort()
          if (names.length !== pages) throw new Error(`${target}: expected ${pages} slides, got ${names.length}`)
          const images = []
          for (const name of names) {
            const bytes = execFileSync('unzip', ['-p', file, name],
              { maxBuffer: 64 * 1024 * 1024 })
            const image = await sharp(bytes).resize(500, 300, { fit: 'inside' }).removeAlpha()
              .raw().toBuffer()
            images.push(image)
          }
          return images
        }
        if (target === 'pdf') {
          if ((await PDFDocument.load(await readFile(file))).getPageCount() !== pages)
            throw new Error(`PDF did not retain ${pages} slides`)
          const value = execFileSync(join(dirname(originalCliEnv().FLYINGMOUSE_PDFTOPPM_PATH),
            'pdftotext'), [file, '-'], { encoding: 'utf8' }).replace(/\s+/g, '')
          if (expected.some((part) => !value.includes(part)))
            throw new Error('PDF lost known slide text')
          return value
        }
        execFileSync('unzip', ['-tqq', file])
        const names = execFileSync('unzip', ['-Z', '-1', file], { encoding: 'utf8' })
          .trim().split('\n')
        const slides = target === 'pptx' ? names.filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
          : names.filter((name) => name === 'content.xml')
        if (target === 'pptx' && slides.length !== pages || target === 'odp' && !slides.length)
          throw new Error(`${target}: missing slides`)
        const content = slides.map((name) => execFileSync('unzip', ['-p', file, name],
          { encoding: 'utf8' }).replace(/<[^>]+>/g, '')).join('').replace(/\s+/g, '')
        if (expected.some((part) => !content.includes(part)) ||
          !names.some((name) => /(?:ppt\/media\/|Pictures\/)/.test(name)))
          throw new Error(`${target}: lost known text or slide images`)
        return content
      }
      const failures = []
      for (const target of targets) {
        let stage = 'backend'
        try {
        const backend = await convert(`convert:${target}`, [[`input.${inputExtension}`, fixture]])
        const suffix = ['jpg', 'png'].includes(target) ? 'zip' : target
        const backendPath = join(work, `backend-${target}.${suffix}`)
        const directPath = join(work, `direct-${target}.${suffix}`)
        await writeFile(backendPath, backend.bytes)
        stage = 'original'
        execFileSync(process.execPath, [join(engineSource, 'cli.js'), 'convert', input,
          '--to', target, '--output', directPath, '--json'], { env: originalCliEnv() })
        stage = 'quality'
        const actual = await inspect(backendPath, target)
        const original = await inspect(directPath, target)
        if (target === 'html' && actual.text !== original.text)
          throw new Error(`${inputExtension} to html: slide text differs from original`)
        const actualImages = target === 'html' ? actual.images : actual
        const originalImages = target === 'html' ? original.images : original
        if (Array.isArray(actualImages) && Array.isArray(originalImages)) {
          if (actualImages.length !== originalImages.length)
            throw new Error(`${inputExtension} to ${target}: slide image counts differ`)
          for (let index = 0; index < actualImages.length; index++) {
            if (actualImages[index].length !== originalImages[index]?.length)
              throw new Error(`${inputExtension} to ${target}: slide ${index + 1} dimensions differ`)
            let delta = 0
            for (let offset = 0; offset < actualImages[index].length; offset++)
              delta += Math.abs(actualImages[index][offset] - originalImages[index][offset])
            const meanDelta = delta / actualImages[index].length
            if (meanDelta > 2)
              throw new Error(`${inputExtension} to ${target}: slide ${index + 1} ` +
                `mean pixel difference ${meanDelta.toFixed(2)} > 2`)
          }
        } else if (actual !== original)
          throw new Error(`${inputExtension} to ${target}: slide text differs from original`)
        if (target === 'html' && process.env.CONVERSION_LEGACY_PRESENTATION_REQUIRE_IMAGES &&
          actual.images.length !== pages) {
          throw new Error(`${inputExtension} to HTML: visual slide images were omitted`)
        }
        execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
          '--record', inputExtension, target, createHash('sha256').update(fixture).digest('hex'),
          'legacy presentation: direct original and authenticated backend, slide text or pixels checked'])
        console.log(`PASS ${inputExtension}:${target}, ${pages} slides match direct original`)
        } catch (error) {
          const message = `${inputExtension}:${target}: ${error.message}`
          failures.push(message)
          execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
            '--fail', inputExtension, target, stage, createHash('sha256').update(fixture).digest('hex'), message])
          console.error(`FAIL ${message}`)
        }
      }
      if (failures.length) throw new Error(`${failures.length} ${inputExtension} pairs failed; see pair evidence`)
    } finally { await rm(work, { recursive: true, force: true }) }
  }

  if (process.env.CONVERSION_ZIP) {
    const zipWork = await mkdtemp(join(tmpdir(), 'ledger-zip-pdf-'))
    try {
      const first = join(zipWork, 'first.png')
      const second = join(zipWork, 'second.png')
      await writeFile(first, await sharp({ create: {
        width: 320, height: 240, channels: 3, background: '#008866',
      } }).png().toBuffer())
      await writeFile(second, await sharp({ create: {
        width: 320, height: 240, channels: 3, background: '#cc4455',
      } }).png().toBuffer())
      const input = join(zipWork, 'images.zip')
      await writeZip(input, [['first.png', await readFile(first)], ['second.png', await readFile(second)]])
      execFileSync('unzip', ['-tqq', input])
      const fixture = await readFile(input)
      const backend = await convert('convert:pdf', [['images.zip', fixture]])
      const backendPath = join(zipWork, 'backend.pdf')
      const directPath = join(zipWork, 'direct.pdf')
      await writeFile(backendPath, backend.bytes)
      execFileSync(process.execPath, [join(engineSource, 'cli.js'), 'convert', input,
        '--to', 'pdf', '--output', directPath, '--json'], { env: originalCliEnv() })
      if ((await PDFDocument.load(backend.bytes)).getPageCount() !== 2 ||
        (await PDFDocument.load(await readFile(directPath))).getPageCount() !== 2)
        throw new Error('ZIP images to PDF did not retain two pages')
      const pdftoppm = originalCliEnv().FLYINGMOUSE_PDFTOPPM_PATH
      for (const [label, file] of [['backend', backendPath], ['direct', directPath]])
        execFileSync(pdftoppm, ['-r', '72', '-f', '1', '-l', '2', '-png', file,
          join(zipWork, label)])
      const previews = []
      for (const label of ['backend', 'direct']) {
        const files = require('node:fs').readdirSync(zipWork)
          .filter((name) => name.startsWith(`${label}-`) && name.endsWith('.png')).sort()
        if (files.length !== 2) throw new Error(`${label}: ZIP PDF did not render two pages`)
        previews.push(await Promise.all(files.map((name) => sharp(join(zipWork, name))
          .resize(200, 150).removeAlpha().raw().toBuffer())))
      }
      if (previews[0][0].equals(previews[0][1]) ||
        previews[0].some((item, index) => !item.equals(previews[1][index])))
        throw new Error('ZIP PDF images are identical or differ from original')
      execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
        '--record', 'zip', 'pdf', createHash('sha256').update(fixture).digest('hex'),
        'two-color image ZIP: direct original and authenticated backend, two rendered pages compared'])
      console.log('PASS zip:pdf, two images and pages match direct original')
    } finally { await rm(zipWork, { recursive: true, force: true }) }
  }

  if (process.env.CONVERSION_SAMPLE_DOCX && !process.env.CONVERSION_SKIP_DOCX) {
    const sample = await readFile(process.env.CONVERSION_SAMPLE_DOCX)
    const document = await convert('convert:pdf', [['sample.docx', sample]])
    const pages = (await PDFDocument.load(document.bytes)).getPageCount()
    if (pages < 1) throw new Error('DOCX to PDF produced no pages')
    const work = await mkdtemp(join(tmpdir(), 'ledger-docx-check-'))
    try {
      const pdfPath = join(work, 'result.pdf')
      const directPath = join(work, 'direct.pdf')
      await writeFile(pdfPath, document.bytes)
      const pdftotext = join(dirname(process.env.FLYINGMOUSE_PDFTOPPM_PATH || 'pdftoppm'), 'pdftotext')
      const extracted = execFileSync(pdftotext, ['-layout', pdfPath, '-'], { encoding: 'utf8' })
      if (extracted.trim().length < 100) throw new Error('DOCX to PDF lost most text')
      const source = engineSource
      execFileSync(process.execPath, [join(source, 'cli.js'), 'convert',
        process.env.CONVERSION_SAMPLE_DOCX, '--to', 'pdf', '--output', directPath, '--json'], {
        env: originalCliEnv(),
      })
      const direct = await readFile(directPath)
      if ((await PDFDocument.load(direct)).getPageCount() !== pages)
        throw new Error('DOCX to PDF page count differs from direct original')
      const directText = execFileSync(pdftotext, ['-layout', directPath, '-'], { encoding: 'utf8' })
      const normalize = (text) => text.replace(/\s+/g, ' ').trim()
      if (normalize(extracted) !== normalize(directText))
        throw new Error('DOCX to PDF text differs from direct original')
      const sourceXml = execFileSync('unzip', ['-p', process.env.CONVERSION_SAMPLE_DOCX,
        'word/document.xml'], { encoding: 'utf8' })
      const sourceText = [...sourceXml.matchAll(/<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/g)]
        .map((match) => match[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'"))
        .join('').replace(/\s+/g, '')
      const outputText = execFileSync(pdftotext, [pdfPath, '-'], { encoding: 'utf8' })
        .replace(/\s+/g, '')
      const chunks = []
      for (let index = 0; index + 10 <= sourceText.length; index += 10)
        chunks.push(sourceText.slice(index, index + 10))
      if (chunks.length < 10 || chunks.filter((part) => outputText.includes(part)).length / chunks.length < 0.7)
        throw new Error('DOCX to PDF lost source document text')
      for (const target of ['html', 'md', 'odt', 'rtf', 'txt']) {
        const converted = await convert(`convert:${target}`, [['sample.docx', sample]])
        const backendPath = join(work, `backend.${target}`)
        const otherDirectPath = join(work, `direct.${target}`)
        await writeFile(backendPath, converted.bytes)
        execFileSync(process.execPath, [join(source, 'cli.js'), 'convert',
          process.env.CONVERSION_SAMPLE_DOCX, '--to', target, '--output', otherDirectPath,
          '--json'], { env: originalCliEnv() })
        const extract = (file) => {
          if (target === 'odt') {
            execFileSync('unzip', ['-tqq', file])
            return execFileSync('unzip', ['-p', file, 'content.xml'], { encoding: 'utf8' })
              .replace(/<[^>]+>/g, '')
          }
          if (target === 'rtf') return rtfText(file)
          const value = require('node:fs').readFileSync(file, 'utf8')
          return target === 'html' ? value.replace(/<[^>]+>/g, '') : value
        }
        const markdown = async (file, zipped) => {
          const entries = zipped ? execFileSync('unzip', ['-Z', '-1', file], { encoding: 'utf8' })
            .trim().split('\n') : []
          const mdFiles = entries.filter((name) => name.endsWith('.md'))
          if (zipped && mdFiles.length !== 1) throw new Error('DOCX to md ZIP lacks one Markdown file')
          const value = zipped ? execFileSync('unzip', ['-p', file, mdFiles[0]], { encoding: 'utf8' })
            : await readFile(file, 'utf8')
          const links = [...value.matchAll(/!\[[^\]]*\]\((fm-assets-[^/)\s]+\/[^/)\s]+)\)/g)]
          const sourceImages = execFileSync('unzip', ['-Z', '-1', process.env.CONVERSION_SAMPLE_DOCX],
            { encoding: 'utf8' }).split('\n').filter((name) => name.startsWith('word/media/') &&
              !name.endsWith('/'))
          if (!sourceImages.length || links.length !== sourceImages.length)
            throw new Error('DOCX to md lost an embedded image')
          let canonical = value
          for (const [index, link] of links.entries()) {
            const asset = link[1]
            if (!/^fm-assets-[A-Za-z0-9]+\/image-\d+\.[a-z0-9]+$/.test(asset) ||
              (zipped && !entries.includes(asset)))
              throw new Error('DOCX to md has an invalid image reference')
            const bytes = zipped ? execFileSync('unzip', ['-p', file, asset])
              : await readFile(join(dirname(file), asset))
            canonical = canonical.replace(asset,
              `image-${index + 1}:${createHash('sha256').update(bytes).digest('hex')}`)
          }
          return canonical.replace(/\s+/g, '')
        }
        const normalized = target === 'md' ? await markdown(backendPath, true)
          : extract(backendPath).replace(/\s+/g, '')
        const directNormalized = target === 'md' ? await markdown(otherDirectPath, false)
          : extract(otherDirectPath).replace(/\s+/g, '')
        if (normalized !== directNormalized ||
          chunks.filter((part) => normalized.includes(part)).length / chunks.length < 0.7)
          throw new Error(`DOCX to ${target} differs from original or lost source text`)
        execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
          '--record', 'docx', target, createHash('sha256').update(sample).digest('hex'),
          'real DOCX: direct original and authenticated backend, decoded text matched and source retained'])
        console.log(`PASS real DOCX:${target}, decoded text matches direct original`)
      }
    } finally { await rm(work, { recursive: true, force: true }) }
    execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
      '--record', 'docx', 'pdf', createHash('sha256').update(sample).digest('hex'),
      'real DOCX: direct original and authenticated backend, same page count and text; source text retained'])
    console.log(`PASS real DOCX:PDF, ${pages} pages and text match direct original`)
  }
  if (pdfParityFailures) throw new Error(`${pdfParityFailures} PDF parity cases failed; see evidence JSONL`)
}

main().catch((error) => { console.error(error.message); process.exitCode = 1 }).finally(async () => {
  if (cleanupJob) for (const id of outstanding) await cleanupJob(id).catch(() => undefined)
  if (userId) await prisma.ledgerUser.delete({ where: { id: userId } }).catch(() => undefined)
  await prisma.$disconnect()
})
