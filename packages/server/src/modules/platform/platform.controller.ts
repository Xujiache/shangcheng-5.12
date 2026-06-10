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
import { PlatformService } from './platform.service'
import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import { UpdateAdminDto } from './dto/update-admin.dto'
import { CreateAdminDto } from './dto/create-admin.dto'
import { CreateAdSlotDto, UpdateAdSlotDto } from './dto/ad-slot.dto'
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator'

@ApiTags('平台端')
@UseGuards(RolesGuard)
@Roles('admin', 'platform', 'super-admin')
@Controller('p')
export class PlatformController {
  constructor(private readonly svc: PlatformService) {}

  // Dashboard
  @Get('dashboard') dashboard() {
    return this.svc.dashboard()
  }
  @Get('stats') stats(@Query() q: any) {
    return this.svc.stats(q)
  }

  // Merchants
  @Get('merchants') merchants(@Query() q: any) {
    return this.svc.merchants(q)
  }
  @Get('audit/merchants') auditMerchants(@Query() q: any) {
    return this.svc.auditMerchants(q)
  }
  @Post('merchants/:id/approve') approveMerchant(@Param('id') id: string) {
    return this.svc.approveMerchant(id)
  }
  @Post('merchants/:id/reject') rejectMerchant(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.svc.rejectMerchant(id, reason)
  }
  @Post('merchants/:id/pause') pauseMerchant(@Param('id') id: string) {
    return this.svc.pauseMerchant(id)
  }
  @Post('merchants/:id/resume') resumeMerchant(@Param('id') id: string) {
    return this.svc.resumeMerchant(id)
  }

  // Orders
  @Get('orders') orders(@Query() q: any) {
    return this.svc.orders(q)
  }

  // Product Audit
  @Get('audit/products') auditProducts(@Query() q: any) {
    return this.svc.auditProducts(q)
  }
  @Get('audit/products/config') getAuditConfig() {
    return this.svc.getAuditConfig()
  }
  @Post('audit/products/config') saveAuditConfig(@Body() dto: any) {
    return this.svc.saveAuditConfig(dto)
  }
  @Post('products/:id/approve') approveProduct(@Param('id') id: string) {
    return this.svc.approveProduct(id)
  }
  @Post('products/:id/reject') rejectProduct(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.svc.rejectProduct(id, reason)
  }
  // 抽检：把自动审通过的商品"加入抽检队列"（记录一条 sample_check 审计，商品维持上架）。
  // 通过/驳回的最终裁决走 approve / reject 两个接口，这里不改 product.status。
  @Post('audit/products/:id/sample-check') sampleCheckProduct(
    @Param('id') id: string,
    @CurrentUser() u: AuthUser,
  ) {
    return this.svc.sampleCheckProduct(id, u?.sub)
  }
  // 平台维度控制商品在选品广场是否展示(不动 product.status,用 SystemConfig 覆盖)
  @Patch('plaza/products/:id/online') setPlazaProductOnline(
    @Param('id') id: string,
    @Body('online') online: boolean,
  ) {
    return this.svc.setPlazaProductOnline(id, !!online)
  }

  // Ads
  @Get('ads/slots') adSlots() {
    return this.svc.adSlots()
  }
  @Post('ads/slots') createAdSlot(@Body() dto: CreateAdSlotDto) {
    return this.svc.createAdSlot(dto)
  }
  @Put('ads/slots/:id') updateAdSlot(@Param('id') id: string, @Body() dto: UpdateAdSlotDto) {
    return this.svc.updateAdSlot(id, dto)
  }
  @Delete('ads/slots/:id') deleteAdSlot(@Param('id') id: string) {
    return this.svc.deleteAdSlot(id)
  }
  @Get('ads/creatives') adCreatives(@Query() q: any) {
    return this.svc.adCreatives(q)
  }
  @Post('ads/creatives') createAdCreative(@Body() dto: any) {
    return this.svc.createAdCreative(dto)
  }
  @Put('ads/creatives/:id') updateAdCreative(@Param('id') id: string, @Body() dto: any) {
    return this.svc.updateAdCreative(id, dto)
  }
  @Delete('ads/creatives/:id') deleteAdCreative(@Param('id') id: string) {
    return this.svc.deleteAdCreative(id)
  }
  // 广告创意审核（pending → active / rejected） + 写 AuditRecord，复用 approveProduct / rejectProduct 套路
  @Post('ads/creatives/:id/approve') approveAdCreative(
    @Param('id') id: string,
    @CurrentUser() u: AuthUser,
  ) {
    return this.svc.approveAdCreative(id, u?.sub)
  }
  @Post('ads/creatives/:id/reject') rejectAdCreative(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() u: AuthUser,
  ) {
    return this.svc.rejectAdCreative(id, reason, u?.sub)
  }

