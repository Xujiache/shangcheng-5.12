import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cp, realpath, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { packNpmManually } = require('miniprogram-ci')

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageJsonPath = path.join(packageRoot, 'package.json')
const miniprogramRoot = path.join(packageRoot, 'miniprogram')
const outputRoot = path.join(miniprogramRoot, 'miniprogram_npm')
const runtimeSource = await realpath(path.join(packageRoot, 'node_modules', '@babel', 'runtime'))
const runtimeOutput = path.join(outputRoot, '@babel', 'runtime')

await rm(outputRoot, { recursive: true, force: true })

const result = await packNpmManually({
  packageJsonPath,
  miniprogramNpmDistDir: miniprogramRoot,
})

const unexpectedWarnings = (result.warnList || []).filter(
  (warning) => !warning.jsPath.endsWith(`${path.sep}@babel${path.sep}runtime${path.sep}index.js`),
)
if (unexpectedWarnings.length) {
  for (const warning of unexpectedWarnings) console.error(`[build:npm] ${warning.msg || '构建警告'}`)
  throw new Error('小程序 npm 构建存在警告，已停止交付')
}

// @babel/runtime exports helpers through subpaths and intentionally has no root index.js.
// The official packer reports that missing entry, so copy the complete package tree instead
// of flattening it into an incorrect index.js bundle.
await cp(runtimeSource, runtimeOutput, { recursive: true })

console.log(
  `[build:npm] generated ${outputRoot} (runtime=${runtimeOutput}, miniprogram=${result.miniProgramPackNum}, bundled=${result.otherNpmPackNum})`,
)
