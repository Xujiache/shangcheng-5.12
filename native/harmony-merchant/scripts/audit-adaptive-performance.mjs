import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8')
}

function requireFragments(relative, fragments) {
  const source = read(relative)
  const missing = fragments.filter((fragment) => !source.includes(fragment))
  if (missing.length > 0) {
    throw new Error(`${relative} is missing adaptive/performance contracts: ${missing.join(', ')}`)
  }
}

const fontConfiguration = JSON.parse(read('AppScope/resources/base/profile/configuration.json'))
if (fontConfiguration?.configuration?.fontSizeScale !== 'followSystem' ||
  fontConfiguration?.configuration?.fontSizeMaxScale !== '2') {
  throw new Error('AppScope font scaling must follow the system and remain bounded at 2x')
}

requireFragments('entry/src/main/ets/entryability/EntryAbility.ets', [
  "'windowSizeChange'",
  "'windowWidth'",
  "'windowHeight'",
  "'fontSizeScale'",
  'configuration.fontSizeScale',
  "off('windowSizeChange'"
])

requireFragments('entry/src/main/ets/features/shell/MainShell.ets', [
  'windowWidth >= 720',
  'expandedMasterPane',
  'expandedDetailPane',
  'railItem(0',
  'PrimaryNavigationBar',
  'Visibility.None',
  'Hidden primary pages stay frozen',
  'epochs[this.activeTab]'
])

requireFragments('entry/src/main/ets/features/shell/WorkbenchPage.ets', [
  'OfflineCacheStore.put',
  'OfflineCacheStore.get<DashboardWorkbench>',
  'usingOfflineCache',
  'Offline cache'
])

requireFragments('entry/src/main/ets/features/profile/LocationPickerPage.ets', [
  "controller.on('cameraIdle', this.cameraIdleListener)",
  "controller?.off('cameraIdle', this.cameraIdleListener)"
])

requireFragments('entry/src/main/ets/features/plaza/FactoryPage.ets', [
  'routeTimer',
  'clearTimeout(this.routeTimer)',
  'ratingSubmitting',
  'following'
])

for (const [relative, fragments] of [
  ['entry/src/main/ets/features/auth/LoginPage.ets', ['countdownTimer', 'clearInterval(this.countdownTimer)']],
  ['entry/src/main/ets/features/auth/MerchantApplyPage.ets', ['countdownTimer', 'clearInterval(this.countdownTimer)']],
  ['entry/src/main/ets/features/auth/ChangePhonePage.ets', ['clearInterval(this.oldTimer)', 'clearInterval(this.newTimer)']],
  ['entry/src/main/ets/features/chat/ChatDetailPage.ets', ['this.unsubscribe?.()', 'clearTimeout(this.typingTimer)']],
  ['entry/src/main/ets/features/chat/ChatSessionsPage.ets', ['this.unsubscribe?.()']],
  ['entry/src/main/ets/features/business/CommissionPage.ets', ['clearTimeout(this.saveTimer)']],
  ['entry/src/main/ets/features/business/PriceRulePage.ets', ['clearTimeout(this.saveTimer)']],
  ['entry/src/main/ets/pages/Index.ets', ['clearInterval(this.updateTimer)', 'this.unsubscribeRealtime?.()']]
]) {
  requireFragments(relative, fragments)
}

for (const relative of [
  'entry/src/main/ets/features/shell/WorkbenchPage.ets',
  'entry/src/main/ets/features/product/ProductListPage.ets',
  'entry/src/main/ets/features/order/OrderListPage.ets',
  'entry/src/main/ets/features/stats/StatsPage.ets',
  'entry/src/main/ets/features/profile/MePage.ets'
]) {
  requireFragments(relative, ["@StorageProp('windowWidth')", 'windowWidth >= 720'])
}

for (const relative of [
  'entry/src/main/ets/features/product/ProductListPage.ets',
  'entry/src/main/ets/features/order/OrderListPage.ets',
  'entry/src/main/ets/features/order/AfterSalePage.ets',
  'entry/src/main/ets/features/business/CustomerPage.ets',
  'entry/src/main/ets/features/business/StorePage.ets',
  'entry/src/main/ets/features/plaza/PlazaPage.ets'
]) {
  requireFragments(relative, ['List(', 'onReachEnd'])
}

const etsRoot = path.join(root, 'entry/src/main/ets')
function etsFiles(directory) {
  const files = []
  for (const name of fs.readdirSync(directory)) {
    const full = path.join(directory, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) files.push(...etsFiles(full))
    else if (name.endsWith('.ets')) files.push(full)
  }
  return files
}

for (const file of etsFiles(etsRoot)) {
  const source = fs.readFileSync(file, 'utf8')
  const materialInstances = source.match(/AdaptiveMaterialSurface\s*\(/g)?.length || 0
  if (materialInstances > 2) {
    throw new Error(`${path.relative(root, file)} creates ${materialInstances} live material surfaces; maximum is 2`)
  }
  for (const highApiComponent of ['IBestLoading(', 'IBestCircleProgress(', 'IBestImageCropper(']) {
    if (source.includes(highApiComponent)) {
      throw new Error(`${path.relative(root, file)} uses ${highApiComponent.slice(0, -1)}, which is not safe on compatible API 21`)
    }
  }
}

console.log('Adaptive/performance audit passed: system font scaling, expanded master/detail, live resize, frozen hidden tabs, paged lists, API 21 fallbacks and material budget verified.')
