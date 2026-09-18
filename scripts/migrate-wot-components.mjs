#!/usr/bin/env node

import { promises as fs } from 'node:fs'
import path from 'node:path'

const sourceRoots = [
  path.resolve('packages/merchant-app/src'),
  path.resolve('packages/platform-app/src'),
]

async function collectFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name)
      if (entry.isDirectory()) return collectFiles(target)
      return entry.isFile() && (entry.name.endsWith('.vue') || entry.name.endsWith('.ts')) ? [target] : []
    }),
  )
  return nested.flat()
}

function removeImport(source, component, folder) {
  const pattern = new RegExp(`^import\\s+${component}\\s+from\\s+['\"][^'\"]*(?:components/)?${folder}/[^'\"]+['\"]\\s*;?\\r?\\n`, 'gm')
  return source.replace(pattern, '')
}

function extractAttr(attrs, names) {
  for (const name of names) {
    const pattern = new RegExp(`(?:^|\\s)(${name})=(['\"])([\\s\\S]*?)\\2`)
    const match = attrs.match(pattern)
    if (match) {
      return { name: match[1], value: match[3], dynamic: match[1].startsWith(':'), raw: match[0] }
    }
  }
  return null
}

function removeAttr(attrs, names) {
  let result = attrs
  for (const name of names) {
    result = result.replace(new RegExp(`\\s+${name}=(['\"])[\\s\\S]*?\\1`, 'g'), '')
    result = result.replace(new RegExp(`\\s+${name}(?=\\s|$)`, 'g'), '')
  }
  return result
}

function valueExpression(attr, fallback = "''") {
  if (!attr) return fallback
  return attr.dynamic ? attr.value : `'${attr.value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

function migrateIconTag(attrs) {
  let next = attrs
  const dynamicName = extractAttr(next, [':name'])
  const staticName = extractAttr(next, ['name'])
  if (dynamicName) {
    next = next.replace(dynamicName.raw, ` :name="$jwIcon(${dynamicName.value})"`)
  } else if (staticName) {
    next = next.replace(staticName.raw, ` :name="$jwIcon('${staticName.value.replace(/'/g, "\\'")}')"`)
  }
  next = next.replace(/\s+:size="(\d+)"/g, (_, size) => ` size="${Number(size) / 2}px"`)
  next = next.replace(/\s+size="(\d+)"/g, (_, size) => ` size="${Number(size) / 2}px"`)
  next = removeAttr(next, ['stroke', ':stroke', 'fill', ':fill'])
  return `<wd-icon${next} />`
}

