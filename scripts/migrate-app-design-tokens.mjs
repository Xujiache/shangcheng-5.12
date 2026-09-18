#!/usr/bin/env node

import { promises as fs } from 'node:fs'
import path from 'node:path'

const roots = [path.resolve('packages/merchant-app/src'), path.resolve('packages/platform-app/src')]
const replacements = [
  [/background(?:-color)?:\s*#(?:fff|ffffff)\s*;/gi, 'background: var(--bg-card);'],
  [/background(?:-color)?:\s*#f7f8fa\s*;/gi, 'background: var(--bg-page);'],
  [/background(?:-color)?:\s*#f5f6f8\s*;/gi, 'background: var(--bg-page);'],
  [/color:\s*#(?:1d2129|1a1a2e)\s*;/gi, 'color: var(--text-primary);'],
  [/color:\s*#4e5969\s*;/gi, 'color: var(--text-secondary);'],
  [/color:\s*#86909c\s*;/gi, 'color: var(--text-tertiary);'],
  [/color:\s*#c9cdd4\s*;/gi, 'color: var(--text-disabled);'],
  [/(border(?:-top|-bottom|-left|-right)?):\s*1rpx\s+solid\s+#(?:e5e6eb|f0f2f5|f2f3f5)\s*;/gi, '$1: 1rpx solid var(--border-light);'],
]

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) await walk(target)
    else if (entry.isFile() && entry.name.endsWith('.vue')) {
      let source = await fs.readFile(target, 'utf8')
      for (const [pattern, replacement] of replacements) source = source.replace(pattern, replacement)
      await fs.writeFile(target, source)
    }
  }
}

for (const root of roots) await walk(root)
