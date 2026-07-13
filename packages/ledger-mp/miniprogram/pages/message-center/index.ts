import { notificationApi } from '../../api/index'

// 消息类型 → 生成图标 / 底色
const PRESENT: Record<string, { iconSrc: string; tint: string }> = {
  order: { iconSrc: '/assets/settings/notification-order.png', tint: 'rgba(14,124,102,0.08)' },
  report: { iconSrc: '/assets/settings/notification-report.png', tint: 'rgba(14,124,102,0.08)' },
  goal: { iconSrc: '/assets/profile/profile-goal.png', tint: 'rgba(223,160,58,0.1)' },
  member: { iconSrc: '/assets/profile/profile-member.png', tint: 'rgba(244,213,138,0.18)' },
  security: { iconSrc: '/assets/settings/settings-privacy.png', tint: 'rgba(76,159,190,0.1)' },
  welcome: { iconSrc: '/assets/settings/settings-about.png', tint: 'var(--track)' },
  system: { iconSrc: '/assets/profile/profile-message.png', tint: 'rgba(14,124,102,0.08)' },
}

const pad = (n: number) => (n < 10 ? '0' + n : '' + n)

/** ISO 时间 → 今天 09:24 / 昨天 18:30 / 06-05 10:12 / 2025-12-30 */
function fmtTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const hm = pad(d.getHours()) + ':' + pad(d.getMinutes())
  const yest = new Date(now.getTime() - 86400000)
  if (d.toDateString() === now.toDateString()) return '今天 ' + hm
  if (d.toDateString() === yest.toDateString()) return '昨天 ' + hm
  if (d.getFullYear() === now.getFullYear())
    return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + hm
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

Page({
  data: {
    list: [] as any[],
    hasUnread: false,
    loading: true,
    loadError: false, // 网络/加载失败：区别于"暂无消息"空态
  },

  _seq: 0,

  onShow() {
    this.load()
  },

  async load() {
    // 序号守卫：onShow 可能并发触发，旧响应不得覆盖新数据
    const seq = (this._seq = (this._seq || 0) + 1)
    try {
      const rows: any[] = await notificationApi.list()
      if (seq !== this._seq) return
      const list = (rows || []).map((n) => {
        const p = PRESENT[n.type] || PRESENT.system
        return {
          id: n.id,
          iconSrc: p.iconSrc,
          tint: p.tint,
          title: n.title,
          body: n.body,
          time: fmtTime(n.createdAt),
          unread: !!n.unread,
        }
      })
      this.setData({
        list,
        hasUnread: list.some((m) => m.unread),
        loading: false,
        loadError: false,
      })
    } catch (e) {
      if (seq !== this._seq) return
      // 已有消息在屏时不切错误卡（request 层已 toast），仅首载失败才显示重试，同订单页口径
      this.setData({ loading: false, loadError: !this.data.list.length })
    }
  },
  retry() {
    this.setData({ loading: true, loadError: false }, () => this.load())
  },

  async onRead(e: any) {
    const id = String(e.currentTarget.dataset.id)
    const item = this.data.list.find((m) => m.id === id)
    if (!item || !item.unread) return
    const list = this.data.list.map((m) => (m.id === id ? { ...m, unread: false } : m))
    this.setData({ list, hasUnread: list.some((m) => m.unread) })
    try {
      await notificationApi.read(id)
    } catch (e) {
      /* 已乐观更新，下次进入以服务端为准 */
    }
  },

  async onReadAll() {
    if (!this.data.hasUnread) return
    const list = this.data.list.map((m) => ({ ...m, unread: false }))
    this.setData({ list, hasUnread: false })
    try {
      await notificationApi.readAll()
      wx.showToast({ title: '已全部标记为已读', icon: 'success' })
    } catch (e) {
      /* toast handled in request */
    }
  },
})
