#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')
const errors = []
const appearance = read('entry/src/main/ets/core/theme/AppearanceService.ets')
const entry = read('entry/src/main/ets/entryability/EntryAbility.ets')
const settings = read('entry/src/main/ets/features/profile/SettingsPage.ets')
const appearanceSettings = read('entry/src/main/ets/features/profile/AppearanceSettingsPage.ets')
const push = read('entry/src/main/ets/core/push/HarmonyPushClient.ets')

function method(source, start, end) {
  const from = source.indexOf(start)
  const to = source.indexOf(end, from + start.length)
  return from >= 0 && to > from ? source.slice(from, to) : ''
}

for (const key of ["AppStorage.setOrCreate<string>('themeMode', 'system')", "AppStorage.setOrCreate<string>('language', 'zh-CN')"]) {
  if (!entry.includes(key)) errors.push(`EntryAbility 启动前缺少外观状态 ${key}`)
  if (entry.indexOf(key) > entry.indexOf('AppearanceService.initialize')) {
    errors.push(`EntryAbility 必须在 AppearanceService.initialize 前创建 ${key}`)
  }
}

const themeSetter = method(appearance, 'static setTheme', 'static setLanguage')
const languageSetter = method(appearance, 'static setLanguage', 'static syncSystemColorMode')
if (!themeSetter.includes('publishTheme(false)') || !themeSetter.includes('scheduleNativeTheme()')) {
  errors.push('主题切换没有先发布响应式状态并合并原生颜色更新')
}
if (themeSetter.includes('publishLanguage') || themeSetter.includes('setLanguage(')) {
  errors.push('主题切换不得触发语言发布或系统语言切换')
}
if (!languageSetter.includes('publishLanguage()') || !languageSetter.includes('enqueuePersist()')) {
  errors.push('语言切换没有立即发布响应式语言并持久化')
}
if (!appearance.includes("setStorage('themeMode'") || !appearance.includes("setStorage('language'") ||
    !appearance.includes("setStorage('darkMode'")) {
  errors.push('外观服务没有在每次切换时重新校准 AppStorage')
}
if (!appearanceSettings.includes('this.theme = mode') || !appearanceSettings.includes('this.language = mode')) {
  errors.push('主题语言页没有在点击帧同步更新选中状态')
}
if (/await\s+AppearanceService\.set(?:Theme|Language)/.test(appearanceSettings)) {
  errors.push('主题语言点击仍在等待磁盘持久化')
}
for (const forbidden of ['.setColorMode(', '.setLanguage(', 'ComponentThemeBridge', 'applySystemBars']) {
  if (languageSetter.includes(forbidden)) errors.push(`运行时语言切换禁止调用 ${forbidden}`)
}
const nativeLanguageCalls = [...appearance.matchAll(/\.setLanguage\(/g)].length
if (nativeLanguageCalls !== 1 || !appearance.includes('applyColdStartNativeLanguage')) {
  errors.push('系统语言只能在冷启动入口应用一次')
}
if (appearanceSettings.includes('HarmonyPushClient.syncCurrent(this.context(), next)')) {
  errors.push('设置页语言切换仍会触发完整 PushKit 注册')
}
if (!appearanceSettings.includes('HarmonyPushClient.updateLocale(mode)')) {
  errors.push('设置页没有使用无权限、无 Token 查询的轻量语言同步')
}
if (!appearanceSettings.includes("@StorageLink('themeMode') private theme")) {
  errors.push('设置页主题选择没有直接订阅全局 themeMode')
}
const localeUpdater = method(push, 'static async updateLocale', 'static async unregisterCurrent')
for (const forbidden of ['requestPermissionOnce', 'pushService.getToken', 'AAID.getAAID']) {
  if (localeUpdater.includes(forbidden)) errors.push(`Push locale 更新禁止调用 ${forbidden}`)
}

const sourceRoot = path.join(root, 'entry/src/main/ets')
const files = []
const pending = [sourceRoot]
while (pending.length > 0) {
  const folder = pending.pop()
  for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
    const absolute = path.join(folder, item.name)
    if (item.isDirectory()) pending.push(absolute)
    else if (item.isFile() && item.name.endsWith('.ets')) files.push(absolute)
  }
}
for (const absolute of files) {
  const source = fs.readFileSync(absolute, 'utf8')
  const relative = path.relative(root, absolute)
  if (/@StorageProp\(['"](?:language|darkMode|themeMode)['"]\)/.test(source)) {
    errors.push(`${relative}: 外观状态必须使用 @StorageLink，禁止保留 @StorageProp`)
  }
  if (source.includes('I18n.text(this.language') &&
      !/@Storage(?:Prop|Link)\(['"]language['"]\)/.test(source)) {
    errors.push(`${relative}: 使用动态文案但没有订阅 language`)
  }
  if (/errorMessage\s*=\s*error\s+instanceof\s+ApiError[\s\S]{0,120}:\s*I18n\.text\(this\.language/.test(source)) {
    errors.push(`${relative}: 错误状态缓存了已翻译文案，应保存 locale-neutral key`)
  }
}

for (const relative of [
  'entry/src/main/ets/features/member/MembershipPage.ets',
  'entry/src/main/ets/features/legal/AgreementsPage.ets'
]) {
  const source = read(relative)
  if (!source.includes("@StorageLink('language') @Watch('onLanguageChanged')") ||
      !source.includes('private onLanguageChanged(): void')) {
    errors.push(`${relative}: 语言相关接口没有在切换语言后安全重载`)
  }
}

for (const absolute of files) {
  const source = fs.readFileSync(absolute, 'utf8')
  const relative = path.relative(root, absolute)
  for (const match of source.matchAll(/IBestDialogUtil\.open\(\{[\s\S]*?\}\);/g)) {
    const dialog = match[0]
    if (dialog.includes('showCancelButton:') && !dialog.includes('cancelButtonText:')) {
      errors.push(`${relative}: 弹窗取消按钮没有显式本地化`)
    }
    if (!dialog.includes('confirmButtonText:')) {
      errors.push(`${relative}: 弹窗确认按钮没有显式本地化`)
    }
  }
}

if (!appearance.includes('persistRevision') || !appearance.includes('persistChain')) {
  errors.push('外观偏好没有 latest-wins 串行持久化保护')
}
if (!push.includes('localeRevision') || !localeUpdater.includes('resolve(), 250')) {
  errors.push('Push locale 更新没有合并快速重复切换')
}
const login = read('entry/src/main/ets/features/auth/LoginPage.ets')
const plaza = read('entry/src/main/ets/features/plaza/PlazaPage.ets')
const update = read('entry/src/main/ets/features/update/UpdatePage.ets')
if (!login.includes('statusKind: LoginStatusKind') || login.includes('@State private statusTitle')) {
  errors.push('登录状态仍缓存已翻译标题，语言切换后无法立即刷新')
}
if (!plaza.includes('private optionLabel(option: PlazaFilterOption)')) {
  errors.push('选品筛选标签没有在渲染时按当前语言解析')
}
if (!update.includes('private visibleChangelog()')) {
  errors.push('更新说明空状态没有在渲染时按当前语言解析')
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('Native appearance audit passed: theme and language transitions are isolated, reactive and non-blocking.')
