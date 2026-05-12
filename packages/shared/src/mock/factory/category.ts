/**
 * 分类 Mock 数据
 */
import type { Category } from '../../types/product'
import { faker, BUSINESS_CATEGORIES } from '../faker'
import { genId } from '../../utils/id'

/** 二级子分类映射 */
const SUB_CATEGORIES: Record<string, string[]> = {
  家具: ['餐桌', '椅子', '沙发', '床', '茶几', '柜类', '儿童', '户外'],
  灯具: ['吊灯', '台灯', '吸顶灯', '射灯', '落地灯'],
  布艺: ['窗帘', '地毯', '抱枕', '床品'],
  厨卫: ['橱柜', '水槽', '龙头', '挂件', '马桶'],
  摆件: ['花瓶', '雕塑', '挂画', '香薰'],
  建材: ['瓷砖', '木地板', '墙纸', '涂料'],
  家电: ['冰箱', '洗衣机', '空调', '电视', '小家电'],
  定制: ['全屋定制', '衣柜', '橱柜定制', '榻榻米'],
}

/** 生成全部平台分类（含二级） */
export function genPlatformCategories(): Category[] {
  const list: Category[] = []
  const now = new Date().toISOString()

  BUSINESS_CATEGORIES.forEach((name, i) => {
    const id = genId()
    list.push({
      id,
      parentId: null,
      name,
      icon: `category-${i}`,
      sort: i,
      type: 'platform',
      createdAt: now,
      updatedAt: now,
    })

    SUB_CATEGORIES[name]?.forEach((sub, j) => {
      list.push({
        id: genId(),
        parentId: id,
        name: sub,
        sort: j,
        type: 'platform',
        createdAt: now,
        updatedAt: now,
      })
    })
  })

  return list
}

/** 生成厂家自定义分类 */
export function genMerchantCategories(merchantId: string, count = 3): Category[] {
  const presets = ['北欧系列', '新中式', '美式经典', '极简风', '法式优雅', '工业风']
  const now = new Date().toISOString()

  return faker.helpers.arrayElements(presets, Math.min(count, presets.length)).map((name, i) => ({
    id: genId(),
    parentId: null,
    name,
    sort: i,
    type: 'merchant' as const,
    merchantId,
    createdAt: now,
    updatedAt: now,
  }))
}
