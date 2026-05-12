import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { AdminLoginDto } from './dto/login.dto'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator'
import { PrismaService } from '../../prisma/prisma.service'
import { Roles } from '../../common/decorators/roles.decorator'

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
 */
@ApiTags('admin-pc 兼容')
@Controller('admin-pc')
export class AdminPcCompatController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('login')
  login(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto)
  }

  @Get('user-info')
  userInfo(@CurrentUser() user: AuthUser) {
    return this.authService.userInfo(user.sub)
  }

  @Roles('platform', 'super-admin')
  @Get('users')
  async users(@Query('current') current = '1', @Query('size') size = '20', @Query('keyword') keyword?: string) {
    const page = Math.max(1, Number(current) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(size) || 20))
    const where: any = { role: { in: ['admin', 'platform', 'super-admin'] } }
    if (keyword) where.OR = [{ username: { contains: keyword } }, { nickname: { contains: keyword } }, { email: { contains: keyword } }]
    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { adminRole: true },
      }),
      this.prisma.user.count({ where }),
    ])
    return {
      records: list.map((u) => ({
        userId: u.id,
        userName: u.username,
        nickName: u.nickname,
        email: u.email,
        avatar: u.avatar,
        status: u.status,
        roles: [u.role],
        roleName: u.adminRole?.name,
        lastLoginAt: u.lastLoginAt,
      })),
      total,
      current: page,
      size: pageSize,
    }
  }

  @Roles('platform', 'super-admin')
  @Get('roles')
  async roles() {
    const list = await this.prisma.adminRole.findMany({ orderBy: { createdAt: 'asc' } })
    return {
      records: list.map((r) => ({
        roleId: r.id,
        roleCode: r.code,
        roleName: r.name,
        description: r.description,
        permissions: r.permissions,
        isSystem: r.isSystem,
        memberCount: r.memberCount,
      })),
      total: list.length,
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
