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

async function assertNoNestedNpmRoot() {
  const nestedRoot = path.join(npmRoot, 'miniprogram_npm')
  try {
    await lstat(nestedRoot)
  } catch {
    return
  }
  throw new Error(
    `npm 产物目录不能嵌套 miniprogram_npm，请使用 project.config.json 的 miniprogramNpmDistDir=./miniprogram: ${nestedRoot}`,
  )
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

async function assertRegularNonEmpty(file, label) {
  const stat = await lstat(file)
  if (!stat.isFile() || stat.size === 0) throw new Error(`${label} 必须是非空普通文件: ${file}`)
}

function runtimeCandidates(request) {
  const normalized = request.replace(/^\.\//, '')
  if (normalized.endsWith('.js') || normalized.endsWith('.json')) return [normalized]
  return [`${normalized}.js`, `${normalized}.json`, path.join(normalized, 'index.js')]
}

async function resolveRuntimeRequest(request) {
  for (const candidate of runtimeCandidates(request)) {
    const file = path.join(runtimeRoot, candidate)
    const relative = path.relative(runtimeRoot, file)
    if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) continue
    try {
      await assertRegularNonEmpty(file, 'Babel runtime 依赖')
      return file
    } catch {
      // Continue through extension and directory-index candidates.
    }
  }
  return null
}

async function resolveRelativeRequest(fromFile, request) {
  const base = path.resolve(path.dirname(fromFile), request)
  const candidates =
    request.endsWith('.js') || request.endsWith('.json')
      ? [base]
      : [base, `${base}.js`, `${base}.json`, path.join(base, 'index.js')]
  for (const file of candidates) {
    const relative = path.relative(runtimeRoot, file)
    if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) continue
    try {
      await assertRegularNonEmpty(file, 'Babel runtime 内部依赖')
      return file
    } catch {
      // Continue through extension and directory-index candidates.
    }
  }
  return null
}

async function assertRuntimeRelativeImports() {
  // index.js is the miniprogram-ci module table; its relative requires refer to
  // virtual module IDs inside the wrapper, not files beside the wrapper.
  const runtimeFiles = (await walk(runtimeRoot)).filter(
    (file) => file.endsWith('.js') && path.basename(file) !== 'index.js',
  )
  const unresolved = []
  for (const file of runtimeFiles) {
    const source = await readFile(file, 'utf8')
    for (const match of source.matchAll(/require\(\s*["']((?:\.\/|\.\.\/)[^"']+)["']\s*\)/g)) {
      if (!(await resolveRelativeRequest(file, match[1]))) unresolved.push(`${file}: ${match[1]}`)
    }
  }
  if (unresolved.length)
    throw new Error(`Babel runtime 内部引用无法解析:\n${unresolved.join('\n')}`)
}

const packageManifest = await readJson(path.join(packageRoot, 'package.json'))
const expectedRuntimeVersion = packageManifest.dependencies?.['@babel/runtime']
if (
  !expectedRuntimeVersion ||
  expectedRuntimeVersion.includes('^') ||
  expectedRuntimeVersion.includes('~')
) {
  throw new Error(
    `@babel/runtime 必须锁定为固定版本，当前为: ${expectedRuntimeVersion || '(缺失)'}`,
  )
}
const projectConfig = await readJson(path.join(packageRoot, 'project.config.json'))
const npmSettings = projectConfig.setting || {}
if (npmSettings.es6 !== false) {
  throw new Error(
    'project.config.json 必须关闭 DevTools 的 ES6/Babel 转译；TypeScript 已输出可运行代码，开启该转译会注入裸 @babel/runtime helper 并导致 arrayWithHoles 缺失',
  )
}
const expectedRelation = (npmSettings.packNpmRelationList || []).some(
  (relation) =>
    relation.packageJsonPath === './package.json' &&
    relation.miniprogramNpmDistDir === './miniprogram',
)
if (npmSettings.packNpmManually !== true || !expectedRelation) {
  throw new Error(
    'project.config.json 必须启用 packNpmManually，并将 ./package.json 映射到 ./miniprogram；否则开发者工具清缓存后会丢失 Babel runtime',
  )
}

const runtimePackage = path.join(runtimeRoot, 'package.json')
const generatedRuntime = await readJson(runtimePackage)
if (generatedRuntime.version !== expectedRuntimeVersion) {
  throw new Error(
    `生成包中的 @babel/runtime 版本不匹配: ${generatedRuntime.version} !== ${expectedRuntimeVersion}`,
  )
}
const runtimeEntry = path.join(runtimeRoot, 'index.js')
await assertRegularNonEmpty(runtimeEntry, 'Babel runtime 根入口')
const runtimeFiles = await walk(path.join(runtimeRoot, 'helpers'))
for (const file of runtimeFiles.filter((entry) => entry.endsWith('.js'))) {
  await assertRegularNonEmpty(file, 'Babel helper')
}
for (const helper of requiredHelpers) {
  const file = path.join(runtimeRoot, 'helpers', helper)
  await assertRegularNonEmpty(file, '必需 Babel helper')
}

await assertNoSymlinks(npmRoot)
await assertNoNestedNpmRoot()
await assertRuntimeRelativeImports()

const sourceFiles = (await walk(miniprogramRoot)).filter(
  (file) => !file.startsWith(`${npmRoot}${path.sep}`) && /\.(?:js|ts)$/.test(file),
)
const unresolved = []
for (const file of sourceFiles) {
  const source = await readFile(file, 'utf8')
  for (const match of source.matchAll(
    /(?:require\s*\(\s*|from\s+|import\s*\(\s*|import\s+)["']@babel\/runtime(?:\/([^"']+))?["']/g,
  )) {
    const request = match[1] || 'index.js'
    if (!(await resolveRuntimeRequest(request)))
      unresolved.push(`${file}: @babel/runtime/${request}`)
  }
}
if (unresolved.length) throw new Error(`存在未打包的 Babel runtime 引用:\n${unresolved.join('\n')}`)

console.log(
  `[verify:npm] ok: ${runtimeFiles.filter((file) => file.endsWith('.js')).length} Babel helpers, runtime ${expectedRuntimeVersion}, no symlinks, no unresolved imports`,
)
