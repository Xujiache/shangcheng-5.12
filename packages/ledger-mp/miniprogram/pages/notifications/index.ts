interface ToggleItem {
  key: string
  icon: string
  label: string
  sub: string
  on: boolean
}

Page({
  data: {
    items: [
      { key: 'order', icon: 'orders', label: '订单提醒', sub: '新订单保存与变更通知', on: true },
      { key: 'report', icon: 'trend', label: '报表提醒', sub: '周报 / 月报生成提醒', on: true },
      { key: 'goal', icon: 'target', label: '目标提醒', sub: '经营目标进度与达成提醒', on: true },
      { key: 'system', icon: 'bell', label: '系统通知', sub: '会员、安全与版本通知', on: false },
    ] as ToggleItem[],
  },

  onToggle(e: any) {
    const key = e.currentTarget.dataset.key
    const items = this.data.items.map((it) => (it.key === key ? { ...it, on: !it.on } : it))
    this.setData({ items })
  },

  toMsgCenter() {
    wx.navigateTo({ url: '/pages/message-center/index' })
  },
  toDnd() {
    wx.navigateTo({ url: '/pages/dnd/index' })
  },
})
