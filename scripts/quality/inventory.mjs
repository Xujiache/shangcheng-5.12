import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { root, sourceIdentity } from './source.mjs'

const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')
const walk = (dir) =>
  fs.existsSync(path.join(root, dir))
    ? fs
        .readdirSync(path.join(root, dir), { withFileTypes: true })
        .flatMap((e) => (e.isDirectory() ? walk(dir + '/' + e.name) : [dir + '/' + e.name]))
    : []
const pages = []
for (const pkg of ['user-mp', 'merchant-app', 'platform-app', 'ledger-mp']) {
  const file =
    'packages/' + pkg + (pkg === 'ledger-mp' ? '/miniprogram/app.json' : '/src/pages.json')
  const parsed = ts.parseConfigFileTextToJson(file, read(file))
  if (parsed.error) throw Error('Cannot parse ' + file)
  const json = parsed.config
  for (const p of json.pages || [])
    pages.push({
      product: pkg,
      route: typeof p === 'string' ? p : p.path,
      source: file,
      status: '待验证',
    })
  for (const group of json.subPackages || json.subpackages || [])
    for (const p of group.pages)
      pages.push({
        product: pkg,
        route: group.root + '/' + (typeof p === 'string' ? p : p.path),
        source: file,
        status: '待验证',
      })
}
// Admin menus are also server-driven; view source presence is not route reachability proof.
for (const file of walk('packages/admin-pc/src/views').filter((f) => f.endsWith('.vue')))
  pages.push({
    product: 'admin-pc',
    source: file,
    route: null,
    status: '待验证',
    note: '需登录各角色核实动态菜单与可达性',
  })
const nativeProfile =
  'native/harmony-merchant/entry/src/main/resources/base/profile/main_pages.json'
if (fs.existsSync(path.join(root, nativeProfile)))
  for (const p of JSON.parse(read(nativeProfile)).src || [])
    pages.push({
      product: 'harmony',
      route: p,
      source: nativeProfile,
      status: '待验证',
      note: '31项功能面需另按原生矩阵真机验证',
    })
const endpoints = []
const decorators = (n) => (ts.canHaveDecorators(n) ? ts.getDecorators(n) || [] : [])
const calls = (n) =>
  decorators(n)
    .map((d) => d.expression)
    .filter(ts.isCallExpression)
for (const file of walk('packages/server/src').filter((f) => f.endsWith('.controller.ts'))) {
  const ast = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true)
  for (const cls of ast.statements.filter(ts.isClassDeclaration)) {
    const controller = calls(cls).find((c) => c.expression.getText(ast) === 'Controller')
    if (!controller) continue
    const value = (node) =>
      !node ? '' : ts.isStringLiteral(node) ? node.text : '<dynamic:' + node.getText(ast) + '>'
    const prefix = value(controller.arguments[0])
    for (const member of cls.members)
      for (const call of calls(member)) {
        const method = call.expression.getText(ast)
        if (!['Get', 'Post', 'Put', 'Patch', 'Delete', 'All', 'Head', 'Options'].includes(method))
          continue
        endpoints.push({
          method: method.toUpperCase(),
          path: '/' + [prefix, value(call.arguments[0])].filter(Boolean).join('/'),
          handler: member.name?.getText(ast),
          source: file,
          line: ast.getLineAndCharacterOfPosition(member.getStart(ast)).line + 1,
          decorators: [...decorators(cls), ...decorators(member)].map((d) =>
            d.expression.getText(ast),
          ),
          status: '待验证',
        })
      }
  }
}
const output = {
  ...sourceIdentity(),
  generatedAt: new Date().toISOString(),
  notes: [
    '源码清单，不等于运行时路由/权限/业务验收',
    '业务接口默认带 /api/v1 前缀，health 例外；动态表达式保留待核实',
    '异常、空数据、加载、无权限、离线均须逐项验证',
  ],
  pages,
  endpoints,
}
fs.mkdirSync(path.join(root, 'docs/全仓库优化'), { recursive: true })
fs.writeFileSync(
  path.join(root, 'docs/全仓库优化/inventory.json'),
  JSON.stringify(output, null, 2) + '\n',
)
console.log(JSON.stringify({ pages: pages.length, endpoints: endpoints.length }))
