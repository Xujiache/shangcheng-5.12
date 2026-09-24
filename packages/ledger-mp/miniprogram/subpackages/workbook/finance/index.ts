import { MotionPage } from '../../../utils/page-transition'
import {
  advanceRemaining,
  check,
  decimal100,
  filteredEntries,
  localDate,
  lockedIds,
  money,
  rows,
  settlementRemaining,
} from '../../../utils/workbook/domain'
import {
  ask,
  confirm,
  makeChange,
  repository,
  reportError,
  saveChanges,
} from '../../../utils/workbook/client'
const tabs = [
  { id: 'settlements', name: '结算单' },
  { id: 'payments', name: '发薪' },
  { id: 'advances', name: '借支' },
  { id: 'adjustments', name: '补差' },
].map((item) => ({ ...item, value: item.id, label: item.name }))
MotionPage({
  data: {
    tab: 'settlements',
    tabs,
    list: [] as any[],
    formType: '',
    workers: [] as any[],
    projects: [] as any[],
    workerIndex: 0,
    projectIndex: 0,
    from: localDate().slice(0, 7) + '-01',
    to: localDate(),
    date: localDate(),
    amount: '',
    note: '',
    method: '微信',
    settlementId: '',
    candidates: [] as any[],
    selected: [] as string[],
    useAdvance: true,
    preview: '¥0.00',
    offset: '¥0.00',
    due: '¥0.00',
    available: '¥0.00',
    saving: false,
  },
  onShow() {
    this.load()
  },
  load() {
    try {
      const b = repository().read().book
      this.setData({
        workers: [{ id: '', name: '请选择工人' }, ...rows(b, 'workers')],
        projects: [{ id: '', name: '全部工地' }, ...rows(b, 'projects')],
        list: rows(b, this.data.tab as any)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .map((r) => ({
            ...r,
            name: b.workers[r.workerId]?.name,
            project: b.projects[r.projectId]?.name || '全部 / 未分配工地',
            amount: money(r.amountFen),
            remaining: money(
              this.data.tab === 'settlements'
                ? settlementRemaining(b, r.id)
                : this.data.tab === 'advances'
                  ? advanceRemaining(b, r.id)
                  : 0,
            ),
            dateText: r.from ? r.from + ' 至 ' + r.to : r.date || r.workDate,
            voided: r.state === 'void',
          })),
      })
      if (this.data.formType === 'settlements') this.candidates()
    } catch (e) {
      reportError(e)
    }
  },
  tab(e: any) {
    const tab = e.detail.value
    if (!tabs.some((item) => item.id === tab)) return
    this.setData({ tab, formType: '' })
    this.load()
  },
  start(e: any) {
    this.setData({
      formType: e.currentTarget.dataset.type || this.data.tab,
      amount: '',
      note: '',
      selected: [],
      settlementId: '',
    })
    this.load()
  },
  cancel() {
    this.setData({ formType: '' })
  },
  field(e: any) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value })
    if (this.data.formType === 'settlements') this.candidates()
  },
  picker(e: any) {
    this.setData({ [e.currentTarget.dataset.field]: Number(e.detail.value), selected: [] })
    this.candidates()
  },
  candidates() {
    const b = repository().read().book
    const w = this.data.workers[this.data.workerIndex]?.id
    const p = this.data.projects[this.data.projectIndex]?.id
    const lock = lockedIds(b)
    const es = filteredEntries(b, {
      from: this.data.from,
      to: this.data.to,
      workerId: w,
      projectId: p,
    }).filter((e) => !lock.has(e.id))
    const adjustments = rows(b, 'adjustments').filter(
      (e) =>
        e.workerId === w &&
        (!p || e.projectId === p) &&
        e.workDate >= this.data.from &&
        e.workDate <= this.data.to &&
        !lock.has(e.id),
    )
    const candidates = w
      ? [...es, ...adjustments].map((e) => ({
          ...e,
          collection: 'mode' in e ? 'entries' : 'adjustments',
          chosen: this.data.selected.includes(e.id),
          amount: money(e.amountFen),
          project: b.projects[e.projectId]?.name || '未分配工地',
        }))
      : []
    this.setData({
      candidates,
      available: money(
        rows(b, 'advances')
          .filter((a) => a.workerId === w)
          .reduce((n, a) => n + advanceRemaining(b, a.id), 0),
      ),
    })
    this.preview()
  },
  select(e: any) {
    this.setData({ selected: e.detail.value })
    this.candidates()
  },
  selectAll() {
    this.setData({ selected: this.data.candidates.map((c) => c.id) })
    this.candidates()
  },
  useAdvance(e: any) {
    this.setData({ useAdvance: e.detail.value })
    this.preview()
  },
  settlementData() {
    const b = repository().read().book
    const workerId = this.data.workers[this.data.workerIndex]?.id
    const selected = this.data.candidates.filter((c) => this.data.selected.includes(c.id))
    let remaining = selected.reduce((n, c) => n + c.amountFen, 0)
    const allocations: any[] = []
    if (this.data.useAdvance)
      for (const a of rows(b, 'advances')
        .filter((a) => a.workerId === workerId)
        .sort((a, b) => a.date.localeCompare(b.date))) {
        const amountFen = Math.min(Math.max(remaining, 0), advanceRemaining(b, a.id))
        if (amountFen > 0) {
          allocations.push({ advanceId: a.id, amountFen })
          remaining -= amountFen
        }
      }
    return {
      workerId,
      projectId: this.data.projects[this.data.projectIndex]?.id || '',
      from: this.data.from,
      to: this.data.to,
      entryIds: selected.filter((c) => c.collection === 'entries').map((c) => c.id),
      adjustmentIds: selected.filter((c) => c.collection === 'adjustments').map((c) => c.id),
      allocations,
      state: 'confirmed',
      voidReason: '',
    }
  },
  preview() {
    const s = this.settlementData()
    const total = this.data.candidates
      .filter((c) => this.data.selected.includes(c.id))
      .reduce((n, c) => n + c.amountFen, 0)
    const offset = s.allocations.reduce((n, a) => n + a.amountFen, 0)
    this.setData({ preview: money(total), offset: money(offset), due: money(total - offset) })
  },
  pay(e: any) {
    const b = repository().read().book
    const s = b.settlements[e.currentTarget.dataset.id]
    this.setData({
      formType: 'payments',
      settlementId: s.id,
      workerIndex: this.data.workers.findIndex((w) => w.id === s.workerId),
      amount: String(settlementRemaining(b, s.id) / 100),
      note: '',
      date: localDate(),
    })
  },
  async save() {
    if (this.data.saving) return
    this.setData({ saving: true })
    try {
      const b = repository().read().book
      const workerId = this.data.workers[this.data.workerIndex]?.id
      check(workerId, '请选择工人')
      const t = this.data.formType
      let value: any
      if (t === 'settlements') {
        value = this.settlementData()
        check(value.entryIds.length + value.adjustmentIds.length, '请选择待结算记录')
        if (
          !(await confirm(
            '确认结算',
            '确认后所选记工将锁定。应计 ' +
              this.data.preview +
              '，借支抵扣 ' +
              this.data.offset +
              '，待付 ' +
              this.data.due +
              '。',
          ))
        )
          return
      } else if (t === 'adjustments') {
        value = {
          workerId,
          projectId: this.data.projects[this.data.projectIndex]?.id || '',
          workDate: this.data.date,
          amountFen: decimal100(this.data.amount, true),
          note: this.data.note,
        }
        check(value.amountFen !== 0, '补差金额不能为零')
      } else {
        value = {
          workerId,
          settlementId: this.data.settlementId,
          amountFen: decimal100(this.data.amount),
          date: this.data.date,
          method: this.data.method,
          note: this.data.note,
          state: 'confirmed',
          voidReason: '',
        }
        if (t === 'payments') check(value.settlementId, '请从待付结算单点击发薪')
      }
      saveChanges('新增' + this.data.tabs.find((x) => x.id === t)!.name, [
        makeChange(t as any, value, b),
      ])
      this.setData({ formType: '', tab: t })
      this.load()
      wx.showToast({ title: '已保存到本机', image: '/assets/workbook-icons/check.png' })
    } catch (e) {
      reportError(e)
    } finally {
      this.setData({ saving: false })
    }
  },
  async void(e: any) {
    try {
      const reason = await ask('填写作废原因', '保留原记录，不抹除历史')
      if (!reason) return
      const b = repository().read().book
      const c = this.data.tab as any
      const r = b[c as 'payments'][e.currentTarget.dataset.id]
      if (
        !(await confirm(
          '确认作废',
          '该操作会重新计算余额。已分配借支或存在有效付款时，请先处理相关结算／付款。',
        ))
      )
        return
      saveChanges('作废财务记录', [makeChange(c, { ...r, state: 'void', voidReason: reason }, b)])
      this.load()
    } catch (e) {
      reportError(e)
    }
  },
})
