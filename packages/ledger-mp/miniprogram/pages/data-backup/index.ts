import { dataApi } from '../../api/index'
import { TOKEN_KEY } from '../../config'
import { getBioLock, getHideAmount, setBioLock, setHideAmount } from '../../utils/store'

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

// 数据管理：加密导出 / 导入 + 清除缓存
Page({
  data: {
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

  onShow() {
    this.setData({ cacheSize: calcCache() })
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
          // 直到下次打开隐私页才从服务端回同步
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
