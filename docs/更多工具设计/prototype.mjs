import { toRmbUppercase, dateCountdown } from './prototype-logic.mjs'

const asset = '../../packages/ledger-mp/miniprogram/assets/'
const pages = [
  ['home', '首页入口', '保留格式转换，在同一行右侧增加“更多工具”。'],
  ['tools', '更多工具', '四项工具分组展示，整行可点，说明只保留用途。'],
  ['rmb', '人民币大小写转换', '输入金额即显示大写，主操作为复制结果。'],
  ['retire', '退休倒计时', '设置目标日期，查看剩余年月日与总天数。'],
  ['level', '水平仪测量仪', '读数居中，校准与锁定各司其职；读数为演示。'],
  ['glass', '玻璃 K 值计算', '先选玻璃构造，再调整参数；计算结果为示例。'],
]
const variants = {
  rmb: [['normal', '已输入金额'], ['empty', '未输入'], ['error', '输入错误']],
  retire: [['normal', '倒计时'], ['empty', '未设置日期'], ['reached', '已到设定日期']],
  level: [['normal', '水平读数'], ['calibrated', '已校准'], ['angle', '倾角模式'], ['unavailable', '传感器不可用']],
  glass: [['normal', '中空玻璃'], ['vacuum', '真空玻璃'], ['result', '结果示例'], ['error', '参数错误']],
}
const paths = {
  back: 'M15 5l-7 7 7 7', chevron: 'M9 6l6 6-6 6', down: 'M6 9l6 6 6-6', close: 'M6 6l12 12M18 6L6 18',
  copy: 'M8 8h12v13H8zM16 8V3H3v13h5', check: 'M5 13l4 4L19 7', calendar: 'M7 3v4M17 3v4M4 10h16M4 5h16v16H4z',
  target: 'M12 3a9 9 0 100 18 9 9 0 000-18M12 7v10M7 12h10', lock: 'M7 10V7a5 5 0 0110 0v3M5 10h14v11H5z',
  unlock: 'M7 10V7a5 5 0 019.5-2M5 10h14v11H5z', device: 'M6 2h12v20H6zM10 18h4',
  sensor: 'M6 3h12v18H6M2 2l20 20M9 17h6', refresh: 'M3 11a9 9 0 0115-6l3 3M21 2v6h-6M21 13A9 9 0 016 19l-3-3M3 22v-6h6',
  info: 'M12 3a9 9 0 100 18 9 9 0 000-18M12 8h.01M12 11v6', document: 'M6 3h9l4 4v14H6zM15 3v5h4M9 12h7M9 16h5',
}
const icon = (name, className = '') => `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.chevron}"/></svg>`
function illustration(kind) {
  const gradient = `<defs><linearGradient id="mint-${kind}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dcf8e6"/><stop offset=".54" stop-color="#a1ddc0"/><stop offset="1" stop-color="#63bca2"/></linearGradient><linearGradient id="paper-${kind}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#e6f3e9"/></linearGradient></defs>`
  const drawings = {
    money: `<rect x="5" y="17" width="48" height="32" rx="6" fill="#8fc3ad"/><rect x="8" y="9" width="47" height="33" rx="5" fill="url(#mint-money)" stroke="#77b79d"/><rect x="12" y="13" width="39" height="25" rx="4" fill="none" stroke="#e8fff2"/><circle cx="31.5" cy="25.5" r="9" fill="url(#paper-money)"/><path d="M28 21l3.5 4 3.5-4M27.5 26h8M27.5 29h8M31.5 25v8" fill="none" stroke="#478d6d" stroke-width="1.8" stroke-linecap="round"/><path d="M16 25h2M45 25h2" stroke="#589c7e" stroke-width="2" stroke-linecap="round"/>`,
    calendar: `<rect x="10" y="9" width="40" height="44" rx="7" fill="#96c9ae"/><rect x="7" y="6" width="40" height="43" rx="7" fill="url(#paper-calendar)" stroke="#a8cdb5"/><path d="M14 6h26a7 7 0 017 7v6H7v-6a7 7 0 017-7" fill="url(#mint-calendar)"/><path d="M17 3v8M37 3v8" stroke="#619778" stroke-width="3.5" stroke-linecap="round"/><path d="M16 25h5M29 25h8M16 33h5M29 33h8M16 40h5" stroke="#7da58a" stroke-width="2.5" stroke-linecap="round"/><circle cx="45" cy="44" r="11" fill="#eaf4d9" stroke="#b8cd9c"/><path d="M45 38v6l4 2" stroke="#7e9961" stroke-width="1.8" stroke-linecap="round" fill="none"/>`,
    level: `<rect x="4" y="21" width="52" height="22" rx="7" fill="#75b89c"/><rect x="4" y="17" width="52" height="22" rx="7" fill="url(#mint-level)" stroke="#83bea0"/><rect x="7" y="20" width="6" height="16" rx="3" fill="#d5eee0"/><rect x="47" y="20" width="6" height="16" rx="3" fill="#d5eee0"/><rect x="18" y="22" width="24" height="12" rx="6" fill="#e9f4c3" stroke="#95b478"/><path d="M26 22v12M34 22v12" stroke="#87a06b"/><ellipse cx="30" cy="27.5" rx="3" ry="3.5" fill="#b8d681" stroke="#94b363"/><path d="M13 47h34" stroke="#cdddcf" stroke-width="2" stroke-linecap="round"/>`,
    glass: `<path d="M23 7l29 9v36l-29-9z" fill="#c7e7db" stroke="#8ab8aa"/><path d="M14 12l29 9v36l-29-9z" fill="#b4ded3" fill-opacity=".75" stroke="#74aaa0"/><path d="M5 6l29 9v36L5 42z" fill="url(#mint-glass)" fill-opacity=".72" stroke="#77b1a3"/><path d="M9 12l19 6M9 17l8 2M18 43l11 3" stroke="#effff5" stroke-width="1.7" stroke-linecap="round"/><path d="M38 22l8 3v18" stroke="#f0fff8" stroke-width="1.5" stroke-linecap="round"/>`,
  }
  return `<svg class="tool-illustration" viewBox="0 0 60 62" aria-hidden="true">${gradient}${drawings[kind]}</svg>`
}
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
const capsule = '<div class="mini-capsule" aria-hidden="true"><span class="mini-dots">···</span><i class="capsule-sep"></i><i class="capsule-ring"></i></div>'
const header = title => `<header class="nav-header"><button class="nav-back" data-action="back" aria-label="返回">${icon('back')}</button><h2>${title}</h2>${capsule}</header>`
const app = document.getElementById('app')
const sheetRoot = document.getElementById('sheet-root')
let currentPage = 'home'
let amount = '12680.50'
let retirementDate = '2036-09-01'
let levelMode = 'flat'
let levelCalibrated = false
let levelLocked = false
let levelUnavailable = false
let glassType = 'hollow'
let glassResult = false
let advancedOpen = false
let glassError = false
const glass = { outer: '6', inner: '6', cavity: '12', gas: '空气', coating: '无镀膜', emissivity: '0.84', pressure: '0.10', pillar: '0.5', pitch: '25', outside: '25', inside: '7.7' }
const localToday = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` }
const displayDate = iso => iso ? iso.split('-').map((part, i) => `${Number(part)}${[' 年 ', ' 月 ', ' 日'][i]}`).join('') : ''
const tool = (page, kind, title, sub) => `<button class="tool-row" data-page="${page}">${illustration(kind)}<span class="tool-row-copy"><strong>${title}</strong><small>${sub}</small></span>${icon('chevron', 'row-chevron')}</button>`

function homeView() {
  const homeTools = [['triangle', '三角计算', '边角反算'], ['arc', '圆弧计算', '弦长拱高'], ['cut', '优化下料', '省料排版'], ['work-log', '记工', '日工明细']]
  return `<header class="home-heading"><h2>利润中心</h2><p>门窗经营一目了然</p><div class="home-bell"><img alt="" src="${asset}profile/profile-message.png"></div>${capsule}</header>
  <div class="page-body home-body"><div class="section-label">实用工具</div><section class="panel home-tools"><div class="home-tool-grid">${homeTools.map(([file, title, subtitle]) => `<div class="home-tool"><img alt="" src="${asset}tools/tool-${file}.png"><strong>${title}</strong><small>${subtitle}</small></div>`).join('')}</div>
  <div class="home-tool-footer"><div class="format-entry"><img alt="" src="${asset}tools/tool-format.png"><span><strong>格式转换</strong><small>文件处理</small></span></div><button class="more-entry" data-page="tools">更多工具 ${icon('chevron')}</button></div></section>
  <section class="profit-panel"><div class="segment"><span>日</span><span class="selected">月</span><span>年</span></div><p class="profit-label">本月净利润</p><div class="profit-money"><small>¥</small>0</div><div class="metrics">${[['¥0', '营收'], ['¥0', '成本'], ['0', '订单数'], ['¥0', '单均利润']].map(([v, l]) => `<div><strong>${v}</strong><small>${l}</small></div>`).join('')}</div><div class="goal-row"><span>本月目标 未设 · 已实现 ¥0</span><span>0%</span></div><div class="goal-track"></div></section>
  <div class="home-section">经营分析</div><section class="panel analysis-panel"><b>成本构成</b><p>本月暂无成本数据</p></section></div>
  <div class="home-tabbar" aria-hidden="true"><div class="home-tab active"><img src="${asset}workbook-icons/home.png" alt="">首页</div><div class="home-tab"><img src="${asset}workbook-icons/orders.png" alt="">订单</div><div class="tab-add">+</div><div class="home-tab"><img src="${asset}workbook-icons/trend.png" alt="">报表</div><div class="home-tab"><img src="${asset}navigation/nav-profile.png" alt="">我的</div></div>`
}
function toolsView() {
  return `${header('更多工具')}<div class="page-body"><p class="page-lead">常用计算与现场测量</p><div class="section-label">日常工具</div><section class="panel">${tool('rmb', 'money', '人民币大小写转换', '金额转大写，复制即可用')}${tool('retire', 'calendar', '退休倒计时', '设定退休日期，查看剩余时间')}</section><div class="section-label section-space">测量与门窗</div><section class="panel">${tool('level', 'level', '水平仪测量仪', '查看水平状态与倾斜角度')}${tool('glass', 'glass', '玻璃 K 值计算', '中空玻璃 · 真空玻璃')}</section><p class="hub-foot">量窗助手 · 实用工具</p></div>`
}
function rmbResultMarkup() {
  const result = toRmbUppercase(amount)
  if (!amount) return `<p class="result-eyebrow">人民币大写</p><div class="empty-result">${icon('document')}输入金额后，大写结果显示在这里</div>`
  if (!result.ok) return `<p class="result-eyebrow">人民币大写</p><div class="empty-result">请先检查上方金额</div>`
  return `<p class="result-eyebrow">人民币大写</p><p class="uppercase-output">${escapeHtml(result.uppercase)}</p><div class="result-sub"><span>小写金额</span><span>¥ ${Number(result.normalized).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`
}
function rmbView() {
  const result = toRmbUppercase(amount)
  return `${header('人民币大小写转换')}<div class="page-body"><section class="panel field-panel"><label class="field-label" for="amount">输入金额（元）</label><div class="amount-line"><span class="currency-symbol">¥</span><input class="amount-input" id="amount" inputmode="decimal" type="text" value="${escapeHtml(amount)}" placeholder="0.00" maxlength="20" autocomplete="off" aria-describedby="amount-help"><button class="clear-input" data-action="clear-amount" aria-label="清空金额">${icon('close')}</button></div><p class="field-foot ${amount && !result.ok ? 'error' : ''}" id="amount-help">${amount && !result.ok ? escapeHtml(result.error) : '最多保留两位小数'}</p></section><section class="panel result-panel" id="rmb-result" aria-live="polite">${rmbResultMarkup()}</section><button class="primary action-gap" data-action="copy-amount" ${!amount || !result.ok ? 'disabled' : ''}>${icon('copy')}复制大写金额</button><div class="hint-block"><h3>填写票据时更省心</h3><p>使用壹、贰、叁等大写汉字，整元自动补“整”。</p></div></div>`
}
function retirementView() {
  const result = retirementDate ? dateCountdown(retirementDate, localToday()) : null
  const valid = result?.ok
  return `${header('退休倒计时')}<div class="page-body">${valid ? `<section class="panel retire-hero">${illustration('calendar')}<p class="result-eyebrow">${result.reached ? '已到您设定的退休日期' : '距离您设定的退休日期'}</p><div class="countdown"><div><strong>${result.years}</strong><span>年</span></div><div><strong>${result.months}</strong><span>个月</span></div><div><strong>${result.days}</strong><span>天</span></div></div><div class="countdown-total">${result.reached ? '愿每一天，都有新的期待' : `还有 <b>${result.totalDays.toLocaleString('zh-CN')}</b> 天`}</div></section><div class="section-label section-space">日期设置</div><section class="panel"><button class="settings-row" data-action="retire-date"><span>退休日期</span><span class="settings-value">${displayDate(retirementDate)}${icon('chevron')}</span></button><div class="settings-row"><span>今天</span><span class="settings-value">${displayDate(localToday())}</span></div></section><p class="quiet-help">按您设置的日期倒计时，不推算政策退休年龄。</p>` : `<section class="panel retire-empty">${illustration('calendar')}<h3>给下一段生活，定个日期</h3><p>设置您的退休日期<br>剩余的年月日，一眼就能看到</p><button class="primary" data-action="retire-date">设置退休日期</button></section><p class="quiet-help">按您设置的日期倒计时，不推算政策退休年龄。</p>`}</div>`
}
function levelView() {
  const value = levelCalibrated ? '0.0' : levelMode === 'angle' ? '8.0' : '0.6'
  return `${header('水平仪测量仪')}<div class="page-body"><div class="segment level-tabs" aria-label="测量模式"><button data-action="level-flat" class="${levelMode === 'flat' ? 'selected' : ''}" aria-pressed="${levelMode === 'flat'}">水平仪</button><button data-action="level-angle" class="${levelMode === 'angle' ? 'selected' : ''}" aria-pressed="${levelMode === 'angle'}">倾角仪</button></div>${levelUnavailable ? `<section class="panel sensor-missing">${icon('sensor')}<h3>暂时无法读取传感器</h3><p>请在手机微信中打开后重试。<br>确认设备支持动作与方向传感器。</p><button class="primary" data-action="retry-sensor">重新检测</button></section>` : `<section class="panel instrument-panel"><div class="instrument-heading"><span class="green-dot"></span>${levelLocked ? '读数已锁定' : levelCalibrated ? '已校准，以当前位置为零点' : '将手机平放在待测表面'}<span class="demo-mark">演示</span></div>${levelMode === 'flat' ? `<div class="dial" role="img" aria-label="水平仪演示，偏角 ${value} 度"><span class="dial-tick tick-top">0°</span><span class="dial-tick tick-bottom">0°</span><span class="dial-tick tick-left">90°</span><span class="dial-tick tick-right">90°</span><div class="target-ring"></div><div class="bubble" ${levelCalibrated ? 'style="transform:translate(0,10px)"' : ''}></div></div>` : `<div class="inclinometer" role="img" aria-label="倾角仪演示，倾斜 ${value} 度"><span class="incline-label">0°</span><div class="incline-line" ${levelCalibrated ? 'style="transform:rotate(0deg)"' : ''}></div></div>`}<div class="level-reading" aria-live="polite">${value}°</div><div class="level-state">${levelCalibrated ? '当前为参考零点' : levelMode === 'angle' ? '向左倾斜' : '略微倾斜'}</div><div class="axis-readings"><div><small>横向角度</small><strong>${levelCalibrated ? '0.0' : '0.4'}°</strong></div><div><small>纵向角度</small><strong>${levelCalibrated ? '0.0' : '0.5'}°</strong></div></div></section><div class="button-pair"><button class="secondary" data-action="calibrate" ${levelLocked ? 'disabled' : ''}>${icon('target')}校准</button><button class="primary" data-action="lock-level">${icon(levelLocked ? 'unlock' : 'lock')}${levelLocked ? '继续测量' : '锁定读数'}</button></div><p class="quiet-help">测量前取下手机壳，贴合待测表面。</p>`}<div class="hint-block"><h3>怎样校准</h3><p>把手机放在已知水平的表面，再点“校准”。<br>手机测量仅作辅助，精密施工请使用专业仪器。</p></div></div>`
}
const glassName = () => glassType === 'hollow' ? '中空玻璃' : '真空玻璃'
const structureName = () => `${glass.outer} + ${glassType === 'hollow' ? `${glass.cavity}${glass.gas === '氩气' ? 'Ar' : 'A'}` : 'V'} + ${glass.inner}`
function glassView() {
  const vacuum = glassType === 'vacuum'
  if (glassResult) return `${header('玻璃 K 值计算')}<div class="page-body"><section class="panel glass-result"><div class="label-row"><p class="result-eyebrow">玻璃中心 K 值</p><span class="demo-mark">结果示例</span></div><div class="k-value">${vacuum ? '0.70' : '2.80'}</div><div class="k-unit">W / (m² · K)</div><p class="k-description">数值越小，玻璃的保温性能越好</p></section><section class="panel glass-summary"><div class="label-row"><h3 class="card-heading">本次构造</h3>${illustration('glass')}</div><dl class="summary-list"><dt>玻璃类型</dt><dd>${glassName()}</dd><dt>构造</dt><dd>${structureName()} mm</dd><dt>${vacuum ? '真空间隙' : '腔体气体'}</dt><dd>${vacuum ? `${glass.cavity} mm` : glass.gas}</dd><dt>Low-E 镀膜</dt><dd>${glass.coating}</dd></dl></section><p class="result-disclaimer">本设计稿展示结果样式，数值为演示数据。正式计算需按确认的模型求解，结果口径为玻璃中心区域，不包含窗框与边缘传热。</p><button class="primary" data-action="glass-edit">修改参数</button></div>`
  return `${header('玻璃 K 值计算')}<div class="page-body"><div class="segment glass-tabs" aria-label="玻璃类型"><button data-action="glass-hollow" class="${!vacuum ? 'selected' : ''}" aria-pressed="${!vacuum}">中空玻璃</button><button data-action="glass-vacuum" class="${vacuum ? 'selected' : ''}" aria-pressed="${vacuum}">真空玻璃</button></div><section class="panel glass-panel"><div class="label-row"><h3 class="card-heading">玻璃构造</h3><span style="font-size:11px;color:#819789">从室外到室内</span></div><div class="glass-diagram" role="img" aria-label="玻璃构造示意"><span class="glass-out-label">室外</span><div class="glass-piece"></div><div class="glass-cavity ${vacuum ? 'vacuum' : ''}">${vacuum ? '真空层' : glass.gas}</div><div class="glass-piece inner"></div><span class="glass-in-label">室内</span></div><div class="glass-structure">${structureName()}</div><div class="glass-specs"><button data-param="outer"><small>外片玻璃</small><b>${glass.outer} mm</b></button><button data-param="cavity"><small>${vacuum ? '真空间隙' : '中空层'}</small><b>${glass.cavity} mm</b></button><button data-param="inner"><small>内片玻璃</small><b>${glass.inner} mm</b></button></div></section><section class="panel parameter-panel">${!vacuum ? `<button class="settings-row" data-param="gas"><span>腔体气体</span><span class="settings-value">${glass.gas}${icon('chevron')}</span></button>` : ''}<button class="settings-row" data-param="coating"><span>Low-E 镀膜</span><span class="settings-value">${glass.coating}${icon('chevron')}</span></button>${glass.coating !== '无镀膜' ? `<button class="settings-row" data-param="emissivity"><span>镀膜表面发射率</span><span class="settings-value">${glass.emissivity}${icon('chevron')}</span></button>` : ''}</section><button class="advanced-toggle" data-action="advanced" aria-expanded="${advancedOpen}"><span>${vacuum ? '真空层与边界参数' : '边界条件'}</span>${icon('down')}</button>${advancedOpen ? `<section class="advanced-content">${(vacuum ? [['pressure', '真空压力', 'Pa'], ['pillar', '支撑柱直径', 'mm'], ['pitch', '支撑柱间距', 'mm']] : []).concat([['outside', '室外表面换热系数', 'W/(m²·K)'], ['inside', '室内表面换热系数', 'W/(m²·K)']]).map(([key, label, unit]) => `<button class="settings-row" data-param="${key}"><span>${label}</span><span class="settings-value">${glass[key]} ${unit}${icon('chevron')}</span></button>`).join('')}<p>${vacuum ? '压力、支撑结构与材料参数以厂家规格为准。' : '正式计算的边界条件需与采用的标准一致。'}</p></section>` : ''}${glassError ? '<p class="field-foot error" role="alert" style="margin:0 3px 14px">请填写大于 0 的玻璃厚度，再进行计算。</p>' : ''}<button class="primary" data-action="calculate-glass">计算 K 值</button><p class="glass-help">设计预览 · 计算结果为示例，不用于工程计算。</p></div>`
}
const renderers = { home: homeView, tools: toolsView, rmb: rmbView, retire: retirementView, level: levelView, glass: glassView }
function render(focusSelector) {
  app.innerHTML = renderers[currentPage]()
  document.getElementById('review-title').textContent = pages.find(([id]) => id === currentPage)[1]
  document.getElementById('caption').textContent = pages.find(([id]) => id === currentPage)[2]
  const visibleState = currentPage === 'rmb' ? (!amount ? 'empty' : toRmbUppercase(amount).ok ? 'normal' : 'error') : currentPage === 'retire' ? (!retirementDate ? 'empty' : dateCountdown(retirementDate, localToday()).reached ? 'reached' : 'normal') : currentPage === 'level' ? (levelUnavailable ? 'unavailable' : levelMode === 'angle' ? 'angle' : levelCalibrated ? 'calibrated' : 'normal') : currentPage === 'glass' ? (glassResult ? 'result' : glassError ? 'error' : glassType === 'vacuum' ? 'vacuum' : 'normal') : 'normal'
  document.getElementById('preview-state').value = visibleState
  if (focusSelector) app.querySelector(focusSelector)?.focus()
  document.querySelectorAll('.page-link').forEach(link => { const selected = link.dataset.page === currentPage; link.classList.toggle('active', selected); selected ? link.setAttribute('aria-current', 'page') : link.removeAttribute('aria-current') })
}
function navigate(page, historyMode = 'push') {
  currentPage = renderers[page] ? page : 'home'
  sheetRoot.innerHTML = ''
  if (historyMode !== 'none' && location.hash !== `#${currentPage}`) history[historyMode === 'replace' ? 'replaceState' : 'pushState'](null, '', `#${currentPage}`)
  const options = variants[currentPage]
  document.getElementById('state-control').hidden = !options
  document.getElementById('preview-state').innerHTML = options ? options.map(([value, title]) => `<option value="${value}">${title}</option>`).join('') : ''
  render()
}
let toastTimer
function toast(message) { const el = document.getElementById('toast'); clearTimeout(toastTimer); el.textContent = message; el.classList.add('show'); toastTimer = setTimeout(() => el.classList.remove('show'), 2100) }
let sheetReturnFocus
function showSheet(title, content) {
  sheetReturnFocus = document.activeElement
  sheetRoot.innerHTML = `<div class="sheet-backdrop"><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title"><div class="sheet-heading"><h3 id="sheet-title">${title}</h3><button class="sheet-close" data-action="close-sheet" aria-label="关闭">${icon('close')}</button></div>${content}</section></div>`
  sheetRoot.querySelector('input,button')?.focus()
}
function closeSheet() { sheetRoot.innerHTML = ''; if (sheetReturnFocus?.isConnected) sheetReturnFocus.focus() }
function dateSheet() { showSheet('设置退休日期', `<p>选择您计划退休的日期，倒计时将自动更新。</p><label for="retire-date" class="field-label">退休日期</label><input id="retire-date" type="date" value="${retirementDate || '2036-09-01'}"><p class="sheet-error" id="date-error" role="alert" hidden></p><button class="primary" data-action="save-retire-date">保存日期</button>`) }
function paramSheet(key) {
  const choice = key === 'gas' ? ['空气', '氩气'] : key === 'coating' ? ['无镀膜', '第 2 面 Low-E', '第 3 面 Low-E'] : null
  const names = { outer: '外片玻璃厚度', inner: '内片玻璃厚度', cavity: glassType === 'vacuum' ? '真空间隙' : '中空层厚度', gas: '腔体气体', coating: 'Low-E 镀膜位置', emissivity: '镀膜表面发射率', pressure: '真空压力', pillar: '支撑柱直径', pitch: '支撑柱间距', outside: '室外表面换热系数', inside: '室内表面换热系数' }
  const units = { outer: 'mm', inner: 'mm', cavity: 'mm', pressure: 'Pa', pillar: 'mm', pitch: 'mm', outside: 'W/(m²·K)', inside: 'W/(m²·K)' }
  showSheet(names[key], choice ? `<p>${key === 'coating' ? '玻璃表面从室外向室内依次编号。' : '选择实际填充的气体。'}</p>${choice.map(value => `<button class="sheet-option ${glass[key] === value ? 'chosen' : ''}" data-choice-key="${key}" data-choice-value="${value}">${value}${glass[key] === value ? icon('check') : ''}</button>`).join('')}` : `<label class="field-label" for="glass-param">${names[key]}${units[key] ? `（${units[key]}）` : ''}</label><input id="glass-param" inputmode="decimal" type="text" value="${glass[key]}"><p class="sheet-error" id="param-error" role="alert" hidden></p><button class="primary" data-action="save-param" data-key="${key}">确定</button>`)
}
document.getElementById('review-pages').innerHTML = pages.map(([id, label], index) => `<a class="page-link" data-page="${id}" href="#${id}"><span>0${index + 1}</span>${label}</a>`).join('')
document.addEventListener('click', async event => {
  const target = event.target.closest('[data-page],[data-action],[data-param],[data-choice-key]')
  if (!target) { if (event.target.classList.contains('sheet-backdrop')) closeSheet(); return }
  if (target.dataset.page) { event.preventDefault(); navigate(target.dataset.page); return }
  if (target.dataset.param) { paramSheet(target.dataset.param); return }
  if (target.dataset.choiceKey) { const { choiceKey, choiceValue } = target.dataset; glass[choiceKey] = choiceValue; if (choiceKey === 'coating') glass.emissivity = choiceValue === '无镀膜' ? '0.84' : '0.10'; closeSheet(); render(`[data-param="${choiceKey}"]`); return }
  const action = target.dataset.action
  if (action === 'back') { if (currentPage === 'glass' && glassResult) { glassResult = false; render() } else navigate(currentPage === 'tools' ? 'home' : 'tools') }
  if (action === 'clear-amount') { amount = ''; render(); document.getElementById('amount').focus() }
  if (action === 'copy-amount') { const result = toRmbUppercase(amount); if (!result.ok) return; try { await navigator.clipboard.writeText(result.uppercase); toast('大写金额已复制') } catch { toast('复制未成功，请长按大写金额复制') } }
  if (action === 'retire-date') dateSheet()
  if (action === 'save-retire-date') { const date = document.getElementById('retire-date').value; const result = dateCountdown(date, localToday()); if (!result.ok) { const error = document.getElementById('date-error'); error.hidden = false; error.textContent = '请选择有效日期'; return } retirementDate = date; closeSheet(); render('[data-action="retire-date"]'); toast('退休日期已更新') }
  if (action === 'close-sheet') closeSheet()
  if (action === 'level-flat' || action === 'level-angle') { levelMode = action === 'level-flat' ? 'flat' : 'angle'; levelCalibrated = false; levelLocked = false; render() }
  if (action === 'calibrate') showSheet('校准水平仪', '<p>先把手机放在已知水平的表面，保持静止。校准后，当前角度将设为参考零点。</p><button class="primary" data-action="confirm-calibrate">设为参考零点</button>')
  if (action === 'confirm-calibrate') { levelCalibrated = true; closeSheet(); render('[data-action="calibrate"]'); toast('已展示校准后的读数') }
  if (action === 'lock-level') { levelLocked = !levelLocked; render() }
  if (action === 'retry-sensor') toast('设计预览未连接传感器')
  if (action === 'glass-hollow' || action === 'glass-vacuum') { glassType = action === 'glass-hollow' ? 'hollow' : 'vacuum'; glass.cavity = glassType === 'hollow' ? '12' : '0.2'; glass.coating = glassType === 'hollow' ? '无镀膜' : '第 2 面 Low-E'; glass.emissivity = glassType === 'hollow' ? '0.84' : '0.10'; glassResult = false; glassError = false; advancedOpen = false; render() }
  if (action === 'advanced') { advancedOpen = !advancedOpen; render(); if (advancedOpen) app.querySelector('.advanced-content')?.scrollIntoView({ block: 'nearest' }) }
  if (action === 'calculate-glass') { glassError = Number(glass.outer) <= 0 || Number(glass.inner) <= 0; glassResult = !glassError; render() }
  if (action === 'glass-edit') { glassResult = false; render() }
  if (action === 'save-param') { const key = target.dataset.key; const value = document.getElementById('glass-param').value.trim(); if (!/^\d+(?:\.\d+)?$/.test(value) || Number(value) <= 0 || (key === 'emissivity' && Number(value) > 1)) { const error = document.getElementById('param-error'); error.hidden = false; error.textContent = key === 'emissivity' ? '请输入大于 0 且不超过 1 的数值' : '请输入大于 0 的有效数值'; return } glass[key] = value; glassError = false; closeSheet(); render(`[data-param="${key}"]`) }
})
document.addEventListener('input', event => {
  if (event.target.id !== 'amount') return
  amount = event.target.value
  const result = toRmbUppercase(amount)
  document.getElementById('rmb-result').innerHTML = rmbResultMarkup()
  document.getElementById('preview-state').value = !amount ? 'empty' : result.ok ? 'normal' : 'error'
  const help = document.getElementById('amount-help')
  help.classList.toggle('error', Boolean(amount) && !result.ok)
  help.textContent = amount && !result.ok ? result.error : '最多保留两位小数'
  event.target.setAttribute('aria-invalid', String(Boolean(amount) && !result.ok))
  document.querySelector('[data-action="copy-amount"]').disabled = !amount || !result.ok
})
document.addEventListener('keydown', event => {
  if (!sheetRoot.children.length) return
  if (event.key === 'Escape') { closeSheet(); return }
  if (event.key !== 'Tab') return
  const controls = [...sheetRoot.querySelectorAll('button,input,select')]
  if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus() }
  else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus() }
})
document.getElementById('preview-state').addEventListener('change', event => {
  const state = event.target.value
  sheetRoot.innerHTML = ''
  if (currentPage === 'rmb') amount = state === 'empty' ? '' : state === 'error' ? '12.345' : '12680.50'
  if (currentPage === 'retire') retirementDate = state === 'empty' ? '' : state === 'reached' ? localToday() : '2036-09-01'
  if (currentPage === 'level') { levelMode = state === 'angle' ? 'angle' : 'flat'; levelCalibrated = state === 'calibrated'; levelUnavailable = state === 'unavailable'; levelLocked = false }
  if (currentPage === 'glass') { glassType = state === 'vacuum' ? 'vacuum' : 'hollow'; glassResult = state === 'result'; glassError = state === 'error'; glass.outer = glassError ? '0' : '6'; glass.cavity = glassType === 'hollow' ? '12' : '0.2'; glass.coating = glassType === 'hollow' ? '无镀膜' : '第 2 面 Low-E'; glass.emissivity = glassType === 'hollow' ? '0.84' : '0.10'; advancedOpen = false }
  render()
})
window.addEventListener('popstate', () => navigate(location.hash.slice(1), 'none'))
navigate(location.hash.slice(1) || 'home', 'replace')
