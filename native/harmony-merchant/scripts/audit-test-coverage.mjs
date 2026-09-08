#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const testPath = path.join(root, 'entry/src/ohosTest/ets/test/CoreLogic.test.ets')
const testSource = fs.readFileSync(testPath, 'utf8')
const testCases = [...testSource.matchAll(/\bit\(\s*'([^']+)'/g)].map((match) => match[1])

const requiredTestContracts = [
  ['query serialization', 'withQuery('],
  ['authentication validation', 'InputValidators.isMainlandPhone'],
  ['public support contact validation', 'PublicSupportPolicy.dialablePhone'],
  ['killed-process session recovery', 'SessionRecoveryPolicy.decide'],
  ['concurrent token refresh', 'RefreshSingleFlight'],
  ['offline refresh failure', 'RefreshFailurePolicy.clearsSession'],
  ['AppGallery update and forced-update precedence', 'UpdatePolicy.shouldPrompt'],
  ['native Asset Store persistence', 'SecureStore.write'],
  ['native Preferences persistence', 'PushPreferenceStore.write'],
  ['encrypted RDB persistence', 'OfflineCacheStore.put'],
  ['realtime reconnect', 'RealtimePolicy.reconnectDelay'],
  ['realtime and Push event de-duplication', 'RecentEventIds'],
  ['Push deep links', 'PushRoutePolicy.fromRaw'],
  ['Huawei IAP verification and completion', 'IapTransactionPolicy.canFinish'],
  ['SKU cartesian generation', 'ProductSkuMatrix.regenerate'],
  ['after-sales partial refund validation', 'AfterSalePolicy.approvedAmount'],
  ['upload retry policy', 'UploadPolicy.shouldRefresh'],
  ['location stale-result rejection', 'LocationPolicy.acceptsEpoch'],
  ['chat HTTP/WebSocket reconciliation', 'ChatMessagePolicy.reconcileRealtime'],
  ['chat HTTP confirmation', 'ChatMessagePolicy.confirmHttp'],
  ['chat cursor pagination', 'ChatMessagePolicy.prependEarlier'],
]

const productionContracts = [
  ['entry/src/main/ets/features/chat/ChatDetailPage.ets', [
    'ChatMessagePolicy.reconcileRealtime',
    'ChatMessagePolicy.confirmHttp',
    'ChatMessagePolicy.markFailed',
    'ChatMessagePolicy.prependEarlier',
  ]],
  ['entry/src/main/ets/features/member/MembershipPage.ets', [
    'IapTransactionPolicy.canFinish',
  ]],
  ['entry/src/main/ets/core/realtime/HarmonyRealtime.ets', [
    'receivedEventIds.accept',
  ]],
  ['entry/src/main/ets/core/push/PushRouteService.ets', [
    'recentEvents.accept',
  ]],
  ['entry/src/main/ets/features/update/UpdatePolicy.ets', [
    'release?.force === true',
  ]],
  ['entry/src/main/ets/core/storage/SessionStore.ets', [
    'SecureStore.write',
    'SecureStore.read',
    'SecureStore.remove',
  ]],
  ['entry/src/main/ets/core/push/PushPreferenceStore.ets', [
    'preferences.getPreferences',
    'store.flush',
  ]],
  ['entry/src/main/ets/core/storage/OfflineCacheStore.ets', [
    'encrypt: true',
    'static async remove',
  ]],
  ['entry/src/main/ets/features/shell/WorkbenchPage.ets', [
    'OfflineCacheStore.put',
    'OfflineCacheStore.get',
  ]],
  ['entry/src/main/ets/features/profile/MePage.ets', [
    'PublicSupportPolicy.dialablePhone',
  ]],
  ['entry/src/main/ets/features/profile/SettingsPage.ets', [
    'PublicSupportPolicy.dialablePhone',
  ]],
]

const errors = []
if (testCases.length < 32) errors.push(`expected at least 32 Hypium cases, found ${testCases.length}`)
for (const [label, fragment] of requiredTestContracts) {
  if (!testSource.includes(fragment)) errors.push(`missing Hypium contract: ${label}`)
}
for (const [relative, fragments] of productionContracts) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8')
  for (const fragment of fragments) {
    if (!source.includes(fragment)) errors.push(`${relative} does not use tested contract ${fragment}`)
  }
}

if (errors.length > 0) {
  console.error(`Automated test-coverage audit failed:\n${errors.map((item) => `- ${item}`).join('\n')}`)
  process.exit(1)
}

console.log(
  `Automated test-coverage audit passed: ${testCases.length} Hypium cases cover ${requiredTestContracts.length} critical contracts and are wired into production.`,
)
