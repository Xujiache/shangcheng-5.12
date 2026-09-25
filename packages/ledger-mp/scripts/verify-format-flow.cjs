#!/usr/bin/env node
'use strict'

// Exercise the actual page controller with WeChat I/O mocked; engines are covered separately.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { stripTypeScriptTypes } = require('node:module')
const { test } = require('node:test')
const source = fs.readFileSync(path.join(__dirname, '../miniprogram/subpackages/format/index/index.ts'), 'utf8')
const code = stripTypeScriptTypes(source.replace(/^import .*$/gm, ''))
const op = (target, inputs, id = `convert:${target}`) => ({ id, targetExtension: target, inputExtensions: inputs, label: `转为 ${target.toUpperCase()}`, kind: 'convert' })
const capabilities = { available: true, limits: { maxFileBytes: 1024, maxBatchBytes: 2048, maxFiles: 3 }, features: { pdfEncryption: false }, operations: [op('png', ['jpg', 'png']), op('webp', ['jpg', 'png']), op('pdf', ['jpg', 'png', 'pdf']), op('pdf', ['pdf'], 'merge-pdfs'), op('pdf', ['jpg', 'png'], 'images-to-pdf'), op('mp4', ['mov']), op('epub', ['txt'])] }
const event = (dataset, value) => ({ currentTarget: { dataset }, detail: { value } })
const file = (name, size = 100) => ({ name, path: `/test/${name}`, size })
function setup() {
  let page
  const calls = { toasts: [], created: [] }
  const api = { capabilities: async () => capabilities, listJobs: async () => [], createJob: async (...args) => { calls.created.push(args); return { id: 'new' } } }
  const wx = { pageScrollTo() {}, showToast: options => calls.toasts.push(options.title), showActionSheet: options => { calls.sheet = options }, chooseMessageFile: options => { calls.message = options }, chooseMedia: options => { calls.media = options } }
  vm.runInNewContext(code, { MotionPage: config => { page = config }, LOCAL_CONVERSION_TEST: true, conversionApi: api, wx, setInterval, clearInterval, Error, console })
  page.setData = values => Object.assign(page.data, values)
  page.setData({ capabilities })
  page.uploadOne = async selected => selected.name
  return { page, calls, api }
}

