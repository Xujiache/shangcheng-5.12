import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

// Parse only. Never invokes Hvigor, type-checking, transpilation or packaging.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const loader = process.argv[2] || process.env.HARMONY_ETS_LOADER ||
  '/opt/harmony-command-line-tools-api26/sdk/default/openharmony/ets/build-tools/ets-loader'
const require = createRequire(import.meta.url)
const ts = require(path.join(loader, 'node_modules/typescript'))
const options = JSON.parse(fs.readFileSync(path.join(loader, 'tsconfig.json'), 'utf8')).compilerOptions
const sourceRoot = path.join(root, 'entry/src/main/ets')
let errors = 0
let files = 0
for (const relative of fs.readdirSync(sourceRoot, { recursive: true })) {
  if (!relative.endsWith('.ets')) continue
  const file = path.join(sourceRoot, relative)
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.ETS, options)
  files++
  for (const diagnostic of source.parseDiagnostics) {
    const at = source.getLineAndCharacterOfPosition(diagnostic.start)
    console.error(`${relative}:${at.line + 1}:${at.character + 1}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`)
    errors++
  }
}
console.log(`ArkUI syntax audit: ${files} source files, ${errors} parse errors; no build artifacts generated.`)
process.exitCode = errors ? 1 : 0
