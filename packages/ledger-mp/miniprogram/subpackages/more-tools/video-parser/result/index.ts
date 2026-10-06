import { MotionPage, navigation } from '../../../../utils/page-transition'
import { reportToolEvent } from '../../../../utils/tool-events'
import { VIDEO_PARSE_TIPS } from '../../utils/video-parser-tips'
import { consumePendingVideoParseResult, type VideoParseHistoryItem } from '../../../../utils/video-parser-history'

const CONTENT_WIDTH_FALLBACK = 341

function viewportContentWidth(): number {
  try {
    const width = Number(wx.getSystemInfoSync().windowWidth)
    // The page has 16px horizontal scroll padding and the media card has a 1px border.
    // Calculate against the card's actual content box so native video controls cannot overflow.
    return width > 0 ? Math.max(280, width - 34) : CONTENT_WIDTH_FALLBACK
  } catch {
    return CONTENT_WIDTH_FALLBACK
  }
}

function mediaFrame(width: number, height: number, portraitWidth = 220): { width: number; height: number } {
  const ratio = width > 0 && height > 0 ? height / width : 9 / 16
  const contentWidth = viewportContentWidth()
  let frameWidth = ratio > 1.25 ? Math.min(contentWidth, portraitWidth) : contentWidth
  let frameHeight = frameWidth * ratio
  if (frameHeight > 560) {
    frameHeight = 560
    frameWidth = frameHeight / ratio
  }
  return { width: Math.round(frameWidth), height: Math.round(frameHeight) }
}

function download(url: string, onProgress: (value: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const task = wx.downloadFile({
      url,
      success: result => result.statusCode >= 200 && result.statusCode < 300 && result.tempFilePath
        ? resolve(result.tempFilePath)
        : reject(new Error('download')),
      fail: reject,
    })
    task.onProgressUpdate?.(event => onProgress(Math.max(0, Math.min(100, Number(event.progress) || 0))))
  })
}

function authorizeAlbum(): Promise<boolean> {
  return new Promise(resolve => {
    wx.authorize({
      scope: 'scope.writePhotosAlbum',
      success: () => resolve(true),
      fail: () => wx.showModal({
        title: VIDEO_PARSE_TIPS.albumPermission,
        content: '保存视频需要相册权限，请在设置中允许。',
        confirmText: '去设置',
        cancelText: '取消',
        success: result => {
          if (!result.confirm) return resolve(false)
          wx.openSetting({
            success: setting => resolve(setting.authSetting?.['scope.writePhotosAlbum'] === true),
            fail: () => resolve(false),
          })
        },
        fail: () => resolve(false),
      }),
    })
  })
}

MotionPage({
  data: {
    result: null as VideoParseHistoryItem | null,
    videoWidth: CONTENT_WIDTH_FALLBACK,
    videoHeight: 193,
    stageHeight: 193,
    savingVideo: false,
    progress: 0,
  },
  onShow() {
    const pending = consumePendingVideoParseResult()
    if (!pending) return
    const defaultVideo = mediaFrame(16, 9)
    this.setData({ result: pending, videoWidth: defaultVideo.width, videoHeight: defaultVideo.height, stageHeight: defaultVideo.height, progress: 0 })
  },
  onShareAppMessage() {
    const result = this.data.result
    return {
      title: result?.title ? `视频解析｜${result.title.slice(0, 22)}` : '视频解析助手',
      path: '/subpackages/more-tools/video-parser/index',
      imageUrl: 'https://ewsn.top/ledger-share/comic-hd-v1/more-tools.jpg',
    }
  },
  onShareTimeline() {
    const result = this.data.result
    return {
      title: result?.title ? `视频解析｜${result.title.slice(0, 22)}` : '视频解析助手',
      query: '',
      imageUrl: 'https://ewsn.top/ledger-share/comic-hd-v1/more-tools.jpg',
    }
  },
  onVideoMetadata(event: any) {
    const width = Number(event.detail?.width)
    const height = Number(event.detail?.height)
    if (width > 0 && height > 0) {
      const frame = mediaFrame(width, height)
      this.setData({ videoWidth: frame.width, videoHeight: frame.height, stageHeight: frame.height })
    }
  },
  async saveVideo() {
    if (this.data.savingVideo || !this.data.result) return
    if (!await authorizeAlbum()) return
    this.setData({ savingVideo: true, progress: 0 })
    try {
      const filePath = await download(this.data.result.video, progress => this.setData({ progress }))
      await new Promise<void>((resolve, reject) => {
        wx.saveVideoToPhotosAlbum({ filePath, success: () => resolve(), fail: reject })
      })
      this.setData({ progress: 100 })
      wx.showToast({ title: '视频已保存', icon: 'success' })
    } catch {
      wx.showToast({ title: VIDEO_PARSE_TIPS.downloadFailed, icon: 'none' })
    } finally {
      this.setData({ savingVideo: false })
    }
  },
  videoError() {
    wx.showToast({ title: VIDEO_PARSE_TIPS.videoFailed, icon: 'none' })
  },
  goBackToParser() {
    navigation.navigateBack()
  },
  openHistory() {
    navigation.navigateTo({ url: '/pages/history/history' })
  },
})
