#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const backendRoot = resolve(process.env.BACKEND_SOURCE_ROOT
  || join(root, '../../packages/server/src'))
const failures = []
const fail = (message) => failures.push(message)
const text = (path) => readFileSync(join(root, path), 'utf8')
const json = (path) => JSON.parse(text(path))

const listing = json('appgallery/listing.json')
const privacy = json('appgallery/privacy-labels.json')
const appSource = text('AppScope/app.json5')
const moduleSource = text('entry/src/main/module.json5')
const baseStrings = json('entry/src/main/resources/base/element/string.json')
const zhStrings = json('entry/src/main/resources/zh_CN/element/string.json')
const enStrings = json('entry/src/main/resources/en_US/element/string.json')
const legalRepo = text('entry/src/main/ets/features/legal/LegalRepository.ets')

function capture(source, pattern, label) {
  const value = source.match(pattern)?.[1]
  if (!value) fail(`cannot resolve ${label}`)
  return value || ''
}

const identity = {
  bundleName: capture(appSource, /"bundleName"\s*:\s*"([^"]+)"/, 'bundleName'),
  versionName: capture(appSource, /"versionName"\s*:\s*"([^"]+)"/, 'versionName'),
  versionCode: Number(capture(appSource, /"versionCode"\s*:\s*(\d+)/, 'versionCode')),
}
for (const key of ['bundleName', 'versionName', 'versionCode']) {
  if (listing.application[key] !== identity[key]) {
    fail(`listing ${key} does not match AppScope/app.json5`)
  }
}
if (privacy.application !== identity.bundleName) fail('privacy label bundleName mismatch')
if (listing.application.name !== '经纬科技-商家端') fail('approved Chinese application name changed')

const manifestDevices = capture(moduleSource, /"deviceTypes"\s*:\s*\[([^\]]+)\]/s, 'deviceTypes')
  .match(/"([^"]+)"/g)?.map((value) => value.slice(1, -1)) || []
if (JSON.stringify([...listing.application.deviceTypes].sort()) !== JSON.stringify([...manifestDevices].sort())) {
  fail('listing device types do not match module.json5')
}

const zh = listing.localized['zh-CN']
const en = listing.localized['en-US']
const length = (value) => [...String(value || '')].length
if (!zh || !en) fail('zh-CN and en-US listing records are both required')
if (zh && (length(zh.briefIntroduction) < 2 || length(zh.briefIntroduction) > 17)) {
  fail('Chinese brief introduction must contain 2-17 characters')
}
if (en && (length(en.briefIntroduction) < 2 || length(en.briefIntroduction) > 80)) {
  fail('English brief introduction must contain 2-80 characters')
}
for (const [locale, item] of Object.entries(listing.localized)) {
  if (length(item.fullIntroduction) < 120 || length(item.fullIntroduction) > 8000) {
    fail(`${locale} full introduction must contain 120-8000 characters`)
  }
  const maxFeatures = locale === 'zh-CN' ? 500 : 1000
  if (length(item.newFeatures) < 20 || length(item.newFeatures) > maxFeatures) {
    fail(`${locale} new features must contain 20-${maxFeatures} characters`)
  }
}

const requiredUrls = ['privacyPolicyUrl', 'dataSubjectRightsUrl', 'collectionListUrl', 'termsUrl']
for (const key of requiredUrls) {
  try {
    const url = new URL(listing.privacy[key])
    if (url.protocol !== 'https:' || url.hostname !== 'ewsn.top') fail(`${key} must use the production HTTPS domain`)
  } catch {
    fail(`${key} is not a valid URL`)
  }
}
if (!listing.privacy.privacyPolicyUrl.endsWith('/legal/merchant-harmony/privacy')) {
  fail('privacy policy URL is not the dedicated Harmony merchant document')
}
if (!legalRepo.includes('/u/agreements?platform=merchant-harmony')) {
  fail('native legal repository is not scoped to merchant-harmony')
}

