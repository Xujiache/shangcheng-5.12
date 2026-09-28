#!/usr/bin/env node
// Replay SHA-locked Linux job inputs through the original CLI; this is reference evidence, not parity acceptance.
const { createHash } = require('node:crypto')
const { spawn, spawnSync } = require('node:child_process')
const { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync, appendFileSync, rmSync } = require('node:fs')
const { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } = require('node:path')

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const inside = (root, path) => path === root || path.startsWith(root + sep)
const version = (command, flag = '--version') => {
  if (!command) return null
  const result = spawnSync(command, [flag], { encoding: 'utf8', timeout: 10000 })
  return String(result.stdout || result.stderr || result.error?.message || '').trim().split('\n')[0]
}
function checkedPath(root, name) {
  if (typeof name !== 'string' || !name || isAbsolute(name) || name.split(/[\\/]/).includes('..'))
    throw new Error(`Unsafe fixture path: ${name}`)
  const path = resolve(root, name)
  if (!inside(resolve(root), path) || !inside(realpathSync(root), realpathSync(path)))
    throw new Error(`Fixture escapes root: ${name}`)
  return path
}

function resolveInput(input, index, roots) {
  if (!/^[a-f0-9]{64}$/.test(input.sha256) || !Number.isSafeInteger(input.bytes) || input.bytes < 1 ||
    typeof input.name !== 'string' || basename(input.name) !== input.name ||
    input.name.includes('\\') || !input.name)
    throw new Error('Invalid job input metadata')
  const fields = ['relativePath', 'repoPath', 'resourceId'].filter((key) => input[key])
  if (fields.length !== 1) throw new Error(`Input requires exactly one fixture path: ${input.name}`)
  const field = fields[0]
  let path
  if (field === 'relativePath') {
    if (basename(dirname(input.relativePath)) !== `${basename(roots.jobs, '.jobs.jsonl')}-inputs` ||
      basename(input.relativePath) !== `${input.sha256}${extname(input.name).toLowerCase()}`)
      throw new Error(`Invalid retained input path: ${input.relativePath}`)
    path = checkedPath(dirname(roots.jobs), input.relativePath)
  } else {
    const expected = index[input.sha256]
    if (!expected || expected[field] !== input[field] || Object.keys(expected).length !== 1)
      throw new Error(`Fixture index mismatch: ${input.name}`)
    if (field === 'repoPath') path = checkedPath(roots.repo, input.repoPath)
    else {
      if (!input.resourceId.startsWith('parity-fixtures/')) throw new Error('Invalid public resourceId')
      if (!roots.public) throw new Error('--public-root required for public fixtures')
      path = checkedPath(roots.public, input.resourceId.slice('parity-fixtures/'.length))
    }
  }
  const bytes = readFileSync(path)
  if (bytes.length !== input.bytes || sha(bytes) !== input.sha256)
    throw new Error(`Fixture SHA-256 or size mismatch: ${input.name}`)
  return { path, bytes }
}

function cliArgs(job, files, outputDir) {
  const options = job.options || {}
  if (!options || Array.isArray(options) || typeof options !== 'object') throw new Error('Invalid options')
  const flags = { videoCodec: '--video-codec', pdfAction: '--pdf-action',
    textEncoding: '--text-encoding', password: '--password' }
  for (const [key, value] of Object.entries(options))
    if (!flags[key] || typeof value !== 'string' || !value) throw new Error(`CLI cannot replay option: ${key}`)
  let command
  const args = files.slice()
  if (/^convert:[a-z0-9]+$/.test(job.operationId)) {
    command = 'convert'
    args.push('--to', job.operationId.slice('convert:'.length))
  } else if (job.operationId === 'merge-pdfs' || job.operationId === 'images-to-pdf') {
    command = job.operationId
    if (Object.keys(options).length) throw new Error(`${command} does not accept conversion options`)
  } else throw new Error(`Unknown original CLI operation: ${job.operationId}`)
  for (const [key, flag] of Object.entries(flags)) if (options[key]) args.push(flag, options[key])
  return [command, ...args, '--output-dir', outputDir, '--json']
}

