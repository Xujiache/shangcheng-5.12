import { Module } from '@nestjs/common'
import { MerchantController } from './merchant.controller'
import { MerchantService } from './merchant.service'

/**
 * MerchantModule 不需要显式导入 PaymentModule —— PaymentModule 是 @Global，
 * WxPayService 已经全局可注入。导入会触发循环依赖。
 */
@Module({
  controllers: [MerchantController],
  providers: [MerchantService],
  exports: [MerchantService],
})
export class MerchantModule {}
