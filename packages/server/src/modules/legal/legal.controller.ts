/**
 * 法律协议 · Controller
 *
 * 公开读取 GET /api/v1/u/agreements（小程序/H5/三端登录页弹窗用）
 * 管理员读写 GET/PUT /api/v1/p/legal/agreements
 *
 * 安全：LegalAdminController 必须强制角色校验，否则任意已登录账号都能
 * 改隐私政策/用户协议正文（直接的合规与品牌风险）。
 */
import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Public } from '../../common/decorators/public.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import { LegalService } from './legal.service'

@ApiTags('协议 · 公开')
@Controller('u')
export class LegalPublicController {
  constructor(private readonly svc: LegalService) {}

  /** 三端登录页 / 设置页弹窗读取 */
  @Public()
  @Get('agreements')
  list() {
    return this.svc.list()
  }
}

@ApiTags('协议 · 平台')
@UseGuards(RolesGuard)
@Roles('admin', 'platform', 'super-admin')
@Controller('p/legal')
export class LegalAdminController {
  constructor(private readonly svc: LegalService) {}

  @Get('agreements')
  read() {
    return this.svc.list()
  }

  @Put('agreements')
  write(@Body() dto: any) {
    return this.svc.save(dto)
  }
}
