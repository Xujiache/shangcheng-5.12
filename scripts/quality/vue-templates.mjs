import fs from 'node:fs'
import path from 'node:path'
import { parse, compileTemplate } from '@vue/compiler-sfc'
import { root } from './source.mjs'
import { preprocess } from './uni-processor.mjs'
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
let count = 0
for (const pkg of ['user-mp', 'merchant-app', 'platform-app']) {
  for (const filename of walk(path.join(root, 'packages', pkg, 'src')).filter((f) =>
    f.endsWith('.vue'),
  )) {
    for (const text of preprocess(fs.readFileSync(filename, 'utf8'))) {
      const { descriptor, errors } = parse(text, { filename })
      if (errors.length) throw Error(filename + ': ' + errors.join('; '))
      if (descriptor.template) {
        const result = compileTemplate({
          source: descriptor.template.content,
          filename,
          id: 'quality-template',
        })
        if (result.errors.length) throw Error(filename + ': ' + result.errors.join('; '))
      }
    }
    count++
  }
}
console.log(
  'Vue template syntax checked across uni targets: ' +
    count +
    ' files (not native runtime acceptance)',
)
