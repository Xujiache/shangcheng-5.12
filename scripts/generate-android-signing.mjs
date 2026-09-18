import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const secureRoot = '/root/secure'
const signingDir = join(secureRoot, 'jiujiu-android-signing')
const backupPasswordPath = join(secureRoot, 'jiujiu-android-backup-passphrase.txt')

const targets = [
  { name: 'merchant', alias: 'jingwei-merchant-release', label: '商家端' },
  { name: 'platform', alias: 'jingwei-platform-release', label: '平台端' },
]

function secret() {
  return randomBytes(36).toString('base64url')
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    ...options,
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} 失败：${result.stderr || result.stdout || result.status}`)
  }
  return result.stdout || ''
}

function writePrivateFile(path, content) {
  writeFileSync(path, content, { mode: 0o600, flag: 'wx' })
  chmodSync(path, 0o600)
}

function assertCleanTarget() {
  const reserved = [backupPasswordPath, signingDir]
  for (const path of reserved) {
    if (existsSync(path)) {
      throw new Error(`签名材料已存在，为避免破坏覆盖已停止：${path}`)
    }
  }
}

function createKey(target) {
  const keystorePath = join(signingDir, `${target.name}-release.jks`)
  const propertiesPath = join(signingDir, `${target.name}.properties`)
  const certificatePath = join(signingDir, `${target.name}-release.cer`)
  const storePassword = secret()
  const keyPassword = secret()
  const passwordEnv = {
    ...process.env,
    JIUJIU_STORE_PASSWORD: storePassword,
    JIUJIU_KEY_PASSWORD: keyPassword,
  }

  run(
    'keytool',
    [
      '-genkeypair',
      '-noprompt',
      '-storetype',
      'JKS',
      '-keystore',
      keystorePath,
      '-storepass:env',
      'JIUJIU_STORE_PASSWORD',
      '-keypass:env',
      'JIUJIU_KEY_PASSWORD',
      '-alias',
      target.alias,
      '-keyalg',
      'RSA',
      '-keysize',
      '4096',
      '-sigalg',
      'SHA256withRSA',
      '-validity',
      '9125',
      '-dname',
      'CN=Jingwei Android Release, OU=Mobile, O=Jingwei Technology, C=CN',
    ],
    { env: passwordEnv },
  )
  chmodSync(keystorePath, 0o600)

  writePrivateFile(
    propertiesPath,
    [
      `storeFile=${keystorePath}`,
      `storePassword=${storePassword}`,
      `keyAlias=${target.alias}`,
      `keyPassword=${keyPassword}`,
      '',
    ].join('\n'),
  )

  run(
    'keytool',
    [
      '-exportcert',
      '-rfc',
      '-keystore',
      keystorePath,
      '-storepass:env',
      'JIUJIU_STORE_PASSWORD',
      '-alias',
      target.alias,
      '-file',
      certificatePath,
    ],
    { env: passwordEnv },
  )
  chmodSync(certificatePath, 0o644)

  const details = run(
    'keytool',
    [
      '-list',
      '-v',
      '-keystore',
      keystorePath,
      '-storepass:env',
      'JIUJIU_STORE_PASSWORD',
      '-alias',
      target.alias,
    ],
    { env: passwordEnv },
  )
  const sha1 = details.match(/SHA1:\s*([0-9A-F:]+)/i)?.[1]?.toUpperCase()
  const sha256 = details.match(/SHA256:\s*([0-9A-F:]+)/i)?.[1]?.toUpperCase()
  if (!sha1 || !sha256) throw new Error(`${target.label}证书指纹解析失败`)
  return { ...target, keystorePath, certificatePath, sha1, sha256 }
}

function createEncryptedBackup() {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
  const archivePath = join(secureRoot, `.jiujiu-android-signing-${timestamp}.tar.gz`)
  const encryptedPath = join(secureRoot, `jiujiu-android-signing-backup-${timestamp}.tar.gz.enc`)
  writePrivateFile(backupPasswordPath, `${secret()}\n`)
  try {
    run('tar', ['-czf', archivePath, '-C', secureRoot, 'jiujiu-android-signing'])
    chmodSync(archivePath, 0o600)
    run('openssl', [
      'enc',
      '-aes-256-cbc',
      '-salt',
      '-pbkdf2',
      '-iter',
      '250000',
      '-in',
      archivePath,
      '-out',
      encryptedPath,
      '-pass',
      `file:${backupPasswordPath}`,
    ])
    chmodSync(encryptedPath, 0o600)
    return encryptedPath
  } finally {
    rmSync(archivePath, { force: true })
  }
}

function main() {
  assertCleanTarget()
  mkdirSync(secureRoot, { recursive: true, mode: 0o700 })
  mkdirSync(signingDir, { mode: 0o700 })
  const results = targets.map(createKey)
  if (results[0].sha256 === results[1].sha256) {
    throw new Error('两端证书指纹相同，已停止')
  }
  const fingerprintPath = join(signingDir, 'FINGERPRINTS.txt')
  writeFileSync(
    fingerprintPath,
    `${results
      .map(
        (result) =>
          `${result.label} (${result.name})\n` +
          `package: top.ewsn.jingwei.${result.name}\n` +
          `SHA-1: ${result.sha1}\n` +
          `SHA-256: ${result.sha256}\n`,
      )
      .join('\n')}\n`,
    { mode: 0o644 },
  )
  const encryptedBackup = createEncryptedBackup()

  console.log(`正式签名材料：${signingDir}`)
  for (const result of results) {
    console.log(`${result.label} SHA-1: ${result.sha1}`)
    console.log(`${result.label} SHA-256: ${result.sha256}`)
  }
  console.log(`加密备份：${encryptedBackup}`)
  console.log(`备份口令：${backupPasswordPath}`)
  console.log('请将加密备份与备份口令分开离线保存。')
}

try {
  main()
} catch (error) {
  console.error(`初始化失败：${error.message}`)
  process.exit(1)
}
