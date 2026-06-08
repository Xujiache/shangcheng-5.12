import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { LedgerAdminService } from './ledger-admin.service'
import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator'
import {
  CreateLedgerAdDto,
  CreateLedgerUserDto,
  GrantMembershipDto,
  PushNotificationDto,
  UpdateLedgerAdDto,
  UpdateLedgerConfigDto,
  UpdateLedgerFeedbackDto,
  UpdateLedgerUserDto,
} from './dto/admin.dto'

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

  // ── 推送通知 ──
  @Post('users/:id/notify')
  notify(@Param('id') id: string, @Body() dto: PushNotificationDto) {
    return this.admin.pushNotification(id, dto)
  }

  // ── 意见反馈 ──
  @Get('feedback')
  listFeedback(@Query() q: any) {
    return this.admin.listFeedback(q)
  }

  @Patch('feedback/:id')
  updateFeedback(@Param('id') id: string, @Body() dto: UpdateLedgerFeedbackDto) {
    return this.admin.updateFeedback(id, dto)
  }

  // ── 首页广告（#2）──
  @Get('ads')
  listAds() {
    return this.admin.listAds()
  }

  @Post('ads')
  createAd(@Body() dto: CreateLedgerAdDto) {
    return this.admin.createAd(dto)
  }

  @Patch('ads/:id')
  updateAd(@Param('id') id: string, @Body() dto: UpdateLedgerAdDto) {
    return this.admin.updateAd(id, dto)
  }

  @Delete('ads/:id')
  deleteAd(@Param('id') id: string) {
    return this.admin.deleteAd(id)
  }

  // ── 功能配置（#9 优化下料 / #10 邀请）──
  @Get('config')
  getConfig() {
    return this.admin.getConfig()
  }

  @Put('config')
  updateConfig(@Body() dto: UpdateLedgerConfigDto) {
    return this.admin.updateConfig(dto)
  }

  // ── 邀请统计（#10）──
  @Get('invite-stats')
  inviteStats() {
    return this.admin.inviteStats()
  }
}
