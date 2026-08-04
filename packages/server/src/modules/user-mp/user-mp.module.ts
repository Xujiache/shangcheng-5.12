import { Module } from '@nestjs/common'
import { UserMpController } from './user-mp.controller'
import { UserMpService } from './user-mp.service'
import { ChatModule } from '../chat/chat.module'
import { MerchantModule } from '../merchant/merchant.module'

/**
 * 引入 MerchantModule:UserMpController 的 @Public 公开订单分享路由
 * (`GET /u/share/orders/:code`) 需要 OrderShareService。
 * MerchantModule 已 export OrderShareService,无循环依赖风险。
 */
@Module({
  imports: [ChatModule, MerchantModule],
  controllers: [UserMpController],
  providers: [UserMpService],
})
export class UserMpModule {}
