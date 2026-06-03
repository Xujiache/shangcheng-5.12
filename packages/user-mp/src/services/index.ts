/**
 * 用户端服务聚合
 */
import { http } from '../utils/request'
import type { Product, Category, Pagination, UserSession, Order } from '@jiujiu/shared/types'

// ============ 商品 ============
/**
 * 商品列表查询参数。
 *
 * - `merchantId` / `sort` 字段后端如未实现会被忽略，前端兜底做客户端排序，
 *   避免 UI 把"按销量"按钮变成空操作。
 */
export interface ProductListParams {
  keyword?: string
  categoryId?: string
  merchantId?: string
  /** 兼容后端 / 前端兜底：newest 新品 · sales 销量 · price-asc 价格升 · price-desc 价格降 */
  sort?: 'newest' | 'sales' | 'price-asc' | 'price-desc'
  page?: number
  pageSize?: number
}
export const productService = {
  list(params: ProductListParams = {}) {
    return http.get<Pagination<Product>>('/api/v1/u/products', params as Record<string, unknown>)
  },
  detail(id: string, options?: { silent?: boolean }) {
    return http.get<Product & { skus: any[] }>(`/api/v1/u/products/${id}`, undefined, options)
  },
}

// ============ 分类 ============
export const categoryService = {
  list() {
    return http.get<Category[]>('/api/v1/u/categories')
  },
}

// ============ 店铺搜索 ============
export interface SearchShop {
  id: string
  name: string
  type: 'factory' | 'store'
  region: string
  categories: string[]
  gmv: number
}
export const shopService = {
  search(
    params: { keyword?: string; type?: 'factory' | 'store'; page?: number; pageSize?: number } = {},
  ) {
    return http.get<Pagination<SearchShop>>('/api/v1/u/shops', params)
  },
}

// ============ 订单 ============
/**
 * 创建订单 DTO。
 *
 * 注意优惠券字段：**只传 couponId**（如果用户选了券）。
 * 严禁前端传 `couponDiscount` 等数字字段——后端会查 Coupon 表自行重算，
 * 前端的金额仅用于本地预览合计，发数字过去会被后端忽略且容易引入对账偏差。
 */
export interface OrderCreateDto {
  addressId: string
  items: {
    skuId: string
    productId?: string
    quantity: number
    bySize?: { length: number; width: number; area?: number }
  }[]
  couponId?: string
  shippingMethod?: 'factory' | 'local' | 'pickup'
  remark?: string
}

export const orderService = {
  list(params: { status?: string; page?: number; pageSize?: number } = {}) {
    return http.get<Pagination<Order>>('/api/v1/u/orders', params)
  },
  detail(id: string) {
    return http.get<Order>(`/api/v1/u/orders/${id}`)
  },
  create(dto: OrderCreateDto) {
    return http.post<{ orderId: string; orderNo: string; payAmount: number }>(
      '/api/v1/u/orders',
      dto as unknown as Record<string, unknown>,
    )
  },
  /**
   * 发起支付。
   *
   * - 生产：后端永远返回 `miniPay`，由 `uni.requestPayment` 调起微信支付
   * - 联调态（后端商户号未配齐）：后端可能返回 `mockPaid:true` 直接把订单标为已付
   *   仅作开发兼容字段，生产环境永远 false / 不存在；前端对此分支做防御性处理。
   */
  pay(id: string, method: string) {
    return http.post<{
      ok: boolean
      mockPaid?: boolean
      miniPay?: {
        appId: string
        timeStamp: string
        nonceStr: string
        package: string
        signType: 'RSA' | 'MD5'
        paySign: string
      }
    }>(`/api/v1/u/orders/${id}/pay`, { method })
  },
  confirm(id: string) {
    return http.post<{ ok: boolean }>(`/api/v1/u/orders/${id}/confirm`)
  },
  cancel(id: string) {
    return http.post<{ ok: boolean }>(`/api/v1/u/orders/${id}/cancel`)
  },
  urge(id: string) {
    return http.post<{ ok: boolean }>(`/api/v1/u/orders/${id}/urge`)
  },
  /**
   * 申请售后/退款。
   * 对应后端 `POST /u/orders/:id/refund`，受理后订单状态转为 after_sale,
   * 商家在商家端 Refund 列表处理。
   *
   * @param reason 售后原因（用户选择项：退货退款 / 换货 / 维修 / 不想要了）
   * @param amount 申请退款金额（缺省由后端取订单 payAmount 全额退）
   */
  refund(id: string, payload: { reason: string; amount?: number; description?: string }) {
    return http.post<{ ok: boolean; refundId?: string; refundNo?: string }>(
      `/api/v1/u/orders/${id}/refund`,
      payload as unknown as Record<string, unknown>,
    )
  },
}

