// Keep tool share configuration within this subpackage.
const specs = {
  'work-log': {
    title: '记工 · 日工明细',
    subtitle: '记录工时，随时查看工资明细',
    path: '/subpackages/workbook/overview/index',
    cover: 'https://ewsn.top/ledger-share/comic-hd-v1/work-log.jpg',
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
