#!/usr/bin/env node

import { promises as fs } from 'node:fs'
import path from 'node:path'

const roots = [
  path.resolve('packages/merchant-app/src/pages'),
  path.resolve('packages/platform-app/src/pages'),
]

const feedbackHosts = `
    <wd-toast selector="global" />
    <wd-message-box selector="global" />
    <wd-action-sheet
      :model-value="$jwFeedbackState.actionVisible"
      :actions="$jwFeedbackState.actionItems"
      cancel-text="取消"
      root-portal
      @update:model-value="$jwFeedbackState.setActionVisible"
      @select="$jwFeedbackState.selectAction"
      @cancel="$jwFeedbackState.cancelAction"
    />`

async function collectVueFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name)
      if (entry.isDirectory()) return collectVueFiles(target)
      return entry.isFile() && entry.name.endsWith('.vue') ? [target] : []
    }),
  )
  return nested.flat()
}

for (const root of roots) {
  for (const filename of await collectVueFiles(root)) {
    const source = await fs.readFile(filename, 'utf8')
    if (source.includes('<wd-config-provider')) {
      if (source.includes('<wd-toast selector="global"')) continue
      const marker = '    custom-class="jw-theme-root"\n  >'
      if (!source.includes(marker)) throw new Error(`无法定位 Wot Provider：${filename}`)
      await fs.writeFile(filename, source.replace(marker, marker + feedbackHosts))
      continue
    }
    const open = '<template>'
    const close = '</template>'
    const openIndex = source.indexOf(open)
    const closeIndex = source.lastIndexOf(close)
    if (openIndex < 0 || closeIndex < 0 || closeIndex <= openIndex) {
      throw new Error(`无法识别 Vue 模板：${filename}`)
    }
    const wrapped =
      source.slice(0, openIndex + open.length) +
      '\n  <wd-config-provider\n    :theme="$jwTheme.resolvedTheme"\n    :theme-vars="$jwTheme.themeVars"\n    custom-class="jw-theme-root"\n  >' +
      feedbackHosts +
      source.slice(openIndex + open.length, closeIndex) +
      '\n  </wd-config-provider>\n' +
      source.slice(closeIndex)
    await fs.writeFile(filename, wrapped)
  }
}
