import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ownedUiRoots = [
  'entry/src/main/ets/features',
  'entry/src/main/ets/pages',
]
const files = ownedUiRoots.flatMap((relativeRoot) => {
  const absoluteRoot = path.join(root, relativeRoot)
  const pending = [absoluteRoot]
  const result = []
  while (pending.length > 0) {
    const current = pending.pop()
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name)
      if (entry.isDirectory()) pending.push(absolute)
      else if (entry.isFile() && entry.name.endsWith('.ets')) result.push(absolute)
    }
  }
  return result
})

const errors = []
const designTokensPath = path.join(root, 'entry/src/main/ets/core/theme/DesignTokens.ets')
const designTokens = fs.readFileSync(designTokensPath, 'utf8')
for (const required of [
  "BRAND: string = '#8A6A2D'",
  "BRAND_DARK: string = '#C5A45B'",
  "PAGE_LIGHT: string = '#F6F5F1'",
  "PAGE_DARK: string = '#090908'",
  "return dark ? '#FF141413'",
  "return dark ? '#FF1B1B19'",
  "return dark ? '#FF2B2518'",
  'static brand(dark: boolean)',
  'static onBrand(dark: boolean)',
  'static selectedSurface(dark: boolean)'
]) {
  if (!designTokens.includes(required)) errors.push(`深色主题令牌缺少契约 ${required}`)
}
const darkColorsPath = path.join(root, 'entry/src/main/resources/dark/element/color.json')
if (!fs.existsSync(darkColorsPath)) errors.push('缺少深色启动窗口资源')
else {
  const darkColors = fs.readFileSync(darkColorsPath, 'utf8')
  if (!darkColors.includes('start_window_background')) errors.push('深色资源没有启动窗口背景')
}
const entryAbility = fs.readFileSync(path.join(root,
  'entry/src/main/ets/entryability/EntryAbility.ets'), 'utf8')
if (!entryAbility.includes('ComponentThemeBridge.apply')) {
  errors.push('IBest UI 没有注入动态黑金主题桥接')
}
const fixedLightPatterns = [
  ['固定白色背景', /\.backgroundColor\(Color\.White\)/],
  ['固定黑色文字', /\.fontColor\(Color\.Black\)/],
  ['固定浅色导航栏', /navBarBgColor\s*:\s*['"]#F2FFFFFF['"]/],
  ['绕过动态主题的浅色令牌', /DesignTokens\.(?:PAGE_LIGHT|SURFACE_LIGHT|TEXT_LIGHT|TEXT_MUTED_LIGHT|BORDER_LIGHT)/],
]

function isForbiddenBlue(value) {
  const hex = value.slice(1)
  const rgb = hex.length === 8 ? hex.slice(2) : hex
  const red = Number.parseInt(rgb.slice(0, 2), 16)
  const green = Number.parseInt(rgb.slice(2, 4), 16)
  const blue = Number.parseInt(rgb.slice(4, 6), 16)
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  const delta = maximum - minimum
  if (delta === 0 || maximum === 0) return false
  let hue
  if (maximum === red) hue = 60 * (((green - blue) / delta) % 6)
  else if (maximum === green) hue = 60 * ((blue - red) / delta + 2)
  else hue = 60 * ((red - green) / delta + 4)
  if (hue < 0) hue += 360
  return hue >= 180 && hue <= 270 && delta / maximum >= 0.22
}

function isLegacyOrange(value) {
  const hex = value.slice(1)
  const rgb = hex.length === 8 ? hex.slice(2) : hex
  const red = Number.parseInt(rgb.slice(0, 2), 16)
  const green = Number.parseInt(rgb.slice(2, 4), 16)
  const blue = Number.parseInt(rgb.slice(4, 6), 16)
  return red > green * 1.35 && green > blue * 1.45 && red > 170
}

const businessColorChoice = 'entry/src/main/ets/features/business/DecoratePage.ets'
for (const absolute of files.concat([designTokensPath])) {
  const source = fs.readFileSync(absolute, 'utf8')
  const relative = path.relative(root, absolute)
  if (/DesignTokens\.(?:page|surface|card|subtle|text|muted|border|brand|brandTint)\(this\.darkMode\)/.test(source) &&
      !/@(?:StorageLink\(['"]darkMode['"]\)|Prop\s+darkMode\s*:)/.test(source)) {
    errors.push(`${relative}: 使用动态主题令牌但没有订阅 darkMode`)
  }
  if (absolute !== designTokensPath) {
    for (const [label, pattern] of fixedLightPatterns) {
      if (pattern.test(source)) errors.push(`${relative}: ${label}`)
    }
    if (/DesignTokens\.BRAND\b/.test(source)) {
      errors.push(`${relative}: 第一方界面必须使用动态 brand(darkMode)，不得读取静态品牌色`)
    }
  }
  if (relative !== businessColorChoice) {
    for (const match of source.matchAll(/#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?/g)) {
      if (isForbiddenBlue(match[0])) errors.push(`${relative}: 系统界面禁止使用蓝色或蓝紫色 ${match[0]}`)
      if (isLegacyOrange(match[0])) errors.push(`${relative}: 黑金系统界面禁止使用旧橙色 ${match[0]}`)
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`Native black-gold theme audit passed: ${files.length} owned UI sources are theme safe.`)
