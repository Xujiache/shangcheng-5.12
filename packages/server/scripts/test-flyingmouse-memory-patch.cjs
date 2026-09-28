const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const Module = require('node:module')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')
const vm = require('node:vm')

const root = path.resolve(__dirname, '../../..')
const source = path.join(root, 'vendor/flyingmouse-format/upstream-a7b9b15')
const patcher = path.join(root, 'scripts/apply-flyingmouse-platform-fixes.cjs')
const GiB = 1024 ** 3

function patchedSources() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-memory-patch-'))
  for (const name of ['image.js', 'office-convert.js', 'ofd-convert.js',
    'pdf-table-runtime.js', 'pdf.js', 'pdf-structure-engine.js',
    'resource-policy.js', 'ocr.js'])
    fs.copyFileSync(path.join(source, name), path.join(directory, name))
  const dependency = 'node_modules/@miconvert/ofd-to-pdf/dist/index.js'
  fs.mkdirSync(path.dirname(path.join(directory, dependency)), { recursive: true })
  fs.copyFileSync(path.join(source, dependency), path.join(directory, dependency))
  execFileSync(process.execPath, [patcher, '--in-place', directory])
  return directory
}

function compilePatched(directory, name) {
  const filename = path.join(source, name)
  const compiled = new Module(filename, module)
  compiled.filename = filename
  compiled.paths = Module._nodeModulePaths(source)
  compiled._compile(fs.readFileSync(path.join(directory, name), 'utf8'), filename)
  return compiled.exports
}

test('Linux resource budgets use container limits; macOS keeps host budgets', (t) => {
  const directory = patchedSources()
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  const metadata = JSON.parse(fs.readFileSync(path.join(directory, '.platform-fixes.json')))
  assert.equal(metadata.fixRevision, 15)
  for (const [name, key] of [['pdf-structure-engine.js', 'pdfStructureRuntimeSha256'],
    ['resource-policy.js', 'resourcePolicyRuntimeSha256']]) {
    const actual = require('node:crypto').createHash('sha256')
      .update(fs.readFileSync(path.join(directory, name))).digest('hex')
    assert.equal(actual, metadata[key])
  }
  const code = fs.readFileSync(path.join(directory, 'resource-policy.js'), 'utf8')
  function limits(platform, constrained, available) {
    const context = { module: { exports: {} }, process: {
      platform, constrainedMemory: constrained, availableMemory: available,
    }, require: () => ({ totalmem: () => 16 * GiB, freemem: () => 12 * GiB }) }
    vm.runInNewContext(code, context)
    return context.module.exports.LIMITS
  }
  assert.equal(limits('linux', () => 2 * GiB, () => GiB).workingBytes, GiB / 2)
  assert.equal(limits('darwin', () => 2 * GiB, () => GiB).workingBytes, GiB)
  assert.equal(limits('linux', () => 0, () => Number.NaN).workingBytes, GiB)
})

test('resource budget matches this Node process memory readings', (t) => {
  const directory = patchedSources()
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  const { LIMITS } = compilePatched(directory, 'resource-policy.js')
  const bound = (host, reader, allowZero = false) => {
    if (process.platform !== 'linux' || typeof reader !== 'function') return host
    const value = reader()
    return Number.isFinite(value) && (allowZero ? value >= 0 : value > 0)
      ? Math.min(host, value) : host
  }
  const total = bound(os.totalmem(), process.constrainedMemory)
  const free = bound(os.freemem(), process.availableMemory, true)
  const expected = Math.max(16 * 1024 ** 2,
    Math.min(GiB, Math.floor(total / 4), Math.floor(free / 2)))
  // OS free memory can move between snapshots; allow normal process churn.
  assert.ok(Math.abs(LIMITS.workingBytes - expected) <= 128 * 1024 ** 2)
})

test('default structured PDF guard sees Linux cgroup availability before preflight', async (t) => {
  const directory = patchedSources()
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')
  const originalAvailable = process.availableMemory
  const originalFree = os.freemem
  Object.defineProperty(process, 'platform', { ...originalPlatform, value: 'linux' })
  process.availableMemory = () => 4 * GiB
  os.freemem = () => 12 * GiB
  t.after(() => {
    Object.defineProperty(process, 'platform', originalPlatform)
    process.availableMemory = originalAvailable
    os.freemem = originalFree
  })
  const { createStructuredPdfBoundary, REQUIRED_MODELS } =
    compilePatched(directory, 'pdf-structure-engine.js')
  const fixture = await fsp.mkdtemp(path.join(os.tmpdir(), 'fm-memory-fixture-'))
  t.after(() => fsp.rm(fixture, { recursive: true, force: true }))
  const enginePath = path.join(fixture, 'engine')
  const modelDirectory = path.join(fixture, 'models')
  await fsp.writeFile(enginePath, 'engine', { mode: 0o755 })
  await fsp.mkdir(modelDirectory)
  for (const name of REQUIRED_MODELS) {
    const model = path.join(modelDirectory, name)
    await fsp.mkdir(model)
    for (const file of ['inference.json', 'inference.pdiparams', 'inference.yml'])
      await fsp.writeFile(path.join(model, file), 'model')
  }
  let preflights = 0
  const boundary = createStructuredPdfBoundary({ defaultEnginePath: enginePath,
    defaultModelDirectory: modelDirectory, preflightPdf: () => { preflights++; throw Error('too late') } })
  await assert.rejects(boundary('unused.pdf', {}, async () => {}),
    (error) => error.code === 'PDF_STRUCTURE_MEMORY_INSUFFICIENT'
      && error.details.minimumFreeBytes === 5 * GiB && error.details.availableBytes === 4 * GiB)
  assert.equal(preflights, 0)
})
