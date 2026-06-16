import { settingApi, dataApi } from '../../api/index'
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
    exportShow: false,
    importShow: false,
    allowShare: false,
    importText: '',
    exporting: false,
    importing: false,
    exportResult: '', // 非空=已生成，弹窗内展示数据包供查看/复制
    exportInfo: '', // 数据包摘要（X 单 / Y 客户 · 是否允许他人导入）
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

  // ── 数据加密导出 / 导入 ──
  openExport() {
    this.setData({ exportShow: true, exportResult: '', exportInfo: '' })
  },
  closeExport() {
    this.setData({ exportShow: false, exportResult: '', exportInfo: '' })
  },
  toggleAllowShare() {
    this.setData({ allowShare: !this.data.allowShare })
  },
  async doExport() {
    if (this.data.exporting) return
    this.setData({ exporting: true })
    try {
      const r: any = await dataApi.exportData(this.data.allowShare)
      if (r && r.package) {
        const allow = this.data.allowShare
        const info = `${r.orders} 单 / ${r.customers} 客户 · ${allow ? '已允许他人导入' : '仅本人可导入'}`
        // 生成后停留在弹窗内展示数据包：用户看得见、能手动复制，不再用「已在剪贴板」这种含糊提示
        this.setData({ exportResult: r.package, exportInfo: info })
        // 顺手自动复制一次（便捷），展示区+复制按钮才是可靠路径
        wx.setClipboardData({
          data: r.package,
          success: () => wx.showToast({ title: '已复制到剪贴板', icon: 'none' }),
          fail: () => {},
        })
      }
    } catch (e) {
      /* request 层已提示 */
    } finally {
      this.setData({ exporting: false })
    }
  },
  copyExport() {
    const pkg = this.data.exportResult
    if (!pkg) return
    wx.setClipboardData({
      data: pkg,
      success: () => wx.showToast({ title: '已复制，去粘贴保存', icon: 'none' }),
      fail: () => wx.showToast({ title: '复制失败', icon: 'none' }),
    })
  },
  openImport() {
    this.setData({ importShow: true, importText: '' })
  },
  closeImport() {
    this.setData({ importShow: false })
  },
  onImportInput(e: any) {
    this.setData({ importText: String(e.detail.value || '') })
  },
  async doImport() {
    const pkg = this.data.importText.trim()
    if (!pkg) {
      wx.showToast({ title: '请粘贴数据包', icon: 'none' })
      return
    }
    if (this.data.importing) return
    this.setData({ importing: true })
    try {
      const r: any = await dataApi.importData(pkg)
      this.setData({ importShow: false })
      wx.showToast({ title: `已导入 ${r.orders} 单 / ${r.customers} 客户`, icon: 'none' })
    } catch (e) {
      /* request 层已提示（不允许导入 / 已篡改 等） */
    } finally {
      this.setData({ importing: false })
    }
  },
  noopMask() {},

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
