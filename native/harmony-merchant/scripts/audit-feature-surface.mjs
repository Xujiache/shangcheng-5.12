import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const required = [
  ['启动恢复', 'entry/src/main/ets/pages/Index.ets'],
  ['商家登录', 'entry/src/main/ets/features/auth/LoginPage.ets'],
  ['商家入驻', 'entry/src/main/ets/features/auth/MerchantApplyPage.ets'],
  ['设置密码', 'entry/src/main/ets/features/auth/SetPasswordPage.ets'],
  ['工作台', 'entry/src/main/ets/features/shell/WorkbenchPage.ets'],
  ['商品列表', 'entry/src/main/ets/features/product/ProductListPage.ets'],
  ['订单列表', 'entry/src/main/ets/features/order/OrderListPage.ets'],
  ['经营数据', 'entry/src/main/ets/features/stats/StatsPage.ets'],
  ['我的', 'entry/src/main/ets/features/profile/MePage.ets'],
  ['商品编辑', 'entry/src/main/ets/features/product/ProductEditPage.ets'],
  ['分类管理', 'entry/src/main/ets/features/product/CategoryPage.ets'],
  ['代理商品', 'entry/src/main/ets/features/plaza/AgencyPage.ets'],
  ['订单详情', 'entry/src/main/ets/features/order/OrderDetailPage.ets'],
  ['售后处理', 'entry/src/main/ets/features/order/AfterSalePage.ets'],
  ['客户管理', 'entry/src/main/ets/features/business/CustomerPage.ets'],
  ['佣金设置', 'entry/src/main/ets/features/business/CommissionPage.ets'],
  ['门店管理', 'entry/src/main/ets/features/business/StorePage.ets'],
  ['门店授权', 'entry/src/main/ets/features/business/StoreAuthPage.ets'],
  ['员工管理', 'entry/src/main/ets/features/business/StaffPage.ets'],
  ['店铺装修', 'entry/src/main/ets/features/business/DecoratePage.ets'],
  ['营销中心', 'entry/src/main/ets/features/business/MarketingPage.ets'],
  ['客服会话', 'entry/src/main/ets/features/chat/ChatSessionsPage.ets'],
  ['客服详情', 'entry/src/main/ets/features/chat/ChatDetailPage.ets'],
  ['更新中心', 'entry/src/main/ets/features/update/UpdatePage.ets'],
  ['选品广场', 'entry/src/main/ets/features/plaza/PlazaPage.ets'],
  ['厂家详情', 'entry/src/main/ets/features/plaza/FactoryPage.ets'],
  ['会员中心', 'entry/src/main/ets/features/member/MembershipPage.ets'],
  ['个人资料', 'entry/src/main/ets/features/profile/ProfilePage.ets'],
  ['系统设置', 'entry/src/main/ets/features/profile/SettingsPage.ets'],
  ['分享应用', 'entry/src/main/ets/features/profile/SharePage.ets'],
  ['价格规则', 'entry/src/main/ets/features/business/PriceRulePage.ets'],
]

const contracts = [
  ['entry/src/main/ets/features/auth/AuthRepository.ets', ['/auth/merchant-password-login', '/auth/merchant-sms-login', '/u/merchant-apply', '/auth/logout']],
  ['entry/src/main/ets/core/network/ApiClient.ets', ['/auth/refresh']],
  ['entry/src/main/ets/features/shell/WorkbenchRepository.ets', ['/m/dashboard']],
  ['entry/src/main/ets/features/product/ProductRepository.ets', ['/m/products', '/m/categories', '/u/categories', 'batch-online', 'batch-offline', 'batch-delete']],
  ['entry/src/main/ets/features/order/OrderRepository.ets', ['/m/orders', '/m/refunds', 'parse-address', '/share', '/ship']],
  ['entry/src/main/ets/features/stats/StatsRepository.ets', ['/m/stats']],
  ['entry/src/main/ets/features/business/BusinessRepository.ets', ['/m/customers', '/m/commission/rules', '/m/stores', '/m/staffs', '/m/shop/decorate', '/m/marketing/', '/m/chat/', '/m/plaza/', '/m/membership/', '/m/profile', '/m/shop/price-rule']],
  ['entry/src/main/ets/features/update/UpdateRepository.ets', ['/m/app/latest']],
  ['entry/src/main/ets/features/legal/LegalRepository.ets', ['/u/agreements?platform=merchant-harmony']],
  ['entry/src/main/ets/features/legal/PublicSettingsRepository.ets', ['/u/system/settings']],
  ['entry/src/main/ets/features/update/UpdatePolicy.ets', ['packageSize(', 'storeUrl(', 'hasNewVersion(']],
  ['entry/src/main/ets/features/update/UpdatePage.ets', ['latestSize', 'UpdatePolicy.packageSize(this.latestSize)', 'publishedAt']],
  ['entry/src/main/ets/pages/Index.ets', ['UpdatePolicy.packageSize(release.size)', 'release.publishedAt.slice(0, 10)']],
  ['entry/src/main/ets/core/file/FileUploadService.ets', ['/files/upload']],
  ['entry/src/main/ets/core/realtime/HarmonyRealtime.ets', ['HARMONY_WS_URL', 'if (!this.stopped) this.connect()', 'this.socket !== socket', 'handleDisconnect(source?']],
  ['entry/src/main/ets/features/product/ProductListPage.ets', ['processingBatch', 'requestEpoch', 'await this.reload()']],
  ['entry/src/main/ets/features/order/OrderListPage.ets', ['requestEpoch', 'epoch !== this.requestEpoch']],
  ['entry/src/main/ets/features/stats/StatsPage.ets', ['loadEpoch', 'selectDate', "this.period = 'today'"]],
  ['entry/src/main/ets/features/member/MembershipPage.ets', ['failedSections', 'this.purchasing || this.restoring']],
  ['entry/src/main/ets/features/chat/ChatDetailPage.ets', ['criticalFailure', 'uploading', "payload.message.sender !== 'merchant'"]],
]

