import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const apps = [
  { name: 'merchant', dir: 'packages/merchant-app', expectedPages: 31 },
  { name: 'platform', dir: 'packages/platform-app', expectedPages: 29 },
]

const failures = []
const legacyPath = /components\/(?:empty-state|icon|nav-bar|order-card|product-card|section|stat-card|status-tag|tab-bar|tabs|safe-bottom|tag-chip)/
const legacyTag = /<(?:EmptyState|Icon|NavBar|OrderCard|ProductCard|Section|StatCard|StatusTag|TabBar|Tabs|SafeBottom|TagChip)(?:\s+(?:v-|:|@|#|class=|[a-z-]+=)|\s*\/?>)/
const rawControl = /<(?:button|input|textarea|switch|picker)\b/
const nativeFeedback = /uni\.(?:showToast|showModal|showActionSheet|showLoading|hideLoading)\s*\(/
const rawOverlay = /<view[^>]+class=["'][^"']*(?:sheet-mask|picker-mask|filter-mask|cp-mask|mk-mask|cat-mask|mpick-mask)[^"']*["']/

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const target = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(target)))
    else if (/\.(?:vue|ts|scss|css)$/.test(entry.name)) files.push(target)
  }
  return files
}

function fail(file, reason) {
  failures.push(`${path.relative(root, file)}: ${reason}`)
}

const sharedEntry = path.join(root, 'packages/shared/src/index.ts')
const sharedEntrySource = await readFile(sharedEntry, 'utf8')
if (/export\s+\*\s+from\s+['"]\.\/mock['"]/.test(sharedEntrySource)) {
  fail(sharedEntry, '生产主入口禁止导出 Mock/Faker；请使用 @jiujiu/shared/mock 子路径')
}

for (const app of apps) {
  const appDir = path.join(root, app.dir)
  const packageFile = path.join(appDir, 'package.json')
  const pkg = JSON.parse(await readFile(packageFile, 'utf8'))
  if (pkg.dependencies?.['wot-design-uni'] !== '1.14.0') fail(packageFile, 'wot-design-uni 必须固定为 1.14.0')
  if (pkg.dependencies?.['@aslanonur/liquid-glass-vue'] !== '1.1.3') fail(packageFile, '液态玻璃必须固定为 1.1.3')
  if (pkg.devDependencies?.sass !== '1.78.0') fail(packageFile, 'Sass 必须固定为 1.78.0')

  const duplicateLibraries = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter((name) =>
    /(?:^|[-@/])(?:uni-ui|uview|u-view|vant|tmui|thorui|nutui|uv-ui)(?:$|[-/])/i.test(name),
  )
  if (duplicateLibraries.length) fail(packageFile, `残留重复 UI 依赖: ${duplicateLibraries.join(', ')}`)

  const sourceFiles = await walk(path.join(appDir, 'src'))
  let wotRefs = 0
  let uploadRefs = 0
  let popupRefs = 0
  let glassRefs = 0
  for (const file of sourceFiles) {
    const source = await readFile(file, 'utf8')
    const executable = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
    if (legacyPath.test(executable)) fail(file, '残留旧通用组件导入路径')
    if (legacyTag.test(executable)) fail(file, '残留旧通用组件标签')
    if (rawControl.test(executable)) fail(file, '残留原生通用表单控件')
    if (nativeFeedback.test(executable)) fail(file, '残留 uni 原生反馈 API')
    if (rawOverlay.test(executable)) fail(file, '残留手写遮罩弹层')
    wotRefs += (source.match(/<wd-[\w-]+/g) || []).length
    uploadRefs += (source.match(/<wd-upload\b/g) || []).length
    popupRefs += (source.match(/<wd-popup\b/g) || []).length
    glassRefs += (source.match(/<GlassSurface\b/g) || []).length
  }

  const pages = (await walk(path.join(appDir, 'src/pages'))).filter((file) => file.endsWith('.vue'))
  if (pages.length !== app.expectedPages) fail(path.join(appDir, 'src/pages'), `页面数应为 ${app.expectedPages}，实际 ${pages.length}`)
  for (const page of pages) {
    const source = await readFile(page, 'utf8')
    // 冷启动页必须只依赖 uni-app 基础组件，组件库初始化异常时仍能显示并导航。
    if (page.endsWith(`${path.sep}pages${path.sep}startup${path.sep}index.vue`)) continue
    if (!source.includes('<wd-config-provider')) fail(page, '缺少 Wot 全局主题容器')
  }
  if (wotRefs < 250) fail(appDir, `Wot 组件覆盖不足，只有 ${wotRefs} 处`)
  if (!uploadRefs) fail(appDir, '未迁移 Wot Upload')
  if (popupRefs < 3) fail(appDir, `Wot Popup 覆盖不足，只有 ${popupRefs} 处`)
  if (!glassRefs) fail(appDir, '未接入 GlassSurface 液态玻璃')
}

if (failures.length) {
  console.error(`UI 迁移审计失败（${failures.length} 项）：\n${failures.map((item) => `- ${item}`).join('\n')}`)
  process.exit(1)
}

console.log('UI 迁移审计通过：双端 60 个页面均已接入 Wot Design Uni，旧通用组件与原生反馈入口已清理。')
