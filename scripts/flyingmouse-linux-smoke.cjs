#!/usr/bin/env node
// Run with Linux Node after `npm ci --omit=dev` in a copy of the source snapshot.
const { createHash } = require('node:crypto')
const { spawnSync } = require('node:child_process')
const { createRequire } = require('node:module')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

if (process.platform !== 'linux') throw new Error('Linux runtime required')
const source = path.resolve(
  process.argv[2] || path.join(__dirname, '../vendor/flyingmouse-format/v0.7.10'),
)
const parent = path.resolve(process.argv[3] || os.tmpdir())
const work = fs.mkdtempSync(path.join(parent, 'flyingmouse-smoke-'))
const inputs = path.join(work, 'inputs')
const outputs = path.join(work, 'outputs')
fs.mkdirSync(inputs)
fs.mkdirSync(outputs)
const vendorRequire = createRequire(path.join(source, 'package.json'))
const sharp = vendorRequire('sharp')
const cases = [
  { name: 'TXT→MD', input: 'sample.txt', target: 'md' },
  { name: 'SRT→VTT', input: 'sample.srt', target: 'vtt' },
  { name: 'PNG→JPG', input: 'sample.png', target: 'jpg' },
]

async function main() {
  fs.writeFileSync(path.join(inputs, 'sample.txt'), 'Hello\n门窗利账\n')
  fs.writeFileSync(path.join(inputs, 'sample.srt'), '1\n00:00:01,000 --> 00:00:02,000\n你好\n')
  await sharp({ create: { width: 2, height: 2, channels: 4, background: '#ff000080' } })
    .png()
    .toFile(path.join(inputs, 'sample.png'))
  const evidence = { platform: process.platform, node: process.version, source, work, cases: [] }
  for (const item of cases) {
    const result = spawnSync(
      process.execPath,
      [
        path.join(source, 'cli.js'),
        'convert',
        path.join(inputs, item.input),
        '--to',
        item.target,
        '--output-dir',
        outputs,
        '--json',
      ],
      { cwd: source, encoding: 'utf8', timeout: 180_000, maxBuffer: 2_000_000 },
    )
    if (result.status !== 0)
      throw new Error(`${item.name}: ${result.stderr || result.error || result.stdout}`)
    const parsed = JSON.parse(result.stdout.trim())
    if (!parsed.ok || parsed.outputs?.length !== 1)
      throw new Error(`${item.name}: invalid CLI response`)
    const file = path.resolve(parsed.outputs[0].path)
    if (!file.startsWith(outputs + path.sep) || !fs.statSync(file).isFile())
      throw new Error(`${item.name}: output path invalid`)
    if (item.target === 'md' && !fs.readFileSync(file, 'utf8').includes('门窗利账'))
      throw new Error(`${item.name}: text lost`)
    if (item.target === 'vtt' && !fs.readFileSync(file, 'utf8').startsWith('WEBVTT'))
      throw new Error(`${item.name}: VTT header missing`)
    if (item.target === 'jpg') {
      const metadata = await sharp(file).metadata()
      if (metadata.format !== 'jpeg' || metadata.width !== 2 || metadata.height !== 2)
        throw new Error(`${item.name}: JPEG cannot be opened`)
    }
    const data = fs.readFileSync(file)
    evidence.cases.push({
      name: item.name,
      path: file,
      bytes: data.length,
      sha256: createHash('sha256').update(data).digest('hex'),
    })
  }
  const evidencePath = path.join(work, 'evidence.json')
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n')
  console.log(evidencePath)
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
