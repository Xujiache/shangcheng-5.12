import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { lstat, readdir } from 'node:fs/promises'

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const miniprogramRoot = path.join(packageRoot, 'miniprogram')
const resourceExtensions = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.svg',
  '.webp',
  '.gif',
  '.flac',
  '.m4a',
  '.ogg',
  '.ape',
  '.amr',
  '.wma',
  '.wav',
  '.mp3',
  '.mp4',
  '.aac',
  '.aiff',
  '.caf',
])
const resourceLimit = 200 * 1024

async function measure(dir) {
  let total = 0
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      total += await measure(file)
      continue
    }
    if (!resourceExtensions.has(path.extname(entry.name).toLowerCase())) continue
    const stat = await lstat(file)
    if (stat.isFile()) total += stat.size
  }
  return total
}

const size = await measure(miniprogramRoot)
const kib = (size / 1024).toFixed(1)
if (size >= resourceLimit) {
  throw new Error(`小程序图片和音频资源 ${kib} KiB 达到或超过 200 KiB 限制，请压缩资源后再构建`)
}
console.log(`[verify:resource-size] ok: ${kib} KiB / 200 KiB`)
