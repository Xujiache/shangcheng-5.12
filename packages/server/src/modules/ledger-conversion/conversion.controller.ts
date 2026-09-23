import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiConsumes, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { Response } from 'express'
import { Public } from '../../common/decorators/public.decorator'
import { SkipResponseWrap } from '../../common/decorators/skip-response.decorator'
import {
  CurrentLedgerUser,
  LedgerAuthUser,
} from '../ledger/decorators/current-ledger-user.decorator'
import { LedgerJwtGuard } from '../ledger/guards/ledger-jwt.guard'
import { CONVERSION_CHUNK_BYTES } from './conversion.operations'
import { ConversionService } from './conversion.service'

@ApiTags('门窗利账-格式转换')
@Public()
@UseGuards(LedgerJwtGuard)
@Controller('l/conversions')
export class ConversionController {
  constructor(private readonly service: ConversionService) {}

  @Get('capabilities')
  capabilities() {
    return this.service.capabilities()
  }

  @Post('uploads')
  startUpload(
    @CurrentLedgerUser() user: LedgerAuthUser,
    @Body() body: { fileName: string; sizeBytes: number },
  ) {
    return this.service.startUpload(user.id, body?.fileName, body?.sizeBytes)
  }

  @Get('uploads/:id')
  uploadStatus(@CurrentLedgerUser() user: LedgerAuthUser, @Param('id') id: string) {
    return this.service.uploadStatus(user.id, id)
  }

  @Post('uploads/:id/chunks')
  @ApiConsumes('multipart/form-data')
  @Throttle({ default: { limit: 180, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: CONVERSION_CHUNK_BYTES } }))
  putChunk(
    @CurrentLedgerUser() user: LedgerAuthUser,
    @Param('id') id: string,
    @Body('index') index: string,
    @UploadedFile() file: { buffer: Buffer; size: number },
  ) {
    return this.service.putChunk(user.id, id, index, file)
  }

  @Post('uploads/:id/complete')
  completeUpload(@CurrentLedgerUser() user: LedgerAuthUser, @Param('id') id: string) {
    return this.service.completeUpload(user.id, id)
  }

  @Post('jobs')
  createJob(
    @CurrentLedgerUser() user: LedgerAuthUser,
    @Body() body: { operationId: string; uploadIds: string[]; options?: Record<string, unknown> },
  ) {
    return this.service.createJob(user.id, body)
  }

  @Get('jobs')
  listJobs(@CurrentLedgerUser() user: LedgerAuthUser, @Query('skip') skip: string) {
    return this.service.listJobs(user.id, skip)
  }

  @Get('jobs/:id')
  getJob(@CurrentLedgerUser() user: LedgerAuthUser, @Param('id') id: string) {
    return this.service.getJob(user.id, id)
  }

  @Post('jobs/:id/cancel')
  cancelJob(@CurrentLedgerUser() user: LedgerAuthUser, @Param('id') id: string) {
    return this.service.cancelJob(user.id, id)
  }

  @Post('jobs/:id/retry')
  retryJob(@CurrentLedgerUser() user: LedgerAuthUser, @Param('id') id: string) {
    return this.service.retryJob(user.id, id)
  }

  @Delete('jobs/:id')
  deleteJob(@CurrentLedgerUser() user: LedgerAuthUser, @Param('id') id: string) {
    return this.service.deleteJob(user.id, id)
  }

  @Get('jobs/:id/assets/:assetId')
  @SkipResponseWrap()
  async download(
    @CurrentLedgerUser() user: LedgerAuthUser,
    @Param('id') id: string,
    @Param('assetId') assetId: string,
    @Res() response: Response,
  ) {
    const { asset, stream } = await this.service.asset(user.id, id, assetId)
    const fallback = asset.fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
    response.setHeader('Content-Type', asset.mimeType)
    response.setHeader('Content-Length', String(asset.sizeBytes))
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(asset.fileName)}`,
    )
    response.setHeader('X-Content-Type-Options', 'nosniff')
    stream.on('error', () => {
      if (!response.headersSent) response.status(500).end()
      else response.destroy()
    })
    stream.pipe(response)
  }
}
