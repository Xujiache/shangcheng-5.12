#!/usr/bin/env node

import fs from 'node:fs'

const summaryPattern = /Tests run:\s*(\d+)\s*,\s*Failure:\s*(\d+)\s*,\s*Error:\s*(\d+)\s*,\s*Pass:\s*(\d+)\s*,\s*Ignore:\s*(\d+)/g

export function parseHypiumSummary(output) {
  let match = null
  let latest = null
  while ((match = summaryPattern.exec(output)) !== null) {
    latest = {
      total: Number(match[1]),
      failure: Number(match[2]),
      error: Number(match[3]),
      pass: Number(match[4]),
      ignore: Number(match[5])
    }
  }
  return latest
}

export function validateHypiumSummary(output, expectedTotal) {
  const summary = parseHypiumSummary(output)
  if (!summary) throw new Error('Hypium result does not contain a final test summary')
  if (!/OHOS_REPORT_CODE:\s*0(?:\s|$)/.test(output)) {
    throw new Error('Hypium result does not contain a successful final report code')
  }
  if (summary.total !== expectedTotal) {
    throw new Error(`Hypium executed ${summary.total} tests; expected ${expectedTotal}`)
  }
  if (summary.failure !== 0 || summary.error !== 0 || summary.ignore !== 0) {
    throw new Error(
      `Hypium did not pass cleanly: failure=${summary.failure} error=${summary.error} ignore=${summary.ignore}`
    )
  }
  if (summary.pass !== expectedTotal) {
    throw new Error(`Hypium passed ${summary.pass} tests; expected ${expectedTotal}`)
  }
  return summary
}

function selfTest() {
  const successful = [
    'OHOS_REPORT_RESULT: stream=Tests run: 2, Failure: 0, Error: 0, Pass: 2, Ignore: 0',
    'OHOS_REPORT_CODE: 0'
  ].join('\n')
  const parsed = validateHypiumSummary(successful, 2)
  if (parsed.pass !== 2) throw new Error('Hypium result parser self-test failed')

  let rejected = 0
  for (const sample of [
    'no summary',
    'Tests run: 2, Failure: 1, Error: 0, Pass: 1, Ignore: 0',
    'Tests run: 1, Failure: 0, Error: 0, Pass: 1, Ignore: 0\nOHOS_REPORT_CODE: 0',
    'Tests run: 2, Failure: 0, Error: 0, Pass: 2, Ignore: 0'
  ]) {
    try {
      validateHypiumSummary(sample, 2)
    } catch (_) {
      rejected += 1
    }
  }
  if (rejected !== 4) throw new Error('Hypium result parser accepted an invalid result')
  console.log('Hypium device-result parser self-test passed.')
}

const args = process.argv.slice(2)
if (args[0] === '--self-test') {
  selfTest()
} else {
  if (args.length !== 2) {
    console.error('Usage: validate-device-test-result.mjs <aa-test-output.txt> <expected-test-count>')
    process.exit(2)
  }
  const expectedTotal = Number(args[1])
  if (!Number.isInteger(expectedTotal) || expectedTotal <= 0) {
    console.error('Expected test count must be a positive integer.')
    process.exit(2)
  }
  try {
    const summary = validateHypiumSummary(fs.readFileSync(args[0], 'utf8'), expectedTotal)
    console.log(JSON.stringify(summary, null, 2))
  } catch (error) {
    console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}
