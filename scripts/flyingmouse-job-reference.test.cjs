const test = require('node:test')
const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const { spawnSync } = require('node:child_process')
const { existsSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } = require('node:fs')
const { homedir, tmpdir } = require('node:os')
const { join } = require('node:path')
const { cliArgs, resolveInput, routeForJob, outputFiles, replay } = require('./flyingmouse-job-reference.cjs')

test('replay accepts only SHA-matched retained bytes within its batch directory', () => {
  const root = mkdtempSync(join(tmpdir(), 'job-reference-test-'))
  try {
    const jobs = join(root, 'batch.jobs.jsonl')
    const bytes = Buffer.from('synthetic input')
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const folder = join(root, 'batch-inputs')
    mkdirSync(folder)
    writeFileSync(join(folder, `${sha256}.txt`), bytes)
    const input = { name: 'sample.txt', sha256, bytes: bytes.length,
      relativePath: `batch-inputs/${sha256}.txt` }
    assert.deepEqual(resolveInput(input, {}, { jobs, repo: root }).bytes, bytes)
    assert.throws(() => resolveInput({ ...input, sha256: '0'.repeat(64) }, {}, { jobs, repo: root }), /retained input path/)
    assert.throws(() => resolveInput({ ...input, relativePath: '../outside.txt' }, {}, { jobs, repo: root }), /retained input path/)
    assert.throws(() => resolveInput({ ...input, name: '..\\sample.txt' }, {}, { jobs, repo: root }), /metadata/)
    writeFileSync(join(folder, `${sha256}.txt`), 'changed')
    assert.throws(() => resolveInput(input, {}, { jobs, repo: root }), /SHA-256 or size mismatch/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('fixed fixtures require matching index and cannot escape the public root', () => {
  const root = mkdtempSync(join(tmpdir(), 'job-reference-fixed-'))
  try {
    const bytes = Buffer.from('public synthetic input')
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    mkdirSync(join(root, 'raw'))
    writeFileSync(join(root, 'raw', 'sample.nef'), bytes)
    const input = { name: 'sample.nef', sha256, bytes: bytes.length,
      resourceId: 'parity-fixtures/raw/sample.nef' }
    const roots = { jobs: join(root, 'batch.jobs.jsonl'), repo: root, public: root }
    assert.deepEqual(resolveInput(input, { [sha256]: { resourceId: input.resourceId } }, roots).bytes, bytes)
    assert.throws(() => resolveInput(input, {}, roots), /index mismatch/)
    const escape = { ...input, resourceId: 'parity-fixtures/../outside.nef' }
    assert.throws(() => resolveInput(escape, { [sha256]: { resourceId: escape.resourceId } }, roots), /Unsafe fixture path/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('CLI arguments preserve supported options and reject unavailable ones', () => {
  assert.deepEqual(cliArgs({ operationId: 'convert:pdf', options: { pdfAction: 'encrypt', password: 'synthetic' } },
    ['/in.pdf'], '/out'), ['convert', '/in.pdf', '--to', 'pdf', '--pdf-action', 'encrypt',
    '--password', 'synthetic', '--output-dir', '/out', '--json'])
  assert.deepEqual(cliArgs({ operationId: 'merge-pdfs', options: {} }, ['/a.pdf', '/b.pdf'], '/out'),
    ['merge-pdfs', '/a.pdf', '/b.pdf', '--output-dir', '/out', '--json'])
  assert.throws(() => cliArgs({ operationId: 'convert:pdf', options: { splitMode: 'page' } },
    ['/in.pdf'], '/out'), /cannot replay option: splitMode/)
  assert.equal(routeForJob({ operationId: 'convert:pdf', inputs: [{}],
    options: { splitMode: 'group', groupSize: '2' } }), 'local-original-http')
  assert.throws(() => routeForJob({ operationId: 'convert:pdf', inputs: [{}],
    options: { splitMode: 'group', groupSize: '0' } }), /options are invalid/)
  assert.equal(routeForJob({ operationId: 'convert:mp4', inputs: [{}],
    options: { alphaBackground: '#0000ff' } }), 'local-original-http')
  assert.throws(() => routeForJob({ operationId: 'convert:mp4', inputs: [{}],
    options: { alphaBackground: 'blue;echo' } }), /alpha options are invalid/)
})

test('nested Markdown sidecar assets are included in the output inventory', () => {
  const root = mkdtempSync(join(tmpdir(), 'job-reference-assets-'))
  try {
    mkdirSync(join(root, 'sample.assets'))
    writeFileSync(join(root, 'sample.md'), '![image](sample.assets/figure.png)')
    writeFileSync(join(root, 'sample.assets', 'figure.png'), Buffer.from([137, 80, 78, 71]))
    assert.deepEqual(outputFiles(root).map((file) => file.slice(root.length + 1)).sort(),
      ['sample.assets/figure.png', 'sample.md'])
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('a synthetic job reaches the original CLI with its original filename', async () => {
  const root = mkdtempSync(join(tmpdir(), 'job-reference-cli-'))
  try {
    const bytes = Buffer.from('Synthetic replay 123\n')
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const jobs = join(root, 'sample.jobs.jsonl')
    mkdirSync(join(root, 'sample-inputs'))
    writeFileSync(join(root, 'sample-inputs', `${sha256}.txt`), bytes)
    writeFileSync(jobs, JSON.stringify({ operationId: 'convert:md', options: {},
      inputs: [{ name: 'original-name.txt', sha256, bytes: bytes.length,
        relativePath: `sample-inputs/${sha256}.txt` }] }) + '\n')
    writeFileSync(join(root, 'sample.fixture-index.json'), '{}\n')
    const out = join(root, 'reference')
    assert.equal(await replay({ jobs, out, repo: join(__dirname, '..') }), 0)
    const row = JSON.parse(readFileSync(join(out, 'reference.jsonl'), 'utf8'))
    assert.equal(row.status, 'reference-produced')
    assert.equal(row.qualityStatus, 'not-assessed')
    assert.equal(row.parityStatus, 'not-compared')
    assert.match(row.cli.outputs[0].input, /original-name\.txt$/)
    assert.match(readFileSync(join(out, row.outputs[0].relativePath), 'utf8'), /Synthetic replay 123/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('the original localhost service replays PDF group splitting with both options', async () => {
  const root = mkdtempSync(join(tmpdir(), 'job-reference-split-'))
  try {
    const source = join(__dirname, '../vendor/flyingmouse-format/upstream-a7b9b15')
    const { PDFDocument } = require(join(source, 'node_modules/pdf-lib'))
    const unzipper = require(join(source, 'node_modules/unzipper'))
    const pdf = await PDFDocument.create()
    for (let index = 0; index < 3; index++) pdf.addPage([200, 200])
    const bytes = Buffer.from(await pdf.save())
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const jobs = join(root, 'split.jobs.jsonl')
    mkdirSync(join(root, 'split-inputs'))
    writeFileSync(join(root, 'split-inputs', `${sha256}.pdf`), bytes)
    writeFileSync(jobs, JSON.stringify({ operationId: 'convert:pdf',
      options: { splitMode: 'group', groupSize: '2' },
      inputs: [{ name: 'three-pages.pdf', sha256, bytes: bytes.length,
        relativePath: `split-inputs/${sha256}.pdf` }] }) + '\n')
    writeFileSync(join(root, 'split.fixture-index.json'), '{}\n')
    const out = join(root, 'reference')
    assert.equal(await replay({ jobs, out, repo: join(__dirname, '..') }), 0)
    const row = JSON.parse(readFileSync(join(out, 'reference.jsonl'), 'utf8'))
    assert.equal(row.route, 'local-original-http')
    assert.equal(row.status, 'reference-produced')
    const archive = await unzipper.Open.buffer(readFileSync(join(out, row.outputs[0].relativePath)))
    const parts = archive.files.filter((file) => file.path.endsWith('.pdf'))
    assert.equal(parts.length, 2)
    const pageCounts = await Promise.all(parts.map(async (file) =>
      (await PDFDocument.load(await file.buffer())).getPageCount()))
    assert.deepEqual(pageCounts.sort(), [1, 2])
    assert.equal(row.qualityStatus, 'not-assessed')
    assert.equal(row.parityStatus, 'not-compared')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('the original localhost service preserves the video alpha background option', async (context) => {
  const cached = join(homedir(), 'Library/Caches/ledger-flyingmouse-engines/darwin-arm64/runtime')
  const ffmpeg = process.env.FLYINGMOUSE_FFMPEG_PATH ||
    (existsSync(join(cached, 'bin/ffmpeg')) ? join(cached, 'bin/ffmpeg') : 'ffmpeg')
  const env = { ...process.env, FLYINGMOUSE_FFMPEG_PATH: ffmpeg,
    ...(process.platform === 'darwin' ? { DYLD_LIBRARY_PATH: join(cached, 'lib') } : {}) }
  if (spawnSync(ffmpeg, ['-version'], { env }).status !== 0) return context.skip('FFmpeg unavailable')
  const oldFfmpeg = process.env.FLYINGMOUSE_FFMPEG_PATH
  const oldDyld = process.env.DYLD_LIBRARY_PATH
  const root = mkdtempSync(join(tmpdir(), 'job-reference-alpha-'))
  try {
    process.env.FLYINGMOUSE_FFMPEG_PATH = ffmpeg
    if (env.DYLD_LIBRARY_PATH) process.env.DYLD_LIBRARY_PATH = env.DYLD_LIBRARY_PATH
    const source = join(__dirname, '../vendor/flyingmouse-format/upstream-a7b9b15')
    const sharp = require(join(source, 'node_modules/sharp'))
    const pixels = Buffer.alloc(64 * 64 * 4)
    for (let y = 20; y < 44; y++) for (let x = 20; x < 44; x++) {
      const offset = (y * 64 + x) * 4
      pixels[offset] = 255; pixels[offset + 3] = 255
    }
    const png = join(root, 'alpha.png')
    await sharp(pixels, { raw: { width: 64, height: 64, channels: 4 } }).png().toFile(png)
    const mov = join(root, 'alpha.mov')
    assert.equal(spawnSync(ffmpeg, ['-v', 'error', '-loop', '1', '-i', png, '-t', '1',
      '-c:v', 'qtrle', '-pix_fmt', 'argb', mov], { env }).status, 0)
    const bytes = readFileSync(mov)
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const jobs = join(root, 'alpha.jobs.jsonl')
    mkdirSync(join(root, 'alpha-inputs'))
    writeFileSync(join(root, 'alpha-inputs', `${sha256}.mov`), bytes)
    writeFileSync(jobs, JSON.stringify({ operationId: 'convert:mp4',
      options: { alphaBackground: '#0000ff' },
      inputs: [{ name: 'alpha.mov', sha256, bytes: bytes.length,
        relativePath: `alpha-inputs/${sha256}.mov` }] }) + '\n')
    writeFileSync(join(root, 'alpha.fixture-index.json'), '{}\n')
    const out = join(root, 'reference')
    assert.equal(await replay({ jobs, out, repo: join(__dirname, '..') }), 0)
    const row = JSON.parse(readFileSync(join(out, 'reference.jsonl'), 'utf8'))
    assert.equal(row.route, 'local-original-http')
    const frame = spawnSync(ffmpeg, ['-v', 'error', '-i', join(out, row.outputs[0].relativePath),
      '-frames:v', '1', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1'], { env }).stdout
    assert.equal(frame.length, 64 * 64 * 3)
    const corner = [...frame.subarray((4 * 64 + 4) * 3, (4 * 64 + 4) * 3 + 3)]
    const center = [...frame.subarray((32 * 64 + 32) * 3, (32 * 64 + 32) * 3 + 3)]
    assert.ok(corner[2] > 170 && corner[0] < 80 && corner[1] < 80, `corner=${corner}`)
    assert.ok(center[0] > 150 && center[1] < 90 && center[2] < 90, `center=${center}`)
  } finally {
    if (oldFfmpeg === undefined) delete process.env.FLYINGMOUSE_FFMPEG_PATH
    else process.env.FLYINGMOUSE_FFMPEG_PATH = oldFfmpeg
    if (oldDyld === undefined) delete process.env.DYLD_LIBRARY_PATH
    else process.env.DYLD_LIBRARY_PATH = oldDyld
    rmSync(root, { recursive: true, force: true })
  }
})