test('file-first flow: no format without files; source closes before native chooser', async () => {
  const { page, calls } = setup()
  page.openFormatPicker(); assert.equal(page.data.formatOpen, false)
  page.openSourcePicker(); assert.equal(page.data.sourceOpen, true)
  page.chooseMessage(); assert.equal(page.data.sourceOpen, false)
  calls.message.success({ tempFiles: [file('a.jpg')] })
  assert.equal(page.data.files.length, 1)
  await page.start(); assert.equal(page.data.formatOpen, true)
  assert.equal(calls.created.length, 0)
})
test('file visuals use actual image paths, video covers, and distinct file categories', () => {
  const { page, calls } = setup()
  page.appendFiles([file('photo.png'), file('manual.docx'), file('table.xlsx')])
  assert.equal(page.data.files[0].thumbnailPath, '/test/photo.png')
  assert.deepEqual(Array.from(page.data.files, row => row.visualKind), ['image', 'document', 'sheet'])
  page.clearFiles()
  page.appendFiles([file('bundle.zip')])
  assert.equal(page.data.files[0].visualKind, 'archive')
  page.clearFiles()
  page.chooseMedia()
  calls.media.success({ tempFiles: [{ tempFilePath: '/test/clip.mp4', fileType: 'video', size: 100, thumbTempFilePath: '/test/cover.jpg' }] })
  assert.equal(page.data.files[0].visualKind, 'video')
  assert.equal(page.data.files[0].thumbnailPath, '/test/cover.jpg')
  assert.equal(page.data.files[0].mediaPath, '')
  page.clearFiles()
  page.appendFiles([file('chat.mov')])
  assert.equal(page.data.files[0].mediaPath, '/test/chat.mov')
})
test('only common targets are offered; PDF merge requires multiple PDFs', () => {
  const { page } = setup()
  page.appendFiles([file('a.pdf')]); assert.equal(page.data.operations.length, 1)
  page.appendFiles([file('b.pdf')]); assert(page.data.operations.some(item => item.id === 'merge-pdfs'))
  page.appendFiles([file('c.jpg')]); assert.deepEqual(Array.from(page.data.operations, item => item.id), ['convert:pdf'])
})
test('category and case-insensitive search apply together', () => {
  const { page } = setup()
  page.appendFiles([file('a.jpg')]); page.openFormatPicker()
  page.chooseCategory(event({ category: '图片' }))
  assert.equal(page.data.filteredOperations.length, 2)
  page.onFormatQuery(event({}, ' PNG '))
  assert.equal(page.data.filteredOperations[0].id, 'convert:png')
  page.chooseCategory(event({ category: '文档' }))
  assert.equal(page.data.filteredOperations.length, 0)
})
test('invalid or excessive files leave the existing queue unchanged', () => {
  const { page, calls } = setup()
  page.appendFiles([file('a.jpg')])
  page.appendFiles([file('empty.jpg', 0)])
  page.appendFiles([file('large.jpg', 1025)])
  page.appendFiles([file('b.jpg'), file('c.jpg'), file('d.jpg')])
  assert.equal(page.data.files.length, 1); assert.equal(calls.toasts.length, 3)
})
test('sort determines upload order; successful submit opens history', async () => {
  const { page, calls } = setup()
  page.appendFiles([file('a.jpg'), file('b.jpg')])
  page.moveFile(event({ index: 1, direction: -1 }))
  page.chooseOperation(event({ id: 'images-to-pdf' }))
  await page.start()
  assert.equal(calls.created[0][0], 'images-to-pdf')
  assert.deepEqual(Array.from(calls.created[0][1]), ['b.jpg', 'a.jpg'])
  assert.equal(page.data.files.length, 0); assert.equal(page.data.activeTab, 'history'); assert.equal(page.data.busy, false)
})
test('failed submission preserves files, target and returns to visible error', async () => {
  const { page, api } = setup()
  page.appendFiles([file('a.jpg')]); page.chooseOperation(event({ id: 'convert:png' }))
  api.createJob = async () => { throw Error('local failure') }
  page.switchTab(event({ tab: 'history' })); await page.start()
  assert.equal(page.data.activeTab, 'convert'); assert.equal(page.data.error, 'local failure')
  assert.equal(page.data.files.length, 1); assert.equal(page.data.operation.id, 'convert:png'); assert.equal(page.data.busy, false)
})
test('busy state prevents duplicate submission and editing the active request', async () => {
  const { page, calls } = setup()
  page.appendFiles([file('a.jpg')]); page.chooseOperation(event({ id: 'convert:png' })); page.setData({ busy: true })
  await page.start(); page.removeFile(event({ index: 0 })); page.openSourcePicker(); page.chooseOperation(event({ id: 'convert:webp' })); page.onOptionInput(event({ key: 'password' }, 'changed'))
  assert.equal(calls.created.length, 0); assert.equal(page.data.files.length, 1)
  assert.equal(page.data.operation.id, 'convert:png'); assert.equal(page.data.sourceOpen, false); assert.equal(page.data.optionValues.password, undefined)
})
test('changing source clears incompatible target; settings follow selected operation', () => {
  const { page } = setup()
  page.appendFiles([file('a.mov')]); page.chooseOperation(event({ id: 'convert:mp4' })); assert.equal(page.data.showVideoOptions, true)
  page.clearFiles(); page.appendFiles([file('a.txt')]); assert.equal(page.data.operation, null)
  page.chooseOperation(event({ id: 'convert:epub' })); assert.equal(page.data.showTextEncoding, true); assert.equal(page.data.showVideoOptions, false)
})
test('PDF group validation and options survive submission; unavailable encryption is hidden', async () => {
  const { page, calls } = setup()
  await page.refresh(); assert.equal(page.data.pdfActionOptions.length, 1)
  page.appendFiles([file('a.pdf')]); page.chooseOperation(event({ id: 'convert:pdf' }))
  page.onOptionSelect(event({ key: 'splitMode' }, 1)); await page.start(); assert.equal(calls.created.length, 0)
  page.onOptionInput(event({ key: 'groupSize' }, '2')); await page.start()
  assert.equal(calls.created[0][2].splitMode, 'group'); assert.equal(calls.created[0][2].groupSize, '2')
})
test('export and task menus dispatch existing actions without dropping functionality', () => {
  const { page, calls } = setup()
  let action
  page.shareAsset = () => { action = 'share' }; page.saveAsset = () => { action = 'save' }; page.loadAsset = () => { action = 'download' }
  for (const [index, expected] of ['share', 'save', 'download'].entries()) { page.exportAsset(event({})); calls.sheet.success({ tapIndex: index }); assert.equal(action, expected) }
  page.jobAction = e => { action = e.currentTarget.dataset.action }
  for (const [status, index, expected] of [['running', 0, 'cancel'], ['failed', 0, 'retry'], ['failed', 1, 'delete'], ['succeeded', 0, 'delete']]) {
    page.setData({ jobs: [{ id: 'a', status }] }); page.jobMenu(event({ id: 'a' })); calls.sheet.success({ tapIndex: index }); assert.equal(action, expected)
  }
})
