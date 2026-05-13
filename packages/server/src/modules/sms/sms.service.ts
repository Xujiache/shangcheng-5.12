/**
 * 短信服务（多 provider 适配）
 *
 * 国阳云「变量发送接口（ID版）」实现，文档：
 *   http://help.guoyangyun.com/API_manual/SendSmsBatch.html
 *
 * 端点：POST https://api.guoyangyun.com/api/sms/smsmtm.htm
 *
 * 鉴权（公共参数 — http://help.guoyangyun.com/API_manual/Parameter.html）：
 *   appkey    系统分配的用户唯一标识（不是登录账号！）
 *   appsecret 系统分配的应用密钥（不是登录密码！）
 *   ↑ 二者从 国阳云后台 → 账户信息 → 接口信息 里复制
 *
 * env：
 *   GYY_SMS_API_URL          https://api.guoyangyun.com/api/sms/smsmtm.htm
 *   GYY_SMS_APPKEY           appkey
 *   GYY_SMS_APPSECRET        appsecret
 *   GYY_SMS_SIGN             签名 ID（控制台 → 签名管理）
 *   GYY_SMS_TEMPLATE_LOGIN   登录验证码模板 ID（控制台 → 模板管理）
 *   GYY_SMS_TEMPLATE_VAR     模板变量名 —— 必须和模板正文里 **xxx** 写法完全一致，
 *                            含 `**` 包围符。例如模板正文 `您的验证码是 **验证码**`
 *                            对应 GYY_SMS_TEMPLATE_VAR=**验证码**。
 *                            如果填了不带星号的（如"验证码"或"code"），代码会自动
 *                            补全成 `**xxx**`，但仍建议直接写带星号的形式。
 *
 * ⚠️ 国阳云的 API 收到任何 content 都会先返回 code:0「成功」，**变量名错了不会立刻报错**，
 *    要去他们后台「发送记录」才能看到「失败：变量不匹配 / 模板内容不符」之类的最终状态。
 *
 * 性能：
 *   国阳云 HTTPS endpoint 单次 TLS 握手 ~3.8s，首次 5s+；通过 keep-alive Agent
 *   复用 socket，后续请求降到 <1s。
 *
 * 兼容旧 env 名（GYY_SMS_USERNAME / GYY_SMS_PASSWORD）：会自动当成 appkey/appsecret。
 *
 * 失败不阻塞用户：DB 里仍有验证码记录，dev 模式 0000 仍接受。
 */
