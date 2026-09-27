import { RULERS, lookupLength, nearestAuspicious } from './luban-logic.mjs'

const UNIT = { mm: 1, cm: 10, m: 1000 }
const HISTORY_KEY = 'ledger_luban_saved_v1'
const nice = value => Number(value.toFixed(3)).toString()

export function createLubanPage({ header, icon, escapeHtml: esc, showSheet, closeSheet, toast, render, storage }) {
  let mode = 'single'
  let unit = 'mm'
  let rule = 'yang'
  let customCycle = null
  let tolerance = 30
  let preference = 'all'
  let values = { length: '1000', width: '1000', height: '2100' }
  let active = 'length'
  const fields = () => mode === 'single' ? [['length', '尺寸']] : [['width', '净宽'], ['height', '净高']]
  const query = field => lookupLength(values[field], unit, rule, customCycle)
  const format = mm => `${Number((mm / UNIT[unit]).toFixed({ mm: 3, cm: 4, m: 6 }[unit]))} ${unit}`
  const boundary = mm => `${Number((mm / UNIT[unit]).toFixed({ mm: 8, cm: 9, m: 11 }[unit]))} ${unit}`
  const settingsLabel = () => `${rule === 'yang' ? '阳尺' : '阴尺'} · ${customCycle || RULERS[rule].cycleMm} mm / 周期`

  function resultCard(field, label) {
    const result = query(field)
    if (!values[field]) return `<section class="panel luban-empty"><p>输入${label}，查看对应尺格</p><small>支持毫米、厘米和米，输入后自动换算。</small></section>`
    if (!result.ok) return `<p class="luban-error" role="alert">${esc(result.error)}</p>`
    const { group, item, rangeMm, withinCycleMm, cycleMm } = result
    return `<section class="panel luban-result ${group.auspicious ? 'auspicious' : ''}">
      <div class="label-row"><span class="result-eyebrow">${mode === 'door' ? `${label} ${format(result.lengthMm)}` : '尺寸落格'}</span><span class="luban-status">传统${group.auspicious ? '吉' : '凶'}格</span></div>
      <div class="luban-result-name"><strong>${group.name}</strong><span>${item.name}</span><button data-action="luban-reference" aria-label="查看全部尺格">${icon('info')}</button></div>
      <p class="luban-range">本小格 ${boundary(rangeMm.start)} ≤ 尺寸 &lt; ${boundary(rangeMm.end)}</p>
      <div class="luban-ruler" role="img" aria-label="${RULERS[rule].name}${RULERS[rule].groups.length}大格，当前落在${group.name}格" style="--cells:${RULERS[rule].groups.length * 4}">
        <div class="luban-ruler-pointer" style="left:${withinCycleMm / cycleMm * 100}%"></div>
        <div class="luban-ruler-groups" style="--groups:${RULERS[rule].groups.length}">${RULERS[rule].groups.map((part, index) => `<span class="${part.auspicious ? 'auspicious' : ''} ${index === group.index ? 'current' : ''}">${part.name}</span>`).join('')}</div>
        <div class="luban-ticks"></div><div class="luban-ruler-scale"><span>${format(result.cycleIndex * cycleMm)}</span><span>${format((result.cycleIndex + 1) * cycleMm)}</span></div>
      </div>
      <div class="luban-result-footer"><span>第 ${result.cycleIndex + 1} 个周期</span><button data-action="luban-focus" data-field="${field}">${active === field ? '正在查看建议' : '查看尺寸建议'} ${icon('chevron')}</button></div>
    </section>`
  }
  function suggestions() {
    const current = query(active)
    if (!current.ok) return ''
    const preferredGroups = preference === 'residence' && rule === 'yang' ? ['财', '本'] : undefined
    const options = nearestAuspicious(current.lengthMm, rule, { customCycleMm: customCycle, toleranceMm: tolerance, preferredGroups })
    if (!options.ok) return ''
    const choices = [options.lower, options.upper].filter(Boolean).filter((item, index, list) => list.findIndex(other => other.targetMm === item.targetMm) === index)
    return `<div class="luban-suggestion-heading"><h3>附近尺寸建议${mode === 'door' ? ` · ${active === 'width' ? '净宽' : '净高'}` : ''}</h3><button data-action="luban-settings">±${tolerance} mm ${icon('down')}</button></div>
    <section class="panel luban-suggestions">${choices.length ? choices.map(item => `<button class="luban-suggestion" data-action="luban-apply" data-mm="${item.targetMm}"><span><strong>${format(item.targetMm)}</strong><small>${item.group.name} · ${item.item.name}</small></span><span class="luban-adjustment">${item.deltaMm === 0 ? '当前已在格内' : `${item.deltaMm > 0 ? '增加' : '减少'} ${nice(Math.abs(item.deltaMm))} mm`}${icon('chevron')}</span></button>`).join('') : `<p class="luban-no-suggestion">允许调整 ±${tolerance} mm 内没有${preference === 'residence' && rule === 'yang' ? '财、本' : '吉'}格建议。<br>可调整范围由实际门洞和加工条件决定。</p>`}</section><p class="luban-suggestion-note">建议避开格线并保留余量；应用前核对实际可调整空间。</p>`
  }
  function results() {
    return fields().map(([field, label]) => resultCard(field, label)).join('') + suggestions()
  }
  function view() {
    return `${header('鲁班尺')}<div class="page-body luban-body">
      <div class="segment luban-modes"><button data-action="luban-mode" data-mode="single" class="${mode === 'single' ? 'selected' : ''}" aria-pressed="${mode === 'single'}">单尺寸</button><button data-action="luban-mode" data-mode="door" class="${mode === 'door' ? 'selected' : ''}" aria-pressed="${mode === 'door'}">门窗宽高</button></div>
      <section class="panel luban-input-panel"><div class="label-row"><h3>输入${mode === 'single' ? '尺寸' : '门窗净尺寸'}</h3><div class="luban-units" aria-label="尺寸单位">${Object.keys(UNIT).map(item => `<button data-action="luban-unit" data-unit="${item}" class="${unit === item ? 'selected' : ''}" aria-pressed="${unit === item}">${item}</button>`).join('')}</div></div>
        <div class="luban-dimensions ${mode === 'door' ? 'paired' : ''}">${fields().map(([field, label]) => `<label><span>${label}</span><div><input id="luban-${field}" data-luban-field="${field}" inputmode="decimal" maxlength="18" value="${esc(values[field])}" placeholder="请输入" aria-label="${label}"><small>${unit}</small></div></label>`).join('')}</div>
        <div class="luban-input-bottom"><button data-action="luban-settings">${settingsLabel()} ${icon('down')}</button><div><button data-action="luban-step" data-step="-1" aria-label="减少1毫米">−</button><span>1 mm</span><button data-action="luban-step" data-step="1" aria-label="增加1毫米">+</button></div></div>
      </section>
      ${mode === 'door' ? '<p class="luban-measure-note">按约定的净开口测量，勿与门框外尺寸混用。</p>' : ''}
      <div id="luban-results" aria-live="polite">${results()}</div>
      <div class="button-pair luban-actions"><button class="secondary" data-action="luban-copy">${icon('copy')}复制结果</button><button class="primary" data-action="luban-save">保存尺寸</button></div>
      <div class="luban-bottom-links"><button data-action="luban-history">已存尺寸 ${icon('chevron')}</button><button data-action="luban-reference">尺制与字样说明 ${icon('chevron')}</button></div>
      <p class="luban-cultural-note">传统用尺参考，不代表现实吉凶。工程尺寸以规范、设计与加工要求为准。</p>
    </div>`
  }
  function updateResults() {
    document.getElementById('luban-results').innerHTML = results()
  }
  function historyEntries() {
    try {
      const stored = JSON.parse(storage?.getItem(HISTORY_KEY) || '[]')
      if (!Array.isArray(stored)) return []
      return stored.filter(entry => entry && typeof entry.name === 'string' && entry.name.length <= 30 && ['single', 'door'].includes(entry.mode) && Object.hasOwn(UNIT, entry.unit) && Object.hasOwn(RULERS, entry.rule) && entry.values && (entry.mode === 'single' ? ['length'] : ['width', 'height']).every(field => lookupLength(entry.values[field], entry.unit, entry.rule, entry.customCycle).ok)).slice(0, 10)
    } catch { return [] }
  }
  function settingsSheet() {
    showSheet('尺制与尺寸建议', `<div class="luban-settings"><label>使用尺制<select id="luban-rule"><option value="yang" ${rule === 'yang' ? 'selected' : ''}>文公尺（阳尺） · 门窗 / 家具</option><option value="yin" ${rule === 'yin' ? 'selected' : ''}>丁兰尺（阴尺） · 传统祭祀用途</option></select></label><label>自定义一周期（mm）<input id="luban-cycle" inputmode="decimal" maxlength="12" value="${customCycle || ''}" placeholder="留空使用阳尺429 / 阴尺388"></label><p>不同实物尺有长度和字样差异，请按手头卷尺核对。空白使用所选尺制默认值。</p><label>允许增减（mm）<input id="luban-tolerance" inputmode="decimal" maxlength="8" value="${tolerance}"></label><label>建议偏好<select id="luban-preference"><option value="all" ${preference === 'all' ? 'selected' : ''}>所选尺制全部吉格</option><option value="residence" ${preference === 'residence' ? 'selected' : ''}>住宅取字 · 财、本（仅阳尺）</option></select></label><p class="luban-error" id="luban-settings-error" role="alert"></p><button class="primary" data-action="luban-settings-save">应用设置</button></div>`)
  }
  function referenceSheet() {
    showSheet('尺制与字样说明', `<div class="luban-reference"><p>${settingsLabel()}。大格内再均分四小格；边界归右侧，整周期回到下一周期首格。</p><div class="luban-reference-table">${RULERS[rule].groups.map(group => `<div><b class="${group.auspicious ? 'auspicious' : ''}">${group.name}<small>${group.auspicious ? '吉' : '凶'}</small></b><span>${group.items.join(' · ')}</span></div>`).join('')}</div><h4>怎样使用</h4><p>先用实际量具测量，再输入净尺寸。本页刻度为示意，不能把手机屏幕直接当作实体尺。阳尺常用于门窗家具，阴尺另有传统用途，二者不能混用。</p><h4>版本和含义</h4><p>采用常见卷尺字样版本，传统实物存在异文与长度差异。吉凶是传统尺面分类，不是现实结果预测。阳尺住宅取字可在设置中选择财、本。</p><a target="_blank" rel="noopener" href="https://magazine.ncfta.gov.tw/News_Content2.aspx?n=3131&s=82534&sms=12605">查看传统艺术中心资料 ↗</a><a target="_blank" rel="noopener" href="LUBAN-RESEARCH.md">查看尺制来源与版本说明 ↗</a></div>`)
  }
  async function onAction(action, target) {
    if (action === 'luban-mode') { mode = target.dataset.mode; active = mode === 'single' ? 'length' : 'width'; render(); return }
    if (action === 'luban-unit') {
      const next = target.dataset.unit
      if (!Object.hasOwn(UNIT, next) || next === unit) return
      if (fields().some(([field]) => values[field] && !query(field).ok)) { toast('先修正尺寸，再切换单位'); return }
      for (const field of Object.keys(values)) {
        const result = query(field)
        values[field] = result.ok ? String(Number((result.lengthMm / UNIT[next]).toFixed(6))) : ''
      }
      unit = next; render(); return
    }
    if (action === 'luban-step') {
      const result = query(active)
      if (!result.ok) { toast('先输入有效尺寸'); return }
      const next = result.lengthMm + Number(target.dataset.step)
      if (!lookupLength(next).ok) { toast('尺寸须大于0且不超过100米'); return }
      values[active] = String(Number((next / UNIT[unit]).toFixed(6))); render(); return
    }
    if (action === 'luban-focus') { active = target.dataset.field; updateResults(); return }
    if (action === 'luban-apply') { values[active] = String(Number((Number(target.dataset.mm) / UNIT[unit]).toFixed(6))); render(); toast('已应用建议尺寸'); return }
    if (action === 'luban-settings') { settingsSheet(); return }
    if (action === 'luban-settings-save') {
      const nextRule = document.getElementById('luban-rule').value
      const cycle = document.getElementById('luban-cycle').value.trim()
      const limit = document.getElementById('luban-tolerance').value.trim()
      const test = lookupLength('1000', 'mm', nextRule, cycle || null)
      if (!test.ok || !/^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/.test(limit) || Number(limit) > 1000) {
        document.getElementById('luban-settings-error').textContent = !test.ok ? test.error : '允许增减请填0至1000毫米，最多三位小数'; return
      }
      rule = nextRule; customCycle = cycle ? Number(cycle) : null; tolerance = Number(limit); preference = document.getElementById('luban-preference').value
      closeSheet(); render(); return
    }
    if (action === 'luban-reference') { referenceSheet(); return }
    if (action === 'luban-save') {
      if (fields().some(([field]) => !query(field).ok)) { toast('请先填写有效尺寸'); return }
      showSheet('保存这组尺寸', `<label class="field-label" for="luban-name">备注名称</label><input id="luban-name" maxlength="30" placeholder="例如：入户门、客厅窗"><p>保存在当前浏览器，最多10组。保存的是当前尺寸和尺制。</p><button class="primary" data-action="luban-confirm-save">保存</button>`); return
    }
    if (action === 'luban-confirm-save') {
      const name = document.getElementById('luban-name').value.trim() || (mode === 'door' ? '门窗尺寸' : '尺寸记录')
      const entry = { name, mode, unit, rule, customCycle, values: { ...values } }
      try { if (!storage) throw new Error('unavailable'); storage.setItem(HISTORY_KEY, JSON.stringify([entry, ...historyEntries()].slice(0, 10))); closeSheet(); toast('尺寸已保存在本机') } catch { toast('保存失败，请重试') }
      return
    }
    if (action === 'luban-history') {
      const entries = historyEntries()
      showSheet('已存尺寸', entries.length ? `<div class="luban-history">${entries.map((entry, index) => `<button data-action="luban-load" data-index="${index}"><span><b>${esc(entry.name)}</b><small>${entry.mode === 'door' ? `${esc(entry.values.width)} × ${esc(entry.values.height)}` : esc(entry.values.length)} ${entry.unit} · ${RULERS[entry.rule].name}</small></span>${icon('chevron')}</button>`).join('')}</div>` : '<p>还没有保存的尺寸。查询后点击“保存尺寸”，下次可直接调出。</p>'); return
    }
    if (action === 'luban-load') {
      const entry = historyEntries()[Number(target.dataset.index)]
      if (!entry) { toast('记录已失效'); return }
      ;({ mode, unit, rule, customCycle } = entry); values = { length: '', width: '', height: '', ...entry.values }; active = mode === 'single' ? 'length' : 'width'; closeSheet(); render(); return
    }
    if (action === 'luban-copy') {
      const all = fields().map(([field, label]) => ({ result: query(field), label }))
      if (all.some(item => !item.result.ok)) { toast('请先填写有效尺寸'); return }
      const text = `${RULERS[rule].name} · 周期 ${customCycle || RULERS[rule].cycleMm} mm\n${all.map(({ result, label }) => `${label} ${format(result.lengthMm)}：${result.group.name}·${result.item.name}（传统${result.group.auspicious ? '吉' : '凶'}格）`).join('\n')}\n传统用尺参考，工程尺寸以实际规范要求为准。`
      try { await navigator.clipboard.writeText(text); toast('结果已复制') } catch { showSheet('复制结果', `<p class="luban-copy-text">${esc(text).replaceAll('\n', '<br>')}</p><p>自动复制未成功，可长按选择文字。</p>`) }
    }
  }
  function onInput(target) { active = target.dataset.lubanField; values[active] = target.value; updateResults() }
  function setState(state) {
    mode = state === 'door' ? 'door' : 'single'; rule = state === 'yin' ? 'yin' : 'yang'; unit = 'mm'; customCycle = null; tolerance = 30; preference = 'all'
    values = { length: state === 'empty' ? '' : '1000', width: '1000', height: '2100' }; active = mode === 'single' ? 'length' : 'width'
  }
  const state = () => mode === 'door' ? 'door' : rule === 'yin' ? 'yin' : values.length ? 'normal' : 'empty'
  return { view, onAction, onInput, setState, state }
}