// ============ 购物车（服务器端持久化） ============
/**
 * 购物车条目（后端 user-mp.service.ts::listCart 返回结构）
 *
 * 与本地 CartLine 的差异：
 *   - 服务端只关心 productId / skuId / quantity，name / image / price 走嵌套 product/sku
 *   - 本地 CartLine 是扁平化的渲染结构，由 store 内 serverToLine() 适配
 *
 * SKU 价格字段：后端按统一 schema 输出 priceRetail/priceWholesale/priceMember 三档,
 * 前端按所在商家的 displayPolicy 选用对应档（购物车 store 内做兜底）。
 * 老接口可能只回 `price` 字段（=priceRetail），保留兼容。
 */
export interface ServerCartItem {
  id: string
  productId: string
  skuId: string
  quantity: number
  product: {
    id: string
    name: string
    image: string
    status: string
    merchantId: string
    priceRetailMin?: number
  } | null
  sku: {
    id: string
    specsLabel: string | null
    /** 兼容老接口：仅有 price 字段时等同 priceRetail */
    price?: number
    priceRetail?: number
    priceWholesale?: number
    priceMember?: number
    stock: number
    active: boolean
  } | null
}
export const cartService = {
  list() {
    return http.get<ServerCartItem[]>('/api/v1/u/cart')
  },
  add(dto: { productId: string; skuId?: string; quantity?: number }) {
    return http.post<ServerCartItem>('/api/v1/u/cart', dto as Record<string, unknown>)
  },
  update(id: string, dto: { quantity: number }) {
    return http.patch<ServerCartItem>(`/api/v1/u/cart/${id}`, dto as Record<string, unknown>)
  },
  remove(id: string) {
    return http.del<{ ok: boolean }>(`/api/v1/u/cart/${id}`)
  },
}

// ============ 横幅 ============
export interface Banner {
  id: string
  image: string
  title: string
  link?: string
}
export const bannerService = {
  list() {
    return http.get<Banner[]>('/api/v1/u/banners')
  },
}

// ============ 地址 ============
export interface Address {
  id: string
  name: string
  phone: string
  region: string
  detail: string
  isDefault: boolean
}
export const addressService = {
  list() {
    return http.get<Address[]>('/api/v1/u/addresses')
  },
  defaultAddress() {
    return http.get<Address>('/api/v1/u/addresses/default')
  },
  create(data: Partial<Address>) {
    return http.post<Address>('/api/v1/u/addresses', data as Record<string, unknown>)
  },
  update(id: string, data: Partial<Address>) {
    return http.put<Address>(`/api/v1/u/addresses/${id}`, data as Record<string, unknown>)
  },
  remove(id: string) {
    return http.del<{ ok: boolean }>(`/api/v1/u/addresses/${id}`)
  },
}

// ============ 收藏 ============
export interface Favorite {
  id: string
  productId: string
  name: string
  image: string
  price: number
}
export const favoriteService = {
  list() {
    return http.get<Favorite[]>('/api/v1/u/favorites')
  },
  add(productId: string) {
    return http.post<{ ok: boolean }>('/api/v1/u/favorites', { productId })
  },
  remove(id: string) {
    return http.del<{ ok: boolean }>(`/api/v1/u/favorites/${id}`)
  },
}

