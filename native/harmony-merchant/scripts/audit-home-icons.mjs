import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')
const errors = []
const commerceAssets = Object.keys(JSON.parse(read('scripts/commerce-icon-sources.json')))
  .map((name) => `commerce_${name}_lite`)
if (commerceAssets.length !== 34) errors.push('the shared commerce set must contain exactly 34 semantic icons')

const shell = read('entry/src/main/ets/features/shell/MainShell.ets')
const navigation = read('entry/src/main/ets/features/shell/PrimaryNavigationBar.ets')
const navigationAssets = read('entry/src/main/ets/features/shell/PrimaryNavigationAssets.ets')
const workbench = read('entry/src/main/ets/features/shell/WorkbenchPage.ets')
const staffPage = read('entry/src/main/ets/features/business/StaffPage.ets')
const merchantIcon = read('entry/src/main/ets/core/theme/MerchantIcon.ets')
const mePage = read('entry/src/main/ets/features/profile/MePage.ets')

const toolAssets = [
  'commerce_orders_lite', 'commerce_products_lite', 'commerce_customers_lite', 'commerce_analytics_lite', 'commerce_service_lite',
  'commerce_marketing_lite', 'commerce_store_lite', 'commerce_staff_lite', 'commerce_agency_lite', 'commerce_pricing_lite'
]
const homeAssets = [
  'commerce_message_lite', 'commerce_shipment_lite', 'commerce_refund_lite',
  'commerce_unread_lite', 'commerce_rejected_lite', 'commerce_store_apply_lite'
]
const navigationAssetsList = [
  'commerce_home_lite', 'commerce_products_lite', 'commerce_orders_lite',
  'commerce_analytics_lite', 'commerce_profile_lite'
]
const personalCenterAssets = [
  'commerce_membership_lite', 'commerce_profile_lite', 'commerce_support_lite', 'commerce_settings_lite',
  'commerce_customers_lite', 'commerce_store_lite', 'commerce_staff_lite', 'commerce_commission_lite',
  'commerce_marketing_lite', 'commerce_service_lite', 'commerce_sourcing_lite', 'commerce_agency_lite',
  'commerce_decorate_lite', 'commerce_pricing_lite', 'commerce_share_lite', 'commerce_update_lite'
]

function paeth(left, up, upperLeft) {
  const prediction = left + up - upperLeft
  const leftDistance = Math.abs(prediction - left)
  const upDistance = Math.abs(prediction - up)
  const upperLeftDistance = Math.abs(prediction - upperLeft)
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left
  return upDistance <= upperLeftDistance ? up : upperLeft
}

function alphaRange(png, width, height) {
  const idat = []
  let offset = 8
  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.toString('ascii', offset + 4, offset + 8)
    if (type === 'IDAT') idat.push(png.subarray(offset + 8, offset + 8 + length))
    offset += length + 12
    if (type === 'IEND') break
  }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = width * 4
  let previous = Buffer.alloc(stride)
  let rawOffset = 0
  let min = 255
  let max = 0
  let legacyOrangePixels = 0
  let visiblePixels = 0
  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset++]
    const current = Buffer.allocUnsafe(stride)
    for (let x = 0; x < stride; x += 1) {
      const encoded = raw[rawOffset++]
      const left = x >= 4 ? current[x - 4] : 0
      const up = previous[x]
      const upperLeft = x >= 4 ? previous[x - 4] : 0
      if (filter === 0) current[x] = encoded
      else if (filter === 1) current[x] = (encoded + left) & 255
      else if (filter === 2) current[x] = (encoded + up) & 255
      else if (filter === 3) current[x] = (encoded + Math.floor((left + up) / 2)) & 255
      else if (filter === 4) current[x] = (encoded + paeth(left, up, upperLeft)) & 255
      else throw new Error(`unsupported PNG filter ${filter}`)
    }
    for (let x = 3; x < stride; x += 4) {
      min = Math.min(min, current[x])
      max = Math.max(max, current[x])
      const alpha = current[x]
      const red = current[x - 3]
      const green = current[x - 2]
      const blue = current[x - 1]
      if (alpha > 20) visiblePixels += 1
      if (alpha > 20 && red > green * 1.55 && green > blue * 1.45 && red > 170) {
        legacyOrangePixels += 1
      }
    }
    previous = current
  }
  return { min, max, legacyOrangePixels, visiblePixels }
}

