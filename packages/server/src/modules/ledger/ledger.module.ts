import { Module } from '@nestjs/common'
import { FilesModule } from '../files/files.module'
import { LedgerAuthService } from './ledger-auth.service'
import { LedgerService } from './ledger.service'
import { LedgerAdminService } from './ledger-admin.service'
import { LedgerAiService } from './ledger-ai.service'
import { LedgerExtraService } from './ledger-extra.service'
import { LedgerAuthController } from './ledger-auth.controller'
import { LedgerController } from './ledger.controller'
import { LedgerBizController } from './ledger-biz.controller'
import { LedgerAdminController } from './ledger-admin.controller'
import { LedgerJwtGuard } from './guards/ledger-jwt.guard'
import { LedgerMembershipGuard } from './guards/ledger-membership.guard'

/**
 * 门窗利账（ledger）模块 —— 记账小程序后端域，与商城零耦合。
 * 依赖项全部走全局：PrismaModule / JwtModule(global) / SmsModule(@Global)，无需 imports。
 */
@Module({
  imports: [FilesModule],
  controllers: [LedgerAuthController, LedgerController, LedgerBizController, LedgerAdminController],
  providers: [
    LedgerAuthService,
    LedgerService,
    LedgerAdminService,
    LedgerAiService,
    LedgerExtraService,
    LedgerJwtGuard,
    LedgerMembershipGuard,
  ],
})
export class LedgerModule {}