/** 优惠券（用户端可领取/可用列表）—— 走 /u/coupons，禁止跨域调 /m/* */
export const couponService = {
  list() {
    return http.get<{ list: Coupon[]; total: number }>('/api/v1/u/coupons')
  },
  /**
   * 领取优惠券。
   *
   * 调用 `POST /u/coupons/:id/claim`：
   * - 200 成功（后端返回新建的用户券记录 no）
   * - 重复领取走异常通道：后端抛 4xx + msg "已领过/超过限额"，由调用方 catch 文案匹配
   * - 后端尚未上线时，本地兜底捕获 4xx/5xx，由调用方 toast 提示
   */
  claim(couponId: string) {
    return http.post<{ ok: boolean; no?: string; count?: number }>(
      `/api/v1/u/coupons/${couponId}/claim`,
      {},
    )
  },
  /**
   * 我的优惠券（已领，含未用/已用/已过期）。
   * 对应后端 `GET /u/my-coupons`，返回当前用户已领取的所有券记录。
   */
  my() {
    return http.get<MyCoupon[]>('/api/v1/u/my-coupons')
  },
}

export interface Coupon {
  id: string
  name: string
  type: 'fullReduce' | 'discount' | 'fixed'
  amount?: number
  /** 折扣率：`0.85` 表示 85 折（即支付 85%）；展示时 `(discountPercent * 10).toFixed(1)` */
  discountPercent?: number
  threshold?: number
  /** 库存：> 0 受限发放；= 0 视为不限量（与后端一致） */
  stock: number
  /** 已领取数 */
  received?: number
  validFrom: string
  validTo: string
  status: string
}

/** 我的优惠券记录（已领取） */
export interface MyCoupon {
  /** 用户券唯一编号 */
  no: string
  couponId: string
  name: string
  type: 'fullReduce' | 'discount' | 'fixed'
  amount?: number
  discountPercent?: number
  threshold?: number
  validFrom: string
  validTo: string
  /** 'unused' | 'used' | 'expired' */
  status: 'unused' | 'used' | 'expired'
  usedAt?: string | null
  claimedAt: string
}

// ============ 预约量尺 ============
export interface Booking {
  name: string
  phone: string
  address: string
  appointAt: string
  space: string
  remark?: string
}
export const bookingService = {
  submit(dto: Booking) {
    return http.post<{ ok: boolean; ticketId: string }>(
      '/api/v1/u/booking',
      dto as unknown as Record<string, unknown>,
    )
  },
}

// ============ 推广分佣 ============
/**
 * 推广汇总。
 *
 * 注意：当后端聚合源不可用时，`people`/`conversion` 等字段可能返回 `null`，
 * 前端必须按"空值=暂无数据"展示，禁止把 null/undefined 解释成 0% 转化率。
 */
export interface PromoteSummary {
  total: number
  thisMonth: number
  pending: number
  people: number | null
  orderCount: number
  conversion: number | null
}

/** 推广海报 / 分享链接 —— 后端按当前 user.id 生成带签名的追踪链接 */
export interface PromoteShareLink {
  /** 完整可分享 URL（带 ?ref=xxx 追踪参数） */
  url: string
  /** 可选：后端预渲染好的海报图 URL */
  posterUrl?: string
  /** 链接过期时间 ISO，null 表示永久 */
  expiresAt?: string | null
}

/** 推广规则正文（管理员在后台配置） */
export interface PromoteRules {
  /** Markdown 或纯文本正文，由调用方原样渲染 */
  body: string
  /** 最近更新时间 */
  updatedAt?: string
}

