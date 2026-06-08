import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { Public } from '../../common/decorators/public.decorator'
import { LedgerAuthService } from './ledger-auth.service'
import { LedgerJwtGuard } from './guards/ledger-jwt.guard'
import { CurrentLedgerUser, LedgerAuthUser } from './decorators/current-ledger-user.decorator'
import {
  LedgerLoginDto,
  LedgerSmsCodeDto,
  LedgerSmsLoginDto,
  LedgerChangePasswordDto,
  WechatLoginDto,
  WechatBindDto,
  WechatUnbindDto,
} from './dto/auth.dto'

/** 门窗利账 App · 鉴权（/api/v1/l/auth/*）。整体 @Public 跳过商城全局守卫。 */
@ApiTags('门窗利账-鉴权')
@Public()
@Controller('l/auth')
export class LedgerAuthController {
  constructor(private readonly auth: LedgerAuthService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LedgerLoginDto) {
    return this.auth.login(dto)
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('sms-code')
  smsCode(@Body() dto: LedgerSmsCodeDto) {
    return this.auth.sendSmsCode(dto)
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('sms-login')
  smsLogin(@Body() dto: LedgerSmsLoginDto) {
    return this.auth.smsLogin(dto)
  }

  // 已登录账号改密：本方法需 ledger 鉴权（类级 @Public 仅跳过商城全局守卫）
  @UseGuards(LedgerJwtGuard)
  @Post('change-password')
  changePassword(@CurrentLedgerUser() user: LedgerAuthUser, @Body() dto: LedgerChangePasswordDto) {
    return this.auth.changePassword(user.id, dto)
  }

  // ── 微信一键登录（openid 须已绑定）──
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('wechat-login')
  wechatLogin(@Body() dto: WechatLoginDto) {
    return this.auth.wechatLogin(dto)
  }

  // ── 绑定 / 解绑微信（需 ledger 登录 + 密码确认）──
  @UseGuards(LedgerJwtGuard)
  @Post('wechat/bind')
  bindWechat(@CurrentLedgerUser() user: LedgerAuthUser, @Body() dto: WechatBindDto) {
    return this.auth.bindWechat(user.id, dto)
  }

  @UseGuards(LedgerJwtGuard)
  @Post('wechat/unbind')
  unbindWechat(@CurrentLedgerUser() user: LedgerAuthUser, @Body() dto: WechatUnbindDto) {
    return this.auth.unbindWechat(user.id, dto)
  }
}
