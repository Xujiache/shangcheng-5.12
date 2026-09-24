#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')
const errors = []
const me = read('entry/src/main/ets/features/profile/MePage.ets')
const settings = read('entry/src/main/ets/features/profile/SettingsPage.ets')
const appearance = read('entry/src/main/ets/features/profile/AppearanceSettingsPage.ets')
const notification = read('entry/src/main/ets/features/profile/NotificationSettingsPage.ets')
const profile = read('entry/src/main/ets/features/profile/ProfilePage.ets')
const locationPicker = read('entry/src/main/ets/features/profile/LocationPickerPage.ets')
const agreements = read('entry/src/main/ets/features/legal/AgreementsPage.ets')
const update = read('entry/src/main/ets/features/update/UpdatePage.ets')
const tokens = read('entry/src/main/ets/core/theme/DesignTokens.ets')
const themeBridge = read('entry/src/main/ets/core/theme/ComponentThemeBridge.ets')
const routeMap = JSON.parse(read('entry/src/main/resources/base/profile/route_map.json'))
const settingsIcons = [
  'commerce_profile_lite', 'commerce_security_lite', 'commerce_appearance_lite',
  'commerce_notifications_lite', 'commerce_cache_lite', 'commerce_terms_lite',
  'commerce_privacy_lite', 'commerce_personal_info_lite', 'commerce_about_lite',
  'commerce_update_lite', 'commerce_share_lite', 'commerce_support_lite'
]

for (const route of [
  'Membership', 'Profile', 'Settings', 'Customers', 'Stores', 'Staffs', 'Commission', 'Marketing',
  'ChatSessions', 'Plaza', 'AgencyProducts', 'Decorate', 'PriceRule', 'ShareApp', 'UpdateCenter'
]) {
  if (!me.includes(`'${route}'`)) errors.push(`个人中心缺少入口 ${route}`)
}
for (const feature of ['primaryServices()', 'businessServices()', 'supportServices()', 'loadingSkeleton()',
  'profileFailed', 'Refresh({ refreshing: $$this.refreshing })', 'loadingTask']) {
  if (!me.includes(feature)) errors.push(`个人中心缺少重构契约 ${feature}`)
}
if (me.includes('IBestCellGroup') || me.includes('IBestCell({')) errors.push('个人中心不得恢复冗长的 Cell 列表')
if (me.includes('退出登录') || me.includes('Sign out')) errors.push('退出登录必须位于设置页，不得留在个人中心')
if (/v1\.0\.0/.test(me)) errors.push('个人中心不得硬编码版本号')
if (!me.includes('AppConfig.CLIENT_VERSION')) errors.push('个人中心必须读取真实客户端版本')

