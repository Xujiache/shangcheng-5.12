import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export function sourceIdentity() {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  const files = [
    ...new Set(
      execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
        cwd: root,
        encoding: 'utf8',
      }).split('\0'),
    ),
  ]
    .filter(
      (f) => f && !f.startsWith('docs/') && !f.startsWith('.quality/') && !/(^|\/)\.env/.test(f),
    )
    .sort()
  const hash = createHash('sha256')
  for (const f of files) {
    const full = path.join(root, f)
    if (f === 'native/harmony-merchant/third_party/ibest-ui') continue
    hash.update(f + '\0')
    hash.update(existsSync(full) ? readFileSync(full) : '<deleted>')
  }
  hash.update(execFileSync('git', ['submodule', 'status'], { cwd: root }))
  return { commit, fingerprint: hash.digest('hex') }
}
