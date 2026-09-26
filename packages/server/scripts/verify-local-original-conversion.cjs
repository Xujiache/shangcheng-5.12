#!/usr/bin/env node
const { createHash, randomUUID } = require('node:crypto')
const { execFileSync } = require('node:child_process')
const { readFile, writeFile, mkdtemp, rm } = require('node:fs/promises')
const { homedir, tmpdir } = require('node:os')
const { dirname, join } = require('node:path')
const { PrismaClient } = require('@prisma/client')
const { JwtService } = require('@nestjs/jwt')
const sharp = require('sharp')
const { PDFDocument, StandardFonts } = require('../../../vendor/flyingmouse-format/upstream-a7b9b15/node_modules/pdf-lib')

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

async function pdfPage(label) {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  pdf.addPage([300, 300]).drawText(label, { x: 40, y: 150, size: 18, font })
  return Buffer.from(await pdf.save())
}

async function main() {
  const user = await prisma.ledgerUser.create({
    data: { nickname: '本地转换验收', wxOpenid: `local-conversion-${randomUUID()}` },
  })
  userId = user.id
  const token = await new JwtService({ secret: process.env.JWT_SECRET }).signAsync({
    sub: userId, scope: 'ledger', jti: randomUUID(),
  }, { expiresIn: '10m' })
  const auth = { Authorization: `Bearer ${token}` }
  async function json(route, method = 'GET', data) {
    const response = await fetch(new URL(`/api/v1/l/conversions${route}`, base), {
      method, headers: { ...auth, ...(data ? { 'Content-Type': 'application/json' } : {}) },
      body: data ? JSON.stringify(data) : undefined,
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
      await new Promise((done) => setTimeout(done, 1000))
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
    })
    if (!response.ok) throw new Error(`${operationId} download failed: ${response.status}`)
    const bytes = Buffer.from(await response.arrayBuffer())
    await cleanupJob(job.id)
    outstanding.delete(job.id)
    return { bytes, result }
  }

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

  const imageA = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#008866' } }).png().toBuffer()
  const imageB = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#cc4455' } }).jpeg().toBuffer()
  const images = await convert('images-to-pdf', [['first.png', imageA], ['second.jpg', imageB]])
  if ((await PDFDocument.load(images.bytes)).getPageCount() !== 2)
    throw new Error('Image merge lost pages')
  console.log('PASS images-to-pdf, two images retained')

  if (process.env.CONVERSION_SAMPLE_DOCX) {
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
      const source = join(__dirname, '../../../vendor/flyingmouse-format/upstream-a7b9b15')
      const engines = process.env.CONVERSION_ENGINE_ROOT ||
        join(homedir(), 'Library/Caches/ledger-flyingmouse-engines/darwin-arm64')
      execFileSync(process.execPath, [join(source, 'cli.js'), 'convert',
        process.env.CONVERSION_SAMPLE_DOCX, '--to', 'pdf', '--output', directPath, '--json'], {
        env: {
          ...process.env,
          FLYINGMOUSE_FFMPEG_PATH: join(engines, 'runtime/bin/ffmpeg'),
          FLYINGMOUSE_LIBREOFFICE_PATH: join(engines, 'libreoffice/LibreOffice.app/Contents/MacOS/soffice'),
          FLYINGMOUSE_PDFTOPPM_PATH: join(engines, 'runtime/bin/pdftoppm'),
          FLYINGMOUSE_TESSDATA_PATH: join(engines, 'tessdata'),
          FLYINGMOUSE_PANDOC_PATH: join(source, 'bin/pandoc/pandoc'),
        },
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
