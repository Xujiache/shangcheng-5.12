import fs from 'node:fs'
const root = 'packages/ledger-mp/miniprogram/'
for (const page of ['records', 'edit', 'people', 'finance', 'reports']) {
  const dir = root + 'subpackages/workbook/' + page
  fs.writeFileSync(
    dir + '/index.json',
    JSON.stringify(
      {
        navigationStyle: 'custom',
        usingComponents: {
          'lz-header': '/components/lz-header/index',
          'workbook-nav': '/components/workbook-nav/index',
        },
      },
      null,
      2,
    ) + '\n',
  )
  fs.writeFileSync(dir + '/index.wxss', '@import "../../../utils/workbook/page.wxss";\n')
  const f = dir + '/index.wxml'
  fs.writeFileSync(
    f,
    fs.readFileSync(f, 'utf8').replaceAll('&amp;&amp;', '&&').replaceAll('<br/>', '\n'),
  )
}
const appFile = root + 'app.json'
const app = JSON.parse(fs.readFileSync(appFile, 'utf8'))
app.subPackages = (app.subPackages || []).filter((s) => s.root !== 'subpackages/workbook')
app.subPackages.push({
  root: 'subpackages/workbook',
  pages: ['records/index', 'edit/index', 'people/index', 'finance/index', 'reports/index'],
})
fs.writeFileSync(appFile, JSON.stringify(app, null, 2) + '\n')
const appTs = root + 'app.ts'
let appCode = fs.readFileSync(appTs, 'utf8')
if (!appCode.includes("'pages/work-log/index',"))
  appCode = appCode.replace(
    "  'pages/cut/index',",
    "  'pages/cut/index',\n  'pages/work-log/index',\n  'subpackages/workbook/records/index',\n  'subpackages/workbook/edit/index',\n  'subpackages/workbook/people/index',\n  'subpackages/workbook/finance/index',\n  'subpackages/workbook/reports/index',",
  )
fs.writeFileSync(appTs, appCode)
const home = root + 'pages/home/index.wxml'
let html = fs.readFileSync(home, 'utf8')
if (!html.includes('home__guest-intro')) {
  const start = html.indexOf('    <view wx:if="{{welcomeBannerVisible}}"')
  const end = html.indexOf('    <!-- 实用工具栏 -->')
  if (start < 0 || end < start) throw Error('Home section anchors changed')
  const promos = html.slice(start, end)
  html = html.slice(0, start) + html.slice(end)
  html = html.replace(
    '      <view class="home__section">经营分析</view>',
    promos + '      <view class="home__section">经营分析</view>',
  )
  html = html.replace(
    '    <block>',
    '    <view wx:if="{{!loggedIn}}" class="home__guest-intro"><view class="home__guest-title">好用的工具，随时免费用</view><view class="home__guest-text">计算、下料、记工无需登录。登录后再管理订单与经营数据。</view><view class="home__guest-link" bindtap="toLogin">登录管理经营数据 ›</view></view>\n    <block wx:if="{{loggedIn}}">',
  )
  html = html
    .replace(
      '<lz-icon name="labor" size="23" color="c4" />',
      '<image class="home__tool-image" src="/assets/tools/tool-work-log.png" mode="aspectFit" />',
    )
    .replace('日工明细', '记工算薪')
  fs.writeFileSync(home, html)
}
const ts = root + 'pages/home/index.ts'
let code = fs.readFileSync(ts, 'utf8')
code = code
  .replace('  toWorkLog() {\r\n    if (!requireLogin()) return', '  toWorkLog() {')
  .replace('  toWorkLog() {\n    if (!requireLogin()) return', '  toWorkLog() {')
code = code.replace(
  /        if \(membership.active\) \{\s*this.load\(\)\s*\} else \{\s*\/\/ 到期账号[^\n]*\n\s*this.setData\(\{ loading: false, loadError: false \}\)\s*\}/,
  '        // 到期仍可读取经营数据，不把旧数据当作当前统计。\n        this.load()',
)
fs.writeFileSync(ts, code)
const css = root + 'pages/home/index.wxss'
const marker = '/* Workbook: compact four-tool entrance */'
let styles = fs.readFileSync(css, 'utf8')
if (!styles.includes(marker))
  styles +=
    '\n' +
    marker +
    `\n.home__tools{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;background:#fff;border:1px solid var(--border);border-radius:18px;padding:12px 4px;margin-bottom:16px;box-shadow:var(--shadow-soft)}
.home__tool-card{min-height:92px;border:0!important;border-radius:12px;padding:4px 0;box-shadow:none!important;background:transparent!important;gap:0}
.home__tool-icon,.home__tool-icon--c2,.home__tool-icon--c3,.home__tool-icon--c4{width:48px;height:48px;background:transparent!important;border:0;box-shadow:none}
.home__tool-image{width:48px;height:48px;display:block}.home__tool-t{font-size:13px;line-height:20px;margin-top:6px;font-weight:700}.home__tool-s{font-size:10px;line-height:16px;margin-top:1px;color:var(--muted)}
.home__tool-head{font-size:13px;margin:0 0 10px;color:var(--muted);font-weight:600}.home__guest-intro{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:24px 20px}.home__guest-title{font-size:19px;font-weight:750;color:var(--text)}.home__guest-text{font-size:13px;line-height:1.9;color:var(--muted);margin-top:10px}.home__guest-link{font-size:13px;color:var(--accent);margin-top:20px;font-weight:650}
`
fs.writeFileSync(css, styles)
const nav = root + 'components/workbook-nav/'
let navts = fs.readFileSync(nav + 'index.ts', 'utf8')
for (const [id, icon] of Object.entries({
  overview: 'home',
  records: 'calendar',
  people: 'labor',
  finance: 'wallet',
  reports: 'profit',
}))
  navts = navts.replace("id:'" + id + "',name:", "id:'" + id + "',icon:'" + icon + "',name:")
fs.writeFileSync(nav + 'index.ts', navts)
fs.writeFileSync(
  nav + 'index.json',
  JSON.stringify({ component: true, usingComponents: { 'lz-icon': '/components/lz-icon/index' } }),
)
let navhtml = fs.readFileSync(nav + 'index.wxml', 'utf8')
navhtml = navhtml.replace(
  "<text class=\"dot\">{{active===item.id?'●':'○'}}</text>",
  '<lz-icon name="{{item.icon}}" size="21" color="{{active===item.id?\'accent\':\'muted\'}}"/>',
)
fs.writeFileSync(nav + 'index.wxml', navhtml)
