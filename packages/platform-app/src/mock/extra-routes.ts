/**
 * 平台 APP 专属 Mock 路由
 * - 仪表盘/审核操作/系统设置/权限/缴费订单/广告创意/广场推送 等扩展
 */
import type { MockRoute } from '@jiujiu/shared/mock'
import { paginate } from '@jiujiu/shared/mock'

const PRODUCT_AUDIT_LIST = Array.from({ length: 20 }).map((_, i) => ({
  id: 'pa-' + i,
  productId: 'p-' + i,
  name: ['实木餐桌 A 款', '北欧床头柜', '岩板茶几', '布艺沙发', '现代衣柜', '人体工学椅', '北欧吊灯', '布艺地毯'][i % 8] + ' #' + (i + 1),
  image: `https://picsum.photos/seed/pa-${i}/400/400`,
  category: ['家具 / 餐桌', '家具 / 床品', '家具 / 茶几', '家具 / 沙发', '灯具', '家具 / 椅类'][i % 6],
  merchant: ['经纬科技', '望舒灯饰', '简家具', '北欧之家', '岩板工厂'][i % 5],
  price: 800 + i * 75,
  submittedAt: new Date(Date.now() - i * 86400000).toISOString(),
  status: i < 3 ? 'pending' : i < 6 ? 'rejected' : 'auto_approved',
}))

const PAY_ORDERS = Array.from({ length: 30 }).map((_, i) => ({
  id: 'po-' + i,
  no: 'P' + Date.now().toString().slice(-9) + i,
  merchantName: ['经纬科技', '望舒灯饰', '简家具', '北欧之家', '岩板工厂', '南方睡眠科技', '中山照明'][i % 7],
  planName: ['VIP 年费 ¥899', '月费 ¥99', '试用 ¥0', '推广套餐 ¥299', 'VIP 季度 ¥299'][i % 5],
  amount: [899, 99, 0, 299, 299][i % 5],
  status: i % 5 === 2 ? 'refunded' : i % 4 === 0 ? 'pending' : 'paid',
  paidAt: i % 4 !== 0 ? new Date(Date.now() - i * 86400000).toISOString() : null,
  payMethod: ['wechat', 'alipay', 'balance'][i % 3],
}))

const AD_SLOTS = [
  { id: 's-1', name: '小程序首页轮播', scene: '客户端首页', target: '所有用户', status: 'active', creativeCount: 5, ctr: 3.2, impressions: 128300 },
  { id: 's-2', name: '商家 APP 首页', scene: '商家端首页', target: '厂家+门店', status: 'active', creativeCount: 3, ctr: 5.8, impressions: 38420 },
  { id: 's-3', name: '商家详情顶部', scene: '商品详情页', target: '门店', status: 'ended', creativeCount: 2, ctr: 1.5, impressions: 12000 },
  { id: 's-4', name: '开屏广告', scene: '小程序冷启动', target: '所有用户', status: 'paused', creativeCount: 1, ctr: 8.2, impressions: 86200 },
  { id: 's-5', name: '推广分佣大转盘', scene: '客户端我的', target: '会员', status: 'draft', creativeCount: 0, ctr: 0, impressions: 0 },
]

const AD_CREATIVES = Array.from({ length: 12 }).map((_, i) => ({
  id: 'c-' + i,
  slotId: 's-' + (1 + (i % 5)),
  title: ['春日焕新满 500 减 50', '新品上市 限时 9 折', '会员日 大牌折扣', '工厂直供 价低同行', '岩板茶几专享', '北欧家具节'][i % 6],
  image: `https://picsum.photos/seed/ad-${i}/400/200`,
  url: '/pages/channel/index?key=promo',
  startAt: new Date(Date.now() - i * 86400000).toISOString(),
  endAt: new Date(Date.now() + (10 - i) * 86400000).toISOString(),
  clicks: 1200 + i * 80,
  impressions: 8000 + i * 500,
  status: i % 4 === 0 ? 'paused' : 'active',
}))

const PLAZA_PUSHES = Array.from({ length: 15 }).map((_, i) => ({
  id: 'pp-' + i,
  type: ['banner', 'list_top', 'category_tag', 'recommend'][i % 4],
  typeLabel: ['横幅推送', '列表置顶', '类目打标', '智能推荐'][i % 4],
  targetType: ['all', 'level', 'specific'][i % 3],
  targetLabel: ['全部商户', 'A 级商户', '指定 12 家'][i % 3],
  productCount: 5 + i * 2,
  startAt: new Date(Date.now() - i * 86400000).toISOString(),
  endAt: new Date(Date.now() + (10 - i) * 86400000).toISOString(),
  status: i < 3 ? 'active' : i < 7 ? 'scheduled' : 'ended',
  statusLabel: i < 3 ? '进行中' : i < 7 ? '已排期' : '已结束',
  createdBy: '平台运营',
  impressions: 1200 + i * 380,
  clicks: 50 + i * 18,
}))

