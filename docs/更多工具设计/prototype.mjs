import { toRmbUppercase, dateCountdown } from './prototype-logic.mjs'
import { TOOL_CATALOG, searchTools } from './tool-catalog.mjs'
import { createLubanPage } from './luban-page.mjs'
import { calculateRetirement, loadRetirementProfile, saveRetirementProfile, clearRetirementProfile } from './retirement-policy.mjs'

const asset = '../../packages/ledger-mp/miniprogram/assets/'
const pages = [
  ['home', '首页入口', '五个常用工具平等展示，整行“更多工具”入口更容易找到。'],
  ['tools', '更多工具', '支持工具名称与用途搜索，两组工具均保持每行五个。'],
  ['rmb', '人民币大小写转换', '输入金额即显示大写，主操作为复制结果。'],
  ['retire', '退休倒计时', '出生年月与职工类别自动匹配法定退休月份，填写一次，本机保存。'],
  ['level', '水平仪测量仪', '读数居中，校准与锁定各司其职；读数为演示。'],
  ['glass', '玻璃 K 值计算', '先选玻璃构造，再调整参数；计算结果为示例。'],
  ['luban', '鲁班尺', '双层尺面左右滑动，按用途筛选附近尺寸，复制与保存始终位于底部。'],
]
const variants = {
  rmb: [['normal', '已输入金额'], ['empty', '未输入'], ['error', '输入错误']],
  retire: [['empty', '首次填写'], ['normal', '已保存结果'], ['special', '特殊工种'], ['unknown', '类别待确认'], ['reached', '已到退休月']],
  level: [['normal', '水平读数'], ['calibrated', '已校准'], ['angle', '倾角模式'], ['unavailable', '传感器不可用']],
  luban: [['normal', '单尺寸查询'], ['door', '门窗宽高'], ['yin', '丁兰尺'], ['empty', '未输入']],
  glass: [['normal', '中空玻璃'], ['vacuum', '真空玻璃'], ['result', '结果示例'], ['error', '参数错误']],
}
const paths = {
  search: 'M10.5 3a7.5 7.5 0 100 15 7.5 7.5 0 000-15M16 16l5 5',
  back: 'M15 5l-7 7 7 7', chevron: 'M9 6l6 6-6 6', down: 'M6 9l6 6 6-6', close: 'M6 6l12 12M18 6L6 18',
  copy: 'M8 8h12v13H8zM16 8V3H3v13h5', check: 'M5 13l4 4L19 7', calendar: 'M7 3v4M17 3v4M4 10h16M4 5h16v16H4z',
  target: 'M12 3a9 9 0 100 18 9 9 0 000-18M12 7v10M7 12h10', lock: 'M7 10V7a5 5 0 0110 0v3M5 10h14v11H5z',
  unlock: 'M7 10V7a5 5 0 019.5-2M5 10h14v11H5z', device: 'M6 2h12v20H6zM10 18h4',
  sensor: 'M6 3h12v18H6M2 2l20 20M9 17h6', refresh: 'M3 11a9 9 0 0115-6l3 3M21 2v6h-6M21 13A9 9 0 016 19l-3-3M3 22v-6h6',
  info: 'M12 3a9 9 0 100 18 9 9 0 000-18M12 8h.01M12 11v6', document: 'M6 3h9l4 4v14H6zM15 3v5h4M9 12h7M9 16h5',
}
const icon = (name, className = '') => `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.chevron}"/></svg>`
const illustration = kind => `<img class="tool-illustration" src="assets/tool-${({ money: 'rmb', calendar: 'retire' })[kind] || kind}.png" alt="">`
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
const capsule = '<div class="mini-capsule" aria-hidden="true"><span class="mini-dots">···</span><i class="capsule-sep"></i><i class="capsule-ring"></i></div>'
const header = title => `<header class="nav-header"><button class="nav-back" data-action="back" aria-label="返回">${icon('back')}</button><h2>${title}</h2>${capsule}</header>`
const app = document.getElementById('app')
const sheetRoot = document.getElementById('sheet-root')
let currentPage = 'home'
let amount = '12680.50'
let toolSearch = ''
let retirementProfile = null
let retirementDraft = { birthMonth: '', category: '', workType: 'standard' }
let retirementEditing = true
let retirementDemo = false
let retirementMessage = ''
let retirementFieldError = ''
let retirementPersistence = 'none'
let retirementStorage
try { retirementStorage = window.localStorage } catch { retirementStorage = null }
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
const toolTile = item => `<button class="hub-tool" ${item.action === 'navigate' ? `data-page="${item.id}"` : `data-action="existing-tool" data-label="${item.title}"`} aria-label="${item.title}"><span class="hub-tool-media"><img alt="" src="${item.group === 'popular' ? `${asset}tools/tool-${item.id}.png` : `assets/tool-${item.id}.png`}"></span><span class="hub-tool-label">${escapeHtml(item.shortLabel).replaceAll('\n', '<br>')}</span></button>`
const lubanPage = createLubanPage({ header, icon, escapeHtml, showSheet, closeSheet, toast, render, storage: retirementStorage })

