import { cutApi, cutPlanApi } from '../../api/index'

// 切割清单行的稳定 key：删除中间行时避免 wx:key 失配导致输入框内容串行
let pieceUid = 0
const newPiece = () => ({ _k: ++pieceUid, lengthStr: '', qtyStr: '', wStr: '', hStr: '' })

// 材料元信息：is2d 维度；noKerf=玻璃不留锯缝；hasImage=仅二维出排料图（型材只给方案）
const MATERIALS: Record<
  string,
  { name: string; unit: string; is2d: boolean; noKerf: boolean; hasImage: boolean }
> = {
  profile: { name: '型材', unit: '段', is2d: false, noKerf: false, hasImage: false },
  glass: { name: '玻璃', unit: '块', is2d: true, noKerf: true, hasImage: true },
  board: { name: '板材', unit: '块', is2d: true, noKerf: false, hasImage: true },
}

// 各材料默认参数（玻璃 2100×1650 不留锯缝；板材 2440×1220 留 5；型材 6000 留 5）
function defaultDraft(material: string): any {
  if (material === 'glass')
    return { sheetWStr: '2100', sheetHStr: '1650', kerf2Str: '0', pieces: [newPiece()] }
  if (material === 'board')
    return { sheetWStr: '2440', sheetHStr: '1220', kerf2Str: '5', pieces: [newPiece()] }
  return { stockLengthStr: '6000', kerfStr: '5', pieces: [newPiece()] }
}

const DRAFT_KEY = 'ledger_cut_draft_v1' // 输入自动保存（按材料分别留存）
const RESULT_KEY = 'ledger_cut_result' // 传给「下料结果」页的入参

