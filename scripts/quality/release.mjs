import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { root, sourceIdentity } from './source.mjs'

export const requiredExternal = [
  'full-scope-regression',
  'wechat-android',
  'wechat-ios',
  'uni-app-packages',
  'harmony-31-features',
  'third-party-flows',
  'performance',
  'backup-restore',
  'deployment-rollback',
  'privacy-review',
]
export function verifyEvidence(evidence, identity, readArtifact) {
  if (
    !evidence ||
    evidence.status !== 'passed' ||
    evidence.commit !== identity.commit ||
    evidence.fingerprint !== identity.fingerprint
  )
    return false
  if (!Number.isFinite(Date.parse(evidence.finishedAt)) || !evidence.artifact || !evidence.sha256)
    return false
  if ('exitCode' in evidence && evidence.exitCode !== 0) return false
  try {
    return (
      createHash('sha256').update(readArtifact(evidence.artifact)).digest('hex') === evidence.sha256
    )
  } catch {
    return false
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const identity = sourceIdentity(),
    failures = []
  const readArtifact = (f) => {
    const resolved = path.resolve(root, f)
    if (!resolved.startsWith(root + path.sep)) throw Error('Evidence must be inside workspace')
    return readFileSync(resolved)
  }
  for (const mode of ['check', 'unit', 'integration', 'build']) {
    const file = path.join(root, '.quality', mode, 'report.json')
    const report = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
    if (
      !report?.steps?.length ||
      report.status !== 'passed' ||
      report.commit !== identity.commit ||
      report.fingerprint !== identity.fingerprint ||
      !report.finishedAt ||
      report.steps.some(
        (s) =>
          !verifyEvidence(
            {
              ...s,
              commit: report.commit,
              fingerprint: report.fingerprint,
              finishedAt: report.finishedAt,
            },
            identity,
            readArtifact,
          ),
      )
    )
      failures.push('automated:' + mode)
  }
  const file = path.join(root, 'docs/全仓库优化/acceptance.json')
  const external = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}
  for (const key of requiredExternal)
    if (!verifyEvidence(external[key], identity, readArtifact)) failures.push('external:' + key)
  console.log(
    JSON.stringify({ ...identity, releasable: failures.length === 0, blockers: failures }, null, 2),
  )
  if (failures.length) process.exitCode = 1
}
