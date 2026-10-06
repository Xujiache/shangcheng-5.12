import { Body, Controller, Get, Headers, Param, Post, Query, Req, Res } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Readable } from 'node:stream'
import type { Request, Response } from 'express'
import { Public } from '../../common/decorators/public.decorator'
import { VideoParserService, mediaEtag } from './video-parser.service'

@Public()
@Controller('api/parse')
export class VideoParserController {
  constructor(private readonly parser: VideoParserService) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  parse(@Body() body: { url?: unknown }) {
    return this.parser.parse(body?.url)
  }

  @Get('media/:id')
  async media(
    @Param('id') id: string,
    @Query('kind') kind: 'cover' | 'video',
    @Headers('range') range: string | undefined,
    @Res() res: Response,
  ) {
    if (kind !== 'cover' && kind !== 'video') {
      res.status(400).json({ code: 1001, data: null, message: '媒体类型不正确' })
      return
    }
    const target = this.parser.getMedia(id, kind)
    const headers: Record<string, string> = { ...target.headers }
    if (range) headers.Range = range
    const response = await fetch(target.url, {
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(20_000),
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) {
        res.status(404).json({ code: 4, data: null, message: '视频链接已过期，请重新解析' })
        return
      }
      let redirected: URL
      try { redirected = new URL(location, target.url) } catch {
        res.status(404).json({ code: 4, data: null, message: '视频链接已过期，请重新解析' })
        return
      }
      if (redirected.protocol !== 'http:' && redirected.protocol !== 'https:' || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|::1$)/i.test(redirected.hostname)) {
        res.status(404).json({ code: 4, data: null, message: '视频链接已过期，请重新解析' })
        return
      }
      const redirectedResponse = await fetch(redirected, {
        headers,
        redirect: 'error',
        signal: AbortSignal.timeout(20_000),
      })
      if (!redirectedResponse.ok || !redirectedResponse.body) {
        res.status(404).json({ code: 4, data: null, message: '视频链接已过期，请重新解析' })
        return
      }
      return this.streamMedia(redirectedResponse, kind, target.url, res)
    }
    if (!response.ok || !response.body) {
      res.status(404).json({ code: 4, data: null, message: '视频链接已过期，请重新解析' })
      return
    }
    return this.streamMedia(response, kind, target.url, res)
  }

  private streamMedia(response: globalThis.Response, kind: 'cover' | 'video', target: string, res: Response) {
    const contentType = response.headers.get('content-type') || (kind === 'cover' ? 'image/jpeg' : 'video/mp4')
    res.status(response.status)
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'private, max-age=300')
    res.setHeader('ETag', mediaEtag(target))
    for (const name of ['content-length', 'content-range', 'accept-ranges']) {
      const value = response.headers.get(name)
      if (value) res.setHeader(name, value)
    }
    Readable.fromWeb(response.body as any).pipe(res)
  }
}
