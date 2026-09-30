export interface ToolDefinition {
  id: string
  title: string
  shortLabel: string
  group: 'popular' | 'other'
  action: 'existing-tool' | 'navigate'
  keywords: string[]
}
export const TOOL_CATALOG: ToolDefinition[] = [
  { id: 'triangle', title: '三角计算', shortLabel: '三角计算', group: 'popular', action: 'existing-tool', keywords: ['三角', '边角', 'triangle'] },
  { id: 'arc', title: '圆弧计算', shortLabel: '圆弧计算', group: 'popular', action: 'existing-tool', keywords: ['圆弧', '弦长', '拱高', 'arc'] },
  { id: 'cut', title: '优化下料', shortLabel: '优化下料', group: 'popular', action: 'existing-tool', keywords: ['切割', '下料', '排版'] },
  { id: 'work-log', title: '记工', shortLabel: '记工', group: 'popular', action: 'existing-tool', keywords: ['工时', '工资', '日工'] },
  { id: 'format', title: '格式转换', shortLabel: '格式转换', group: 'popular', action: 'existing-tool', keywords: ['格式', 'pdf', '图片', '文档', '转换'] },
  { id: 'rmb', title: '人民币大小写转换', shortLabel: '人民币\n大小写', group: 'other', action: 'navigate', keywords: ['人民币', '大写', '金额', '小写'] },
  { id: 'retire', title: '退休倒计时', shortLabel: '退休\n倒计时', group: 'other', action: 'navigate', keywords: ['退休', '年龄', '养老', '倒计时'] },
  { id: 'level', title: '水平仪测量仪', shortLabel: '水平仪\n测量仪', group: 'other', action: 'navigate', keywords: ['水平', '角度', '倾角', '测量'] },
  { id: 'glass', title: '玻璃 K 值计算', shortLabel: '玻璃K值\n计算', group: 'other', action: 'navigate', keywords: ['玻璃', 'k值', 'k value', '传热', '中空', '真空', '多层', '三玻'] },
  { id: 'glass-weight', title: '玻璃重量估算', shortLabel: '玻璃重量\n估算', group: 'other', action: 'navigate', keywords: ['玻璃', '重量', '密度', '厚度', '自重'] },
  { id: 'luban', title: '鲁班尺', shortLabel: '鲁班尺', group: 'other', action: 'navigate', keywords: ['鲁班', '门尺', '吉数', '丁兰'] },
  { id: 'tide', title: '潮汐表', shortLabel: '潮汐表', group: 'other', action: 'navigate', keywords: ['潮汐', '潮位', '港口', '涨潮', '落潮', '海钓'] },
  { id: 'metal', title: '金属计算器', shortLabel: '金属\n计算器', group: 'other', action: 'navigate', keywords: ['金属', '重量', '材料', '算价', '钢材', '铝材', '型材'] },
]

const normalize = value => String(value).normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim()

export function searchTools(query: string): ToolDefinition[] {
  const tokens = normalize(query).split(' ').filter(Boolean)
  if (!tokens.length) return TOOL_CATALOG
  return TOOL_CATALOG.filter(tool => {
    const searchable = normalize([tool.title, ...tool.keywords].join(' '))
    return tokens.every(token => searchable.includes(token))
  })
}
