import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const source = fileURLToPath(
  new URL('../packages/ledger-mp/miniprogram/utils/workbook/domain.ts', import.meta.url),
)
const target = fileURLToPath(
  new URL('../packages/server/src/modules/ledger/workbook/domain.ts', import.meta.url),
)
if (process.argv.includes('--write')) {
  mkdirSync(
    fileURLToPath(new URL('../packages/server/src/modules/ledger/workbook', import.meta.url)),
    { recursive: true },
  )
  writeFileSync(target, readFileSync(source))
} else if (readFileSync(source, 'utf8') !== readFileSync(target, 'utf8'))
  throw new Error('Workbook domain mirror drift; run node scripts/workbook-contract.mjs --write')
console.log('Workbook contract identical')