const manifestPermissions = [...moduleSource.matchAll(/"name"\s*:\s*"(ohos\.permission\.[A-Z_]+)"/g)]
  .map((match) => match[1])
const labelPermissions = privacy.systemPermissions.map((item) => item.name)
const manifestSet = new Set(manifestPermissions)
const labelSet = new Set(labelPermissions)
for (const permission of manifestSet) {
  if (!labelSet.has(permission)) fail(`permission ${permission} is missing from privacy labels`)
}
for (const permission of labelSet) {
  if (!manifestSet.has(permission)) fail(`privacy labels declare unused permission ${permission}`)
}
if (manifestSet.size !== labelSet.size || manifestPermissions.length !== manifestSet.size) {
  fail('permission declarations contain duplicates or do not have one-to-one privacy labels')
}

function stringMap(resource) {
  return new Map(resource.string.map((item) => [item.name, item.value]))
}
for (const [locale, resource] of [['base', baseStrings], ['zh-CN', zhStrings], ['en-US', enStrings]]) {
  const values = stringMap(resource)
  for (const key of ['location_reason', 'camera_reason']) {
    if (length(values.get(key)) < 8) fail(`${locale} ${key} is missing or too vague`)
  }
}

const requiredDataIds = new Set([
  'account-authentication', 'merchant-identity', 'commerce-operations',
  'customer-communications', 'selected-media', 'location',
  'push-notifications', 'iap-membership', 'network-security',
])
const actualDataIds = new Set(privacy.dataHandling.map((item) => item.id))
for (const id of requiredDataIds) if (!actualDataIds.has(id)) fail(`privacy data category ${id} is missing`)
if (actualDataIds.size !== requiredDataIds.size) fail('unreviewed or duplicate privacy data categories detected')

for (const value of ['通讯录', '短信内容', '麦克风音频', 'Wi-Fi列表', 'IMEI', 'OAID', '完整相册']) {
  if (!privacy.notCollected.includes(value)) fail(`not-collected declaration is missing ${value}`)
}
for (const processor of ['Huawei Push Kit', 'Huawei IAP Kit', 'Huawei Map/Site/Location Kit', 'Huawei AppGallery']) {
  if (!privacy.processors.some((item) => item.name === processor)) fail(`processor ${processor} is missing`)
}

const serialized = JSON.stringify({ listing, privacy })
const forbidden = [
  /\bTODO\b/i, /\bTBD\b/i, /example\.com/i, /400-000-0000/,
  /support@jiujiu\.com/i, /沪ICP备20260000号/, /IMEI\/IDFA\/OAID/,
]
for (const pattern of forbidden) if (pattern.test(serialized)) fail(`store metadata contains forbidden placeholder or obsolete disclosure: ${pattern}`)
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(listing.operator.supportEmail)) fail('support email is invalid')

const serverLegal = join(backendRoot, 'modules/legal/legal.merchant-harmony.ts')
const serverController = join(backendRoot, 'modules/legal/legal.controller.ts')
if (!existsSync(serverLegal) || !existsSync(serverController)) {
  fail('dedicated production legal source is missing')
} else {
  const legalSource = readFileSync(serverLegal, 'utf8')
  const controllerSource = readFileSync(serverController, 'utf8')
  for (const marker of ['不读取通讯录', 'Huawei IAP', 'Asset Store', '辽宁经纬建筑装饰有限公司']) {
    if (!legalSource.includes(marker)) fail(`server legal source is missing ${marker}`)
  }
  if (!controllerSource.includes("legal/merchant-harmony/:kind")) fail('public Harmony legal HTML route is missing')
}

if (failures.length > 0) {
  process.stderr.write(`AppGallery compliance audit failed (${failures.length}):\n`)
  for (const message of failures) process.stderr.write(`- ${message}\n`)
  process.exit(1)
}

process.stdout.write(
  `AppGallery compliance audit passed: ${Object.keys(listing.localized).length} locales, `
    + `${manifestSet.size} permissions, ${actualDataIds.size} data categories\n`,
)
