#!/usr/bin/env node
const { createHash } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const manifest = require(path.join(root, 'docs/flyingmouse-migration/source-manifest.json'))
const source = path.resolve(
  process.argv[2] || path.join(root, 'vendor/flyingmouse-format/v0.7.10'),
)
const actual = []
function walk(dir, relative = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue
    const name = relative ? `${relative}/${entry.name}` : entry.name
    const absolute = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(absolute, name)
    else if (entry.isFile()) actual.push(name)
    else throw new Error(`Unexpected source entry: ${name}`)
  }
}
walk(source)
const expected = new Map(manifest.files.map((file) => [file.path, file]))
const mismatches = []
for (const name of actual) {
  const item = expected.get(name)
  if (!item) {
    mismatches.push(`unexpected: ${name}`)
    continue
  }
  const bytes = fs.readFileSync(path.join(source, ...name.split('/')))
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  if (bytes.length !== item.size || sha256 !== item.sha256) mismatches.push(`changed: ${name}`)
  expected.delete(name)
}
for (const name of expected.keys()) mismatches.push(`missing: ${name}`)
if (actual.length !== manifest.fileCount) mismatches.push(`count: ${actual.length}`)
if (mismatches.length) {
  console.error(mismatches.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Verified ${actual.length} files against SHA-256 manifest: ${source}`)
}
