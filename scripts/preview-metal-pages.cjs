// Static visual QA from real WXML/WXSS and native page data; never starts a backend or WeChat UI.
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { createRequire } = require('node:module')
const root = path.resolve('packages/ledger-mp/miniprogram')
const output = path.resolve('docs/金属计算器/ui-preview')
const appRequire = createRequire(path.resolve('packages/ledger-mp/package.json'))
appRequire('tsx/cjs')
const runtime =
  process.env.CODEX_NODE_MODULES ||
  '/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
const { chromium } = createRequire(path.join(runtime, 'package.json'))('playwright')
const app = {
  globalData: {
    token: 'visual-fixture',
    user: { id: 'visual-fixture' },
    membership: { active: true, perpetual: true },
  },
}
const kv = new Map()
let definition
const { MATERIALS } = appRequire('./miniprogram/subpackages/metal/data/materials.ts')
const prices = Object.fromEntries(MATERIALS.map((item) => [item.id, item.seedTonPriceYuan]))
let savedQuotes = []
global.getApp = () => app
global.getCurrentPages = () => []
global.Page = (value) => {
  definition = value
}
global.wx = {
  getStorageSync: (key) => kv.get(key) || '',
  setStorageSync: (key, value) => kv.set(key, structuredClone(value)),
  getStorageInfoSync: () => ({ keys: [...kv.keys()] }),
  removeStorageSync: (key) => kv.delete(key),
  showToast() {},
  showModal() {},
  navigateTo() {},
  reLaunch() {},
  navigateBack() {},
  request(options) {
    const data = options.url.includes('/config')
      ? { prices, updatedAt: '2026-09-30T08:00:00+08:00' }
      : savedQuotes
    options.success({ statusCode: 200, data: { code: 0, data } })
  },
}
function page(name) {
  appRequire('./miniprogram/subpackages/metal/' + name + '/index.ts')
  const instance = { ...definition, data: structuredClone(definition.data) }
  instance.setData = (patch, callback) => {
    Object.assign(instance.data, patch)
    callback?.()
  }
  return instance
}
const event = (key, value) => ({ currentTarget: { dataset: { key } }, detail: { value } })
const flush = () => new Promise((resolve) => setImmediate(resolve))
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')
const previewCss = (source) =>
  source.replace(/env\(safe-area-inset-bottom\)/g, 'var(--safe-bottom, 0px)')
const expandTags = (source) =>
  source.replace(/<([a-z][\w-]*)([^>]*?)\s*\/>/gi, (match, name, attributes) =>
    ['input', 'img', 'br'].includes(name) ? match : `<${name}${attributes}></${name}>`,
  )
