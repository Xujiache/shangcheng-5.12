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
 *
 * 当前状态：
 *   - 商户号申请中，env 留空 → prepay() 会返回 mock prepay_id 让流程跑通
 *   - 用户回填 4 个 env + 上传 2 个 pem 文件 → 自动切到真实下单
 */
import { Injectable, Logger } from '@nestjs/common'
import { createDecipheriv, createSign, createVerify, randomBytes } from 'crypto'
import { readFileSync, existsSync } from 'fs'

export interface PrepayParams {
  outTradeNo: string
  description: string
  totalFen: number          // 单位：分
  openid: string            // 用户 openid（必填）
  attach?: string           // 附加数据
}

/** 小程序端 uni.requestPayment 需要的字段 */
export interface MiniPayInvoke {
  appId: string
  timeStamp: string
  nonceStr: string
  package: string           // "prepay_id=xxx"
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
      // mock 兜底：商户号未配齐时，返回一个假的 prepay 参数让前端可以走通流程
      return this.mockMiniPay(args)
    }

    const appid = process.env.WX_MINIAPP_APPID!
    const mchid = process.env.WX_PAY_MCH_ID!
    const notifyUrl = process.env.WX_PAY_NOTIFY_URL!
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

  private mockMiniPay(args: PrepayParams): MiniPayInvoke {
    this.logger.warn(`[wxpay] 商户号未配齐，使用 mock prepay：${args.outTradeNo}`)
    return {
      appId: process.env.WX_MINIAPP_APPID || 'wx-mock-appid',
      timeStamp: String(Math.floor(Date.now() / 1000)),
      nonceStr: randomBytes(16).toString('hex'),
      package: `prepay_id=mock_${args.outTradeNo}`,
      signType: 'RSA',
      paySign: 'MOCK_SIGNATURE',
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
   * 回调签名校验（新版"微信支付公钥"模式）
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
   * 没配公钥（PUB_KEY_PATH 文件不存在）→ 视为预览模式直接放行
   */
  async verifyNotify(headers: Record<string, string>, bodyRaw: string): Promise<boolean> {
    if (!this.isReady()) return true

    const timestamp = headers['wechatpay-timestamp'] || headers['Wechatpay-Timestamp']
    const nonce = headers['wechatpay-nonce'] || headers['Wechatpay-Nonce']
    const serial = headers['wechatpay-serial'] || headers['Wechatpay-Serial']
    const signature = headers['wechatpay-signature'] || headers['Wechatpay-Signature']
    if (!timestamp || !nonce || !signature) {
      this.logger.warn('[wxpay notify] 缺少必需的微信支付签名头')
      return false
    }

    const pubKeyId = process.env.WX_PAY_PUB_KEY_ID || ''
    const pubKeyPath = process.env.WX_PAY_PUB_KEY_PATH || ''
    // 新模式：Wechatpay-Serial 应该匹配我们配置的 PUB_KEY_ID
    if (pubKeyId && serial && serial !== pubKeyId) {
      this.logger.warn(`[wxpay notify] Wechatpay-Serial 不匹配本地公钥 ID。expected=${pubKeyId} got=${serial}`)
      return false
    }
    if (!pubKeyPath || !existsSync(pubKeyPath)) {
      this.logger.warn(`[wxpay notify] 微信支付公钥文件不存在：${pubKeyPath}。视为预览模式跳过验签（生产请补齐！）`)
      return true
    }

    const pubKey = readFileSync(pubKeyPath, 'utf-8')
    const message = `${timestamp}\n${nonce}\n${bodyRaw}\n`
    const verifier = createVerify('RSA-SHA256')
    verifier.update(message)
    const ok = verifier.verify(pubKey, signature, 'base64')
    if (!ok) this.logger.warn('[wxpay notify] 签名验证失败')
    return ok
  }

  /** 解密微信回调的 resource.ciphertext（AES-256-GCM） */
  decryptResource(resource: { ciphertext: string; associated_data?: string; nonce: string }): any {
    const v3Key = process.env.WX_PAY_API_V3_KEY || ''
    if (!v3Key) throw new Error('WX_PAY_API_V3_KEY 未配置')
    const buf = Buffer.from(resource.ciphertext, 'base64')
    const authTag = buf.slice(buf.length - 16)
    const data = buf.slice(0, buf.length - 16)
    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(v3Key, 'utf-8'), Buffer.from(resource.nonce, 'utf-8'))
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
