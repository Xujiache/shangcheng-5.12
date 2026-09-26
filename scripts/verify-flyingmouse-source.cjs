#!/usr/bin/env node
const { createHash } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const manifest = require(path.join(root, 'docs/flyingmouse-migration/source-a7b9b15-manifest.json'))
const source = path.resolve(process.argv[2] || path.join(root, 'vendor/flyingmouse-format/upstream-a7b9b15'))
const expected = new Map(manifest.files.map((item) => [item.path, item]))
const actual = []
function walk(directory, relative = '') {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const name = relative ? `${relative}/${entry.name}` : entry.name
    if (['.git', 'node_modules', 'output'].includes(entry.name) || name === 'bin/pandoc') continue
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(absolute, name)
    else if (entry.isFile()) actual.push(name)
    else throw new Error(`Unexpected source entry: ${name}`)
  }
}
walk(source)
const mismatches = []
for (const name of actual) {
  const item = expected.get(name)
  if (!item) { mismatches.push(`unexpected: ${name}`); continue }
  const bytes = fs.readFileSync(path.join(source, name))
  const hash = createHash('sha256').update(bytes).digest('hex')
  if (bytes.length !== item.size || hash !== item.sha256) mismatches.push(`changed: ${name}`)
  expected.delete(name)
}
for (const name of expected.keys()) mismatches.push(`missing: ${name}`)
if (actual.length !== manifest.fileCount) mismatches.push(`count: ${actual.length}`)
if (mismatches.length) {
  console.error(mismatches.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Verified ${actual.length} original files at ${manifest.sourceRevision}`)
}