async function fixtures() {
  const result = {}
  const add = (name, pageName, data) => {
    result[name] = {
      page: pageName,
      data: {
        _routeMotion: '',
        _routeBusy: false,
        _routeSlow: false,
        _routeTop: 0,
        ...structuredClone(data),
      },
    }
  }
  const index = page('index')
  add('categories', 'index', index.data)
  const samples = {
    plate: { lengthMm: '1000', widthMm: '2000', thicknessMm: '5', quantity: '1' },
    section: { model: '50*5', thicknessMm: '5', lengthM: '6' },
    squareTube: { outerLengthMm: '80', outerWidthMm: '40', thicknessMm: '2', lengthM: '6' },
    flatBar: { widthMm: '40', thicknessMm: '5', lengthM: '6' },
    roundTube: { diameterMm: '32', thicknessMm: '1.5', lengthM: '6' },
    roundBar: { diameterMm: '20', lengthM: '6' },
  }
  const { addMetalQuoteItem, readMetalQuoteDraft } = appRequire(
    './miniprogram/subpackages/metal/utils/quote.ts',
  )
  const { calculateMetal } = appRequire('./miniprogram/subpackages/metal/utils/calc.ts')
  for (const [category, dimensions] of Object.entries(samples)) {
    const calc = page('calc')
    calc.onLoad({ category })
    await flush()
    for (const [key, value] of Object.entries(dimensions)) calc.onFieldInput(event(key, value))
    calc.recalculate()
    add('calc-' + category, 'calc', calc.data)
    calc.saveHistoryAction()
    // Assign deterministic fixture IDs; rapid headless calls can share a millisecond.
    const historyKey = 'ledger_metal_history_v1:visual-fixture'
    const records = kv.get(historyKey)
    records[0].id = 'visual-' + category
    kv.set(historyKey, records)
    calc.saveFavorite()
    addMetalQuoteItem(calc.currentInput())
    if (category === 'section') {
      calc.onFieldInput(event('model', '未收录规格'))
      calc.recalculate()
      add('calc-unlisted', 'calc', calc.data)
      calc.toggleEstimate()
      calc.onEstimateInput(event('widthMm', '50'))
      calc.recalculate()
      add('calc-estimate', 'calc', calc.data)
    }
    if (category === 'plate') {
      calc.onKeyboardHeight({ detail: { height: 300 } })
      add('calc-keyboard', 'calc', calc.data)
      calc.onKeyboardHeight({ detail: { height: 0 } })
      calc.toggleSettings()
      add('calc-settings', 'calc', calc.data)
      add('calc-large', 'calc', {
        ...calc.data,
        totalPrice: '9,999,999,999.99',
        totalWeight: '999,999,999.999',
      })
    }
    calc.onUnload()
  }
  const history = page('history')
  history.onShow()
  add('history', 'history', history.data)
  history.switchTab({ currentTarget: { dataset: { tab: 'favorites' } } })
  add('favorites', 'history', history.data)
  add('history-empty', 'history', { ...history.data, rows: [], historyCount: 0, favoritesCount: 0 })
  const items = readMetalQuoteDraft().map((item) => {
    const calc = calculateMetal({
      materialId: item.materialId,
      dimensions: item.spec,
      density: item.density,
      tonPriceYuan: prices[item.materialId],
      quoteFactor: item.quoteFactor,
      processingFeeYuan: item.processingFeeFen / 100,
      sectionShape: item.sectionShape,
      estimateSection: item.estimateSection,
    })
    return {
      ...item,
      weightKg: calc.totalWeightKg,
      amountFen: Math.round(calc.amountYuan * 100),
      tonPriceFen: Math.round(calc.tonPriceYuan * 100),
    }
  })
  const totalWeightKg = items.reduce((sum, item) => sum + item.weightKg, 0)
  const totalAmountFen = items.reduce((sum, item) => sum + item.amountFen, 0)
  savedQuotes = [
    {
      id: 'visual',
      title: '青岛王先生 · 阳光房材料报价',
      items,
      totalWeightKg,
      totalAmountFen,
      createdAt: '2026-09-30T08:00:00+08:00',
    },
  ]
  const quote = page('quote')
  quote.onShow()
  await flush()
  quote.onTitle({ detail: { value: savedQuotes[0].title } })
  add('quote-draft', 'quote', quote.data)
  quote.showSavedList()
  add('quote-history', 'quote', quote.data)
  add('quote-error', 'quote', { ...quote.data, saved: [], quotesError: true })
  add('quote-loading', 'quote', { ...quote.data, saved: [], loadingQuotes: true })
  quote.openSaved({ currentTarget: { dataset: { id: 'visual' } } })
  add('quote-saved', 'quote', quote.data)
  add('quote-share', 'quote', {
    ...quote.data,
    imagePath: '/test/image.png',
    csvPath: '/test/quote.csv',
  })
  add('quote-long', 'quote', {
    ...quote.data,
    title: '客户名称很长的工程项目报价单'.repeat(4),
    totalAmount: '21,474,836.47',
    totalWeight: '999,999,999.999',
  })
  add('quote-empty', 'quote', { ...quote.data, view: 'draft', title: '', rows: [] })
  return result
}
async function main() {
  fs.mkdirSync(output, { recursive: true })
  const states = await fixtures()
  const templates = Object.fromEntries(
    ['index', 'calc', 'history', 'quote'].map((name) => [
      name,
      expandTags(read('subpackages/metal/' + name + '/index.wxml')),
    ]),
  )
  const images = Object.fromEntries(
    states.categories.data.categories.map((item) => [
      item.icon,
      'data:image/png;base64,' +
        fs.readFileSync(path.join(root, item.icon.slice(1))).toString('base64'),
    ]),
  )
  const styles = Object.fromEntries(
    ['index', 'calc', 'history', 'quote'].map((name) => [
      name,
      previewCss(read('subpackages/metal/' + name + '/index.wxss').replace(/@import[^;]+;/g, '')),
    ]),
  )
  const base = previewCss(
    read('styles/tokens.wxss').replace(/\bpage\s*\{/g, 'body {') +
      read('subpackages/metal/common.wxss') +
      read('components/lz-header/index.wxss'),
  )
  const payload = JSON.stringify({
    states,
    templates,
    styles,
    images,
    header: expandTags(read('components/lz-header/index.wxml')),
  }).replace(/</g, '\\u003c')
  const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>金属计算器 · 静态布局核查</title><style>
  *{box-sizing:border-box}body{margin:0;font-family:-apple-system,"PingFang SC",sans-serif}view,scroll-view{display:block}text{display:inline}scroll-view{overflow-x:auto}img{object-fit:contain}input{border:0;background:transparent;outline:none;font:inherit}button{display:flex;align-items:center;justify-content:center;line-height:1.2;font:inherit}button::after{border:0}canvas{display:block}.lz-bg{position:fixed;inset:0;z-index:-1;background:radial-gradient(120% 80% at 50% -10%,#f4f8f5 0%,#e7eeea 65%)}.lz-hd__back::after{content:'‹';font-size:28px;line-height:1}.lz-hd__titles{padding-right:65px} .proof{padding:6px 12px;color:#60766b;background:#f0f6f2;font-size:10px}.proof select{border:0;background:transparent;font:inherit;color:inherit;max-width:65%}
  ${base}</style><style id="pageStyles"></style><div class="proof">样式核查 · 非微信截图 <select id="states"></select></div><main id="app"></main><script>
  const {states,templates,styles,images,header}=${payload};
  const expr=(s,d)=>Function(...Object.keys(d),'return ('+s+');')(...Object.values(d));
  const text=(s,d)=>s.replace(/{{([\\s\\S]*?)}}/g,(_,x)=>String(expr(x,d)??''));
  const unbox=s=>s.replace(/^{{|}}$/g,'');
  function nodes(source,data){const result=document.createDocumentFragment();let matched=false;
    for(const n of source){if(n.nodeType===3){result.append(document.createTextNode(text(n.textContent,data)));continue}if(n.nodeType!==1)continue;
      const value=a=>expr(unbox(n.getAttribute(a)),data);
      if(n.hasAttribute('wx:if')){matched=!!value('wx:if');if(!matched)continue}else if(n.hasAttribute('wx:elif')){if(matched)continue;matched=!!value('wx:elif');if(!matched)continue}else if(n.hasAttribute('wx:else')){if(matched)continue;matched=true}else matched=false;
      if(n.hasAttribute('wx:for')){value('wx:for').forEach((item,index)=>{const clone=n.cloneNode(true);clone.removeAttribute('wx:for');result.append(nodes([clone],{...data,item,index}))});continue}
      if(n.tagName==='BLOCK'){result.append(nodes([...n.childNodes],data));continue}
      if(n.tagName==='LZ-ROUTE-FEEDBACK')continue;
      if(n.tagName==='LZ-HEADER'){const t=document.createElement('template');t.innerHTML=header;result.append(nodes([...t.content.childNodes],{title:text(n.getAttribute('title'),data),topPad:28,glass:false,navStyle:'',large:false,back:true,subtitle:''}));continue}
      const target=document.createElement(n.tagName==='LZ-BG'?'view':n.tagName==='IMAGE'?'img':n.tagName.toLowerCase());
      if(n.tagName==='LZ-BG')target.className='lz-bg';
      for(const a of n.attributes){if(a.name.startsWith('wx:')||a.name.startsWith('bind')||a.name.startsWith('catch'))continue;const v=text(a.value,data);if(['disabled','hidden'].includes(a.name)&&v==='false')continue;target.setAttribute(a.name,v)}
      if(n.tagName==='IMAGE'||n.tagName==='IMG')target.src=images[target.getAttribute('src')]||target.getAttribute('src');
      if(n.tagName==='INPUT')target.value=text(n.getAttribute('value')||'',data);
      target.append(nodes([...n.childNodes],data));result.append(target);
    }return result}
  window.render=name=>{const state=states[name];document.getElementById('pageStyles').textContent=styles[state.page];const t=document.createElement('template');t.innerHTML=templates[state.page];document.getElementById('app').replaceChildren(nodes([...t.content.childNodes],state.data));document.getElementById('states').value=name};
  for(const name of Object.keys(states)){const option=document.createElement('option');option.value=name;option.textContent=name;document.getElementById('states').append(option)}document.getElementById('states').onchange=e=>render(e.target.value);render('categories');
  </script></html>`
  fs.writeFileSync(path.join(output, 'pages.html'), html)
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.PREVIEW_BROWSER ||
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  })
  try {
    const page = await browser.newPage()
    const errors = [],
      checks = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setContent(html)
    for (const width of [320, 375, 430]) {
      await page.setViewportSize({ width, height: 812 })
      for (const name of Object.keys(states)) {
        await page.evaluate((name) => window.render(name), name)
        await page.evaluate(() => window.scrollTo(0, 0))
        assert(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `${name} overflows at ${width}`,
        )
        assert.equal(await page.locator('.metal-page').count(), 1)
        if (name === 'categories') {
          assert.equal(await page.locator('.metal-home__category').count(), 6)
          await page
            .locator('.metal-home__icon')
            .evaluateAll((images) => Promise.all(images.map((image) => image.decode())))
          assert(
            await page
              .locator('.metal-home__icon')
              .evaluateAll(
                (images) =>
                  images.length === 6 &&
                  images.every(
                    (image) => image.naturalWidth === 192 && image.naturalHeight === 192,
                  ),
              ),
          )
        }
        if (name === 'calc-plate') assert.equal(await page.locator('.metal-calc__field').count(), 4)
        if (name === 'history') assert.equal(await page.locator('.metal-history__row').count(), 6)
        if (name === 'quote-draft')
          assert.equal(await page.locator('.metal-quote__line').count(), 6)
        if (name === 'calc-keyboard') assert.equal(await page.locator('.metal-dock').count(), 0)
        if (name === 'quote-saved')
          assert.equal(await page.locator('.metal-quote__saved-list').count(), 0)
        if (name === 'calc-plate' && width >= 375) {
          assert(
            await page.evaluate(() => {
              const dockTop = document.querySelector('.metal-dock').getBoundingClientRect().top
              return ['.metal-calc__weight', '.metal-calc__amount'].every(
                (selector) =>
                  document.querySelector(selector).getBoundingClientRect().bottom < dockTop,
              )
            }),
            `primary results covered by dock at ${width}`,
          )
        }
        if (name === 'calc-large') {
          assert(
            await page.evaluate(() =>
              ['.metal-calc__weight', '.metal-calc__amount'].every((selector) => {
                const node = document.querySelector(selector),
                  bounds = node.getBoundingClientRect()
                return bounds.height < 35 && bounds.right <= innerWidth
              }),
            ),
            `large result wraps or overflows at ${width}`,
          )
        }
        if (await page.locator('.metal-dock').count()) {
          assert(
            await page.evaluate(() => {
              window.scrollTo(0, document.documentElement.scrollHeight)
              return (
                document.querySelector('.metal-disclaimer').getBoundingClientRect().bottom <=
                document.querySelector('.metal-dock').getBoundingClientRect().top
              )
            }),
            `last content covered by dock at ${name}@${width}`,
          )
          await page.evaluate(() => window.scrollTo(0, 0))
        }
        checks.push(`${name}@${width}: no horizontal overflow`)
        if (
          width === 375 &&
          [
            'categories',
            'calc-plate',
            'history',
            'quote-draft',
            'quote-history',
            'quote-saved',
            'quote-long',
            'calc-large',
          ].includes(name)
        ) {
          await page.screenshot({ path: path.join(output, name + '-375.png'), fullPage: true })
        }
      }
    }
    await page.setViewportSize({ width: 375, height: 812 })
    for (const name of ['calc-plate', 'quote-long']) {
      await page.evaluate((name) => {
        window.render(name)
        document.querySelector('.proof').style.display = 'none'
        document.documentElement.style.setProperty('--safe-bottom', '34px')
        document.querySelector('.lz-hd').style.paddingTop = '68px'
        window.scrollTo(0, 0)
      }, name)
      if (name === 'calc-plate')
        assert(
          await page.evaluate(() =>
            ['.metal-calc__weight', '.metal-calc__amount'].every(
              (selector) =>
                document.querySelector(selector).getBoundingClientRect().bottom <
                document.querySelector('.metal-dock').getBoundingClientRect().top,
            ),
          ),
          'safe-area dock covers primary result',
        )
      assert(
        await page.evaluate(() => {
          window.scrollTo(0, document.documentElement.scrollHeight)
          return (
            document.querySelector('.metal-disclaimer').getBoundingClientRect().bottom <=
              document.querySelector('.metal-dock').getBoundingClientRect().top &&
            document.documentElement.scrollWidth <= innerWidth
          )
        }),
        `safe-area layout fails for ${name}`,
      )
      checks.push(`${name}@375: 60px status area and 34px bottom safe area`)
    }
    assert.deepEqual(errors, [])
    const report = {
      source:
        'Actual WXML/WXSS with native handler data and mocked wx APIs, rendered in headless Chromium. Not WeChat runtime.',
      states: Object.keys(states).length,
      checks,
      pageErrors: errors,
      nativeDeviceVerified: false,
    }
    fs.writeFileSync(
      path.join(output, 'visual-checks.json'),
      JSON.stringify(report, null, 2) + '\n',
    )
    console.log(
      JSON.stringify({ states: report.states, checks: checks.length, pageErrors: errors }),
    )
  } finally {
    await browser.close()
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