const nativePlatformContracts = [
  ['entry/src/main/ets/core/theme/AdaptiveMaterialSurface.ets', ['ImmersiveMaterial', 'systemMaterial', 'sdkApiVersion >= 26', 'backgroundBlurStyle']],
  ['entry/src/main/ets/pages/Index.ets', ['AdaptiveMaterialSurface', 'CommerceEventPolicy', 'startVibration', 'commerceEpoch', 'refreshRealtimeAuthentication', 'onAuthenticated', 'startAuthenticatedServices', 'sessionRecoveryFailed', 'retrySessionRecovery']],
  ['entry/src/main/ets/features/shell/MainShell.ets', ['PrimaryNavigationBar', '.height(PrimaryNavigationMetrics.HEIGHT)', 'loadedTabs', 'activationEpochs', 'commerceEpoch', 'Hidden primary pages stay frozen', 'windowWidth >= 720']],
  ['entry/src/main/ets/features/shell/PrimaryNavigationBar.ets', ["@StorageLink('darkMode')", 'DesignTokens.elevatedSurface(this.darkMode)', 'DesignTokens.border(this.darkMode)', 'primaryNavigationIcon', 'Image(primaryNavigationIcon(index))']],
  ['entry/src/main/ets/entryability/EntryAbility.ets', ["windowSizeChange", "'windowHeight'", 'updateSafeArea()']],
  ['entry/src/main/ets/core/realtime/CommerceEventPolicy.ets', ["order.new", "order.update", "refund.new", 'chat.message', 'auth.failed']],
  ['entry/src/main/ets/core/network/ApiClient.ets', ['RefreshSingleFlight', 'RefreshFailurePolicy.clearsSession', 'response.responseCode === 401', '服务端返回了无效响应']],
  ['entry/src/main/ets/core/network/RefreshPolicy.ets', ['class RefreshSingleFlight', 'class RefreshFailurePolicy', 'this.task = undefined']],
  ['entry/src/main/ets/core/realtime/HarmonyRealtime.ets', ['RealtimePolicy.acceptsEnvelope', 'RealtimePolicy.reconnectDelay', 'this.reconnectAttempt = 0']],
  ['entry/src/main/ets/core/push/PushRoutePolicy.ets', ['order-detail', 'after-sale-detail', 'chat-detail', '!id']],
  ['entry/src/main/ets/core/push/PushRouteService.ets', ['PushRoutePolicy.fromRaw']],
  ['entry/src/main/ets/core/iap/IapProductPolicy.ets', ['subscription', 'consumable', 'Unsupported Huawei IAP product type']],
  ['entry/src/main/ets/core/iap/HuaweiIapService.ets', ['IapProductPolicy.normalize']],
  ['entry/src/main/ets/features/product/ProductSkuMatrix.ets', ['combinationKey', 'regenerate(', 'normalize(', 'active: sku.active !== false']],
  ['entry/src/main/ets/features/product/ProductEditPage.ets', ['ProductSkuMatrix.regenerate', 'ProductSkuMatrix.normalize', 'if (this.saving) return;', 'if (this.uploading || this.saving) return;', 'if (this.skuUploading || this.saving) return;']],
  ['entry/src/main/ets/features/order/AfterSalePolicy.ets', ['approvedAmount(', 'amount > appliedAmount', 'rejectReason(']],
  ['entry/src/main/ets/features/order/AfterSalePage.ets', ['AfterSalePolicy.approvedAmount', 'AfterSalePolicy.rejectReason']],
  ['entry/src/main/ets/features/order/AfterSaleDetailPage.ets', ['AfterSalePolicy.approvedAmount', 'AfterSalePolicy.rejectReason']],
  ['entry/src/main/ets/core/file/UploadPolicy.ets', ['SUPPORTED_BIZ_TYPES', 'selectionLimit(', 'shouldRefresh(', 'isSuccessful(']],
  ['entry/src/main/ets/core/file/FileUploadService.ets', ['UploadPolicy.normalizeBizType', 'UploadPolicy.selectionLimit', 'UploadPolicy.shouldRefresh', 'UploadPolicy.isSuccessful']],
  ['entry/src/main/ets/features/profile/LocationPolicy.ets', ['isValidCoordinate(', 'acceptsEpoch(', 'joinRegion(', 'coordinateLabel(']],
  ['entry/src/main/ets/features/profile/LocationPickerPage.ets', ['LocationPolicy.isValidCoordinate', 'LocationPolicy.acceptsEpoch', 'LocationPolicy.selectedAddress', "'pickedLocationSet', true"]],
  ['entry/src/main/ets/features/profile/ProfilePage.ets', ['LocationPolicy.isValidCoordinate', 'hasLocation', "'pickedLocationSet'", 'this.hasLocation ? this.latitude : undefined', 'this.uploading || this.saving', '头像仍在上传']],
  ['entry/src/ohosTest/ets/test/CoreLogic.test.ets', ['coalesces concurrent refresh work', 'killed-process sessions', 'missing Asset Store record', 'manual checks always remain available', 'whitelisted Push Kit deep links', 'SKU cartesian products', 'server refund amount', 'upload business types', 'invalid map coordinates']],
  ['entry/src/main/ets/entryability/EntryAbility.ets', ['TYPE_SYSTEM_GESTURE', 'TYPE_NAVIGATION_INDICATOR']],
  ['entry/src/main/ets/core/security/SecureStore.ets', ['@kit.AssetStoreKit']],
  ['entry/src/main/ets/core/storage/SessionStore.ets', ['USER_SNAPSHOT_ALIAS', 'updateUser', 'JSON.stringify(session.user)', 'saveTransient', 'discardTransient', 'Persist the refresh token first']],
  ['entry/src/main/ets/core/storage/OfflineCacheStore.ets', ['relationalStore', 'SecurityLevel.S2', 'encrypt: true', 'cache_entries']],
  ['entry/src/main/ets/core/security/SecureStore.ets', ['asset.update(query, update)', 'asset.add(attributes)', 'Retrying update makes the write idempotent']],
  ['entry/src/main/ets/features/auth/AuthRepository.ets', ['saveTransient(result)', 'SessionRecoveryPolicy.decide', 'SessionRecoveryDecision.DISCARD_APPLICANT', 'discardApplicationSession()', 'session.discardTransient()', 'payload, false']],
  ['entry/src/main/ets/features/auth/MerchantSessionPolicy.ets', ["role === 'factory'", "role === 'store'", "role === 'merchant'", "role === 'super-admin'", "application.status === 'active'"]],
  ['entry/src/main/ets/features/auth/LoginPage.ets', ['MerchantSessionPolicy.canEnterWorkbench(session)']],
  ['entry/src/main/ets/features/auth/MerchantApplyPage.ets', ['discardTransient()', 'discardApplicationSession()', 'this.submitting', 'this.sendingCode || this.countdown > 0']],
  ['entry/src/main/ets/core/push/PushPreferenceStore.ets', ['jingwei_push_alert_preferences', 'orders', 'refunds', 'chat']],
  ['entry/src/main/ets/core/file/FileUploadService.ets', ['PhotoViewPicker', 'cameraPicker.pick', 'ohos.permission.CAMERA', 'captureAndUploadImage']],
  ['entry/src/main/ets/features/profile/LocationPickerPage.ets', ['MapComponent', 'site.searchByText', 'getCurrentLocation', 'getAddressesFromLocation', 'scheduleReverseGeocode', 'searchEpoch', 'resolvingAddress']],
  ['entry/src/main/ets/features/profile/SharePage.ets', ['ShareController', 'getSystemPasteboard', 'ImageSaveService']],
]

