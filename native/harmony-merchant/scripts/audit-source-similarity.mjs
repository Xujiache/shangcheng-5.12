import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const legacyRoot = process.env.LEGACY_MERCHANT_SOURCE || path.resolve(root, '../../packages/merchant-app/src')
if (!fs.existsSync(legacyRoot)) {
  console.log('Source-similarity audit skipped: legacy behavior reference is unavailable.')
  process.exit(0)
}

function filesUnder(directory, extensions) {
  const result = []
  for (const name of fs.readdirSync(directory)) {
    const full = path.join(directory, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) result.push(...filesUnder(full, extensions))
    else if (extensions.some((extension) => name.endsWith(extension))) result.push(full)
  }
  return result
}

function candidateLines(files) {
  const lines = new Map()
  for (const file of files) {
    const relative = path.relative(root, file)
    for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const normalized = raw.trim().replace(/\s+/g, ' ')
      if (normalized.length < 100 || normalized.startsWith('//') || normalized.startsWith('*')) continue
      if (!lines.has(normalized)) lines.set(normalized, relative)
    }
  }
  return lines
}

const nativeLines = candidateLines(filesUnder(path.join(root, 'entry/src/main/ets'), ['.ets']))
const legacyLines = candidateLines(filesUnder(legacyRoot, ['.vue', '.ts']))
const matches = []
for (const [line, nativeFile] of nativeLines) {
  const legacyFile = legacyLines.get(line)
  if (legacyFile) matches.push(`${nativeFile} == ${legacyFile}: ${line.slice(0, 180)}`)
}
if (matches.length > 0) {
  console.error('Exact long source lines shared with the legacy client:\n' + matches.join('\n'))
  process.exit(1)
}
console.log('Source-similarity audit passed: no exact long source lines copied.')
