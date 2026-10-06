// Keep tool share configuration within this subpackage.
const specs = {
  'more-tools': {
    title: '量窗助手 · 更多实用工具',
    subtitle: '门窗人的效率工具箱',
    path: '/subpackages/more-tools/index/index',
    cover: 'https://ewsn.top/ledger-share/comic-hd-v1/more-tools.jpg',
  },
  rmb: {
    title: '人民币大小写转换',
    subtitle: '金额填写更准确，票据处理更省心',
    path: '/subpackages/more-tools/rmb/index',
    cover: 'https://ewsn.top/ledger-share/comic-hd-v1/rmb.jpg',
  },
  retire: {
    title: '退休倒计时',
    subtitle: '按退休政策计算预计退休时间',
    path: '/subpackages/more-tools/retire/index',
    cover: 'https://ewsn.top/ledger-share/comic-hd-v1/retire.jpg',
  },
  level: {
    title: '水平仪测量仪',
    subtitle: '用手机快速测量水平与倾角',
    path: '/subpackages/more-tools/level/index',
    cover: 'https://ewsn.top/ledger-share/comic-hd-v1/level.jpg',
  },
  glass: {
    title: '玻璃 K 值计算',
    subtitle: '中空、真空玻璃传热系数估算',
    path: '/subpackages/more-tools/glass/index',
    cover: 'https://ewsn.top/ledger-share/comic-hd-v1/glass.jpg',
  },
  'glass-weight': {
    title: '玻璃重量估算',
    subtitle: '快速估算玻璃重量与单位面积重量',
    path: '/subpackages/more-tools/glass-weight/index',
    cover: 'https://ewsn.top/ledger-share/comic-hd-v1/glass-weight.jpg',
  },
  luban: {
    title: '鲁班尺 · 吉数查询',
    subtitle: '滑动选择尺寸，查看文公尺与丁兰尺结果',
    path: '/subpackages/more-tools/luban/index',
    cover: 'https://ewsn.top/ledger-share/comic-hd-v1/luban.jpg',
  },
  tide: {
    title: '潮汐表',
    subtitle: '查询港口潮时与潮位变化',
    path: '/subpackages/more-tools/tide/index',
    cover: 'https://ewsn.top/ledger-share/comic-hd-v1/tide.jpg',
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
