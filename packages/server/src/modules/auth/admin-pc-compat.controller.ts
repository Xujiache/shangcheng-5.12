import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { SkipThrottle } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { AdminLoginDto } from './dto/login.dto'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import { PlatformService } from '../platform/platform.service'

/**
 * admin-pc 旧路径兼容层（不含 /api/v1 前缀的全局映射在 main.ts 里做）
 * 这里挂在 /api/v1 下，但 admin-pc 的 service 中部分还在用旧路径。
 * 为保证零改前端：
 *   - /api/auth/login → /api/v1/admin-pc/login（实际路径，main 里加路由别名）
 *   - /api/user/info → /api/v1/admin-pc/user-info
 *   - /api/user/list → /api/v1/admin-pc/users
 *   - /api/role/list → /api/v1/admin-pc/roles
 *   - /api/v3/system/menus → /api/v1/admin-pc/menus
 * main.ts 中再 setGlobalPrefix 例外，让旧路径无 prefix 也能命中
 *
 * 权限：类级别挂 RolesGuard；@Roles 在方法级精细控制
 *   - login 用 @Public 跳过 JWT
 *   - user-info / menus 不限角色（任意已登录账号都能取自己的信息 / 菜单）
 *   - users / roles 列表必须是 platform / super-admin（与 PlatformController 一致），
 *     避免普通商家拿到全部管理员清单
 */
@ApiTags('admin-pc 兼容')
@UseGuards(RolesGuard)
@Controller('admin-pc')
export class AdminPcCompatController {
  constructor(
    private readonly authService: AuthService,
    private readonly platformService: PlatformService,
  ) {}

  @Public()
  @Post('login')
  login(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto)
  }

  // 兼容路径上的 user-info：admin-pc 启动并发查会撞 sms 桶；跳过严桶仅走 default
  @SkipThrottle({ auth: true, sms: true, 'payment-notify': true })
  @Get('user-info')
  userInfo(@CurrentUser() user: AuthUser) {
    return this.authService.userInfo(user.sub)
  }

  /**
   * admin-pc 旧版用户列表（路径：/api/admin-pc/users）
   *
   * 委托 PlatformService.admins 完成查询和分页，避免该 controller 直连 Prisma 散漏鉴权
   * 与分页规则；输出再适配 admin-pc 旧字段名 records / current / size / userId / userName。
   */
  @Roles('platform', 'super-admin')
  @Get('users')
  async users(
    @Query('current') current = '1',
    @Query('size') size = '20',
    @Query('keyword') keyword?: string,
  ) {
    const page = Math.max(1, Number(current) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(size) || 20))
    const data = await this.platformService.admins({ page, pageSize, keyword })
    return {
      records: data.list.map((u) => ({
        userId: u.id,
        userName: u.username,
        nickName: u.nickname,
        email: u.email,
        avatar: u.avatar,
        status: u.status,
        roles: [u.role],
        roleName: u.roleName,
        lastLoginAt: u.lastLoginAt,
      })),
      total: data.total,
      current: data.page,
      size: data.pageSize,
    }
  }

  /**
   * admin-pc 旧版角色列表（路径：/api/admin-pc/roles）
   *
   * 委托 PlatformService.roles 拉数据，对外仍返回 admin-pc 旧字段（roleId/roleCode/roleName...）。
   */
  @Roles('platform', 'super-admin')
  @Get('roles')
  async roles(
    @Query('current') current = '1',
    @Query('size') size = '50',
    @Query('keyword') keyword?: string,
  ) {
    const page = Math.max(1, Number(current) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(size) || 50))
    const data = await this.platformService.roles({ page, pageSize, keyword })
    return {
      records: data.list.map((r: any) => ({
        roleId: r.id,
        roleCode: r.code,
        roleName: r.name,
        description: r.description,
        permissions: r.permissions,
        isSystem: r.isSystem,
        memberCount: r.memberCount,
      })),
      total: data.total,
      current: data.page,
      size: data.pageSize,
    }
  }

  @Get('menus')
  async menus(@CurrentUser() user: AuthUser) {
    // 这是给 admin-pc 的动态菜单接口。考虑到 admin-pc 当前 router/modules 已经定义了完整菜单
    // 这里返回空数组，让前端走静态菜单 + MenuProcessor 角色过滤
    // 真正的角色权限菜单未来按需扩展
    return []
  }
}
