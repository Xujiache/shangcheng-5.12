import { settingApi, orderApi, customerApi } from '../../api/index'
import { TOKEN_KEY } from '../../config'
import {
  setBioLock,
  setHideAmount,
  getBioLock,
  getHideAmount,
  getGlass,
  setGlass,
  getFxMode,
  setFxMode,
} from '../../utils/store'

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
    glassOn: true,
    fxMode: 'normal' as 'normal' | 'max',
    fxOptions: [
      { value: 'normal', label: '普通模式' },
      { value: 'max', label: '性能模式' },
    ],
    cacheSize: '0 KB',
  },

  onLoad() {
    this.setData({ cacheSize: calcCache(), glassOn: getGlass(), fxMode: getFxMode() })
    this.load()
  },

  // 玻璃质感：纯本地 UI 偏好（不入服务端）；切回各页 pageLifetimes.show 即生效
  onToggleGlass() {
    const next = !this.data.glassOn
    setGlass(next)
    this.setData({ glassOn: next })
    wx.showToast({ title: next ? '已开启沉浸光感' : '已关闭沉浸光感', icon: 'none' })
  },

  // 性能模式：本地偏好；各页 lz-bg 在 pageLifetimes.show 读取即生效
  onFxMode(e: any) {
    const m = e.detail.value === 'max' ? 'max' : 'normal'
    setFxMode(m)
    this.setData({ fxMode: m })
    wx.showToast({
      title: m === 'max' ? '已切到性能模式 · 全特效' : '已切到普通模式',
      icon: 'none',
    })
  },

  async load() {
    try {
      const s: any = await settingApi.get()
      this.setData({ items: DEFS.map((it) => ({ ...it, on: !!s[it.settingKey] })) })
      // 同步本地镜像（app 锁屏 / 金额掩码读本地，避免每次启动等接口）
      setHideAmount(!!s.hideAmount)
      setBioLock(!!s.bioLock)
    } catch (e) {
      /* 保留默认值 */
    }
  },

  /** 设备是否支持指纹 / 面容 */
  checkSoter(): Promise<boolean> {
    return new Promise((resolve) => {
      wx.checkIsSupportSoterAuthentication({
        success: (r) =>
          resolve((r.supportMode || []).some((m) => m === 'fingerPrint' || m === 'facial')),
        fail: () => resolve(false),
      })
    })
  },

  async onToggle(e: any) {
    const key = e.currentTarget.dataset.key
    const cur = this.data.items.find((it) => it.key === key)
    if (!cur) return
    const next = !cur.on
    if (key === 'bio' && next && !(await this.checkSoter())) {
      wx.showToast({ title: '当前设备不支持指纹/面容', icon: 'none' })
      return
    }
    this.setData({
      items: this.data.items.map((it) => (it.key === key ? { ...it, on: next } : it)),
    })
    try {
      await settingApi.update({ [cur.settingKey]: next })
      if (cur.settingKey === 'bioLock') setBioLock(next)
      if (cur.settingKey === 'hideAmount') setHideAmount(next)
    } catch (e) {
      this.setData({
        items: this.data.items.map((it) => (it.key === key ? { ...it, on: !next } : it)),
      })
    }
  },

  /** 导出真实数据（订单 + 客户）到剪贴板，方便备份 / 转存。 */
  async onExport() {
    wx.showLoading({ title: '导出中…', mask: true })
    const pageSize = 200
    const maxPages = 25 // 安全上限（5000 条），防异常 total 死循环
    let rows: any[] = []
    let total = 0
    let truncated = false
    let customers: any[] = []
    try {
      // 逐页拉全量订单，避免只导出第一页就静默截断
      for (let page = 1; page <= maxPages; page++) {
        const orders: any = await orderApi.list({ page, pageSize })
        const list = orders?.list || []
        total = orders?.total ?? 0
        rows = rows.concat(list)
        if (rows.length >= total || !list.length) break
        if (page === maxPages) truncated = true
      }
      customers = ((await customerApi.list()) as any[]) || []
    } catch (e) {
      if (!rows.length) {
        wx.hideLoading()
        return /* 第一页都没拿到：网络错误已由 request 层提示 */
      }
      truncated = true // 中途失败：导出已取到的部分并注明
    }
    const lines: string[] = ['门窗利账 · 数据导出', '导出时间: ' + new Date().toLocaleString(), '']
    lines.push('== 订单 (' + total + ') ==')
    rows.forEach((o: any) => {
      lines.push(`${o.date}  ${o.customer}  总价¥${o.total}  成本¥${o.cost}  利润¥${o.profit}`)
    })
    lines.push('', '== 客户 (' + (customers?.length ?? 0) + ') ==')
    ;(customers || []).forEach((c: any) => {
      lines.push(`${c.name}  ${c.phone || ''}  单数${c.count}  利润¥${c.profit}`)
    })
    if (truncated) lines.push('', `（仅导出前 ${rows.length} 条，共 ${total} 条）`)
    wx.hideLoading()
    wx.setClipboardData({
      data: lines.join('\n'),
      success: () => wx.showToast({ title: '已复制到剪贴板', icon: 'success' }),
      fail: () => wx.showToast({ title: '导出失败', icon: 'none' }),
    })
  },

  onClearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '将清理本地临时数据（' + this.data.cacheSize + '），云端数据不受影响。',
      confirmText: '清除',
      success: (r) => {
        if (!r.confirm) return
        try {
          // 生物锁/隐藏金额的本地镜像不能被清掉：否则生物锁会静默失效（fail-open）
          // 直到下次打开本页才从服务端回同步
          const bio = getBioLock()
          const hide = getHideAmount()
          const info = wx.getStorageInfoSync()
          ;(info.keys || []).forEach((k) => {
            if (k !== TOKEN_KEY) wx.removeStorageSync(k)
          })
          setBioLock(bio)
          setHideAmount(hide)
        } catch (e) {
          /* ignore */
        }
        this.setData({ cacheSize: calcCache() })
        wx.showToast({ title: '已清除', icon: 'success' })
      },
    })
  },
})
