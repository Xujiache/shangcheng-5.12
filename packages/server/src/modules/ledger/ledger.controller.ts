import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Public } from '../../common/decorators/public.decorator'
import { LedgerService } from './ledger.service'
import { LedgerJwtGuard } from './guards/ledger-jwt.guard'
import { CurrentLedgerUser, LedgerAuthUser } from './decorators/current-ledger-user.decorator'
import { UpdateLedgerProfileDto } from './dto/misc.dto'

/**
 * 门窗利账 App · 账户与会员（/api/v1/l/*，仅需登录，不需会员有效）。
 * me / membership / profile 在闸门期也要可用（否则会员页拿不到状态）。
 */
@ApiTags('门窗利账-账户')
@Public()
@UseGuards(LedgerJwtGuard)
@Controller('l')
export class LedgerController {
  constructor(private readonly svc: LedgerService) {}

  @Get('me')
  me(@CurrentLedgerUser() user: LedgerAuthUser) {
    return this.svc.me(user.id)
  }

  @Get('membership')
  membership(@CurrentLedgerUser() user: LedgerAuthUser) {
    return this.svc.membership(user.id)
  }

  @Patch('profile')
  updateProfile(@CurrentLedgerUser() user: LedgerAuthUser, @Body() dto: UpdateLedgerProfileDto) {
    return this.svc.updateProfile(user.id, dto)
  }
}