const errors = []
for (const [name, relative] of required) {
  const absolute = path.join(root, relative)
  if (!fs.existsSync(absolute)) {
    errors.push(`${name}: 缺少 ${relative}`)
    continue
  }
  const source = fs.readFileSync(absolute, 'utf8')
  if (source.trim().length < 300 || !/(build\(\)|@Builder|NavDestination|Navigation)/.test(source)) {
    errors.push(`${name}: ${relative} 不是可构建的原生页面实现`)
  }
}

if (required.length !== 31) errors.push(`功能矩阵数量异常：${required.length}/31`)
for (const [relative, fragments] of contracts) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8')
  for (const fragment of fragments) {
    if (!source.includes(fragment)) errors.push(`${relative}: 缺少接口契约 ${fragment}`)
  }
}
for (const [relative, fragments] of nativePlatformContracts) {
  const absolute = path.join(root, relative)
  if (!fs.existsSync(absolute)) {
    errors.push(`缺少原生平台能力：${relative}`)
    continue
  }
  const source = fs.readFileSync(absolute, 'utf8')
  for (const fragment of fragments) {
    if (!source.includes(fragment)) errors.push(`${relative}: 缺少原生能力契约 ${fragment}`)
  }
}
if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('Native feature-surface audit passed: 31/31 source surfaces present.')
