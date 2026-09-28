#!/usr/bin/env node
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')

const root = path.resolve(__dirname, '..')
const scratch = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'fm-pdf-ocr-route-'))
const runtime = process.env.FLYINGMOUSE_TEST_SOURCE_DIR || path.join(scratch, 'runtime')
if (!process.env.FLYINGMOUSE_TEST_SOURCE_DIR) {
  try {
    execFileSync(process.execPath, [path.join(__dirname, 'apply-flyingmouse-platform-fixes.cjs'), '--copy', runtime], { stdio: 'inherit' })
  } catch (error) {
    fs.rmSync(scratch, { recursive: true, force: true })
    throw error
  }
}
const { convertPdf, convertPdfToDocx, validateNativePdfDocx } = require(path.join(runtime, 'pdf.js'))
const { extractPdfRowsByPage } = require(path.join(runtime, 'pdf-table.js'))
const fixture = (name) => path.join(root, 'packages/server/test/fixtures/platform-parity', name)

test.after(() => fsp.rm(scratch, { recursive: true, force: true }))

test('native page with a small figure keeps the layout engine output', async () => {
  const pages = await extractPdfRowsByPage(fixture('native-table.pdf'))
  assert.ok(pages[0].imageCoverage > 0 && pages[0].imageCoverage < 0.7)
  const output = path.join(scratch, 'native.docx')
  const result = await convertPdfToDocx(fixture('native-table.pdf'), output, pages, {
    docenginePath: 'fixture-engine',
    run: async (_engine, args) => fsp.writeFile(args[2], 'layout'),
    validateNativeDocx: async () => ({ editableText: pages[0].rows.flat().join(' '), hasEditableContent: true }),
    ocrAvailable: () => false
  })
  assert.deepEqual(result.warnings, [])
  assert.equal(await fsp.readFile(output, 'utf8'), 'layout')
})

test('full-page scan with a digital numeric header still receives OCR', async () => {
  const output = path.join(scratch, 'scan-header.docx')
  let rendered = 0
  const result = await convertPdfToDocx(fixture('scan-table.pdf'), output,
    [{ pageNumber: 1, rows: [['37']], imageCoverage: 1 }], {
      docenginePath: 'fixture-engine',
      run: async (_engine, args) => fsp.writeFile(args[2], 'layout'),
      validateNativeDocx: async () => ({ editableText: '37', hasEditableContent: true }),
      ocrAvailable: () => true,
      createOcrWorker: async () => ({ terminate: async () => {} }),
      renderPdfTablePage: async () => { rendered++; return { outputPath: 'synthetic-scan.png' } },
      recognizeImageTextWithWorker: async () => '37\n门窗订单 315.50'
    })
  assert.equal(rendered, 1)
  assert.ok(result.warnings.some((warning) => warning.code === 'PDF_PAGES_OCR'))
  assert.match((await validateNativePdfDocx(output)).editableText, /门窗订单 315\.50/)
})

test('genuine mixed PDF stays on the structured conversion route', async () => {
  const output = path.join(scratch, 'mixed.docx')
  let structured = 0
  await convertPdf(fixture('mixed-table.pdf'), output, 'docx', {
    convertStructuredPdf: async ({ outputPath }) => {
      structured++
      await fsp.writeFile(outputPath, 'structured')
    }
  })
  assert.equal(structured, 1)
  assert.equal(await fsp.readFile(output, 'utf8'), 'structured')
})
