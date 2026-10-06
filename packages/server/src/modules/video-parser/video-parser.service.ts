import { Injectable } from '@nestjs/common'
import { execFile } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { promisify } from 'node:util'
import { BizException } from '../../common/exceptions/biz.exception'

const execFileAsync = promisify(execFile)
const MAX_INPUT = 2000
const ENTRY_TTL = 30 * 60_000
const MAX_ENTRIES = 500
const URL_RE = /https?:\/\/[^\s<>"'“”‘’，。！？、)）】》]+/gi

type MediaKind = 'cover' | 'video'
type ParserEntry = { cover: string; video: string; expiresAt: number }
type YtDlpInfo = {
  id?: string
  title?: string
  description?: string
  thumbnail?: string
  url?: string
  requested_downloads?: Array<{ url?: string }>
  formats?: Array<{ url?: string; ext?: string; vcodec?: string; acodec?: string; height?: number }>
}

const ALLOWED_HOSTS = [
  /(^|\.)douyin\.com$/i,
  /(^|\.)kuaishou\.com$/i,
  /(^|\.)bilibili\.com$/i,
  /(^|\.)tiktok\.com$/i,
]

function parserError(code: number, message: string): never {
  throw new BizException(code, message)
}

function extractUrl(input: string): string {
  const url = input.match(URL_RE)?.[0]?.replace(/[\]}〉》]+$/g, '')
  if (!url) parserError(1, '链接无效或作品不存在，请检查链接')
  return url
}

function assertAllowedInput(url: string): void {
  let parsed: URL
  try { parsed = new URL(url) } catch { parserError(1, '链接无效或作品不存在，请检查链接') }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') parserError(1, '链接无效或作品不存在，请检查链接')
  if (!ALLOWED_HOSTS.some((pattern) => pattern.test(parsed.hostname))) parserError(2, '暂不支持该平台链接')
}

function assertRemoteMediaUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 8192) parserError(4, '服务暂不可用，请检查网络')
  let parsed: URL
  try { parsed = new URL(value) } catch { parserError(4, '服务暂不可用，请检查网络') }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') parserError(4, '服务暂不可用，请检查网络')
  if (/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|::1$)/i.test(parsed.hostname)) {
    parserError(4, '服务暂不可用，请检查网络')
  }
  return parsed.toString()
}

@Injectable()
export class VideoParserService {
  private readonly entries = new Map<string, ParserEntry>()

  async parse(input: unknown) {
    if (typeof input !== 'string' || !input.trim() || input.length > MAX_INPUT) {
      parserError(1, '链接无效或作品不存在，请检查链接')
    }
    const url = extractUrl(input.trim())
    assertAllowedInput(url)

    const binary = process.env.VIDEO_PARSER_BIN || 'yt-dlp'
    let stdout: string
    try {
      const result = await execFileAsync(binary, [
        '--dump-single-json', '--no-playlist', '--no-warnings', '--skip-download',
        '--format', 'best[ext=mp4]/best', '--socket-timeout', '15', url,
      ], { timeout: 35_000, maxBuffer: 2 * 1024 * 1024 })
      stdout = result.stdout
    } catch (error: any) {
      const detail = `${error?.stderr || ''} ${error?.message || ''}`.toLowerCase()
      if (error?.code === 'ENOENT' || detail.includes('enoent')) {
        parserError(4, '服务暂不可用，请检查网络')
      }
      if (detail.includes('unsupported') || detail.includes('not found') || detail.includes('does not exist')) {
        parserError(1, '链接无效或作品不存在，请检查链接')
      }
      if (detail.includes('unable to recognize') || detail.includes('no suitable')) {
        parserError(2, '暂不支持该平台链接')
      }
      parserError(3, '服务繁忙，请稍后再试')
    }

    let info: YtDlpInfo
    try { info = JSON.parse(stdout) as YtDlpInfo } catch { parserError(3, '服务繁忙，请稍后再试') }
    const video = assertRemoteMediaUrl(info.url || info.requested_downloads?.[0]?.url || pickVideoUrl(info.formats))
    const cover = assertRemoteMediaUrl(info.thumbnail)
    const id = randomUUID()
    this.prune()
    this.entries.set(id, { cover, video, expiresAt: Date.now() + ENTRY_TTL })
    return {
      title: String(info.title || info.description || '').trim() || '视频内容',
      cover: `/api/parse/media/${id}?kind=cover`,
      video: `/api/parse/media/${id}?kind=video`,
      wenan: String(info.description || info.title || '').trim() || '视频内容',
    }
  }

  getMedia(id: string, kind: MediaKind): string {
    const entry = this.entries.get(id)
    if (!entry || entry.expiresAt <= Date.now()) {
      this.entries.delete(id)
      parserError(4, '视频链接已过期，请重新解析')
    }
    return entry[kind]
  }

  private prune(): void {
    const now = Date.now()
    for (const [id, entry] of this.entries) if (entry.expiresAt <= now) this.entries.delete(id)
    while (this.entries.size >= MAX_ENTRIES) this.entries.delete(this.entries.keys().next().value as string)
  }
}

function pickVideoUrl(formats: YtDlpInfo['formats']): string | undefined {
  return formats
    ?.filter((format) => format.url && format.vcodec !== 'none')
    ?.sort((a, b) => (b.height || 0) - (a.height || 0))
    ?.[0]?.url
}

export function mediaEtag(url: string): string {
  return `W/"${createHash('sha1').update(url).digest('hex')}"`
}
