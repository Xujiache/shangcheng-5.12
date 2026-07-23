import { settingApi } from '../../api/index'
import {
  DEFAULT_COST_CATEGORIES,
  cacheCostCategories,
  createCostCategoryId,
  nextCostColor,
  readCostCategories,
} from '../../utils/cost-categories'

Page({
  data: {
    categories: readCostCategories() as any[],
    loading: true,
    saving: false,
  },

  async onLoad() {
    try {
      const settings: any = await settingApi.get()
      this.setData({ categories: cacheCostCategories(settings.costCategories) })
    } catch {
      // 离线时继续使用本地缓存，保存时再提示网络错误。
    } finally {
      this.setData({ loading: false })
    }
  },

  addCategory() {
    if (this.data.categories.length >= 20) {
      wx.showToast({ title: '最多设置 20 个常用成本', icon: 'none' })
      return
    }
    const index = this.data.categories.length
    this.setData({
      categories: [
        ...this.data.categories,
        { id: createCostCategoryId(), name: '', color: nextCostColor(index) },
      ],
    })
  },

  onName(e: any) {
    const index = Number(e.currentTarget.dataset.index)
    const categories = [...this.data.categories]
    if (!categories[index]) return
    categories[index] = {
      ...categories[index],
      name: String(e.detail.value || '').slice(0, 20),
    }
    this.setData({ categories })
  },

  moveUp(e: any) {
    this.move(Number(e.currentTarget.dataset.index), -1)
  },

  moveDown(e: any) {
    this.move(Number(e.currentTarget.dataset.index), 1)
  },

  move(index: number, offset: number) {
    const target = index + offset
    if (target < 0 || target >= this.data.categories.length) return
    const categories = [...this.data.categories]
    ;[categories[index], categories[target]] = [categories[target], categories[index]]
    this.setData({ categories })
  },

  removeCategory(e: any) {
    if (this.data.categories.length <= 1) {
      wx.showToast({ title: '至少保留一个成本分类', icon: 'none' })
      return
    }
    const index = Number(e.currentTarget.dataset.index)
    this.setData({
      categories: this.data.categories.filter((_: any, i: number) => i !== index),
    })
  },

  resetDefault() {
    wx.showModal({
      title: '恢复默认分类',
      content: '将恢复为型材、玻璃、配件、人工、纱窗，当前排序和名称会被替换。',
      success: (result) => {
        if (result.confirm)
          this.setData({ categories: DEFAULT_COST_CATEGORIES.map((item) => ({ ...item })) })
      },
    })
  },

  async save() {
    if (this.data.saving) return
    const categories = this.data.categories.map((item: any) => ({
      id: item.id,
      name: String(item.name || '').trim(),
      color: item.color,
    }))
    if (categories.some((item: any) => !item.name)) {
      wx.showToast({ title: '请填写完整的成本名称', icon: 'none' })
      return
    }
    const names = categories.map((item: any) => item.name)
    if (new Set(names).size !== names.length) {
      wx.showToast({ title: '成本名称不能重复', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    try {
      const result: any = await settingApi.update({ costCategories: categories })
      cacheCostCategories(result.costCategories || categories)
      wx.showToast({ title: '分类已保存', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 450)
    } catch {
      this.setData({ saving: false })
    }
  },
})
