import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../miniprogram')
const app = JSON.parse(readFileSync(resolve(root, 'app.json'), 'utf8'))
const files = ['.ts', '.json', '.wxml', '.wxss']
const pageExists = (route) => files.every((ext) => existsSync(resolve(root, route + ext)))

assert.ok(app.pages.length > 0, 'main package must declare pages')
assert.equal(new Set(app.pages).size, app.pages.length, 'duplicate main route')
for (const route of app.pages) assert.ok(pageExists(route), `missing historical page ${route}`)
for (const tab of app.tabBar.list)
  assert.ok(app.pages.includes(tab.pagePath), `tab moved ${tab.pagePath}`)

let moved = 0
const legacyRoots = new Set(['subpackages/orders', 'subpackages/tools', 'subpackages/settings'])
for (const pkg of app.subPackages || []) {
  for (const route of pkg.pages) {
    const target = `${pkg.root}/${route}`
    assert.ok(pageExists(target), `missing subpackage page ${target}`)
    if (!legacyRoots.has(pkg.root)) continue
    const legacy = `pages/${route.replace(/^pages\//, '')}`
    assert.ok(app.pages.includes(legacy), `missing legacy route ${legacy}`)
    const stub = readFileSync(resolve(root, legacy + '.ts'), 'utf8')
    assert.ok(
      stub.includes(`/${target}`) && stub.includes('encodeURIComponent(options[key])'),
      `legacy route does not forward query: ${legacy}`,
    )
    moved++
  }
}
const registered = [...app.pages, ...(app.subPackages || []).flatMap(pkg => pkg.pages.map(route => `${pkg.root}/${route}`))]
const discovered = []
function collectPages(dir, prefix) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const route = `${prefix}/${entry.name}`
    if (entry.isDirectory()) collectPages(resolve(dir, entry.name), route)
    else if (entry.name.endsWith('.wxml')) discovered.push(route.slice(0, -5))
  }
}
collectPages(resolve(root, 'pages'), 'pages')
collectPages(resolve(root, 'subpackages'), 'subpackages')
assert.equal(new Set(registered).size, registered.length, 'duplicate registered route')
assert.deepEqual(registered.slice().sort(), discovered.slice().sort(), 'registered routes must equal page files')
function checkAssets(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      checkAssets(path)
      continue
    }
    if (!/\.(ts|wxml|wxss|json)$/.test(entry.name)) continue
    const source = readFileSync(path, 'utf8')
    for (const match of source.matchAll(
      /\/(?:assets|subpackages)\/[\w/-]+\.(?:png|jpg|jpeg|webp|gif)/g,
    )) {
      assert.ok(existsSync(resolve(root, '.' + match[0])), `missing asset ${match[0]} in ${path}`)
    }
  }
}
checkAssets(root)
console.log(
  `routes verified: ${registered.length} pages, ${moved} legacy shims, ${app.tabBar.list.length} tabs`,
)
