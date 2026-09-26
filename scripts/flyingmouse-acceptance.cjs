#!/usr/bin/env node
// Keep every original pair visible until direct, backend, and output checks pass.
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const catalog = require(path.join(root, 'packages/server/src/modules/ledger-conversion/conversion.catalog.json'))
const reportPath = path.join(root, 'docs/flyingmouse-migration/acceptance-a7b9b15.json')
const previous = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null
if (previous && previous.sourceRevision !== catalog.sourceRevision)
  throw new Error('Acceptance evidence belongs to another source revision')
const existing = new Map((previous?.pairs || []).map((item) => [`${item.input}:${item.output}`, item]))
const record = process.argv.indexOf('--record')
if (record >= 0) {
  const [input, output, sha256, evidence] = process.argv.slice(record + 1)
  const pair = existing.get(`${input}:${output}`)
  if (!pair || !/^[a-f0-9]{64}$/.test(sha256) || !evidence)
    throw new Error('Record requires an original pair, real fixture SHA-256, and evidence label')
  Object.assign(pair, {
    fixtureSha256: sha256, original: 'pass', backend: 'pass', quality: 'pass', evidence,
  })
}
const pairs = catalog.operations.filter((item) => item.kind === 'convert')
  .flatMap((operation) => operation.inputExtensions.map((input) => {
    const output = operation.targetExtension
    const old = existing.get(`${input}:${output}`)
    return old || { input, output, fixtureSha256: null,
      original: 'not-run', backend: 'not-run', quality: 'not-run', status: 'not-run' }
  }))
  .sort((a, b) => `${a.input}:${a.output}`.localeCompare(`${b.input}:${b.output}`))
if (pairs.length !== catalog.pairCount || new Set(pairs.map((item) => `${item.input}:${item.output}`)).size !== pairs.length)
  throw new Error('Original pair count is inconsistent')
for (const pair of pairs) {
  const complete = pair.fixtureSha256 && ['original', 'backend', 'quality']
    .every((stage) => pair[stage] === 'pass')
  pair.status = complete ? 'pass' : pair.original === 'fail' || pair.backend === 'fail' || pair.quality === 'fail'
    ? 'fail' : 'not-run'
}
const report = {
  sourceRevision: catalog.sourceRevision,
  rule: 'A pair passes only with a real fixture hash and successful original, backend, and result-quality checks.',
  counts: {
    total: pairs.length,
    passed: pairs.filter((item) => item.status === 'pass').length,
    failed: pairs.filter((item) => item.status === 'fail').length,
    incomplete: pairs.filter((item) => item.status === 'not-run').length,
  },
  gates: previous?.gates || {
    macOriginalSuite: 'incomplete', miniDevtools: 'not-run', miniPhone: 'not-run',
    macOptionsAndEdgeCases: 'not-run', linuxMatrix: 'not-run', productionEndToEnd: 'not-run',
  },
  pairs,
}
if (process.argv.includes('--gate')) {
  console.log(JSON.stringify({ counts: report.counts, gates: report.gates }, null, 2))
  if (report.counts.passed !== report.counts.total ||
    Object.values(report.gates).some((value) => value !== 'pass')) process.exitCode = 1
} else {
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n')
  console.log(`${report.counts.passed}/${report.counts.total} pairs accepted; ${report.counts.failed} failed`)
}
