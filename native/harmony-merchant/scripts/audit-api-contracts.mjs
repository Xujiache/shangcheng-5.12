import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const contracts = [
  [
    'entry/src/main/ets/features/auth/AuthRepository.ets',
    [
      ['post', '/auth/merchant-password-login'],
      ['post', '/auth/merchant-sms-login'],
      ['post', '/auth/sms-code'],
      ['post', '/auth/phone-login'],
      ['post', '/u/merchant-apply'],
      ['post', '/auth/change-password'],
      ['get', '/auth/user-info'],
      ['post', '/auth/change-phone'],
      ['post', '/auth/logout'],
    ],
  ],
  ['entry/src/main/ets/core/network/ApiClient.ets', [['request', '/auth/refresh']]],
  [
    'entry/src/main/ets/features/shell/WorkbenchRepository.ets',
    [
      ['get', '/m/dashboard'],
      ['get', '/m/feature-flags'],
    ],
  ],
  [
    'entry/src/main/ets/features/stats/StatsRepository.ets',
    [
      ['get', '/m/stats'],
      ['get', '/m/stats/overview'],
    ],
  ],
  [
    'entry/src/main/ets/features/product/ProductRepository.ets',
    [
      ['get', '/m/products'],
      ['post', '/m/products'],
      ['put', '/m/products/${id}'],
      ['post', '/m/products/batch-online'],
      ['post', '/m/products/batch-offline'],
      ['post', '/m/products/batch-delete'],
      ['get', '/m/categories'],
      ['get', '/u/categories'],
      ['post', '/m/categories'],
      ['put', '/m/categories/${id}'],
      ['delete', '/m/categories/${id}'],
      ['post', '/m/categories/sort'],
    ],
  ],
  [
    'entry/src/main/ets/features/order/OrderRepository.ets',
    [
      ['get', '/m/orders'],
      ['get', '/m/orders/${id}'],
      ['post', '/m/orders/${id}/ship'],
      ['post', '/m/orders/parse-address'],
      ['post', '/m/orders/${id}/share'],
      ['get', '/m/orders/${id}/share/current'],
      ['post', '/m/orders/${id}/share/revoke'],
      ['get', '/m/refunds'],
      ['get', '/m/refunds/${id}'],
      ['post', '/m/refunds/${id}/agree'],
      ['post', '/m/refunds/${id}/reject'],
    ],
  ],
  [
    'entry/src/main/ets/features/business/BusinessRepository.ets',
    [
      ['get', '/m/customers'],
      ['post', '/m/customers/${id}/price-tier'],
      ['post', '/m/customers/${id}/authorize'],
      ['patch', '/m/customers/${id}/blacklist'],
      ['get', '/m/commission/rules'],
      ['post', '/m/commission/rules'],
      ['get', '/m/stores'],
      ['get', '/m/stores/${id}/auth'],
      ['post', '/m/stores/${id}/auth'],
      ['delete', '/m/stores/${id}'],
      ['get', '/m/staffs'],
      ['post', '/m/staffs'],
      ['put', '/m/staffs/${id}'],
      ['get', '/m/shop/decorate'],
      ['post', '/m/shop/decorate'],
      ['get', '/m/marketing/overview'],
      ['get', '/m/marketing/activities'],
      ['get', '/m/marketing/coupons'],
      ['post', '/m/marketing/coupons'],
      ['put', '/m/marketing/coupons/${id}'],
      ['delete', '/m/marketing/coupons/${id}'],
      ['post', '/m/marketing/coupons/${id}/toggle'],
      ['get', '/m/chat/sessions'],
      ['get', '/m/chat/sessions/${id}'],
      ['get', '/m/chat/sessions/${id}/messages'],
      ['get', '/m/chat/quick-replies'],
      ['post', '/m/chat/sessions/${id}/messages'],
      ['post', '/m/chat/sessions/${id}/read'],
      ['get', '/m/plaza/products'],
      ['get', '/m/plaza/factories'],
      ['get', '/m/plaza/factories/${id}'],
      ['post', '/m/plaza/factories/${id}/follow'],
      ['post', '/m/plaza/factories/${id}/rate'],
      ['get', '/m/plaza/visibility'],
      ['put', '/m/plaza/visibility'],
      ['post', '/m/plaza/agency'],
      ['get', '/m/plaza/applications'],
      ['patch', '/m/plaza/applications/${id}'],
      ['delete', '/m/plaza/applications/${id}'],
      ['get', '/m/profile'],
      ['patch', '/m/profile'],
      ['get', '/m/shop/price-rule'],
      ['put', '/m/shop/price-rule'],
      ['get', '/m/membership/plans'],
      ['get', '/m/membership'],
      ['get', '/m/membership/quota'],
      ['get', '/m/membership/payments'],
      ['get', '/m/membership/notices'],
      ['post', '/m/membership/iap/prepare'],
      ['post', '/m/membership/iap/verify'],
      ['post', '/m/membership/iap/restore'],
    ],
  ],
  ['entry/src/main/ets/features/legal/LegalRepository.ets', [['get', '/u/agreements']]],
  [
    'entry/src/main/ets/features/legal/PublicSettingsRepository.ets',
    [['get', '/u/system/settings']],
  ],
  [
    'entry/src/main/ets/features/update/UpdateRepository.ets',
    [['get', '/m/app/latest?platform=merchant-harmony']],
  ],
  [
    'entry/src/main/ets/core/push/HarmonyPushClient.ets',
    [
      ['put', '/m/push/devices/current'],
      ['delete', '/m/push/devices/current'],
      ['get', '/m/push/preferences'],
      ['put', '/m/push/preferences'],
    ],
  ],
]

function hasMethodAndPath(source, method, route) {
  let offset = 0
  while (offset < source.length) {
    const index = source.indexOf(route, offset)
    if (index < 0) return false
    const before = source.slice(Math.max(0, index - 320), index)
    if (before.includes(`ApiClient.${method}`)) return true
    offset = index + route.length
  }
  return false
}

export function auditNativeContracts() {
  const errors = []
  let checked = 0
  for (const [relative, entries] of contracts) {
    const absolute = path.join(root, relative)
    if (!fs.existsSync(absolute)) {
      errors.push(`missing API owner ${relative}`)
      continue
    }
    const source = fs.readFileSync(absolute, 'utf8')
    for (const [method, route] of entries) {
      checked += 1
      if (!hasMethodAndPath(source, method, route)) {
        errors.push(`${relative} does not implement ${method.toUpperCase()} ${route}`)
      }
    }
  }

  const upload = fs.readFileSync(
    path.join(root, 'entry/src/main/ets/core/file/FileUploadService.ets'),
    'utf8',
  )
  if (!upload.includes('/files/upload') || !upload.includes('http.RequestMethod.POST')) {
    errors.push('FileUploadService does not implement native multipart POST /files/upload')
  }
  checked += 1

  const appConfig = fs.readFileSync(
    path.join(root, 'entry/src/main/ets/core/config/AppConfig.ets'),
    'utf8',
  )
  if (!appConfig.includes("HARMONY_WS_URL: string = 'wss://ewsn.top/ws/harmony/merchant'")) {
    errors.push('Harmony JSON WebSocket endpoint is missing or not secure')
  }
  checked += 1

  if (errors.length > 0) {
    throw new Error(errors.join('\n'))
  }
  console.log(`Native API contract audit passed: ${checked} HTTP/WebSocket operations verified.`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    auditNativeContracts()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
