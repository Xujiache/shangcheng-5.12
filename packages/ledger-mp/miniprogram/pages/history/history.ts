import { MotionPage, navigation } from '../../utils/page-transition'
import { clearVideoParseHistory, listVideoParseHistory, removeVideoParseHistory, setPendingVideoParseResult, type VideoParseHistoryItem } from '../../utils/video-parser-history'

function displayTime(value: number): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function viewItems() { return listVideoParseHistory().map(item => ({ ...item, displayTime: displayTime(item.createdAt) })) }

MotionPage({
  _touchStartX: 0,
  data: { items: [] as VideoParseHistoryItem[] },
  onShow() { this.setData({ items: viewItems() }) },
  openItem(event: any) {
    const index = Number(event.currentTarget.dataset.index)
    const item = this.data.items[index]
    if (!item) return
    setPendingVideoParseResult(item)
    navigation.navigateTo({ url: '/subpackages/more-tools/video-parser/result/index' })
  },
  deleteItem(event: any) {
    const index = Number(event.currentTarget.dataset.index)
    removeVideoParseHistory(index)
    this.setData({ items: viewItems() })
  },
  onTouchStart(event: any) { this._touchStartX = Number(event.touches?.[0]?.clientX || 0) },
  onTouchEnd(event: any) {
    const endX = Number(event.changedTouches?.[0]?.clientX || 0)
    if (this._touchStartX - endX > 60) this.deleteItem(event)
  },
  clearAll() {
    if (!this.data.items.length) return
    wx.showModal({ title: '清空历史记录', content: '清空后无法恢复，确定继续吗？', confirmText: '清空', confirmColor: '#d2735a', success: result => {
      if (!result.confirm) return
      clearVideoParseHistory()
      this.setData({ items: [] })
    } })
  },
  goBack() { navigation.navigateBack() },
})
