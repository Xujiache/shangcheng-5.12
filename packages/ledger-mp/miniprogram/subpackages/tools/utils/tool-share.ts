// Keep tool share configuration within this subpackage.
const specs = {
  triangle: {
    title: '三角计算 · 边角反算',
    subtitle: '输入 3 个参数，快速完成三角计算',
    path: '/subpackages/tools/pages/triangle-tool/index',
    cover: 'https://ewsn.top/ledger-share/comic-hd-v1/triangle.jpg',
  },
  arc: {
    title: '圆弧计算 · 弦长拱高',
    subtitle: '门窗圆弧尺寸快速反算',
    path: '/subpackages/tools/pages/arc-tool/index',
    cover: 'https://ewsn.top/ledger-share/comic-hd-v1/arc.jpg',
  },
  cut: {
    title: '优化下料 · 自动排版',
    subtitle: '减少损耗，提升下料效率',
    path: '/subpackages/tools/pages/cut/index',
    cover: 'https://ewsn.top/ledger-share/comic-hd-v1/cut.jpg',
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
