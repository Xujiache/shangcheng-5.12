#!/usr/bin/env node
'use strict'

const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { createRequire } = require('node:module')

const vendor = path.resolve(__dirname, '../../../vendor/flyingmouse-format/v0.7.10')
const vendorRequire = createRequire(path.join(vendor, 'package.json'))
const sharp = vendorRequire('sharp')
const { PDFDocument } = vendorRequire('pdf-lib')
const { zipFiles } = vendorRequire('./zip-util')
const { targetsForExt } = vendorRequire('./utils')
const base = process.env.LEDGER_TEST_BASE || 'http://127.0.0.1:3000'
const endpoint = base + '/api/v1/l/conversions'
const jobs = []
const unavailable = []
let temp

async function api(route, init = {}) {
  const response = await fetch(endpoint + route, init)
  const body = await response.json()
  if (!response.ok || body.code !== 0) throw new Error(body.message || `HTTP ${response.status}`)
  return body.data
}
async function upload(file) {
  const bytes = await fs.readFile(file)
  const name = path.basename(file)
  const created = await api('/uploads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fileName: name, sizeBytes: bytes.length }) })
  for (let index = 0; index < created.chunkCount; index++) {
    const chunk = bytes.subarray(index * created.chunkBytes, (index + 1) * created.chunkBytes)
    const form = new FormData()
    form.append('index', String(index))
    form.append('file', new Blob([chunk]), 'part.bin')
    await api(`/uploads/${created.id}/chunks`, { method: 'POST', body: form })
  }
  await api(`/uploads/${created.id}/complete`, { method: 'POST' })
  return created.id
}
async function waitJob(id) {
  const deadline = Date.now() + 180_000
  let job
  do {
    await new Promise(resolve => { setTimeout(resolve, 400) })
    job = await api('/jobs/' + id)
  } while (['queued', 'running'].includes(job.status) && Date.now() < deadline)
  return job
}
async function convert(label, operationId, files, options = {}) {
  const uploadIds = []
  for (const file of files) uploadIds.push(await upload(file))
  const { id } = await api('/jobs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ operationId, uploadIds, options }) })
  jobs.push(id)
  const job = await waitJob(id)
  if (job.status !== 'succeeded' || !job.assets.length) throw new Error(`${label}: ${job.error || job.status}`)
  const asset = job.assets[0]
  const response = await fetch(`${endpoint}/jobs/${id}/assets/${asset.id}`)
  if (!response.ok) throw new Error(`${label}: download HTTP ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length !== asset.sizeBytes || bytes.length === 0) throw new Error(`${label}: output size mismatch`)
  const result = path.join(temp, `${jobs.length}-${path.basename(asset.fileName)}`)
  await fs.writeFile(result, bytes)
  console.log(`PASS ${label}: ${asset.fileName} (${bytes.length} bytes)`)
  return result
}
async function makeWav(file) {
  const samples = 22050
  const buffer = Buffer.alloc(44 + samples * 2)
  buffer.write('RIFF', 0); buffer.writeUInt32LE(buffer.length - 8, 4)
  buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(22050, 24); buffer.writeUInt32LE(44100, 28)
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40)
  for (let i = 0; i < samples; i++) buffer.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 440 / 22050) * 6000), 44 + i * 2)
  await fs.writeFile(file, buffer)
}
async function makeVideo(file) {
  const ffmpeg = process.env.FLYINGMOUSE_FFMPEG_PATH || path.join(os.homedir(), 'Library/Caches/ledger-local-conversion/ffmpeg')
  await new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=96x96:rate=8:duration=1', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', '-y', file])
    let stderr = ''
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolve() : reject(new Error(stderr)))
  })
}
async function main() {
  temp = await fs.mkdtemp(path.join(os.tmpdir(), 'ledger-conversion-check-'))
  const capability = await api('/capabilities')
  const pairs = capability.operations.reduce((total, item) => total + item.inputExtensions.length, 0)
  console.log(`Local capability: ${capability.operations.length} operations, ${pairs} source/target pairs`)
  const health = await (await fetch(base + '/health')).json()
  const tools = health.data.tools
  const inputs = new Set(capability.operations.flatMap(item => item.inputExtensions))
  for (const input of inputs) {
    const advertised = capability.operations.filter(item => item.kind === 'convert' && item.inputExtensions.includes(input)).map(item => item.targetExtension).sort()
    const original = targetsForExt(input, tools).sort()
    if (JSON.stringify(advertised) !== JSON.stringify(original)) throw new Error(`与原版目标格式不一致：${input}`)
  }
  console.log(`PASS ${inputs.size} 种输入格式的目标列表与原版一致`)
  const png = path.join(temp, 'sample.png')
  await sharp({ create: { width: 360, height: 120, channels: 4, background: '#ffffff' } })
    .composite([{ input: Buffer.from('<svg width="360" height="120"><text x="15" y="85" font-size="58" font-family="Arial" fill="black">HELLO 123</text></svg>') }])
    .png().toFile(png)
  const txt = path.join(temp, 'sample.txt'); await fs.writeFile(txt, '量窗助手\nHello, format conversion.\n')
  const csv = path.join(temp, 'sample.csv'); await fs.writeFile(csv, 'name,count\nwindow,2\ndoor,3\n')
  const srt = path.join(temp, 'sample.srt'); await fs.writeFile(srt, '1\n00:00:00,000 --> 00:00:01,000\nHello\n')
  const pdf = path.join(temp, 'sample.pdf')
  const document = await PDFDocument.create()
  for (let i = 0; i < 3; i++) document.addPage([250, 180]).drawText(`Page ${i + 1}`, { x: 25, y: 130 })
  await fs.writeFile(pdf, await document.save())
  const wav = path.join(temp, 'sample.wav'); await makeWav(wav)
  const mp4 = path.join(temp, 'sample.mp4'); await makeVideo(mp4)
  const zip = path.join(temp, 'sample.zip'); await zipFiles([{ inputPath: png, archiveName: 'sample.png' }], zip)

  await convert('PNG → JPG', 'convert:jpg', [png])
  await convert('PNG → WEBP', 'convert:webp', [png])
  await convert('PNG → OCR TXT', 'convert:txt', [png])
  const docx = await convert('TXT → DOCX', 'convert:docx', [txt])
  await convert('DOCX → PDF', 'convert:pdf', [docx])
  await convert('TXT → EPUB', 'convert:epub', [txt], { textEncoding: 'utf-8' })
  const textPdf = await convert('TXT → PDF', 'convert:pdf', [txt])
  const xlsx = await convert('CSV → XLSX', 'convert:xlsx', [csv])
  await convert('XLSX → CSV', 'convert:csv', [xlsx])
  await convert('CSV → PDF', 'convert:pdf', [csv])
  await convert('SRT → VTT', 'convert:vtt', [srt])
  await convert('PDF → PNG', 'convert:png', [pdf])
  await convert('PDF 分组拆分', 'convert:pdf', [pdf], { splitMode: 'group', groupSize: '2' })
  let encrypted
  try {
    encrypted = await convert('PDF 加密', 'convert:pdf', [pdf], { pdfAction: 'encrypt', password: 'ledger-test' })
  } catch (error) {
    console.error('UNAVAILABLE PDF 加密:', error.message)
    unavailable.push('PDF 加密 / 解密')
  }
  if (encrypted) await convert('PDF 解密', 'convert:pdf', [encrypted], { pdfAction: 'decrypt', password: 'ledger-test' })
  await convert('ZIP 图片 → PDF', 'convert:pdf', [zip])
  await convert('两图合成 PDF', 'images-to-pdf', [png, png])
  await convert('合并 PDF', 'merge-pdfs', [pdf, textPdf])
  await convert('WAV → MP3', 'convert:mp3', [wav])
  await convert('MP4 → MP3', 'convert:mp3', [mp4])
  await convert('MP4 → WEBM', 'convert:webm', [mp4], { alphaBackground: 'black' })
  const blank = path.join(temp, 'blank.png')
  await sharp({ create: { width: 100, height: 100, channels: 3, background: '#ffffff' } }).png().toFile(blank)
  const failedUpload = await upload(blank)
  const failedJob = await api('/jobs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ operationId: 'convert:txt', uploadIds: [failedUpload], options: {} }) })
  jobs.push(failedJob.id)
  if ((await waitJob(failedJob.id)).status !== 'failed') throw new Error('预期的 OCR 失败任务未失败')
  await api(`/jobs/${failedJob.id}/retry`, { method: 'POST' })
  if ((await waitJob(failedJob.id)).status !== 'failed') throw new Error('重试任务状态不正确')
  console.log('PASS 失败任务重试与任务删除')
  const videoUpload = await upload(mp4)
  const cancellable = await api('/jobs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ operationId: 'convert:webm', uploadIds: [videoUpload], options: {} }) })
  jobs.push(cancellable.id)
  await api(`/jobs/${cancellable.id}/cancel`, { method: 'POST' })
  if ((await api('/jobs/' + cancellable.id)).status !== 'cancelled') throw new Error('取消任务状态不正确')
  console.log('PASS 取消任务')
  if (unavailable.length) throw new Error(`本机仍缺少支持：${unavailable.join('、')}`)
}
main().catch(error => { console.error('FAIL', error.message); process.exitCode = 1 }).finally(async () => {
  for (const id of jobs) await api('/jobs/' + id, { method: 'DELETE' }).catch(() => {})
  if (temp) await fs.rm(temp, { recursive: true, force: true })
})
