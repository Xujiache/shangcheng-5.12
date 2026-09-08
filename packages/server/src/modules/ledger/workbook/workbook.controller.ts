import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { IsObject } from 'class-validator'
import { Response } from 'express'
import { Public } from '../../../common/decorators/public.decorator'
import { SkipResponseWrap } from '../../../common/decorators/skip-response.decorator'
import { LedgerJwtGuard } from '../guards/ledger-jwt.guard'
import { LedgerMembershipGuard } from '../guards/ledger-membership.guard'
import { CurrentLedgerUser, LedgerAuthUser } from '../decorators/current-ledger-user.decorator'
import { WorkbookService } from './workbook.service'
import { Operation } from './domain'
class SyncDto {
  @IsObject() operation!: Operation
}
@Public()
@UseGuards(LedgerJwtGuard)
@Controller('l/workbook')
export class WorkbookController {
  constructor(private readonly svc: WorkbookService) {}
  @Get('access') access(@CurrentLedgerUser() u: LedgerAuthUser) {
    return { canRead: true, canWrite: !!u.membership?.active }
  }
  @Get('snapshot') snapshot(@CurrentLedgerUser() u: LedgerAuthUser) {
    return this.svc.snapshot(u.id)
  }
  @Get('changes') changes(
    @CurrentLedgerUser() u: LedgerAuthUser,
    @Query('cursor') cursor?: string,
  ) {
    return this.svc.changes(u.id, Math.max(0, Math.min(2147483647, Number(cursor) || 0)))
  }
  @Post('sync')
  @HttpCode(200)
  @UseGuards(LedgerMembershipGuard)
  sync(@CurrentLedgerUser() u: LedgerAuthUser, @Body() dto: SyncDto) {
    return this.svc.sync(u.id, dto.operation)
  }
  @Post('attachments/:id')
  @HttpCode(200)
  @UseGuards(LedgerMembershipGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  upload(
    @CurrentLedgerUser() u: LedgerAuthUser,
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    return this.svc.upload(u.id, id, file)
  }
  @Get('attachments/:id')
  @SkipResponseWrap()
  async download(
    @CurrentLedgerUser() u: LedgerAuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const a = await this.svc.attachment(u.id, id)
    res.setHeader('Content-Type', a.mime)
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Disposition', 'attachment; filename="proof"')
    res.status(200).send(Buffer.from(a.content))
  }
}
