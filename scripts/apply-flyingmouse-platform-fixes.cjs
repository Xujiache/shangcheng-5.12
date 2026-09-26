#!/usr/bin/env node
// Apply reviewed engine fixes to a runtime copy; leave the pinned source untouched.
const { createHash, randomUUID } = require('node:crypto')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const source = path.join(root, 'vendor/flyingmouse-format/upstream-a7b9b15')
const expectedImageSha256 = '94593339599ff432abfb75b21578e019c4f05327cd1164af6e724c7f47474fcf'
const before = 'args.push("-loop", "1", "-i", inputPath, "-t", "3");'
const after = 'args.push("-stream_loop", "-1", "-i", inputPath, "-t", "3");'

function hash(bytes) { return createHash('sha256').update(bytes).digest('hex') }

function apply(directory) {
  if (path.resolve(directory) === source)
    throw new Error('Refusing to modify the pinned original source')
  const imagePath = path.join(directory, 'image.js')
  const bytes = fs.readFileSync(imagePath)
  if (hash(bytes) !== expectedImageSha256)
    throw new Error('Runtime image.js does not match pinned a7b9b15 source')
  const code = bytes.toString('utf8')
  if (code.split(before).length !== 2)
    throw new Error('Expected original FFmpeg loop call exactly once')
  const patched = code.replace(before, after)
  fs.writeFileSync(imagePath, patched)
  fs.writeFileSync(path.join(directory, '.platform-fixes.json'), JSON.stringify({
    sourceRevision: 'a7b9b15d32db80cecedae00e89289088656fb1ae',
    imageSourceSha256: expectedImageSha256,
    imageRuntimeSha256: hash(Buffer.from(patched)),
    fix: 'Use FFmpeg stream_loop for still-image video, including AVIF',
  }, null, 2) + '\n')
}

function verifyRuntime(directory) {
  const manifest = require(path.join(root, 'docs/flyingmouse-migration/source-a7b9b15-manifest.json'))
  const fixes = JSON.parse(fs.readFileSync(path.join(directory, '.platform-fixes.json'), 'utf8'))
  if (fixes.sourceRevision !== manifest.sourceRevision ||
    fixes.imageSourceSha256 !== expectedImageSha256 ||
    !fs.existsSync(path.join(directory, 'node_modules')))
    throw new Error('Runtime copy metadata or dependencies are invalid')
  for (const item of manifest.files) {
    const actual = hash(fs.readFileSync(path.join(directory, item.path)))
    const expected = item.path === 'image.js' ? fixes.imageRuntimeSha256 : item.sha256
    if (actual !== expected) throw new Error(`Runtime source mismatch: ${item.path}`)
  }
}

if (process.argv[2] === '--in-place') {
  apply(path.resolve(process.argv[3]))
} else if (process.argv[2] === '--copy') {
  execFileSync(process.execPath, [path.join(__dirname, 'verify-flyingmouse-source.cjs')], { stdio: 'inherit' })
  const destination = path.resolve(process.argv[3])
  if (fs.existsSync(destination)) {
    verifyRuntime(destination)
  } else {
    const temporary = `${destination}-${randomUUID()}`
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    try {
      fs.cpSync(source, temporary, {
        recursive: true,
        filter: (item) => !['node_modules', 'output'].some((name) =>
          item === path.join(source, name)),
      })
      fs.symlinkSync(path.join(source, 'node_modules'), path.join(temporary, 'node_modules'))
      apply(temporary)
      verifyRuntime(temporary)
      fs.renameSync(temporary, destination)
    } catch (error) {
      fs.rmSync(temporary, { recursive: true, force: true })
      throw error
    }
  }
  console.log(destination)
} else {
  throw new Error('Usage: apply-flyingmouse-platform-fixes.cjs --copy <runtime-dir> | --in-place <source-dir>')
}
