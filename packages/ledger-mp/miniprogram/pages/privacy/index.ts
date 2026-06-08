import { settingApi, orderApi, customerApi } from '../../api/index'
import { TOKEN_KEY } from '../../config'

interface ToggleItem {
  key: string
  settingKey: string
  icon: string
  label: string
  sub: string
  on: boolean
}

const DEFS: ToggleItem[] = [
  {
    key: 'hideAmount',
    settingKey: 'hideAmount',
    icon: 'eyeoff',
    label: '隐藏金额',
    sub: '列表中以星号隐藏敏感金额',
    on: false,
  },
  {
    key: 'bio',
    settingKey: 'bioLock',
    icon: 'finger',
    label: '生物解锁',
    sub: '打开应用时需指纹 / 面容验证',
    on: false,
  },
  {
    key: 'encBackup',
    settingKey: 'encBackup',
    icon: 'shield',
    label: '加密备份',
    sub: '云端备份数据端到端加密',
    on: true,
  },
]

/** 读取本地存储真实占用，作为「缓存」展示。 */
function calcCache(): string {
  try {
    const info = wx.getStorageInfoSync()
    const kb = info.currentSize || 0
    return kb < 1024 ? kb + ' KB' : (kb / 1024).toFixed(1) + ' MB'
  } catch (e) {
    return '0 KB'
  }
}

Page({
  data: {
    items: DEFS.map((it) => ({ ...it })),
    cacheSize: '0 KB',
  },

  onLoad() {
    this.setData({ cacheSize: calcCache() })
    this.load()
  },

  async load() {
    try {
      const s: any = await settingApi.get()
      this.setData({ items: DEFS.map((it) => ({ ...it, on: !!s[it.settingKey] })) })
    } catch (e) {
      /* 保留默认值 */
    }
  },

  async onToggle(e: any) {
    const key = e.currentTarget.dataset.key
    const items = this.data.items.map((it) => (it.key === key ? { ...it, on: !it.on } : it))
    this.setData({ items })
    const item = items.find((it) => it.key === key)
    if (!item) return
    try {
      await settingApi.update({ [item.settingKey]: item.on })
    } catch (e) {
      this.setData({
        items: this.data.items.map((it) => (it.key === key ? { ...it, on: !it.on } : it)),
      })
    }
  },

  /** 导出真实数据（订单 + 客户）到剪贴板，方便备份 / 转存。 */
  async onExport() {
    wx.showLoading({ title: '导出中…', mask: true })
    try {
      const [orders, customers]: any[] = await Promise.all([
        orderApi.list({ pageSize: 200 }),
        customerApi.list(),
      ])
      const lines: string[] = [
        '门窗利账 · 数据导出',
        '导出时间: ' + new Date().toLocaleString(),
        '',
      ]
      lines.push('== 订单 (' + (orders?.total ?? 0) + ') ==')
      ;(orders?.list || []).forEach((o: any) => {
        lines.push(`${o.date}  ${o.customer}  总价¥${o.total}  成本¥${o.cost}  利润¥${o.profit}`)
      })
      lines.push('', '== 客户 (' + (customers?.length ?? 0) + ') ==')
      ;(customers || []).forEach((c: any) => {
        lines.push(`${c.name}  ${c.phone || ''}  单数${c.count}  利润¥${c.profit}`)
      })
      wx.hideLoading()
      wx.setClipboardData({
        data: lines.join('\n'),
        success: () => wx.showToast({ title: '已复制到剪贴板', icon: 'success' }),
        fail: () => wx.showToast({ title: '导出失败', icon: 'none' }),
      })
    } catch (e) {
      wx.hideLoading()
      /* 网络错误已由 request 层提示 */
    }
  },

  onClearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '将清理本地临时数据（' + this.data.cacheSize + '），云端数据不受影响。',
      confirmText: '清除',
      success: (r) => {
        if (!r.confirm) return
        try {
          const info = wx.getStorageInfoSync()
          ;(info.keys || []).forEach((k) => {
            if (k !== TOKEN_KEY) wx.removeStorageSync(k)
          })
        } catch (e) {
          /* ignore */
        }
        this.setData({ cacheSize: calcCache() })
        wx.showToast({ title: '已清除', icon: 'success' })
      },
    })
  },
})
