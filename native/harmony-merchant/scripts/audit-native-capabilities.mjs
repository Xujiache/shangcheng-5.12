#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.join(root, 'entry/src/main/ets')
const moduleProfile = JSON.parse(fs.readFileSync(path.join(root, 'entry/src/main/module.json5'), 'utf8'))

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(absolute) : [absolute]
  })
}

const files = walk(sourceRoot).filter((file) => file.endsWith('.ets'))
const source = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n')
const permissions = new Set((moduleProfile.module.requestPermissions || []).map((item) => item.name))
const errors = []

const requiredPermissions = [
  { marker: "from '@kit.NetworkKit'", permission: 'ohos.permission.INTERNET' },
  { marker: "from '@kit.CameraKit'", permission: 'ohos.permission.CAMERA' },
  { marker: "from '@kit.LocationKit'", permission: 'ohos.permission.LOCATION' },
  { marker: "from '@kit.LocationKit'", permission: 'ohos.permission.APPROXIMATELY_LOCATION' },
  { marker: 'vibrator.startVibration(', permission: 'ohos.permission.VIBRATE' }
]

for (const rule of requiredPermissions) {
  if (source.includes(rule.marker) && !permissions.has(rule.permission)) {
    errors.push(`${rule.permission} is required by ${rule.marker} but is absent from module.json5`)
  }
}

const forbiddenBroadMediaPermissions = [
  'ohos.permission.READ_IMAGEVIDEO',
  'ohos.permission.WRITE_IMAGEVIDEO',
  'ohos.permission.READ_MEDIA',
  'ohos.permission.WRITE_MEDIA',
  'ohos.permission.MANAGE_MEDIA'
]
for (const permission of forbiddenBroadMediaPermissions) {
  if (permissions.has(permission)) {
    errors.push(`${permission} is forbidden: use Photo Picker and security components instead`)
  }
}

const requiredNativeCapabilities = [
  { name: 'Asset Store session protection', markers: ["from '@kit.AssetStoreKit'", 'asset.query(', 'asset.add('] },
  { name: 'RDB offline cache', markers: ["from '@kit.ArkData'", 'relationalStore.getRdbStore('] },
  { name: 'system photo picker', markers: ['photoAccessHelper.PhotoViewPicker', '.select(options)'] },
  { name: 'Camera Kit picker', markers: ["from '@kit.CameraKit'", 'cameraPicker.pick('] },
  { name: 'Map/Location/Site Kit', markers: ["from '@kit.MapKit'", 'MapComponent(', 'geoLocationManager.getCurrentLocation('] },
  { name: 'Push Kit', markers: ["from '@kit.PushKit'", 'pushService.getToken()', 'AAID.getAAID()'] },
  { name: 'Huawei IAP', markers: ["from '@kit.IAPKit'", 'iap.createPurchase(', 'iap.queryPurchases('] },
  { name: 'system share', markers: ["from '@kit.ShareKit'", 'systemShare.ShareController'] },
  { name: 'AppGallery update', markers: ["from '@kit.AppGalleryKit'", 'updateManager.checkAppUpdate(', 'updateManager.showUpdateDialog('] },
  { name: 'permissionless image save', markers: ['SaveButton(', 'showAssetsCreationDialog('] }
]

for (const capability of requiredNativeCapabilities) {
  for (const marker of capability.markers) {
    if (!source.includes(marker)) {
      errors.push(`${capability.name} is missing native marker: ${marker}`)
    }
  }
}

const deviceTypes = new Set(moduleProfile.module.deviceTypes || [])
for (const deviceType of ['phone', 'tablet', '2in1']) {
  if (!deviceTypes.has(deviceType)) errors.push(`module deviceTypes is missing ${deviceType}`)
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log(`Native capability audit passed: ${requiredNativeCapabilities.length} system capability families and least-privilege permissions verified.`)
