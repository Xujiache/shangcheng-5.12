#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const errors = []
const normalContentPages = [
  'features/auth/ChangePhonePage.ets',
  'features/auth/MerchantApplyPage.ets',
  'features/auth/SetPasswordPage.ets',
  'features/business/CommissionPage.ets',
  'features/business/DecoratePage.ets',
  'features/business/MarketingPage.ets',
  'features/business/PriceRulePage.ets',
  'features/business/StoreAuthPage.ets',
  'features/legal/AgreementsPage.ets',
  'features/member/MembershipPage.ets',
  'features/order/AfterSaleDetailPage.ets',
  'features/order/OrderDetailPage.ets',
  'features/plaza/FactoryPage.ets',
  'features/product/CategoryPage.ets',
  'features/product/ProductEditPage.ets',
  'features/profile/AboutPage.ets',
  'features/profile/AccountSecurityPage.ets',
  'features/profile/AppearanceSettingsPage.ets',
  'features/profile/MePage.ets',
  'features/profile/NotificationSettingsPage.ets',
  'features/profile/ProfilePage.ets',
  'features/profile/SettingsPage.ets',
  'features/profile/SharePage.ets',
  'features/shell/WorkbenchPage.ets',
  'features/stats/StatsPage.ets'
]

for (const relative of normalContentPages) {
  const file = path.join(root, 'entry/src/main/ets', relative)
  const source = fs.readFileSync(file, 'utf8')
  if (!source.includes('Scroll()')) errors.push(`${relative}: 缺少正常内容滚动容器`)
  if (!source.includes('.align(Alignment.Top)')) errors.push(`${relative}: 短内容未固定顶部对齐`)
}

const agreements = fs.readFileSync(
  path.join(root, 'entry/src/main/ets/features/legal/AgreementsPage.ets'),
  'utf8'
)
for (const contract of [".width('calc(100% - 28vp)')", '.wordBreak(WordBreak.BREAK_ALL)']) {
  if (!agreements.includes(contract)) errors.push(`协议页面缺少防溢出规则 ${contract}`)
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('Top-alignment audit passed: normal content starts below the navigation bar.')