export const promoteService = {
  summary() {
    return http.get<PromoteSummary>('/api/v1/u/promote/summary')
  },
  orders() {
    return http.get<Pagination<{ id: string; orderNo: string; amount: number; createdAt: string }>>(
      '/api/v1/u/promote/orders',
    )
  },
  /** 拉真签名分享链接（含 user.id 追踪），后端缺失或未上线时调用方需 catch */
  shareLink() {
    return http.get<PromoteShareLink>('/api/v1/u/promote/share-link', undefined, { silent: true })
  },
  /** 推广规则正文（后端 SystemConfig 的 promote.rules 字段） */
  rules() {
    return http.get<PromoteRules>('/api/v1/u/promote/rules', undefined, { silent: true })
  },
  /**
   * 绑定上级邀请人（幂等：只对未绑定过的用户生效）。
   *
   * 触发时机：用户首次通过分享链接 ?ref=<inviterId> 进入并完成登录后调用一次。
   * 后端 service 已实现自校验（自己不能绑自己 / 已绑定不重复 / 邀请人必须存在）。
   */
  bindInviter(inviterId: string) {
    return http.post<{ ok: boolean }>(
      '/api/v1/u/promote/bind-inviter',
      { inviterId },
      { silent: true },
    )
  },
}

// ============ 门店地图 ============
export interface NearbyStore {
  id: string
  name: string
  address: string
  /**
   * 距离（km）。后端按 Haversine 距用户坐标计算；
   * 未授权定位（小程序拒绝 uni.getLocation）或缺少坐标时返回 `null`，
   * 前端模板按 `distance != null` 判断决定展示"未授权定位"。
   */
  distance: number | null
  phone: string
  lat: number
  lng: number
}
export interface NearbyParams {
  lat?: number
  lng?: number
  /** km，可选 */
  radius?: number
}
export const storeMapService = {
  /**
   * 附近门店列表。
   * 调用方应通过 `uni.getLocation` 取得 lat/lng 一起传给后端；
   * 缺少坐标时后端不计算距离，distance 字段会返回 `null`。
   */
  nearby(params: NearbyParams = {}) {
    return http.get<NearbyStore[]>('/api/v1/u/stores/nearby', params as Record<string, unknown>)
  },
}

// ============ 入驻 ============
export const merchantApplyService = {
  submit(dto: Record<string, unknown>) {
    return http.post<{ ok: boolean; applyId: string }>('/api/v1/u/merchant-apply', dto)
  },
}

// ============ 认证 ============
export const authService = {
  wechatLogin(payload?: { code?: string }) {
    return http.post<UserSession>('/api/v1/auth/wechat-login', payload ?? {})
  },
  phoneLogin(payload: { phone: string; code: string }) {
    return http.post<UserSession>('/api/v1/auth/phone-login', payload)
  },
  sendSmsCode(phone: string) {
    return http.post<{ ok: boolean }>('/api/v1/auth/sms-code', { phone })
  },
  changePassword(payload: { oldPassword: string; newPassword: string }) {
    return http.post<{ ok: boolean }>('/api/v1/auth/change-password', payload)
  },
  changePhone(payload: { oldSmsCode?: string; newPhone: string; newSmsCode: string }) {
    return http.post<{ ok: boolean; phone: string }>('/api/v1/auth/change-phone', payload)
  },
}

// ============ 系统设置（客服联系方式等） ============
export interface SystemSettings {
  /** 平台客服微信号（可空：未配置） */
  customerServiceWechat?: string | null
  /** 平台客服电话（可空：未配置） */
  customerServicePhone?: string | null
  /** 客服服务时间提示 */
  customerServiceHours?: string | null
  /** 其他平台级配置原样透传 */
  [k: string]: unknown
}
export const systemService = {
  /**
   * 公开系统设置。
   *
   * 后端 `GET /u/system/settings` 返回脱敏后的平台级公开配置，
   * 包含客服联系方式、备案号等可对外字段；前端不应在本地写死任何客服微信号/电话。
   * 接口未上线或某字段未配置时返回 null/undefined，调用方需做"暂未提供"降级。
   */
  settings() {
    return http.get<SystemSettings>('/api/v1/u/system/settings', undefined, { silent: true })
  },
}
