import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiConsumes, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { Public } from '../../common/decorators/public.decorator'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import { LedgerService } from './ledger.service'
import { FilesService } from '../files/files.service'
import { LedgerExtraService } from './ledger-extra.service'
import { LedgerJwtGuard } from './guards/ledger-jwt.guard'
import { CurrentLedgerUser, LedgerAuthUser } from './decorators/current-ledger-user.decorator'
import {
  CreateLedgerFeedbackDto,
  UpdateLedgerProfileDto,
  UpdateLedgerSettingDto,
  ExportDataDto,
  ImportDataDto,
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
  constructor(
    private readonly svc: LedgerService,
    private readonly files: FilesService,
    private readonly extra: LedgerExtraService,
  ) {}

  @Get('me')
  me(@CurrentLedgerUser() user: LedgerAuthUser) {
    return this.svc.me(user.id)
  }

  /** 上传头像图片到对象存储，返回公网 URL 并持久化到账号（多端同步）。 */
  @Post('avatar')
  @ApiConsumes('multipart/form-data')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@CurrentLedgerUser() user: LedgerAuthUser, @UploadedFile() file: any) {
    if (!file) throw new BizException(BizCode.INVALID_PARAMS, '请选择图片')
    const { url } = await this.files.upload(file, 'avatar', user.id)
    await this.svc.updateProfile(user.id, { avatar: url } as UpdateLedgerProfileDto)
    return { url }
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
  /** 反馈附图上传（多端通用，复用对象存储），返回公网 URL。 */
  @Post('feedback-media')
  @ApiConsumes('multipart/form-data')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFeedbackMedia(@CurrentLedgerUser() user: LedgerAuthUser, @UploadedFile() file: any) {
    if (!file) throw new BizException(BizCode.INVALID_PARAMS, '请选择图片')
    const { url } = await this.files.upload(file, 'feedback', user.id)
    return { url }
  }

  @Post('feedback')
  feedback(@CurrentLedgerUser() u: LedgerAuthUser, @Body() dto: CreateLedgerFeedbackDto) {
    return this.svc.createFeedback(u.id, dto)
  }

  // ── 首页广告（#2）：取启用中的轮播 ──
  @Get('ads')
  ads() {
    return this.svc.listAds()
  }

  // ── 优化下料闸门（#9）：试用 / 会员校验 ──
  @Get('cut/access')
  cutAccess(@CurrentLedgerUser() u: LedgerAuthUser) {
    return this.svc.cutAccess(u.id)
  }

  // ── 邀请（#10）：邀请码 + 已邀人数 + 奖励天数 ──
  @Get('invite')
  invite(@CurrentLedgerUser() u: LedgerAuthUser) {
    return this.svc.getInvite(u.id)
  }

  // ── 更新日志（按版本定向：客户端拉自己版本那条做首开弹窗）──
  @Get('changelogs')
  changelogs() {
    return this.extra.changelogList()
  }
  @Get('changelog')
  changelog(@Query('version') version: string) {
    return this.extra.changelogByVersion(version)
  }

  // ── 数据导出 / 导入（加密数据包）──
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('data/export')
  exportData(@CurrentLedgerUser() u: LedgerAuthUser, @Body() dto: ExportDataDto) {
    return this.extra.exportData(u.id, dto.allowShare === true)
  }
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('data/import')
  importData(@CurrentLedgerUser() u: LedgerAuthUser, @Body() dto: ImportDataDto) {
    return this.extra.importData(u.id, dto.pkg)
  }
}