function homeView() {
  const homeTools = TOOL_CATALOG.filter(item => item.group === 'popular')
  return `<header class="home-heading"><h2>利润中心</h2><p>门窗经营一目了然</p><div class="home-bell"><img alt="" src="${asset}profile/profile-message.png"></div>${capsule}</header>
  <div class="page-body home-body"><div class="section-label home-tools-label">实用工具</div><section class="panel home-tools"><div class="home-quick-grid">${homeTools.map(toolTile).join('')}</div>
  <button class="home-all-tools" data-page="tools"><img src="assets/tool-more.png" alt=""><span class="home-all-copy"><strong>更多工具</strong><small>鲁班尺、退休倒计时、人民币大写</small></span><span class="home-all-arrow">${icon('chevron')}</span></button></section>
  <section class="profit-panel"><div class="segment"><span>日</span><span class="selected">月</span><span>年</span></div><p class="profit-label">本月净利润</p><div class="profit-money"><small>¥</small>0</div><div class="metrics">${[['¥0', '营收'], ['¥0', '成本'], ['0', '订单数'], ['¥0', '单均利润']].map(([v, l]) => `<div><strong>${v}</strong><small>${l}</small></div>`).join('')}</div><div class="goal-row"><span>本月目标 未设 · 已实现 ¥0</span><span>0%</span></div><div class="goal-track"></div></section>
  <div class="home-section">经营分析</div><section class="panel analysis-panel"><b>成本构成</b><p>本月暂无成本数据</p></section></div>
  <div class="home-tabbar" aria-hidden="true"><div class="home-tab active"><img src="${asset}workbook-icons/home.png" alt="">首页</div><div class="home-tab"><img src="${asset}workbook-icons/orders.png" alt="">订单</div><div class="tab-add">+</div><div class="home-tab"><img src="${asset}workbook-icons/trend.png" alt="">报表</div><div class="home-tab"><img src="${asset}navigation/nav-profile.png" alt="">我的</div></div>`
}
function toolsResults() {
  const list = searchTools(toolSearch)
  if (toolSearch.trim()) return `<p class="search-count" role="status">${list.length ? `找到 ${list.length} 个工具` : '没有找到相关工具'}</p>${list.length ? `<section class="panel hub-grid" aria-label="搜索结果">${list.map(toolTile).join('')}</section>` : `<div class="search-empty">${icon('search')}<h3>换个关键词试试</h3><p>可以搜索工具名称，也可以输入“门尺”“金额”等用途。</p><button data-action="clear-tool-search">查看全部工具</button></div>`}`
  return ['popular', 'other'].map((group, i) => `<h3 class="section-label hub-section-title ${i ? 'section-space' : ''}" id="${group}-tools-title">${i ? '其他工具' : '热门工具'}</h3><section class="panel hub-grid" aria-labelledby="${group}-tools-title">${list.filter(item => item.group === group).map(toolTile).join('')}</section>`).join('')
}
function toolsView() {
  return `${header('更多工具')}<div class="page-body hub-body"><div class="tool-search">${icon('search')}<input id="tool-search" type="search" maxlength="40" autocomplete="off" placeholder="搜索工具或用途" aria-label="搜索工具" value="${escapeHtml(toolSearch)}"><button data-action="clear-tool-search" aria-label="清空搜索" ${toolSearch ? '' : 'hidden'}>${icon('close')}</button></div><div id="tools-results">${toolsResults()}</div><p class="hub-foot">量窗助手 · 实用工具</p></div>`
}
function updateToolSearch() {
  document.getElementById('tools-results').innerHTML = toolsResults()
  document.querySelector('.tool-search [data-action="clear-tool-search"]').hidden = !toolSearch
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
const retirementCategories = {
  male: ['男职工', '原法定退休年龄 60 周岁'],
  female50: ['女职工 · 原 50 周岁', '通常为工人岗位，按社保认定类别选择'],
  female55: ['女职工 · 原 55 周岁', '通常为管理、技术岗位，按社保认定类别选择'],
  unknown: ['暂不确定', '先保存信息，确认类别后再计算'],
}
const retirementWorkTypes = {
  standard: ['普通岗位', '按普通职工法定退休规则计算'],
  special: ['特殊工种 / 特殊退休', '如井下、高温等，需审核工种与从业条件'],
}
const ageLabel = months => `${Math.floor(months / 12)} 年${months % 12 ? ` ${months % 12} 个月` : ''}`
const monthLabel = value => `${Number(value.slice(0, 4))} 年 ${Number(value.slice(5, 7))} 月`
function restoreRetirement() {
  const saved = loadRetirementProfile(retirementStorage, localToday())
  retirementProfile = saved.profile
  retirementDraft = saved.profile ? { ...saved.profile } : { birthMonth: '', category: '', workType: 'standard' }
  retirementEditing = !saved.profile
  retirementDemo = false
  retirementFieldError = ''
  retirementPersistence = saved.profile ? 'saved' : 'none'
  retirementMessage = saved.issue === 'unavailable' ? '当前浏览器无法读取本机记录，保存时会再次尝试。' : saved.issue === 'invalid' ? '上次记录无法读取，请重新填写。' : ''
}
function retirementState() {
  if (retirementEditing || !retirementProfile) return 'empty'
  const result = calculateRetirement(retirementProfile, localToday())
  if (!result.ok) return 'empty'
  if (result.status === 'needs-review') return result.reasonCode === 'special-work' ? 'special' : 'unknown'
  return dateCountdown(result.countdownDate, localToday()).reached ? 'reached' : 'normal'
}
function retirementForm() {
  const category = retirementCategories[retirementDraft.category]
  return `<div class="retirement-intro"><div class="retirement-intro-icon">${illustration('calendar')}</div><div><h3>${retirementProfile && !retirementDemo ? '修改退休信息' : '算出你的退休时间'}</h3><p>按出生年月和职工类别，自动匹配现行规则。</p></div></div>
  <section class="panel retirement-form">
    <label class="retirement-form-row" for="retirement-birth"><span>出生年月</span><input id="retirement-birth" type="month" min="1900-01" max="${localToday().slice(0, 7)}" value="${escapeHtml(retirementDraft.birthMonth)}" aria-describedby="retirement-form-message" aria-invalid="${retirementFieldError === 'birthMonth'}"></label>
    <button class="retirement-form-row" data-action="retirement-category"><span>职工类别</span><span class="retirement-field-value ${!category ? 'placeholder' : ''}">${category ? category[0] : '请选择'}${icon('chevron')}</span></button>
    <button class="retirement-form-row" data-action="retirement-work"><span>工种情况</span><span class="retirement-field-value">${retirementWorkTypes[retirementDraft.workType][0]}${icon('chevron')}</span></button>
  </section>
  <div id="retirement-form-message" class="retirement-form-message ${retirementFieldError ? 'error' : ''}" ${retirementFieldError ? 'role="alert"' : ''}>${retirementMessage ? escapeHtml(retirementMessage) : '请选择单位或社保认定的职工类别。'}</div>
  <button class="primary" data-action="retirement-save">${retirementDraft.workType === 'special' || retirementDraft.category === 'unknown' ? '保存信息' : '计算并保存'}</button>
  ${retirementProfile && !retirementDemo ? '<button class="retirement-cancel" data-action="retirement-cancel">取消修改，返回结果</button>' : ''}
  <p class="retirement-local-note">${icon('lock')}只保存在当前浏览器，后续打开自动显示。</p>
  <button class="retirement-policy-link" data-action="retirement-policy">职工类别怎么选？${icon('chevron')}</button>`
}
function retirementProfileCard() {
  return `<div class="section-label section-space"><span>我的信息</span><button data-action="retirement-edit">${retirementDemo ? '填写我的信息' : '修改信息'}</button></div>
  <section class="panel retirement-profile">
    <div class="settings-row"><span>出生年月</span><span class="settings-value">${monthLabel(retirementProfile.birthMonth)}</span></div>
    <div class="settings-row"><span>职工类别</span><span class="settings-value">${retirementCategories[retirementProfile.category][0]}</span></div>
    <div class="settings-row"><span>工种情况</span><span class="settings-value">${retirementWorkTypes[retirementProfile.workType][0]}</span></div>
  </section>`
}
function retirementResult(result) {
  const countdown = dateCountdown(result.countdownDate, localToday())
  return `<section class="panel retirement-result">
    <div class="label-row"><span class="result-eyebrow">法定退休年月</span><span class="retirement-saved ${retirementPersistence === 'failed' ? 'error' : ''}">${icon(retirementPersistence === 'saved' && !retirementDemo ? 'check' : 'info')}${retirementDemo ? '示例 · 未保存' : retirementPersistence === 'saved' ? '已存本机' : '未保存'}</span></div>
    <div class="retirement-month">${result.retirementMonth.slice(0, 4)}<small>年</small>${Number(result.retirementMonth.slice(5))}<small>月</small></div>
    <div class="retirement-age">届时法定退休年龄 <strong>${result.ageYears} 岁${result.ageMonths ? ` ${result.ageMonths} 个月` : ''}</strong></div>
    <div class="retirement-countdown-area"><p>${countdown.reached ? '已到法定退休月份' : '距离退休月份还有'}</p><div class="countdown"><div><strong>${countdown.years}</strong><span>年</span></div><div><strong>${countdown.months}</strong><span>个月</span></div><div><strong>${countdown.days}</strong><span>天</span></div></div><div class="retirement-day-total">${countdown.reached ? '实际退休状态以办理结果为准' : `共 ${countdown.totalDays.toLocaleString('zh-CN')} 天 · 按退休月 1 日倒计时`}</div></div>
  </section>
  ${retirementMessage ? `<p class="retirement-save-warning" role="status">${escapeHtml(retirementMessage)}</p>` : ''}
  ${retirementProfileCard()}
  <div class="retirement-pension-note"><div>${icon('info')}<span>领取养老金，还需满足缴费条件</span></div><p>${result.retirementMonth < '2025-01' ? '该退休月份早于现行改革实施时间，缴费条件按当时政策及实际办理情况核定。' : `${Number(result.retirementMonth.slice(0, 4))} 年最低缴费年限为 <b>${ageLabel(result.minimumContributionMonths)}</b>。`}当前结果为法定退休时间，养老金领取还需经办机构审核。</p></div>
  <div class="retirement-footer-actions"><button data-action="retirement-policy">计算依据与适用范围 ${icon('chevron')}</button>${retirementDemo ? '' : '<button data-action="retirement-clear">清除信息</button>'}</div>`
}
function retirementReview(result) {
  const special = result.reasonCode === 'special-work'
  return `<section class="panel retirement-review">${illustration('calendar')}<h3>${special ? '特殊情况，需要进一步核定' : '确认职工类别后，就能计算'}</h3><p>${special ? '特殊工种退休与认定目录、从业年限等条件有关，仅凭出生年月无法确定。请向单位或参保地社保经办机构核实。' : '女性原 50 周岁、原 55 周岁两类的延迟规则不同。请先向单位或社保确认原法定退休年龄。'}</p><div class="retirement-review-status">${retirementDemo ? '示例状态，未写入本机' : retirementPersistence === 'saved' ? '已记住本次填写的信息' : '本次信息尚未保存'}</div><button class="primary" data-action="retirement-edit">${special ? '修改信息' : '选择职工类别'}</button></section>${retirementMessage ? `<p class="retirement-save-warning" role="status">${escapeHtml(retirementMessage)}</p>` : ''}${retirementProfileCard()}<div class="retirement-footer-actions"><button data-action="retirement-policy">计算依据与适用范围 ${icon('chevron')}</button>${retirementDemo ? '' : '<button data-action="retirement-clear">清除信息</button>'}</div>`
}
function retirementView() {
  const result = retirementProfile ? calculateRetirement(retirementProfile, localToday()) : null
  const content = retirementEditing || !result?.ok ? retirementForm() : result.status === 'needs-review' ? retirementReview(result) : retirementResult(result)
  return `${header('退休倒计时')}<div class="page-body retirement-body">${content}</div>`
}
function retirementChoiceSheet(kind) {
  const choices = kind === 'category' ? retirementCategories : retirementWorkTypes
  showSheet(kind === 'category' ? '选择职工类别' : '选择工种情况', `<p>${kind === 'category' ? '原退休年龄指延迟退休改革前的类别；岗位示例仅供识别，以社保认定为准。' : '特殊工种需经认定，不能仅按职业名称判断是否可以提前退休。'}</p>${Object.entries(choices).map(([key, [name, description]]) => `<button class="retirement-choice ${retirementDraft[kind] === key ? 'chosen' : ''}" data-action="retirement-choose" data-kind="${kind}" data-value="${key}"><span><strong>${name}</strong><small>${description}</small></span>${retirementDraft[kind] === key ? icon('check') : ''}</button>`).join('')}`)
}
function retirementPolicySheet() {
  showSheet('计算依据与适用范围', `<div class="retirement-policy-body"><h4>按出生年月匹配延迟规则</h4><p>普通职工按 2025 年起实施的渐进式延迟退休规则计算。选择已确认的男职工、原 50 周岁女职工或原 55 周岁女职工类别。</p><h4>岗位名称不能直接代替认定</h4><p>女职工的原退休年龄受岗位、身份及当地认定规则影响。灵活就业、城乡居民养老保险、特殊工种等其他情形，不直接套用本工具的普通职工结果。</p><h4>月份与养老金领取</h4><p>官方对照表确定到月份，本工具按该月 1 日展示倒计时。弹性提前或延迟退休、养老金申领条件需另行满足并办理，本工具不作资格认定。</p><a href="https://legalinfo.moj.gov.cn/pub/sfbzhfx/zhfxfzzx/fzzxyw/202409/t20240913_506025.html" target="_blank" rel="noopener">查看全国人大决定与国务院办法 ↗</a><a href="https://www.mohrss.gov.cn/wap/zc/zcwj/202501/t20250101_533701.html" target="_blank" rel="noopener">查看人社部弹性退休办法 ↗</a></div>`)
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
const renderers = { home: homeView, tools: toolsView, rmb: rmbView, retire: retirementView, level: levelView, glass: glassView, luban: lubanPage.view }
function render(focusSelector) {
  lubanPage.cancelDrag()
  app.innerHTML = renderers[currentPage]()
  if (currentPage === 'luban') {
    app.querySelector('.luban-body').addEventListener('scroll', lubanPage.syncJump, { passive: true })
    lubanPage.syncJump()
  }
  if (currentPage === 'retire') retirementRenderedDay = localToday()
  document.getElementById('review-title').textContent = pages.find(([id]) => id === currentPage)[1]
  document.getElementById('caption').textContent = pages.find(([id]) => id === currentPage)[2]
  const visibleState = currentPage === 'rmb' ? (!amount ? 'empty' : toRmbUppercase(amount).ok ? 'normal' : 'error') : currentPage === 'retire' ? retirementState() : currentPage === 'level' ? (levelUnavailable ? 'unavailable' : levelMode === 'angle' ? 'angle' : levelCalibrated ? 'calibrated' : 'normal') : currentPage === 'luban' ? lubanPage.state() : currentPage === 'glass' ? (glassResult ? 'result' : glassError ? 'error' : glassType === 'vacuum' ? 'vacuum' : 'normal') : 'normal'
  document.getElementById('preview-state').value = visibleState
  if (focusSelector) app.querySelector(focusSelector)?.focus()
  document.querySelectorAll('.page-link').forEach(link => { const selected = link.dataset.page === currentPage; link.classList.toggle('active', selected); selected ? link.setAttribute('aria-current', 'page') : link.removeAttribute('aria-current') })
}
function navigate(page, historyMode = 'push') {
  if (page === 'retire' && currentPage !== 'retire') restoreRetirement()
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
function closeSheet() { sheetRoot.innerHTML = ''; refreshRetirementDay(); if (sheetReturnFocus?.isConnected) sheetReturnFocus.focus() }

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
  if (action?.startsWith('luban-')) { await lubanPage.onAction(action, target); return }
  if (action === 'clear-tool-search') { toolSearch = ''; document.getElementById('tool-search').value = ''; updateToolSearch(); document.getElementById('tool-search').focus(); return }
  if (action === 'existing-tool') toast(`${target.dataset.label}沿用现有页面`)
  if (action === 'back') { if (currentPage === 'glass' && glassResult) { glassResult = false; render() } else navigate(currentPage === 'tools' ? 'home' : 'tools') }
  if (action === 'clear-amount') { amount = ''; render(); document.getElementById('amount').focus() }
  if (action === 'copy-amount') { const result = toRmbUppercase(amount); if (!result.ok) return; try { await navigator.clipboard.writeText(result.uppercase); toast('大写金额已复制') } catch { toast('复制未成功，请长按大写金额复制') } }
  if (action === 'retirement-category') retirementChoiceSheet('category')
  if (action === 'retirement-work') retirementChoiceSheet('workType')
  if (action === 'retirement-choose') { retirementDraft[target.dataset.kind] = target.dataset.value; retirementMessage = ''; retirementFieldError = ''; closeSheet(); render(target.dataset.kind === 'category' ? '[data-action="retirement-category"]' : '[data-action="retirement-work"]') }
  if (action === 'retirement-save') {
    const result = calculateRetirement(retirementDraft, localToday())
    if (!result.ok) { retirementMessage = result.error; retirementFieldError = result.field; render(result.field === 'birthMonth' ? '#retirement-birth' : '[data-action="retirement-category"]'); return }
    const saved = saveRetirementProfile(retirementStorage, result.profile, localToday())
    if (!saved.ok) { retirementMessage = '信息保存失败，请重试。已填写的内容仍保留在此页，上次保存的记录未更改。'; retirementFieldError = ''; render(); return }
    retirementProfile = result.profile; retirementDraft = { ...result.profile }; retirementEditing = false; retirementDemo = false; retirementFieldError = ''
    retirementPersistence = 'saved'; retirementMessage = ''
    render(); toast(result.status === 'calculated' ? '已计算并保存，下次打开直接查看' : '信息已保存，待确认后再计算')
  }
  if (action === 'retirement-edit') { retirementDraft = retirementDemo ? { birthMonth: '', category: '', workType: 'standard' } : { ...retirementProfile }; retirementEditing = true; retirementMessage = ''; retirementFieldError = ''; render('#retirement-birth') }
  if (action === 'retirement-cancel') { retirementEditing = false; retirementMessage = ''; retirementFieldError = ''; render() }
  if (action === 'retirement-policy') retirementPolicySheet()
  if (action === 'retirement-clear') showSheet('清除退休信息', '<p>清除本机保存的出生年月和职工类别。下次打开时，需要重新填写。</p><button class="primary" data-action="retirement-confirm-clear">确认清除</button>')
  if (action === 'retirement-confirm-clear') { const cleared = clearRetirementProfile(retirementStorage); if (!cleared.ok) { toast('清除失败，请稍后重试'); return } closeSheet(); restoreRetirement(); render(); toast('退休信息已清除') }
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
for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) document.addEventListener(type, event => { if (currentPage === 'luban') lubanPage.onPointer(event) })
document.addEventListener('focusin', event => { if (currentPage === 'luban' && event.target.dataset.lubanField) lubanPage.onFocus(event.target) })
document.addEventListener('keydown', event => { if (currentPage === 'luban') lubanPage.onKey(event) })
document.addEventListener('input', event => {
  if (event.target.id === 'tool-search') { toolSearch = event.target.value; updateToolSearch(); return }
  if (event.target.dataset.lubanField) { lubanPage.onInput(event.target); return }
  if (event.target.id === 'retirement-birth') { retirementDraft.birthMonth = event.target.value; return }
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
  if (currentPage === 'luban') lubanPage.setState(state)
  if (currentPage === 'rmb') amount = state === 'empty' ? '' : state === 'error' ? '12.345' : '12680.50'
  if (currentPage === 'retire') {
    retirementDemo = true; retirementMessage = ''; retirementFieldError = ''; retirementPersistence = 'none'
    retirementProfile = state === 'empty' ? null : { birthMonth: state === 'reached' ? '1960-01' : '1973-01', category: state === 'unknown' ? 'unknown' : 'male', workType: state === 'special' ? 'special' : 'standard' }
    retirementDraft = retirementProfile ? { ...retirementProfile } : { birthMonth: '', category: '', workType: 'standard' }
    retirementEditing = state === 'empty'
  }
  if (currentPage === 'level') { levelMode = state === 'angle' ? 'angle' : 'flat'; levelCalibrated = state === 'calibrated'; levelUnavailable = state === 'unavailable'; levelLocked = false }
  if (currentPage === 'glass') { glassType = state === 'vacuum' ? 'vacuum' : 'hollow'; glassResult = state === 'result'; glassError = state === 'error'; glass.outer = glassError ? '0' : '6'; glass.cavity = glassType === 'hollow' ? '12' : '0.2'; glass.coating = glassType === 'hollow' ? '无镀膜' : '第 2 面 Low-E'; glass.emissivity = glassType === 'hollow' ? '0.84' : '0.10'; advancedOpen = false }
  render()
})
window.addEventListener('popstate', () => navigate(location.hash.slice(1), 'none'))
let retirementRenderedDay = localToday()
function refreshRetirementDay() {
  const day = localToday()
  if (currentPage === 'retire' && !retirementEditing && !sheetRoot.children.length && day !== retirementRenderedDay) render()
}
window.addEventListener('focus', refreshRetirementDay)
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshRetirementDay() })
setInterval(refreshRetirementDay, 60000)
navigate(location.hash.slice(1) || 'home', 'replace')
