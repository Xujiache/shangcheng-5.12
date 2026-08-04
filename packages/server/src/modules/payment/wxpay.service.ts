/**
 * 微信支付 v3 · JSAPI 下单（小程序内支付）
 *
 * 流程：
 *   1. 用户在小程序里点"立即支付" → 前端调 /api/v1/u/orders/:id/pay
 *   2. 后端 prepay() 调微信支付 v3 /v3/pay/transactions/jsapi 拿 prepay_id
 *   3. 用 prepay_id 生成"小程序调起支付参数"（appId, timeStamp, nonceStr, package, signType, paySign）
 *   4. 返回给前端，前端 uni.requestPayment(params)
 *   5. 用户付完 → 微信回调 /api/v1/payments/wechat/notify
 *   6. 回调里校验签名 + 更新订单 status=paid
 *
 * 用到的 env：
 *   WX_MINIAPP_APPID   小程序 AppID
 *   WX_PAY_MCH_ID      商户号（申请中）
 *   WX_PAY_API_V3_KEY  APIv3 密钥（商户平台设置）
 *   WX_PAY_KEY_PATH    商户私钥文件（apiclient_key.pem）
 *   WX_PAY_CERT_PATH   商户证书文件（apiclient_cert.pem）
 *   WX_PAY_NOTIFY_URL  支付结果回调地址（https://ewsn.top/...）
 *   WX_PAY_PUB_KEY_ID  微信支付公钥 ID（新模式 Wechatpay-Serial 比对）
 *   WX_PAY_PUB_KEY_PATH 微信支付公钥 .pem 路径（验签用）
 *
 * 资金安全策略（不分环境）：
 *   - createMiniPay：env 未配齐 → 直接抛错，绝不返回占位 prepay，
 *     避免"未付款也能拿货"的资金风险（开发期请配真实沙箱凭证）
 *   - verifyNotify：未配齐 / 公钥缺失 → 直接拒绝回调，绝不放行未验签的回调
 *   - createRefund：env 未配齐 → 直接抛错，绝不返回占位退款
 */
import { Injectable, Logger } from '@nestjs/common'
import { createDecipheriv, createSign, createVerify, randomBytes } from 'crypto'
import { readFileSync, existsSync } from 'fs'

export interface PrepayParams {
  outTradeNo: string
  description: string
  totalFen: number // 单位：分
  openid: string // 用户 openid（必填）
  attach?: string // 附加数据
  appid?: string // 覆盖默认小程序 AppID（多小程序共用同一商户号时必传，如门窗利账独立 appid）
  notifyUrl?: string // 覆盖默认回调地址（不同业务走各自回调路由）
}

/** 小程序端 uni.requestPayment 需要的字段 */
export interface MiniPayInvoke {
  appId: string
  timeStamp: string
  nonceStr: string
  package: string // "prepay_id=xxx"
  signType: 'RSA' | 'MD5'
  paySign: string
}

@Injectable()
export class WxPayService {
  private readonly logger = new Logger(WxPayService.name)

  /** 当前是否真实可用（4 个 env + 2 个 pem 文件都到位） */
  isReady(): boolean {
    return (
      !!process.env.WX_MINIAPP_APPID &&
      !!process.env.WX_PAY_MCH_ID &&
      !!process.env.WX_PAY_API_V3_KEY &&
      !!process.env.WX_PAY_KEY_PATH &&
      existsSync(process.env.WX_PAY_KEY_PATH || '')
    )
  }

