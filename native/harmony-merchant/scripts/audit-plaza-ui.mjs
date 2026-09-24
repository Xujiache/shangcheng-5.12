import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')
const plaza = read('entry/src/main/ets/features/plaza/PlazaPage.ets')
const repository = read('entry/src/main/ets/features/business/BusinessRepository.ets')
const image = read('entry/src/main/ets/core/ui/ResilientRemoteImage.ets')
const errors = []

for (const field of ['draftTag', 'draftRegion', 'draftCategory', 'draftMinRating']) {
  if (!plaza.includes(field)) errors.push(`staged filter field is missing: ${field}`)
}
if (!plaza.includes("backgroundColor('#78000000')")) errors.push('filter overlay must include a blocking scrim')
if (!plaza.includes('applyFilters()')) errors.push('filters must be applied in one explicit action')
if (!plaza.includes('showVisibility')) errors.push('visibility setting must be independent from filters')
if (!repository.includes('/m/plaza/filter-options')) errors.push('filter-options endpoint is not wired')
if (!plaza.includes('ResilientRemoteImage')) errors.push('plaza cards must use resilient remote images')
if (!image.includes('this.originalUrl') || !image.includes('.onError')) {
  errors.push('remote images must fall back from thumbnail to original')
}
if (!image.includes('sourceSize({ width: 480, height: 480 })')) {
  errors.push('remote image decoding must be bounded')
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('Plaza UI audit passed: staged filters, blocking overlay and thumbnail fallback are enforced.')