function routeForJob(job) {
  const options = job.options || {}
  const split = 'splitMode' in options || 'groupSize' in options
  const alpha = 'alphaBackground' in options
  if (!split && !alpha) return 'cli'
  if (!Array.isArray(job.inputs) || job.inputs.length !== 1 || split && alpha)
    throw new Error('Original HTTP options require one compatible input')
  if (split && (job.operationId !== 'convert:pdf' || !['page', 'group'].includes(options.splitMode) ||
    (options.groupSize !== undefined && !/^[1-9][0-9]*$/.test(String(options.groupSize))) ||
    Object.keys(options).some((key) => !['splitMode', 'groupSize', 'pdfAction', 'password'].includes(key))))
    throw new Error('Original HTTP PDF split options are invalid')
  if (alpha && (!['convert:mp4', 'convert:mov', 'convert:mkv', 'convert:webm'].includes(job.operationId) ||
    typeof options.alphaBackground !== 'string' ||
    !/^[A-Za-z]+$|^0x[0-9A-Fa-f]{6,8}$|^#[0-9A-Fa-f]{6,8}$/.test(options.alphaBackground) ||
    Object.keys(options).some((key) => !['alphaBackground', 'videoCodec'].includes(key))))
    throw new Error('Original HTTP video alpha options are invalid')
  return 'local-original-http'
}

function waitForExit(child, timeout) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true)
  return new Promise((done) => {
    const onExit = () => { clearTimeout(timer); done(true) }
    const timer = setTimeout(() => { child.off('exit', onExit); done(false) }, timeout)
    child.once('exit', onExit)
  })
}

async function convertViaOriginalHttp(source, input, name, target, options, outputDir, runtime) {
  const child = spawn(process.execPath, ['-e',
    'require(process.argv[1] + "/server.js").startServer(0).then(({server,url}) => {' +
    'process.send(url); process.on("message", () => server.close(() => process.exit(0)))})', source],
  { env: { ...process.env, FLYINGMOUSE_RUNTIME_DIR: runtime }, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] })
  let stderr = ''
  child.stderr.on('data', (chunk) => { stderr = (stderr + chunk.toString()).slice(-4000) })
  let startupTimer
  try {
    const url = await Promise.race([
      new Promise((done, fail) => {
        child.once('message', done)
        child.once('exit', (code) => fail(new Error(`Original service exited ${code}: ${stderr}`)))
        child.once('error', fail)
      }),
      new Promise((_, fail) => { startupTimer = setTimeout(() => fail(new Error('Original service startup timed out')), 30000) }),
    ])
    clearTimeout(startupTimer)
    const base = new URL(url)
    if (base.hostname !== '127.0.0.1' || base.protocol !== 'http:') throw new Error('Original service is not localhost')
    const form = new FormData()
    form.set('file', new Blob([input]), name)
    form.set('targetFormat', target)
    for (const [key, value] of Object.entries(options)) form.set(key, String(value))
    const response = await fetch(new URL('/api/convert', base), { method: 'POST', body: form,
      signal: AbortSignal.timeout(12 * 60 * 1000) })
    const body = await response.json()
    if (!response.ok || !body.ok || !body.downloadUrl) throw new Error(body.error || `Original HTTP ${response.status}`)
    const downloadUrl = new URL(body.downloadUrl, base)
    if (downloadUrl.origin !== base.origin || !downloadUrl.pathname.startsWith('/downloads/'))
      throw new Error('Original download URL is not local')
    const download = await fetch(downloadUrl, { signal: AbortSignal.timeout(12 * 60 * 1000) })
    if (!download.ok) throw new Error(`Original download: ${download.status}`)
    if (!body.fileName || basename(body.fileName) !== body.fileName || body.fileName.includes('\\'))
      throw new Error('Original output filename is unsafe')
    const output = join(outputDir, body.fileName)
    writeFileSync(output, Buffer.from(await download.arrayBuffer()), { flag: 'wx' })
    return { ok: true, command: 'convert', route: 'local-original-http',
      outputs: [{ input: name, path: output, fileName: body.fileName,
        mimeType: body.mimeType, warnings: body.warnings || [] }] }
  } finally {
    clearTimeout(startupTimer)
    if (child.exitCode === null && child.signalCode === null) {
      if (child.connected) try { child.send('stop') } catch { child.kill() }
      if (!await waitForExit(child, 5000)) {
        child.kill()
        if (!await waitForExit(child, 5000)) throw new Error('Original service did not exit; runtime retained')
      }
    }
    rmSync(runtime, { recursive: true, force: true })
  }
}