  /** JSAPI 下单 → 返回小程序调起支付所需的全部字段 */
  async createMiniPay(args: PrepayParams): Promise<MiniPayInvoke> {
    if (!this.isReady()) {
      // 资金 P0：不分环境一律抛错，绝不返回任何 mock 支付参数
      throw new Error('微信支付未配置（缺商户号/API V3 密钥/证书），暂不可下单')
    }

    const appid = args.appid || process.env.WX_MINIAPP_APPID!
    const mchid = process.env.WX_PAY_MCH_ID!
    const notifyUrl = args.notifyUrl || process.env.WX_PAY_NOTIFY_URL!
    const keyPath = process.env.WX_PAY_KEY_PATH!

    const body = {
      appid,
      mchid,
      description: args.description,
      out_trade_no: args.outTradeNo,
      notify_url: notifyUrl,
      attach: args.attach,
      amount: { total: args.totalFen, currency: 'CNY' },
      payer: { openid: args.openid },
    }

    const url = 'https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi'
    const method = 'POST'
    const bodyStr = JSON.stringify(body)
    const auth = await this.buildAuthHeader(method, '/v3/pay/transactions/jsapi', bodyStr, keyPath)

    const r = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Language': 'zh-CN',
        Authorization: auth,
      },
      body: bodyStr,
    })
    const resp: any = await r.json()
    if (!resp.prepay_id) {
      this.logger.error(`[wxpay] jsapi prepay failed: ${JSON.stringify(resp)}`)
      throw new Error(`微信支付下单失败：${resp.message || resp.code || 'unknown'}`)
    }

    const pkg = `prepay_id=${resp.prepay_id}`
    const timeStamp = String(Math.floor(Date.now() / 1000))
    const nonceStr = randomBytes(16).toString('hex')
    const signStr = [appid, timeStamp, nonceStr, pkg, ''].join('\n')
    const paySign = this.signRSA(signStr, keyPath)

    return {
      appId: appid,
      timeStamp,
      nonceStr,
      package: pkg,
      signType: 'RSA',
      paySign,
    }
  }

  /** 构造 v3 Authorization 头 */
  private async buildAuthHeader(
    method: string,
    urlPath: string,
    body: string,
    keyPath: string,
  ): Promise<string> {
    const mchid = process.env.WX_PAY_MCH_ID!
    const serialNo = process.env.WX_PAY_CERT_SERIAL || ''
    const timestamp = Math.floor(Date.now() / 1000)
    const nonce = randomBytes(16).toString('hex')
    const message = [method, urlPath, timestamp, nonce, body].join('\n') + '\n'
    const signature = this.signRSA(message, keyPath)
    return `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",serial_no="${serialNo}",timestamp="${timestamp}",nonce_str="${nonce}",signature="${signature}"`
  }

  private signRSA(message: string, keyPath: string): string {
    const pem = readFileSync(keyPath, 'utf-8')
    const signer = createSign('RSA-SHA256')
    signer.update(message)
    return signer.sign(pem, 'base64')
  }

  /**
   * 回调签名校验（新版"微信支付公钥"模式）—— 严格安全策略
   *
   * 微信回调请求头里会带：
   *   Wechatpay-Timestamp
   *   Wechatpay-Nonce
   *   Wechatpay-Serial    ← 现在等于 PUB_KEY_ID_xxx（新模式）
   *   Wechatpay-Signature ← Base64 RSA-SHA256(timestamp\nnonce\nbody\n) 签名
   *
   * 验证流程：
   *   1. 用 Wechatpay-Serial 在本地查找对应公钥（新模式下就用 WX_PAY_PUB_KEY_ID 对应的 .pem）
   *   2. 用公钥 verify(message) → 是否匹配签名
   *
   * 关键修复（资金安全 P0）：
   *   - 之前的非生产环境会"未配置就放行"，这给了开发期 Bypass 真实签名的可能，
   *     即任何人构造一个回调就能把订单标已付。
   *   - 现在不论环境，未配置微信支付就一律拒绝处理回调；
   *     开发期商家想本地联调真实支付，请配真实沙箱凭证。
   *   - 公钥缺失同样直接拒绝，绝不放行未验签的回调。
   */
  async verifyNotify(headers: Record<string, string>, bodyRaw: string): Promise<boolean> {
    if (!this.isReady()) {
      this.logger.error('[wxpay notify] 微信支付未配置（缺商户号/API V3 密钥/证书），拒绝处理回调')
      return false
    }

    const timestamp = headers['wechatpay-timestamp'] || headers['Wechatpay-Timestamp']
    const nonce = headers['wechatpay-nonce'] || headers['Wechatpay-Nonce']
    const serial = headers['wechatpay-serial'] || headers['Wechatpay-Serial']
    const signature = headers['wechatpay-signature'] || headers['Wechatpay-Signature']
    if (!timestamp || !nonce || !signature) {
      this.logger.warn('[wxpay notify] 缺少必需的微信支付签名头')
      return false
    }

    // 时间戳新鲜度校验：拒绝 ±5 分钟以外的回调，防止攻击者抓包后离线重放。
    // 微信官方建议范围 ±5min；超出窗口的回调即便签名正确也不再视为有效。
    // 解析失败（非数字）一律拒绝；正常微信回调始终是 unix 秒整数字符串。
    const tsNum = Number(timestamp)
    if (!Number.isFinite(tsNum)) {
      this.logger.warn(`[wxpay notify] Wechatpay-Timestamp 不是有效数字：${timestamp}`)
      return false
    }
    const skewSec = Math.abs(Date.now() / 1000 - tsNum)
    if (skewSec > 300) {
      this.logger.warn(
        `[wxpay notify] 时间戳超出 ±5min 窗口（skew=${skewSec.toFixed(1)}s），疑似回放，拒绝`,
      )
      return false
    }

    const pubKeyId = process.env.WX_PAY_PUB_KEY_ID || ''
    const pubKeyPath = process.env.WX_PAY_PUB_KEY_PATH || ''
    // 新模式：Wechatpay-Serial 应该匹配我们配置的 PUB_KEY_ID
    if (pubKeyId && serial && serial !== pubKeyId) {
      this.logger.warn(
        `[wxpay notify] Wechatpay-Serial 不匹配本地公钥 ID。expected=${pubKeyId} got=${serial}`,
      )
      return false
    }
    if (!pubKeyPath || !existsSync(pubKeyPath)) {
      this.logger.error(`[wxpay notify] 缺少微信支付公钥文件：${pubKeyPath}，拒绝回调`)
      return false
    }

    const pubKey = readFileSync(pubKeyPath, 'utf-8')
    const message = `${timestamp}\n${nonce}\n${bodyRaw}\n`
    const verifier = createVerify('RSA-SHA256')
    verifier.update(message)
    const ok = verifier.verify(pubKey, signature, 'base64')
    if (!ok) this.logger.warn('[wxpay notify] 签名验证失败')
    return ok
  }

  /**
   * 申请微信支付 v3 退款
   *
   * 接口：POST https://api.mch.weixin.qq.com/v3/refund/domestic/refunds
   *
   * 资金安全策略（不分环境）：
   *   - env 未配齐 → 直接抛错，绝不返回任何 mock 退款，
   *     防"凭空退钱"（开发期请配真实沙箱凭证）
   *   - 退款金额单位：元（内部 * 100 → 分）
   *
   * 返回：
   *   - { refundId, status: 'PROCESSING' | 'SUCCESS' }
   *   - SUCCESS 表示微信侧已即时确认（少见，多数为 PROCESSING + 异步回调）
   *   - 调用方应把 refundId 持久化，等待 wxpay 异步退款结果通知
   *
   * 注意：
   *   - 当前没有抽出独立的"通用 v3 POST 调用器"，因此这里直接复用 buildAuthHeader/signRSA，
   *     与 createMiniPay 风格保持一致
   *   - 真实微信会校验 out_refund_no 幂等：同一 out_refund_no 重发会返回先前结果
   *     业务侧务必为同一退款单复用同一 outRefundNo（refundId）
   */
  async createRefund(params: {
    outTradeNo: string
    outRefundNo: string
    reason?: string
    refundAmount: number
    totalAmount: number
  }): Promise<{ refundId: string; status: 'PROCESSING' | 'SUCCESS' }> {
    if (!params.outTradeNo || !params.outRefundNo) {
      throw new Error('createRefund: outTradeNo / outRefundNo 必填')
    }
    if (!(params.refundAmount > 0) || !(params.totalAmount > 0)) {
      throw new Error('createRefund: 金额必须为正')
    }
    if (params.refundAmount > params.totalAmount) {
      throw new Error('createRefund: 退款金额不能大于原订单金额')
    }

    if (!this.isReady()) {
      // 资金 P0：不分环境一律抛错，绝不返回任何 mock 退款
      throw new Error('微信支付未配置（缺商户号/API V3 密钥/证书），退款功能暂不可用')
    }

    const notifyUrl = process.env.WX_PAY_REFUND_NOTIFY_URL || process.env.WX_PAY_NOTIFY_URL || ''
    const keyPath = process.env.WX_PAY_KEY_PATH!

    const body: Record<string, any> = {
      out_trade_no: params.outTradeNo,
      out_refund_no: params.outRefundNo,
      reason: (params.reason || '').slice(0, 80) || undefined,
      notify_url: notifyUrl || undefined,
      amount: {
        refund: Math.round(params.refundAmount * 100),
        total: Math.round(params.totalAmount * 100),
        currency: 'CNY',
      },
    }
    const bodyStr = JSON.stringify(body)
    const urlPath = '/v3/refund/domestic/refunds'
    const auth = await this.buildAuthHeader('POST', urlPath, bodyStr, keyPath)

    const r = await fetch(`https://api.mch.weixin.qq.com${urlPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Language': 'zh-CN',
        Authorization: auth,
      },
      body: bodyStr,
    })
    const resp: any = await r.json().catch(() => ({}))
    if (!resp || !resp.refund_id) {
      this.logger.error(`[wxpay] refund failed: ${JSON.stringify(resp)}`)
      throw new Error(`微信退款失败：${resp?.message || resp?.code || 'unknown'}`)
    }
    // 微信文档：status 可能是 SUCCESS / PROCESSING / CLOSED / ABNORMAL
    // 这里只把"已处理中 / 已成功"两种当成同步成功返回，其余视作异常抛
    const status = resp.status as string | undefined
    if (status === 'SUCCESS' || status === 'PROCESSING') {
      return { refundId: resp.refund_id, status }
    }
    throw new Error(`微信退款返回异常状态：${status || 'unknown'}`)
  }

  /** 解密微信回调的 resource.ciphertext（AES-256-GCM） */
  decryptResource(resource: { ciphertext: string; associated_data?: string; nonce: string }): any {
    const v3Key = process.env.WX_PAY_API_V3_KEY || ''
    if (!v3Key) throw new Error('WX_PAY_API_V3_KEY 未配置')
    const buf = Buffer.from(resource.ciphertext, 'base64')
    const authTag = buf.slice(buf.length - 16)
    const data = buf.slice(0, buf.length - 16)
    const decipher = createDecipheriv(
      'aes-256-gcm',
      Buffer.from(v3Key, 'utf-8'),
      Buffer.from(resource.nonce, 'utf-8'),
    )
    decipher.setAuthTag(authTag)
    if (resource.associated_data) {
      decipher.setAAD(Buffer.from(resource.associated_data, 'utf-8'))
    }
    const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf-8')
    try {
      return JSON.parse(plain)
    } catch {
      return plain
    }
  }
}
