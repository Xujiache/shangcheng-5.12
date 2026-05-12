/**
 * 短信服务（多 provider 适配）
 *
 * 用法：
 *   constructor(private readonly sms: SmsService) {}
 *   await this.sms.sendVerifyCode('13800000000', '123456')
 *
 * provider 由环境变量 SMS_PROVIDER 决定：
 *   - 'guoyangyun'（默认）：国阳云 SMS HTTP API
 *   - 'none' 或未配置：跳过真发送，仅记录到日志（开发/预览）
 *
 * 国阳云具体 API 字段以官方文档为准，本实现按常见 RESTful + JSON 习惯
 * 写一份适配器，回填以下 env 即可工作；如官方接口字段不同，回头改
 * adapterGuoyangyun 函数即可，其余代码无须动。
 *
 * 国阳云 env：
 *   - GYY_SMS_API_URL=https://api.guoyangyun.com/api/sms/send（如有差异请改）
 *   - GYY_SMS_USERNAME 账号
 *   - GYY_SMS_PASSWORD 密码（或 API Key，按其文档）
 *   - GYY_SMS_TEMPLATE_LOGIN 模板 ID（登录验证码）
 *   - GYY_SMS_SIGN 签名
 */
import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name)

  async sendVerifyCode(phone: string, code: string, scene: 'login' | 'register' | 'reset' = 'login'): Promise<boolean> {
    const provider = (process.env.SMS_PROVIDER || 'none').toLowerCase()
    try {
      if (provider === 'guoyangyun') return await this.adapterGuoyangyun(phone, code, scene)
      // 没配 provider：不真发，仅日志（验证码在 DB 表里能查到，开发场景 OK）
      this.logger.log(`[SMS][${provider}] phone=${phone} code=${code} (no provider configured, dev mode)`)
      return true
    } catch (e: any) {
      this.logger.error(`[SMS] send failed: ${e?.message || e}`)
      // 不要因为短信失败阻塞用户：DB 里的 code 仍可被开发模式 0000 接受
      return false
    }
  }

  /**
   * 国阳云适配器
   * 默认按 GET + query 参数：u=账号 p=密码 m=手机 c=内容
   * 这是国阳云老式接口的常见结构；如果你账号开通的是 v2 / 模板 API，
   * 调整这里的 url/body 字段名即可。
   */
  private async adapterGuoyangyun(
    phone: string,
    code: string,
    scene: 'login' | 'register' | 'reset',
  ): Promise<boolean> {
    const baseUrl = process.env.GYY_SMS_API_URL
    const username = process.env.GYY_SMS_USERNAME
    const password = process.env.GYY_SMS_PASSWORD
    const sign = process.env.GYY_SMS_SIGN || ''
    const tplLogin = process.env.GYY_SMS_TEMPLATE_LOGIN || ''

    if (!baseUrl || !username || !password) {
      this.logger.warn('[SMS][guoyangyun] 缺少 env 配置：GYY_SMS_API_URL / GYY_SMS_USERNAME / GYY_SMS_PASSWORD')
      return false
    }

    // 文案：以模板 ID 为优先；如没配模板，则发文本（很多国阳云通道按签名+文本）
    const content = tplLogin
      ? `【${sign}】您的验证码是 ${code}，5 分钟内有效，请勿泄露。`
      : `【${sign || '验证码'}】您的验证码是 ${code}，5 分钟内有效。`

    const url = new URL(baseUrl)
    url.searchParams.set('u', username)
    url.searchParams.set('p', password)
    url.searchParams.set('m', phone)
    url.searchParams.set('c', content)
    if (tplLogin) url.searchParams.set('tpl', tplLogin)
    url.searchParams.set('scene', scene)

    const r = await fetch(url.toString(), { method: 'GET' })
    const text = await r.text()
    this.logger.log(`[SMS][guoyangyun] resp: ${text.slice(0, 200)}`)
    // 国阳云典型响应 "100,success" 或 JSON {code:0}；这里宽容判断
    if (/^100/.test(text) || /"code"\s*:\s*0/.test(text) || /success/i.test(text)) return true
    throw new Error(`guoyangyun resp not OK: ${text.slice(0, 200)}`)
  }
}
