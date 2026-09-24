import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { root, sourceIdentity } from './source.mjs'

const mode = process.argv[2]
const pnpm = (...args) => [process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', args]
const node = (...args) => [process.execPath, args]
const prerequisites = [pnpm('build:shared'), pnpm('--filter', '@jiujiu/server', 'prisma:generate')]
const jobs = {
  check: [
    ...prerequisites,
    node('scripts/quality/contracts.mjs'),
    node('scripts/quality/vue-templates.mjs'),
    pnpm('format:check'),
    pnpm('lint'),
    pnpm('typecheck'),
    node('scripts/workbook-contract.mjs'),
    node('native/harmony-merchant/scripts/audit-secret-boundary.mjs'),
    node('native/harmony-merchant/scripts/audit-i18n.mjs', '--strict'),
    node('native/harmony-merchant/scripts/audit-routes.mjs'),
    node('native/harmony-merchant/scripts/audit-api-contracts.mjs'),
  ],
  unit: [
    ...prerequisites,
    pnpm('-r', '--workspace-concurrency=1', 'test'),
    node(
      '--test',
      'scripts/quality/release.test.mjs',
      'scripts/quality/uni-processor.test.mjs',
      'scripts/db/migrate.test.mjs',
    ),
  ],
  integration: [
    node('scripts/db/test-target.mjs', '--with-redis'),
    pnpm('--filter', '@jiujiu/server', 'test:integration'),
  ],
  build: [
    ...prerequisites,
    pnpm('--filter', '@jiujiu/server', 'build'),
    pnpm('--filter', '@jiujiu/admin-pc', 'build'),
    ...['user-mp', 'merchant-app', 'platform-app'].flatMap((p) =>
      (p === 'platform-app' ? ['h5', 'app'] : ['h5', 'mp-weixin', 'app']).map((t) =>
        pnpm('--filter', '@jiujiu/' + p, 'build:' + t),
      ),
    ),
    node('scripts/verify-workbook-templates.cjs'),
  ],
}
if (!jobs[mode]) throw new Error('Usage: node scripts/quality/run.mjs check|unit|integration|build')
const identity = sourceIdentity()
const report = {
  schemaVersion: 1,
  ...identity,
  mode,
  startedAt: new Date().toISOString(),
  status: 'running',
  steps: [],
}
const dir = path.join(root, '.quality', mode)
mkdirSync(dir, { recursive: true })
const save = () =>
  writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2) + '\n')
save()
for (const [index, [command, args]] of jobs[mode].entries()) {
  console.log('\n> ' + command + ' ' + args.join(' '))
  const started = Date.now()
  const result = await new Promise((resolve) => {
    let output = ''
    const child = spawn(command, args, {
      cwd: root,
      shell: process.platform === 'win32' && command.endsWith('.cmd'),
      env: process.env,
    })
    child.stdout.on('data', (b) => {
      output += b
      process.stdout.write(b)
    })
    child.stderr.on('data', (b) => {
      output += b
      process.stderr.write(b)
    })
    child.on('error', (e) => resolve({ exitCode: 1, output: output + e.message }))
    child.on('close', (code) => resolve({ exitCode: code ?? 1, output }))
  })
  const artifact = '.quality/' + mode + '/' + index + '.log'
  writeFileSync(path.join(root, artifact), result.output)
  const passed = result.exitCode === 0 && !result.output.includes('Load plugin failed')
  report.steps.push({
    command: [command, ...args],
    exitCode: result.exitCode,
    status: passed ? 'passed' : 'failed',
    durationMs: Date.now() - started,
    artifact,
    sha256: createHash('sha256')
      .update(readFileSync(path.join(root, artifact)))
      .digest('hex'),
  })
  if (!passed) {
    report.status = 'failed'
    break
  }
  save()
}
if (report.status === 'running')
  report.status =
    sourceIdentity().fingerprint === identity.fingerprint ? 'passed' : 'source-changed'
report.finishedAt = new Date().toISOString()
save()
if (report.status !== 'passed') process.exitCode = 1
