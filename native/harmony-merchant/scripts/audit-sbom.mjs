import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sbom = JSON.parse(fs.readFileSync(path.join(root, 'docs/sbom.cdx.json'), 'utf8'))
const rootLock = fs.readFileSync(path.join(root, 'oh-package-lock.json5'), 'utf8')
const entryLock = fs.readFileSync(path.join(root, 'entry/oh-package-lock.json5'), 'utf8')
const notices = fs.readFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8')
const normalizedNotices = notices.toLowerCase()

const expected = [
  { group: '@ibestservices', name: 'ibest-ui', version: '2.2.7', license: 'MIT', lock: entryLock },
  { group: '@ohos', name: 'hypium', version: '1.0.24', license: 'Apache-2.0', lock: rootLock },
  { group: '@ohos', name: 'hamock', version: '1.0.0', license: 'Apache-2.0', lock: rootLock }
]

const errors = []
if (sbom.bomFormat !== 'CycloneDX' || sbom.specVersion !== '1.5') {
  errors.push('SBOM must be CycloneDX 1.5')
}
if (sbom.metadata?.component?.name !== 'jingwei-merchant-harmony' ||
  sbom.metadata?.component?.version !== '1.0.0') {
  errors.push('SBOM application identity is incorrect')
}

for (const item of expected) {
  const component = sbom.components?.find((value) =>
    value.group === item.group && value.name === item.name && value.version === item.version)
  if (!component) {
    errors.push(`SBOM is missing ${item.group}/${item.name}@${item.version}`)
    continue
  }
  const licenseIds = (component.licenses || []).map((value) => value.license?.id || '')
  if (!licenseIds.includes(item.license)) {
    errors.push(`SBOM has the wrong license for ${item.name}`)
  }
  if (!item.lock.includes(`\"name\": \"${item.group}/${item.name}\"`) ||
    !item.lock.includes(`\"version\": \"${item.version}\"`)) {
    errors.push(`dependency lock does not match ${item.group}/${item.name}@${item.version}`)
  }
  if (!normalizedNotices.includes(item.name.toLowerCase()) ||
    !normalizedNotices.includes(item.version.toLowerCase()) ||
    !normalizedNotices.includes(item.license.toLowerCase())) {
    errors.push(`THIRD_PARTY_NOTICES is missing ${item.name}@${item.version} ${item.license}`)
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`CycloneDX SBOM audit passed: ${expected.length} locked dependencies and licenses verified.`)
