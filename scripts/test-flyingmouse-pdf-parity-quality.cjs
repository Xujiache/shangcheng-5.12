const { test } = require('node:test')
const assert = require('node:assert/strict')
const { assertPdfParityQuality } = require('./flyingmouse-pdf-parity-quality.cjs')

const item = { expectByTarget: { docx: ['门窗订单', '315.50'], xlsx: ['门窗订单', '315.50'] },
  expectAssets: { docx: 1 }, expectTableRows: [['门窗订单', '315.50']] }
const output = (path, text = '门窗订单315.50') => ({ text, assets: 1,
  render: { pageCount: 1, pages: [{ width: 600, height: 800, pixelSha256: 'same', pngPath: path }] },
  sheets: [{ rows: [['门窗订单', '315.50']] }] })

test('identical pixels pass despite different artifact paths', () => {
  assert.doesNotThrow(() => assertPdfParityQuality({ item, target: 'docx', sourcePages: 1,
    direct: output('direct.png'), backend: output('backend.png') }))
})

test('both outputs losing the same source phrase fail', () => {
  assert.throws(() => assertPdfParityQuality({ item, target: 'docx', sourcePages: 1,
    direct: output('direct.png', '门窗订单'), backend: output('backend.png', '门窗订单') }),
  /lost source-page content: 315.50/)
})

test('mixed PDF fails when both outputs lose a repeated page table', () => {
  assert.throws(() => assertPdfParityQuality({ item, target: 'xlsx', sourcePages: 2,
    direct: output('direct.png', '门窗订单315.50门窗订单315.50'),
    backend: output('backend.png', '门窗订单315.50门窗订单315.50') }),
  /lost a source-page table/)
})

test('Windows reference cell coordinates satisfy the same table check', () => {
  const reference = output('reference.png')
  reference.sheets = [{ cells: [
    { row: 2, column: 3, value: '门窗订单' }, { row: 2, column: 4, value: '315.50' },
  ] }]
  assert.doesNotThrow(() => assertPdfParityQuality({ item, target: 'xlsx', sourcePages: 1,
    direct: reference, backend: reference }))
})

test('DOCX fails when known text remains but a source page is missing', () => {
  const direct = output('direct.png', '门窗订单315.50门窗订单315.50')
  const backend = output('backend.png', direct.text)
  assert.throws(() => assertPdfParityQuality({ item, target: 'docx', sourcePages: 2,
    direct, backend }), /lost source pages/)
})
