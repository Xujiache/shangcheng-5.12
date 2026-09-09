// Reproducible vendor adaptation for both DevEco Run and command-line Hvigor.
// Only listed, checksum-verified upstream resources may be replaced.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const root = path.resolve(__dirname, '..')
const vendor = path.join(root, 'third_party/ibest-ui/library')
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex')
const canonical = (b) => Buffer.from(b.toString().replace(/\r\n/g, '\n'))
const manifest = require('./generated-vendor-resources.json')
for (const item of manifest) {
  const target = path.join(vendor, item.target)
  let replacement = fs.readFileSync(path.join(root, item.source))
  if (item.textReplacement) {
    const edit = JSON.parse(replacement.toString())
    const current = canonical(fs.readFileSync(target)).toString()
    const original = current.includes(edit.replace)
      ? current.replace(edit.replace, edit.find)
      : current
    if (hash(Buffer.from(original)) !== item.originalSha256 || !original.includes(edit.find)) {
      throw new Error('Unreviewed vendor edit: ' + item.target)
    }
    replacement = Buffer.from(original.replace(edit.find, edit.replace))
  }
  if (fs.existsSync(target)) {
    const bytes = fs.readFileSync(target)
    const current = hash(canonical(bytes))
    if (
      current !== item.originalSha256 &&
      hash(bytes) !== hash(replacement) &&
      current !== hash(canonical(replacement))
    ) {
      throw new Error(
        'Unreviewed vendor edit; preserve and review before icon adaptation: ' + item.target,
      )
    }
  } else if (!item.pngTarget) throw new Error('Missing vendor dependency: ' + item.target)
  if (item.pngTarget) {
    fs.copyFileSync(path.join(root, item.source), path.join(vendor, item.pngTarget))
    if (fs.existsSync(target)) fs.unlinkSync(target)
  } else if (!fs.existsSync(target) || !fs.readFileSync(target).equals(replacement))
    fs.writeFileSync(target, replacement)
}
