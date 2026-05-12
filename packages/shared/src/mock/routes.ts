/**
 * Mock 路由表（核心 API）· 各端启动时注册
 *
 * 这是 mock 数据 SSOT —— 全端共用同一份。
 * 真实后端就绪后，环境变量切换即可无缝替换。
 */
import type { MockRoute } from './interceptor'
import { paginate } from './interceptor'
import { seed, pickN } from './faker'
import {
  genProducts,
  genSKUs,
  genMerchants,
  genStore,
  genStaff,
  genUser,
  genOrders,
  genRefund,
  genPlatformCategories,
  genPlazaCard,
  genPlazaPush,
  genWithdraw,
  genCommission,
  genPromoteSummary,
  genAdSlot,
  genAdCreative,
  genMemberPlans,
  genFeatureFlags,
  genMerchantDashboard,
  genMerchantStats,
  genPlatformDashboard,
} from './factory'

seed(20260511)

/** 一次性生成数据池 */
const POOL = {
  products: genProducts(60, { status: 'active' }),
  merchants: genMerchants(40),
  users: Array.from({ length: 50 }).map(() => genUser()),
  orders: genOrders(30, { status: 'pending_shipment' }).concat(
    genOrders(20, { status: 'shipped' }),
    genOrders(40, { status: 'completed' }),
    genOrders(10, { status: 'pending_payment' }),
  ),
  categories: genPlatformCategories(),
  plazaCards: Array.from({ length: 40 }).map(() => genPlazaCard()),
  plazaPushes: Array.from({ length: 15 }).map(() => genPlazaPush()),
  withdraws: Array.from({ length: 12 }).map(() => genWithdraw()),
  commissions: Array.from({ length: 30 }).map(() => genCommission()),
  adSlots: Array.from({ length: 6 }).map(() => genAdSlot()),
  adCreatives: Array.from({ length: 20 }).map(() => genAdCreative()),
  memberPlans: genMemberPlans(),
  featureFlags: genFeatureFlags(),
}

/** 给商品挂上 SKU */
const SKUS = POOL.products.flatMap((p) => genSKUs(p))

