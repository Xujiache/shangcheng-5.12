#!/usr/bin/env node
// Candidate-only Linux acceptance. The existing verifier owns API auth and job cleanup.
const { spawnSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } = require('node:fs')
const { basename, dirname, resolve, sep } = require('node:path')

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
  video: { CONVERSION_VIDEO_INPUTS: process.env.CONVERSION_VIDEO_INPUTS || 'avi,flv,m4s,m4v,mkv,mov,mp4,webm,wmv' },
  subtitle: { CONVERSION_SUBTITLE_INPUTS: process.env.CONVERSION_SUBTITLE_INPUTS || 'srt,vtt,ass,ssa' },
  doc: { CONVERSION_DOCUMENT_INPUTS: process.env.CONVERSION_DOCUMENT_INPUTS || 'odt,rtf,doc',
    CONVERSION_REQUIRE_OFFICE_STRUCTURE: '1' },
  sheet: { CONVERSION_SHEET_INPUTS: process.env.CONVERSION_SHEET_INPUTS || 'xlsx,ods,xls' },
  xlsm: { CONVERSION_XLSM: '1' },
  presentation: { CONVERSION_PRESENTATIONS: 'all' },
  pdfContent: { CONVERSION_PDF_TEXT: '1', CONVERSION_PDF_SIMPLE: '1', CONVERSION_PDF_TABLE: '1' },
  arch: { CONVERSION_ZIP: '1', CONVERSION_EPUB: '1', CONVERSION_MOBI: '1' },
  raw: { CONVERSION_RAW_TARGETS: process.env.CONVERSION_RAW_TARGETS || 'avif,bmp,gif,ico,jp2,jpg,jxl,mp4,pdf,png,ppm,qoi,tga,tiff,webm,webp' },
  rawOcr: { CONVERSION_RAW_TARGETS: process.env.CONVERSION_RAW_TARGETS || 'docx,md,txt' },
  vector: { CONVERSION_RAW_TARGETS: process.env.CONVERSION_RAW_TARGETS || 'avif,bmp,gif,ico,jp2,jpg,jxl,mp4,pdf,png,ppm,qoi,tga,tiff,webm,webp' },
  vectorOcr: { CONVERSION_RAW_TARGETS: process.env.CONVERSION_RAW_TARGETS || 'docx,md,txt' },
  psd: { CONVERSION_RAW_SAMPLE: resolve(dirname(cases), 'graphic.psd'),
    CONVERSION_RAW_TARGETS: process.env.CONVERSION_RAW_TARGETS || 'avif,bmp,gif,ico,jp2,jpg,jxl,mp4,pdf,png,ppm,qoi,tga,tiff,webm,webp' },
  psdOcr: { CONVERSION_RAW_SAMPLE: resolve(dirname(cases), 'graphic-text.psd'),
    CONVERSION_RAW_TARGETS: process.env.CONVERSION_RAW_TARGETS || 'docx,md,txt',
    CONVERSION_RAW_OCR_EXPECT: 'WINDOW ORDERTOTAL 315.50' },
  legacyDoc: {}, legacySheet: {}, legacySlide: {}, ofd: {},
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
const operationsEvidence = `${evidenceBase}.operations.jsonl`
const env = {
  ...process.env,
  NODE_ENV: 'test',
  FLYINGMOUSE_ACCEPTANCE_READONLY: '1',
  CONVERSION_JOB_EVIDENCE: jobsEvidence,
  CONVERSION_PAIR_EVIDENCE: pairsEvidence,
  CONVERSION_OPERATION_EVIDENCE: operationsEvidence,
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
const sampleByBatch = {
  raw: 'CONVERSION_RAW_SAMPLE', rawOcr: 'CONVERSION_RAW_SAMPLE',
  vector: 'CONVERSION_VECTOR_SAMPLE', vectorOcr: 'CONVERSION_VECTOR_SAMPLE',
  legacyDoc: 'CONVERSION_LEGACY_DOCUMENT_SAMPLE',
  legacySheet: 'CONVERSION_LEGACY_SHEET_SAMPLE',
  legacySlide: 'CONVERSION_LEGACY_PRESENTATION_SAMPLE', ofd: 'CONVERSION_OFD_SAMPLE',
}
const sampleName = sampleByBatch[batch]
if (['raw', 'rawOcr', 'vector', 'vectorOcr', 'psd', 'psdOcr'].includes(batch)) {
  const allowed = new Set((batch.endsWith('Ocr') ? 'docx,md,txt' :
    'avif,bmp,gif,ico,jp2,jpg,jxl,mp4,pdf,png,ppm,qoi,tga,tiff,webm,webp').split(','))
  if (env.CONVERSION_RAW_TARGETS.split(',').some((target) => !allowed.has(target)))
    throw new Error(`Unsupported target for ${batch}: ${env.CONVERSION_RAW_TARGETS}`)
}
if (sampleName) {
  const fixtureRoot = process.env.CONVERSION_FIXTURE_ROOT
  const sample = env[sampleName]
  if (!fixtureRoot || !sample || !existsSync(sample) ||
    !realpathSync(sample).startsWith(realpathSync(fixtureRoot) + sep))
    throw new Error(`${batch} requires ${sampleName} under CONVERSION_FIXTURE_ROOT`)
  const matrix = JSON.parse(readFileSync(resolve(root, 'docs/linux-windows-parity/matrix-fixtures.json'), 'utf8'))
  const known = [
    ...Object.values(matrix.inputExtensions).map((item) => item.candidate).filter(Boolean),
    ...matrix.legacyReplayFixtures.files,
    ...(matrix.ocrCandidates || []),
  ].filter((item) => basename(item.resourceId || '') === basename(sample))
  const expectedHashes = new Set(known.map((item) => item.sha256))
  if (expectedHashes.size !== 1 ||
    createHash('sha256').update(readFileSync(sample)).digest('hex') !== [...expectedHashes][0])
    throw new Error(`Unknown or SHA-256-mismatched public fixture: ${sample}`)
  const extension = basename(sample).split('.').pop().toLowerCase()
  const rawExtensions = new Set(['3fr', 'arw', 'cr2', 'cr3', 'crw', 'dng', 'erf', 'fff', 'iiq',
    'kdc', 'mef', 'mrw', 'nef', 'orf', 'pef', 'raf', 'rw2', 'srw', 'x3f'])
  if ((batch.startsWith('raw') && !rawExtensions.has(extension)) ||
    (batch.startsWith('vector') && extension !== 'ai') ||
    (batch === 'legacyDoc' && !['wps', 'wpt', 'wpd'].includes(extension)) ||
    (batch === 'legacySheet' && !['et', 'ett'].includes(extension)) ||
    (batch === 'legacySlide' && !['dps', 'dpt'].includes(extension)) ||
    (batch === 'ofd' && extension !== 'ofd'))
    throw new Error(`Unexpected fixture type for ${batch}: ${extension}`)
  if (batch === 'rawOcr' || batch === 'vectorOcr') {
    const qualified = (matrix.ocrCandidates || []).find((item) =>
      basename(item.resourceId) === basename(sample) && item.sha256 === [...expectedHashes][0])
    if (!qualified?.expectedText?.includes(env.CONVERSION_RAW_OCR_EXPECT))
      throw new Error(`${batch} requires a visually qualified phrase for the exact fixture SHA-256`)
  }
  if (batch === 'legacySlide' && !env.CONVERSION_LEGACY_PRESENTATION_TARGETS) {
    const catalog = require('../packages/server/src/modules/ledger-conversion/conversion.catalog.json')
    env.CONVERSION_LEGACY_PRESENTATION_TARGETS = catalog.operations
      .filter((operation) => operation.kind === 'convert' &&
        operation.inputExtensions.includes(extension)).map((operation) => operation.targetExtension).join(',')
  }
  if (batch === 'legacySlide' && basename(sample).startsWith('synthetic-slides.')) {
    env.CONVERSION_LEGACY_PRESENTATION_PAGES = '2'
    env.CONVERSION_LEGACY_PRESENTATION_REQUIRE_IMAGES = '1'
  }
  if (batch === 'legacySheet' && basename(sample).startsWith('synthetic-formula.')) {
    env.CONVERSION_LEGACY_SHEET_MIN_SHEETS = '2'
    env.CONVERSION_LEGACY_SHEET_MIN_FORMULAS = '1'
  }
  if (batch === 'legacyDoc' && basename(sample).startsWith('synthetic-office-rich.'))
    env.CONVERSION_LEGACY_DOCUMENT_REQUIRE_STRUCTURE = '1'
}
if (['rawOcr', 'vectorOcr'].includes(batch) &&
  (!env.CONVERSION_RAW_OCR_EXPECT || env.CONVERSION_RAW_OCR_EXPECT.replace(/\s+/g, '').length < 4))
  throw new Error(`${batch} requires a visible text phrase in CONVERSION_RAW_OCR_EXPECT`)
for (const [selected, required] of Object.entries({ legacyDoc: 'CONVERSION_LEGACY_EXPECT',
  legacySheet: 'CONVERSION_LEGACY_SHEET_EXPECT', legacySlide: 'CONVERSION_LEGACY_PRESENTATION_EXPECT',
  ofd: 'CONVERSION_OFD_EXPECT' }))
  if (batch === selected && !env[required]) throw new Error(`${batch} requires ${required}`)
if (batch === 'doc' && !env.CONVERSION_SAMPLE_DOCX)
  env.CONVERSION_SAMPLE_DOCX = resolve(dirname(cases), 'office-chinese.docx')
if (batch === 'doc' && !hashes['office-chinese.docx'])
  throw new Error('Document batch requires tracked office-SHA256.json provenance')
for (const file of [env.CONVERSION_SAMPLE_DOCX, env.CONVERSION_RAW_SAMPLE].filter(Boolean)) {
  const expected = hashes[require('node:path').basename(file)]
  if (['graphic.psd', 'graphic-text.psd'].includes(require('node:path').basename(file)) && !expected)
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
for (const path of [evidence, jobsEvidence, pairsEvidence, operationsEvidence]) {
  try {
    lstatSync(path)
    throw new Error(`Evidence already exists; use a new path: ${path}`)
  } catch (error) { if (error.code !== 'ENOENT') throw error }
}
for (const path of [evidence, jobsEvidence, pairsEvidence, operationsEvidence]) writeFileSync(path, '')
const child = spawnSync(process.execPath, [
  resolve(root, 'packages/server/scripts/verify-local-original-conversion.cjs'),
], { cwd: root, env, stdio: 'inherit', timeout: 2 * 60 * 60 * 1000 })
if (child.error) {
  writeFileSync(evidence, JSON.stringify({ batch, status: 'fail', error: child.error.message }) + '\n')
  throw child.error
}
const jobRows = readFileSync(jobsEvidence, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
const pairRows = readFileSync(pairsEvidence, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
const operationRows = readFileSync(operationsEvidence, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
const pairCounts = { events: pairRows.length, passed: pairRows.filter((row) => row.status === 'pass').length,
  failed: pairRows.filter((row) => row.status === 'fail').length }
const jobCounts = { events: jobRows.length, passed: jobRows.filter((row) => row.status === 'pass').length,
  failed: jobRows.filter((row) => row.status !== 'pass').length }
const catalog = require('../packages/server/src/modules/ledger-conversion/conversion.catalog.json')
const acceptedKeys = new Set(catalog.operations.filter((operation) => operation.kind === 'convert')
  .flatMap((operation) => operation.inputExtensions.map((input) => `${input}:${operation.targetExtension}`)))
const currentPairs = new Map()
for (const row of pairRows) {
  const key = `${row.input}:${row.output}`
  if (acceptedKeys.has(key))
    currentPairs.set(key, row.status !== 'pass' || currentPairs.get(key) === 'fail' ? 'fail' : 'pass')
}
const currentCoverage = { total: catalog.pairCount,
  passed: [...currentPairs.values()].filter((status) => status === 'pass').length,
  failed: [...currentPairs.values()].filter((status) => status === 'fail').length,
  notRun: catalog.pairCount - currentPairs.size }
const currentOperations = new Map()
for (const row of jobRows) {
  if (catalog.operations.some((operation) => operation.id === row.operationId))
    currentOperations.set(row.operationId,
      row.status !== 'pass' || currentOperations.get(row.operationId) === 'fail' ? 'fail' : 'pass')
}
const jobOperationCoverage = { total: catalog.operations.length,
  passed: [...currentOperations.values()].filter((status) => status === 'pass').length,
  failed: [...currentOperations.values()].filter((status) => status === 'fail').length,
  notRun: catalog.operations.length - currentOperations.size }
const qualityOperations = new Map()
for (const [key, status] of currentPairs) {
  const operationId = `convert:${key.split(':')[1]}`
  qualityOperations.set(operationId,
    status === 'fail' || qualityOperations.get(operationId) === 'fail' ? 'fail' : 'pass')
}
for (const row of operationRows) {
  if (catalog.operations.some((operation) => operation.id === row.operationId && operation.kind !== 'convert'))
    qualityOperations.set(row.operationId,
      row.status !== 'pass' || qualityOperations.get(row.operationId) === 'fail' ? 'fail' : 'pass')
}
const qualityOperationCoverage = { total: catalog.operations.length,
  passed: [...qualityOperations.values()].filter((status) => status === 'pass').length,
  failed: [...qualityOperations.values()].filter((status) => status === 'fail').length,
  notRun: catalog.operations.length - qualityOperations.size }
if (batch !== 'pdf') {
  const result = { batch, status: child.status === 0 ? 'batch-passed' : 'fail',
    inputs: env.CONVERSION_TEXT_INPUTS || env.CONVERSION_IMAGE_INPUTS ||
      env.CONVERSION_AUDIO_INPUTS || env.CONVERSION_VIDEO_INPUTS ||
      env.CONVERSION_DOCUMENT_INPUTS || env.CONVERSION_SHEET_INPUTS || batch,
    pairs: pairCounts, jobs: jobCounts, operationQualityEvents: operationRows.length,
    currentCoverage, jobOperationCoverage,
    qualityOperationCoverage, qualityEvidenceComplete: child.status === 0,
    historicalMatrixStatus: 'not-run' }
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
  pairs: pairCounts, jobs: jobCounts, operationQualityEvents: operationRows.length,
  currentCoverage, jobOperationCoverage,
  qualityOperationCoverage, qualityEvidenceComplete: child.status === 0,
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
