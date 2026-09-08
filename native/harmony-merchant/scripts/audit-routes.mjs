#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.join(root, 'entry/src/main/ets')
const routeMapPath = path.join(root, 'entry/src/main/resources/base/profile/route_map.json')

function filesIn(folder) {
  const files = []
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const current = path.join(folder, entry.name)
    if (entry.isDirectory()) files.push(...filesIn(current))
    else if (current.endsWith('.ets')) files.push(current)
  }
  return files
}

const routeMap = JSON.parse(fs.readFileSync(routeMapPath, 'utf8'))
const declared = new Map()
const errors = []

for (const route of routeMap.routerMap || []) {
  if (declared.has(route.name)) errors.push(`Duplicate route name: ${route.name}`)
  declared.set(route.name, route)
  const source = path.join(root, 'entry', route.pageSourceFile)
  if (!fs.existsSync(source)) errors.push(`Route ${route.name} points to missing source: ${route.pageSourceFile}`)
  else if (!fs.readFileSync(source, 'utf8').includes(route.buildFunction)) {
    errors.push(`Route ${route.name} is missing builder ${route.buildFunction}`)
  }
}

const referenced = new Set()
const staticRoutePattern = /AppRouter\.(?:push|replace)\(\s*['"]([A-Za-z0-9_-]+)['"]/g
for (const file of filesIn(sourceRoot)) {
  const source = fs.readFileSync(file, 'utf8')
  let match
  while ((match = staticRoutePattern.exec(source)) !== null) referenced.add(match[1])
}

for (const route of referenced) {
  if (!declared.has(route)) errors.push(`Static navigation target is not declared: ${route}`)
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log(`Native route audit passed: ${declared.size} routes declared, ${referenced.size} static targets resolved.`)
