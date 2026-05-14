import { Global, Module } from '@nestjs/common'
import { WxPayService } from './wxpay.service'
import { PaymentController } from './payment.controller'
import { MerchantModule } from '../merchant/merchant.module'

/**
 * Global PaymentModule —— 任何模块都能 inject WxPayService。
 *
 * 单向依赖：PaymentController → MerchantService（导入 MerchantModule）。
 * 反方向无显式导入（MerchantService 直接拿全局 WxPayService）。
 */
@Global()
@Module({
  imports: [MerchantModule],
  controllers: [PaymentController],
  providers: [WxPayService],
  exports: [WxPayService],
})
export class PaymentModule {}
