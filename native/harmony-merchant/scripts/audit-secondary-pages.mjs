import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const prefix = 'entry/src/main/ets/'
const routes = JSON.parse(read('entry/src/main/resources/base/profile/route_map.json')).routerMap
const groups = {
  commerce: 'ProductEdit CategoryManager FilteredProducts OrderDetail AfterSale AfterSaleDetail FilteredOrders'.split(' '),
  business: 'Customers Commission Stores StoreAuth Staffs Marketing Decorate PriceRule'.split(' '),
  communication: 'ChatSessions ChatDetail Plaza FactoryDetail AgencyProducts Membership'.split(' '),
  account: 'MerchantApply SetPassword ChangePhone Profile LocationPicker Settings AccountSecurity AppearanceSettings NotificationSettings AboutApp ShareApp Agreements UpdateCenter'.split(' '),
  analytics: ['StatsFull'],
}
const expected = Object.values(groups).flat().sort()
assert.equal(expected.length, 35)
assert.deepEqual(routes.map((r) => r.name).sort(), expected, 'Route additions/removals require a coverage decision')

// Explicitly follow embedded pages and editors, not only the route registration file.
const children = {
  FilteredProducts: ['features/product/ProductListPage.ets'],
  FilteredOrders: ['features/order/OrderListPage.ets'],
  ProductEdit: ['features/product/ProductEditPolicy.ets', 'features/product/ProductImageQueue.ets', 'features/product/ProductSkuMatrix.ets'],
  OrderDetail: ['features/order/OrderDetailPolicy.ets'],
  StatsFull: ['features/stats/StatsDatePanel.ets', 'features/stats/StatsCards.ets', 'features/stats/StatsTrendChart.ets'],
}
const specialized = new Set(['StatsFull', 'FilteredProducts', 'FilteredOrders'])
const inventory = []
for (const route of routes) {
  const file = `entry/${route.pageSourceFile}`
  const files = [...new Set([file, ...(children[route.name] || []).map((p) => prefix + p)])]
  const contents = files.map(read)
  const text = contents.join('\n')
  assert.ok(text.includes(route.buildFunction), `${route.name}: missing builder`)
  assert.ok(text.includes("@StorageLink('language')"), `${route.name}: locale must be reactive`)
  assert.ok(text.includes("@StorageLink('darkMode')"), `${route.name}: theme must be reactive`)
  assert.ok(text.includes('SecondaryHeader') || specialized.has(route.name), `${route.name}: missing compact navigation`)
  const overlays = []
  for (let i = 0; i < files.length; i++) {
    const lines = contents[i].split('\n')
    lines.forEach((line, index) => {
      if (/\.leaveGuard\.request|IBest(DialogUtil\.open|ActionSheet\.show|ImagePreview\.show)|\.bind(Sheet|Popup|ContentCover)\(|@State.*(?:editorVisible|showAgency|showFilters|showVisibility|\w*Visible|panel:|sheetMode:)/.test(line)) {
        overlays.push({ file: files[i], line: index + 1, declaration: line.trim(), device: '待验证' })
      }
    })
  }
  inventory.push({
    route: route.name,
    group: Object.entries(groups).find(([, names]) => names.includes(route.name))[0],
    sources: files.map((file, index) => ({ file, sha256: crypto.createHash('sha256').update(contents[index]).digest('hex') })),
    presentation: specialized.has(route.name) ? '保留专用/双入口布局，补齐二级返回与密度' : '紧凑标题、卡片/字段间距及语义图片图标',
    overlays, overlayAssessment: overlays.length ? '已登记源码入口；共用返回/草稿规则及专用弹层保留' : '无自定义弹层；系统/第三方界面保持原流程',
    implementation: '已修改', automated: '静态覆盖检查通过', device: '待验证',
  })
}

for (const name of ['Commission', 'PriceRule', 'StoreAuth', 'Decorate']) {
  const s = read(`${prefix}features/business/${name}Page.ets`)
  assert.ok(s.includes('SecondarySaveBar('), `${name}: missing fixed explicit save`)
  assert.ok(s.includes('this.verifying'), `${name}: missing uncertain-save recovery`)
  assert.ok(s.includes('this.pageScope.accepts(writeTicket)'), `${name}: missing account/session ownership`)
  assert.ok(s.includes('windowWidth >= 720 ? 2 : 1'), `${name}: missing wide layout`)
  const leave = s.match(/aboutToDisappear\(\): void \{([^}]*)\}/)?.[1] || ''
  assert.doesNotMatch(leave, /save\(|flushSave\(|scheduleSave\(/, `${name}: must not persist on leaving`)
}
for (const name of ['Commission', 'PriceRule']) {
  const s = read(`${prefix}features/business/${name}Page.ets`)
  assert.doesNotMatch(s, /setTimeout|PriceRuleStore\.write/, `${name}: legacy automatic writes must not return`)
}
const profile = read(`${prefix}features/profile/ProfilePage.ets`)
const location = read(`${prefix}features/profile/LocationPickerPage.ets`)
for (const token of ['locationRequestToken', 'pickedLocationToken', 'SessionStore.shared().user']) {
  assert.ok(profile.includes(token) && location.includes(token), `Location selection must bind ${token}`)
}
if (process.argv.includes('--write')) {
  const output = path.resolve(root, '../../docs/鸿蒙全二级页面重构-20260909/coverage.json')
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, JSON.stringify(inventory, null, 2) + '\n')
}
console.log(`Secondary coverage passed: ${inventory.length} routes, ${inventory.reduce((n, p) => n + p.overlays.length, 0)} overlay/state source anchors. Device acceptance is NOT inferred.`)