  // Plaza
  @Get('plaza/pushes') plazaPushes(@Query() q: any) {
    return this.svc.plazaPushes(q)
  }
  @Post('plaza/pushes') createPlazaPush(@Body() dto: any) {
    return this.svc.createPlazaPush(dto)
  }
  @Get('plaza/products') plazaProducts(@Query() q: any) {
    return this.svc.plazaProductsAll(q)
  }
  @Get('plaza/factories') plazaFactories() {
    return this.svc.plazaFactoriesAll()
  }
  @Get('plaza/records') plazaRecords(@Query() q: any) {
    return this.svc.plazaRecords(q)
  }

  // Member Plans
  // 注意: 路由顺序 — `trial-days` 必须放在 `:id` 系列之前,避免被当成 planId 匹配
  @Get('member-plans/trial-days') memberTrialDays() {
    return this.svc.getMemberTrialDays()
  }
  @Put('member-plans/trial-days') saveMemberTrialDays(@Body('days') days: number) {
    return this.svc.setMemberTrialDays(days)
  }
  @Get('member-plans') memberPlans() {
    return this.svc.memberPlans()
  }
  @Post('member-plans') saveMemberPlan(@Body() dto: any) {
    return this.svc.saveMemberPlan(dto)
  }
  @Delete('member-plans/:id') deleteMemberPlan(@Param('id') id: string) {
    return this.svc.deleteMemberPlan(id)
  }
  @Get('member-plans/:id/subscriptions') planSubscriptions(@Param('id') id: string) {
    return this.svc.planSubscriptions(id)
  }

  // ============ 提现审核（平台层） ============
  // 之前提现审核接口挂在 /m/withdraws/:id/review（商家自审），产品语义错误：
  //   - 商家本应"提交"提现申请，由平台审核后才能放款
  //   - 商家自审等于无审核，存在资金风险
  // 这里在 /p/withdraws 下重新定义平台审核入口，配合 admin-pc 平台后台「提现审核」页使用；
  // /m/withdraws/:id/review 已标 @deprecated 并保留以兼容老调用，后续逐步下线。
  @Get('withdraws') withdraws(@Query() q: any) {
    return this.svc.withdrawsList(q)
  }
  @Post('withdraws/:id/approve') approveWithdraw(
    @Param('id') id: string,
    @Body('remark') remark: string | undefined,
    @CurrentUser() u: AuthUser,
  ) {
    return this.svc.approveWithdraw(id, remark, u?.sub)
  }
  @Post('withdraws/:id/reject') rejectWithdrawPlat(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() u: AuthUser,
  ) {
    return this.svc.rejectWithdrawPlat(id, reason, u?.sub)
  }
  @Post('withdraws/:id/mark-paid') markWithdrawPaid(
    @Param('id') id: string,
    @Body() body: { transactionId?: string; remark?: string },
    @CurrentUser() u: AuthUser,
  ) {
    return this.svc.markWithdrawPaid(id, body || {}, u?.sub)
  }

