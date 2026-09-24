// Deterministic source/asset coverage checks, not a substitute for WeChat device screenshots.
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const crypto = require('node:crypto')
const assert = require('node:assert/strict')
const sharp = require('../packages/server/node_modules/sharp')
const ts = require('../packages/ledger-mp/node_modules/typescript')
const root = path.resolve('packages/ledger-mp/miniprogram')
const docs = path.resolve('docs/记工系统/assets/generated-icons')
const read = (file) => fs.readFileSync(file, 'utf8')
const hash = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex')
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
const roots = [
  'pages/work-log',
  'subpackages/workbook',
  'components/workbook-header',
  'components/workbook-nav',
  'components/workbook-icon',
]
const files = roots.flatMap((p) => walk(path.join(root, p)))
const attr = (s, name) => s.match(new RegExp('(?:^|\\s)' + name + '="([^"]*)"'))?.[1]

function capture(relative, registration) {
  let definition
  const exports = {}
  const messages = []
  const source = ts.transpileModule(read(path.join(root, relative)), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  vm.runInNewContext(source, {
    exports,
    require(id) {
      if (id.endsWith('utils/page-transition')) return { navigation: {} }
      throw Error('Unexpected icon component dependency: ' + id)
    },
    [registration]: (d) => {
      definition = d
    },
    console: { error: (...args) => messages.push(args) },
  })
  return { definition, exports, messages }
}

async function main() {
  const manifest = JSON.parse(read(path.join(docs, 'manifest.json')))
  const processed = JSON.parse(read(path.join(docs, 'processed.json')))
  const component = capture('components/workbook-icon/index.ts', 'Component')
  const names = Array.from(component.exports.WORKBOOK_ICON_NAMES)
  assert.equal(names.length, 30)
  assert.deepEqual([...names].sort(), manifest.map((x) => x.name).sort())
  assert.equal(
    new Set(processed.map((x) => x.sourceSha256)).size,
    names.length,
    'Every semantic icon has a distinct generation',
  )
  const used = new Set()
  let iconNodes = 0
  const pageCoverage = {}
  for (const file of files.filter((f) => f.endsWith('.wxml'))) {
    const source = read(file)
    assert(!/<(?:lz-icon|lz-header|icon)\b/.test(source), file + ': old glyph component')
    assert(!/[＋▾›✓✕▼▲◀▶←→]/.test(source), file + ': literal icon glyph')
    assert(!/\bloading=/.test(source), file + ': native loading glyph')
    const stack = []
    let count = 0
    // Respect quoted attributes containing comparison operators and multiline closing tags.
    for (const m of source.matchAll(/<(\/?)([\w-]+)((?:[^"'<>]|"[^"]*"|'[^']*')*)>/g)) {
      const [, closing, tag, attributes] = m
      if (closing) {
        assert.equal(stack.pop(), tag, file + ': nesting')
        continue
      }
      if (tag === 'workbook-icon') {
        assert(!stack.includes('text'), file + ': image nested in text')
        const name = attr(attributes, 'name')
        assert(name)
        count++
        if (!name.startsWith('{{')) {
          assert(names.includes(name), file + ': unknown icon ' + name)
          used.add(name)
        } else if (name !== '{{item.icon}}') {
          const expr = ts.createSourceFile(
            'name.ts',
            '(' + name.slice(2, -2) + ')',
            ts.ScriptTarget.Latest,
            true,
          )
          function checkBranch(node) {
            if (ts.isParenthesizedExpression(node)) return checkBranch(node.expression)
            if (ts.isConditionalExpression(node)) {
              checkBranch(node.whenTrue)
              checkBranch(node.whenFalse)
              return
            }
            assert(ts.isStringLiteral(node), file + ': unsupported dynamic icon')
            assert(names.includes(node.text), file + ': missing generated branch ' + node.text)
            used.add(node.text)
          }
          checkBranch(expr.statements[0].expression)
        }
      }
      if (tag === 'image' && !file.includes('workbook-icon'))
        assert.equal(
          attr(attributes, 'class'),
          'wb-proof',
          'Only user proof images may bypass workbook-icon',
        )
      if (!/\/\s*$/.test(attributes)) stack.push(tag)
    }
    assert.equal(stack.length, 0, file + ': unclosed tag')
    pageCoverage[path.relative(root, file).replaceAll('\\', '/')] = count
    iconNodes += count
  }
  // Dynamic navigation and export format lists must also resolve to generated assets.
  const nav = capture('components/workbook-nav/index.ts', 'Component').definition
  for (const item of nav.data.items) {
    assert(names.includes(item.icon))
    used.add(item.icon)
  }
  const reportSource = read(path.join(root, 'subpackages/workbook/reports/index.ts'))
  for (const m of reportSource.matchAll(/icon:\s*'([^']+)'/g))
    if (m[1] !== 'none') {
      assert(names.includes(m[1]))
      used.add(m[1])
    }
  assert.deepEqual([...used].sort(), [...names].sort(), 'No unused or missing semantic icons')
  for (const file of [
    ...files,
    path.join(root, 'utils/workbook/page.wxss'),
    path.join(root, 'utils/workbook/filter.wxss'),
  ].filter((f) => f.endsWith('.wxss'))) {
    const css = read(file)
    assert(
      !/data:image\/svg|url\(|rotate\(-?45deg\)|border-(?:left|right):\s*\d+px\s+solid\s+transparent/.test(
        css,
      ),
      file + ': CSS-drawn icon',
    )
  }
  for (const file of files.filter((f) => f.endsWith('.json'))) {
    const config = JSON.parse(read(file))
    assert(
      !config.usingComponents?.['lz-icon'] && !config.usingComponents?.['lz-header'],
      file + ': old icon dependency',
    )
  }
  for (const file of files.filter((f) => f.endsWith('.ts'))) {
    for (const toast of read(file).matchAll(/wx\.showToast\(\{([^{}]*)\}\)/g))
      assert(
        /icon:\s*'none'|image:\s*'\/assets\/workbook-icons\/check.png'/.test(toast[1]),
        file + ': native toast glyph',
      )
  }
  for (const page of ['edit', 'finance']) {
    const source = read(path.join(root, 'subpackages/workbook', page, 'index.wxml'))
    assert(source.includes('class="wb-generated-checkbox"'))
    assert(
      /<checkbox\s[^>]*value="{{item.id}}"[^>]*checked="{{item.chosen}}"/.test(source),
      'Keep checkbox form semantics',
    )
  }
  const state = {
    data: { ...component.definition.data },
    properties: { name: 'home', size: 26 },
    patches: [],
    setData(value) {
      this.patches.push(value)
      Object.assign(this.data, value)
    },
  }
  state.resolve = component.definition.methods.resolve.bind(state)
  component.definition.observers['name,size'].call(state, 'home', 26)
  component.definition.lifetimes.attached.call(state)
  assert.equal(
    state.patches.length,
    1,
    'Property observer + attached must not submit duplicate render patches',
  )
  state.resolve('home', 26)
  assert.equal(state.patches.length, 1, 'An unchanged icon must not cause another render patch')
  const iconTemplate = read(path.join(root, 'components/workbook-icon/index.wxml'))
  assert(
    !/wx:(?:if|elif|else|for)\s*=/.test(iconTemplate),
    'The virtual-host icon must keep a stable image root',
  )
  for (const name of names) {
    state.resolve(name, 26)
    assert.equal(state.data.src, '/assets/workbook-icons/' + name + '.png')
    assert.equal(state.data.displaySize, 26)
  }
  state.resolve('missing', 26)
  assert.equal(state.data.src, '')
  assert.equal(component.messages.length, 1)
  state.resolve('home', 0)
  assert.equal(state.data.displaySize, 22)
  state.resolve('home', 1000)
  assert.equal(state.data.displaySize, 80)
  state.resolve('home', -1)
  assert.equal(state.data.displaySize, 14)
  let bytes = 0
  for (const item of processed) {
    const source = fs.readFileSync(path.resolve(item.source))
    const final = fs.readFileSync(path.resolve(item.output))
    assert.equal(hash(source), item.sourceSha256)
    assert.equal(hash(final), item.sha256)
    assert(
      /softwareAgent.{0,35}gpt-image.{0,15}version.{0,5}2\.0/s.test(source.toString('latin1')),
      item.name + ': source generation provenance',
    )
    const metadata = await sharp(final).metadata()
    assert.equal(metadata.width, 128)
    assert.equal(metadata.height, 128)
    assert(metadata.hasAlpha)
    const { data, info } = await sharp(final)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    let transparent = 0
    for (let i = 3; i < data.length; i += 4) if (!data[i]) transparent++
    assert(
      transparent > info.width * info.height * 0.2,
      item.name + ': real transparent background',
    )
    assert.equal(data[3], 0)
    assert.equal(data[data.length - 1], 0)
    bytes += final.length
  }
  const mainSourceBytes = walk(root)
    .filter((f) => !f.includes(path.sep + 'subpackages' + path.sep))
    .reduce((n, f) => n + fs.statSync(f).size, 0)
  const result = {
    status: 'passed',
    icons: names.length,
    iconNodes,
    iconBytes: bytes,
    mainSourceBytes,
    pageCoverage,
    sourceProvenance:
      'All 30 original PNGs contain gpt-image version 2.0 in C2PA softwareAgent metadata',
    runtimeScreenshotVerified: false,
  }
  fs.writeFileSync(path.join(docs, 'verification.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
}
main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
