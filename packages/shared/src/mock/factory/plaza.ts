/**
 * 选品广场 Mock
 */
import type { PlazaPush, PlazaProductCard } from '../../types/plaza'
import { faker, chance, pickN } from '../faker'
import { genId } from '../../utils/id'

const PLAZA_TAGS = ['🔥本周热推', '新品', '厂家直供', '高佣金', '限时', '爆款']

/** 推送 */
export function genPlazaPush(): PlazaPush {
  const now = new Date().toISOString()
  return {
    id: genId(),
    productIds: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }).map(() => genId()),
    targetType: 'product',
    positions: pickN(['merchant_app_home_entry', 'plaza_top_banner', 'category_top'] as const, 2),
    tags: pickN(PLAZA_TAGS, faker.number.int({ min: 1, max: 2 })),
    audience: { type: 'all' },
    scheduledStart: '2026-05-11',
    scheduledEnd: '2026-06-11',
    weight: faker.number.int({ min: 50, max: 99 }),
    suggestMarkupMin: 200,
    suggestMarkupMax: 500,
    suggestCommission: faker.number.int({ min: 5, max: 12 }),
    pushText: '平台精选 · 厂家直供 · 一键代理',
    status: chance(70) ? 'active' : 'pending',
    stats: {
      impressions: faker.number.int({ min: 1000, max: 100000 }),
      clicks: faker.number.int({ min: 100, max: 10000 }),
      agencyApplies: faker.number.int({ min: 10, max: 500 }),
      deals: faker.number.int({ min: 5, max: 200 }),
    },
    createdAt: now,
    updatedAt: now,
  }
}

/** 选品广场卡片 */
export function genPlazaCard(): PlazaProductCard {
  return {
    productId: genId(),
    productName: faker.helpers.arrayElement(['实木真皮沙发', '岩板茶几', '北欧吊灯', '智能升降桌']) + ' #' + faker.number.int({ min: 1, max: 999 }),
    productImage: `https://picsum.photos/seed/${faker.number.int({ min: 1, max: 100 })}/400/400`,
    factoryName: faker.helpers.arrayElement(['经纬科技', '佛山实木家具厂', '南方睡眠科技', '岩板工厂', '创智办公']),
    factoryId: genId(),
    startPrice: faker.number.int({ min: 800, max: 5000 }),
    agencyCount: faker.number.int({ min: 0, max: 300 }),
    tags: pickN(PLAZA_TAGS, faker.number.int({ min: 1, max: 2 })),
    isPlatformPushed: chance(60),
    suggestMarkupMin: 100,
    suggestMarkupMax: 600,
    suggestCommission: faker.number.int({ min: 5, max: 15 }),
  }
}
