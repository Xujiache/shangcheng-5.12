/**
 * 杂项 Mock：提现、佣金、广告、会员套餐、功能开关、统计
 */
import type { Withdraw, Commission, PromoteSummary } from '../../types/commission'
import type { AdSlot, AdCreative } from '../../types/ad'
import type { MemberPlan } from '../../types/member'
import type { FeatureFlag } from '../../types/feature-flag'
import type { MerchantDashboard, MerchantStats, PlatformDashboard } from '../../types/stats'
import { faker, chineseName, chinaPhone, placeholderImage, chance, pickN } from '../faker'
import { genId, genWithdrawNo } from '../../utils/id'

/* ============ 提现 ============ */
export function genWithdraw(): Withdraw {
  const now = new Date().toISOString()
  const applyAmount = faker.number.float({ min: 50, max: 2000, fractionDigits: 2 })
  return {
    id: genId(),
    no: genWithdrawNo(),
    userId: genId(),
    applyAmount,
    actualAmount: applyAmount,
    method: 'wechat',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }
}

export function genCommission(): Commission {
  const now = new Date().toISOString()
  return {
    id: genId(),
    orderId: genId(),
    userId: genId(),
    level: chance(70) ? 1 : 2,
    amount: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
    status: faker.helpers.arrayElement(['pending', 'settled'] as const),
    createdAt: now,
    updatedAt: now,
  }
}

export function genPromoteSummary(): PromoteSummary {
  return {
    totalCommission: faker.number.float({ min: 100, max: 10000, fractionDigits: 2 }),
    monthCommission: faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }),
    pendingCommission: faker.number.float({ min: 0, max: 200, fractionDigits: 2 }),
    promotedUsers: faker.number.int({ min: 0, max: 100 }),
    promotedOrders: faker.number.int({ min: 0, max: 200 }),
    conversionRate: faker.number.float({ min: 0.01, max: 0.3, fractionDigits: 2 }),
  }
}

/* ============ 广告 ============ */
export function genAdSlot(): AdSlot {
  const now = new Date().toISOString()
  return {
    id: genId(),
    code: 'AD_' + faker.string.alpha({ length: 6, casing: 'upper' }),
    name: faker.helpers.arrayElement(['小程序首页轮播', '商家APP首页', '商家详情顶部', '广场首屏Banner']),
    target: faker.helpers.arrayElement(['customer', 'factory', 'store'] as const),
    position: 'top',
    size: '750x300',
    sort: faker.number.int({ min: 1, max: 10 }),
    enabled: true,
    createdAt: now,
    updatedAt: now,
  }
}

export function genAdCreative(slotId?: string): AdCreative {
  const now = new Date().toISOString()
  return {
    id: genId(),
    slotId: slotId ?? genId(),
    title: faker.commerce.productName(),
    image: placeholderImage(750, 300),
    link: '/pages/product/detail?id=' + genId(),
    startAt: '2026-05-01',
    endAt: '2026-06-01',
    budget: faker.number.int({ min: 500, max: 5000 }),
    spent: faker.number.int({ min: 0, max: 500 }),
    impressions: faker.number.int({ min: 1000, max: 100000 }),
    clicks: faker.number.int({ min: 100, max: 10000 }),
    status: faker.helpers.arrayElement(['active', 'pending'] as const),
    priority: faker.number.int({ min: 1, max: 100 }),
    createdAt: now,
    updatedAt: now,
  }
}

