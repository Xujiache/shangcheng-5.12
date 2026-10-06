export type VideoPlatform = 'douyin' | 'kuaishou' | 'bilibili' | 'tiktok' | 'other'

const PLATFORM_RULES: Array<{ id: VideoPlatform; label: string; patterns: RegExp[] }> = [
  { id: 'douyin', label: '抖音', patterns: [/https?:\/\/(?:[\w-]+\.)?v\.douyin\.com\//i, /https?:\/\/(?:www\.)?douyin\.com\//i] },
  { id: 'kuaishou', label: '快手', patterns: [/https?:\/\/(?:[\w-]+\.)?v\.kuaishou\.com\//i, /https?:\/\/(?:www\.)?kuaishou\.com\/short-video\//i] },
  { id: 'bilibili', label: 'B站', patterns: [/https?:\/\/(?:www\.)?bilibili\.com\/video\/BV[\w]+/i] },
  { id: 'tiktok', label: 'TikTok', patterns: [/https?:\/\/(?:www\.)?tiktok\.com\/@[^/]+\/video\//i] },
]

export function detectVideoPlatform(value: string): { id: VideoPlatform; label: string } {
  const text = String(value || '')
  const matched = PLATFORM_RULES.find(rule => rule.patterns.some(pattern => pattern.test(text)))
  return matched ? { id: matched.id, label: matched.label } : { id: 'other', label: '其他平台' }
}

export function looksLikeVideoLink(value: string): boolean {
  return /https?:\/\/[^\s]+/i.test(String(value || ''))
}
