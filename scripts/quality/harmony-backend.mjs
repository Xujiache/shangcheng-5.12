import fs from 'node:fs'
import path from 'node:path'
import { root, sourceIdentity } from './source.mjs'
const script = fs.readFileSync(
  path.join(root, 'native/harmony-merchant/scripts/verify-backend-harmony.sh'),
  'utf8',
)
const tests = [...script.matchAll(/^\s+(test\/[\w.-]+\.spec\.ts)\s*$/gm)].map((m) => m[1])
const missing = tests.filter((file) => !fs.existsSync(path.join(root, 'packages/server', file)))
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'packages/server/package.json'), 'utf8'))
const result = {
  ...sourceIdentity(),
  status:
    missing.length || !pkg.scripts['smoke:harmony-account']
      ? 'blocked'
      : 'source-prerequisites-present',
  requiredTests: tests.length,
  missingTests: missing,
  accountSmokeCommandPresent: Boolean(pkg.scripts['smoke:harmony-account']),
  notes: '仅本地前置核对，不访问正式地址；存在测试不等于测试通过或真机验收',
}
fs.mkdirSync(path.join(root, 'docs/全仓库优化'), { recursive: true })
fs.writeFileSync(
  path.join(root, 'docs/全仓库优化/harmony-gap.json'),
  JSON.stringify(result, null, 2) + '\n',
)
console.log(JSON.stringify(result, null, 2))
if (result.status === 'blocked') process.exitCode = 1
