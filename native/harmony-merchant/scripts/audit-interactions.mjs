import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.join(root, 'entry/src/main/ets')

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(absolute)
    return entry.isFile() && entry.name.endsWith('.ets') ? [absolute] : []
  })
}

function extractCalls(source, callee) {
  const calls = []
  const needle = `${callee}(`
  let searchFrom = 0
  while (searchFrom < source.length) {
    const start = source.indexOf(needle, searchFrom)
    if (start < 0) break
    let index = start + callee.length
    let depth = 0
    let state = 'code'
    let escaped = false
    for (; index < source.length; index += 1) {
      const value = source[index]
      const next = source[index + 1] || ''
      if (state === 'line-comment') {
        if (value === '\n') state = 'code'
        continue
      }
      if (state === 'block-comment') {
        if (value === '*' && next === '/') { state = 'code'; index += 1 }
        continue
      }
      if (state !== 'code') {
        if (escaped) { escaped = false; continue }
        if (value === '\\') { escaped = true; continue }
        if ((state === 'single' && value === "'") ||
          (state === 'double' && value === '"') ||
          (state === 'template' && value === '`')) state = 'code'
        continue
      }
      if (value === '/' && next === '/') { state = 'line-comment'; index += 1; continue }
      if (value === '/' && next === '*') { state = 'block-comment'; index += 1; continue }
      if (value === "'") { state = 'single'; continue }
      if (value === '"') { state = 'double'; continue }
      if (value === '`') { state = 'template'; continue }
      if (value === '(') depth += 1
      if (value === ')') {
        depth -= 1
        if (depth === 0) {
          calls.push({ start, end: index + 1, text: source.slice(start, index + 1) })
          searchFrom = index + 1
          break
        }
      }
    }
    if (index >= source.length) {
      calls.push({ start, end: source.length, text: source.slice(start) })
      searchFrom = source.length
    }
  }
  return calls
}

function lineNumber(source, index) {
  return source.slice(0, index).split('\n').length
}

const forbidden = [
  /\bTODO\b/i, /\bFIXME\b/i, /\bTBD\b/i, /coming soon/i, /not implemented/i,
  /开发中/, /未实现/, /假按钮/, /占位页面/, /暂未开放/, /敬请期待/, /稍后开放/
]
const emptyHandlers = [
  /on(?:Btn)?Click\s*:\s*\(\)\s*=>\s*\{\s*\}/g,
  /\.onClick\(\s*\(\)\s*=>\s*\{\s*\}\s*\)/g
]
const errors = []
let buttonCount = 0

for (const absolute of walk(sourceRoot)) {
  const relative = path.relative(root, absolute)
  const source = fs.readFileSync(absolute, 'utf8')
  for (const pattern of forbidden) {
    const match = source.match(pattern)
    if (match && match.index !== undefined) {
      errors.push(`${relative}:${lineNumber(source, match.index)} contains placeholder marker ${match[0]}`)
    }
  }
  for (const pattern of emptyHandlers) {
    pattern.lastIndex = 0
    const match = pattern.exec(source)
    if (match) errors.push(`${relative}:${lineNumber(source, match.index)} contains an empty click handler`)
  }
  for (const call of extractCalls(source, 'IBestButton')) {
    buttonCount += 1
    if (!/\bonBtnClick\s*:/.test(call.text)) {
      errors.push(`${relative}:${lineNumber(source, call.start)} IBestButton has no onBtnClick handler`)
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`Native interaction audit passed: ${buttonCount} buttons are wired; no placeholder or empty handlers found.`)
