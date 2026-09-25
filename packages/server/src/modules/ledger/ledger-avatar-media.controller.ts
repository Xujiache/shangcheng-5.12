import { Controller, Get, Param, Res } from '@nestjs/common'
import type { Response } from 'express'
import { Throttle } from '@nestjs/throttler'
import { Public } from '../../common/decorators/public.decorator'
import { SkipResponseWrap } from '../../common/decorators/skip-response.decorator'
import { FilesService } from '../files/files.service'
import { IMMUTABLE_CACHE_CONTROL } from '../files/image-thumbnail.util'

@Public()
@Controller('l/avatar-image')
export class LedgerAvatarMediaController {
  constructor(private readonly files: FilesService) {}

  @Get(':id')
  @SkipResponseWrap()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  async view(@Param('id') id: string, @Res() res: Response) {
    const { stream, mimeType, size } = await this.files.openLedgerAvatar(id)
    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Length', size)
    res.setHeader('Cache-Control', IMMUTABLE_CACHE_CONTROL)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    stream.on('error', () => res.destroy())
    stream.pipe(res)
  }
}
