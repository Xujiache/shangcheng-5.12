const fs = require('node:fs'),
  path = require('node:path'),
  cp = require('node:child_process'),
  assert = require('node:assert/strict')
const root = path.resolve('packages/ledger-mp/miniprogram')
const dir = path.resolve('packages/server/.workbook-test/compiled')
fs.mkdirSync(dir, { recursive: true })
const walk = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))
const files = walk(root)
const wxml = files
  .filter((f) => f.endsWith('.wxml'))
  .map((f) => path.relative(root, f).replaceAll('\\', '/'))
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'))
const routes = [
  ...app.pages,
  ...(app.subPackages || []).flatMap((p) => p.pages.map((x) => p.root + '/' + x)),
]
for (const route of routes)
  for (const ext of ['ts', 'wxml', 'wxss', 'json'])
    assert(fs.existsSync(path.join(root, route + '.' + ext)), route + '.' + ext)
for (const f of files.filter((f) => f.endsWith('.json'))) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'))
  for (const component of Object.values(j.usingComponents || {})) {
    if (component.startsWith('plugin://')) continue
    const p = component.startsWith('/')
      ? path.join(root, component)
      : path.resolve(path.dirname(f), component)
    assert(fs.existsSync(p + '.json'), p)
  }
}
const bin =
  'C:/Program Files (x86)/Tencent/微信web开发者工具/code/package.nw/node_modules/wcc-exec/'
const result = cp.spawnSync(bin + 'wcc.exe', ['-o', path.join(dir, 'wxml.js'), ...wxml], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
})
if (result.status !== 0) throw Error(result.stderr || result.stdout || String(result.error))
const styles = files
  .filter((f) => f.endsWith('.wxss'))
  .map((f) => path.relative(root, f).replaceAll('\\', '/'))
const css = cp.spawnSync(bin + 'wcsc.exe', ['-o', path.join(dir, 'wxss.js'), ...styles], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
})
if (css.status !== 0) throw Error(css.stderr || css.stdout || String(css.error))
console.log(
  JSON.stringify({
    routes: routes.length,
    wxml: wxml.length,
    wxss: styles.length,
    result: 'official WeChat WXML/WXSS compilers passed',
  }),
)
