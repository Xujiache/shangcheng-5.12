import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import zlib from 'node:zlib'

// The key file is intentionally outside Git. Never pass secret values as CLI arguments.
const [bundleFile, keyFile, destination] = process.argv.slice(2)
if (!bundleFile || !keyFile || !destination || process.argv.length !== 5) {
  console.error(
    'Usage: node restore-huawei-key-bundle.mjs <bundle.enc> <key.json> <--verify|new-output-directory>',
  )
  process.exit(1)
}

try {
  const encrypted = fs.readFileSync(bundleFile)
  if (
    encrypted.length < 37 ||
    encrypted.length > 10 * 1024 * 1024 ||
    encrypted.subarray(0, 8).toString('ascii') !== 'JWKEYS01'
  ) {
    throw new Error('Invalid encrypted bundle')
  }
  const keyInfo = JSON.parse(fs.readFileSync(keyFile, 'utf8').replace(/^\uFEFF/, ''))
  const key = Buffer.from(keyInfo.keyBase64 || '', 'base64')
  if (
    key.length !== 32 ||
    keyInfo.format !== 'jingwei-key-envelope-v1' ||
    keyInfo.bundleSha256 !== crypto.createHash('sha256').update(encrypted).digest('hex')
  ) {
    throw new Error('Wrong key file or damaged bundle')
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, encrypted.subarray(8, 20))
  decipher.setAAD(Buffer.from('JWKEYS01', 'ascii'))
  decipher.setAuthTag(encrypted.subarray(20, 36))
  const compressed = Buffer.concat([decipher.update(encrypted.subarray(36)), decipher.final()])
  const payload = JSON.parse(
    zlib.gunzipSync(compressed, { maxOutputLength: 64 * 1024 * 1024 }).toString('utf8'),
  )
  if (
    payload.format !== 'jingwei-huawei-key-backup-v1' ||
    !Array.isArray(payload.files) ||
    payload.files.length === 0 ||
    payload.files.length > 64
  ) {
    throw new Error('Invalid payload')
  }
  const names = new Set()
  const files = payload.files.map((file) => {
    if (
      typeof file.name !== 'string' ||
      !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*(\/[a-zA-Z0-9][a-zA-Z0-9_.-]*)*$/.test(file.name) ||
      names.has(file.name.toLowerCase()) ||
      typeof file.data !== 'string'
    ) {
      throw new Error('Unsafe or duplicate file name')
    }
    names.add(file.name.toLowerCase())
    const bytes = Buffer.from(file.data, 'base64')
    if (
      file.bytes !== bytes.length ||
      crypto.createHash('sha256').update(bytes).digest('hex') !== file.sha256
    ) {
      throw new Error('File integrity check failed')
    }
    return { name: file.name, bytes }
  })

  if (destination === '--verify') {
    console.log(`Authenticated bundle verified: ${files.length} files; no files extracted.`)
  } else {
    const output = path.resolve(destination)
    // Refuse existing directories, including symlinks; never overwrite an existing credential.
    fs.mkdirSync(output, { mode: 0o700 })
    for (const file of files) {
      const target = path.join(output, ...file.name.split('/'))
      fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 })
      fs.writeFileSync(target, file.bytes, { flag: 'wx', mode: 0o600 })
    }
    console.log(
      `Restored ${files.length} files to a new directory. Keep it outside Git and restrict Windows ACLs if applicable.`,
    )
  }
} catch {
  // Errors must not echo private input, key material, or file contents.
  console.error(
    'Restore failed. Check the key, bundle integrity, destination and storage permissions. Existing files were not overwritten; remove any incomplete new output only after inspection.',
  )
  process.exitCode = 1
}