const ADMINS = [
  { id: 'a-1', nickname: '超级管理员', username: 'admin', role: '超级管理员', avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=admin', status: 'active', lastLoginAt: new Date().toISOString() },
  { id: 'a-2', nickname: '审核员小李', username: 'lee', role: '审核员', avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=lee', status: 'active', lastLoginAt: new Date(Date.now() - 3600 * 1000).toISOString() },
  { id: 'a-3', nickname: '运营张总', username: 'zhang', role: '运营经理', avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=zhang', status: 'active', lastLoginAt: new Date(Date.now() - 86400 * 1000).toISOString() },
  { id: 'a-4', nickname: '客服王姐', username: 'wang', role: '客服', avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=wang', status: 'paused', lastLoginAt: new Date(Date.now() - 7 * 86400 * 1000).toISOString() },
  { id: 'a-5', nickname: '财务老陈', username: 'chen', role: '财务', avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=chen', status: 'active', lastLoginAt: new Date(Date.now() - 2 * 86400 * 1000).toISOString() },
]

const ROLES = [
  { id: 'r-1', name: '超级管理员', desc: '拥有全部权限', permissions: ['*'] },
  { id: 'r-2', name: '审核员', desc: '商户/商品审核', permissions: ['audit.merchant', 'audit.product'] },
  { id: 'r-3', name: '运营经理', desc: '广告/广场/会员套餐', permissions: ['ad.*', 'plaza.*', 'member.*'] },
  { id: 'r-4', name: '客服', desc: '订单查询/投诉处理', permissions: ['order.read', 'complaint.*'] },
  { id: 'r-5', name: '财务', desc: '缴费订单/结算', permissions: ['pay.*', 'commission.*'] },
]

const SYSTEM_SETTINGS = {
  site: { name: '经纬科技', logo: 'https://api.dicebear.com/9.x/initials/svg?seed=JW', icp: '京 ICP 备 2026XXX 号' },
  payment: { wechat: true, alipay: true, balance: true },
  logistics: { providers: ['顺丰速运', '京东物流', '德邦物流', '日日顺'], defaultFreight: 0 },
  service: { phone: '400-888-9999', email: 'support@jiujiu.com', workTime: '工作日 9:00-22:00' },
  security: { passwordPolicy: '至少 8 位，含字母数字', ipWhitelist: [] },
}

export const platformAppExtraRoutes: MockRoute[] = [
  // 商品审核列表
  {
    method: 'GET',
    path: '/api/v1/p/audit/products',
    handler: ({ query }) => {
      let list = PRODUCT_AUDIT_LIST
      if (query.status && query.status !== 'all') list = list.filter((x) => x.status === query.status)
      return paginate(list, query)
    },
  },
  // 商品审核配置
  {
    method: 'GET',
    path: '/api/v1/p/audit/products/config',
    handler: () => ({
      autoApprove: true,
      conditions: [
        { key: 'vip', label: '商户为 VIP 年费会员', enabled: true },
        { key: 'credit', label: '商户信用 ≥ A 级', enabled: true },
        { key: 'rejectRate', label: '历史驳回率 < 5%', enabled: true },
        { key: 'category', label: '仅指定品类（家具/灯具）', enabled: false },
      ],
      samplingRate: 10,
    }),
  },
  {
    method: 'POST',
    path: '/api/v1/p/audit/products/config',
    handler: () => ({ ok: true }),
  },
  {
    method: 'POST',
    path: '/api/v1/p/products/:id/approve',
    handler: () => ({ ok: true }),
  },
  {
    method: 'POST',
    path: '/api/v1/p/products/:id/reject',
    handler: () => ({ ok: true }),
  },

  // 商户审核操作
  {
    method: 'POST',
    path: '/api/v1/p/merchants/:id/approve',
    handler: () => ({ ok: true }),
  },
  {
    method: 'POST',
    path: '/api/v1/p/merchants/:id/reject',
    handler: () => ({ ok: true }),
  },
  {
    method: 'POST',
    path: '/api/v1/p/merchants/:id/pause',
    handler: () => ({ ok: true }),
  },
  {
    method: 'POST',
    path: '/api/v1/p/merchants/:id/resume',
    handler: () => ({ ok: true }),
  },

  // 广告位
  {
    method: 'GET',
    path: '/api/v1/p/ads/slots',
    handler: () => AD_SLOTS,
  },
  // 广告创意
  {
    method: 'GET',
    path: '/api/v1/p/ads/creatives',
    handler: ({ query }) => {
      let list = AD_CREATIVES
      if (query.slotId) list = list.filter((x) => x.slotId === query.slotId)
      return paginate(list, query)
    },
  },

  // 选品广场推送
  {
    method: 'GET',
    path: '/api/v1/p/plaza/pushes',
    handler: ({ query }) => {
      let list = PLAZA_PUSHES
      if (query.status && query.status !== 'all') list = list.filter((x) => x.status === query.status)
      return paginate(list, query)
    },
  },
  {
    method: 'POST',
    path: '/api/v1/p/plaza/pushes',
    handler: ({ body }) => ({ ok: true, id: 'pp-' + Date.now(), ...(body || {}) }),
  },

  // 会员套餐保存
  {
    method: 'POST',
    path: '/api/v1/p/member-plans',
    handler: () => ({ ok: true }),
  },
  // 缴费订单
  {
    method: 'GET',
    path: '/api/v1/p/member-pay-orders',
    handler: ({ query }) => {
      let list = PAY_ORDERS
      if (query.status && query.status !== 'all') list = list.filter((x) => x.status === query.status)
      return paginate(list, query)
    },
  },

  // 功能开关 toggle
  {
    method: 'POST',
    path: '/api/v1/p/feature-flags/:id/toggle',
    handler: () => ({ ok: true }),
  },

  // 权限：管理员 / 角色
  {
    method: 'GET',
    path: '/api/v1/p/admins',
    handler: () => ADMINS,
  },
  {
    method: 'GET',
    path: '/api/v1/p/roles',
    handler: () => ROLES,
  },
  {
    method: 'POST',
    path: '/api/v1/p/roles',
    handler: () => ({ ok: true }),
  },

  // 系统设置
  {
    method: 'GET',
    path: '/api/v1/p/system/settings',
    handler: () => SYSTEM_SETTINGS,
  },
  {
    method: 'POST',
    path: '/api/v1/p/system/settings',
    handler: () => ({ ok: true }),
  },
]