/* ============ 会员套餐 ============ */
export function genMemberPlans(): MemberPlan[] {
  const now = new Date().toISOString()
  return [
    {
      id: genId(),
      type: 'basic',
      code: 'monthly',
      name: '月费会员',
      price: 99,
      period: 'monthly',
      periodCount: 1,
      rights: ['商品管理 / 上架', '门店申请授权', '销售员授权', '客户授权 / 价格分级'],
      status: 'active',
      sort: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: genId(),
      type: 'basic',
      code: 'yearly',
      name: '年费会员',
      price: 899,
      originalPrice: 1188,
      period: 'yearly',
      periodCount: 1,
      hot: true,
      rights: ['以上全部', '数据导出', '营销中心', '专属客服'],
      status: 'active',
      sort: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: genId(),
      type: 'ad',
      code: 'ad_basic',
      name: '基础推广包',
      price: 299,
      period: 'monthly',
      rights: ['选品广场 5 个推送位', '权重 ≤ 60', '不含首屏 Banner', '月曝光 ≤ 5万'],
      constraints: { pushSlots: 5, weightLimit: 60, bannerLimit: 0, impressionLimit: 50000 },
      status: 'active',
      sort: 10,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: genId(),
      type: 'ad',
      code: 'ad_pro',
      name: '进阶推广包',
      price: 999,
      period: 'monthly',
      hot: true,
      rights: ['选品广场 20 个推送位', '首屏 Banner 2 个', '权重 ≤ 85', '月曝光 ≤ 30万'],
      constraints: { pushSlots: 20, weightLimit: 85, bannerLimit: 2, impressionLimit: 300000 },
      status: 'active',
      sort: 11,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: genId(),
      type: 'ad',
      code: 'ad_flagship',
      name: '旗舰推广包',
      price: 9800,
      period: 'yearly',
      rights: ['推送位不限', '权重 ≤ 99', '首屏 Banner + 分类首屏 + 独立标签', '年曝光不限', '专属运营顾问'],
      constraints: { pushSlots: 99999, weightLimit: 99, bannerLimit: 99999, impressionLimit: 99999999 },
      status: 'active',
      sort: 12,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: genId(),
      type: 'addon',
      code: 'addon_banner_week',
      name: '首屏 Banner / 周',
      price: 199,
      period: 'weekly',
      rights: ['首屏 1 个 Banner 位 7 天'],
      status: 'active',
      sort: 20,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: genId(),
      type: 'addon',
      code: 'addon_hot_tag',
      name: '热推标签 / 件',
      price: 39,
      period: 'oneoff',
      rights: ['为指定商品添加热推标签 30 天'],
      status: 'active',
      sort: 21,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: genId(),
      type: 'addon',
      code: 'addon_category_top',
      name: '分类首屏 / 天',
      price: 59,
      period: 'daily',
      rights: ['分类首屏推荐位 1 天'],
      status: 'active',
      sort: 22,
      createdAt: now,
      updatedAt: now,
    },
  ]
}

/* ============ 功能开关 ============ */
export function genFeatureFlags(): FeatureFlag[] {
  const now = new Date().toISOString()
  const make = (
    key: string,
    label: string,
    group: FeatureFlag['group'],
    icon?: string,
    badge?: string,
    defaultEnabled = true,
  ): FeatureFlag => ({
    id: genId(),
    key,
    label,
    icon,
    group,
    defaultEnabled,
    audience: 'all',
    grayPercent: 100,
    badge,
    sort: 0,
    createdAt: now,
    updatedAt: now,
  })

  return [
    make('home.product', '商品', 'home_entry', 'cart', '常开'),
    make('home.order', '订单', 'home_entry', 'order', '常开'),
    make('home.customer', '客户', 'home_entry', 'user', '常开'),
    make('home.chat', '客服', 'home_entry', 'chat'),
    make('home.store', '门店', 'home_entry', 'shop', '仅厂家可见'),
    make('home.staff', '员工', 'home_entry', 'staff'),
    make('home.marketing', '营销', 'home_entry', 'target'),
    make('home.stats', '数据', 'home_entry', 'chart'),
    make('home.plaza', '选品广场', 'home_entry', 'plaza', 'HOT'),
    make('home.booking', '量尺预约', 'home_entry', 'ruler', undefined, false),
    make('role.store_apply', '申请注册为门店', 'role_button', undefined, '图标常开'),
    make('role.factory_apply', '申请注册为厂家', 'role_button', undefined, '图标常开'),
    make('role.agency_apply', '门店向厂家申请代理', 'role_button'),
    make('role.factory_invite', '厂家邀请门店', 'role_button'),
    make('role.staff_invite', '员工邀请', 'role_button'),
    make('menu.extension', '产品扩展(申请代理)', 'side_menu'),
    make('menu.commission', '分佣客户管理', 'side_menu'),
    make('menu.withdraw', '提现处理', 'side_menu'),
    make('menu.shop_decorate', '店铺装修', 'side_menu'),
    make('menu.marketing_groupbuy', '营销中心 · 团购', 'side_menu', undefined, undefined, false),
    make('menu.marketing_flashsale', '营销中心 · 限时购', 'side_menu'),
    make('menu.chat_free', '在线客服(免费版)', 'side_menu'),
    make('menu.export', '数据导出(年费)', 'side_menu'),
  ]
}

