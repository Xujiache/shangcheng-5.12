import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../miniprogram')
const app = JSON.parse(readFileSync(resolve(root, 'app.json'), 'utf8'))
const files = ['.ts', '.json', '.wxml', '.wxss']
const pageExists = (route) => files.every((ext) => existsSync(resolve(root, route + ext)))

assert.equal(app.pages.length, 36, 'all 36 historical routes must remain')
assert.equal(new Set(app.pages).size, 36)
for (const route of app.pages) assert.ok(pageExists(route), `missing historical page ${route}`)
for (const tab of app.tabBar.list)
  assert.ok(app.pages.includes(tab.pagePath), `tab moved ${tab.pagePath}`)

let moved = 0
for (const pkg of app.subPackages || []) {
  for (const route of pkg.pages) {
    const target = `${pkg.root}/${route}`
    const legacy = `pages/${route.replace(/^pages\//, '')}`
    assert.ok(pageExists(target), `missing subpackage page ${target}`)
    assert.ok(app.pages.includes(legacy), `missing legacy route ${legacy}`)
    const stub = readFileSync(resolve(root, legacy + '.ts'), 'utf8')
    assert.ok(
      stub.includes(`/${target}`) && stub.includes('encodeURIComponent(options[key])'),
      `legacy route does not forward query: ${legacy}`,
    )
    moved++
  }
}
assert.equal(moved, 12)
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
  `routes verified: ${app.pages.length} original, ${moved} subpackage targets, ${app.tabBar.list.length} tabs`,
)
