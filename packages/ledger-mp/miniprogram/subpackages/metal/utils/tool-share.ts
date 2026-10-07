// Keep tool share configuration within this subpackage.
const specs = {
  metal: {
    title: '金属计算器',
    subtitle: '型材、板材与管材重量和价格估算',
    path: '/subpackages/metal/index/index',
    cover: 'https://ewsn.top/ledger-share/comic-hd-v1/metal.jpg',
  },
  'metal-calc': {
    title: '金属计算器 · 重量与价格',
    subtitle: '按材料和规格快速估算重量与价格',
    path: '/subpackages/metal/calc/index',
    cover: 'https://ewsn.top/ledger-share/comic-hd-v1/metal-calc.jpg',
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
