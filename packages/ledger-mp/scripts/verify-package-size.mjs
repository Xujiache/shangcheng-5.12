import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { lstat, readdir } from 'node:fs/promises'

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const miniprogramRoot = path.join(packageRoot, 'miniprogram')
const subpackagesRoot = path.join(miniprogramRoot, 'subpackages')
const mainPackageLimit = 2 * 1024 * 1024

async function measure(dir) {
  let total = 0
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (path.resolve(file) === path.resolve(subpackagesRoot)) continue
      total += await measure(file)
      continue
    }
    const stat = await lstat(file)
    if (stat.isFile()) total += stat.size
  }
  return total
}

const size = await measure(miniprogramRoot)
const kib = (size / 1024).toFixed(1)
const limitKib = (mainPackageLimit / 1024).toFixed(0)
if (size > mainPackageLimit) {
  throw new Error(
    `小程序主包源文件 ${kib} KiB 超过 ${limitKib} KiB 限制，请将页面专属资源放入 subpackages`,
  )
}
console.log(`[verify:package-size] ok: main package source ${kib} KiB / ${limitKib} KiB`)
