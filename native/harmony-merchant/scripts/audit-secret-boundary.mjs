#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const excludedRoots = ['.git/', '.hvigor/', 'artifacts/', 'build/', 'entry/build/', 'oh_modules/', 'reports/', 'third_party/']

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name)
    const relative = path.relative(root, absolute).replaceAll('\\', '/')
    if (excludedRoots.some((prefix) => `${relative}/`.startsWith(prefix))) return []
    return entry.isDirectory() ? walk(absolute) : [relative]
  })
}

let files = []
try {
  const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
  const untracked = execFileSync(
    'git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' },
  )
  files = [...new Set(`${tracked}\n${untracked}`.split(/\r?\n/).filter(Boolean))].sort()
} catch {
}
if (files.length === 0) files = walk(root)

const errors = []
const forbiddenNames = [
  /(^|\/)agconnect-services\.json$/i,
  /\.(p12|pfx|jks|keystore|pem|key|p7b)$/i,
  /(^|\/)(service-account|service_account)[^/]*\.json$/i
]
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /["']client_secret["']\s*:\s*["'][^"']{8,}["']/i,
  /["']private_key["']\s*:\s*["'][^"']{8,}["']/i,
  /["']service_account_key["']\s*:\s*["'][^"']{8,}["']/i
]

for (const relative of files) {
  if (forbiddenNames.some((pattern) => pattern.test(relative))) {
    errors.push(`sensitive file must not be versioned: ${relative}`)
    continue
  }
  const absolute = path.join(root, relative)
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue
  const buffer = fs.readFileSync(absolute)
  if (buffer.includes(0)) continue
  const text = buffer.toString('utf8')
  if (secretPatterns.some((pattern) => pattern.test(text))) {
    errors.push(`embedded credential material detected: ${relative}`)
  }
}

const ignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8')
for (const required of ['*.p12', '*.p7b', '*.key', '*.pem', 'entry/agconnect-services.json']) {
  if (!ignore.includes(required)) errors.push(`.gitignore is missing sensitive pattern ${required}`)
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log(`Secret-boundary audit passed: ${files.length} repository source files checked; signing and AGC credentials remain external.`)
