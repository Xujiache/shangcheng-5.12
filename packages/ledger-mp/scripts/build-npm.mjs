import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { packNpmManually } = require('miniprogram-ci')

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageJsonPath = path.join(packageRoot, 'package.json')
const miniprogramRoot = path.join(packageRoot, 'miniprogram')
const outputRoot = path.join(miniprogramRoot, 'miniprogram_npm')
const runtimeOutput = path.join(outputRoot, '@babel', 'runtime')

// Never leave a previous artifact available after a failed rebuild.
await rm(outputRoot, { recursive: true, force: true })

const runtimeSource = await realpath(path.join(packageRoot, 'node_modules', '@babel', 'runtime'))

try {
  if (!(await readFile(path.join(runtimeSource, 'index.js'))).length) throw new Error('empty')
} catch {
  throw new Error(
    `@babel/runtime 缺少根入口: ${runtimeSource}/index.js。请使用仓库锁定的 pnpm patch 后再构建，禁止生成只能在当前缓存中工作的 npm 产物`,
  )
}

const result = await packNpmManually({
  packageJsonPath,
  miniprogramNpmDistDir: miniprogramRoot,
})

const unexpectedWarnings = (result.warnList || []).filter(
  (warning) => !warning.jsPath.endsWith(`${path.sep}@babel${path.sep}runtime${path.sep}index.js`),
)
if (unexpectedWarnings.length) {
  for (const warning of unexpectedWarnings)
    console.error(`[build:npm] ${warning.msg || '构建警告'}`)
  throw new Error('小程序 npm 构建存在警告，已停止交付')
}

// Normalize the packer's generated wrapper so the checked-in artifact is deterministic.
const generatedEntry = path.join(runtimeOutput, 'index.js')
const generatedSource = await readFile(generatedEntry, 'utf8')
const normalizedSource = generatedSource.replace(/[ \t]+$/gm, '')
if (normalizedSource !== generatedSource) await writeFile(generatedEntry, normalizedSource)

// The official package has no root entry and WeChat resolves helper subpaths through that
// entry. The patched runtime entry imports every CommonJS helper, so the packer emits one
// deterministic module table containing all helpers and their relative dependencies.
// Preserve the package metadata and direct helper files for subpath resolution, but keep the
// packer's generated index.js/index.js.map which contains the actual module table.
const runtimeEntries = await readdir(runtimeSource)
for (const entry of runtimeEntries) {
  if (entry === 'index.js' || entry === 'index.js.map') continue
  await cp(path.join(runtimeSource, entry), path.join(runtimeOutput, entry), { recursive: true })
}

console.log(
  `[build:npm] generated ${outputRoot} (runtime=${runtimeOutput}, miniprogram=${result.miniProgramPackNum}, bundled=${result.otherNpmPackNum})`,
)
