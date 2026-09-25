#!/usr/bin/env node
// Run after installing the archived source's production dependencies.
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const source = path.resolve(
  process.env.FLYINGMOUSE_SOURCE_DIR || path.join(root, 'vendor', 'flyingmouse-format', 'v0.7.10'),
)
const config = require(path.join(source, 'config.js'))
const { categoryForExt, targetsForExt } = require(path.join(source, 'utils.js'))
const smoke = require(path.join(root, 'docs/flyingmouse-migration/lightweight-smoke.json'))
const inputs = [
  ...new Set([
    ...config.imageInput,
    ...config.designInput,
    ...config.rawInput,
    ...config.textInput,
    ...config.documentInput,
    ...config.spreadsheetInput,
    ...config.presentationInput,
    ...config.pdfInput,
    ...config.subtitleInput,
    ...config.audioInput,
    ...config.videoInput,
    'zip',
  ]),
].sort()
const tools = {
  ffmpeg: true,
  ocr: true,
  libreoffice: true,
  pandoc: true,
  poppler: true,
  pdfStructure: true,
}
const observed = new Map(
  smoke.cases.map((item) => [`${item.inputExtension}:${item.targetExtension}`, item]),
)
// Small-sample server E2E evidence is recorded in docs/flyingmouse-migration/VALIDATION.md.
const serverVerified = new Set([
  'txt:md',
  'srt:vtt',
  'png:jpg',
  'jpg:png',
  'jpg:webp',
  'png:webp',
  'webp:png',
])
const candidates = inputs.flatMap((inputExtension) =>
  targetsForExt(inputExtension, tools).map((targetExtension) => {
    const cliOptions = []
    const desktopOnlyOptions = []
    if (inputExtension === 'pdf' && targetExtension === 'pdf') {
      cliOptions.push('pdfAction', 'password')
      desktopOnlyOptions.push('splitMode', 'groupSize')
    }
    if (['mp4', 'webm', 'mkv', 'mov'].includes(targetExtension)) {
      cliOptions.push('videoCodec')
      desktopOnlyOptions.push('alphaBackground')
    }
    if (['txt', 'md', 'html', 'csv', 'tsv'].includes(inputExtension) && targetExtension === 'epub')
      cliOptions.push('textEncoding')
    const pair = `${inputExtension}:${targetExtension}`
    const evidence = observed.get(pair)
    const serverSample = serverVerified.has(pair)
    return {
      inputExtension,
      targetExtension,
      operationId: `convert:${targetExtension}`,
      resultExtensions:
        inputExtension === 'pdf' && targetExtension === 'pdf'
          ? ['pdf.zip', 'pdf']
          : inputExtension === 'pdf' && config.pdfImageTargets.includes(targetExtension)
            ? [targetExtension, `${targetExtension}.zip`]
            : [targetExtension],
      category: categoryForExt(inputExtension),
      experimentalInput: config.experimentalInputSet.has(inputExtension),
      cliOptions,
      desktopOnlyOptions,
      status: serverSample
        ? 'server-smoke-verified'
        : evidence
          ? 'linux-source-sample-opened'
          : 'unverified',
      acceptance: {
        linuxArtifactOpens: !!evidence || serverSample,
        windowsCliSampleByteEqual: !!evidence?.windowsCliByteEqual,
        desktopQualityCompared: false,
        workerE2E: serverSample,
        miniProgramDevice: false,
      },
    }
  }),
)
const matrix = {
  sourceVersion: '0.7.10',
  sourceOfTruth: [
    'config.js',
    'utils.js:targetsForExt',
    'server.js:conversion routes',
    'cli.js:VALUE_OPTIONS',
  ],
  note: 'Candidate pairs only. Server smoke verification is small-sample evidence, not desktop quality or mini-program acceptance; production exposure follows the backend allowlist.',
  optionCatalog: {
    videoCodec: ['h264', 'h265', 'av1'],
    textEncoding: ['auto', 'utf-8', 'gb18030', 'utf-16le', 'utf-16be'],
    pdfAction: ['encrypt', 'decrypt'],
    password: 'user-supplied',
    splitMode: ['page', 'group'],
    groupSize: 'positive-integer',
    alphaBackground: 'ASCII color name | 0xRRGGBB[AA] | #RRGGBB[AA]',
  },
  candidates,
  batchOperations: [
    { operationId: 'images-to-pdf', inputCategory: 'image', status: 'unverified' },
    { operationId: 'merge-pdfs', inputCategory: 'pdf', status: 'unverified' },
  ],
}
const output = path.join(root, 'docs', 'flyingmouse-migration', 'format-matrix.json')
fs.writeFileSync(output, JSON.stringify(matrix, null, 2) + '\n')
console.log(
  `${candidates.length} candidate pairs, ${observed.size} Linux sample observations → ${output}`,
)
