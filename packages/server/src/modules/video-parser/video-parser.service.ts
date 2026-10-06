import { Injectable } from '@nestjs/common'
import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { BizException } from '../../common/exceptions/biz.exception'
import { parse as parseWithSpapi } from './spapi.client'

const MAX_INPUT = 2000
const ENTRY_TTL = 90 * 60_000
const MAX_ENTRIES = 500
const MEDIA_DIR = process.env.VIDEO_PARSER_MEDIA_DIR || '/var/lib/jiujiu/video-parser'

type MediaKind = 'cover' | 'video'
type MediaTarget = { url: string; headers: Record<string, string> }
type ParserEntry = { cover: MediaTarget; video: MediaTarget; expiresAt: number }

function parserError(code: number, message: string): never {
  throw new BizException(code, message)
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

  constructor() {
    mkdirSync(MEDIA_DIR, { recursive: true, mode: 0o700 })
  }

  async parse(input: unknown) {
    if (typeof input !== 'string' || !input.trim() || input.length > MAX_INPUT) {
      parserError(1, '链接无效或作品不存在，请检查链接')
    }
    const result = await parseWithSpapi(input.trim())
    if (!result.ok) {
      const code = result.kind === 'unsupported' ? 2 : result.kind === 'busy' ? 3 : 4
      parserError(code, result.message)
    }
    const video = assertRemoteMediaUrl(result.video_url)
    const cover = assertRemoteMediaUrl(result.cover)
    const id = randomUUID()
    this.prune()
    const entry: ParserEntry = {
      cover: { url: cover, headers: mediaHeaders(cover) },
      video: { url: video, headers: mediaHeaders(video) },
      expiresAt: Date.now() + ENTRY_TTL,
    }
    this.entries.set(id, entry)
    writeFileSync(join(MEDIA_DIR, `${id}.json`), JSON.stringify(entry), { mode: 0o600 })
    return {
      title: result.title,
      cover: `/api/parse/media/${id}?kind=cover`,
      video: `/api/parse/media/${id}?kind=video`,
      wenan: result.title,
    }
  }

  getMedia(id: string, kind: MediaKind): MediaTarget {
    if (!/^[0-9a-f-]{36}$/i.test(id)) parserError(4, '视频链接已过期，请重新解析')
    let entry = this.entries.get(id)
    if (!entry) {
      try {
        entry = JSON.parse(readFileSync(join(MEDIA_DIR, `${id}.json`), 'utf8')) as ParserEntry
        this.entries.set(id, entry)
      } catch {
        entry = undefined
      }
    }
    if (!entry || entry.expiresAt <= Date.now()) {
      this.entries.delete(id)
      try { unlinkSync(join(MEDIA_DIR, `${id}.json`)) } catch { /* already absent */ }
      parserError(4, '视频链接已过期，请重新解析')
    }
    return entry[kind]
  }

  private prune(): void {
    const now = Date.now()
    for (const [id, entry] of this.entries) if (entry.expiresAt <= now) {
      this.entries.delete(id)
      try { unlinkSync(join(MEDIA_DIR, `${id}.json`)) } catch { /* already absent */ }
    }
    while (this.entries.size >= MAX_ENTRIES) {
      const oldest = this.entries.keys().next().value as string
      this.entries.delete(oldest)
      try { unlinkSync(join(MEDIA_DIR, `${oldest}.json`)) } catch { /* already absent */ }
    }
    try {
      for (const name of readdirSync(MEDIA_DIR)) {
        if (!name.endsWith('.json')) continue
        const id = name.slice(0, -5)
        if (this.entries.has(id)) continue
        try {
          const entry = JSON.parse(readFileSync(join(MEDIA_DIR, name), 'utf8')) as ParserEntry
          if (entry.expiresAt <= now) unlinkSync(join(MEDIA_DIR, name))
        } catch { unlinkSync(join(MEDIA_DIR, name)) }
      }
    } catch { /* cleanup is best effort */ }
  }
}

function mediaHeaders(url: string): Record<string, string> {
  const headers: Record<string, string> = { 'User-Agent': 'Mozilla/5.0' }
  try {
    if (new URL(url).hostname.toLowerCase().includes('bilivideo.com')) {
      headers.Referer = 'https://www.bilibili.com/'
    }
  } catch {
    // assertRemoteMediaUrl validates the URL before this function is called.
  }
  return headers
}

export function mediaEtag(url: string): string {
  return `W/"${createHash('sha1').update(url).digest('hex')}"`
}
