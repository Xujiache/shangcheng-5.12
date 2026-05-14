import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { MerchantService } from './merchant.service'
import { OrderShareService, ShareField } from './order-share.service'
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'

@ApiTags('商家端')
@UseGuards(RolesGuard)
@Roles('merchant', 'factory', 'store', 'super-admin')
@Controller('m')
export class MerchantController {
  constructor(
    private readonly svc: MerchantService,
    private readonly orderShare: OrderShareService,
  ) {}

  // ============ Dashboard ============
  @Get('dashboard') async dashboard(@CurrentUser() u: AuthUser) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.dashboard(mid)
  }
  @Get('stats') async stats(@CurrentUser() u: AuthUser, @Query() q: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.stats(mid, q)
  }

  // ============ 商品 ============
  @Get('products') async listProducts(@CurrentUser() u: AuthUser, @Query() q: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.listProducts(mid, q)
  }
  @Get('products/:id') async productDetail(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.productDetail(mid, id)
  }
  @Post('products') async createProduct(@CurrentUser() u: AuthUser, @Body() dto: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.createProduct(mid, dto)
  }
  @Put('products/:id') async updateProduct(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.updateProduct(mid, id, dto)
  }
  @Post('products/batch-online') async batchOnline(
    @CurrentUser() u: AuthUser,
    @Body('ids') ids: string[],
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.batchStatus(mid, ids, 'active')
  }
  @Post('products/batch-offline') async batchOffline(
    @CurrentUser() u: AuthUser,
    @Body('ids') ids: string[],
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.batchStatus(mid, ids, 'offline')
  }
  @Post('products/batch-delete') async batchDelete(
    @CurrentUser() u: AuthUser,
    @Body('ids') ids: string[],
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.batchDelete(mid, ids)
  }
  @Post('products/batch-status') async batchStatus(
    @CurrentUser() u: AuthUser,
    @Body() dto: { ids: string[]; status: string },
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.batchStatus(mid, dto.ids, dto.status)
  }
  @Delete('products') async deleteByIds(@CurrentUser() u: AuthUser, @Body('ids') ids: string[]) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.batchDelete(mid, ids)
  }

  // ============ 分类 ============
  // 商家自定义分类（默认）和平台公共分类两套数据共用同一个接口，
  // 前端通过 ?type=platform 切换；不传 / 其他值视为 merchant
  @Get('categories') async categories(@CurrentUser() u: AuthUser, @Query('type') type?: string) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.listCategories(mid, type === 'platform' ? 'platform' : 'merchant')
  }
  @Post('categories') async createCategory(@CurrentUser() u: AuthUser, @Body() dto: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.createCategory(mid, dto)
  }
  @Put('categories') async batchSaveCategories(@CurrentUser() u: AuthUser, @Body() dto: any) {
    const mid = await this.svc.ensureMerchantId(u)
    const list = dto.list || dto.categories || []
    for (const c of list) {
      if (c.id) await this.svc.updateCategory(mid, c.id, c)
      else await this.svc.createCategory(mid, c)
    }
    return { ok: true }
  }
  @Put('categories/:id') async updateCategory(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.updateCategory(mid, id, dto)
  }
  @Delete('categories/:id') async deleteCategory(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.deleteCategory(mid, id)
  }
  @Post('categories/sort') async sortCategories(
    @CurrentUser() u: AuthUser,
    @Body('ids') ids: string[],
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.sortCategories(mid, ids)
  }

  // ============ 订单 ============
  @Get('orders') async listOrders(@CurrentUser() u: AuthUser, @Query() q: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.listOrders(mid, q)
  }
  /**
   * 商家分享历史列表（merchant-app「我的分享」页 + admin-pc 兜底用）
   *
   * 路由顺序极其关键：必须放在 `orders/:id` 之前，否则 NestJS 会先匹配
   * `/m/orders/shares` 为 `orderDetail(id='shares')`，新接口永远拿不到流量。
   */
  @Get('orders/shares') async merchantOrderShares(@CurrentUser() u: AuthUser, @Query() q: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.orderShare.listByMerchant(mid, q || {})
  }
  @Get('orders/:id') async orderDetail(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.orderDetail(mid, id)
  }
  @Post('orders/:id/ship') async ship(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: { company: string; trackingNumber: string },
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.ship(mid, id, dto.company, dto.trackingNumber)
  }
  @Post('orders/batch-ship') async batchShip(
    @CurrentUser() u: AuthUser,
    @Body('items') items: any[],
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.batchShip(mid, items)
  }
  @Post('orders/parse-address') parseAddress(@Body('text') text: string) {
    return this.svc.parseAddress(text)
  }

  // ============ 订单分享(商家→客户) ============
  /**
   * 创建/重建订单分享链接
   * Body: { visibleFields:['basics','customer','pricing','items','extra'], expiresInDays:30, intro?:string }
   * 返回: { shareCode, shareUrl, expiresAt, visibleFields, intro }
   */
  @Post('orders/:id/share') async createOrderShare(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: { visibleFields: ShareField[]; expiresInDays?: number; intro?: string },
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.orderShare.createShare({
      orderId: id,
      merchantId: mid,
      callerSub: u.sub,
      visibleFields: dto.visibleFields || [],
      expiresInDays: dto.expiresInDays,
      intro: dto.intro,
    })
  }

  /** 商家查询该订单当前生效的分享(回显编辑表单用) */
  @Get('orders/:id/share/current') async currentOrderShare(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.orderShare.getCurrentByOrder(id, mid)
  }

  /** 商家提前撤销分享(链接立即失效) */
  @Post('orders/:id/share/revoke') async revokeOrderShare(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.orderShare.revokeByOrder(id, mid)
  }

  // ============ 售后 ============
  @Get('refunds') async refunds(@CurrentUser() u: AuthUser, @Query() q: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.listRefunds(mid, q)
  }
  @Post('refunds/:id/agree') async agree(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body('refundAmount') refundAmount?: number,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.agreeRefund(mid, id, refundAmount)
  }
  @Post('refunds/:id/reject') async reject(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.rejectRefund(mid, id, reason)
  }
  // 别名 aftersales
  @Get('aftersales') async aftersales(@CurrentUser() u: AuthUser, @Query() q: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.listRefunds(mid, q)
  }
  @Post('aftersales/:id/review') async reviewAftersale(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: { action: string; reason?: string; refundAmount?: number },
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    if (dto.action === 'agree') return this.svc.agreeRefund(mid, id, dto.refundAmount)
    return this.svc.rejectRefund(mid, id, dto.reason || '')
  }

  // ============ 客户 ============
  @Get('customers') async customers(@CurrentUser() u: AuthUser, @Query() q: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.listCustomers(mid, q)
  }
  @Post('customers/:id/price-tier') async setTier(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body('priceTier') priceTier: string,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.setCustomerPriceTier(mid, id, priceTier)
  }
  @Post('customers/:id/authorize') async authorize(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body('on') on: boolean,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.authorizeCustomer(mid, id, on)
  }
  /**
   * 黑名单（仅在当前商家维度生效）
   *
   * 说明：黑名单是「商家 × 客户」局部状态，不动 User.status —— 否则该客户在其他商家也被禁用，
   * 影响面过大。状态存到 SystemConfig key=`merchant:<mid>:blacklist:<userId>`。
   */
  @Patch('customers/:id/blacklist') async setBlacklist(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body('on') on: boolean,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.setCustomerBlacklist(mid, id, !!on)
  }

  // ============ 佣金 ============
  @Get('commission/rules') async commissionRules(@CurrentUser() u: AuthUser) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.commissionRules(mid)
  }
  @Post('commission/rules') async saveCommissionRules(
    @CurrentUser() u: AuthUser,
    @Body() dto: any,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.saveCommissionRules(mid, dto)
  }
  // admin-pc 别名
  @Get('commission-rule') async commissionRuleAlias(@CurrentUser() u: AuthUser) {
    return this.commissionRules(u)
  }
  @Put('commission-rule') async saveCommissionRuleAlias(
    @CurrentUser() u: AuthUser,
    @Body() dto: any,
  ) {
    return this.saveCommissionRules(u, dto)
  }
  @Get('commissions') async myCommissions(@CurrentUser() u: AuthUser) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.commissionRules(mid)
  }
  @Get('promote-summary') async promoteSummary(@CurrentUser() u: AuthUser) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.promoteSummary(mid)
  }
  /** 商家维度佣金历史明细（关联订单 + 推广人），分页 */
  @Get('commission/history') async commissionHistory(@CurrentUser() u: AuthUser, @Query() q: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.commissionHistory(mid, q)
  }
  @Get('marketing') async marketingAlias(@CurrentUser() u: AuthUser) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.marketingOverview(mid)
  }
  /** 商家维度营销活动统一列表（Coupon + FlashSale + GroupBuy 合一），分页；可选 ?kind=coupon|flashSale|groupBuy ?status=active 等 */
  @Get('marketing/activities') async marketingActivities(
    @CurrentUser() u: AuthUser,
    @Query() q: any,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.marketingActivities(mid, q)
  }
  @Get('staff') async staffAlias(@CurrentUser() u: AuthUser, @Query() q: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.listStaffs(mid, q)
  }

  // ============ 提现 ============
  @Get('withdraws') async withdraws(@CurrentUser() u: AuthUser, @Query() q: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.listWithdraws(mid, q)
  }
  @Post('withdraws') async createWithdraw(@CurrentUser() u: AuthUser, @Body() dto: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.createWithdraw(u.sub, mid, dto)
  }
  /**
   * @deprecated 商家自审产品语义错误。正确入口已迁到 /p/withdraws/:id/approve（平台审核）。
   *   保留兼容老 admin-pc / merchant-app 调用,后续版本下线。
   */
  @Post('withdraws/:id/review') async reviewWithdraw(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.reviewWithdraw(mid, id, dto.actualAmount, dto.remark, dto.remarkTags)
  }
  /** @deprecated 同上,已由 /p/withdraws/:id/reject 接管 */
  @Post('withdraws/:id/reject') async rejectWithdraw(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.rejectWithdraw(mid, id, reason)
  }
  @Get('balance') async balance(@CurrentUser() u: AuthUser) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.balance(mid)
  }

  // ============ 门店 ============
  @Get('stores') async stores(@CurrentUser() u: AuthUser, @Query() q: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.listStores(mid, q)
  }
  @Post('stores') async createStore(@CurrentUser() u: AuthUser, @Body() dto: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.createStore(mid, dto)
  }
  @Put('stores/:id') async updateStore(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.updateStore(mid, id, dto)
  }
  @Delete('stores/:id') async removeStore(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.removeStore(mid, id)
  }
  @Get('stores/:id/auth') async getAuth(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.getStoreAuth(mid, id)
  }
  @Post('stores/:id/auth') async saveAuth(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.saveStoreAuth(mid, id, dto)
  }

  // ============ 员工 ============
  @Get('staffs') async staffs(@CurrentUser() u: AuthUser, @Query() q: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.listStaffs(mid, q)
  }
  @Post('staffs') async createStaff(@CurrentUser() u: AuthUser, @Body() dto: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.createStaff(mid, dto)
  }
  @Put('staffs/:id') async updateStaff(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.updateStaff(mid, id, dto)
  }
  @Delete('staffs/:id') async removeStaff(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.removeStaff(mid, id)
  }

  // ============ 装修 ============
  @Get('shop/decorate') async getDecorate(@CurrentUser() u: AuthUser) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.getDecorate(mid)
  }
  @Post('shop/decorate') async saveDecorate(@CurrentUser() u: AuthUser, @Body() dto: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.saveDecorate(mid, dto)
  }
  @Put('shop/decorate') async putDecorate(@CurrentUser() u: AuthUser, @Body() dto: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.saveDecorate(mid, dto)
  }

  // ============ 营销 ============
  @Get('marketing/overview') async marketingOverview(@CurrentUser() u: AuthUser) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.marketingOverview(mid)
  }
  @Get('marketing/coupons') async marketingCoupons(@CurrentUser() u: AuthUser, @Query() q: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.marketingCoupons(mid, q)
  }
  // 优惠券 CRUD（admin-pc 营销中心 + merchant-app marketing 共用）
  @Post('marketing/coupons') async createCoupon(@CurrentUser() u: AuthUser, @Body() dto: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.createCoupon(mid, dto)
  }
  @Put('marketing/coupons/:id') async updateCouponApi(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.updateCoupon(mid, id, dto)
  }
  @Delete('marketing/coupons/:id') async deleteCoupon(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.deleteCoupon(mid, id)
  }
  @Post('marketing/coupons/:id/toggle') async toggleCoupon(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body('active') active: boolean,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.toggleCoupon(mid, id, !!active)
  }

  // ============ 客服聊天 ============
  @Get('chat/sessions') async chatSessions(@CurrentUser() u: AuthUser) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.chatSessions(mid)
  }
  @Get('chat/sessions/:id/messages') async chatMessages(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.chatMessages(mid, id)
  }
  @Post('chat/sessions/:id/messages') async chatSend(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: { type: string; content: string },
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.chatSend(mid, id, dto.type || 'text', dto.content)
  }
  @Get('chat/quick-replies') async chatQuickReplies(@CurrentUser() u: AuthUser) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.quickReplies(mid)
  }
  // PC 别名
  @Get('chat/messages') async chatMessagesAlias(
    @CurrentUser() u: AuthUser,
    @Query('sessionId') sessionId: string,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.chatMessages(mid, sessionId)
  }
  @Post('chat/messages') async chatSendAlias(
    @CurrentUser() u: AuthUser,
    @Body() dto: { sessionId: string; type: string; content: string },
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.chatSend(mid, dto.sessionId, dto.type || 'text', dto.content)
  }

  // ============ 选品广场 ============
  @Get('plaza/products') async plazaProducts(@CurrentUser() u: AuthUser, @Query() q: any) {
    const mid = await this.svc.ensureMerchantId(u).catch(() => '')
    return this.svc.plazaProducts(mid, q)
  }
  @Get('plaza/cards') async plazaCards(@CurrentUser() u: AuthUser, @Query() q: any) {
    return this.plazaProducts(u, q)
  }
  @Get('plaza/factories') async plazaFactories(@CurrentUser() u: AuthUser, @Query() q: any) {
    const mid = await this.svc.ensureMerchantId(u).catch(() => '')
    return this.svc.plazaFactories(mid, {
      region: q?.region,
      category: q?.category,
      minRating: q?.minRating ? Number(q.minRating) : undefined,
      keyword: q?.keyword,
    })
  }
  @Get('plaza/factories/:id') async plazaFactory(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
  ) {
    const mid = await this.svc.ensureMerchantId(u).catch(() => '')
    return this.svc.plazaFactory(mid, id)
  }
  @Get('plaza/factory/:id') async plazaFactoryAlias(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
  ) {
    return this.plazaFactory(u, id)
  }
  @Post('plaza/factories/:id/follow') async followFactory(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body('on') on: boolean,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.followFactory(mid, id, on)
  }
  @Post('plaza/factories/:id/rate') async rateFactory(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body('score') score: number,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.rateMerchant(id, mid, Number(score))
  }
  @Get('plaza/visibility') async getPlazaVisibility(@CurrentUser() u: AuthUser) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.getPlazaVisibility(mid)
  }
  @Put('plaza/visibility') async setPlazaVisibility(
    @CurrentUser() u: AuthUser,
    @Body('scope') scope: 'stores' | 'public',
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.setPlazaVisibility(mid, scope)
  }
  @Post('plaza/agency') async applyAgency(@CurrentUser() u: AuthUser, @Body() dto: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.applyAgency(mid, dto)
  }
  @Get('plaza/applications') async myAgencyApplications(
    @CurrentUser() u: AuthUser,
    @Query() q: any,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.myAgencyApplications(mid, q)
  }
  @Patch('plaza/applications/:id') async updateAgencyApp(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: { myRetailPrice?: number; markupRatio?: number; status?: string },
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.updateAgencyApplication(mid, id, dto)
  }
  @Delete('plaza/applications/:id') async cancelAgencyApp(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.cancelAgencyApplication(mid, id)
  }

  // ============ 商户资料（merchant-app 个人信息编辑） ============
  @Get('profile') async myProfile(@CurrentUser() u: AuthUser) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.getProfile(mid)
  }
  @Patch('profile') async updateProfile(@CurrentUser() u: AuthUser, @Body() dto: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.updateProfile(mid, dto)
  }

  // ============ 店铺级价格显示规则（持久化到 SystemConfig，key: shop:<merchantId>:priceRule） ============
  @Get('shop/price-rule') async getPriceRule(@CurrentUser() u: AuthUser) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.getShopPriceRule(mid)
  }
  @Put('shop/price-rule') async putPriceRule(@CurrentUser() u: AuthUser, @Body() dto: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.setShopPriceRule(mid, dto)
  }

  // ============ 功能开关 ============
  @Get('feature-flags') async featureFlags(@CurrentUser() u: AuthUser) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.resolveFeatureFlags(mid)
  }

  // ============ 会员 ============
  @Get('membership/plans') memberPlans() {
    return this.svc.memberPlans()
  }
  @Get('membership') async myMembership(@CurrentUser() u: AuthUser) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.myMembership(mid)
  }
  @Get('membership/quota') async quota(@CurrentUser() u: AuthUser) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.quota(mid)
  }
  @Get('membership/payments') async payments(@CurrentUser() u: AuthUser) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.myPayments(mid)
  }
  @Get('membership/notices') async notices(@CurrentUser() u: AuthUser) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.membershipNotices(mid)
  }
  @Post('membership/subscribe') async subscribe(@CurrentUser() u: AuthUser, @Body() dto: any) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.subscribe(mid, u.sub, dto)
  }
  /** 前端轮询支付状态（拉起 wxpay 成功后调用，直到 status='paid' 才显示成功） */
  @Get('membership/payments/:no/status') async membershipPayStatus(
    @CurrentUser() u: AuthUser,
    @Param('no') no: string,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.getMembershipPaymentStatus(mid, no)
  }
  @Post('membership/cancel') async cancelSub(@CurrentUser() u: AuthUser) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.cancelSub(mid)
  }
  @Post('membership/auto-renew') async setAutoRenew(
    @CurrentUser() u: AuthUser,
    @Body('autoRenew') autoRenew: boolean,
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.setAutoRenew(mid, autoRenew)
  }
  @Post('membership/quota/use') async useQuota(
    @CurrentUser() u: AuthUser,
    @Body() dto: { key: string; count?: number },
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.useQuota(mid, dto.key, dto.count || 1)
  }
  @Post('membership/quota/release') async releaseQuota(
    @CurrentUser() u: AuthUser,
    @Body() dto: { key: string; count?: number },
  ) {
    const mid = await this.svc.ensureMerchantId(u)
    return this.svc.releaseQuota(mid, dto.key, dto.count || 1)
  }
}
