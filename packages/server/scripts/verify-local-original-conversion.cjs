#!/usr/bin/env node
const { createHash, randomUUID } = require('node:crypto')
const { execFileSync } = require('node:child_process')
const { open, readFile, writeFile, mkdtemp, rm, stat } = require('node:fs/promises')
const { homedir, tmpdir } = require('node:os')
const { dirname, join } = require('node:path')
const { PrismaClient } = require('@prisma/client')
const { JwtService } = require('@nestjs/jwt')
const sharp = require('sharp')
const { PDFDocument, StandardFonts } = require('../../../vendor/flyingmouse-format/upstream-a7b9b15/node_modules/pdf-lib')
const engineSource = process.env.FLYINGMOUSE_TEST_SOURCE_DIR ||
  join(__dirname, '../../../vendor/flyingmouse-format/upstream-a7b9b15')

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

function originalCliEnv() {
  const source = engineSource
  const engines = process.env.CONVERSION_ENGINE_ROOT ||
    join(homedir(), 'Library/Caches/ledger-flyingmouse-engines/darwin-arm64')
  return {
    ...process.env,
    FLYINGMOUSE_FFMPEG_PATH: join(engines, 'runtime/bin/ffmpeg'),
    FLYINGMOUSE_LIBREOFFICE_PATH: join(engines, 'libreoffice/LibreOffice.app/Contents/MacOS/soffice'),
    FLYINGMOUSE_PDFTOPPM_PATH: join(engines, 'runtime/bin/pdftoppm'),
    FLYINGMOUSE_TESSDATA_PATH: join(engines, 'tessdata'),
    FLYINGMOUSE_PANDOC_PATH: join(source, 'bin/pandoc/pandoc'),
    FLYINGMOUSE_QPDF_PATH: join(homedir(), 'Library/Caches/ledger-qpdf-osx-arm64/bin/qpdf'),
    DYLD_LIBRARY_PATH: join(engines, 'runtime/lib') +
      (process.env.DYLD_LIBRARY_PATH ? `:${process.env.DYLD_LIBRARY_PATH}` : ''),
  }
}

async function pdfPage(label) {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  pdf.addPage([300, 300]).drawText(label, { x: 40, y: 150, size: 18, font })
  return Buffer.from(await pdf.save())
}

async function verifyBaseline(convert) {
  const markdown = await convert('convert:md', [['sample.txt', Buffer.from('你好，原版转换验收。\n')]])
  if (!markdown.bytes.toString('utf8').includes('你好，原版转换验收。')) throw new Error('Chinese text was lost')
  console.log('PASS txt:md, authenticated upload/download and Chinese content')

  const first = await pdfPage('First page')
  const second = await pdfPage('Second page')
  const merged = await convert('merge-pdfs', [['first.pdf', first], ['second.pdf', second]])
  if ((await PDFDocument.load(merged.bytes)).getPageCount() !== 2) throw new Error('PDF merge lost pages')
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
  const images = await convert('images-to-pdf', [['first.png', imageA], ['second.jpg', imageB]])
  if ((await PDFDocument.load(images.bytes)).getPageCount() !== 2)
    throw new Error('Image merge lost pages')
  console.log('PASS images-to-pdf, two images retained')

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

  const imageSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="320">' +
    '<rect width="600" height="320" fill="white"/>' +
    '<text x="45" y="125" font-family="PingFang SC" font-size="54">量窗助手 12345</text>' +
    '<rect x="45" y="185" width="220" height="80" fill="#008866"/></svg>'
  const imagePng = await sharp(Buffer.from(imageSvg)).png().toBuffer()
  const imageWork = await mkdtemp(join(tmpdir(), 'ledger-image-pairs-'))
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
        'jfif', 'jxl', 'ppm', 'qoi', 'tga', 'tif', 'tiff', 'webp', 'heic', 'heif']
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
        else if (inputExtension === 'jxl')
          execFileSync(ffmpeg, ['-v', 'error', '-i', png, '-c:v', 'libjxl',
            '-distance', '0', '-effort', '7', input])
        else if (inputExtension === 'heic' || inputExtension === 'heif') {
          const heic = join(imageWork, 'source.heic')
          if (!require('node:fs').existsSync(heic))
            execFileSync('sips', ['-s', 'format', 'heic', png, '--out', heic])
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
        const backend = await convert(`convert:${target}`, [[`sample.${inputExtension}`, imageFixture]])
        const directPath = join(imageWork, `direct-${inputExtension}.${target}`)
        const backendPath = join(imageWork, `backend-${inputExtension}.${target}`)
        execFileSync(process.execPath, [join(source, 'cli.js'), 'convert', input,
          '--to', target, '--output', directPath, '--json'], { env: originalCliEnv() })
        await writeFile(backendPath, backend.bytes)
        if (target === 'txt' || target === 'md') {
          const result = backend.bytes.toString('utf8')
          if (!result.includes('量窗助手 12345') || result !== (await readFile(directPath, 'utf8')))
            throw new Error(`${inputExtension} to ${target} OCR differs from original`)
        } else if (target === 'docx') {
          const xml = (file) => {
            execFileSync('unzip', ['-tqq', file])
            return execFileSync('unzip', ['-p', file, 'word/document.xml'], { encoding: 'utf8' })
              .replace(/<[^>]+>/g, '')
          }
          if (!xml(backendPath).includes('量窗助手 12345') || xml(backendPath) !== xml(directPath))
            throw new Error(`${inputExtension} to DOCX OCR differs from original`)
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
      }
    }
  } finally { await rm(imageWork, { recursive: true, force: true }) }

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

