import type { VideoPlatform } from './video-parser-platform'

export interface VideoParseHistoryItem {
  title: string
  video: string
  platform: VideoPlatform
  platformLabel: string
  createdAt: number
}

const HISTORY_KEY = 'video_parse_history'
const PENDING_KEY = 'video_parse_pending_result'
const MAX_HISTORY = 50

function read(): VideoParseHistoryItem[] {
  try {
    const value = wx.getStorageSync(HISTORY_KEY)
    return Array.isArray(value) ? value.filter(item => item && typeof item.video === 'string') : []
  } catch { return [] }
}

export function listVideoParseHistory(): VideoParseHistoryItem[] { return read() }

export function saveVideoParseHistory(item: VideoParseHistoryItem): void {
  const next = [item, ...read().filter(row => row.video !== item.video)].slice(0, MAX_HISTORY)
  wx.setStorageSync(HISTORY_KEY, next)
}

export function removeVideoParseHistory(index: number): void {
  const next = read()
  if (index >= 0 && index < next.length) next.splice(index, 1)
  wx.setStorageSync(HISTORY_KEY, next)
}

export function clearVideoParseHistory(): void { wx.removeStorageSync(HISTORY_KEY) }

export function setPendingVideoParseResult(item: VideoParseHistoryItem): void { wx.setStorageSync(PENDING_KEY, item) }
export function consumePendingVideoParseResult(): VideoParseHistoryItem | null {
  try {
    const item = wx.getStorageSync(PENDING_KEY)
    wx.removeStorageSync(PENDING_KEY)
    return item && typeof item.video === 'string' ? item : null
  } catch {
    wx.removeStorageSync(PENDING_KEY)
    return null
  }
}