import { Injectable, Logger } from '@nestjs/common'
import { Agent } from 'undici'

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name)

  /**
   * 全局复用的 HTTPS 连接池（undici Agent，被原生 fetch dispatcher 直接消费）。
   * keepAliveTimeout=30s → 闲置 30s 后才关闭，覆盖单用户多次重发场景。
   * 实测国阳云首次握手 3.8s + 等响应 1.4s = 5.2s；复用 socket 后单次降到 ~1s。
   */
  private readonly dispatcher = new Agent({
    keepAliveTimeout: 30_000,
    keepAliveMaxTimeout: 60_000,
    connections: 16,
    connect: { timeout: 5_000 },
  })

  /**
   * 发送验证码。
   *
   * 返回结构化结果而不是 boolean，便于上层把上游具体原因
   * （如"黑名单"/"手机号码不正确"/"模板已停用"）原样回传给用户，
   * 避免出现千篇一律的"短信发送失败"。
   */
  async sendVerifyCode(
    phone: string,
    code: string,
    scene: 'login' | 'register' | 'reset' = 'login',
  ): Promise<{ ok: boolean; reason?: string }> {
    const provider = (process.env.SMS_PROVIDER || 'none').toLowerCase()
    const t0 = Date.now()
    try {
      if (provider === 'guoyangyun') {
        await this.adapterGuoyangyun(phone, code, scene)
        this.logger.log(`[SMS][${provider}] phone=${phone} ok=true elapsed=${Date.now() - t0}ms`)
        return { ok: true }
      }
      this.logger.log(`[SMS][${provider}] phone=${phone} code=${code} (no provider, dev mode)`)
      return { ok: true }
    } catch (e: any) {
      const reason = String(e?.message || e).replace(/^guoyangyun:\s*/, '').slice(0, 120)
      this.logger.error(
        `[SMS] phone=${phone} elapsed=${Date.now() - t0}ms failed: ${reason}`,
      )
      return { ok: false, reason }
    }
  }

  /** 国阳云 · 变量发送接口（ID版）。成功 resolve void；失败 throw 带具体原因。 */
  private async adapterGuoyangyun(
    phone: string,
    code: string,
    _scene: 'login' | 'register' | 'reset',
  ): Promise<void> {
    const url =
      process.env.GYY_SMS_API_URL || 'https://api.guoyangyun.com/api/sms/smsmtm.htm'
    const appkey = process.env.GYY_SMS_APPKEY || process.env.GYY_SMS_USERNAME || ''
    const appsecret = process.env.GYY_SMS_APPSECRET || process.env.GYY_SMS_PASSWORD || ''
    const smsSignId = process.env.GYY_SMS_SIGN || ''
    const templateId = process.env.GYY_SMS_TEMPLATE_LOGIN || ''
    // 国阳云模板变量按 **xxx** 格式占位，content 里 JSON key 必须完全一致带星号
    // 没星号的兜底自动补全，避免一次配置错误整个登录链路报废
    const rawVar = process.env.GYY_SMS_TEMPLATE_VAR || '**code**'
    const tplVar = rawVar.startsWith('**') && rawVar.endsWith('**') ? rawVar : `**${rawVar}**`
    // 如果模板里还有 **minute** 占位（"5 分钟内有效"），也一并填上
    const minuteValue = process.env.GYY_SMS_TEMPLATE_MINUTE || '5'

    if (!appkey || !appsecret || !smsSignId || !templateId) {
      this.logger.warn(
        '[SMS][guoyangyun] env 缺失：GYY_SMS_APPKEY / GYY_SMS_APPSECRET / GYY_SMS_SIGN / GYY_SMS_TEMPLATE_LOGIN',
      )
      throw new Error('guoyangyun: 服务端短信通道未配置')
    }

    // content 是 JSON 数组字符串，每个对象至少 {mobile, 模板变量名}
    // 同时填 **minute** 兼容包含"分钟内有效"占位的模板（如国阳云官方测试模板 908e94cc...）
    const content = JSON.stringify([{ mobile: phone, [tplVar]: code, '**minute**': minuteValue }])

    const form = new URLSearchParams()
    form.set('appkey', appkey)
    form.set('appsecret', appsecret)
    form.set('smsSignId', smsSignId)
    form.set('templateId', templateId)
    form.set('content', content)

    // 8s 超时兜底：上游 99% 在 1-5s 内回复；超过 8s 视为不可达
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)

    let text = ''
    let httpStatus = 0
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: form.toString(),
        signal: controller.signal,
        // Node 原生 fetch 走 undici dispatcher 复用 socket，跳过 3.8s 的 TLS 握手
        dispatcher: this.dispatcher,
      } as any)
      httpStatus = r.status
      text = await r.text()
    } catch (e: any) {
      if (e?.name === 'AbortError') throw new Error('guoyangyun: 上游响应超时 (>8s)')
      throw e
    } finally {
      clearTimeout(timer)
    }

    if (httpStatus !== 200) {
      throw new Error(`guoyangyun: HTTP ${httpStatus} resp=${text.slice(0, 200)}`)
    }

    this.logger.log(`[SMS][guoyangyun] resp: ${text.slice(0, 300)}`)

    let parsed: any = null
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new Error(`guoyangyun: 非 JSON 响应 ${text.slice(0, 200)}`)
    }

    // 国阳云返回：code='0' 全部受理；code='1507' 全部失败；其他 code 也可能附 failList。
    // 即便顶层 code='0'，如果当前手机号在 failList 中，也认定失败。
    const codeStr = String(parsed?.code ?? '')
    const failList: any[] = Array.isArray(parsed?.failList) ? parsed.failList : []
    const phoneFailed = failList.find((it) => String(it?.mobile || '') === phone)

    if (codeStr === '0' && !phoneFailed) {
      // 真的成功：可能含 successList，记录一下
      const sl = Array.isArray(parsed?.successList) ? parsed.successList : []
      if (sl.length) this.logger.log(`[SMS][guoyangyun] success sid=${sl[0]?.sid || ''}`)
      return
    }

    // 失败：抽取最详细的错误消息抛出
    const detail = phoneFailed
      ? `${phoneFailed?.msg || phoneFailed?.code} (${phone})`
      : parsed?.msg || codeStr
    throw new Error(`guoyangyun: ${detail || text.slice(0, 200)}`)
  }
}
