import { Global, Module } from '@nestjs/common'
import { WxPayService } from './wxpay.service'
import { PaymentController } from './payment.controller'
import { MerchantModule } from '../merchant/merchant.module'
import { ChatModule } from '../chat/chat.module'

/**
 * Global PaymentModule —— 任何模块都能 inject WxPayService。
 *
 * 单向依赖：PaymentController → MerchantService（导入 MerchantModule）+ ChatGateway。
 * 引入 ChatModule：微信支付回调成功后，需要推 order:update 通知商家"订单已付款待发货"。
 * 反方向无显式导入（MerchantService 直接拿全局 WxPayService）。
 */
@Global()
@Module({
  imports: [MerchantModule, ChatModule],
  controllers: [PaymentController],
  providers: [WxPayService],
  exports: [WxPayService],
})
export class PaymentModule {}
