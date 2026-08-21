import { Body, Controller, Get, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { Public } from '../../common/decorators/public.decorator'
import { LedgerAuthService } from './ledger-auth.service'
import { WechatLoginDto } from './dto/auth.dto'

/** 门窗利账 App · 鉴权（/api/v1/l/auth/*）。整体 @Public 跳过商城全局守卫。 */
@ApiTags('门窗利账-鉴权')
@Public()
@Controller('l/auth')
export class LedgerAuthController {
  constructor(private readonly auth: LedgerAuthService) {}

  // 公开配置：登录前加载品牌 LOGO。
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('config')
  config() {
    return this.auth.getPublicConfig()
  }

  // 唯一登录入口：首次登录按 openid 自动建号，后续复用同一微信账号。
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('wechat-login')
  wechatLogin(@Body() dto: WechatLoginDto) {
    return this.auth.wechatLogin(dto)
  }
}
