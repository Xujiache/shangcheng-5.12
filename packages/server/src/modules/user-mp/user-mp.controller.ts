import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { UserMpService } from './user-mp.service'
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'

@ApiTags('用户端 user-mp')
@Controller('u')
export class UserMpController {
  constructor(private readonly svc: UserMpService) {}

  // 商品
  @Public() @Get('products') listProducts(@Query() q: any) { return this.svc.listProducts(q) }
  @Public() @Get('products/:id') productDetail(@Param('id') id: string) { return this.svc.productDetail(id) }

  // 分类
  @Public() @Get('categories') categories() { return this.svc.listCategories() }

  // 订单
  @Get('orders') listOrders(@CurrentUser() u: AuthUser, @Query() q: any) { return this.svc.listOrders(u.sub, q) }
  @Get('orders/:id') orderDetail(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.orderDetail(u.sub, id) }
  @Post('orders') createOrder(@CurrentUser() u: AuthUser, @Body() dto: any) { return this.svc.createOrder(u.sub, dto) }
  @Post('orders/:id/pay') pay(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body('method') method: string) { return this.svc.payOrder(u.sub, id, method || 'wechat') }
  @Post('orders/:id/confirm') confirm(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.confirmOrder(u.sub, id) }
  @Post('orders/:id/cancel') cancel(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.cancelOrder(u.sub, id) }
  @Post('orders/:id/urge') urge(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.urgeOrder(u.sub, id) }

  // Banner
  @Public() @Get('banners') banners() { return this.svc.banners() }

  // 地址
  @Get('addresses') addresses(@CurrentUser() u: AuthUser) { return this.svc.listAddresses(u.sub) }
  @Get('addresses/default') defaultAddress(@CurrentUser() u: AuthUser) { return this.svc.defaultAddress(u.sub) }
  @Post('addresses') addAddress(@CurrentUser() u: AuthUser, @Body() dto: any) { return this.svc.createAddress(u.sub, dto) }
  @Put('addresses/:id') updateAddress(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: any) { return this.svc.updateAddress(u.sub, id, dto) }
  @Delete('addresses/:id') removeAddress(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.removeAddress(u.sub, id) }

  // 收藏
  @Get('favorites') favorites(@CurrentUser() u: AuthUser) { return this.svc.listFavorites(u.sub) }
  @Post('favorites') addFavorite(@CurrentUser() u: AuthUser, @Body('productId') productId: string) { return this.svc.addFavorite(u.sub, productId) }
  @Delete('favorites/:id') removeFavorite(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.svc.removeFavorite(u.sub, id) }

  // 优惠券（所有商户已上线的有效券池，用户端可见可领可用）
  @Public() @Get('coupons') coupons() { return this.svc.listAvailableCoupons() }

  // 预约量尺
  @Public() @Post('booking') booking(@CurrentUser() u: AuthUser, @Body() dto: any) { return this.svc.submitBooking(u?.sub || null, dto) }

  // 推广
  @Get('promote/summary') promoteSummary(@CurrentUser() u: AuthUser) { return this.svc.promoteSummary(u.sub) }
  @Get('promote/orders') promoteOrders(@CurrentUser() u: AuthUser, @Query() q: any) { return this.svc.promoteOrders(u.sub, q) }

  // 门店地图
  @Public() @Get('stores/nearby') nearbyStores() { return this.svc.nearbyStores() }

  // 店铺价格显示规则（user-mp 商品页用）
  @Public() @Get('shops/:merchantId/price-rule') shopPriceRule(@Param('merchantId') merchantId: string) {
    return this.svc.shopPriceRule(merchantId)
  }

  // 用户资料读写
  @Get('profile') profile(@CurrentUser() u: AuthUser) { return this.svc.profile(u.sub) }
  @Patch('profile') updateProfile(@CurrentUser() u: AuthUser, @Body() dto: any) {
    return this.svc.updateProfile(u.sub, dto)
  }

  // 入驻
  @Post('merchant-apply') merchantApply(@CurrentUser() u: AuthUser, @Body() dto: any) { return this.svc.merchantApply(u?.sub || null, dto) }

  // ============ 在线客服（用户端） ============
  /** 获取/创建当前用户与指定商户的会话 */
  @Get('chat/sessions') chatSessions(@CurrentUser() u: AuthUser) { return this.svc.chatSessions(u.sub) }
  @Post('chat/sessions') ensureChatSession(@CurrentUser() u: AuthUser, @Body('merchantId') merchantId: string) {
    return this.svc.ensureChatSession(u.sub, merchantId)
  }
  @Get('chat/sessions/:id/messages') chatMessages(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.chatMessages(u.sub, id)
  }
  @Post('chat/sessions/:id/messages') chatSend(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: { type?: string; content: string }) {
    return this.svc.chatSend(u.sub, id, dto.type || 'text', dto.content)
  }
  @Post('chat/sessions/:id/read') chatRead(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.chatMarkRead(u.sub, id)
  }
}
