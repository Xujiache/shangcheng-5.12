import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')
const service = read('src/modules/merchant/merchant.service.ts')
const controller = read('src/modules/merchant/merchant.controller.ts')
const files = read('src/modules/files/files.service.ts')
const thumbnail = read('src/modules/files/image-thumbnail.util.ts')
const backfill = read('scripts/backfill-image-thumbnails.ts')
const errors = []

if (!controller.includes("@Get('plaza/filter-options')"))
  errors.push('filter-options route is missing')
if (!service.includes('excludedPlazaMerchantIds'))
  errors.push('plaza queries must exclude current/internal merchants')
for (const field of ['productImageThumb', 'logoThumb']) {
  if (!service.includes(field)) errors.push(`compatible response field is missing: ${field}`)
}
if (!service.includes('where.tags = { has: q.tags }'))
  errors.push('product tag filter is not applied')
if (!files.includes('try {') || !files.includes('thumbnail failed for')) {
  errors.push('thumbnail failure must remain best-effort')
}
if (!thumbnail.includes('thumb/v1/') || !thumbnail.includes('.webp'))
  errors.push('stable v1 webp path is missing')
if (!backfill.includes('statObject') || !backfill.includes('--confirm-production')) {
  errors.push('idempotent, production-safe backfill is missing')
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(
  'Harmony plaza backend audit passed: filters, compatible thumbnails and idempotent backfill are enforced.',
)