/* ============ 仪表盘 ============ */
export function genMerchantDashboard(): MerchantDashboard {
  return {
    today: {
      orders: faker.number.int({ min: 10, max: 50 }),
      ordersDelta: faker.number.int({ min: -20, max: 30 }),
      newCustomers: faker.number.int({ min: 0, max: 15 }),
      newCustomersDelta: faker.number.int({ min: -5, max: 10 }),
      sales: faker.number.int({ min: 5000, max: 30000 }),
      salesDelta: faker.number.int({ min: -20, max: 30 }),
    },
    weekSales: Array.from({ length: 7 }).map(() => faker.number.int({ min: 30, max: 100 })),
    todos: {
      pendingShipment: 3,
      pendingRefund: 1,
      pendingStoreAuth: 1,
    },
    plazaHighlights: Array.from({ length: 5 }).map(() => ({
      productId: genId(),
      productImage: placeholderImage(160, 160),
      price: faker.number.int({ min: 500, max: 5000 }),
    })),
  }
}

export function genMerchantStats(period: MerchantStats['period'] = 'week'): MerchantStats {
  const len = period === 'today' ? 24 : period === 'week' ? 7 : period === 'month' ? 30 : 12
  const labelFor = (i: number) => {
    if (period === 'today') return `${i}时`
    if (period === 'week') return ['一', '二', '三', '四', '五', '六', '日'][i]
    if (period === 'month') return `${i + 1}日`
    return `${i + 1}月`
  }
  const topNames = [
    '实木北欧餐桌 A款', '布艺真皮沙发 B款', '岩板茶几 A款',
    '北欧吊灯 C款', '人体工学办公椅 B款', '日式榻榻米床 A款',
    '智能升降桌 A款', '简约落地灯 B款', '羊毛地毯 C款', '实木餐边柜 A款',
  ]
  const cats = ['家具', '灯具', '布艺', '厨卫', '摆件', '建材', '家电']
  const newRatio = faker.number.float({ min: 0.25, max: 0.55, fractionDigits: 2 })
  return {
    period,
    salesTrend: Array.from({ length: len }).map((_, i) => ({
      date: labelFor(i),
      value: faker.number.int({ min: 30, max: 100 }),
    })),
    topProducts: topNames.map((name, i) => ({
      productId: genId(),
      name,
      sales: faker.number.int({ min: 50 - i * 4, max: 200 - i * 12 }),
    })),
    customerAnalysis: { newRatio, oldRatio: Math.round((1 - newRatio) * 100) / 100 },
    categoryBars: cats.map((c) => ({ category: c, sales: faker.number.int({ min: 20, max: 100 }) })),
  }
}

export function genPlatformDashboard(): PlatformDashboard {
  return {
    overview: {
      merchants: 268,
      merchantsDelta: 8,
      orders: 18209,
      ordersDelta: 1820,
      gmv: 9820000,
      gmvDelta: 12,
      users: 32108,
      usersDelta: 820,
    },
    registrationTrend: Array.from({ length: 30 }).map((_, i) => ({
      date: `2026-${(4 + Math.floor(i / 30)).toString().padStart(2, '0')}-${((i % 30) + 1).toString().padStart(2, '0')}`,
      value: faker.number.int({ min: 5, max: 50 }),
    })),
    todos: {
      pendingMerchants: 5,
      pendingProducts: 3,
      pendingAds: 2,
      complaints: 1,
      pendingWithdraws: 8,
    },
    merchantTypeDistribution: { factory: 102, store: 166 },
    categorySales: pickN(['家具', '灯具', '布艺', '厨卫', '摆件', '建材', '家电'], 7).map((c) => ({
      category: c,
      value: faker.number.int({ min: 100, max: 1000 }),
    })),
    memberPlanDistribution: { yearly: 128, monthly: 86, trial: 54 },
  }
}
