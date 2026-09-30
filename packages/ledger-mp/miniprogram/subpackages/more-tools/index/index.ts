import { MotionPage, navigation } from '../../../utils/page-transition'
import { requireLogin } from '../../../utils/store'
import { searchTools } from '../../../utils/more-tools/catalog'

const images: Record<string, string> = {
  triangle: '/assets/tools/tool-triangle.png',
  arc: '/assets/tools/tool-arc.png',
  cut: '/assets/tools/tool-cut.png',
  'work-log': '/assets/tools/tool-work-log.png',
  format: '/assets/tools/tool-format.png',
  rmb: '/subpackages/more-tools/assets/tool-rmb.png',
  retire: '/subpackages/more-tools/assets/tool-retire.png',
  level: '/subpackages/more-tools/assets/tool-level.png',
  glass: '/subpackages/more-tools/assets/tool-glass.png',
  'glass-weight': '/subpackages/more-tools/assets/tool-glass-weight.png',
  luban: '/subpackages/more-tools/assets/tool-luban.png',
  tide: '/subpackages/more-tools/assets/tool-tide.png',
  metal: '/subpackages/more-tools/assets/tool-metal.png',
}
const routes: Record<string, string> = {
  triangle: '/subpackages/tools/pages/triangle-tool/index',
  arc: '/subpackages/tools/pages/arc-tool/index',
  cut: '/subpackages/tools/pages/cut/index',
  'work-log': '/subpackages/workbook/overview/index',
  format: '/subpackages/format/index/index',
  rmb: '/subpackages/more-tools/rmb/index',
  retire: '/subpackages/more-tools/retire/index',
  level: '/subpackages/more-tools/level/index',
  glass: '/subpackages/more-tools/glass/index',
  'glass-weight': '/subpackages/more-tools/glass-weight/index',
  luban: '/subpackages/more-tools/luban/index',
  tide: '/subpackages/more-tools/tide/index',
  metal: '/subpackages/metal/index/index',
}

MotionPage({
  data: {
    query: '',
    popular: [] as any[],
    others: [] as any[],
  },
  onLoad() {
    this.filter('')
  },
  filter(query: string) {
    const found = searchTools(query).map((tool: any) => ({
      ...tool,
      image: images[tool.id],
    }))
    this.setData({
      popular: found.filter((tool: any) => tool.group === 'popular'),
      others: found.filter((tool: any) => tool.group === 'other'),
    })
  },
  onSearch(event: any) {
    const query = String(event.detail.value || '')
    this.setData({ query })
    this.filter(query)
  },
  clearSearch() {
    this.setData({ query: '' })
    this.filter('')
  },
  openTool(event: any) {
    const id = String(event.currentTarget.dataset.id)
    const route = routes[id]
    if (!route) return
    if (id === 'format' && !requireLogin('登录后可免费使用格式转换，转换文件保留 30 天。')) return
    if (['rmb', 'retire', 'level', 'glass', 'glass-weight', 'luban'].includes(id) && !requireLogin('登录后可免费使用此工具。')) return
    navigation.navigateTo({ url: route })
  },
})
