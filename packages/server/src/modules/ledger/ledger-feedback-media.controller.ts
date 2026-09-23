import { Controller, Get, Param, Query, Res } from '@nestjs/common'
import type { Response } from 'express'
import { Throttle } from '@nestjs/throttler'
import { Public } from '../../common/decorators/public.decorator'
import { SkipResponseWrap } from '../../common/decorators/skip-response.decorator'
import { FilesService } from '../files/files.service'

/** 签名 URL 由本人上传或已鉴权后台列表签发；有效期 1 小时。 */
@Public()
@Controller('l/feedback-media')
export class LedgerFeedbackMediaController {
  constructor(private readonly files: FilesService) {}

  @Get('view/:id')
  @SkipResponseWrap()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  async view(
    @Param('id') id: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ) {
    const { stream, mimeType, size } = await this.files.openPrivateFeedback(
      id,
      exp || '',
      sig || '',
    )
    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Length', size)
    res.setHeader('Cache-Control', 'private, no-store')
    stream.on('error', () => res.destroy())
    stream.pipe(res)
  }
}
