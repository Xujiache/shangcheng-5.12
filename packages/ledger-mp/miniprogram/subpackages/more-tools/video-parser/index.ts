import { videoParseApi, type VideoParseResult } from '../../../api/index'
import { API_BASE } from '../../../config'
import { MotionPage, navigation } from '../../../utils/page-transition'
import { reportToolEvent } from '../../../utils/tool-events'
import { detectVideoPlatform, looksLikeVideoLink, type VideoPlatform } from '../utils/video-parser-platform'
import { VIDEO_PARSE_TIPS } from '../utils/video-parser-tips'
import { saveVideoParseHistory, setPendingVideoParseResult, type VideoParseHistoryItem } from '../../../utils/video-parser-history'

type DisplayResult = VideoParseHistoryItem

function ownedMediaUrl(value: unknown): string {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.startsWith('/') && !text.startsWith('//')) return API_BASE + text
  return text.startsWith(API_BASE + '/') ? text : ''
}

function errorTip(error: any): string {
  const code = Number(error?.code)
  if (code === 1) return VIDEO_PARSE_TIPS.invalid
  if (code === 2) return VIDEO_PARSE_TIPS.unsupported
  if (code === 3 || Number(error?.statusCode) >= 500) return VIDEO_PARSE_TIPS.busy
  if (code === 4 || error?.message === VIDEO_PARSE_TIPS.unavailable || !error?.statusCode || Number(error?.statusCode) === 404) return VIDEO_PARSE_TIPS.unavailable
  return error?.message || VIDEO_PARSE_TIPS.busy
}

function toDisplayResult(data: VideoParseResult, input: string): DisplayResult | null {
  const title = String(data?.title || '').trim()
  const video = ownedMediaUrl(data?.video)
  if (!title || !video) return null
  const platform = detectVideoPlatform(input)
  return { title, video, platform: platform.id, platformLabel: platform.label, createdAt: Date.now() }
}

MotionPage({
  _opened: false,
  data: {
    inputText: '',
    clipboardHint: false,
    parsing: false,
  },
  onShow() {
    if (!this._opened) { this._opened = true; reportToolEvent('video-parser', 'open') }
    wx.getClipboardData({
      success: res => this.setData({ clipboardHint: looksLikeVideoLink(String(res.data || '')) }),
      fail: () => this.setData({ clipboardHint: false }),
    })
  },
  onShareAppMessage() { return { title: '视频解析助手', path: '/subpackages/more-tools/video-parser/index', imageUrl: 'https://ewsn.top/ledger-share/comic-hd-v1/more-tools.jpg' } },
  onShareTimeline() { return { title: '视频解析助手', query: '', imageUrl: 'https://ewsn.top/ledger-share/comic-hd-v1/more-tools.jpg' } },
  onInput(event: any) { this.setData({ inputText: String(event.detail.value || '').slice(0, 2000) }) },
  pasteFromClipboard() {
    wx.getClipboardData({ success: res => this.setData({ inputText: String(res.data || '').slice(0, 2000), clipboardHint: false }) })
  },
  useClipboardHint() { this.pasteFromClipboard() },
  dismissClipboardHint() { this.setData({ clipboardHint: false }) },
  clearInput() { this.setData({ inputText: '' }) },
  async parseVideo() {
    if (this.data.parsing) return
    const input = String(this.data.inputText || '').trim()
    if (!input) { wx.showToast({ title: VIDEO_PARSE_TIPS.empty, icon: 'none' }); return }
    if (!looksLikeVideoLink(input)) wx.showToast({ title: VIDEO_PARSE_TIPS.noLink, icon: 'none' })
    this.setData({ parsing: true })
    try {
      const result = toDisplayResult(await videoParseApi.parse(input), input)
      if (!result) throw Object.assign(new Error(VIDEO_PARSE_TIPS.unavailable), { code: 4 })
      saveVideoParseHistory(result)
      setPendingVideoParseResult(result)
      this.setData({ parsing: false })
      navigation.navigateTo({ url: '/subpackages/more-tools/video-parser/result/index' })
      reportToolEvent('video-parser', 'success')
    } catch (error) {
      this.setData({ parsing: false })
      reportToolEvent('video-parser', 'failure')
      wx.showToast({ title: errorTip(error), icon: 'none', duration: 2400 })
    }
  },
  openHistory() { navigation.navigateTo({ url: '/pages/history/history' }) },
  openPlatforms() { navigation.navigateTo({ url: '/pages/platforms/platforms' }) },
})
