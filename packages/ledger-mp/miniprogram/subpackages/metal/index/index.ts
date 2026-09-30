import { MotionPage, navigation } from '../../../utils/page-transition'
import { METAL_CATEGORIES } from '../data/materials'
import { VERSION } from '../../../config'

const summaries = ['钢板 / 铜板 / 铝板', '角钢 / H 型钢等', '方管 / 矩形管', '扁钢 / 铜排 / 铝排', '焊管 / 圆管', '圆钢 / 铜棒 / 铝棒']

MotionPage({
  data: { categories: METAL_CATEGORIES.map((item, index) => ({ ...item, name: item.title.replace('类', ''), summary: summaries[index], icon: `/subpackages/metal/assets/icon-${item.id}.png` })), version: VERSION },
  openCategory(event: any) {
    const id = String(event.currentTarget.dataset.id)
    if (METAL_CATEGORIES.some(category => category.id === id)) {
      navigation.navigateTo({ url: `/subpackages/metal/calc/index?category=${id}` })
    }
  },
  openHistory() { navigation.navigateTo({ url: '/subpackages/metal/history/index' }) },
  openQuote() { navigation.navigateTo({ url: '/subpackages/metal/quote/index' }) },
  openFeedback() { navigation.navigateTo({ url: '/pages/feedback/index' }) },
})
