import { Body, Controller, Get, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { AdminLoginDto, PhoneLoginDto, RefreshDto, SmsCodeDto, WechatLoginDto } from './dto/login.dto'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator'

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('wechat-login')
  wechatLogin(@Body() dto: WechatLoginDto) {
    return this.authService.wechatLogin(dto)
  }

  @Public()
  @Post('phone-login')
  phoneLogin(@Body() dto: PhoneLoginDto) {
    return this.authService.phoneLogin(dto)
  }

  @Public()
  @Post('sms-code')
  sendSmsCode(@Body() dto: SmsCodeDto) {
    return this.authService.sendSmsCode(dto)
  }

  @Public()
  @Post('admin-login')
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto)
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto)
  }

  @Post('logout')
  logout() {
    return { ok: true }
  }

  @Get('user-info')
  userInfo(@CurrentUser() user: AuthUser) {
    return this.authService.userInfo(user.sub)
  }

  /** 动态菜单接口（admin-pc 当前走前端静态菜单 + MenuProcessor 角色过滤，这里返回空数组兜底） */
  @Get('menus')
  menus() {
    return []
  }
}
