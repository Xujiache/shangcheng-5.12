import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { verifyEvidence } from './release.mjs'
const identity = { commit: 'a', fingerprint: 'b' }
const valid = {
  ...identity,
  status: 'passed',
  finishedAt: '2026-09-09T00:00:00Z',
  artifact: 'test.log',
  sha256: createHash('sha256').update('real log').digest('hex'),
}
test('release rejects missing, stale, failed, fabricated and modified evidence', () => {
  for (const evidence of [
    undefined,
    {},
    { ...valid, status: 'blocked' },
    { ...valid, fingerprint: 'old' },
    { ...valid, commit: 'old' },
    { ...valid, finishedAt: '' },
    { ...valid, sha256: 'fake' },
    { ...valid, exitCode: 1 },
  ]) {
    assert.equal(
      verifyEvidence(evidence, identity, () => 'real log'),
      false,
    )
  }
  assert.equal(
    verifyEvidence(valid, identity, () => {
      throw Error('missing')
    }),
    false,
  )
  assert.equal(
    verifyEvidence(valid, identity, () => 'real log'),
    true,
  )
})
