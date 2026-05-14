import { Module } from '@nestjs/common'
import { MerchantController } from './merchant.controller'
import { MerchantService } from './merchant.service'
import { OrderShareService } from './order-share.service'
import { ChatModule } from '../chat/chat.module'

/**
 * MerchantModule 不需要显式导入 PaymentModule —— PaymentModule 是 @Global，
 * WxPayService 已经全局可注入。导入会触发循环依赖。
 *
 * 引入 ChatModule：MerchantService.ship/agreeRefund/rejectRefund 等动作需要通过
 * ChatGateway 给商家端房间推送 order:update/refund:update 事件。
 * ChatModule 只依赖 JwtModule + PrismaService，不存在循环依赖。
 */
@Module({
  imports: [ChatModule],
  controllers: [MerchantController],
  providers: [MerchantService, OrderShareService],
  // OrderShareService 也 export 给 UserMpModule 的 @Public 公开访问路由使用
  exports: [MerchantService, OrderShareService],
})
export class MerchantModule {}
