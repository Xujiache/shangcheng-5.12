import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { UserMpService } from './user-mp.service'
import { OrderShareService } from '../merchant/order-share.service'
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'

@ApiTags('用户端 user-mp')
@Controller('u')
export class UserMpController {
  constructor(
    private readonly svc: UserMpService,
    private readonly orderShare: OrderShareService,
  ) {}

  // ============ 订单分享公开访问(无需登录) ============
  /**
   * 客户/任何持链接者按 shareCode 查看商家分享出来的订单详情
   * 严格按商家选择的 visibleFields 过滤返回字段;隐藏字段不在 JSON 中,
   * 防止前端 devtools 反向取到敏感信息(电话 / 价格 / 备注)。
   * 过期或撤销返回业务错误。
   */
  @Public() @Get('share/orders/:code') getSharedOrder(@Param('code') code: string) {
    return this.orderShare.getPublicByCode(code)
  }

  // 商品
  @Public() @Get('products') listProducts(@Query() q: any) {
    return this.svc.listProducts(q)
  }
  @Public() @Get('products/:id') productDetail(@Param('id') id: string) {
    return this.svc.productDetail(id)
  }

  // 分类
  @Public() @Get('categories') categories() {
    return this.svc.listCategories()
  }

  // 店铺搜索（首页/分类/搜索页用）
  @Public() @Get('shops') searchShops(@Query() q: any) {
    return this.svc.searchShops(q)
  }

  // 订单
  @Get('orders') listOrders(@CurrentUser() u: AuthUser, @Query() q: any) {
    return this.svc.listOrders(u.sub, q)
  }
  @Get('orders/:id') orderDetail(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.orderDetail(u.sub, id)
  }
  @Post('orders') createOrder(@CurrentUser() u: AuthUser, @Body() dto: any) {
    return this.svc.createOrder(u.sub, dto)
  }
  @Post('orders/:id/pay') pay(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body('method') method: string,
  ) {
    return this.svc.payOrder(u.sub, id, method || 'wechat')
  }
  @Post('orders/:id/confirm') confirm(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.confirmOrder(u.sub, id)
  }
  @Post('orders/:id/cancel') cancel(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.cancelOrder(u.sub, id)
  }
  @Post('orders/:id/urge') urge(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.urgeOrder(u.sub, id)
  }
  /**
   * 用户发起售后退款（功能残缺 P0-13 修复）
   *
   * body: { reason, amount?, orderItemId?, description?, evidence?, type? }
   * - reason: 必填,售后原因
   * - amount: 退款金额,默认订单实付金额
   * - orderItemId: 多 SKU 订单指定退某一行;省略默认订单首条
   * - type: 'refund_only' | 'refund_with_return',默认 refund_with_return
   * 响应: { ok, refundId, refundNo, status:'pending' }
   *
   * 服务端事务保证 Refund 创建 + Order.status='after_sale' 原子,
   * 失败任一回滚,绝不出现"订单变 after_sale 但 Refund 未创建"的脏数据。
   */
  @Post('orders/:id/refund') refundOrder(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: {
      reason: string
      amount?: number
      orderItemId?: string
      description?: string
      evidence?: string[]
      type?: 'refund_only' | 'refund_with_return'
    },
  ) {
    return this.svc.refundOrder(u.sub, id, dto)
  }

  // Banner
  @Public() @Get('banners') banners() {
    return this.svc.banners()
  }

  // 热搜词（搜索页用，可由平台管理员后台配置 SystemConfig.hot_keywords）
  @Public() @Get('hot-keywords') hotKeywords() {
    return this.svc.hotKeywords()
  }

