import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readdir, readFile, lstat } from 'node:fs/promises'

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const miniprogramRoot = path.join(packageRoot, 'miniprogram')
const npmRoot = path.join(miniprogramRoot, 'miniprogram_npm')
const runtimeRoot = path.join(npmRoot, '@babel', 'runtime')

const requiredHelpers = [
  'arrayWithHoles.js',
  'arrayWithoutHoles.js',
  'slicedToArray.js',
  'toConsumableArray.js',
]

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(file)))
    else files.push(file)
  }
  return files
}

async function assertNoSymlinks(dir) {
  for (const file of await walk(dir)) {
    const stat = await lstat(file)
    if (stat.isSymbolicLink()) throw new Error(`npm 产物禁止包含符号链接: ${file}`)
  }
}

async function assertRuntimeRelativeImports() {
  const runtimeFiles = (await walk(runtimeRoot)).filter((file) => file.endsWith('.js'))
  const unresolved = []
  for (const file of runtimeFiles) {
    const source = await readFile(file, 'utf8')
    for (const match of source.matchAll(/require\(\s*["'](\.\/[^"']+)["']\s*\)/g)) {
      const target = path.resolve(path.dirname(file), match[1])
      try {
        await readFile(target)
      } catch {
        unresolved.push(`${file}: ${match[1]}`)
      }
    }
  }
  if (unresolved.length) throw new Error(`Babel runtime 内部引用无法解析:\n${unresolved.join('\n')}`)
}

const runtimePackage = path.join(runtimeRoot, 'package.json')
await readFile(runtimePackage, 'utf8')
for (const helper of requiredHelpers) {
  const file = path.join(runtimeRoot, 'helpers', helper)
  const content = await readFile(file)
  if (!content.length) throw new Error(`Babel helper 为空: ${file}`)
}

await assertNoSymlinks(npmRoot)
await assertRuntimeRelativeImports()

const sourceFiles = (await walk(miniprogramRoot)).filter(
  (file) => !file.startsWith(`${npmRoot}${path.sep}`) && /\.(?:js|ts)$/.test(file),
)
const unresolved = []
for (const file of sourceFiles) {
  const source = await readFile(file, 'utf8')
  for (const match of source.matchAll(/(?:require\s*\(\s*|from\s+)["']@babel\/runtime\/([^"']+)["']/g)) {
    const target = path.join(runtimeRoot, `${match[1]}.js`)
    try {
      await readFile(target)
    } catch {
      unresolved.push(`${file}: @babel/runtime/${match[1]}`)
    }
  }
}
if (unresolved.length) throw new Error(`存在未打包的 Babel runtime 引用:\n${unresolved.join('\n')}`)

console.log(`[verify:npm] ok: ${requiredHelpers.length} Babel helpers, no symlinks, no unresolved runtime imports`)
