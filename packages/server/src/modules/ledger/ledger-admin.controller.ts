import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { LedgerAdminService } from './ledger-admin.service'
import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator'
import { CreateLedgerUserDto, GrantMembershipDto, UpdateLedgerUserDto } from './dto/admin.dto'

/**
 * 门窗利账 · 后台管理（/api/v1/p/ledger/*）。
 * 走商城全局 JwtAuthGuard + RolesGuard，仅 platform/super-admin 可访问。
 * 管理记账账号与会员时长（你在 admin-pc 后台用）。
 */
@ApiTags('门窗利账-后台')
@UseGuards(RolesGuard)
@Roles('platform', 'super-admin')
@Controller('p/ledger')
export class LedgerAdminController {
  constructor(private readonly admin: LedgerAdminService) {}

  @Get('users')
  listUsers(@Query() q: any) {
    return this.admin.listUsers(q)
  }

  @Post('users')
  createUser(@Body() dto: CreateLedgerUserDto, @CurrentUser() op: AuthUser) {
    return this.admin.createUser(dto, op?.sub)
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateLedgerUserDto) {
    return this.admin.updateUser(id, dto)
  }

  @Post('users/:id/reset-password')
  resetPassword(@Param('id') id: string) {
    return this.admin.resetPassword(id)
  }

  @Post('users/:id/membership/grant')
  grant(@Param('id') id: string, @Body() dto: GrantMembershipDto, @CurrentUser() op: AuthUser) {
    return this.admin.grantMembership(id, dto, op?.sub)
  }

  @Get('users/:id/membership/logs')
  logs(@Param('id') id: string) {
    return this.admin.membershipLogs(id)
  }
}
