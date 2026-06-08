import { notificationApi } from '../../api/index'

// 消息类型 → 展示样式（图标 / 颜色 token / 底色）
const PRESENT: Record<string, { icon: string; color: string; tint: string }> = {
  order: { icon: 'orders', color: 'accent', tint: 'rgba(14,124,102,0.12)' },
  report: { icon: 'trend', color: 'accent', tint: 'rgba(14,124,102,0.12)' },
  goal: { icon: 'target', color: 'c3', tint: 'rgba(223,160,58,0.14)' },
  member: { icon: 'crown', color: 'c3', tint: 'rgba(244,213,138,0.28)' },
  security: { icon: 'shield', color: 'c2', tint: 'rgba(76,159,190,0.14)' },
  welcome: { icon: 'info', color: 'muted', tint: 'var(--track)' },
  system: { icon: 'bell', color: 'accent', tint: 'rgba(14,124,102,0.12)' },
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
  },

  onShow() {
    this.load()
  },

  async load() {
    try {
      const rows: any[] = await notificationApi.list()
      const list = (rows || []).map((n) => {
        const p = PRESENT[n.type] || PRESENT.system
        return {
          id: n.id,
          icon: p.icon,
          color: p.color,
          tint: p.tint,
          title: n.title,
          body: n.body,
          time: fmtTime(n.createdAt),
          unread: !!n.unread,
        }
      })
      this.setData({ list, hasUnread: list.some((m) => m.unread), loading: false })
    } catch (e) {
      this.setData({ loading: false })
    }
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
      wx.showToast({ title: '已全部标记为已读', icon: 'none' })
    } catch (e) {
      /* toast handled in request */
    }
  },
})
