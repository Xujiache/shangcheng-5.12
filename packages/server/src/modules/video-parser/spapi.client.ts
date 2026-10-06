const SPAPI_ENDPOINT = 'https://api.spapi.cn/get'
const DEFAULT_SPAPI_KEY = '9c65b47c3f9399ad2600fe326d7c7d6a'
const REQUEST_TIMEOUT_MS = 30_000
const MIN_REQUEST_INTERVAL_MS = 4_500
const QUOTA_RETRY_DELAY_MS = 60_000

type SpapiSuccessPayload = {
  status: 101
  msg?: string
  data?: {
    title?: unknown
    image?: unknown
    video?: unknown
    url?: unknown
  }
}

type SpapiFailurePayload = { status?: number; msg?: unknown; data?: unknown }

export type SpapiParseResult =
  | {
      ok: true
      title: string
      cover: string
      video_url: string
      raw: unknown
    }
  | {
      ok: false
      message: string
      raw?: unknown
      status?: number
      kind: 'unsupported' | 'busy' | 'unavailable'
    }

type RequestResult =
  | { kind: 'success'; value: SpapiParseResult }
  | { kind: 'unsupported'; value: SpapiParseResult }
  | { kind: 'quota' }
  | { kind: 'busy'; value: SpapiParseResult }
  | { kind: 'unavailable'; value: SpapiParseResult }

let requestTail = Promise.resolve()
let lastRequestAt = Number.NEGATIVE_INFINITY

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, milliseconds); })
}

async function withRequestGate<T>(work: () => Promise<T>): Promise<T> {
  const previous = requestTail
  let release!: () => void
  requestTail = new Promise<void>((resolve) => { release = resolve; })
  await previous
  try {
    return await work()
  } finally {
    release()
  }
}

function messageForStatus(status: number | undefined): string {
  return status === 102 ? '暂不支持该链接或链接已失效' : '服务繁忙，请稍后再试'
}

function failure(
  message: string,
  kind: 'unsupported' | 'busy' | 'unavailable',
  raw?: unknown,
  status?: number,
): SpapiParseResult {
  return { ok: false, message, kind, raw, status }
}

function getKey(): string {
  return process.env.SPAPI_KEY?.trim() || DEFAULT_SPAPI_KEY
}

function isJsonResponse(response: Response): boolean {
  return (response.headers.get('content-type') || '').toLowerCase().includes('application/json')
}

function logCall(input: string, result: string, startedAt: number): void {
  console.info(`[spapi] url=${input} result=${result} duration=${Date.now() - startedAt}ms`)
}

async function requestOnce(input: string): Promise<RequestResult> {
  const wait = Math.max(0, lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now())
  if (wait > 0) await sleep(wait)
  lastRequestAt = Date.now()
  const startedAt = lastRequestAt
  const requestUrl = new URL(SPAPI_ENDPOINT)
  requestUrl.searchParams.set('appkey', getKey())
  requestUrl.searchParams.set('url', input)

  try {
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (response.status === 403 && !isJsonResponse(response)) {
      await response.text().catch(() => '')
      logCall(input, '403', startedAt)
      return { kind: 'quota' }
    }

    let payload: SpapiSuccessPayload | SpapiFailurePayload
    try {
      payload = (await response.json()) as SpapiSuccessPayload | SpapiFailurePayload
    } catch {
      logCall(input, `http-${response.status}`, startedAt)
      return {
        kind: 'busy',
        value: failure('服务繁忙，请稍后再试', 'busy', undefined, response.status),
      }
    }

    if (payload && payload.status === 101) {
      const data = (payload as SpapiSuccessPayload).data
      const title = typeof data?.title === 'string' ? data.title.trim() : ''
      const cover = typeof data?.image === 'string' ? data.image.trim() : ''
      const videoUrl = typeof data?.video === 'string' ? data.video.trim() : typeof data?.url === 'string' ? data.url.trim() : ''
      if (!title || !cover || !videoUrl) {
        logCall(input, '101-invalid-data', startedAt)
        return { kind: 'unavailable', value: failure('服务暂不可用，请检查网络', 'unavailable', payload, 101) }
      }
      logCall(input, '101', startedAt)
      return { kind: 'success', value: { ok: true, title, cover, video_url: videoUrl, raw: payload } }
    }

    if (payload && payload.status === 102) {
      logCall(input, '102', startedAt)
      return { kind: 'unsupported', value: failure(messageForStatus(102), 'unsupported', payload, 102) }
    }

    logCall(input, `http-${response.status}-status-${String(payload?.status || 'unknown')}`, startedAt)
    return { kind: 'busy', value: failure('服务繁忙，请稍后再试', 'busy', payload, response.status) }
  } catch (error) {
    const name = error instanceof Error ? error.name : 'UnknownError'
    logCall(input, `exception-${name}`, startedAt)
    return { kind: 'unavailable', value: failure('服务暂不可用，请检查网络', 'unavailable') }
  }
}

/** 唯一视频解析客户端。所有调用共享 4.5 秒节奏闸，禁止切换备用解析通道。 */
export async function parse(input: string): Promise<SpapiParseResult> {
  return withRequestGate(async () => {
    const first = await requestOnce(input)
    if (first.kind !== 'quota') return first.value
    await sleep(QUOTA_RETRY_DELAY_MS)
    const second = await requestOnce(input)
    if (second.kind === 'success') return second.value
    return failure('服务繁忙，请稍后再试', 'busy', second.kind === 'busy' || second.kind === 'unavailable' ? second.value.raw : undefined, 403)
  })
}
