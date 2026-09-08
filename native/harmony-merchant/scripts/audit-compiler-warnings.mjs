#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

if (process.argv.length !== 3) {
  process.stderr.write('Usage: audit-compiler-warnings.mjs <hvigor-log>\n')
  process.exit(2)
}

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const logPath = resolve(process.argv[2])
if (!existsSync(logPath)) {
  process.stderr.write(`ERROR: compiler log not found: ${logPath}\n`)
  process.exit(1)
}

const clean = readFileSync(logPath, 'utf8').replace(/\u001B\[[0-?]*[ -\/]*[@-~]/g, '')
const warningChunks = clean.split('ArkTS:WARN File: ').slice(1)
const ownedFailures = []
let thirdPartyWarnings = 0
let approvedCompatibilityWarnings = 0

for (const chunk of warningChunks) {
  const firstLine = chunk.split(/\r?\n/, 1)[0].trim()
  const match = firstLine.match(/^(.*\.ets):\d+:\d+$/)
  if (!match) continue
  const absolutePath = resolve(match[1])
  const sourcePath = relative(projectRoot, absolutePath).replaceAll('\\', '/')
  if (sourcePath.startsWith('third_party/')) {
    thirdPartyWarnings += 1
    continue
  }
  if (!sourcePath.startsWith('entry/src/main/') && !sourcePath.startsWith('entry/src/ohosTest/')) {
    continue
  }
  const isApprovedMaterialGuard =
    sourcePath === 'entry/src/main/ets/core/theme/AdaptiveMaterialSurface.ets' &&
    chunk.includes('API is supported since SDK version 26.0.0') &&
    chunk.includes('current compatible SDK version is 6.0.1(21)')
  if (isApprovedMaterialGuard) {
    approvedCompatibilityWarnings += 1
    continue
  }
  ownedFailures.push(`${sourcePath}: ${chunk.split(/\r?\n/).slice(1, 3).join(' ').trim()}`)
}

if (ownedFailures.length > 0) {
  process.stderr.write('ERROR: unapproved ArkTS compiler warnings found in owned source:\n')
  for (const failure of ownedFailures) process.stderr.write(`- ${failure}\n`)
  process.exit(1)
}

process.stdout.write(
  `Owned compiler-warning audit passed: 0 unapproved; ${approvedCompatibilityWarnings} API-guard warning(s) approved; ${thirdPartyWarnings} third-party warning(s) isolated.\n`,
)