for (const token of [
  'categorySheetVisible', 'categoryDraft', 'categoryKeyword', 'visibleCategoryOptions()',
  'confirmCategories()', 'private categorySheet()', 'private saveBar()', 'windowWidth >= 600',
  "categories: this.categories", "AppRouter.push('LocationPicker')", '.onBackPressed((): boolean => {'
]) {
  if (!profile.includes(token)) errors.push(`资料编辑页缺少重构契约 ${token}`)
}
if (profile.includes('private toggleCategory(') || /Flex\(\{\s*wrap:\s*FlexWrap\.Wrap/.test(profile)) {
  errors.push('经营品类不得恢复为页内铺满按钮的旧布局')
}
if (!profile.includes('this.categoryDraft = [...this.categories]') ||
  !profile.includes('this.categories = [...this.categoryDraft]')) {
  errors.push('经营品类必须保持草稿与已保存值分离')
}

for (const token of [
  'MapComponent({ mapOptions:', 'IBestSearch({', 'this.searchResults.length > 0',
  'position({ right: 14', "I18n.text(this.language, '使用此位置'",
  "AppStorage.setOrCreate<number>('pickedLatitude'", "AppStorage.setOrCreate<number>('pickedLongitude'",
  '.onBackPressed((): boolean => {'
]) {
  if (!locationPicker.includes(token)) errors.push(`地图选址页缺少重构契约 ${token}`)
}
if (locationPicker.includes(".width('100%').padding({ left: 16, right: 16") &&
  locationPicker.includes(".margin({ left: 12, right: 12")) {
  errors.push('地图底部地址卡不得用 100% 宽度再叠加左右外边距')
}

for (const token of [".width('calc(100% - 28vp)')", '.wordBreak(WordBreak.BREAK_ALL)']) {
  if (!agreements.includes(token)) errors.push(`协议阅读页缺少防溢出契约 ${token}`)
}
if (!update.includes('.justifyContent(FlexAlign.Start)')) {
  errors.push('更新中心的正常内容必须从顶部向下排列')
}
for (const token of ['RADIUS_CONTROL', 'RADIUS_FIELD', 'RADIUS_PILL']) {
  if (!tokens.includes(token) || !themeBridge.includes(token)) errors.push(`全局语义圆角未接入组件主题 ${token}`)
}

for (const route of [
  'AccountSecurity', 'AppearanceSettings', 'NotificationSettings', 'AboutApp', 'Profile',
  'Agreements', 'ShareApp', 'UpdateCenter'
]) {
  if (!settings.includes(`AppRouter.push('${route}'`)) errors.push(`设置主页缺少入口 ${route}`)
}
if (!settings.includes('AuthRepository.logout()')) errors.push('设置主页缺少真实退出登录链路')
if (!settings.includes('OfflineCacheStore.clearAll()')) errors.push('设置主页缺少业务缓存清理链路')
if (settings.includes('cycleTheme') || settings.includes('toggleLanguage')) {
  errors.push('设置主页不得恢复点击循环主题或二态语言切换')
}
if (!settings.includes('private settingRow(icon: Resource')) {
  errors.push('设置主页仍在使用字体图标接口')
}
for (const icon of settingsIcons) {
  if (!settings.includes(`$r('app.media.${icon}')`)) errors.push(`设置主页未接入 ${icon}`)
  const file = path.join(root, `entry/src/main/resources/base/media/${icon}.png`)
  if (!fs.existsSync(file)) {
    errors.push(`设置图标资源缺失 ${icon}.png`)
    continue
  }
  const png = fs.readFileSync(file)
  if (png.length > 80 * 1024) errors.push(`设置图标 ${icon}.png 超过 80KB`)
  if (png.length < 26 || png.readUInt32BE(16) !== 256 || png.readUInt32BE(20) !== 256) {
    errors.push(`设置图标 ${icon}.png 必须为 256x256`)
  }
  if (png[25] !== 6) errors.push(`设置图标 ${icon}.png 必须为真 RGBA PNG`)
}

for (const token of ["this.selectTheme('system')", "this.selectTheme('light')", "this.selectTheme('dark')",
  "this.selectLanguage('zh-CN')", "this.selectLanguage('en-US')", 'AppearanceService.setTheme',
  'AppearanceService.setLanguage', 'HarmonyPushClient.updateLocale']) {
  if (!appearance.includes(token)) errors.push(`主题语言页缺少 ${token}`)
}
for (const token of ['PushPreferenceStore.read', 'HarmonyPushClient.getPreferences',
  'HarmonyPushClient.setPreferences', 'this.apply(this.lastSaved)', 'pushPreferencesEpoch']) {
  if (!notification.includes(token)) errors.push(`通知设置页缺少 ${token}`)
}
if (/\(next:\s*boolean\):\s*void\s*=>\s*this\.save\(/.test(notification)) {
  errors.push('通知开关的 void 事件不得直接返回 Promise<void>')
}

const declared = new Set((routeMap.routerMap || []).map((route) => route.name))
for (const route of ['AccountSecurity', 'AppearanceSettings', 'NotificationSettings', 'AboutApp']) {
  if (!declared.has(route)) errors.push(`路由表缺少 ${route}`)
}

for (const relative of [
  'entry/src/main/ets/features/profile/AccountSecurityPage.ets',
  'entry/src/main/ets/features/profile/AppearanceSettingsPage.ets',
  'entry/src/main/ets/features/profile/NotificationSettingsPage.ets',
  'entry/src/main/ets/features/profile/AboutPage.ets',
  'entry/src/main/ets/features/profile/ProfilePage.ets',
  'entry/src/main/ets/features/profile/LocationPickerPage.ets',
  'entry/src/main/ets/features/profile/SharePage.ets',
  'entry/src/main/ets/features/auth/SetPasswordPage.ets',
  'entry/src/main/ets/features/auth/ChangePhonePage.ets',
  'entry/src/main/ets/features/legal/AgreementsPage.ets',
  'entry/src/main/ets/features/update/UpdatePage.ets'
]) {
  const source = read(relative)
  if (!source.includes("@StorageProp('darkMode')") && !source.includes("@StorageLink('darkMode')")) {
    errors.push(`${relative} 没有订阅动态主题`)
  }
  if (!source.includes("@StorageProp('language')") && !source.includes("@StorageLink('language')")) {
    errors.push(`${relative} 没有订阅运行时语言`)
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log('Personal center and complete settings audit passed.')
