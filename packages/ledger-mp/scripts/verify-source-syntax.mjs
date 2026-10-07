import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { readFile, readdir } from 'node:fs/promises'
import ts from 'typescript'

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const miniprogramRoot = path.join(packageRoot, 'miniprogram')

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'miniprogram_npm') {
      files.push(...(await walk(file)))
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      files.push(file)
    }
  }
  return files
}

const projectConfig = JSON.parse(
  await readFile(path.join(packageRoot, 'project.config.json'), 'utf8'),
)
if (projectConfig.setting?.es6 !== true) {
  throw new Error(
    'project.config.json 必须开启 es6 转 ES5，否则可选链和空值合并会原样进入小程序 JS',
  )
}

const files = await walk(miniprogramRoot)
const unsupported = []
for (const file of files) {
  const source = await readFile(file, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES5 },
    fileName: file,
  }).outputText
  new vm.Script(output, { filename: file })
  if (/\?\.|\?\?/.test(output)) unsupported.push(path.relative(packageRoot, file))
}
if (unsupported.length) {
  throw new Error(`ES5 产物仍包含可选链或空值合并: ${unsupported.join(', ')}`)
}

console.log(
  `[verify:syntax] ok: ${files.length} TypeScript files transpile without ES2020 operators`,
)
