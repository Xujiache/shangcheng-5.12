import { Body, Controller, Get, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import {
  AdminLoginDto,
  PhoneLoginDto,
  RefreshDto,
  SmsCodeDto,
  WechatLoginDto,
} from './dto/login.dto'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator'

/**
 * 注销请求体：可选 refreshToken。
 * - 若客户端持有未过期的 refreshToken，强烈建议带上以触发真正的吊销。
 * - 未带 refreshToken 时仍允许调用（兼容旧客户端），但只能清服务器内 user 缓存，
 *   旧 refreshToken 在过期前仍可用（前端务必清掉本地存储）。
 */
class LogoutDto {
  refreshToken?: string
}

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

  /**
   * 注销登录
   *
   * 真正的吊销逻辑（修复前是空 stub，token 仍可用，存在重大安全风险）：
   *   1. 若 body.refreshToken 解析出 jti → 加入 refresh-token-blacklist，
   *      剩余 TTL = refresh token 距离过期还有多少秒
   *   2. 清掉 JwtGuard 内的 user LRU 缓存，让该用户的 access token 下次访问立即重查 DB
   *      （如果管理员同时把用户禁用，能即时拦截）
   *
   * 注意 access token 本身无法主动作废（JWT 无状态），客户端必须在收到 {ok:true}
   * 后立刻删除本地 access token / refresh token。
   */
  @Post('logout')
  logout(@Body() dto: LogoutDto, @CurrentUser() user: AuthUser) {
    return this.authService.logout(dto?.refreshToken, user?.sub)
  }

  @Get('user-info')
  userInfo(@CurrentUser() user: AuthUser) {
    return this.authService.userInfo(user.sub)
  }

  /**
   * 动态菜单接口
   *
   * 当前架构说明：
   *   - admin-pc 客户端走「前端静态路由 + MenuProcessor 按角色过滤」的方案
   *     （`packages/admin-pc/src/router/modules/*.ts` + 前端 menu 模块）；
   *   - 后端这里返回 `[]` 作为兜底，让前端调用不报 404；
   *   - 不是真的"无菜单"，而是「菜单是客户端静态资源 + roles[] 过滤」的结果。
   *
   * 后续若改为后端下发动态菜单（DB 持久化菜单树）：
   *   1. 新增 Menu 模型 / SystemConfig 'menus' 配置；
   *   2. 在 service 按 callerRole 过滤可见树；
   *   3. 返回 [{ path, name, icon, children: [...] }] 结构。
   *
   * 此前注释里只写了"兜底"，没说清这是有意设计还是 TODO，容易让前端误以为该接口缺实现，
   * 因此此处补充清楚两端的边界。
   */
  @Get('menus')
  menus() {
    return []
  }
}
