import { Global, Module } from '@nestjs/common'
import { WxPayService } from './wxpay.service'
import { PaymentController } from './payment.controller'

@Global()
@Module({
  controllers: [PaymentController],
  providers: [WxPayService],
  exports: [WxPayService],
})
export class PaymentModule {}