  // 地址
  @Get('addresses') addresses(@CurrentUser() u: AuthUser) {
    return this.svc.listAddresses(u.sub)
  }
  @Get('addresses/default') defaultAddress(@CurrentUser() u: AuthUser) {
    return this.svc.defaultAddress(u.sub)
  }
  @Post('addresses') addAddress(@CurrentUser() u: AuthUser, @Body() dto: any) {
    return this.svc.createAddress(u.sub, dto)
  }
  @Put('addresses/:id') updateAddress(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.svc.updateAddress(u.sub, id, dto)
  }
  @Delete('addresses/:id') removeAddress(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.removeAddress(u.sub, id)
  }

  // 收藏
  @Get('favorites') favorites(@CurrentUser() u: AuthUser) {
    return this.svc.listFavorites(u.sub)
  }
  @Post('favorites') addFavorite(@CurrentUser() u: AuthUser, @Body('productId') productId: string) {
    return this.svc.addFavorite(u.sub, productId)
  }
  @Delete('favorites/:id') removeFavorite(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.removeFavorite(u.sub, id)
  }

  // 优惠券（所有商户已上线的有效券池，用户端可见可领可用）
  @Public() @Get('coupons') coupons() {
    return this.svc.listAvailableCoupons()
  }
  /**
   * 用户领取优惠券
   *
   * 必须登录（防止匿名薅羊毛 + 才能做"每用户限领数量"控制）。
   * 服务端做幂等 + 库存 + 个人限领数等三重校验。
   */
  @Post('coupons/:id/claim') claimCoupon(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.claimCoupon(u.sub, id)
  }
  /**
   * 我的优惠券列表（已领，包含未用 / 已用 / 已过期）
   *
   * 必须登录（防匿名扫探 user-mp 端的 user_coupon SystemConfig key）。
   * Query: status='unused' | 'used' | 'expired'（可选；缺省返回全部）
   * Response: MyCoupon[]（**数组** 不是分页对象，前端 couponService.my() 直接消费）
   */
  @Get('my-coupons') myCoupons(@CurrentUser() u: AuthUser, @Query() q: any) {
    const status =
      q?.status === 'unused' || q?.status === 'used' || q?.status === 'expired'
        ? q.status
        : undefined
    return this.svc.myCoupons(u.sub, { status })
  }

  // 预约量尺 —— @Public 允许匿名提交（首屏量尺引流场景），
  // 因此必须严控写入频率防 DoS / 数据污染：默认 throttler 已限 60/min/IP，
  // 这里再叠加 3/min/IP 的硬约束（@nestjs/throttler v6 同名 throttler 用 'default' 键覆盖）
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('booking')
  booking(@CurrentUser() u: AuthUser, @Body() dto: any) {
    return this.svc.submitBooking(u?.sub || null, dto)
  }

  // 推广
  @Get('promote/summary') promoteSummary(@CurrentUser() u: AuthUser) {
    return this.svc.promoteSummary(u.sub)
  }
  @Get('promote/orders') promoteOrders(@CurrentUser() u: AuthUser, @Query() q: any) {
    return this.svc.promoteOrders(u.sub, q)
  }
  /** 我的推广分享链接（用户点"分享海报/复制链接"时调用） */
  @Get('promote/share-link') promoteShareLink(@CurrentUser() u: AuthUser) {
    return this.svc.promoteShareLink(u.sub)
  }
  /**
   * 推广分佣规则（前端 user-mp 推广页弹窗使用）
   *
   * 公开接口，未登录也可读。后端读 SystemConfig key='promote.rules'，
   * 未配置时返回 null，由前端展示"详情请咨询客服"兜底文案，
   * 严禁后端写死任何百分比（业务可能随时调整）。
   */
  @Public() @Get('promote/rules') promoteRules() {
    return this.svc.promoteRules()
  }
  /** 绑定邀请人（用户首次通过 ?ref=xxx 进入并登录后调用，幂等） */
  @Post('promote/bind-inviter') bindInviter(
    @CurrentUser() u: AuthUser,
    @Body('inviterId') inviterId: string,
  ) {
    return this.svc.bindInviter(u.sub, inviterId)
  }

