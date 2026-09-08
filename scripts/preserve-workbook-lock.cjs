// Keep existing workspace peer resolutions; adding a native test SDK must not
// downgrade the unrelated uni-app applications' @vueuse/core peers.
const fs = require('node:fs'),
  cp = require('node:child_process')
const old = cp.execFileSync('git', ['show', 'HEAD:pnpm-lock.yaml'], { encoding: 'utf8' }),
  next = fs.readFileSync('node_modules/.pnpm/lock.yaml', 'utf8')
function section(s, name) {
  const start = s.indexOf(name + ':\n')
  if (start < 0) throw Error(name)
  const rest = s.slice(start + name.length + 2)
  const end = rest.search(/^\S/m)
  return end < 0 ? rest : rest.slice(0, end)
}
function blocks(s) {
  const re = /^  \S[^\n]*\n/gm
  const matches = [...s.matchAll(re)]
  const map = new Map()
  for (let i = 0; i < matches.length; i++) {
    const x = matches[i]
    map.set(
      x[0].replace(/:\s*\{\}\s*$/, ':\n'),
      s.slice(x.index, matches[i + 1]?.index || s.length),
    )
  }
  return map
}
let imports = section(old, 'importers')
const ledger = blocks(section(next, 'importers')).get('  packages/ledger-mp:\n')
if (!ledger) throw Error('missing ledger importer')
const oldLedger = blocks(imports).get('  packages/ledger-mp:\n')
imports = imports.replace(oldLedger, ledger)
let output = old.slice(0, old.indexOf('importers:\n')) + 'importers:\n' + imports
for (const name of ['packages', 'snapshots']) {
  const a = blocks(section(old, name)),
    b = blocks(section(next, name))
  for (const [k, v] of b) if (!a.has(k)) a.set(k, v)
  output +=
    name +
    ':\n\n' +
    [...a]
      .sort((a, b) => a[0].localeCompare(b[0], 'en'))
      .map((x) => x[1].trimEnd() + '\n\n')
      .join('')
}
fs.writeFileSync('pnpm-lock.yaml', output.trimEnd() + '\n')