function migrateNavbar(attrs) {
  const title = extractAttr(attrs, [':title', 'title'])
  const sub = extractAttr(attrs, [':sub', 'sub'])
  const rightIcon = extractAttr(attrs, [':right-icon', 'right-icon', ':rightIcon', 'rightIcon'])
  const transparent = /(?:bg|:bg)=(['"])(?:'|&apos;)?transparent(?:'|&apos;)?\1/.test(attrs) || /\stransparent(?:\s|$)/.test(attrs)
  let next = removeAttr(attrs, [':sub', 'sub', ':right-icon', 'right-icon', ':rightIcon', 'rightIcon', ':bg', 'bg', 'color', ':color', 'sticky', ':sticky', 'show-back', ':show-back', 'transparent'])
  next = next.replace(/@right=/g, '@click-right=')
  next = next.replace(/@back=/g, '@click-left=')
  if (!/@click-left=/.test(next)) next += ' @click-left="$jwNav.back()"'
  next += ' left-arrow fixed placeholder safe-area-inset-top custom-class="jw-glass-navbar"'
  if (transparent) next += ' custom-style="background: transparent;"'

  if (!sub && !rightIcon) return `<wd-navbar${next} />`

  if (sub && title) next = next.replace(title.raw, '')
  let inner = ''
  if (sub) {
    inner += `\n      <template #title><view class="jw-navbar-title"><text>${'{{ ' + valueExpression(title, "''") + ' }}'}</text><text class="jw-navbar-sub">${'{{ ' + valueExpression(sub) + ' }}'}</text></view></template>`
  }
  if (rightIcon) {
    inner += `\n      <template #right><wd-icon :name="$jwIcon(${valueExpression(rightIcon)})" size="22px" /></template>`
  }
  return `<wd-navbar${next}>${inner}\n    </wd-navbar>`
}

function migrateEmptyState(attrs) {
  const title = extractAttr(attrs, [':title', 'title'])
  const desc = extractAttr(attrs, [':desc', 'desc'])
  let structural = removeAttr(attrs, [':title', 'title', ':desc', 'desc', ':icon', 'icon'])
  const titleExpr = valueExpression(title, "'暂无数据'")
  const descExpr = valueExpression(desc, "''")
  return `<wd-status-tip${structural} image="content" :tip="[${titleExpr}, ${descExpr}].filter(Boolean).join(' · ')" />`
}

function migrateStatusTag(attrs) {
  const textAttr = extractAttr(attrs, [':text', 'text'])
  const toneAttr = extractAttr(attrs, [':tone', 'tone'])
  const fill = /(?:^|\s)(?:fill|:fill="true")(?:\s|$)/.test(attrs)
  const structural = removeAttr(attrs, [':text', 'text', ':tone', 'tone', 'fill', ':fill', 'size', ':size'])
  return `<wd-tag${structural} :type="$jwTagType(${valueExpression(toneAttr, "'default'")})" :plain="${!fill}" round>{{ ${valueExpression(textAttr, "''")} }}</wd-tag>`
}

function migrateTabs(attrs) {
  const items = extractAttr(attrs, [':items', 'items'])
  let next = removeAttr(attrs, [':items', 'items', 'variant', ':variant', 'fill', ':fill'])
  next = next.replace(/@change=/g, '@change=')
  const listExpr = valueExpression(items, '[]')
  return `<wd-tabs${next} color="var(--brand-primary)">\n        <wd-tab\n          v-for="item in ${listExpr}"\n          :key="item.key"\n          :name="item.key"\n          :title="item.label"\n          :badge-props="(item as any).badge ? { value: (item as any).badge, max: 99 } : undefined"\n        />\n      </wd-tabs>`
}

function migrateSectionOpen(attrs) {
  const title = extractAttr(attrs, [':title', 'title'])
  const sub = extractAttr(attrs, [':sub', 'sub', ':desc', 'desc'])
  const action = extractAttr(attrs, [':action', 'action'])
  const actionHandler = extractAttr(attrs, ['@action'])
  const flush = /(?:^|\s)(?:flush|:flush="true")(?:\s|$)/.test(attrs)
  const structural = removeAttr(attrs, [':title', 'title', ':sub', 'sub', ':desc', 'desc', ':action', 'action', '@action', 'flush', ':flush'])
  const style = flush ? 'background: transparent; box-shadow: none;' : ''
  let header = ''
  if (title || action) {
    header = `\n        <template #title><view class="jw-section-heading"><view class="jw-section-copy"><text class="jw-section-title">{{ ${valueExpression(title, "''")} }}</text><text v-if="${valueExpression(sub, "''")}" class="jw-section-sub">{{ ${valueExpression(sub, "''")} }}</text></view>${action ? `<wd-button type="text" size="small"${actionHandler ? ` @click="${actionHandler.value}"` : ''}>{{ ${valueExpression(action)} }}</wd-button>` : ''}</view></template>`
  }
  return `<wd-card${structural} type="rectangle" custom-class="jw-section-card" custom-style="${style}">${header}`
}

function migrateTabBar(attrs, flavor) {
  const current = extractAttr(attrs, [':current', 'current'])
  const currentExpr = valueExpression(current, "'home'")
  const items =
    flavor === 'merchant'
      ? [
          ['home', '首页', 'home'],
          ['product', '商品', 'goods'],
          ['order', '订单', 'a-order-adjustmentcolumn'],
          ['stats', '数据', 'chart-bar'],
          ['me', '我的', 'user-circle'],
        ]
      : [
          ['home', '首页', 'home'],
          ['merchant', '商户', 'shop'],
          ['order', '订单', 'a-order-adjustmentcolumn'],
          ['stats', '数据', 'chart-bar'],
          ['me', '我的', 'user-circle'],
        ]
  const children = items.map(([name, title, icon]) => `\n        <wd-tabbar-item name="${name}" title="${title}" icon="${icon}" />`).join('')
  return `<wd-tabbar\n        :model-value="${currentExpr}"\n        fixed\n        placeholder\n        safe-area-inset-bottom\n        active-color="var(--brand-primary)"\n        inactive-color="var(--text-tertiary)"\n        custom-class="jw-glass-tabbar"\n        @change="$jwNav.switchTab(String($event.value))"\n      >${children}\n      </wd-tabbar>`
}

function migrateNativePrimitives(source) {
  source = source.replace(/<button\b([\s\S]*?)>/g, (_, attrs) => {
    const classes = extractAttr(attrs, ['class'])?.value ?? ''
    const secondary = /secondary|later|link-button|ghost/.test(classes)
    const compact = /compact/.test(classes)
    const hasType = /(?:^|\s)type=/.test(attrs)
    return `<wd-button${attrs}${hasType ? '' : ` type="${secondary ? 'default' : 'primary'}"`}${secondary ? ' plain' : ''} ${compact ? 'size="small"' : 'size="large"'} block>`
  })
  source = source.replace(/<\/button>/g, '</wd-button>')

  source = source.replace(/<input\b([\s\S]*?)\/>/g, (_, attrs) => {
    let next = attrs.replace(/\s+:password="[^"]*"/g, ' show-password').replace(/\s+password(?:=(['"])[\s\S]*?\1)?/g, ' show-password')
    if (!/v-model/.test(next)) next = next.replace(/\s+:value=/, ' :model-value=')
    return `<wd-input no-border${next} />`
  })
  source = source.replace(/<textarea\b([\s\S]*?)\/>/g, (_, attrs) => {
    let next = attrs
    if (!/v-model/.test(next)) next = next.replace(/\s+:value=/, ' :model-value=')
    return `<wd-textarea no-border${next} />`
  })
  source = source.replace(/<switch\b([\s\S]*?)\/>/g, (_, attrs) => {
    let next = attrs.replace(/\s+:checked=/, ' :model-value=').replace(/\s+checked=/, ' model-value=')
    next = next.replace(/\s+color=(['"])[\s\S]*?\1/g, ' active-color="var(--brand-primary)"')
    next = next.replace(/\.detail\.value/g, '.value')
    return `<wd-switch${next} />`
  })
  return source
}

function addFeedbackImport(source, filename) {
  if (!source.includes('appFeedback.')) return source
  if (source.includes("appFeedback } from '@jiujiu/shared'")) return source
  const importLine = "import { appFeedback } from '@jiujiu/shared'\n"
  if (filename.endsWith('.vue')) {
    return source.replace(/<script\s+setup(?:\s+lang="ts")?>\r?\n/, (match) => match + importLine)
  }
  return importLine + source
}

for (const root of sourceRoots) {
  for (const filename of await collectFiles(root)) {
    let source = await fs.readFile(filename, 'utf8')
    source = removeImport(source, 'Icon', 'icon')
    source = removeImport(source, 'NavBar', 'nav-bar')
    source = removeImport(source, 'Tabs', 'tabs')
    source = removeImport(source, 'EmptyState', 'empty-state')
    source = removeImport(source, 'StatusTag', 'status-tag')
    source = removeImport(source, 'Section', 'section')
    source = removeImport(source, 'TabBar', 'tab-bar')

    source = source.replace(/<Icon\b([\s\S]*?)\/>/g, (_, attrs) => migrateIconTag(attrs))
    source = source.replace(/<NavBar\b([\s\S]*?)\/>/g, (_, attrs) => migrateNavbar(attrs))
    source = source.replace(/<EmptyState\b([\s\S]*?)\/>/g, (_, attrs) => migrateEmptyState(attrs))
    source = source.replace(/<StatusTag\b([\s\S]*?)\/>/g, (_, attrs) => migrateStatusTag(attrs))
    source = source.replace(/<Tabs\b([\s\S]*?)\/>/g, (_, attrs) => migrateTabs(attrs))
    source = source.replace(/<Section(?=\s+(?:title|:title|flush|action|sub|class|v-))([\s\S]*?)>/g, (_, attrs) => migrateSectionOpen(attrs))
    source = source.replace(/<\/Section>/g, '</wd-card>')
    source = source.replace(/<TabBar\b([\s\S]*?)\/>/g, (_, attrs) =>
      migrateTabBar(attrs, filename.includes('/merchant-app/') ? 'merchant' : 'platform'),
    )

    source = migrateNativePrimitives(source)
    source = source
      .replace(/\buni\.showToast\b/g, 'appFeedback.showToast')
      .replace(/\buni\.hideToast\b/g, 'appFeedback.hideToast')
      .replace(/\buni\.showModal\b/g, 'appFeedback.showModal')
      .replace(/\buni\.showActionSheet\b/g, 'appFeedback.showActionSheet')
      .replace(/\buni\.showLoading\b/g, 'appFeedback.showLoading')
      .replace(/\buni\.hideLoading\b/g, 'appFeedback.hideLoading')
    source = source
      .replace(/\$jwIcon\("([^"]*)"\)/g, (_match, value) => `$jwIcon('${value.replace(/'/g, "\\'")}')`)
      .replace(/\$jwTagType\("([^"]*)"\)/g, (_match, value) => `$jwTagType('${value.replace(/'/g, "\\'")}')`)
      .replace(/:tip="\["([^"]*)", "([^"]*)"\]/g, (_match, title, desc) => `:tip="['${title.replace(/'/g, "\\'")}', '${desc.replace(/'/g, "\\'")}']`)
      .replace(/:tip="\["([^"]*)",/g, (_match, title) => `:tip="['${title.replace(/'/g, "\\'")}',`)
      .replace(/, "([^"]*)"\]\.filter/g, (_match, desc) => `, '${desc.replace(/'/g, "\\'")}'].filter`)
      .replace(/v-if=""([^"]*)""/g, (_match, value) => `v-if="'${value.replace(/'/g, "\\'")}'"`)
      .replace(/<text v-if="''" class="jw-section-sub">\{\{ '' \}\}<\/text>/g, '')
      .replace(/<text v-if="'([^']*)'" class="jw-section-sub">\{\{ "([^"]*)" \}\}<\/text>/g, '<text class="jw-section-sub">$2</text>')
      .replace(/<text v-if="[^"]*" class="jw-section-sub">/g, '<text class="jw-section-sub">')
      .replace(/@change="\(e\) =>/g, '@change="(e: any) =>')
      .replace(
        /:badge-props="item\.badge \? \{ value: item\.badge, max: 99 \} : undefined"/g,
        ':badge-props="(item as any).badge ? { value: (item as any).badge, max: 99 } : undefined"',
      )
    source = addFeedbackImport(source, filename)
    await fs.writeFile(filename, source)
  }
}
