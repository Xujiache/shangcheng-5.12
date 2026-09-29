#!/usr/bin/env node
// Generate the API catalogue from the pinned original source, never from a hand-maintained pair list.
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const source = path.join(root, 'vendor/flyingmouse-format/upstream-a7b9b15')
const { categoryForExt, targetsForExt } = require(path.join(source, 'utils.js'))
const config = require(path.join(source, 'config.js'))
const supportsImageBlanks = /req\.body\?\.blanks/.test(fs.readFileSync(path.join(source, 'server.js'), 'utf8'))
const inputs = [...new Set([
  ...config.imageInput, ...config.designInput, ...config.rawInput,
  ...config.textInput, ...config.documentInput, ...config.spreadsheetInput,
  ...config.presentationInput, ...config.pdfInput, ...config.subtitleInput,
  ...config.audioInput, ...config.videoInput, 'zip',
])].sort()
const allTools = {
  ffmpeg: true, ocr: true, libreoffice: true, pandoc: true,
  poppler: true, pdfStructure: true,
}
const targets = new Map()
for (const input of inputs) {
  for (const target of targetsForExt(input, allTools)) {
    if (!targets.has(target)) targets.set(target, [])
    targets.get(target).push(input)
  }
}
const operations = [...targets].sort(([a], [b]) => a.localeCompare(b)).map(([target, sources]) => {
  const matching = (predicate) => sources.filter(predicate)
  const pdf = target === 'pdf' ? matching((source) => source === 'pdf') : []
  const video = ['mp4', 'webm', 'mkv', 'mov'].includes(target)
  const media = video ? matching((source) => ['audio', 'video'].includes(categoryForExt(source))) : []
  const videoSources = video ? matching((source) => categoryForExt(source) === 'video') : []
  const epubText = target === 'epub'
    ? matching((source) => (categoryForExt(source) === 'text' && !['epub', 'mobi'].includes(source))
      || ['csv', 'tsv'].includes(source)) : []
  const optionInputExtensions = Object.fromEntries(Object.entries({
    pdfAction: pdf, password: pdf, splitMode: pdf, groupSize: pdf,
    videoCodec: media, alphaBackground: videoSources, textEncoding: epubText,
  }).filter(([, allowed]) => allowed.length))
  return {
    id: `convert:${target}`,
    label: `转为 ${target.toUpperCase()}`,
    inputExtensions: sources,
    targetExtension: target,
    kind: 'convert',
    options: Object.keys(optionInputExtensions),
    optionInputExtensions,
  }
})
const imagePdfInputs = [...new Set([...config.imageInput, ...config.designInput, ...config.rawInput])].sort()
operations.push({
  id: 'images-to-pdf', label: '图片合成 PDF',
  inputExtensions: imagePdfInputs,
  targetExtension: 'pdf', kind: 'images-to-pdf',
  options: supportsImageBlanks ? ['blanks'] : [],
  optionInputExtensions: supportsImageBlanks ? { blanks: imagePdfInputs } : {},
}, {
  id: 'merge-pdfs', label: '合并 PDF', inputExtensions: ['pdf'],
  targetExtension: 'pdf', kind: 'merge-pdfs', options: [],
})
const output = path.join(root, 'packages/server/src/modules/ledger-conversion/conversion.catalog.json')
const catalog = {
  sourceRevision: 'a7b9b15d32db80cecedae00e89289088656fb1ae',
  source: 'config.js + utils.js:targetsForExt + server.js:blanks (all original engines present)',
  pairCount: [...targets.values()].reduce((sum, items) => sum + items.length, 0),
  operations,
}
const content = JSON.stringify(catalog, null, 2) + '\n'
if (process.argv.includes('--check')) {
  if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== content) {
    console.error('Conversion catalogue is stale; run scripts/generate-flyingmouse-operations.cjs')
    process.exitCode = 1
  }
} else {
  fs.writeFileSync(output, content)
  console.log(`${catalog.pairCount} original pairs, ${operations.length} operations`)
}
