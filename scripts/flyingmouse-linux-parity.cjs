#!/usr/bin/env node
// Candidate-only Linux acceptance. The existing verifier owns API auth and job cleanup.
const { spawnSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs')
const { dirname, resolve } = require('node:path')

const root = resolve(__dirname, '..')
const args = process.argv.slice(2)
const value = (name) => {
  const index = args.indexOf(name)
  return index < 0 ? undefined : args[index + 1]
}
const cases = value('--cases')
const evidence = value('--evidence')
const batch = value('--batch') || 'pdf'
const batches = {
  baseline: { CONVERSION_BASELINE_SECTION: 'baseline' },
  text: { CONVERSION_BASELINE_SECTION: 'text', CONVERSION_TEXT_INPUTS: process.env.CONVERSION_TEXT_INPUTS || 'txt,md,markdown,log,yaml,yml,xml,json,html,htm,csv,tsv' },
  image: { CONVERSION_BASELINE_SECTION: 'image', CONVERSION_IMAGE_INPUTS: process.env.CONVERSION_IMAGE_INPUTS || 'png,svg,avif,bmp,gif,ico,jp2,j2k,jpg,jpe,jpeg,jfif,jxl,ppm,qoi,tga,tif,tiff,webp,heic,heif' },
  audio: { CONVERSION_BASELINE_SECTION: 'audio', CONVERSION_AUDIO_INPUTS: process.env.CONVERSION_AUDIO_INPUTS || 'wav,aac,flac,m4a,mp3,ogg,opus,wma' },
  video: { CONVERSION_VIDEO_INPUTS: process.env.CONVERSION_VIDEO_INPUTS || 'mp4,mov,mkv,webm' },
  doc: { CONVERSION_DOCUMENT_INPUTS: process.env.CONVERSION_DOCUMENT_INPUTS || 'odt,rtf,doc',
    CONVERSION_REQUIRE_OFFICE_STRUCTURE: '1' },
  sheet: { CONVERSION_SHEET_INPUTS: process.env.CONVERSION_SHEET_INPUTS || 'xlsx,ods,xls' },
  presentation: { CONVERSION_PRESENTATIONS: 'all' },
  arch: { CONVERSION_ZIP: '1', CONVERSION_EPUB: '1', CONVERSION_MOBI: '1' },
  options: { CONVERSION_OPTIONS: '1' },
  original: { CONVERSION_OPTIONS: '1', CONVERSION_CONTROL_FLOW: '1' },
}
if (batch !== 'pdf' && !batches[batch]) throw new Error(`Unsupported batch: ${batch}`)
if (process.platform !== 'linux' && !args.includes('--check'))
  throw new Error('Run this acceptance against an isolated Linux candidate stack')
if (!cases || !evidence || !existsSync(cases))
  throw new Error('Usage: node scripts/flyingmouse-linux-parity.cjs --cases cases.json --evidence result.jsonl [--windows-reference reference.json] [--office] [--media] [--options]')
const manifest = JSON.parse(readFileSync(cases, 'utf8'))
const hashesPath = resolve(dirname(cases), 'SHA256.json')
const officeHashesPath = resolve(dirname(cases), 'office-SHA256.json')
const hashes = {
  ...(existsSync(hashesPath) ? JSON.parse(readFileSync(hashesPath, 'utf8')).files : {}),
  ...(existsSync(officeHashesPath) ? JSON.parse(readFileSync(officeHashesPath, 'utf8')).files : {}),
}
if (!Array.isArray(manifest) || !manifest.length ||
  !new Set(manifest.map((item) => item.kind)).has('native') ||
  !new Set(manifest.map((item) => item.kind)).has('scan') ||
  !new Set(manifest.map((item) => item.kind)).has('mixed'))
  throw new Error('Cases must include native, scan, and mixed PDFs')
for (const item of manifest) {
  const file = resolve(dirname(cases), item.path || '')
  if (!item.path || !existsSync(file) ||
    !Array.isArray(item.expect) || !item.expect.length)
    throw new Error(`Missing local fixture or expected content: ${item.kind}`)
  const expected = hashes[item.path]
  if (expected && createHash('sha256').update(readFileSync(file)).digest('hex') !== expected)
    throw new Error(`Fixture SHA-256 mismatch: ${item.path}`)
}
for (const name of ['DATABASE_URL', 'JWT_SECRET', 'FLYINGMOUSE_TEST_SOURCE_DIR',
  'FLYINGMOUSE_FFMPEG_PATH', 'FLYINGMOUSE_LIBREOFFICE_PATH', 'FLYINGMOUSE_PDFTOPPM_PATH'])
  if (!process.env[name]) throw new Error(`${name} is required`)
const database = new URL(process.env.DATABASE_URL)
const api = new URL(process.env.CONVERSION_TEST_API || 'http://127.0.0.1:3001')
if (!['127.0.0.1', 'localhost'].includes(database.hostname) ||
  !['127.0.0.1', 'localhost'].includes(api.hostname) ||
  !database.pathname.endsWith('_test') || api.port === '3003')
  throw new Error('Use an isolated localhost test database and candidate API, never production')
const referencePath = value('--windows-reference')
const referenceData = referencePath ? JSON.parse(readFileSync(referencePath, 'utf8')) : null
const reference = Array.isArray(referenceData) ? Object.fromEntries(referenceData.map((item) =>
  [item.label, item])) : referenceData
const evidenceBase = resolve(evidence).replace(/\.jsonl$/, '')
const jobsEvidence = `${evidenceBase}.jobs.jsonl`
const pairsEvidence = `${evidenceBase}.pairs.jsonl`
const env = {
  ...process.env,
  NODE_ENV: 'test',
  FLYINGMOUSE_ACCEPTANCE_READONLY: '1',
  CONVERSION_JOB_EVIDENCE: jobsEvidence,
  CONVERSION_PAIR_EVIDENCE: pairsEvidence,
  CONVERSION_SKIP_BASELINE: '1',
  CONVERSION_TEST_JOB_TIMEOUT_SECONDS: batch === 'pdf' ? '720' :
    (process.env.CONVERSION_TEST_JOB_TIMEOUT_SECONDS || '90'),
  ...(batch === 'pdf' ? { CONVERSION_PDF_PARITY_CASES: resolve(cases),
    CONVERSION_PARITY_EVIDENCE: resolve(evidence) } : batches[batch]),
  ...(batch === 'pdf' && args.includes('--office') ? { CONVERSION_PDF_TABLE: '1',
    CONVERSION_PRESENTATIONS: '1', CONVERSION_SHEET_INPUTS: 'xlsx' } : {}),
  ...(batch === 'pdf' && args.includes('--media') ? { CONVERSION_VIDEO_INPUTS: 'mp4' } : {}),
  ...(batch === 'pdf' && args.includes('--options') ? { CONVERSION_OPTIONS: '1' } : {}),
}
if (batch === 'doc' && !env.CONVERSION_SAMPLE_DOCX)
  env.CONVERSION_SAMPLE_DOCX = resolve(dirname(cases), 'office-chinese.docx')
if (batch === 'doc' && !hashes['office-chinese.docx'])
  throw new Error('Document batch requires tracked office-SHA256.json provenance')
for (const file of [env.CONVERSION_SAMPLE_DOCX, env.CONVERSION_RAW_SAMPLE].filter(Boolean)) {
  const expected = hashes[require('node:path').basename(file)]
  if (require('node:path').basename(file) === 'graphic.psd' && !expected)
    throw new Error('PSD fixture requires tracked office-SHA256.json provenance')
  if (!existsSync(file) || (expected && createHash('sha256').update(readFileSync(file)).digest('hex') !== expected))
    throw new Error(`Supplementary fixture missing or SHA-256 mismatch: ${file}`)
}
if (args.includes('--check')) {
  console.log(JSON.stringify({ batch, cases: manifest.length, targets: batch === 'pdf' ? ['docx', 'xlsx'] : null,
    windowsReference: Boolean(reference), office: args.includes('--office'),
    media: args.includes('--media'), options: args.includes('--options') }))
  process.exit(0)
}
mkdirSync(dirname(resolve(evidence)), { recursive: true })
for (const path of [evidence, jobsEvidence, pairsEvidence]) {
  try {
    lstatSync(path)
    throw new Error(`Evidence already exists; use a new path: ${path}`)
  } catch (error) { if (error.code !== 'ENOENT') throw error }
}
for (const path of [evidence, jobsEvidence, pairsEvidence]) writeFileSync(path, '')
const child = spawnSync(process.execPath, [
  resolve(root, 'packages/server/scripts/verify-local-original-conversion.cjs'),
], { cwd: root, env, stdio: 'inherit', timeout: 2 * 60 * 60 * 1000 })
if (child.error) {
  writeFileSync(evidence, JSON.stringify({ batch, status: 'fail', error: child.error.message }) + '\n')
  throw child.error
}
const jobRows = readFileSync(jobsEvidence, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
const pairRows = readFileSync(pairsEvidence, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
const pairCounts = { events: pairRows.length, passed: pairRows.filter((row) => row.status === 'pass').length,
  failed: pairRows.filter((row) => row.status === 'fail').length }
const jobCounts = { events: jobRows.length, passed: jobRows.filter((row) => row.status === 'pass').length,
  failed: jobRows.filter((row) => row.status !== 'pass').length }
if (batch !== 'pdf') {
  const result = { batch, status: child.status === 0 ? 'batch-passed' : 'fail',
    inputs: env.CONVERSION_TEXT_INPUTS || env.CONVERSION_IMAGE_INPUTS ||
      env.CONVERSION_AUDIO_INPUTS || env.CONVERSION_VIDEO_INPUTS ||
      env.CONVERSION_DOCUMENT_INPUTS || env.CONVERSION_SHEET_INPUTS || batch,
    pairs: pairCounts, jobs: jobCounts, historicalMatrixStatus: 'not-run' }
  writeFileSync(evidence, JSON.stringify(result) + '\n')
  console.log(JSON.stringify(result))
  if (child.status !== 0) process.exitCode = 1
} else {
const lines = readFileSync(evidence, 'utf8').trim().split('\n').filter(Boolean)
const results = lines.map((line) => JSON.parse(line))
for (const result of results) {
  const expected = reference?.[result.label]
  const visual = expected?.render && result.backendRender
  const pixels = (render) => ({ pageCount: render.pageCount,
    pages: render.pages.map((page) => ({ width: page.width, height: page.height,
      pixelSha256: page.pixelSha256 })) })
  result.windowsComparison = !reference || !expected || !visual ? 'not-compared'
    : result.status !== 'pass' || expected.status !== 'pass' ? 'blocked'
      : expected.inputSha256 === result.inputSha256 &&
        expected.contentSha256 === result.contentSha256 &&
        JSON.stringify(pixels(expected.render)) === JSON.stringify(pixels(result.backendRender)) ? 'pass' : 'fail'
}
writeFileSync(evidence, results.map((item) => JSON.stringify(item)).join('\n') + '\n')
console.log(JSON.stringify({ checked: results.length, expected: manifest.length * 2,
  pairs: pairCounts, jobs: jobCounts,
  passed: results.filter((item) => item.status === 'pass').length,
  failed: results.filter((item) => item.status !== 'pass').length,
  windowsCompared: results.filter((item) => item.windowsComparison === 'pass').length,
  windowsNotCompared: results.filter((item) => item.windowsComparison === 'not-compared').length,
  windowsBlocked: results.filter((item) => item.windowsComparison === 'blocked').length,
  windowsFailed: results.filter((item) => item.windowsComparison === 'fail').length }))
if (child.status !== 0 || results.length !== manifest.length * 2 ||
  results.some((item) => item.status !== 'pass') ||
  (reference && results.some((item) => item.windowsComparison !== 'pass'))) process.exitCode = 1
}
