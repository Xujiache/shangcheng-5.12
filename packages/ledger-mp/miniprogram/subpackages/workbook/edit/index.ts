import { MotionPage, navigation } from '../../../utils/page-transition'
import {
  check,
  clone,
  decimal100,
  entryAmount,
  localDate,
  lockedIds,
  MODE_LABEL,
  money,
  rows,
  validDate,
} from '../../../utils/workbook/domain'
import {
  ask,
  confirm,
  makeChange,
  proofPath,
  repository,
  reportError,
  saveChanges,
} from '../../../utils/workbook/client'
import { uid } from '../../../utils/workbook/storage'
const defaults = () => ({
  date: localDate(),
  dates: '',
  quantity: '1',
  rate: '0',
  overtimeQuantity: '0',
  overtimeRate: '0',
  bonus: '0',
  subsidy: '0',
  deduction: '0',
  note: '',
  tags: '',
})
MotionPage({
  data: {
    id: '',
    workers: [] as any[],
    workerIds: [] as string[],
    projects: [] as any[],
    projectIndex: 0,
    modes: ['按天', '按小时', '计件', '包工固定金额'],
    modeIndex: 0,
    attendances: ['正常出工', '休息', '请假', '缺勤'],
    attendanceIndex: 0,
    form: defaults(),
    advanced: false,
    batchRates: true,
    locked: false,
    saving: false,
    amount: '¥0.00',
    proofs: [] as any[],
    templates: [] as any[],
    templateIndex: 0,
  },
  onLoad(q: any) {
    this.setData({ id: q.id || '' })
    this.load()
    if (q.date) this.setData({ 'form.date': q.date })
    if (q.id) this.loadEntry(q.id)
    this.preview()
  },
  onShow() {
    this.load()
  },
  load() {
    try {
      const b = repository().read().book
      this.setData({
        workers: rows(b, 'workers')
          .filter((w) => w.status === 'active' || this.data.workerIds.includes(w.id))
          .map((w) => ({
            ...w,
            chosen: this.data.workerIds.includes(w.id),
            rate: money(w.rateFen),
            code: w.id.slice(-6),
          })),
        projects: [{ id: '', name: '未分配工地' }, ...rows(b, 'projects')],
        templates: [{ id: '', name: '选择常用模板' }, ...rows(b, 'templates')],
      })
    } catch (e) {
      reportError(e)
    }
  },
  async loadEntry(id: string) {
    try {
      const b = repository().read().book
      const e = b.entries[id]
      check(e && !e.deleted, '记录不存在')
      this.setData({
        workerIds: [e.workerId],
        projectIndex: Math.max(
          0,
          this.data.projects.findIndex((p) => p.id === e.projectId),
        ),
        modeIndex: ['day', 'hour', 'piece', 'fixed'].indexOf(e.mode),
        attendanceIndex: ['work', 'rest', 'leave', 'absent'].indexOf(e.attendance),
        form: {
          date: e.workDate,
          dates: '',
          quantity: String(e.quantity100 / 100),
          rate: String(e.rateFen / 100),
          overtimeQuantity: String(e.overtimeQuantity100 / 100),
          overtimeRate: String(e.overtimeRateFen / 100),
          bonus: String(e.bonusFen / 100),
          subsidy: String(e.subsidyFen / 100),
          deduction: String(e.deductionFen / 100),
          note: e.note,
          tags: e.tags,
        },
        locked: lockedIds(b).has(id),
        advanced: true,
        batchRates: false,
        proofs: e.attachmentIds.map((id: string) => ({
          ...b.attachments[id],
          id,
          path: repository().read().files[id] || '',
        })),
      })
      this.load()
      this.preview()
    } catch (e) {
      reportError(e)
    }
  },
  field(e: any) {
    this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value })
    this.preview()
  },
  chooseWorkers(e: any) {
    this.setData({ workerIds: e.detail.value })
    if (e.detail.value.length === 1) {
      const w = repository().read().book.workers[e.detail.value[0]]
      this.setData({
        'form.rate': String(w.rateFen / 100),
        modeIndex: ['day', 'hour', 'piece', 'fixed'].indexOf(w.mode),
      })
    }
    this.load()
    this.preview()
  },
  picker(e: any) {
    this.setData({ [e.currentTarget.dataset.field]: Number(e.detail.value) })
    this.preview()
  },
  toggle(e: any) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value })
  },
  advanced() {
    this.setData({ advanced: !this.data.advanced })
  },
  quick(e: any) {
    this.setData({ 'form.quantity': e.currentTarget.dataset.value })
    this.preview()
  },
  addDate() {
    const ds = this.data.form.dates.split(/[,，\s]+/).filter(Boolean)
    if (!ds.includes(this.data.form.date)) ds.push(this.data.form.date)
    this.setData({ 'form.dates': ds.join(', ') })
  },
  inputEntry() {
    const f = this.data.form
    return {
      projectId: this.data.projects[this.data.projectIndex]?.id || '',
      workDate: f.date,
      mode: ['day', 'hour', 'piece', 'fixed'][this.data.modeIndex],
      attendance: ['work', 'rest', 'leave', 'absent'][this.data.attendanceIndex],
      quantity100: decimal100(f.quantity),
      rateFen: decimal100(f.rate),
      overtimeQuantity100: decimal100(f.overtimeQuantity),
      overtimeRateFen: decimal100(f.overtimeRate),
      bonusFen: decimal100(f.bonus),
      subsidyFen: decimal100(f.subsidy),
      deductionFen: decimal100(f.deduction),
      note: f.note,
      tags: f.tags,
      attachmentIds: this.data.proofs.map((p) => p.id),
    }
  },
  preview() {
    try {
      this.setData({ amount: money(entryAmount(this.inputEntry() as any)) })
    } catch {
      this.setData({ amount: '请检查数字' })
    }
  },
  people() {
    navigation.navigateTo({ url: '/subpackages/workbook/people/index' })
  },
  async addProof() {
    try {
      const r = await new Promise<WechatMiniprogram.ChooseMediaSuccessCallbackResult>(
        (resolve, reject) =>
          wx.chooseMedia({
            count: 9 - this.data.proofs.length,
            mediaType: ['image'],
            sizeType: ['compressed'],
            success: resolve,
            fail: reject,
          }),
      )
      const fs = wx.getFileSystemManager()
      const added = r.tempFiles.map((f) => {
        const bytes = new Uint8Array(fs.readFileSync(f.tempFilePath) as ArrayBuffer)
        const mime =
          bytes[0] === 255 && bytes[1] === 216
            ? 'image/jpeg'
            : bytes[0] === 137 && bytes[1] === 80
              ? 'image/png'
              : bytes[0] === 82 && bytes[8] === 87
                ? 'image/webp'
                : ''
        check(mime && f.size <= 5 * 1024 * 1024, '凭证需为 JPG、PNG 或 WebP，且不超过 5MB')
        return {
          id: uid('proof'),
          name: '记工凭证',
          mime,
          size: f.size,
          path: f.tempFilePath,
          new: true,
        }
      })
      this.setData({ proofs: [...this.data.proofs, ...added] })
    } catch (e) {
      reportError(e)
    }
  },
  removeProof(e: any) {
    this.setData({ proofs: this.data.proofs.filter((p) => p.id !== e.currentTarget.dataset.id) })
  },
  async viewProof(e: any) {
    try {
      const p = this.data.proofs.find((p) => p.id === e.currentTarget.dataset.id)
      const path = p.path || (await proofPath(p.id))
      wx.previewImage({ urls: [path] })
    } catch (e) {
      reportError(e)
    }
  },
  async save() {
    if (this.data.saving || this.data.locked) return
    this.setData({ saving: true })
    try {
      const repo = repository()
      const s = repo.read()
      check(this.data.workerIds.length, '请先选择至少一位工人')
      const input = this.inputEntry()
      const dates = this.data.id
        ? [input.workDate]
        : Array.from(
            new Set((this.data.form.dates || input.workDate).split(/[,，\s]+/).filter(Boolean)),
          )
      check(dates.length > 0 && dates.every(validDate), '补记日期需为 YYYY-MM-DD，以逗号分隔')
      check(dates.length * this.data.workerIds.length <= 500, '每次最多批量记 500 笔')
      const candidates: any[] = []
      for (const workerId of this.data.workerIds)
        for (const date of dates) {
          const w = s.book.workers[workerId]
          check(w, '工人不存在')
          candidates.push({
            ...input,
            workerId,
            workDate: date,
            ...(this.data.workerIds.length > 1 && this.data.batchRates
              ? { rateFen: w.rateFen, mode: w.mode }
              : {}),
            id: this.data.id || undefined,
          })
        }
      const duplicate = candidates.some((e) =>
        rows(s.book, 'entries').some(
          (r) =>
            r.id !== this.data.id &&
            r.workerId === e.workerId &&
            r.workDate === e.workDate &&
            r.projectId === e.projectId,
        ),
      )
      if (
        duplicate &&
        !(await confirm('发现同日同工地记工', '可能是重复记录，也可能是另一个班次。确认仍然新增？'))
      )
        return
      check(repository().scope === repo.scope, '账号已切换，请返回台账重试')
      const latest = repo.read()
      const changes: any[] = []
      for (const p of this.data.proofs.filter((p) => p.new)) {
        const path = wx.env.USER_DATA_PATH + '/wb-proof-' + p.id
        wx.getFileSystemManager().copyFileSync(p.path, path)
        latest.files[p.id] = path
        changes.push(
          makeChange('attachments', { id: p.id, name: p.name, mime: p.mime, size: p.size }, s.book),
        )
      }
      repo.write(latest)
      candidates.forEach((e) => changes.push(makeChange('entries', e, s.book)))
      saveChanges(this.data.id ? '编辑记工' : '新增记工 ' + candidates.length + ' 笔', changes)
      wx.showToast({ title: '已保存到本机', image: '/assets/workbook-icons/check.png' })
      navigation.navigateBack()
    } catch (e) {
      reportError(e)
    } finally {
      this.setData({ saving: false })
    }
  },
  async remove() {
    try {
      if (!(await confirm('移入回收站', '记录可在报表 → 数据管理中恢复。已结算记录不能删除。')))
        return
      const b = repository().read().book
      saveChanges('删除记工', [
        makeChange('entries', { ...b.entries[this.data.id], deleted: true }, b),
      ])
      navigation.navigateBack()
    } catch (e) {
      reportError(e)
    }
  },
  async saveTemplate() {
    try {
      const name = await ask('模板名称')
      if (!name) return
      const b = repository().read().book
      saveChanges('保存记工模板', [
        makeChange(
          'templates',
          {
            name,
            workerIds: this.data.workerIds,
            projectId: this.inputEntry().projectId,
            input: {
              form: this.data.form,
              modeIndex: this.data.modeIndex,
              attendanceIndex: this.data.attendanceIndex,
              batchRates: this.data.batchRates,
            },
          },
          b,
        ),
      ])
      this.load()
      wx.showToast({ title: '模板已保存', image: '/assets/workbook-icons/check.png' })
    } catch (e) {
      reportError(e)
    }
  },
  useTemplate(e: any) {
    const t = this.data.templates[Number(e.detail.value)]
    if (!t?.input) return
    this.setData({
      workerIds: t.workerIds,
      projectIndex: Math.max(
        0,
        this.data.projects.findIndex((p) => p.id === t.projectId),
      ),
      form: { ...defaults(), ...t.input.form, date: localDate(), dates: '' },
      modeIndex: t.input.modeIndex,
      attendanceIndex: t.input.attendanceIndex,
      batchRates: t.input.batchRates,
    })
    this.load()
    this.preview()
  },
  async copyYesterday() {
    try {
      const d = new Date(this.data.form.date + 'T12:00:00')
      d.setDate(d.getDate() - 1)
      const b = repository().read().book
      const es = rows(b, 'entries').filter(
        (e) =>
          e.workDate === localDate(d) &&
          (!this.data.workerIds.length || this.data.workerIds.includes(e.workerId)),
      )
      check(es.length, '昨日没有符合条件的记工')
      if (
        !(await confirm(
          '复制昨日 ' + es.length + ' 笔',
          '保留昨日单价和工地，日期改为当前所选日期；可能产生同日多笔记录。',
        ))
      )
        return
      saveChanges(
        '复制昨日记工',
        es.map((e) =>
          makeChange(
            'entries',
            {
              ...clone(e),
              id: undefined,
              workDate: this.data.form.date,
              legacyAmountFen: undefined,
            },
            b,
          ),
        ),
      )
      wx.showToast({ title: '已复制到本机', image: '/assets/workbook-icons/check.png' })
    } catch (e) {
      reportError(e)
    }
  },
})
