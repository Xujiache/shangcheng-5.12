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
      {
        key: 'hideAmount',
        icon: 'eyeoff',
        label: '隐藏金额',
        sub: '列表中以星号隐藏敏感金额',
        on: false,
      },
      {
        key: 'bio',
        icon: 'finger',
        label: '生物解锁',
        sub: '打开应用时需指纹 / 面容验证',
        on: false,
      },
      {
        key: 'encBackup',
        icon: 'shield',
        label: '加密备份',
        sub: '云端备份数据端到端加密',
        on: true,
      },
    ] as ToggleItem[],
    cacheSize: '2.3 MB',
  },

  onToggle(e: any) {
    const key = e.currentTarget.dataset.key
    const items = this.data.items.map((it) => (it.key === key ? { ...it, on: !it.on } : it))
    this.setData({ items })
  },

  onExport() {
    wx.showToast({ title: '已生成', icon: 'success' })
  },

  onClearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '将清理本地临时数据（' + this.data.cacheSize + '），云端数据不受影响。',
      confirmText: '清除',
      success: (r) => {
        if (r.confirm) {
          this.setData({ cacheSize: '0 KB' })
          wx.showToast({ title: '已清除', icon: 'success' })
        }
      },
    })
  },
})
