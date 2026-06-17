import { Injectable, Logger } from '@nestjs/common'
import { BizException, BizCode } from '../../common/exceptions/biz.exception'
import { FilesService } from '../files/files.service'
import { lookup } from 'node:dns/promises'

const MAX_ADOPT_BYTES = 10 * 1024 * 1024 // 10MB 上限

// SSRF 防护：拒绝环回/内网/链路本地地址（含解析后的 IP）
function isPrivateAddr(addr: string, family: number): boolean {
  const a = (addr || '').toLowerCase()
  if (family === 6) {
    return (
      a === '::1' ||
      a.startsWith('fe80') ||
      a.startsWith('fc') ||
      a.startsWith('fd') ||
      a.startsWith('::ffff:')
    )
  }
  const p = a.split('.').map((x) => Number(x))
  if (p.length !== 4 || p.some((x) => Number.isNaN(x))) return true
  const [b0, b1] = p
  if (b0 === 0 || b0 === 127 || b0 === 10) return true
  if (b0 === 169 && b1 === 254) return true
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true
  if (b0 === 192 && b1 === 168) return true
  return false
}

/**
 * 后台 AI 生图（聚鑫科技 GPT Image 2，BASE_URL=api.lk888.ai）。
 * 仅后台调用：创建任务 → 轮询状态 → 拿 result_url；并支持把结果转存到自有对象存储（永久 URL，防外链失效）。
 * 密钥放 server .env：LK_IMAGE_API_KEY / LK_IMAGE_BASE_URL（不入 git）。
 */
@Injectable()
export class LedgerAiService {
  private readonly logger = new Logger('LedgerAi')
  private readonly base = process.env.LK_IMAGE_BASE_URL || 'https://api.lk888.ai'
  private readonly key = process.env.LK_IMAGE_API_KEY || ''

  constructor(private readonly files: FilesService) {}

  /** 创建生图任务。兼容两种返回：同步 data[].url 或 异步 task_id（需再轮询 status）。 */
  async generate(dto: { prompt?: string; size?: string; quality?: string }) {
    if (!this.key)
      throw new BizException(BizCode.BUSINESS_ERROR, 'AI 生图未配置（缺 LK_IMAGE_API_KEY）')
    const prompt = String(dto.prompt || '').trim()
    if (!prompt) throw new BizException(BizCode.INVALID_PARAMS, '请填写提示词')
    const res = await this.call('POST', '/v1/media/generate', {
      model: 'gpt-image-2',
      prompt: prompt.slice(0, 2000),
      params: {
        size: dto.size || 'auto',
        quality: dto.quality || 'auto',
        n: 1,
        response_format: 'url',
      },
    })
    const url = res?.data?.[0]?.url ?? res?.data?.url
    if (url) return { done: true, url, taskId: null as string | null }
    // lk888 异步返回：task_id 嵌在 data.task_id（数字）。兼容多种位置/命名。
    const taskId = res?.data?.task_id ?? res?.data?.taskId ?? res?.task_id ?? res?.taskId ?? res?.id
    if (taskId) return { done: false, url: null as string | null, taskId: String(taskId) }
    throw new BizException(BizCode.BUSINESS_ERROR, 'AI 生图返回异常，请重试')
  }

  /** 轮询任务状态：is_final=true 终态；state=success 时取 result_url。 */
  async status(taskId: string) {
    const id = String(taskId || '').trim()
    if (!id) throw new BizException(BizCode.INVALID_PARAMS, '缺少 taskId')
    const res = await this.call('GET', `/v1/media/status?task_id=${encodeURIComponent(id)}`)
    const state = String(res?.state || 'running')
    return {
      done: !!res?.is_final,
      state, // pending / running / success / failed
      progress: String(res?.progress || ''),
      url: state === 'success' ? String(res?.result_url || '') : '',
      error: String(res?.error || ''),
    }
  }

  /** 把 AI 结果图下载并转存到自有对象存储，返回永久 URL（用于广告图，避免外链过期）。 */
  async adopt(url: string, ownerId?: string) {
    const src = String(url || '').trim()
    if (!/^https?:\/\//.test(src)) throw new BizException(BizCode.INVALID_PARAMS, '无效的图片地址')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20000)
    try {
      const r = await fetch(src, { signal: controller.signal })
      if (!r.ok) throw new BizException(BizCode.BUSINESS_ERROR, '下载 AI 图失败')
      const buf = Buffer.from(await r.arrayBuffer())
      const mimetype = r.headers.get('content-type') || 'image/png'
      const ext =
        mimetype.includes('jpeg') || mimetype.includes('jpg')
          ? 'jpg'
          : mimetype.includes('webp')
            ? 'webp'
            : 'png'
      const file: any = { buffer: buf, size: buf.length, mimetype, originalname: `ai-cover.${ext}` }
      const { url: permanent } = await this.files.upload(file, 'ledger-ad', ownerId)
      return { url: permanent }
    } catch (e: any) {
      if (e instanceof BizException) throw e
      this.logger.warn('adopt fail: ' + (e?.message || e))
      throw new BizException(BizCode.BUSINESS_ERROR, '转存图片失败，请重试或直接使用原图')
    } finally {
      clearTimeout(timer)
    }
  }

  private async call(method: 'GET' | 'POST', path: string, body?: any): Promise<any> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20000)
    try {
      const r = await fetch(this.base + path, {
        method,
        headers: {
          Authorization: 'Bearer ' + this.key,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
      const text = await r.text()
      let json: any = {}
      try {
        json = text ? JSON.parse(text) : {}
      } catch (e) {
        /* 非 JSON 响应 */
      }
      if (!r.ok) {
        this.logger.warn(`AI ${path} ${r.status}: ${text.slice(0, 200)}`)
        throw new BizException(
          BizCode.BUSINESS_ERROR,
          json?.error || json?.message || `AI 服务错误(${r.status})`,
        )
      }
      return json
    } catch (e: any) {
      if (e instanceof BizException) throw e
      this.logger.warn(`AI ${path} fail: ${e?.message || e}`)
      throw new BizException(BizCode.BUSINESS_ERROR, 'AI 服务暂不可用，请稍后重试')
    } finally {
      clearTimeout(timer)
    }
  }
}
