import { MotionPage, navigation } from '../../utils/page-transition'
import { localDate, money, quantity, rows, summary, validDate } from '../../utils/workbook/domain'
import {
  maybeImportGuest,
  repository,
  reportError,
  errorText,
  scope,
  syncWorkbook,
} from '../../utils/workbook/client'
MotionPage({
  data: {
    month: localDate().slice(0, 7),
    earned: '¥0.00',
    paid: '¥0.00',
    due: '¥0.00',
    settled: '¥0.00',
    advance: '¥0.00',
    days: '0',
    hours: '0',
    pieces: '0',
    recordCount: 0,
    workerCount: 0,
    projectCount: 0,
    recent: [] as any[],
    storageLabel: '本机免费 · 数据保存在当前设备',
    error: '',
    pending: 0,
    cloudNotice: '',
    cloudDetail: '',
    cloudBusy: false,
  },
  showVersion: 0,
  async onShow() {
    const version = (this.showVersion || 0) + 1
    this.showVersion = version
    this.setData({ cloudNotice: '', cloudDetail: '', cloudBusy: false })
    this.refresh()
    let account = ''
    let cloudEnabled = false
    try {
      account = scope()
      await maybeImportGuest()
      if (version !== this.showVersion || scope() !== account) return
      this.refresh()
      cloudEnabled = repository().read().cloudEnabled
    } catch (e) {
      if (version === this.showVersion) this.setData({ error: errorText(e) })
      return
    }
    if (!cloudEnabled) return
    this.setData({ cloudBusy: true })
    try {
      await syncWorkbook()
      if (version !== this.showVersion || scope() !== account) return
      this.refresh()
    } catch (e) {
      if (version !== this.showVersion || scope() !== account) return
      const detail = errorText(e)
      this.setData({
        cloudDetail: detail,
        cloudNotice: /Cannot GET|404/.test(detail)
          ? '云同步服务暂不可用，本机记工不受影响'
          : /冲突/.test(detail)
            ? '云同步存在冲突，请到数据管理处理'
            : '云同步未完成，可继续本机记工',
      })
    } finally {
      if (version === this.showVersion) this.setData({ cloudBusy: false })
    }
  },
  onHide() {
    this.showVersion = (this.showVersion || 0) + 1
  },
  refresh() {
    try {
      const repo = repository(),
        s = repo.read(),
        month = this.data.month
      const [year, m] = month.split('-').map(Number)
      const totals = summary(s.book, { from: month + '-01', to: localDate(new Date(year, m, 0)) })
      this.setData({
        earned: money(totals.earned),
        paid: money(totals.paid),
        due: money(totals.due),
        settled: money(totals.settled),
        advance: money(totals.advance),
        days: quantity(totals.days),
        hours: quantity(totals.hours),
        pieces: quantity(totals.pieces),
        recordCount: totals.count,
        workerCount: rows(s.book, 'workers').filter((w) => w.status === 'active').length,
        projectCount: rows(s.book, 'projects').filter((p) => p.status === 'active').length,
        recent: rows(s.book, 'entries')
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .slice(0, 5)
          .map((e) => ({
            ...e,
            name: s.book.workers[e.workerId]?.name || '未命名工人',
            initial: (s.book.workers[e.workerId]?.name || '工').slice(0, 1),
            project: s.book.projects[e.projectId]?.name || '未分配工地',
            amount: money(e.amountFen),
          })),
        pending: s.pending.length,
        storageLabel:
          scope() === 'guest'
            ? '本机免费 · 无需登录'
            : s.cloudEnabled
              ? '本机台账 · 云同步已开启'
              : '本机台账 · 云同步未开启',
        error: repo.recovered ? '已恢复上一份完整台账，请先导出备份并核对最新记录。' : '',
      })
    } catch (e) {
      this.setData({ error: errorText(e) })
    }
  },
  monthChange(e: any) {
    if (!validDate(e.detail.value + '-01')) return
    this.setData({ month: e.detail.value })
    this.refresh()
  },
  go(e: any) {
    const page = e.currentTarget.dataset.page
    if (['people', 'finance', 'records', 'reports'].includes(page))
      navigation.navigateTo({ url: '/subpackages/workbook/' + page + '/index' })
  },
  edit(e: any) {
    navigation.navigateTo({
      url: '/subpackages/workbook/edit/index?id=' + encodeURIComponent(e.currentTarget.dataset.id),
    })
  },
  add() {
    navigation.navigateTo({ url: '/subpackages/workbook/edit/index' })
  },
  firstEntry() {
    navigation.navigateTo({
      url: this.data.workerCount
        ? '/subpackages/workbook/edit/index'
        : '/subpackages/workbook/people/index',
    })
  },
  cloudInfo() {
    wx.showModal({
      title: '云同步状态',
      content: this.data.cloudDetail || '本机功能免费，云同步需在数据管理中主动开启。',
      showCancel: false,
    })
  },
  async pull() {
    try {
      await syncWorkbook(true)
      this.refresh()
    } catch (e) {
      reportError(e)
    }
  },
})
