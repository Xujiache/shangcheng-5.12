interface Msg {
  id: number
  icon: string
  color: string
  tint: string
  title: string
  body: string
  time: string
  unread: boolean
}

const SEED: Msg[] = [
  {
    id: 1,
    icon: 'orders',
    color: 'accent',
    tint: 'rgba(14,124,102,0.12)',
    title: '订单已保存',
    body: '客户「华庭别墅」的订单已成功录入，利润 ¥3,200。',
    time: '今天 09:24',
    unread: true,
  },
  {
    id: 2,
    icon: 'target',
    color: 'c3',
    tint: 'rgba(223,160,58,0.14)',
    title: '本月目标进度',
    body: '本月利润已完成 68%，距离目标还差 ¥9,600，继续加油。',
    time: '今天 08:00',
    unread: true,
  },
  {
    id: 3,
    icon: 'trend',
    color: 'accent',
    tint: 'rgba(14,124,102,0.12)',
    title: '周报已生成',
    body: '上周共 12 笔订单，净利润 ¥28,400，环比增长 14%。',
    time: '昨天 18:30',
    unread: true,
  },
  {
    id: 4,
    icon: 'crown',
    color: 'c3',
    tint: 'rgba(244,213,138,0.28)',
    title: '会员即将到期',
    body: '您的会员将于 7 天后到期，续费后可继续使用全部功能。',
    time: '06-05 10:12',
    unread: false,
  },
  {
    id: 5,
    icon: 'shield',
    color: 'c2',
    tint: 'rgba(76,159,190,0.14)',
    title: '数据已云备份',
    body: '您的经营数据已自动加密备份，换机也不会丢失。',
    time: '06-04 02:00',
    unread: false,
  },
  {
    id: 6,
    icon: 'info',
    color: 'muted',
    tint: 'var(--track)',
    title: '欢迎使用门窗利账',
    body: '感谢使用门窗利账，祝您生意兴隆，利润长虹。',
    time: '06-01 12:00',
    unread: false,
  },
]

Page({
  data: {
    list: SEED,
    hasUnread: true,
  },

  onLoad() {
    this.refreshUnread()
  },

  refreshUnread() {
    this.setData({ hasUnread: this.data.list.some((m) => m.unread) })
  },

  onRead(e: any) {
    const id = Number(e.currentTarget.dataset.id)
    const list = this.data.list.map((m) => (m.id === id ? { ...m, unread: false } : m))
    this.setData({ list }, () => this.refreshUnread())
  },

  onReadAll() {
    const list = this.data.list.map((m) => ({ ...m, unread: false }))
    this.setData({ list, hasUnread: false })
    wx.showToast({ title: '已全部标记为已读', icon: 'none' })
  },
})
