/**
 * 法律协议 · Controller
 *
 * 公开读取 GET /api/v1/u/agreements（小程序/H5/三端登录页弹窗用）
 * 管理员读写 GET/PUT /api/v1/p/legal/agreements
 */
import { Body, Controller, Get, Put } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Public } from '../../common/decorators/public.decorator'
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