function outputFiles(directory) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (!inside(realpathSync(directory), realpathSync(path))) throw new Error('Output escapes directory')
    if (entry.isDirectory()) files.push(...outputFiles(path))
    else if (entry.isFile()) files.push(path)
    else throw new Error('Original output contains a non-file asset')
  }
  return files
}

async function replay(options) {
  const jobs = resolve(options.jobs)
  const repo = resolve(options.repo || join(__dirname, '..'))
  const source = resolve(options.source || process.env.FLYINGMOUSE_TEST_SOURCE_DIR ||
    join(repo, 'vendor/flyingmouse-format/upstream-a7b9b15'))
  const cli = join(source, 'cli.js')
  const indexPath = resolve(options.index || jobs.replace(/\.jobs\.jsonl$/, '.fixture-index.json'))
  const out = resolve(options.out)
  if (!jobs.endsWith('.jobs.jsonl') || !existsSync(cli) || !existsSync(indexPath) || existsSync(out))
    throw new Error('Expected existing *.jobs.jsonl, fixture index and CLI; --out must be new')
  const roots = { jobs, repo, public: options.public ? resolve(options.public) : null }
  const index = JSON.parse(readFileSync(indexPath, 'utf8'))
  const rows = readFileSync(jobs, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
  if (!rows.length) throw new Error('Job evidence is empty; no reference can be produced')
  mkdirSync(out, { recursive: true })
  const sourceManifest = join(repo, 'docs/flyingmouse-migration/source-a7b9b15-manifest.json')
  const platformFixes = join(source, '.platform-fixes.json')
  writeFileSync(join(out, 'environment.json'), JSON.stringify({ platform: process.platform, arch: process.arch,
    node: process.version, sourceCliSha256: sha(readFileSync(cli)),
    sourcePackageVersion: JSON.parse(readFileSync(join(source, 'package.json'), 'utf8')).version,
    sourceLockSha256: existsSync(join(source, 'package-lock.json')) ?
      sha(readFileSync(join(source, 'package-lock.json'))) : null,
    ffmpeg: version(process.env.FLYINGMOUSE_FFMPEG_PATH),
    libreOffice: version(process.env.FLYINGMOUSE_LIBREOFFICE_PATH),
    poppler: version(process.env.FLYINGMOUSE_PDFTOPPM_PATH, '-v'),
    sourceManifestSha256: existsSync(sourceManifest) ? sha(readFileSync(sourceManifest)) : null,
    platformFixesSha256: existsSync(platformFixes) ? sha(readFileSync(platformFixes)) : null,
    coreSha256: Object.fromEntries(['server.js', 'pdf.js', 'office-convert.js', 'image.js']
      .map((name) => [name, existsSync(join(source, name)) ? sha(readFileSync(join(source, name))) : null])),
    jobsSha256: sha(readFileSync(jobs)), fixtureIndexSha256: sha(readFileSync(indexPath)),
    referenceStatus: 'direct-cli-only; quality-and-Windows-parity-not-assessed' }, null, 2) + '\n')
  let failed = 0
  for (const [number, job] of rows.entries()) {
    const row = { number, operationId: job?.operationId, status: 'not-run',
      inputs: Array.isArray(job?.inputs) ? job.inputs.map((input) => input &&
        ({ name: input.name, sha256: input.sha256, bytes: input.bytes })) : null,
      candidateOutput: job?.output || null, candidateWarnings: job?.warnings || [],
      candidateTerminalStatus: job?.terminalStatus || null,
      qualityStatus: 'not-assessed', parityStatus: 'not-compared' }
    try {
      if (!Array.isArray(job?.inputs) || !job.inputs.length) throw new Error('Job has no inputs')
      const directory = join(out, `job-${String(number).padStart(5, '0')}`)
      mkdirSync(directory)
      const staged = join(directory, 'inputs')
      const outputDir = join(directory, 'outputs')
      mkdirSync(staged)
      mkdirSync(outputDir)
      if (new Set(job.inputs.map((input) => input.name)).size !== job.inputs.length)
        throw new Error('Duplicate original input names cannot be staged')
      const files = job.inputs.map((input) => {
        const { bytes } = resolveInput(input, index, roots)
        const path = join(staged, input.name)
        writeFileSync(path, bytes, { flag: 'wx' })
        return path
      })
      const route = routeForJob(job)
      row.route = route
      let parsed
      if (route === 'local-original-http') {
        parsed = await convertViaOriginalHttp(source, readFileSync(files[0]), job.inputs[0].name,
          job.operationId.slice('convert:'.length), job.options, outputDir, join(directory, 'server-runtime'))
        row.exitCode = 0
      } else {
        const argv = cliArgs(job, files, outputDir)
        const child = spawnSync(process.execPath, [cli, ...argv], { cwd: repo, env: process.env,
          encoding: 'utf8', timeout: 12 * 60 * 1000, maxBuffer: 32 * 1024 * 1024 })
        row.exitCode = child.status
        const cliError = child.stderr || child.error?.message || ''
        row.cliError = (job.options?.password ? cliError.replaceAll(job.options.password, '[redacted]') : cliError).slice(0, 4000)
        if (child.error) throw child.error
        parsed = JSON.parse(child.stdout.trim())
      }
      row.cli = parsed
      if (row.exitCode !== 0 || !parsed.ok || !Array.isArray(parsed.outputs) || !parsed.outputs.length)
        throw new Error(`Original route failed: ${row.exitCode}`)
      row.outputs = parsed.outputs.map((output) => {
        const path = resolve(output.path)
        if (!inside(outputDir, path) || !inside(realpathSync(outputDir), realpathSync(path)))
          throw new Error('Original CLI output escapes job directory')
        const bytes = readFileSync(path)
        return { relativePath: relative(out, path), sha256: sha(bytes), bytes: bytes.length,
          fileName: output.fileName, mimeType: output.mimeType, warnings: output.warnings || [] }
      })
      row.artifacts = outputFiles(outputDir).map((path) => {
        const bytes = readFileSync(path)
        return { relativePath: relative(out, path), sha256: sha(bytes), bytes: bytes.length }
      })
      row.status = 'reference-produced'
    } catch (error) { row.status = 'failed'; row.error = String(error.message || error).slice(0, 1000); failed++ }
    appendFileSync(join(out, 'reference.jsonl'), JSON.stringify(row) + '\n')
    console.log(`${row.status} ${number} ${row.operationId}${row.error ? `: ${row.error}` : ''}`)
  }
  return failed ? 1 : 0
}

if (require.main === module) {
  const argv = process.argv.slice(2)
  const value = (flag) => { const index = argv.indexOf(flag); return index < 0 ? undefined : argv[index + 1] }
  const jobs = value('--jobs'), out = value('--out')
  if (!jobs || !out) throw new Error('Usage: node scripts/flyingmouse-job-reference.cjs --jobs batch.jobs.jsonl --out new-dir [--fixture-index path] [--repo-root path] [--public-root path] [--source path]')
  replay({ jobs, out, index: value('--fixture-index'), repo: value('--repo-root'),
    public: value('--public-root'), source: value('--source') })
    .then((code) => { process.exitCode = code }).catch((error) => { console.error(error); process.exitCode = 1 })
}
module.exports = { checkedPath, resolveInput, cliArgs, routeForJob, outputFiles, replay }
