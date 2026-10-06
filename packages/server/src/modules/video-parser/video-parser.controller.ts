import { Body, Controller, Get, Headers, HttpCode, Logger, Param, Post, Query, Res } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { Response } from 'express'
import { Public } from '../../common/decorators/public.decorator'
import { VideoParserService, mediaEtag } from './video-parser.service'

const HEADER_TIMEOUT_MS = 20_000
const STREAM_IDLE_TIMEOUT_MS = 30_000

@Public()
@Controller('api/parse')
export class VideoParserController {
  private readonly logger = new Logger(VideoParserController.name)

  constructor(private readonly parser: VideoParserService) {}

  @Post()
  @HttpCode(200)
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
    // Public media is embedded by servicewechat.com; keep Helmet defaults on other routes.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.removeHeader('Access-Control-Allow-Credentials')
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges')
    res.setHeader('Cache-Control', 'private, no-store')
    if (kind !== 'cover' && kind !== 'video') {
      res.status(400).json({ code: 1001, data: null, message: '媒体类型不正确' })
      return
    }
    const target = this.parser.getMedia(id, kind)
    const headers: Record<string, string> = { ...target.headers }
    if (range) headers.Range = range
    const abort = new AbortController()
    const cancel = () => { if (!res.writableFinished) abort.abort() }
    res.once('close', cancel)
    try {
      const response = await this.fetchMedia(target.url, headers, abort)
      if (!response.ok || !response.body) {
        await response.body?.cancel()
        if (response.status === 416) {
          const contentRange = response.headers.get('content-range')
          if (contentRange) res.setHeader('Content-Range', contentRange)
          res.status(416).end()
        } else {
          this.mediaFailure(res, 404, '视频链接已过期，请重新解析')
        }
        return
      }
      res.status(response.status)
      res.setHeader('Content-Type', response.headers.get('content-type') || (kind === 'cover' ? 'image/jpeg' : 'video/mp4'))
      res.setHeader('ETag', mediaEtag(target.url))
      for (const name of ['content-length', 'content-range', 'accept-ranges']) {
        const value = response.headers.get(name)
        if (value) res.setHeader(name, value)
      }
      await this.streamMedia(response, res, abort)
    } catch (error) {
      // Includes fetch, body timeout, upstream disconnect and client cancellation.
      // Never let a Readable error escape and terminate the API process.
      if (!res.destroyed) {
        this.logger.warn({ event: 'media-transfer-failed', id, kind, error: error instanceof Error ? error.name : 'Error' })
        this.mediaFailure(res, 503, '视频加载失败，请重试')
      }
    } finally {
      res.off('close', cancel)
      abort.abort()
    }
  }

  private async fetchMedia(url: string, headers: Record<string, string>, abort: AbortController) {
    // Only limit time to response headers. A progressing video may take minutes.
    const timer = setTimeout(() => abort.abort(), HEADER_TIMEOUT_MS)
    try {
      for (let hop = 0; hop <= 3; hop += 1) {
        const response = await fetch(url, { headers, redirect: 'manual', signal: abort.signal })
        if (response.status < 300 || response.status >= 400) return response
        await response.body?.cancel()
        const location = response.headers.get('location')
        if (!location || hop === 3) throw new Error('Invalid media redirect')
        const next = new URL(location, url)
        if (!['http:', 'https:'].includes(next.protocol) || next.username || next.password || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i.test(next.hostname)) {
          throw new Error('Invalid media redirect')
        }
        url = next.toString()
      }
      throw new Error('Too many media redirects')
    } finally {
      clearTimeout(timer)
    }
  }

  private async streamMedia(response: globalThis.Response, res: Response, abort: AbortController) {
    const source = Readable.fromWeb(response.body as any)
    let timer = setTimeout(() => abort.abort(), STREAM_IDLE_TIMEOUT_MS)
    const resetIdle = () => {
      clearTimeout(timer)
      timer = setTimeout(() => abort.abort(), STREAM_IDLE_TIMEOUT_MS)
    }
    const transfer = pipeline(source, res, { signal: abort.signal })
    source.on('data', resetIdle)
    try {
      await transfer
    } finally {
      clearTimeout(timer)
      source.off('data', resetIdle)
    }
  }

  private mediaFailure(res: Response, status: number, message: string) {
    if (res.destroyed || res.writableEnded) return
    if (res.headersSent) { res.destroy(); return }
    res.removeHeader('Content-Length')
    res.removeHeader('Content-Range')
    res.status(status).json({ code: 4, data: null, message })
  }
}
