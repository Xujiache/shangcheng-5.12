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
const code = stripTypeScriptTypes(source.replace(/^import[\s\S]*?from '[^']+'$/gm, ''))
const op = (target, inputs, id = `convert:${target}`, options = []) => ({ id, targetExtension: target, inputExtensions: inputs, label: `转为 ${target.toUpperCase()}`, kind: 'convert', options })
const capabilities = { available: true, limits: { maxFileBytes: 1024, textFileBytes: 512, textExtensions: ['txt'], maxBatchBytes: 2048, maxFiles: 3 }, features: { pdfEncryption: false }, operations: [op('png', ['jpg', 'png', 'jp2', 'j2k', 'jxl', 'qoi', 'ppm', 'jfif', 'jpe', 'tif', 'svg', 'heic', 'heif', 'psd']), op('webp', ['jpg', 'png']), op('pdf', ['jpg', 'png', 'pdf'], 'convert:pdf', ['splitMode', 'groupSize']), op('pdf', ['pdf'], 'merge-pdfs'), op('pdf', ['jpg', 'png'], 'images-to-pdf'), op('mp4', ['mov', 'm4s'], 'convert:mp4', ['videoCodec', 'alphaBackground']), op('mkv', ['mov', 'mp4']), op('epub', ['txt'], 'convert:epub', ['textEncoding']), op('txt', ['docx', 'xlsx', 'zip', 'json', 'yaml', 'yml', 'xml', 'log', 'markdown']), op('vtt', ['srt']), op('json', ['txt'])] }
const event = (dataset, value) => ({ currentTarget: { dataset }, detail: { value } })
const file = (name, size = 100) => ({ name, path: `/test/${name}`, size })
function setup() {
  let page
  const calls = { toasts: [], created: [], fileData: {} }
  const api = { capabilities: async () => capabilities, listJobs: async () => [], createJob: async (...args) => { calls.created.push(args); return { id: 'new' } } }
  const wx = { pageScrollTo() {}, showToast: options => calls.toasts.push(options.title), showActionSheet: options => { calls.sheet = options }, chooseMessageFile: options => { calls.message = options }, chooseMedia: options => { calls.media = options }, getFileSystemManager: () => ({ readFile: options => options.success({ data: (calls.fileData[options.filePath] || new Uint8Array()).buffer }) }) }
  vm.runInNewContext(code, { MotionPage: config => { page = config }, LOCAL_CONVERSION_TEST: true, WX_DOWNLOAD_MAX_BYTES: 200_000_000, WX_SAVED_FILE_MAX_BYTES: 100_000_000, conversionApi: api, wx, setInterval, clearInterval, Error, console })
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
test('file visuals use actual image paths, video covers, and distinct file categories', async () => {
  const { page, calls } = setup()
  page.appendFiles([file('photo.png'), file('manual.docx'), file('table.xlsx')])
  assert.equal(page.data.files[0].thumbnailPath, '/test/photo.png')
  assert.deepEqual(Array.from(page.data.files, row => row.visualKind), ['image', 'document', 'sheet'])
  page.clearFiles()
  page.appendFiles([file('bundle.zip')])
  assert.equal(page.data.files[0].visualKind, 'archive')
  page.clearFiles()
  page.chooseMedia()
  await calls.media.success({ tempFiles: [{ tempFilePath: '/test/clip.mp4', fileType: 'video', size: 100, thumbTempFilePath: '/test/cover.jpg' }] })
  assert.equal(page.data.files[0].visualKind, 'video')
  assert.equal(page.data.files[0].thumbnailPath, '/test/cover.jpg')
  assert.equal(page.data.files[0].mediaPath, '')
  page.clearFiles()
  page.appendFiles([file('chat.mov')])
  assert.equal(page.data.files[0].mediaPath, '/test/chat.mov')
})
test('unknown album suffixes are replaced only after reading the media signature', async () => {
  const { page, calls } = setup()
  page.chooseMedia()
  calls.fileData['/test/wxfile'] = Uint8Array.from([0, 0, 0, 20, 102, 116, 121, 112, 113, 116, 32, 32])
  await calls.media.success({ tempFiles: [{ tempFilePath: '/test/wxfile', fileType: 'video', size: 100 }] })
  assert.match(page.data.files[0].name, /\.mov$/)
  assert(page.data.operations.some(item => item.id === 'convert:mp4'))
  page.clearFiles()
  calls.fileData['/test/image.tmp'] = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])
  await calls.media.success({ tempFiles: [{ tempFilePath: '/test/image.tmp', fileType: 'image', size: 100 }] })
  assert.match(page.data.files[0].name, /\.png$/)
  assert.equal(page.data.files[0].visualKind, 'image')
  page.clearFiles()
  calls.fileData['/test/misnamed.jpg'] = calls.fileData['/test/image.tmp']
  await calls.media.success({ tempFiles: [{ tempFilePath: '/test/misnamed.jpg', fileType: 'image', size: 100 }] })
  assert.match(page.data.files[0].name, /\.png$/)
  page.clearFiles()
  calls.fileData['/test/photo.jfif'] = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])
  await calls.media.success({ tempFiles: [{ tempFilePath: '/test/photo.jfif', fileType: 'image', size: 100 }] })
  assert.equal(page.data.files[0].name, 'photo.jfif')
  page.clearFiles()
  calls.fileData['/test/raw.j2k'] = Uint8Array.from([0xff, 0x4f, 0xff, 0x51])
  await calls.media.success({ tempFiles: [{ tempFilePath: '/test/raw.j2k', fileType: 'image', size: 100 }] })
  assert.equal(page.data.files[0].name, 'raw.j2k')
  page.clearFiles()
  await calls.media.success({ tempFiles: [{ tempFilePath: '/test/unknown.tmp', fileType: 'video', size: 100 }] })
  assert.equal(page.data.files.length, 0)
  assert(calls.toasts.includes('无法识别媒体格式'))
})
test('unsupported single files are rejected with a format-specific message', () => {
  const { page, calls } = setup()
  page.appendFiles([file('archive.unknown')])
  assert.equal(page.data.files.length, 0)
  assert.match(calls.toasts[0], /UNKNOWN/)
  page.appendFiles([file('a.jpg'), file('README')])
  assert.deepEqual(Array.from(page.data.files, row => row.name), ['a.jpg'])
  assert(calls.toasts.includes('已跳过不支持的文件'))
})
test('special image and video formats have safe visual fallbacks; subtitles have their own group', () => {
  const { page } = setup()
  for (const extension of ['jp2', 'j2k', 'jxl', 'qoi', 'ppm', 'jfif', 'jpe', 'tif', 'svg', 'heic', 'heif', 'psd']) {
    page.appendFiles([file(`scan.${extension}`)])
    assert.equal(page.data.files[0].visualKind, 'image')
    assert.equal(page.data.files[0].thumbnailPath, '')
    page.clearFiles()
  }
  page.appendFiles([file('clip.m4s')])
  assert.equal(page.data.files[0].visualKind, 'video')
  assert.equal(page.data.files[0].mediaPath, '')
  page.clearFiles()
  page.appendFiles([file('captions.srt')])
  assert.equal(page.data.files[0].visualKind, 'document')
  assert.equal(page.data.operations.find(item => item.id === 'convert:vtt').category, '字幕')
  page.clearFiles()
  for (const extension of ['json', 'yaml', 'yml', 'xml', 'log', 'markdown']) {
    page.appendFiles([file(`notes.${extension}`)])
    assert.equal(page.data.files[0].visualKind, 'document')
    page.clearFiles()
  }
  page.appendFiles([file('notes.txt')])
  assert.equal(page.data.operations.find(item => item.id === 'convert:json').category, '文档')
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
test('text source keeps its tighter engine limit while media uses the raised limit', () => {
  const { page, calls } = setup()
  page.appendFiles([file('notes.txt', 513)])
  assert.equal(page.data.files.length, 0)
  page.appendFiles([file('clip.mp4', 513)])
  assert.equal(page.data.files.length, 1)
  assert.equal(calls.toasts.length, 1)
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
test('settings are shown only when the selected operation accepts them', () => {
  const { page } = setup()
  page.appendFiles([file('a.mov')]); page.chooseOperation(event({ id: 'convert:mkv' }))
  assert.equal(page.data.showVideoOptions, false)
  assert.equal(page.data.visibleOptionKeys.videoCodec, false)
  page.chooseOperation(event({ id: 'convert:mp4' }))
  assert.equal(page.data.visibleOptionKeys.videoCodec, true)
  page.clearFiles(); page.appendFiles([file('a.txt')]); page.chooseOperation(event({ id: 'convert:json' }))
  assert.equal(page.data.showTextEncoding, false)
  page.chooseOperation(event({ id: 'convert:epub' }))
  assert.equal(page.data.showTextEncoding, true)
})
test('PDF group validation and options survive submission; unavailable encryption is hidden', async () => {
  const { page, calls } = setup()
  await page.refresh(); assert.equal(page.data.pdfActionOptions.length, 1)
  assert.match(page.data.limitHint, /文本类/)
  page.appendFiles([file('a.pdf')]); page.chooseOperation(event({ id: 'convert:pdf' }))
  page.onOptionSelect(event({ key: 'splitMode' }, 1)); await page.start(); assert.equal(calls.created.length, 0)
  page.onOptionInput(event({ key: 'groupSize' }, '2')); await page.start()
  assert.equal(calls.created[0][2].splitMode, 'group'); assert.equal(calls.created[0][2].groupSize, '2')
})
test('job submission excludes options unsupported by the selected operation', async () => {
  const { page, calls } = setup()
  page.appendFiles([file('a.jpg')]); page.chooseOperation(event({ id: 'convert:png' }))
  page.setData({ optionValues: { videoCodec: 'h265', textEncoding: 'utf-8' } })
  await page.start()
  assert.deepEqual(Object.keys(calls.created[0][2]), [])
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
test('files beyond WeChat saved-file limit fail before download', async () => {
  const { page, calls } = setup()
  page.setData({ jobs: [{ id: 'job', assets: [{ id: 'asset', sizeBytes: 100_000_000 }] }] })
  page.ensureAsset = async () => { throw Error('must not download') }
  await page.saveAsset(event({ job: 'job', asset: 'asset' }))
  assert(calls.toasts.includes('达到微信本地保存上限（100 MB）'))
})
test('non-previewable result never downloads when preview is invoked', async () => {
  const { page, calls, api } = setup()
  api.listJobs = async () => [{ id: 'job', status: 'succeeded', createdAt: '2026-09-26T00:00:00Z', operationId: 'convert:jp2', uploads: [{ fileName: 'source.png' }], assets: [{ id: 'asset', fileName: 'result.jp2', sizeBytes: 100, mimeType: 'image/jp2' }] }]
  await page.loadJobs()
  assert.equal(page.data.jobs[0].assets[0].canPreview, false)
  let downloadCalled = false
  page.ensureAsset = async () => { downloadCalled = true }
  await page.openAsset(event({ job: 'job', asset: 'asset' }))
  assert.equal(downloadCalled, false)
  assert(calls.toasts.includes('该格式请导出后打开'))
  const markup = fs.readFileSync(path.join(__dirname, '../miniprogram/subpackages/format/index/index.wxml'), 'utf8')
  assert(markup.includes('wx:if="{{asset.canPreview}}"'))
})
test('result above the WeChat download ceiling does not offer preview', async () => {
  const { page, api } = setup()
  api.listJobs = async () => [{ id: 'job', status: 'succeeded', createdAt: '2026-09-26T00:00:00Z', operationId: 'convert:pdf', uploads: [{ fileName: 'source.docx' }], assets: [{ id: 'asset', fileName: 'result.pdf', sizeBytes: 200_000_000, mimeType: 'application/pdf' }] }]
  await page.loadJobs()
  assert.equal(page.data.jobs[0].assets[0].canPreview, false)
})
test('history retains server warnings and renders the review notice', async () => {
  const { page, api } = setup()
  api.listJobs = async () => [{ id: 'job', status: 'succeeded', createdAt: '2026-09-26T00:00:00Z', operationId: 'convert:txt', warnings: ['部分文字识别置信度较低，请对照原件核对。'], uploads: [{ fileName: 'scan.png' }], assets: [] }]
  await page.loadJobs()
  assert.equal(page.data.jobs[0].warnings[0], '部分文字识别置信度较低，请对照原件核对。')
  const markup = fs.readFileSync(path.join(__dirname, '../miniprogram/subpackages/format/index/index.wxml'), 'utf8')
  assert(markup.includes('job.warnings && job.warnings.length'))
  assert(markup.includes('{{warning}}'))
})