async function main() {
  const user = await prisma.ledgerUser.create({
    data: { nickname: '本地转换验收', wxOpenid: `local-conversion-${randomUUID()}` },
  })
  userId = user.id
  const token = await new JwtService({ secret: process.env.JWT_SECRET }).signAsync({
    sub: userId, scope: 'ledger', jti: randomUUID(),
  }, { expiresIn: '1h' })
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
    const uploadIds = []
    for (const [name, bytes] of files) uploadIds.push(await upload(name, bytes))
    const job = await json('/jobs', 'POST', { operationId, uploadIds, options })
    outstanding.add(job.id)
    let result
    for (let attempt = 0; attempt < 90; attempt++) {
      result = await json(`/jobs/${job.id}`)
      if (['succeeded', 'failed', 'cancelled'].includes(result.status)) break
      await new Promise((done) => { setTimeout(done, 1000) })
    }
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
    await cleanupJob(job.id)
    outstanding.delete(job.id)
    return { bytes, result }
  }

  if (!process.env.CONVERSION_SKIP_BASELINE) await verifyBaseline(convert)

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
        if (target === 'rtf')
          return execFileSync('textutil', ['-convert', 'txt', '-stdout', file], { encoding: 'utf8' })
        const value = await readFile(file, 'utf8')
        return target === 'html' ? value.replace(/<[^>]+>/g, '') : value
      }
      for (const inputExtension of process.env.CONVERSION_DOCUMENT_INPUTS.split(',')) {
        if (!['odt', 'rtf'].includes(inputExtension))
          throw new Error(`Unsupported document fixture generator: ${inputExtension}`)
        const input = join(documentWork, `input.${inputExtension}`)
        execFileSync(process.execPath, [join(source, 'cli.js'), 'convert',
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
          execFileSync(process.execPath, [join(__dirname, '../../../scripts/flyingmouse-acceptance.cjs'),
            '--record', inputExtension, target, createHash('sha256').update(fixture).digest('hex'),
            'real Chinese document roundtrip: direct original and authenticated backend, decoded text retained'])
          console.log(`PASS ${inputExtension}:${target}, Chinese text matches direct original`)
        }
      }
    } finally { await rm(documentWork, { recursive: true, force: true }) }
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
          execFileSync(soffice, [`-env:UserInstallation=file://${join(sheetWork, `profile-${label}`)}`,
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
          if (target === 'rtf')
            return execFileSync('textutil', ['-convert', 'txt', '-stdout', file], { encoding: 'utf8' })
          const value = require('node:fs').readFileSync(file, 'utf8')
          return target === 'html' ? value.replace(/<[^>]+>/g, '') : value
        }
        const normalized = extract(backendPath).replace(/\s+/g, '')
        if (normalized !== extract(otherDirectPath).replace(/\s+/g, '') ||
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
}

main().catch((error) => { console.error(error.message); process.exitCode = 1 }).finally(async () => {
  if (cleanupJob) for (const id of outstanding) await cleanupJob(id).catch(() => undefined)
  if (userId) await prisma.ledgerUser.delete({ where: { id: userId } }).catch(() => undefined)
  await prisma.$disconnect()
})
