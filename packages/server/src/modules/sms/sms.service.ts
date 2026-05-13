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
 *   GYY_SMS_TEMPLATE_VAR     模板变量名（默认 'code'；按模板"您的验证码：**code**"约定）
 *
 * 兼容旧 env 名（GYY_SMS_USERNAME / GYY_SMS_PASSWORD）：会自动当成 appkey/appsecret。
 *
 * 失败不阻塞用户：DB 里仍有验证码记录，dev 模式 0000 仍接受。
 */
import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name)

  async sendVerifyCode(
    phone: string,
    code: string,
    scene: 'login' | 'register' | 'reset' = 'login',
  ): Promise<boolean> {
    const provider = (process.env.SMS_PROVIDER || 'none').toLowerCase()
    try {
      if (provider === 'guoyangyun') return await this.adapterGuoyangyun(phone, code, scene)
      this.logger.log(`[SMS][${provider}] phone=${phone} code=${code} (no provider, dev mode)`)
      return true
    } catch (e: any) {
      this.logger.error(`[SMS] send failed: ${e?.message || e}`)
      return false
    }
  }

  /** 国阳云 · 变量发送接口（ID版） */
  private async adapterGuoyangyun(
    phone: string,
    code: string,
    _scene: 'login' | 'register' | 'reset',
  ): Promise<boolean> {
    const url =
      process.env.GYY_SMS_API_URL || 'https://api.guoyangyun.com/api/sms/smsmtm.htm'
    // appkey/appsecret 优先；旧 env username/password 兜底（万一你之前误填）
    const appkey = process.env.GYY_SMS_APPKEY || process.env.GYY_SMS_USERNAME || ''
    const appsecret = process.env.GYY_SMS_APPSECRET || process.env.GYY_SMS_PASSWORD || ''
    const smsSignId = process.env.GYY_SMS_SIGN || ''
    const templateId = process.env.GYY_SMS_TEMPLATE_LOGIN || ''
    const tplVar = process.env.GYY_SMS_TEMPLATE_VAR || 'code'

    if (!appkey || !appsecret || !smsSignId || !templateId) {
      this.logger.warn(
        '[SMS][guoyangyun] env 缺失：GYY_SMS_APPKEY / GYY_SMS_APPSECRET / GYY_SMS_SIGN / GYY_SMS_TEMPLATE_LOGIN',
      )
      return false
    }

    // content 是 JSON 数组字符串，每个对象至少 {mobile, 模板变量名}
    // 例：[{"mobile":"13800000000","code":"123456"}]
    const content = JSON.stringify([{ mobile: phone, [tplVar]: code }])

    const form = new URLSearchParams()
    form.set('appkey', appkey)
    form.set('appsecret', appsecret)
    form.set('smsSignId', smsSignId)
    form.set('templateId', templateId)
    form.set('content', content)

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: form.toString(),
    })
    const text = await r.text()
    this.logger.log(`[SMS][guoyangyun] resp: ${text.slice(0, 300)}`)
    let parsed: any = null
    try { parsed = JSON.parse(text) } catch { /* not json */ }
    if (parsed?.code === '0' || parsed?.code === 0) return true
    throw new Error(
      `guoyangyun: ${parsed?.msg || parsed?.code || text.slice(0, 200)}`,
    )
  }
}
