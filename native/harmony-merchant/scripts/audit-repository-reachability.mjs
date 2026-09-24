import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.join(root, 'entry/src/main/ets')

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(absolute) : [absolute]
  })
}

const sourceFiles = walk(sourceRoot).filter((file) => file.endsWith('.ets'))
const allSource = sourceFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n')
const errors = []
let checked = 0

for (const file of sourceFiles.filter((candidate) => candidate.endsWith('Repository.ets'))) {
  const source = fs.readFileSync(file, 'utf8')
  const className = source.match(/export class (\w+Repository)/)?.[1]
  if (!className) continue
  for (const match of source.matchAll(/static\s+(?:async\s+)?(\w+)\s*\(/g)) {
    const method = match[1]
    const callPattern = new RegExp(`\\b${className}\\.${method}\\s*\\(`, 'g')
    const references = allSource.match(callPattern)?.length ?? 0
    checked += 1
    if (references === 0) {
      errors.push(`${path.relative(root, file)}: ${className}.${method} has no native caller`)
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log(`Native repository reachability audit passed: ${checked} methods have real callers.`)
