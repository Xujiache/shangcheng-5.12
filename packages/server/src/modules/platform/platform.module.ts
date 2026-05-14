import { Module, forwardRef } from '@nestjs/common'
import { PlatformController } from './platform.controller'
import { PlatformService } from './platform.service'
import { MerchantModule } from '../merchant/merchant.module'

@Module({
  // forwardRef 防 MerchantModule ↔ PlatformModule 潜在循环依赖（即使当前没有，
  // 也提前包一层，后续 Merchant 端如果反向依赖 Platform 不至于一上来就崩）
  imports: [forwardRef(() => MerchantModule)],
  controllers: [PlatformController],
  providers: [PlatformService],
  // 导出 PlatformService 让 admin-pc-compat 委托查询，避免在该 controller 直连 Prisma
  exports: [PlatformService],
})
export class PlatformModule {}