/** 路由表 */
export const mockRoutes: MockRoute[] = [
  // ============ 认证 ============
  {
    method: 'POST',
    path: '/api/v1/auth/wechat-login',
    delay: 300,
    handler: () => ({
      accessToken: 'mock-access-' + Date.now(),
      refreshToken: 'mock-refresh-' + Date.now(),
      expiresIn: 7200,
      user: POOL.users[0],
    }),
  },
  {
    method: 'POST',
    path: '/api/v1/auth/admin-login',
    delay: 300,
    handler: () => ({
      accessToken: 'mock-admin-access',
      refreshToken: 'mock-admin-refresh',
      expiresIn: 7200,
      user: { ...POOL.users[0], role: 'admin' },
    }),
  },

  // ============ 商品 ============
  {
    method: 'GET',
    path: '/api/v1/u/products',
    handler: ({ query }) => paginate(POOL.products, query),
  },
  {
    method: 'GET',
    path: '/api/v1/u/products/:id',
    handler: ({ params }) => {
      const product = POOL.products.find((p) => p.id === params.id) ?? POOL.products[0]
      return { ...product, skus: SKUS.filter((s) => s.productId === product.id) }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/m/products',
    handler: ({ query }) => {
      let list = POOL.products
      if (query.status) list = list.filter((p) => p.status === query.status)
      if (query.keyword) {
        const kw = String(query.keyword).toLowerCase()
        list = list.filter((p) => p.name.toLowerCase().includes(kw) || p.id.includes(kw))
      }
      return paginate(list, query)
    },
  },
  {
    method: 'POST',
    path: '/api/v1/m/products',
    handler: ({ body }) => ({ id: 'new-' + Date.now(), ...(body || {}) }),
  },
  {
    method: 'POST',
    path: '/api/v1/m/products/batch-online',
    handler: () => ({ ok: true }),
  },
  {
    method: 'POST',
    path: '/api/v1/m/products/batch-offline',
    handler: () => ({ ok: true }),
  },
  {
    method: 'POST',
    path: '/api/v1/m/products/batch-delete',
    handler: () => ({ ok: true }),
  },
  {
    method: 'POST',
    path: '/api/v1/m/categories',
    handler: ({ body }) => ({ id: 'mc-' + Date.now(), createdAt: '', updatedAt: '', sort: 0, type: 'merchant', ...(body || {}) }),
  },
  {
    method: 'PUT',
    path: '/api/v1/m/categories/:id',
    handler: ({ params, body }) => ({ id: params.id, ...(body || {}) }),
  },
  {
    method: 'DELETE',
    path: '/api/v1/m/categories/:id',
    handler: () => ({ ok: true }),
  },
  {
    method: 'POST',
    path: '/api/v1/m/categories/sort',
    handler: () => ({ ok: true }),
  },

  // ============ 分类 ============
  {
    method: 'GET',
    path: '/api/v1/u/categories',
    handler: () => POOL.categories,
  },
  {
    method: 'GET',
    path: '/api/v1/m/categories',
    handler: () => [
      { id: 'mc-1', parentId: null, name: '北欧系列', sort: 0, type: 'merchant', merchantId: 'm-self', createdAt: '', updatedAt: '' },
      { id: 'mc-2', parentId: null, name: '新中式', sort: 1, type: 'merchant', merchantId: 'm-self', createdAt: '', updatedAt: '' },
      { id: 'mc-3', parentId: null, name: '极简风', sort: 2, type: 'merchant', merchantId: 'm-self', createdAt: '', updatedAt: '' },
      { id: 'mc-3-1', parentId: 'mc-3', name: '极简家具', sort: 0, type: 'merchant', merchantId: 'm-self', createdAt: '', updatedAt: '' },
      { id: 'mc-3-2', parentId: 'mc-3', name: '极简灯具', sort: 1, type: 'merchant', merchantId: 'm-self', createdAt: '', updatedAt: '' },
    ],
  },

  // ============ 订单 ============
  {
    method: 'GET',
    path: '/api/v1/u/orders',
    handler: ({ query }) => {
      let list = POOL.orders
      if (query.status) list = list.filter((o) => o.status === query.status)
      return paginate(list, query)
    },
  },
  {
    method: 'GET',
    path: '/api/v1/m/orders',
    handler: ({ query }) => {
      let list = POOL.orders
      if (query.status) list = list.filter((o) => o.status === query.status)
      return paginate(list, query)
    },
  },
  {
    method: 'GET',
    path: '/api/v1/m/orders/:id',
    handler: ({ params }) => POOL.orders.find((o) => o.id === params.id) ?? POOL.orders[0],
  },
  {
    method: 'POST',
    path: '/api/v1/m/orders/:id/ship',
    handler: () => ({ ok: true }),
  },
  {
    method: 'POST',
    path: '/api/v1/m/orders/parse-address',
    handler: ({ body }) => {
      // 本地解析（mock 后端逻辑）
      const text = String(body?.text || '')
      const phoneMatch = text.match(/1[3-9]\d{9}/)
      const phone = phoneMatch?.[0]
      const rest = phone ? text.replace(phone, ' ') : text
      const tokens = rest.replace(/[\s,，；;|]+/g, ' ').trim().split(' ').filter(Boolean)
      const name = tokens.find((t) => t.length <= 4 && /^[一-龥]+$/.test(t))
      const region = tokens.filter((t) => /(省|市|区|县)/.test(t)).join(' ')
      const detail = tokens.filter((t) => t !== name && !/(省|市|区|县)/.test(t)).join(' ')
      return { name, phone, region: region || undefined, detail: detail || undefined }
    },
  },

  // ============ 客户（商家端） ============
  {
    method: 'GET',
    path: '/api/v1/m/customers',
    handler: ({ query }) => {
      const list = POOL.users.slice(0, 30).map((u, i) => ({
        id: u.id,
        nickname: u.nickname,
        avatar: u.avatar,
        phone: u.phone,
        kind: i % 5 === 0 ? 'promoter' : i % 5 === 1 ? 'member' : 'normal',
        priceTier: i % 4 === 0 ? 'wholesale' : i % 4 === 1 ? 'member' : 'retail',
        orderCount: 1 + (i * 7) % 30,
        totalSpent: (i * 891) % 50000,
        lastOrderAt: new Date(Date.now() - i * 86400000).toISOString(),
        priceAuthorized: i % 3 !== 0,
        commissionEnabled: i % 5 === 0,
        groupTag: ['新客', '活跃', '高净值', '休眠'][i % 4],
      }))
      let filtered = list
      if (query.kind && query.kind !== 'all') filtered = filtered.filter((x) => x.kind === query.kind)
      return paginate(filtered, query)
    },
  },
  {
    method: 'POST',
    path: '/api/v1/m/customers/:id/price-tier',
    handler: () => ({ ok: true }),
  },
  {
    method: 'POST',
    path: '/api/v1/m/customers/:id/authorize',
    handler: () => ({ ok: true }),
  },

  // ============ 佣金规则 ============
  {
    method: 'GET',
    path: '/api/v1/m/commission/rules',
    handler: () => ({
      default: {
        level1Percent: 8,
        level2Percent: 3,
        visibleToPromoter: true,
        allowOffline: false,
        enabled: true,
      },
      productRules: Array.from({ length: 5 }).map((_, i) => ({
        productId: POOL.products[i]?.id,
        productName: POOL.products[i]?.name,
        productImage: POOL.products[i]?.images[0],
        level1Percent: 5 + i * 2,
        level2Percent: 1 + i,
      })),
    }),
  },
  {
    method: 'POST',
    path: '/api/v1/m/commission/rules',
    handler: () => ({ ok: true }),
  },

  // ============ 提现处理（商家审批） ============
  {
    method: 'POST',
    path: '/api/v1/m/withdraws/:id/review',
    handler: () => ({ ok: true }),
  },
  {
    method: 'POST',
    path: '/api/v1/m/withdraws/:id/reject',
    handler: () => ({ ok: true }),
  },

  // ============ 商户 ============
  {
    method: 'GET',
    path: '/api/v1/p/merchants',
    handler: ({ query }) => paginate(POOL.merchants, query),
  },
  {
    method: 'GET',
    path: '/api/v1/p/audit/merchants',
    handler: ({ query }) => paginate(POOL.merchants.filter((m) => m.status === 'pending'), query),
  },

  // ============ 选品广场 ============
  {
    method: 'GET',
    path: '/api/v1/m/plaza/products',
    handler: ({ query }) => paginate(POOL.plazaCards, query),
  },
  {
    method: 'GET',
    path: '/api/v1/p/plaza/pushes',
    handler: ({ query }) => paginate(POOL.plazaPushes, query),
  },

  // ============ 提现 / 佣金 ============
  {
    method: 'GET',
    path: '/api/v1/m/withdraws',
    handler: ({ query }) => paginate(POOL.withdraws, query),
  },
  {
    method: 'GET',
    path: '/api/v1/u/promote/summary',
    handler: () => genPromoteSummary(),
  },
  {
    method: 'GET',
    path: '/api/v1/u/promote/orders',
    handler: ({ query }) => paginate(POOL.commissions, query),
  },

  // ============ 广告 ============
  {
    method: 'GET',
    path: '/api/v1/p/ads/slots',
    handler: () => POOL.adSlots,
  },
  {
    method: 'GET',
    path: '/api/v1/p/ads/creatives',
    handler: ({ query }) => paginate(POOL.adCreatives, query),
  },

  // ============ 会员套餐 ============
  {
    method: 'GET',
    path: '/api/v1/p/member-plans',
    handler: () => POOL.memberPlans,
  },
  {
    method: 'GET',
    path: '/api/v1/m/membership/plans',
    handler: () => POOL.memberPlans,
  },

  // ============ 功能开关 ============
  {
    method: 'GET',
    path: '/api/v1/p/feature-flags',
    handler: () => POOL.featureFlags,
  },
  {
    method: 'GET',
    path: '/api/v1/m/feature-flags',
    handler: () => {
      const resolved = {
        homeEntry: {} as Record<string, boolean>,
        roleButton: {} as Record<string, boolean>,
        sideMenu: {} as Record<string, boolean>,
      }
      POOL.featureFlags.forEach((f) => {
        const key = f.key.split('.').slice(1).join('.')
        if (f.group === 'home_entry') resolved.homeEntry[key] = f.defaultEnabled
        else if (f.group === 'role_button') resolved.roleButton[key] = f.defaultEnabled
        else if (f.group === 'side_menu') resolved.sideMenu[key] = f.defaultEnabled
      })
      return resolved
    },
  },

  // ============ 仪表盘 ============
  {
    method: 'GET',
    path: '/api/v1/m/dashboard',
    handler: () => genMerchantDashboard(),
  },
  {
    method: 'GET',
    path: '/api/v1/m/stats',
    handler: ({ query }) => genMerchantStats((query.period as 'today' | 'week' | 'month' | 'year') ?? 'week'),
  },
  {
    method: 'GET',
    path: '/api/v1/p/dashboard',
    handler: () => genPlatformDashboard(),
  },

  // ============ 售后 ============
  {
    method: 'GET',
    path: '/api/v1/m/refunds',
    handler: ({ query }) => {
      // 不强依赖订单中的售后单 —— 直接生成多种状态
      const all = Array.from({ length: 18 }).map(() => genRefund(POOL.orders[0]?.id ?? 'o-0'))
      let list = all
      if (query.status) list = list.filter((r) => r.status === query.status)
      return paginate(list, query)
    },
  },
  {
    method: 'POST',
    path: '/api/v1/m/refunds/:id/agree',
    handler: () => ({ ok: true }),
  },
  {
    method: 'POST',
    path: '/api/v1/m/refunds/:id/reject',
    handler: () => ({ ok: true }),
  },

  // ============ 门店 / 员工 ============
  {
    method: 'GET',
    path: '/api/v1/m/stores',
    handler: ({ query }) => paginate(POOL.merchants.slice(0, 8).map((m) => genStore(m.id)), query),
  },
  {
    method: 'GET',
    path: '/api/v1/m/stores/:id/auth',
    handler: ({ params }) => ({
      storeId: params.id,
      level: 'A',
      visiblePriceTiers: ['wholesale', 'retail'],
      productPolicies: [
        { categoryId: 'cat-furniture', enabled: true, markupPercent: 15 },
        { categoryId: 'cat-lighting', enabled: true, markupPercent: 20 },
        { categoryId: 'cat-fabric', enabled: false, markupPercent: 0 },
        { categoryId: 'cat-kitchen', enabled: true, markupPercent: 18 },
        { categoryId: 'cat-decor', enabled: false, markupPercent: 0 },
      ],
      authValidFrom: '2026-05-01',
      authValidTo: '2027-05-01',
    }),
  },
  {
    method: 'POST',
    path: '/api/v1/m/stores/:id/auth',
    handler: () => ({ ok: true }),
  },
  {
    method: 'GET',
    path: '/api/v1/m/staffs',
    handler: ({ query }) => paginate(Array.from({ length: 8 }).map(() => genStaff(POOL.merchants[0].id)), query),
  },
  {
    method: 'POST',
    path: '/api/v1/m/staffs',
    handler: ({ body }) => ({ id: 'staff-' + Date.now(), ...(body || {}) }),
  },
  {
    method: 'PUT',
    path: '/api/v1/m/staffs/:id',
    handler: ({ params, body }) => ({ id: params.id, ...(body || {}) }),
  },
  {
    method: 'DELETE',
    path: '/api/v1/m/staffs/:id',
    handler: () => ({ ok: true }),
  },

  // ============ 店铺装修 ============
  {
    method: 'GET',
    path: '/api/v1/m/shop/decorate',
    handler: () => ({
      merchantId: 'm-self',
      themeColor: '#FF4D2D',
      fontStyle: 'modern',
      banners: [
        { image: 'https://picsum.photos/seed/banner1/800/400' },
        { image: 'https://picsum.photos/seed/banner2/800/400' },
      ],
      productLayout: 'waterfall',
    }),
  },
  {
    method: 'POST',
    path: '/api/v1/m/shop/decorate',
    handler: ({ body }) => ({ ...(body || {}), ok: true }),
  },

  // ============ 营销 · 优惠券 / 限时 / 团购 ============
  {
    method: 'GET',
    path: '/api/v1/m/marketing/coupons',
    handler: ({ query }) => {
      const list = [
        { id: 'c-1', name: '满 500 减 50', type: 'fullReduce', amount: 50, threshold: 500, stock: 1000, received: 432, used: 198, validFrom: '2026-05-01', validTo: '2026-06-30', perUserLimit: 1, scope: 'all', status: 'active' },
        { id: 'c-2', name: '新客券 9 折', type: 'discount', discountPercent: 90, threshold: 0, stock: 500, received: 312, used: 89, validFrom: '2026-05-01', validTo: '2026-12-31', perUserLimit: 1, scope: 'all', status: 'active' },
        { id: 'c-3', name: '会员日 100 元券', type: 'fixed', amount: 100, threshold: 1000, stock: 200, received: 200, used: 156, validFrom: '2026-04-15', validTo: '2026-05-15', perUserLimit: 1, scope: 'all', status: 'ended' },
        { id: 'c-4', name: '岩板茶几专享 200', type: 'fullReduce', amount: 200, threshold: 2000, stock: 100, received: 12, used: 3, validFrom: '2026-05-08', validTo: '2026-06-08', perUserLimit: 1, scope: 'product', status: 'active' },
        { id: 'c-5', name: '草稿券', type: 'fullReduce', amount: 30, threshold: 200, stock: 0, received: 0, used: 0, validFrom: '', validTo: '', perUserLimit: 1, scope: 'all', status: 'pending' },
      ]
      let filtered = list
      if (query.status && query.status !== 'all') filtered = filtered.filter((x) => x.status === query.status)
      return paginate(filtered, query)
    },
  },
  {
    method: 'GET',
    path: '/api/v1/m/marketing/overview',
    handler: () => ({
      coupons: { active: 3, ended: 2, totalReceived: 956, totalUsed: 446 },
      flashSales: { active: 2, planned: 1, sold: 87 },
      groupBuys: { active: 1, ended: 4, totalGroups: 23 },
    }),
  },

  // ============ 在线客服 ============
  {
    method: 'GET',
    path: '/api/v1/m/chat/sessions',
    handler: () => {
      const seed = ['张女士', '李总', '王先生', '陈姐', '小赵', '刘工']
      return seed.map((name, i) => ({
        id: 'cs-' + i,
        userName: name,
        userAvatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`,
        lastMessage: ['这款沙发有现货吗？', '请问发货时间？', '能给个优惠吗？', '好的我看下', '订单 #20240518', '已收到，谢谢'][i],
        lastMessageAt: new Date(Date.now() - i * 1800 * 1000).toISOString(),
        unreadCount: i < 3 ? Math.max(1, 4 - i) : 0,
        online: i < 4,
      }))
    },
  },
  {
    method: 'GET',
    path: '/api/v1/m/chat/sessions/:id/messages',
    handler: ({ params }) => {
      const now = Date.now()
      return [
        { id: 'm1', sessionId: params.id, sender: 'user', type: 'text', content: '老板在吗？', createdAt: new Date(now - 3600 * 1000).toISOString(), read: true },
        { id: 'm2', sessionId: params.id, sender: 'merchant', type: 'text', content: '在的，有什么可以帮您？', createdAt: new Date(now - 3500 * 1000).toISOString(), read: true },
        { id: 'm3', sessionId: params.id, sender: 'user', type: 'text', content: '这款实木沙发 1.8 米的还有货吗？', createdAt: new Date(now - 3400 * 1000).toISOString(), read: true },
        { id: 'm4', sessionId: params.id, sender: 'user', type: 'image', content: 'https://picsum.photos/seed/chat-img/400/400', createdAt: new Date(now - 3380 * 1000).toISOString(), read: true },
        { id: 'm5', sessionId: params.id, sender: 'merchant', type: 'text', content: '有的，原木色 / 胡桃木色都有，今天下单明天发货。', createdAt: new Date(now - 3000 * 1000).toISOString(), read: true },
        { id: 'm6', sessionId: params.id, sender: 'user', type: 'text', content: '能给个优惠吗？', createdAt: new Date(now - 600 * 1000).toISOString(), read: false },
      ]
    },
  },
  {
    method: 'GET',
    path: '/api/v1/m/chat/quick-replies',
    handler: () => [
      { id: 'q1', label: '欢迎语', content: '您好，欢迎光临经纬科技，请问有什么可以帮您？' },
      { id: 'q2', label: '发货时效', content: '现货 24 小时内发货，定制款 7-15 天。' },
      { id: 'q3', label: '物流方式', content: '默认顺丰大件，沙发等大件物流送货上门。' },
      { id: 'q4', label: '售后政策', content: '7 天无理由退换 + 1 年免费保修，质量问题包退。' },
      { id: 'q5', label: '优惠咨询', content: '本月活动满 500 减 50，会员可享会员价。' },
      { id: 'q6', label: '加微信', content: '可以加我微信，发您实拍图和最新优惠。' },
    ],
  },
  {
    method: 'POST',
    path: '/api/v1/m/chat/sessions/:id/messages',
    handler: ({ body }) => ({ id: 'm-' + Date.now(), sender: 'merchant', read: true, createdAt: new Date().toISOString(), ...(body || {}) }),
  },

  // ============ 选品广场（商家） ============
  {
    method: 'GET',
    path: '/api/v1/m/plaza/factories',
    handler: () => {
      return Array.from({ length: 12 }).map((_, i) => ({
        id: 'f-' + i,
        name: ['佛山经纬科技', '南方睡眠科技', '岩板工厂', '创智办公', '简约灯具厂', '北欧家具源头', '美式工坊', '法式定制厂', '极简实验室', '布艺世家', '德意家居', '中山照明'][i],
        logo: `https://api.dicebear.com/9.x/initials/svg?seed=${i}`,
        region: ['佛山', '深圳', '佛山', '广州', '中山', '佛山', '深圳', '上海', '杭州', '佛山', '苏州', '中山'][i],
        years: 5 + (i % 15),
        productCount: 50 + i * 13,
        agencyCount: 30 + i * 7,
        tags: pickN(['🔥本周热推', '工厂直供', '高佣金', 'A 级商户', '15 天免审'], 2),
        platformPushed: i < 5,
      }))
    },
  },
  {
    method: 'GET',
    path: '/api/v1/m/plaza/factories/:id',
    handler: ({ params }) => ({
      id: params.id,
      name: '佛山经纬科技',
      logo: 'https://api.dicebear.com/9.x/initials/svg?seed=jiujiu',
      banner: 'https://picsum.photos/seed/factory-banner/800/400',
      region: '佛山 · 顺德',
      address: '顺德区龙江镇家具工业园 A 区 18 号',
      years: 12,
      productCount: 132,
      agencyCount: 86,
      monthGmv: 1820000,
      desc: '专注实木家具 12 年，工厂直营，源头供货。拥有 3 条自动化生产线，年产能 5 万套。已为 86 家门店提供产品代理服务。',
      qualifications: [
        { name: '营业执照', image: 'https://picsum.photos/seed/q1/300/400' },
        { name: '生产许可', image: 'https://picsum.photos/seed/q2/300/400' },
        { name: '质量认证', image: 'https://picsum.photos/seed/q3/300/400' },
        { name: '环保认证', image: 'https://picsum.photos/seed/q4/300/400' },
      ],
      contactName: '张经理',
      contactPhone: '13800138000',
      followed: false,
      tags: ['🔥本周热推', '工厂直供', 'A 级商户', '15 天免审'],
    }),
  },
  {
    method: 'POST',
    path: '/api/v1/m/plaza/factories/:id/follow',
    handler: ({ body }) => ({ ok: true, followed: !!body?.on }),
  },
  {
    method: 'POST',
    path: '/api/v1/m/plaza/agency',
    handler: () => ({ ok: true, status: 'pending' }),
  },
]

/** 默认导出（便于直接 register）*/
export default mockRoutes