function auditPng(asset, enforceBudget = false) {
  const file = path.join(root, `entry/src/main/resources/base/media/${asset}.png`)
  if (!fs.existsSync(file)) {
    errors.push(`missing image asset ${asset}.png`)
    return
  }
  const png = fs.readFileSync(file)
  if (png.toString('ascii', 1, 4) !== 'PNG') errors.push(`${asset}.png has an invalid PNG signature`)
  const width = png.readUInt32BE(16)
  const height = png.readUInt32BE(20)
  const colorType = png[25]
  if (width !== 256 || height !== 256) errors.push(`${asset}.png must be 256x256, got ${width}x${height}`)
  if (colorType !== 6) errors.push(`${asset}.png must be an RGBA PNG with a real alpha channel`)
  if (colorType === 6 && width === 256 && height === 256) {
    const alpha = alphaRange(png, width, height)
    if (alpha.min !== 0 || alpha.max !== 255) errors.push(`${asset}.png must contain both transparent and opaque pixels`)
    // Gold antialiasing/shading can contain isolated amber pixels; reject an
    // orange accent area, not a few edge pixels (at most 0.2% of the subject).
    if (alpha.legacyOrangePixels > alpha.visiblePixels * 0.002) {
      errors.push(`${asset}.png contains an orange accent area`)
    }
  }
  if (enforceBudget && png.length > 80 * 1024) errors.push(`${asset}.png exceeds the 80KB icon budget`)
}

