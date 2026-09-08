import { Body, Controller, Delete, Get, Post, Put, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { SkipResponseWrap } from '../../common/decorators/skip-response.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import { MerchantService } from '../merchant/merchant.service'
import { HarmonyIapService } from './harmony-iap.service'
import { HarmonyPushService, HarmonyPushPreferences } from './harmony-push.service'

@ApiTags('鸿蒙商家端')
@UseGuards(RolesGuard)
@Roles('merchant', 'factory', 'store', 'super-admin')
@Controller('m')
export class HarmonyMerchantController {
  constructor(
    private readonly merchant: MerchantService,
    private readonly push: HarmonyPushService,
    private readonly iap: HarmonyIapService,
  ) {}

  @Put('push/devices/current')
  async registerPush(
    @CurrentUser() user: AuthUser,
    @Body() dto: { token?: string; deviceId?: string; locale?: string },
  ) {
    const merchantId = await this.merchant.ensureMerchantId(user)
    return this.push.register(user.sub, merchantId, dto)
  }

  @Delete('push/devices/current')
  async unregisterPush(
    @CurrentUser() user: AuthUser,
    @Body() dto: { token?: string; deviceId?: string },
  ) {
    const merchantId = await this.merchant.ensureMerchantId(user)
    return this.push.unregister(user.sub, merchantId, dto)
  }

  @Get('push/preferences')
  async pushPreferences(@CurrentUser() user: AuthUser) {
    const merchantId = await this.merchant.ensureMerchantId(user)
    return this.push.getPreferences(merchantId)
  }

  @Put('push/preferences')
  async updatePushPreferences(
    @CurrentUser() user: AuthUser,
    @Body() dto: Partial<HarmonyPushPreferences>,
  ) {
    const merchantId = await this.merchant.ensureMerchantId(user)
    return this.push.setPreferences(merchantId, dto)
  }

  @Post('membership/iap/prepare')
  async prepareIap(@CurrentUser() user: AuthUser, @Body('planId') planId: string) {
    const merchantId = await this.merchant.ensureMerchantId(user)
    return this.iap.prepare(merchantId, user.sub, planId)
  }

  @Post('membership/iap/verify')
  async verifyIap(
    @CurrentUser() user: AuthUser,
    @Body() dto: { orderNo?: string; purchaseData?: string },
  ) {
    const merchantId = await this.merchant.ensureMerchantId(user)
    return this.iap.verify(
      merchantId,
      user.sub,
      String(dto.orderNo || ''),
      String(dto.purchaseData || ''),
    )
  }

  @Post('membership/iap/restore')
  async restoreIap(
    @CurrentUser() user: AuthUser,
    @Body() dto: { productType?: string; purchaseData?: string },
  ) {
    const merchantId = await this.merchant.ensureMerchantId(user)
    return this.iap.restore(
      merchantId,
      user.sub,
      String(dto.productType || ''),
      String(dto.purchaseData || ''),
    )
  }
}

@ApiTags('华为 IAP 回调')
@Public()
@SkipResponseWrap()
@Controller('payments/huawei-iap')
export class HuaweiIapNotificationController {
  constructor(private readonly iap: HarmonyIapService) {}

  @Post('notify')
  async notify(@Body() body: unknown) {
    return this.iap.handleNotification(body)
  }
}