  // 门店地图（lat/lng 由小程序 uni.getLocation 真实定位上报；缺失则不计算距离）
  @Public() @Get('stores/nearby') nearbyStores(@Query() q: any) {
    return this.svc.nearbyStores({ lat: q?.lat, lng: q?.lng })
  }

  // 店铺价格显示规则（user-mp 商品页用,无需登录）
  @Public() @Get('shops/:merchantId/price-rule') shopPriceRule(
    @Param('merchantId') merchantId: string,
  ) {
    return this.svc.shopPriceRule(merchantId)
  }

  // 当前用户在某店铺的身份（需登录;商家在「客户管理」里设的 member/agency 分级）
  @Get('shops/:merchantId/my-tier') myTier(
    @CurrentUser() u: AuthUser,
    @Param('merchantId') merchantId: string,
  ) {
    return this.svc.myTierInShop(u.sub, merchantId)
  }

  // 用户资料读写
  @Get('profile') profile(@CurrentUser() u: AuthUser) {
    return this.svc.profile(u.sub)
  }
  @Patch('profile') updateProfile(@CurrentUser() u: AuthUser, @Body() dto: any) {
    return this.svc.updateProfile(u.sub, dto)
  }

  // 账号绑定
  @Post('bind-phone') bindPhone(
    @CurrentUser() u: AuthUser,
    @Body() dto: { phone: string; code: string },
  ) {
    return this.svc.bindPhone(u.sub, dto)
  }
  @Post('bind-wechat') bindWechat(@CurrentUser() u: AuthUser, @Body() dto: { code: string }) {
    return this.svc.bindWechat(u.sub, dto)
  }

  // 入驻
  @Post('merchant-apply') merchantApply(@CurrentUser() u: AuthUser, @Body() dto: any) {
    return this.svc.merchantApply(u?.sub || null, dto)
  }

  /**
   * 公开系统设置（客服联系方式 / 备案号等）
   *
   * 平台后台在 SystemConfig.key='system_settings' 写完整配置，
   * 这里只把"对用户公开"的几个字段读出来返给 user-mp，绝不返回 IP 白名单 / 密码策略等内部字段。
   * 字段未配置则返回 null，由前端展示"未提供"占位。
   * 调用方：promote 页面、me 页客服入口、底部备案号展示等。
   */
  @Public() @Get('system/settings') systemSettings() {
    return this.svc.systemSettings()
  }

  // ============ 在线客服（用户端） ============
  /** 获取/创建当前用户与指定商户的会话 */
  @Get('chat/sessions') chatSessions(@CurrentUser() u: AuthUser) {
    return this.svc.chatSessions(u.sub)
  }
  @Post('chat/sessions') ensureChatSession(
    @CurrentUser() u: AuthUser,
    @Body('merchantId') merchantId: string,
  ) {
    return this.svc.ensureChatSession(u.sub, merchantId)
  }
  @Get('chat/sessions/:id/messages') chatMessages(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
  ) {
    return this.svc.chatMessages(u.sub, id)
  }
  @Post('chat/sessions/:id/messages') chatSend(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: { type?: string; content: string },
  ) {
    return this.svc.chatSend(u.sub, id, dto.type || 'text', dto.content)
  }
  @Post('chat/sessions/:id/read') chatRead(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.chatMarkRead(u.sub, id)
  }

  // ============ 购物车 ============
  @Get('cart') listCart(@CurrentUser() u: AuthUser) {
    return this.svc.listCart(u.sub)
  }
  @Post('cart') addCart(
    @CurrentUser() u: AuthUser,
    @Body() dto: { productId: string; skuId?: string; quantity?: number },
  ) {
    return this.svc.addCart(u.sub, dto)
  }
  @Patch('cart/:id') updateCart(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: { quantity: number },
  ) {
    return this.svc.updateCart(u.sub, id, dto)
  }
  @Delete('cart/:id') removeCart(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.removeCart(u.sub, id)
  }
}
