import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Public } from '../../common/decorators/public.decorator'
import { LedgerService } from './ledger.service'
import { LedgerJwtGuard } from './guards/ledger-jwt.guard'
import { CurrentLedgerUser, LedgerAuthUser } from './decorators/current-ledger-user.decorator'
import {
  CreateLedgerFeedbackDto,
  UpdateLedgerProfileDto,
  UpdateLedgerSettingDto,
} from './dto/misc.dto'

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

  // ── 消息中心 ──
  @Get('notifications')
  notifications(@CurrentLedgerUser() u: LedgerAuthUser) {
    return this.svc.listNotifications(u.id)
  }
  @Get('notifications/unread-count')
  unreadCount(@CurrentLedgerUser() u: LedgerAuthUser) {
    return this.svc.unreadCount(u.id)
  }
  @Post('notifications/read-all')
  readAll(@CurrentLedgerUser() u: LedgerAuthUser) {
    return this.svc.markAllNotificationsRead(u.id)
  }
  @Post('notifications/:id/read')
  readOne(@CurrentLedgerUser() u: LedgerAuthUser, @Param('id') id: string) {
    return this.svc.markNotificationRead(u.id, id)
  }

  // ── 偏好设置 ──
  @Get('settings')
  getSettings(@CurrentLedgerUser() u: LedgerAuthUser) {
    return this.svc.getSettings(u.id)
  }
  @Put('settings')
  updateSettings(@CurrentLedgerUser() u: LedgerAuthUser, @Body() dto: UpdateLedgerSettingDto) {
    return this.svc.updateSettings(u.id, dto)
  }

  // ── 意见反馈 ──
  @Post('feedback')
  feedback(@CurrentLedgerUser() u: LedgerAuthUser, @Body() dto: CreateLedgerFeedbackDto) {
    return this.svc.createFeedback(u.id, dto)
  }
}
