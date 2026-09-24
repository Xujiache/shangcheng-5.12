import fs from 'node:fs'
import assert from 'node:assert/strict'

const root = new URL('../', import.meta.url)
const read = (p) => fs.readFileSync(new URL(p, root), 'utf8')
const shell = 'entry/src/main/ets/features/shell/'
const features = 'entry/src/main/ets/features/'
const metrics = read(shell + 'PrimaryNavigationMetrics.ets')
assert.match(metrics, /HEIGHT: number = 76/)
assert.match(metrics, /Math\.max\(0, safeBottom\)/)
for (const page of ['shell/WorkbenchPage', 'product/ProductListPage', 'order/OrderListPage', 'stats/StatsPage', 'profile/MePage']) {
  const source = read(features + page + '.ets')
  assert.ok(source.includes('PrimaryNavigationMetrics.contentInset(this.safeBottom)'), `${page}: missing shared bottom inset`)
  assert.doesNotMatch(source, /bottom:\s*(?:112|118)\b/, `${page}: fixed bottom inset`)
}
const navigation = read(shell + 'PrimaryNavigationBar.ets')
assert.match(navigation, /DesignTokens\.elevatedSurface\(this.darkMode\)/)
assert.match(navigation, /DesignTokens\.border\(this.darkMode\)/)
assert.match(navigation, /\? 31 : 28/)
const product = read(features + 'order/OrderProductSummary.ets')
assert.match(product, /ResilientRemoteImage/)
assert.match(product, /maxLines\(2\)/)
assert.match(product, /textOverflow/)
assert.match(product, /wordBreak\(WordBreak.BREAK_ALL\)/)
assert.match(product, /layoutWeight\(1\)/)
for (const page of ['OrderListPage', 'OrderDetailPage', 'AfterSalePage', 'AfterSaleDetailPage']) {
  const source = read(features + `order/${page}.ets`)
  assert.match(source, /OrderProductSummary/, `${page}: shared product summary missing`)
  assert.doesNotMatch(source, /Image\((?:item|orderItem)\.productImage\)/)
  if (page.endsWith('DetailPage')) assert.match(source, /maxWidth: 960/)
}
for (const page of ['OrderListPage', 'AfterSalePage']) {
  const source = read(features + `order/${page}.ets`)
  assert.match(source, /lanes\(this.windowWidth >= 720 \? 2 : 1, 12\)/)
  assert.match(source, /width: \{ bottom: 2 \}/)
  assert.match(source, /Refresh\(\{ refreshing: \$\$this.refreshing/)
  assert.doesNotMatch(source, /this\.(?:orders|refunds) = \[\]; await this.load/)
}
for (const page of ['OrderDetailPage', 'AfterSalePage', 'AfterSaleDetailPage']) {
  const source = read(features + `order/${page}.ets`)
  assert.match(source, /backgroundColor\('#99000000'\)/, `${page}: modal must block underlying content`)
  assert.match(source, /maxHeight: '(?:80|85)%'/, `${page}: sheet must fit the viewport`)
  assert.match(source, /onBackPressed/, `${page}: back should close the sheet first`)
}
console.log('Order UI audit passed: insets, responsive cards, bounded text, image retries, filters and modal ownership.')
