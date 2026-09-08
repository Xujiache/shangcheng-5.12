// Test-only entrypoint; validate before Jest imports any database-mutating suites.
import { execFileSync } from 'node:child_process'
import path from 'node:path'
module.exports = async () => {
  execFileSync(process.execPath, [path.resolve(__dirname, '../../../scripts/db/test-target.mjs')], {
    stdio: 'inherit',
    env: process.env,
  })
}
