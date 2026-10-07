const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const pageDir = path.resolve(__dirname, '../miniprogram/pages/home')
const typescript = require(
  require.resolve('typescript', { paths: [path.resolve(pageDir, '../../../')] }),
)
const source = fs.readFileSync(path.join(pageDir, 'home-logic.ts'), 'utf8')
const compiled = typescript.transpileModule(source, {
  compilerOptions: {
    module: typescript.ModuleKind.CommonJS,
    target: typescript.ScriptTarget.ES2018,
  },
}).outputText
const runtimeModule = { exports: {} }
new Function('exports', 'module', compiled)(runtimeModule.exports, runtimeModule)
const { buildHomeStatsViewModel, currentHomeBucket, homePeriodLabel, homeSeriesTitle } =
  runtimeModule.exports

function test(name, callback) {
  callback()
  console.log('PASS', name)
}

test('period labels and series titles keep the existing copy', () => {
  assert.equal(homePeriodLabel('day'), '今日')
  assert.equal(homePeriodLabel('month'), '本月')
  assert.equal(homePeriodLabel('year'), '本年')
  assert.equal(homePeriodLabel('invalid'), '本年')
  assert.equal(homeSeriesTitle('day', 2026), '本月每日')
  assert.equal(homeSeriesTitle('month', 2026), '2026 年各月')
  assert.equal(homeSeriesTitle('year', 2026), '近 5 年')
})

test('current bucket follows the selected period', () => {
  const buckets = [
    { label: '一月', profit: 10, revenue: 20, cost: 5, count: 1 },
    { label: '二月', profit: 30, revenue: 40, cost: 8, count: 2 },
    { label: '三月', profit: 50, revenue: 60, cost: 9, count: 3 },
  ]
  assert.equal(currentHomeBucket('day', buckets, new Date(2026, 1, 2)).profit, 30)
  assert.equal(currentHomeBucket('month', buckets, new Date(2026, 1, 2)).profit, 30)
  assert.equal(currentHomeBucket('year', buckets, new Date(2026, 1, 2)).profit, 50)
  assert.equal(currentHomeBucket('month', [], new Date(2026, 1, 2)).profit, 0)
})

test('stats mapping preserves dashboard values, formatting and caps goal progress', () => {
  const view = buildHomeStatsViewModel({
    series: {
      buckets: [
        { label: '2025', profit: 10, revenue: 20, cost: 5, count: 1 },
        { label: '2026', profit: 90, revenue: 120, cost: 40, count: 3 },
      ],
    },
    overview: {
      cost: 40,
      monthProfit: 90,
      costSlices: [
        { key: 'profile', name: '型材', value: 20 },
        { key: 'unknown', name: '其他', value: 20 },
      ],
      topOrders: [{ id: 'o1', customer: '张三', date: '2026-10-01', profit: 90, margin: 0.25 }],
      goal: { monthly: 100 },
      goalProgress: { monthly: 1.2 },
    },
    period: 'year',
    year: 2026,
    formatMoney: (value) => `¥${value}`,
    formatProfit: (value) => `P${value}`,
  })
  assert.deepEqual(view.profitBars, [
    { label: '2025', value: 10 },
    { label: '2026', value: 90 },
  ])
  assert.deepEqual(view.countBars, [
    { label: '2025', value: 1 },
    { label: '2026', value: 3 },
  ])
  assert.equal(view.profitBare, 'P90')
  assert.equal(view.revenueText, '¥120')
  assert.equal(view.avgText, '¥30')
  assert.equal(view.goalTargetText, '¥100')
  assert.equal(view.goalPct, 100)
  assert.deepEqual(view.donut, [
    { value: 20, color: 'c1' },
    { value: 20, color: 'c6' },
  ])
  assert.equal(view.legend[0].pct, 50)
  assert.equal(view.tops[0].margin, 25)
})

const wxml = fs.readFileSync(path.join(pageDir, 'index.wxml'), 'utf8')
const page = fs.readFileSync(path.join(pageDir, 'index.ts'), 'utf8')
test('template and page keep every existing home interaction', () => {
  for (const binding of [
    'toLogin',
    'onAd',
    'onHeroTouchStart',
    'onHeroTouchMove',
    'onHeroTouchEnd',
    'toTriangleTool',
    'toArcTool',
    'toCut',
    'toWorkLog',
    'toFormat',
    'toMoreTools',
    'onPeriod',
    'toCost',
    'toGoal',
    'toMsg',
    'toOrder',
    'retry',
    'closeChangelog',
    'noopClog',
  ]) {
    assert.match(
      wxml,
      new RegExp(
        `(?:bindtap|catchtap|bindchange|bindtouchstart|bindtouchmove|bindtouchend)=\\"${binding}\\"`,
      ),
      binding,
    )
    assert.match(page, new RegExp(`\\b${binding}\\s*\\(`), binding)
  }
  for (const marker of ['home__tools', 'home__hero', 'home__section', 'clog-mask']) {
    assert.match(wxml, new RegExp(`class=\\"[^\\"]*${marker}`), marker)
  }
  assert.match(wxml, /<lz-route-feedback\b/, 'lz-route-feedback')
})

console.log(
  'home page logic verified: periods, bucket selection, stats mapping, and template interactions',
)
