import { RULERS, lookupLength, nearbyAuspicious } from './luban-logic.mjs'

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
  let requireBoth = false
  let drag = null
  const PX_PER_MM = 4
  const fields = () => mode === 'single' ? [['length', '尺寸']] : [['width', '净宽'], ['height', '净高']]
  const query = field => lookupLength(values[field], unit, rule, customCycle)
  const format = mm => `${Number((mm / UNIT[unit]).toFixed({ mm: 3, cm: 4, m: 6 }[unit]))} ${unit}`
  const boundary = mm => `${Number((mm / UNIT[unit]).toFixed({ mm: 8, cm: 9, m: 11 }[unit]))} ${unit}`
  const cycleFor = id => id === rule ? customCycle || RULERS[id].cycleMm : RULERS[id].cycleMm
  const dualQuery = mm => Object.fromEntries(['yang', 'yin'].map(id => [id, lookupLength(mm, 'mm', id, cycleFor(id))]))
  const settingsLabel = () => `${rule === 'yang' ? '阳尺' : '阴尺'} · ${customCycle || RULERS[rule].cycleMm} mm / 周期`

  function rulerTrack() {
    const current = query(active)
    if (!current.ok) return '<div class="luban-slider-empty">输入有效尺寸后，可左右滑动尺面</div>'
    const mm = current.lengthMm
    const rows = ['yang', 'yin'].map(id => {
      const ruler = RULERS[id]
      const result = lookupLength(mm, 'mm', id, cycleFor(id))
      const cellWidth = result.cycleMm / (ruler.groups.length * 4)
      const first = Math.max(0, Math.floor((mm - 65) / cellWidth))
      const last = Math.ceil(Math.min(100000, mm + 65) / cellWidth)
      const cells = []
      for (let n = first; n <= last; n++) {
        const visibleWidth = Math.min((n + 1) * cellWidth, 100000) - n * cellWidth
        if (visibleWidth <= 0) continue
        const group = ruler.groups[Math.floor(n / 4) % ruler.groups.length]
        cells.push(`<span class="luban-slide-cell ${group.auspicious ? 'auspicious' : ''}" style="left:calc(50% + ${(n * cellWidth - mm) * PX_PER_MM}px);width:${visibleWidth * PX_PER_MM}px"><small>${group.name} · ${group.auspicious ? '吉' : '凶'}</small><b>${group.items[n % 4]}</b></span>`)
      }
      return `<div class="luban-slide-row ${id === rule ? 'selected' : ''}"><div class="luban-slide-label"><span>${id === 'yang' ? '文公尺 · 阳' : '丁兰尺 · 阴'}<small>${cycleFor(id)} mm / 周期</small></span><strong>${result.group.name} · ${result.item.name}</strong></div><div class="luban-slide-band">${cells.join('')}</div></div>`
    }).join('')
    const ticks = []
    for (let value = Math.max(0, Math.floor((mm - 65) / 5) * 5); value <= Math.min(100000, mm + 65); value += 5) {
      ticks.push(`<span class="${value % 10 === 0 ? 'major' : ''}" style="left:calc(50% + ${(value - mm) * PX_PER_MM}px)">${value % 10 === 0 ? value : ''}</span>`)
    }
    return `${rows}<div class="luban-slide-scale" aria-hidden="true">${ticks.join('')}</div>`
  }
  function sliderPanel() {
    const current = query(active)
    return `<section class="panel luban-slider-panel"><div class="label-row"><h3>滑动选尺寸</h3><div class="luban-field-switch">${fields().map(([field,label]) => `<button data-action="luban-focus" data-field="${field}" aria-pressed="${active === field}" class="${active === field ? 'selected' : ''}">${label}</button>`).join('')}</div></div>
      <div class="luban-slider" data-luban-drag role="slider" tabindex="0" aria-label="滑动鲁班尺" aria-orientation="horizontal" aria-valuemin="0.001" aria-valuemax="100000" aria-valuenow="${current.ok ? current.lengthMm : 0.001}" aria-valuetext="${current.ok ? format(current.lengthMm) : '请先输入有效尺寸'}" aria-disabled="${!current.ok}"><div id="luban-slider-track">${rulerTrack()}</div><i class="luban-slider-pointer" aria-hidden="true" ${current.ok ? '' : 'hidden'}></i></div>
      <div class="luban-slider-hint"><span>↔ 左右滑动，按 1 mm 调整</span><span>刻度单位 mm</span></div>
      <div class="luban-quick-steps">${[-20,-10,-5,5,10,20].map(step => `<button data-action="luban-step" data-step="${step}" aria-label="${step > 0 ? '增加' : '减少'}${Math.abs(step)}毫米">${step > 0 ? '+' : '−'}${Math.abs(step)}</button>`).join('')}</div>
    </section>`
  }
  function resultCard(field, label) {
    const result = query(field)
    if (!values[field]) return `<section class="panel luban-empty"><p>输入${label}，查看对应尺格</p><small>支持毫米、厘米和米，输入后自动换算。</small></section>`
    if (!result.ok) return `<p class="luban-error" role="alert">${esc(result.error)}</p>`
    const { group, item, rangeMm } = result
    return `<section class="panel luban-result ${group.auspicious ? 'auspicious' : ''}">
      <div class="label-row"><span class="result-eyebrow">${mode === 'door' ? `${label} ${format(result.lengthMm)}` : '尺寸落格'} · ${rule === 'yang' ? '文公尺' : '丁兰尺'}</span><span class="luban-status">传统${group.auspicious ? '吉' : '凶'}格</span></div>
      <div class="luban-result-name"><strong>${group.name}</strong><span>${item.name}</span><button data-action="luban-reference" aria-label="查看全部尺格">${icon('info')}</button></div>
      <p class="luban-range">本小格 ${boundary(rangeMm.start)} ≤ 尺寸 &lt; ${boundary(rangeMm.end)}</p>
      ${mode === 'door' ? `<div class="luban-result-footer"><span>第 ${result.cycleIndex + 1} 个周期</span><button data-action="luban-focus" data-field="${field}">${active === field ? '当前调整尺寸' : '调整这个尺寸'} ${icon('chevron')}</button></div>` : ''}
    </section>`
  }
  function suggestions() {
    const current = query(active)
    if (!current.ok) return ''
    const preferredGroups = preference === 'residence' && rule === 'yang' ? ['财', '本'] : undefined
    const options = nearbyAuspicious(current.lengthMm, rule, { customCycleMm: customCycle, toleranceMm: tolerance, preferredGroups, requireBoth, limit: 8 })
    if (!options.ok) return ''
    return `<div class="luban-suggestion-heading"><h3>附近吉格尺寸${mode === 'door' ? ` · ${active === 'width' ? '净宽' : '净高'}` : ''}</h3><button data-action="luban-settings">±${tolerance} mm ${icon('down')}</button></div>
    <div class="luban-suggestion-controls"><div class="luban-filter">${[[false,'当前尺制'],[true,'双尺同吉']].map(([both,label]) => `<button data-action="luban-filter" data-both="${both}" aria-pressed="${requireBoth === both}" class="${requireBoth === both ? 'selected' : ''}">${label}</button>`).join('')}</div><div class="luban-tolerances">${[30,100,300].map(limit => `<button data-action="luban-tolerance" data-limit="${limit}" aria-label="允许调整前后${limit}毫米" aria-pressed="${tolerance === limit}" class="${tolerance === limit ? 'selected' : ''}">±${limit}</button>`).join('')}</div></div>
    <section class="luban-suggestions ${options.items.length ? 'luban-suggestion-grid' : 'panel'}">${options.items.length ? options.items.map(item => `<button class="panel luban-suggestion" data-action="luban-apply" data-mm="${item.targetMm}"><strong>${format(item.targetMm)}</strong><small>文公 ${item.yang.group.name} · 丁兰 ${item.yin.group.name}</small><span class="luban-adjustment">${item.deltaMm === 0 ? '当前尺寸' : `${item.deltaMm > 0 ? '增加' : '减少'} ${nice(Math.abs(item.deltaMm))} mm`}${icon('chevron')}</span></button>`).join('') : `<p class="luban-no-suggestion">±${tolerance} mm 内没有符合条件的整数毫米建议。<br>可修改筛选或调整范围。</p>`}</section><p class="luban-suggestion-note">按距离排序，最多显示 8 项；建议避开格线并保留余量。${requireBoth ? '双尺同吉为可选民俗偏好。' : ''}应用前核对实际可调整空间。</p>`
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
      ${sliderPanel()}
      <div id="luban-results" aria-live="polite">${results()}</div>
      <div class="luban-bottom-links"><button data-action="luban-history">已存尺寸 ${icon('chevron')}</button><button data-action="luban-reference">尺制与字样说明 ${icon('chevron')}</button></div>
      <p class="luban-cultural-note">传统用尺参考，不代表现实吉凶。工程尺寸以规范、设计与加工要求为准。</p>
    </div><footer class="luban-action-bar" aria-label="尺寸操作"><button class="luban-jump" data-action="luban-jump" hidden>查看下方结果 ${icon('down')}</button><div class="button-pair luban-actions"><button class="secondary" data-action="luban-copy" ${fields().some(([field]) => !query(field).ok) ? 'disabled' : ''}>${icon('copy')}复制结果</button><button class="primary" data-action="luban-save" ${fields().some(([field]) => !query(field).ok) ? 'disabled' : ''}>保存尺寸</button></div></footer>`
  }
  function syncJump() {
    const body = document.querySelector('.luban-body')
    const button = document.querySelector('.luban-jump')
    if (!body || !button) return
    button.hidden = !fields().some(([field]) => query(field).ok) || body.scrollHeight - body.clientHeight - body.scrollTop < 24
  }
  function updateResults() {
    document.getElementById('preview-state').value = state()
    document.getElementById('luban-results').innerHTML = results()
    document.getElementById('luban-slider-track').innerHTML = rulerTrack()
    const result = query(active)
    const slider = document.querySelector('[data-luban-drag]')
    slider.setAttribute('aria-valuenow', result.ok ? result.lengthMm : 0.001)
    slider.setAttribute('aria-valuetext', result.ok ? format(result.lengthMm) : '请先输入有效尺寸')
    slider.setAttribute('aria-disabled', !result.ok)
    slider.querySelector('.luban-slider-pointer').hidden = !result.ok
    document.querySelectorAll('.luban-field-switch button').forEach(button => { button.classList.toggle('selected', button.dataset.field === active); button.setAttribute('aria-pressed', button.dataset.field === active) })
    document.querySelectorAll('.luban-actions button').forEach(button => { button.disabled = fields().some(([field]) => !query(field).ok) })
    syncJump()
  }
  function historyEntries() {
    try {
      const stored = JSON.parse(storage?.getItem(HISTORY_KEY) || '[]')
      if (!Array.isArray(stored)) return []
      return stored.filter(entry => entry && typeof entry.name === 'string' && entry.name.length <= 30 && ['single', 'door'].includes(entry.mode) && Object.hasOwn(UNIT, entry.unit) && Object.hasOwn(RULERS, entry.rule) && entry.values && (entry.mode === 'single' ? ['length'] : ['width', 'height']).every(field => lookupLength(entry.values[field], entry.unit, entry.rule, entry.customCycle).ok)).slice(0, 10)
    } catch { return [] }
  }
  function settingsSheet() {
    showSheet('尺制与尺寸建议', `<div class="luban-settings"><label>使用尺制<select id="luban-rule"><option value="yang" ${rule === 'yang' ? 'selected' : ''}>文公尺（阳尺） · 门窗 / 家具</option><option value="yin" ${rule === 'yin' ? 'selected' : ''}>丁兰尺（阴尺） · 传统祭祀用途</option></select></label><label>自定义一周期（mm）<input id="luban-cycle" inputmode="decimal" maxlength="12" value="${customCycle || ''}" placeholder="留空使用阳尺429 / 阴尺388"></label><p>不同实物尺有长度和字样差异。自定义仅作用于所选尺制；另一层使用默认周期。空白恢复所选尺制默认值。</p><label>允许增减（mm）<input id="luban-tolerance" inputmode="decimal" maxlength="8" value="${tolerance}"></label><label>建议偏好<select id="luban-preference"><option value="all" ${preference === 'all' ? 'selected' : ''}>所选尺制全部吉格</option><option value="residence" ${preference === 'residence' ? 'selected' : ''}>住宅取字 · 财、本（仅阳尺）</option></select></label><p class="luban-error" id="luban-settings-error" role="alert"></p><button class="primary" data-action="luban-settings-save">应用设置</button></div>`)
  }
  function referenceSheet() {
    showSheet('尺制与字样说明', `<div class="luban-reference"><p>${settingsLabel()}。大格内再均分四小格；边界归右侧，整周期回到下一周期首格。</p><div class="luban-reference-table">${RULERS[rule].groups.map(group => `<div><b class="${group.auspicious ? 'auspicious' : ''}">${group.name}<small>${group.auspicious ? '吉' : '凶'}</small></b><span>${group.items.join(' · ')}</span></div>`).join('')}</div><h4>怎样使用</h4><p>先用实际量具测量，再输入净尺寸。本页刻度为示意，不能把手机屏幕直接当作实体尺。上层文公尺，下层丁兰尺，同一指针对应同一物理尺寸。文公尺常用于阳宅、门窗家具；丁兰尺多用于阴宅、祖龛。神位、佛具等具体取尺依地方习俗核对，不将两尺混为一种规则。</p><h4>版本和含义</h4><p>采用常见卷尺字样版本，传统实物存在异文与长度差异。吉凶是传统尺面分类，不是现实结果预测。阳尺住宅取字可在设置中选择财、本。尺面绿色表示传统吉格，灰色表示传统凶格，文字同时注明。双尺同吉只是可选筛选，不是所有门窗必须同时满足的规则。</p><a target="_blank" rel="noopener" href="https://magazine.ncfta.gov.tw/News_Content2.aspx?n=3131&s=82534&sms=12605">查看传统艺术中心资料 ↗</a><a target="_blank" rel="noopener" href="LUBAN-RESEARCH.md">查看尺制来源与版本说明 ↗</a></div>`)
  }
  async function onAction(action, target) {
    if (action === 'luban-jump') {
      const body = document.querySelector('.luban-body')
      body?.scrollTo({ top: body.scrollHeight, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
      return
    }
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
    if (action === 'luban-filter') { requireBoth = target.dataset.both === 'true'; updateResults(); return }
    if (action === 'luban-tolerance') { tolerance = Number(target.dataset.limit); updateResults(); return }
    if (action === 'luban-step') {
      const result = query(active)
      if (!result.ok) { toast('先输入有效尺寸'); return }
      const next = Number((result.lengthMm + Number(target.dataset.step)).toFixed(3))
      if (!lookupLength(next).ok) { toast('尺寸须大于0且不超过100米'); return }
      setDimension(next); return
    }
    if (action === 'luban-focus') { active = target.dataset.field; updateResults(); return }
    if (action === 'luban-apply') { setDimension(Number(target.dataset.mm)); toast('已应用建议尺寸'); return }
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
      showSheet('保存这组尺寸', `<label class="field-label" for="luban-name">备注名称</label><input id="luban-name" maxlength="30" placeholder="例如：入户门、客厅窗"><p>保存在当前浏览器，最多10组。保存当前尺寸、尺制和建议筛选条件。</p><button class="primary" data-action="luban-confirm-save">保存</button>`); return
    }
    if (action === 'luban-confirm-save') {
      const name = document.getElementById('luban-name').value.trim() || (mode === 'door' ? '门窗尺寸' : '尺寸记录')
      const entry = { name, mode, unit, rule, customCycle, values: { ...values }, requireBoth, tolerance, preference }
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
      ;({ mode, unit, rule, customCycle } = entry); values = { length: '', width: '', height: '', ...entry.values }; active = mode === 'single' ? 'length' : 'width'; requireBoth = entry.requireBoth === true; tolerance = Number.isFinite(entry.tolerance) && entry.tolerance >= 0 && entry.tolerance <= 1000 ? entry.tolerance : 30; preference = entry.preference === 'residence' ? 'residence' : 'all'; closeSheet(); render(); return
    }
    if (action === 'luban-copy') {
      const all = fields().map(([field, label]) => ({ result: query(field), label }))
      if (all.some(item => !item.result.ok)) { toast('请先填写有效尺寸'); return }
      const text = `文公尺 ${cycleFor('yang')} mm / 周期 · 丁兰尺 ${cycleFor('yin')} mm / 周期\n${all.map(({ result, label }) => { const pair = dualQuery(result.lengthMm); return `${label} ${format(result.lengthMm)}：文公 ${pair.yang.group.name}·${pair.yang.item.name}（传统${pair.yang.group.auspicious ? '吉' : '凶'}格），丁兰 ${pair.yin.group.name}·${pair.yin.item.name}（传统${pair.yin.group.auspicious ? '吉' : '凶'}格）` }).join('\n')}\n传统用尺参考，工程尺寸以实际规范要求为准。`
      try { await navigator.clipboard.writeText(text); toast('结果已复制') } catch { showSheet('复制结果', `<p class="luban-copy-text">${esc(text).replaceAll('\n', '<br>')}</p><p>自动复制未成功，可长按选择文字。</p>`) }
    }
  }
  function setDimension(mm) {
    values[active] = String(Number((mm / UNIT[unit]).toFixed(6)))
    document.getElementById(`luban-${active}`).value = values[active]
    updateResults()
  }
  function onPointer(event) {
    const slider = event.target.closest('[data-luban-drag]')
    if (event.type === 'pointerdown') {
      if (!slider || event.button !== 0 || !event.isPrimary || !query(active).ok) return
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, mm: query(active).lengthMm, slider }
      slider.setPointerCapture(event.pointerId)
    } else if (drag && drag.id === event.pointerId) {
      if (event.type === 'pointermove') {
        const dx = event.clientX - drag.x
        if (!drag.moving && (Math.abs(dx) < 5 || Math.abs(dx) < Math.abs(event.clientY - drag.y))) return
        drag.moving = true
        drag.slider.classList.add('dragging')
        const mm = Number(Math.max(0.001, Math.min(100000, drag.mm - Math.round(dx / PX_PER_MM))).toFixed(3))
        if (mm !== query(active).lengthMm) setDimension(mm)
      } else cancelDrag()
    }
  }
  function cancelDrag() {
    const previous = drag
    drag = null
    if (!previous) return
    previous.slider.classList.remove('dragging')
    if (previous.slider.hasPointerCapture(previous.id)) previous.slider.releasePointerCapture(previous.id)
  }
  function onKey(event) {
    if (!event.target.matches('[data-luban-drag]') || !['ArrowLeft','ArrowRight'].includes(event.key)) return
    event.preventDefault()
    const result = query(active)
    if (!result.ok) return
    const delta = (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 10 : 1)
    setDimension(Number(Math.max(0.001, Math.min(100000, result.lengthMm + delta)).toFixed(3)))
  }
  function onFocus(target) { if (active !== target.dataset.lubanField) { active = target.dataset.lubanField; updateResults() } }
  function onInput(target) { active = target.dataset.lubanField; values[active] = target.value; updateResults() }
  function setState(state) {
    mode = state === 'door' ? 'door' : 'single'; rule = state === 'yin' ? 'yin' : 'yang'; unit = 'mm'; customCycle = null; tolerance = 30; preference = 'all'; requireBoth = false; drag = null
    values = { length: state === 'empty' ? '' : '1000', width: '1000', height: '2100' }; active = mode === 'single' ? 'length' : 'width'
  }
  const state = () => mode === 'door' ? 'door' : rule === 'yin' ? 'yin' : values.length ? 'normal' : 'empty'
  return { view, onAction, onInput, onFocus, onPointer, onKey, cancelDrag, setState, state, syncJump }
}
