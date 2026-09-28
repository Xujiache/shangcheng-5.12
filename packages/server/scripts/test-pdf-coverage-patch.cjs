const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const { test } = require('node:test')
const vm = require('node:vm')

const root = path.resolve(__dirname, '../../..')
const source = path.join(root, 'vendor/flyingmouse-format/upstream-a7b9b15/pdf.js')
const patchScript = fs.readFileSync(path.join(root, 'scripts/apply-flyingmouse-platform-fixes.cjs'), 'utf8')
const replacement = /const pdfCoverageAfter = (`[\s\S]*?`)\n(?:const|function) /.exec(patchScript)?.[1]
if (!replacement) throw new Error('PDF coverage patch was not found')
const before = '      return expected.length > 1 && !actual.includes(expected);'
const original = fs.readFileSync(source, 'utf8')
if (original.split(before).length !== 2) throw new Error('Expected one PDF coverage patch site')
const compiled = new Module(source, module)
compiled.filename = source
compiled.paths = Module._nodeModulePaths(path.dirname(source))
compiled._compile(original.replace(before, vm.runInNewContext(replacement)), source)
const { missingPdfText } = compiled.exports
const pages = (cell) => [{ pageNumber: 1, rows: [[cell]] }]

test('one inserted glyph in editable text preserves every original glyph', () => {
  assert.deepEqual(missingPdfText(pages('HORIZONTALTEXT'), 'HORIZONTALXTEXT'), [])
  assert.deepEqual(missingPdfText(pages('HORIZONTALTEXT'), 'HORIZONTALTEXT'), [])
})

test('an omitted or replaced original glyph still fails coverage', () => {
  assert.deepEqual(missingPdfText(pages('HORIZONTALTEXT'), 'HORZONTALTEXT'),
    [{ pageNumber: 1, text: 'HORIZONTALTEXT' }])
  assert.deepEqual(missingPdfText(pages('HORIZONTALTEXT'), 'HORIZONTALXTEX'),
    [{ pageNumber: 1, text: 'HORIZONTALTEXT' }])
  assert.deepEqual(missingPdfText(pages('HORIZONTALTEXT'), 'HORZONTALXTEXT'),
    [{ pageNumber: 1, text: 'HORIZONTALTEXT' }])
})