Page({
  data: {
    checking: true,
    loadError: false,
    allowed: false,
    mode: '',
    trialDaysLeft: 0,
    gateReason: '优化下料试用已结束，开通会员后继续使用',

    material: 'profile',
    materialOptions: [
      { value: 'profile', label: '型材' },
      { value: 'glass', label: '玻璃' },
      { value: 'board', label: '板材' },
    ],
    is2d: false,
    unit: '段',
    noKerf: false,
    hasImage: false,

    stockLengthStr: '6000',
    kerfStr: '5',
    sheetWStr: '2440',
    sheetHStr: '1220',
    kerf2Str: '5',

    pieces: [newPiece()] as any[],

    showHistory: false,
    historyLoading: false,
    historyError: false,
    historyList: [] as any[],
    matHistory: [] as any[], // 当前材料的历史方案（内联展示用）

    editingTitle: '', // 非空=正在继续编辑这个历史方案（结果页保存时更新）
  },

  _drafts: {} as Record<string, any>,
  _editingPlanId: '',
  _saveTimer: null as any,

  onLoad() {
    this.restoreDrafts()
    this.checkAccess()
  },
  onShow() {
    // 从「下料结果」页保存方案后返回，刷新历史列表
    if (this.data.allowed) this.fetchHistory()
  },
  onHide() {
    this.flushDrafts()
  },
  onUnload() {
    this.flushDrafts()
  },

  // ── 输入自动保存（按材料）──
  restoreDrafts() {
    let saved: any = {}
    try {
      saved = wx.getStorageSync(DRAFT_KEY) || {}
    } catch (e) {
      saved = {}
    }
    const drafts = (saved && saved.drafts) || {}
    this._drafts = {
      profile: drafts.profile || defaultDraft('profile'),
      glass: drafts.glass || defaultDraft('glass'),
      board: drafts.board || defaultDraft('board'),
    }
    const material = saved && MATERIALS[saved.material] ? saved.material : 'profile'
    const meta = MATERIALS[material]
    const set: any = {
      material,
      is2d: meta.is2d,
      unit: meta.unit,
      noKerf: meta.noKerf,
      hasImage: meta.hasImage,
    }
    Object.assign(set, this.draftToFields(material, this._drafts[material]))
    this.setData(set)
  },
  draftToFields(material: string, draft: any): any {
    const meta = MATERIALS[material]
    const pieces =
      Array.isArray(draft.pieces) && draft.pieces.length
        ? draft.pieces.map((p: any) => ({
            _k: ++pieceUid,
            lengthStr: p.lengthStr || '',
            qtyStr: p.qtyStr || '',
            wStr: p.wStr || '',
            hStr: p.hStr || '',
          }))
        : [newPiece()]
    if (meta.is2d) {
      return {
        sheetWStr: draft.sheetWStr || '',
        sheetHStr: draft.sheetHStr || '',
        kerf2Str: draft.kerf2Str != null ? String(draft.kerf2Str) : '',
        pieces,
      }
    }
    return { stockLengthStr: draft.stockLengthStr || '', kerfStr: draft.kerfStr || '', pieces }
  },
  snapshot(material: string): any {
    const meta = MATERIALS[material]
    const pieces = this.data.pieces.map((p: any) => ({
      lengthStr: p.lengthStr,
      qtyStr: p.qtyStr,
      wStr: p.wStr,
      hStr: p.hStr,
    }))
    if (meta.is2d) {
      return {
        sheetWStr: this.data.sheetWStr,
        sheetHStr: this.data.sheetHStr,
        kerf2Str: this.data.kerf2Str,
        pieces,
      }
    }
    return { stockLengthStr: this.data.stockLengthStr, kerfStr: this.data.kerfStr, pieces }
  },
  autosave() {
    this._drafts[this.data.material] = this.snapshot(this.data.material)
    if (this._saveTimer) clearTimeout(this._saveTimer)
    this._saveTimer = setTimeout(() => this.flushDrafts(), 500)
  },
  flushDrafts() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer)
      this._saveTimer = null
    }
    this._drafts[this.data.material] = this.snapshot(this.data.material)
    try {
      wx.setStorageSync(DRAFT_KEY, { material: this.data.material, drafts: this._drafts })
    } catch (e) {
      /* ignore */
    }
  },

  async checkAccess() {
    try {
      const a: any = await cutApi.access()
      this.setData({
        checking: false,
        loadError: false,
        allowed: !!a.allowed,
        mode: a.mode || '',
        trialDaysLeft: a.trialDaysLeft || 0,
        gateReason: a.reason || '优化下料试用已结束，开通会员后继续使用',
      })
      if (a.allowed) this.fetchHistory()
    } catch (e) {
      this.setData({ checking: false, loadError: true })
    }
  },
  retry() {
    this.setData({ checking: true, loadError: false }, () => this.checkAccess())
  },

  onMaterial(e: any) {
    const material = e.detail.value
    if (material === this.data.material) return
    this._drafts[this.data.material] = this.snapshot(this.data.material)
    const meta = MATERIALS[material] || MATERIALS.profile
    const draft = this._drafts[material] || defaultDraft(material)
    this._editingPlanId = ''
    const set: any = {
      material,
      is2d: meta.is2d,
      unit: meta.unit,
      noKerf: meta.noKerf,
      hasImage: meta.hasImage,
      editingTitle: '',
    }
    Object.assign(set, this.draftToFields(material, draft))
    set.matHistory = this.data.historyList.filter((r: any) => r.material === material)
    this.setData(set, () => this.flushDrafts())
  },

  onStock(e: any) {
    this.setData({ stockLengthStr: e.detail.value }, () => this.autosave())
  },
  onKerf(e: any) {
    this.setData({ kerfStr: e.detail.value }, () => this.autosave())
  },
  onSheetW(e: any) {
    this.setData({ sheetWStr: e.detail.value }, () => this.autosave())
  },
  onSheetH(e: any) {
    this.setData({ sheetHStr: e.detail.value }, () => this.autosave())
  },
  onKerf2(e: any) {
    this.setData({ kerf2Str: e.detail.value }, () => this.autosave())
  },

  onLen(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const p = [...this.data.pieces]
    p[i] = { ...p[i], lengthStr: e.detail.value }
    this.setData({ pieces: p }, () => this.autosave())
  },
  onQty(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const p = [...this.data.pieces]
    p[i] = { ...p[i], qtyStr: e.detail.value }
    this.setData({ pieces: p }, () => this.autosave())
  },
  onW(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const p = [...this.data.pieces]
    p[i] = { ...p[i], wStr: e.detail.value }
    this.setData({ pieces: p }, () => this.autosave())
  },
  onH(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const p = [...this.data.pieces]
    p[i] = { ...p[i], hStr: e.detail.value }
    this.setData({ pieces: p }, () => this.autosave())
  },
  addPiece() {
    this.setData({ pieces: [...this.data.pieces, newPiece()] }, () => this.autosave())
  },
  delPiece(e: any) {
    const i = Number(e.currentTarget.dataset.idx)
    const p = this.data.pieces.filter((_: any, j: number) => j !== i)
    this.setData({ pieces: p.length ? p : [newPiece()] }, () => this.autosave())
  },

  // ── 开始优化：校验 + 组装入参 + 跳转「下料结果」页 ──
  compute() {
    const material = this.data.material
    let input: any
    if (this.data.is2d) {
      const sheetW = Math.round(Number(this.data.sheetWStr) || 0)
      const sheetH = Math.round(Number(this.data.sheetHStr) || 0)
      if (sheetW <= 0 || sheetH <= 0) {
        wx.showToast({ title: '请填写整板宽和高', icon: 'none' })
        return
      }
      const pieces = this.data.pieces
        .map((p: any) => ({
          w: Math.round(Number(p.wStr) || 0),
          h: Math.round(Number(p.hStr) || 0),
          qty: Math.round(Number(p.qtyStr) || 0),
        }))
        .filter((p: any) => p.w > 0 && p.h > 0 && p.qty > 0)
      if (!pieces.length) {
        wx.showToast({ title: '请填写宽、高和数量', icon: 'none' })
        return
      }
      if (pieces.reduce((s: number, p: any) => s + p.qty, 0) > 2000) {
        wx.showToast({ title: '总块数过多（上限 2000），请核对数量', icon: 'none' })
        return
      }
      input = {
        sheetW,
        sheetH,
        kerf: this.data.noKerf ? 0 : Math.max(0, Math.round(Number(this.data.kerf2Str) || 0)),
        pieces,
      }
    } else {
      const stock = Math.round(Number(this.data.stockLengthStr) || 0)
      if (stock <= 0) {
        wx.showToast({ title: '请填写整根料长', icon: 'none' })
        return
      }
      const pieces = this.data.pieces
        .map((p: any) => ({
          length: Math.round(Number(p.lengthStr) || 0),
          qty: Math.round(Number(p.qtyStr) || 0),
        }))
        .filter((p: any) => p.length > 0 && p.qty > 0)
      if (!pieces.length) {
        wx.showToast({ title: '请填写段长和数量', icon: 'none' })
        return
      }
      if (pieces.reduce((s: number, p: any) => s + p.qty, 0) > 5000) {
        wx.showToast({ title: '段数过多（上限 5000），请核对数量', icon: 'none' })
        return
      }
      input = {
        stockLength: stock,
        kerf: Math.max(0, Math.round(Number(this.data.kerfStr) || 0)),
        pieces,
      }
    }
    try {
      wx.setStorageSync(RESULT_KEY, {
        material,
        is2d: this.data.is2d,
        noKerf: this.data.noKerf,
        input,
        editingPlanId: this._editingPlanId,
        editingTitle: this.data.editingTitle,
      })
    } catch (e) {
      /* ignore */
    }
    wx.navigateTo({ url: '/pages/cut-result/index' })
  },

  // ── 云端历史 ──
  openHistory() {
    this.setData({ showHistory: true })
    this.fetchHistory()
  },
  closeHistory() {
    this.setData({ showHistory: false })
  },
  noop() {},

  fetchHistory() {
    this.setData({ historyLoading: true, historyError: false })
    cutPlanApi
      .list()
      .then((rows: any) => {
        const list = (rows || []).map((r: any) => {
          const meta = MATERIALS[r.material] || MATERIALS.profile
          const sm = r.summary || {}
          const util = sm.util != null ? (Number(sm.util) * 100).toFixed(1) : '0.0'
          return {
            id: r.id,
            title: r.title,
            material: r.material,
            materialName: meta.name,
            input: r.input,
            desc: `${meta.name} · ${sm.count || 0}${sm.units || meta.unit} · 利用率 ${util}%`,
            date: this.fmtDate(r.updatedAt),
          }
        })
        this.setData({
          historyLoading: false,
          historyList: list,
          matHistory: list.filter((r: any) => r.material === this.data.material),
        })
      })
      .catch(() => {
        this.setData({ historyLoading: false, historyError: true })
      })
  },
  retryHistory() {
    this.fetchHistory()
  },

  // 载入历史方案：回填入参后直接跳结果页复用（携带 editing 上下文，保存即更新）
  loadPlan(e: any) {
    const id = e.currentTarget.dataset.id
    const row = this.data.historyList.find((r: any) => r.id === id)
    if (!row) return
    this._drafts[this.data.material] = this.snapshot(this.data.material)
    const material = row.material
    const meta = MATERIALS[material] || MATERIALS.profile
    const input = row.input || {}
    const set: any = {
      material,
      is2d: meta.is2d,
      unit: meta.unit,
      noKerf: meta.noKerf,
      hasImage: meta.hasImage,
      showHistory: false,
      editingTitle: row.title || '',
    }
    if (meta.is2d) {
      set.sheetWStr = String(input.sheetW || '')
      set.sheetHStr = String(input.sheetH || '')
      set.kerf2Str = String(input.kerf != null ? input.kerf : meta.noKerf ? 0 : '')
      const ps = Array.isArray(input.pieces) ? input.pieces : []
      set.pieces = ps.length
        ? ps.map((p: any) => ({
            _k: ++pieceUid,
            lengthStr: '',
            qtyStr: String(p.qty || ''),
            wStr: String(p.w || ''),
            hStr: String(p.h || ''),
          }))
        : [newPiece()]
    } else {
      set.stockLengthStr = String(input.stockLength || '')
      set.kerfStr = String(input.kerf != null ? input.kerf : '')
      const ps = Array.isArray(input.pieces) ? input.pieces : []
      set.pieces = ps.length
        ? ps.map((p: any) => ({
            _k: ++pieceUid,
            lengthStr: String(p.length || ''),
            qtyStr: String(p.qty || ''),
            wStr: '',
            hStr: '',
          }))
        : [newPiece()]
    }
    this._editingPlanId = id
    set.matHistory = this.data.historyList.filter((r: any) => r.material === material)
    this.setData(set, () => {
      this.flushDrafts()
      this.compute() // 直接进结果页查看/复用
    })
  },

  delPlan(e: any) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除方案',
      content: '删除后无法恢复，确认删除该方案？',
      confirmColor: '#C8442B',
      success: (m) => {
        if (!m.confirm) return
        cutPlanApi
          .remove(id)
          .then(() => {
            if (this._editingPlanId === id) {
              this._editingPlanId = ''
              this.setData({ editingTitle: '' })
            }
            wx.showToast({ title: '已删除', icon: 'success' })
            this.fetchHistory()
          })
          .catch(() => {})
      },
    })
  },

  fmtDate(iso?: string): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return `${d.getMonth() + 1}月${d.getDate()}日`
  },

  toMember() {
    wx.navigateTo({ url: '/pages/membership/index' })
  },
})
