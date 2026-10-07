// Keep tool share configuration within this subpackage.
const specs = {
  format: {
    title: '格式转换 · 文件处理',
    subtitle: '常用文档、图片、音视频格式转换',
    path: '/subpackages/format/index/index',
    cover: 'https://ewsn.top/ledger-share/comic-hd-v1/format.jpg',
  },
}

export type ToolShareId = keyof typeof specs
export const TOOL_SHARE_IDS = Object.keys(specs) as ToolShareId[]

export type ToolShareQuery = Record<string, string | number | boolean | undefined | null>

function encodeQuery(query?: ToolShareQuery) {
  return Object.entries(query || {})
    .filter(([, value]) => value !== undefined && value !== null && String(value) !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
}

export function toolShare(id: ToolShareId, query?: ToolShareQuery) {
  const spec = specs[id]
  const search = encodeQuery(query)
  return {
    title: spec.title,
    path: search ? `${spec.path}?${search}` : spec.path,
    imageUrl: spec.cover,
  }
}

/** WeChat Moments callbacks use `query`, while friend shares use `path`. */
export function toolShareTimeline(id: ToolShareId, query?: ToolShareQuery) {
  const spec = specs[id]
  return { title: spec.title, query: encodeQuery(query), imageUrl: spec.cover }
}

export function toolShareSpec(id: ToolShareId) {
  return specs[id]
}