for (const asset of toolAssets) {
  if (!workbench.includes(`app.media.${asset}`)) errors.push(`workbench tool mapping is missing ${asset}`)
  auditPng(asset, true)
}
for (const asset of commerceAssets) auditPng(asset, true)
const mediaDirectory = path.join(root, 'entry/src/main/resources/base/media')
for (const filename of fs.readdirSync(mediaDirectory)) {
  if (/^(?:tool_.*|(?:home|me|settings|nav)_.*_3d)\.png$/.test(filename)) {
    errors.push(`replaced complex 3D resource must be removed: ${filename}`)
  }
}
if (/\bactive\b/.test(navigationAssets)) errors.push('navigation must share one silhouette across selection states')
for (const asset of homeAssets) {
  if (!workbench.includes(`app.media.${asset}`)) errors.push(`workbench home mapping is missing ${asset}`)
  auditPng(asset, true)
}
for (const asset of navigationAssetsList) {
  if (!navigationAssets.includes(`app.media.${asset}`)) errors.push(`shared navigation mapping is missing ${asset}`)
  auditPng(asset, true)
}
for (const asset of personalCenterAssets) {
  if (!mePage.includes(`app.media.${asset}`)) errors.push(`personal center mapping is missing ${asset}`)
  auditPng(asset, true)
}
for (const signature of [
  'private primaryService(icon: Resource',
  'private businessTool(icon: Resource',
  'private supportRow(icon: Resource'
]) {
  if (!mePage.includes(signature)) errors.push(`personal center must render local 3D resources: ${signature}`)
}
if (/this\.(?:primaryService|businessTool|supportRow)\(\s*['"]/.test(mePage)) {
  errors.push('personal center function entries must not fall back to font-icon names')
}

if (shell.includes('IBestTabBar') || shell.includes('activeIcon:')) {
  errors.push('MainShell must not restore the string-fallback third-party tab bar')
}
if (!shell.includes("import { primaryNavigationIcon } from './PrimaryNavigationAssets'")) {
  errors.push('expanded navigation rail must use the shared 3D resource mapping')
}
if (!navigation.includes("import { primaryNavigationIcon } from './PrimaryNavigationAssets'")) {
  errors.push('mobile navigation bar must use the shared 3D resource mapping')
}
if (!shell.includes('Image(primaryNavigationIcon(index))')) {
  errors.push('expanded navigation rail must render the shared low-relief images')
}
if (!navigation.includes('Image(primaryNavigationIcon(index))')) {
  errors.push('mobile navigation bar must render the shared low-relief images')
}
for (const [name, source] of [['MainShell', shell], ['PrimaryNavigationBar', navigation], ['WorkbenchPage', workbench]]) {
  if (source.includes('MerchantIcon')) errors.push(`${name} must not use legacy font icons for home or primary navigation`)
}
for (const legacy of ['wap-home-o', 'goods-collect-o', 'orders-o', 'bar-chart-o', 'manager-o', 'tosend', 'refund-o', 'warning-o']) {
  if (shell.includes(`'${legacy}'`) || navigation.includes(`'${legacy}'`) || workbench.includes(`'${legacy}'`)) {
    errors.push(`home and primary navigation must not restore the legacy ${legacy} icon`)
  }
}
if (/toolLabel\(tool\.name\)\.slice\(0,\s*1\)/.test(workbench)) {
  errors.push('workbench tools must not use their first character as an icon')
}
if (/\bGrid\s*\(/.test(workbench)) errors.push('workbench tools must not use a scrollable Grid')
if (/['"]刷新['"]/.test(workbench)) errors.push('workbench must not expose a manual refresh button')
if (!workbench.includes('refreshInFlight')) errors.push('workbench refresh must use a single-flight gate')
if (!workbench.includes('ResilientRemoteImage')) errors.push('home plaza images must use resilient thumbnails')
if (!workbench.includes('setInterval') || !workbench.includes('60 * 1000')) {
  errors.push('workbench must silently refresh every 60 seconds')
}

for (const required of [
  'IBestSkeleton', 'Refresh({ refreshing:', 'DesignTokens.selectedSurface(this.darkMode)',
  'permissionLabel', 'IBestActionSheet.show', '.lanes(this.windowWidth >= 720 ? 2 : 1)',
  "this.compactAction('phone-o'", "this.compactAction('records-o'", "this.compactAction('more-o'"
]) {
  if (!staffPage.includes(required)) errors.push(`staff management redesign is missing ${required}`)
}
if (/item\.name\.slice\(0,\s*1\)/.test(staffPage)) {
  errors.push('staff management must not use a name character as its role or action icon')
}
for (const requiredIcon of ['add-o', 'phone-o', 'service-o', 'records-o', 'more-o', 'photograph', 'aim']) {
  if (!merchantIcon.includes(`'${requiredIcon}'`)) errors.push(`MerchantIcon whitelist is missing ${requiredIcon}`)
}
const ownedSources = [
  ...fs.readdirSync(path.join(root, 'entry/src/main/ets/features'), { recursive: true }),
  ...fs.readdirSync(path.join(root, 'entry/src/main/ets/pages'), { recursive: true })
]
for (const relative of ownedSources) {
  if (typeof relative !== 'string' || !relative.endsWith('.ets')) continue
  const featurePath = path.join(root, 'entry/src/main/ets/features', relative)
  const pagePath = path.join(root, 'entry/src/main/ets/pages', relative)
  const absolute = fs.existsSync(featurePath) ? featurePath : pagePath
  if (!fs.existsSync(absolute)) continue
  const source = fs.readFileSync(absolute, 'utf8')
  if (/Text\(['"](?:\+|◎|≡|⌖|●)['"]\)/.test(source)) {
    errors.push(`${path.relative(root, absolute)} still uses a character as an action icon`)
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`Merchant icon audit passed: ${commerceAssets.length} shared low-relief RGBA icons; no replaced complex assets.`)
