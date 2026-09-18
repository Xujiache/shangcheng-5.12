import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import {
  createReadStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
  statfsSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { basename, join, resolve } from 'node:path'

const targetRoot = '/opt/dcloud-offline-sdk/5.24.2026081301'

function sha256File(path) {
  return new Promise((resolveHash, reject) => {
    const hash = createHash('sha256')
    const input = createReadStream(path)
    input.on('error', reject)
    input.on('data', (chunk) => hash.update(chunk))
    input.on('end', () => resolveHash(hash.digest('hex')))
  })
}

function findSdkRoot(root) {
  const queue = [root]
  while (queue.length > 0) {
    const current = queue.shift()
    if (existsSync(join(current, 'HBuilder-Integrate-AS')) && existsSync(join(current, 'SDK'))) {
      return current
    }
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) queue.push(join(current, entry.name))
    }
  }
  return null
}

function findNestedSdkArchive(root) {
  const queue = [root]
  while (queue.length > 0) {
    const current = queue.shift()
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name)
      if (entry.isDirectory()) queue.push(path)
      if (entry.isFile() && /^Android-SDK@5\.24\..*\.zip$/i.test(entry.name)) return path
    }
  }
  return null
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== '--')
  if (args.length !== 1 || args[0] === '--help' || args[0] === '-h') {
    console.log('用法：pnpm android:sdk:install -- /root/最新版.zip')
    process.exit(args[0] ? 0 : 2)
  }
  const archive = resolve(args[0])
  if (!existsSync(archive) || !statSync(archive).isFile()) {
    throw new Error(`SDK 压缩包不存在：${archive}`)
  }
  if (existsSync(targetRoot)) {
    throw new Error(`目标目录已存在，不会覆盖：${targetRoot}`)
  }

  mkdirSync('/opt/dcloud-offline-sdk', { recursive: true })
  const fsStats = statfsSync('/opt/dcloud-offline-sdk')
  const availableBytes = Number(fsStats.bavail) * Number(fsStats.bsize)
  const minimumBytes = Math.max(1_200_000_000, statSync(archive).size * 3)
  if (availableBytes < minimumBytes) {
    throw new Error(
      `SDK 解压空间不足：可用 ${(availableBytes / 1024 ** 3).toFixed(2)} GiB，` +
        `至少需要 ${(minimumBytes / 1024 ** 3).toFixed(2)} GiB`,
    )
  }
  const digest = await sha256File(archive)
  const tempRoot = mkdtempSync('/opt/dcloud-offline-sdk/.install-')
  try {
    const unzip = spawnSync('unzip', ['-q', archive, '-d', tempRoot], { stdio: 'inherit' })
    if (unzip.error) throw unzip.error
    if (unzip.status !== 0) throw new Error(`unzip 失败（${unzip.status}）`)
    let extracted = findSdkRoot(tempRoot)
    const nestedArchive = extracted ? null : findNestedSdkArchive(tempRoot)
    if (!extracted && nestedArchive) {
      const expandedRoot = join(tempRoot, '.sdk-expanded')
      mkdirSync(expandedRoot)
      const expandNested = spawnSync('unzip', ['-q', nestedArchive, '-d', expandedRoot], {
        stdio: 'inherit',
      })
      if (expandNested.error) throw expandNested.error
      if (expandNested.status !== 0) throw new Error(`内层 SDK unzip 失败（${expandNested.status}）`)
      extracted = findSdkRoot(expandedRoot)
    }
    if (!extracted) throw new Error('压缩包中未找到 HBuilder-Integrate-AS 与 SDK 目录')
    const sdkArchiveName = basename(nestedArchive || archive)
    if (!/^Android-SDK@5\.24\..*\.zip$/i.test(sdkArchiveName)) {
      throw new Error(`只接受官方 5.24 Android SDK，识别到：${sdkArchiveName}`)
    }
    renameSync(extracted, targetRoot)
    writeFileSync(join(targetRoot, 'SOURCE.sha256'), `${digest}  ${basename(archive)}\n`)
    writeFileSync(
      join(targetRoot, 'SOURCE.txt'),
      `DCloud Android 离线 SDK 5.24.2026081301\n来源文件：${archive}\nSDK 归档：${sdkArchiveName}\n安装时间：${new Date().toISOString()}\n`,
    )
    console.log(`SDK 已安装：${targetRoot}`)
    console.log(`压缩包 SHA-256：${digest}`)
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(`安装失败：${error.message}`)
  process.exit(1)
})
