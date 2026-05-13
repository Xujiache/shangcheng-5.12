import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { PlatformService } from './platform.service'
import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'

@ApiTags('平台端')
@UseGuards(RolesGuard)
@Roles('admin', 'platform', 'super-admin')
@Controller('p')
export class PlatformController {
  constructor(private readonly svc: PlatformService) {}

  // Dashboard
  @Get('dashboard') dashboard() { return this.svc.dashboard() }
  @Get('stats') stats(@Query() q: any) { return this.svc.stats(q) }

  // Merchants
  @Get('merchants') merchants(@Query() q: any) { return this.svc.merchants(q) }
  @Get('audit/merchants') auditMerchants(@Query() q: any) { return this.svc.auditMerchants(q) }
  @Post('merchants/:id/approve') approveMerchant(@Param('id') id: string) { return this.svc.approveMerchant(id) }
  @Post('merchants/:id/reject') rejectMerchant(@Param('id') id: string, @Body('reason') reason: string) { return this.svc.rejectMerchant(id, reason) }
  @Post('merchants/:id/pause') pauseMerchant(@Param('id') id: string) { return this.svc.pauseMerchant(id) }
  @Post('merchants/:id/resume') resumeMerchant(@Param('id') id: string) { return this.svc.resumeMerchant(id) }

  // Orders
  @Get('orders') orders(@Query() q: any) { return this.svc.orders(q) }

  // Product Audit
  @Get('audit/products') auditProducts(@Query() q: any) { return this.svc.auditProducts(q) }
  @Get('audit/products/config') getAuditConfig() { return this.svc.getAuditConfig() }
  @Post('audit/products/config') saveAuditConfig(@Body() dto: any) { return this.svc.saveAuditConfig(dto) }
  @Post('products/:id/approve') approveProduct(@Param('id') id: string) { return this.svc.approveProduct(id) }
  @Post('products/:id/reject') rejectProduct(@Param('id') id: string, @Body('reason') reason: string) { return this.svc.rejectProduct(id, reason) }

  // Ads
  @Get('ads/slots') adSlots() { return this.svc.adSlots() }
  @Post('ads/slots') createAdSlot(@Body() dto: any) { return this.svc.createAdSlot(dto) }
  @Put('ads/slots/:id') updateAdSlot(@Param('id') id: string, @Body() dto: any) { return this.svc.updateAdSlot(id, dto) }
  @Delete('ads/slots/:id') deleteAdSlot(@Param('id') id: string) { return this.svc.deleteAdSlot(id) }
  @Get('ads/creatives') adCreatives(@Query() q: any) { return this.svc.adCreatives(q) }
  @Post('ads/creatives') createAdCreative(@Body() dto: any) { return this.svc.createAdCreative(dto) }
  @Put('ads/creatives/:id') updateAdCreative(@Param('id') id: string, @Body() dto: any) { return this.svc.updateAdCreative(id, dto) }
  @Delete('ads/creatives/:id') deleteAdCreative(@Param('id') id: string) { return this.svc.deleteAdCreative(id) }

  // Plaza
  @Get('plaza/pushes') plazaPushes(@Query() q: any) { return this.svc.plazaPushes(q) }
  @Post('plaza/pushes') createPlazaPush(@Body() dto: any) { return this.svc.createPlazaPush(dto) }
  @Get('plaza/products') plazaProducts(@Query() q: any) { return this.svc.plazaProductsAll(q) }
  @Get('plaza/factories') plazaFactories() { return this.svc.plazaFactoriesAll() }
  @Get('plaza/records') plazaRecords(@Query() q: any) { return this.svc.plazaRecords(q) }

  // Member Plans
  @Get('member-plans') memberPlans() { return this.svc.memberPlans() }
  @Post('member-plans') saveMemberPlan(@Body() dto: any) { return this.svc.saveMemberPlan(dto) }
  @Delete('member-plans/:id') deleteMemberPlan(@Param('id') id: string) { return this.svc.deleteMemberPlan(id) }
  @Get('member-plans/:id/subscriptions') planSubscriptions(@Param('id') id: string) { return this.svc.planSubscriptions(id) }

  // Member Pay Orders
  @Get('member-pay-orders') memberPayOrders(@Query() q: any) { return this.svc.memberPayOrders(q) }
  @Patch('member-pay-orders/:id/status') updatePayStatus(@Param('id') id: string, @Body('status') status: string) { return this.svc.updatePayStatus(id, status) }
  @Post('member-pay-orders/:id/approve-refund') approveRefund(@Param('id') id: string) { return this.svc.approveRefund(id) }
  @Post('member-pay-orders/:id/reject-refund') rejectRefund(@Param('id') id: string, @Body('reason') reason: string) { return this.svc.rejectRefund(id, reason) }

  // Feature Flags
  @Get('feature-flags') featureFlags() { return this.svc.featureFlags() }
  @Post('feature-flags') createFeatureFlag(@Body() dto: any) { return this.svc.createFeatureFlag(dto) }
  @Delete('feature-flags/:id') deleteFeatureFlag(@Param('id') id: string) { return this.svc.deleteFeatureFlag(id) }
  @Post('feature-flags/:id/toggle') toggleFeatureFlag(@Param('id') id: string, @Body('enabled') enabled: boolean) { return this.svc.toggleFeatureFlag(id, enabled) }
  @Get('feature-flags/gray') featureFlagGray() { return this.svc.featureFlagGray() }
  @Post('feature-flags/gray') setFeatureFlagGray(@Body() dto: any) { return this.svc.setFeatureFlagGray(dto) }
  @Post('feature-flags/reset') resetFeatureFlags() { return this.svc.resetFeatureFlags() }

  // Admins / Roles
  @Get('admins') admins() { return this.svc.admins() }
  @Post('admins') createAdmin(@Body() dto: any) { return this.svc.createAdmin(dto) }
  @Put('admins/:id') updateAdmin(@Param('id') id: string, @Body() dto: any) { return this.svc.updateAdmin(id, dto) }
  @Delete('admins/:id') deleteAdmin(@Param('id') id: string) { return this.svc.deleteAdmin(id) }
  @Post('admins/:id/toggle') toggleAdmin(@Param('id') id: string) { return this.svc.toggleAdmin(id) }

  @Get('roles') roles() { return this.svc.roles() }
  @Post('roles') saveRole(@Body() dto: any) { return this.svc.saveRole(dto) }
  @Put('roles/:id') updateRole(@Param('id') id: string, @Body() dto: any) { return this.svc.updateRole(id, dto) }
  @Delete('roles/:id') deleteRole(@Param('id') id: string) { return this.svc.deleteRole(id) }

  // System
  @Get('system/settings') systemSettings() { return this.svc.systemSettings() }
  @Post('system/settings') saveSystemSettings(@Body() dto: any) { return this.svc.saveSystemSettings(dto) }
}
