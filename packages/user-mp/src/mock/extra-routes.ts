/**
 * 用户端专属 Mock 路由
 * - 横幅/购物车/地址/收藏/预约/推广/门店/入驻/认证扩展
 */
import type { MockRoute } from '@jiujiu/shared/mock'

const BANNERS = [
  { id: 'b1', image: 'https://picsum.photos/seed/banner-shop-1/750/320', title: '春日焕新 · 全场满 500 减 50', link: '/pages/product/list?promo=spring' },
  { id: 'b2', image: 'https://picsum.photos/seed/banner-shop-2/750/320', title: '会员日 · 享 9 折', link: '/pages/promote/index' },
  { id: 'b3', image: 'https://picsum.photos/seed/banner-shop-3/750/320', title: '新中式岩板 · 厂家直供', link: '/pages/product/detail?id=p-2' },
]

const ADDRESSES = [
  { id: 'a1', name: '张先生', phone: '13800138000', region: '北京市 朝阳区', detail: '望京 SOHO T1 座 15 层', isDefault: true },
  { id: 'a2', name: '李女士', phone: '13900139000', region: '上海市 浦东新区', detail: '陆家嘴环路 1000 号', isDefault: false },
  { id: 'a3', name: '王先生', phone: '13700137000', region: '广东省 深圳市 福田区', detail: '福华三路 88 号', isDefault: false },
]

const FAVORITES = Array.from({ length: 12 }).map((_, i) => ({
  id: 'f' + i,
  productId: 'p-' + (i + 1),
  name: ['北欧实木餐椅', '岩板茶几', '原木双人床', '布艺三人沙发', '现代简约餐桌', '吊灯', '玄关柜', '收纳架', '北欧地毯', '亚麻窗帘', '陶瓷花瓶', '皮质躺椅'][i],
  image: `https://picsum.photos/seed/fav-${i}/400/400`,
  price: 800 + i * 130,
}))

const NEARBY_STORES = [
  { id: 's1', name: '经纬科技 · 望京店', address: '朝阳区望京 SOHO T1 座 1 层', distance: 1.2, phone: '010-5678-1234', lat: 39.9956, lng: 116.4744 },
  { id: 's2', name: '经纬科技 · 国贸店', address: '朝阳区国贸建外 SOHO B 座 2 层', distance: 3.8, phone: '010-5678-2345', lat: 39.9088, lng: 116.4571 },
  { id: 's3', name: '经纬科技 · 三里屯店', address: '朝阳区三里屯太古里南区 N3-23', distance: 5.6, phone: '010-5678-3456', lat: 39.9347, lng: 116.4555 },
  { id: 's4', name: '经纬科技 · 西单店', address: '西城区西单大悦城 5 层', distance: 8.2, phone: '010-5678-4567', lat: 39.9097, lng: 116.3743 },
]

export const userMpExtraRoutes: MockRoute[] = [
  // 横幅
  {
    method: 'GET',
    path: '/api/v1/u/banners',
    handler: () => BANNERS,
  },
  // 地址
  {
    method: 'GET',
    path: '/api/v1/u/addresses',
    handler: () => ADDRESSES,
  },
  {
    method: 'GET',
    path: '/api/v1/u/addresses/default',
    handler: () => ADDRESSES.find((a) => a.isDefault) ?? ADDRESSES[0],
  },
  // 收藏
  {
    method: 'GET',
    path: '/api/v1/u/favorites',
    handler: () => FAVORITES,
  },
  // 预约量尺
  {
    method: 'POST',
    path: '/api/v1/u/booking',
    delay: 400,
    handler: () => ({ ok: true, ticketId: 'bk-' + Date.now() }),
  },
  // 门店附近
  {
    method: 'GET',
    path: '/api/v1/u/stores/nearby',
    handler: () => NEARBY_STORES,
  },
  // 店铺价格显示规则（mock 默认规则，与 server 端 shopPriceRule 默认值保持一致）
  {
    method: 'GET',
    path: '/api/v1/u/shops/:merchantId/price-rule',
    handler: () => ({
      guestAllow: false,
      customerPrice: 'retail',
      agencyPrice: 'wholesale',
      memberPrice: 'member',
    }),
  },
  // 入驻申请
  {
    method: 'POST',
    path: '/api/v1/u/merchant-apply',
    delay: 500,
    handler: () => ({ ok: true, applyId: 'apply-' + Date.now() }),
  },
  // 订单创建
  {
    method: 'POST',
    path: '/api/v1/u/orders',
    delay: 400,
    handler: ({ body }) => ({
      orderId: 'o-' + Date.now(),
      orderNo: 'JW' + Date.now().toString().slice(-9),
      payAmount: Number(body?.payAmount ?? 0),
    }),
  },
  // 订单详情（用户端）
  {
    method: 'GET',
    path: '/api/v1/u/orders/:id',
    handler: ({ params }) => ({
      id: params.id,
      orderNo: 'JW' + params.id.slice(-9),
      status: 'pending_shipment',
      payAmount: 1238,
      createdAt: new Date().toISOString(),
    }),
  },
  // 支付
  {
    method: 'POST',
    path: '/api/v1/u/orders/:id/pay',
    delay: 800,
    handler: () => ({ ok: true }),
  },
  // 确认收货
  {
    method: 'POST',
    path: '/api/v1/u/orders/:id/confirm',
    delay: 300,
    handler: () => ({ ok: true }),
  },
  // 取消订单
  {
    method: 'POST',
    path: '/api/v1/u/orders/:id/cancel',
    delay: 300,
    handler: () => ({ ok: true }),
  },
  // 催发货
  {
    method: 'POST',
    path: '/api/v1/u/orders/:id/urge',
    delay: 200,
    handler: () => ({ ok: true }),
  },
  // 手机号登录
  {
    method: 'POST',
    path: '/api/v1/auth/phone-login',
    delay: 400,
    handler: ({ body }) => ({
      accessToken: 'mock-phone-access-' + Date.now(),
      refreshToken: 'mock-phone-refresh-' + Date.now(),
      expiresIn: 7200,
      user: {
        id: 'u-self',
        nickname: '尊敬的客户',
        avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=' + encodeURIComponent(String(body?.phone ?? 'guest')),
        phone: String(body?.phone ?? ''),
        role: 'customer',
        priceTier: 'retail',
        memberLevel: 'normal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }),
  },
  // 短信验证码
  {
    method: 'POST',
    path: '/api/v1/auth/sms-code',
    delay: 300,
    handler: () => ({ ok: true }),
  },
]
