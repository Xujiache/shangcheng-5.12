import { Body, Controller, Get, HttpStatus, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
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
import { BizCode, BizException } from '../../common/exceptions/biz.exception'

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

  // P1-25：登录类接口走 'auth' 桶（10/min/IP），防爆破
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('wechat-login')
  wechatLogin(@Body() dto: WechatLoginDto) {
    return this.authService.wechatLogin(dto)
  }

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('phone-login')
  phoneLogin(@Body() dto: PhoneLoginDto) {
    return this.authService.phoneLogin(dto)
  }

  // P1-25：发短信验证码走 'sms' 桶（3/min/IP），防短信轰炸
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('sms-code')
  sendSmsCode(@Body() dto: SmsCodeDto) {
    return this.authService.sendSmsCode(dto)
  }

  // P1-25：后台登录走 'auth' 桶（10/min/IP），防字典攻击
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('admin-login')
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto)
  }

  // P1-25：refresh 走 'auth' 桶（同登录），防 token 频繁刷
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
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
  // logout / user-info 不是爆破目标，跳过严格桶（auth/sms/payment-notify），只走 default(60/60s)
  // 否则 admin-pc 启动时并发拉 user-info > 3 次就被 sms 桶误杀
  // @Public：登出必须在 access token 已过期时也能成功（否则 guard 先抛 TOKEN_EXPIRED，
  // refresh token 永远无法被吊销）。callerSub 由 service 从 refreshToken 解析兜底。
  @Public()
  @Post('logout')
  logout(@Body() dto: LogoutDto, @CurrentUser() user: AuthUser) {
    return this.authService.logout(dto?.refreshToken, user?.sub)
  }

  @Get('user-info')
  userInfo(@CurrentUser() user: AuthUser) {
    return this.authService.userInfo(user.sub)
  }

  /**
   * 修改密码（任意已登录用户调）
   * body: { oldPassword, newPassword }
   * 新密码 ≥ 6 位；旧密码必须正确（未设过密码的纯微信用户可省略 oldPassword）
   */
  @Post('change-password')
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: { oldPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(user.sub, dto)
  }

  /**
   * 修改手机号（双码：原手机 + 新手机，分别发 /auth/sms-code 拿到）
   * body: { oldSmsCode?, newPhone, newSmsCode }
   * 当前账号没有手机号时（如微信登录用户首次绑），可省 oldSmsCode
   */
  @Post('change-phone')
  changePhone(
    @CurrentUser() user: AuthUser,
    @Body() dto: { oldSmsCode?: string; newPhone: string; newSmsCode: string },
  ) {
    return this.authService.changePhone(user.sub, dto)
  }

  /**
   * 动态菜单接口（修复 P1-23）
   *
   * 当前架构说明（重要！）：
   *   - admin-pc 客户端走「前端静态路由 + MenuProcessor 按角色过滤」的方案
   *     （`packages/admin-pc/src/router/modules/*.ts` + 前端 menu 模块）；
   *   - 后端没有 RoleMenu 模型，也没有 SystemConfig.menus 存储；
   *   - 因此当前不存在「后端可下发的动态菜单源」。
   *
   * 之前实现返回 `[]` 装作正常，会让前端误以为"配置成功只是没数据"，
   * 难以发现"后端根本没实现菜单"的真实情况（审查中被列为 P1-23）。
   *
   * 修复策略：
   *   1. 显式抛 501 Not Implemented + BizCode.BUSINESS_ERROR；
   *   2. 前端拦截器需识别 501 并 fallback 到静态路由（admin-pc 已有 MenuProcessor）；
   *   3. 后续若上线后端动态菜单：
   *      - 新增 Menu 模型 / SystemConfig 'menus' 配置；
   *      - 在 service 按 callerRole 过滤可见树；
   *      - 返回 [{ path, name, icon, children: [...] }] 结构。
   */
  @Get('menus')
  menus() {
    throw new BizException(
      BizCode.BUSINESS_ERROR,
      '动态菜单接口未实现：当前 admin-pc 走前端静态路由 + 角色过滤方案',
      HttpStatus.NOT_IMPLEMENTED,
    )
  }
}
