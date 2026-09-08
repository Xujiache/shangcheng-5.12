import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { root } from './source.mjs'

for (const pkg of readdirSync(path.join(root, 'packages'))) {
  const manifest = JSON.parse(
    readFileSync(path.join(root, 'packages', pkg, 'package.json'), 'utf8'),
  )
  for (const key of ['lint', 'typecheck', 'test']) {
    const value = manifest.scripts?.[key]
    assert(
      value && !/^echo\b|\|\|\s*true|passWithNoTests/.test(value),
      `${pkg}: missing or placeholder ${key}`,
    )
  }
}
assert(
  !readFileSync(path.join(root, 'packages/ledger-mp/package.json'), 'utf8').includes(
    '@jiujiu/shared',
  ),
  'Ledger must remain independent',
)
console.log('Seven package script contracts and ledger dependency boundary passed')