  // Member Pay Orders
  @Get('member-pay-orders') memberPayOrders(@Query() q: any) {
    return this.svc.memberPayOrders(q)
  }
  @Patch('member-pay-orders/:id/status') updatePayStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.svc.updatePayStatus(id, status)
  }
  @Post('member-pay-orders/:id/approve-refund') approveRefund(@Param('id') id: string) {
    return this.svc.approveRefund(id)
  }
  @Post('member-pay-orders/:id/reject-refund') rejectRefund(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.svc.rejectRefund(id, reason)
  }

  // Feature Flags
  @Get('feature-flags') featureFlags() {
    return this.svc.featureFlags()
  }
  @Post('feature-flags') createFeatureFlag(@Body() dto: any) {
    return this.svc.createFeatureFlag(dto)
  }
  @Delete('feature-flags/:id') deleteFeatureFlag(@Param('id') id: string) {
    return this.svc.deleteFeatureFlag(id)
  }
  @Post('feature-flags/:id/toggle') toggleFeatureFlag(
    @Param('id') id: string,
    @Body('enabled') enabled: boolean,
  ) {
    return this.svc.toggleFeatureFlag(id, enabled)
  }
  @Get('feature-flags/gray') featureFlagGray() {
    return this.svc.featureFlagGray()
  }
  @Post('feature-flags/gray') setFeatureFlagGray(@Body() dto: any) {
    return this.svc.setFeatureFlagGray(dto)
  }
  @Post('feature-flags/reset') resetFeatureFlags() {
    return this.svc.resetFeatureFlags()
  }

  // Admins / Roles
  @Get('admins') admins(@Query() q: any) {
    return this.svc.admins(q)
  }
  @Post('admins') createAdmin(@Body() dto: CreateAdminDto, @CurrentUser() u: AuthUser) {
    return this.svc.createAdmin(dto, u?.role)
  }
  @Put('admins/:id') updateAdmin(
    @Param('id') id: string,
    @Body() dto: UpdateAdminDto,
    @CurrentUser() u: AuthUser,
  ) {
    return this.svc.updateAdmin(id, dto, u?.role, u?.sub)
  }
  @Delete('admins/:id') deleteAdmin(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.svc.deleteAdmin(id, u?.sub, u?.role)
  }
  @Post('admins/:id/toggle') toggleAdmin(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.svc.toggleAdmin(id, u?.sub, u?.role)
  }
  // 超管重置管理员密码:仅 super-admin 可调,不允许重置自己/其他 super-admin/普通用户
  @Post('admins/:id/reset-password') resetAdminPwd(
    @Param('id') id: string,
    @Body('password') password: string,
    @CurrentUser() u: AuthUser,
  ) {
    return this.svc.resetAdminPassword(id, password, u?.sub, u?.role)
  }

  @Get('roles') roles(@Query() q: any) {
    return this.svc.roles(q)
  }
  @Post('roles') saveRole(@Body() dto: any) {
    return this.svc.saveRole(dto)
  }
  @Put('roles/:id') updateRole(@Param('id') id: string, @Body() dto: any) {
    return this.svc.updateRole(id, dto)
  }
  @Delete('roles/:id') deleteRole(@Param('id') id: string) {
    return this.svc.deleteRole(id)
  }

  // Audit Records
  // 查询所有审核日志（商家/商品审核流转），支持 type/status/targetId 过滤 + 分页
  @Get('audit/records') auditRecords(@Query() q: any) {
    return this.svc.auditRecords(q)
  }

  // ============ 订单分享数据看板（管理后台） ============
  // 注意路由顺序：`stats` 必须放在 `:id` 系列之前，否则会被误判为 shareCode。
  // 当前没有按 shareCode 单查的路由，但为后续扩展留好声明顺序。
  @Get('order-shares/stats') orderSharesStats() {
    return this.svc.orderSharesStats()
  }
  @Get('order-shares') orderShares(@Query() q: any) {
    return this.svc.orderShares(q)
  }

  // System
  @Get('system/settings') systemSettings() {
    return this.svc.systemSettings()
  }
  @Post('system/settings') saveSystemSettings(@Body() dto: any) {
    return this.svc.saveSystemSettings(dto)
  }

  // ============ 工单系统 ============
  // 工单基于 SystemConfig key='ticket:<id>' 兜底存储,详见 svc.tickets() 注释
  // 路由顺序:`handled-count` / `pending-count` 必须在 `:id` 系列之前
  @Get('tickets/handled-count') handledTicketCount() {
    return this.svc.handledTicketCount()
  }
  @Get('tickets/pending-count') pendingTicketCount() {
    return this.svc.pendingTicketCount()
  }
  @Get('tickets') tickets(@Query() q: any) {
    return this.svc.tickets(q)
  }
  @Post('tickets') createTicket(@Body() dto: any, @CurrentUser() u: AuthUser) {
    return this.svc.createTicket({
      title: dto?.title,
      content: dto?.content,
      fromUserId: dto?.fromUserId || u?.sub,
      fromUserName: dto?.fromUserName,
      priority: dto?.priority,
    })
  }
  @Post('tickets/:id/handle') handleTicket(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() u: AuthUser,
  ) {
    return this.svc.handleTicket(id, dto, u?.sub)
  }

  // ============ 消息中心 ============
  // 同样基于 SystemConfig key='notification:<id>' 兜底存储;
  // 平台运营人员看到的系统通知/待办提醒/业务提示三类。
  @Get('notifications') notifications(@Query() q: any) {
    return this.svc.notifications(q)
  }
  @Post('notifications/read-all') notificationsReadAll(@CurrentUser() u: AuthUser) {
    return this.svc.notificationsReadAll(u?.sub)
  }
  @Post('notifications/:id/read') notificationRead(
    @Param('id') id: string,
    @CurrentUser() u: AuthUser,
  ) {
    return this.svc.notificationRead(id, u?.sub)
  }

  // ============ 反馈 ============
  // 反馈记录基于 SystemConfig key='feedback:<id>' 兜底存储,
  // 平台运营人员可在 admin-pc / platform-app 查看 / 处理。
  @Post('feedback') submitFeedback(@Body() dto: any, @CurrentUser() u: AuthUser) {
    return this.svc.submitFeedback(dto, u?.sub)
  }
  @Get('feedback') feedbackList(@Query() q: any) {
    return this.svc.feedbackList(q)
  }

  // ============ 售后/退款审核（平台层） ============
  // 注意：前端 platform-app refundService 用的是 `agree` 不是 `approve`，
  // 这里端点名称必须严格匹配前端调用（POST /p/refunds/:id/agree）。
  @Get('refunds') refunds(@Query() q: any) {
    return this.svc.listRefunds(q)
  }
  @Post('refunds/:id/agree') agreeRefund(
    @Param('id') id: string,
    @Body('refundAmount') refundAmount: number | undefined,
    @CurrentUser() u: AuthUser,
  ) {
    return this.svc.agreeRefund(id, refundAmount, u?.sub)
  }
  @Post('refunds/:id/reject') rejectRefundPlat(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() u: AuthUser,
  ) {
    return this.svc.rejectRefundPlat(id, reason, u?.sub)
  }
}
