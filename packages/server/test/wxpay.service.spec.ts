import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { createCipheriv, createSign, generateKeyPairSync, randomBytes } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { WxPayService } from '../src/modules/payment/wxpay.service'

// ----------------------------------------------------------------------------
// WxPayService — 微信支付 v3 · 资金安全行为契约测试
//
// 实现位置：packages/server/src/modules/payment/wxpay.service.ts
// 核心立场（资金 P0）：未配置 / 验签失败一律拒绝，绝不返回任何 mock 支付 / 退款 / 放行。
//
// WxPayService 没有构造依赖，直接 new。所有配置通过 process.env 驱动，
// 因此每个用例前备份并清空相关 env，用例后恢复，互不污染。
// 涉及文件的（私钥/公钥）写入 os.tmpdir()，整套结束后删目录。
// ----------------------------------------------------------------------------

// 本服务读取的全部 env key（含 readiness / 验签 / 解密 / 退款）
const ENV_KEYS = [
  'WX_MINIAPP_APPID',
  'WX_PAY_MCH_ID',
  'WX_PAY_API_V3_KEY',
  'WX_PAY_KEY_PATH',
  'WX_PAY_CERT_PATH',
  'WX_PAY_NOTIFY_URL',
  'WX_PAY_REFUND_NOTIFY_URL',
  'WX_PAY_CERT_SERIAL',
  'WX_PAY_PUB_KEY_ID',
  'WX_PAY_PUB_KEY_PATH',
]

describe('WxPayService 微信支付 v3 资金安全契约', () => {
  let service: WxPayService
  let tmpDir: string
  const backup: Record<string, string | undefined> = {}

  beforeEach(() => {
    service = new WxPayService()
    tmpDir = mkdtempSync(join(tmpdir(), 'wxpay-test-'))
    // 备份并清空所有相关 env，确保每个用例从"未配置"起步
    for (const k of ENV_KEYS) {
      backup[k] = process.env[k]
      delete process.env[k]
    }
  })

  afterEach(() => {
    // 恢复 env 原值
    for (const k of ENV_KEYS) {
      if (backup[k] === undefined) delete process.env[k]
      else process.env[k] = backup[k]
    }
    rmSync(tmpDir, { recursive: true, force: true })
  })

  /** 写一个真实存在的临时私钥文件并返回路径（仅用于让 existsSync/readFileSync 通过） */
  function writeTempKeyFile(name: string, content: string): string {
    const p = join(tmpDir, name)
    writeFileSync(p, content, 'utf-8')
    return p
  }

  /** 配齐 isReady 所需的 4 个 env + 真实私钥文件，返回该私钥路径 */
  function makeReady(): string {
    const keyPath = writeTempKeyFile('apiclient_key.pem', 'dummy-private-key')
    process.env.WX_MINIAPP_APPID = 'wxe8ed8b7d9d154165'
    process.env.WX_PAY_MCH_ID = '1745510292'
    process.env.WX_PAY_API_V3_KEY = 'a'.repeat(32)
    process.env.WX_PAY_KEY_PATH = keyPath
    return keyPath
  }

  // --------------------------------------------------------------------------
  // 1. isReady
  // --------------------------------------------------------------------------
  describe('isReady', () => {
    it('env 未配齐时返回 false', () => {
      expect(service.isReady()).toBe(false)
    })

    it('4 个 env 配齐且私钥文件真实存在时返回 true', () => {
      makeReady()
      expect(service.isReady()).toBe(true)
    })

    it('env 配齐但私钥文件路径不存在时返回 false', () => {
      process.env.WX_MINIAPP_APPID = 'wxe8ed8b7d9d154165'
      process.env.WX_PAY_MCH_ID = '1745510292'
      process.env.WX_PAY_API_V3_KEY = 'a'.repeat(32)
      process.env.WX_PAY_KEY_PATH = join(tmpDir, 'not-exists.pem')
      expect(service.isReady()).toBe(false)
    })
  })

  // --------------------------------------------------------------------------
  // 2. createMiniPay —— 资金红线：未配置绝不返回任何 mock 支付
  // --------------------------------------------------------------------------
  describe('createMiniPay', () => {
    it('未配置时直接 reject，绝不返回占位 prepay', async () => {
      await expect(
        service.createMiniPay({
          outTradeNo: 'OT123',
          description: '测试商品',
          totalFen: 100,
          openid: 'openid_test',
        }),
      ).rejects.toThrow('微信支付未配置')
    })
  })

  // --------------------------------------------------------------------------
  // 3. createRefund —— 参数校验 + 未配置拒绝
  // --------------------------------------------------------------------------
  describe('createRefund', () => {
    it('缺少 outTradeNo / outRefundNo 时抛错', async () => {
      await expect(
        service.createRefund({
          outTradeNo: '',
          outRefundNo: 'RF1',
          refundAmount: 1,
          totalAmount: 1,
        }),
      ).rejects.toThrow('outTradeNo / outRefundNo 必填')

      await expect(
        service.createRefund({
          outTradeNo: 'OT1',
          outRefundNo: '',
          refundAmount: 1,
          totalAmount: 1,
        }),
      ).rejects.toThrow('outTradeNo / outRefundNo 必填')
    })

    it('金额 <= 0 时抛错', async () => {
      await expect(
        service.createRefund({
          outTradeNo: 'OT1',
          outRefundNo: 'RF1',
          refundAmount: 0,
          totalAmount: 10,
        }),
      ).rejects.toThrow('金额必须为正')

      await expect(
        service.createRefund({
          outTradeNo: 'OT1',
          outRefundNo: 'RF1',
          refundAmount: 5,
          totalAmount: -1,
        }),
      ).rejects.toThrow('金额必须为正')
    })

    it('退款金额大于原订单金额时抛错', async () => {
      await expect(
        service.createRefund({
          outTradeNo: 'OT1',
          outRefundNo: 'RF1',
          refundAmount: 20,
          totalAmount: 10,
        }),
      ).rejects.toThrow('退款金额不能大于原订单金额')
    })

    it('参数合法但未配置微信支付时抛错（提示未配置）', async () => {
      await expect(
        service.createRefund({
          outTradeNo: 'OT1',
          outRefundNo: 'RF1',
          refundAmount: 5,
          totalAmount: 10,
        }),
      ).rejects.toThrow('微信支付未配置')
    })
  })

  // --------------------------------------------------------------------------
  // 4. verifyNotify —— 拒绝链（任一异常即 false，绝不放行）
  // --------------------------------------------------------------------------
  describe('verifyNotify 拒绝链', () => {
    const validBody = '{"id":"evt_1"}'

    it('未配置微信支付 -> false', async () => {
      const ok = await service.verifyNotify(
        {
          'wechatpay-timestamp': String(Math.floor(Date.now() / 1000)),
          'wechatpay-nonce': 'nonce1',
          'wechatpay-signature': 'sig',
        },
        validBody,
      )
      expect(ok).toBe(false)
    })

    it('已配置但缺少签名头 -> false', async () => {
      makeReady()
      const ok = await service.verifyNotify(
        {
          'wechatpay-timestamp': String(Math.floor(Date.now() / 1000)),
          'wechatpay-nonce': 'nonce1',
          // 缺 signature
        },
        validBody,
      )
      expect(ok).toBe(false)
    })

    it('Wechatpay-Timestamp 非数字 -> false', async () => {
      makeReady()
      const ok = await service.verifyNotify(
        {
          'wechatpay-timestamp': 'not-a-number',
          'wechatpay-nonce': 'nonce1',
          'wechatpay-signature': 'sig',
        },
        validBody,
      )
      expect(ok).toBe(false)
    })

    it('时间戳偏移 400s（超出 ±300s 回放窗口）-> false', async () => {
      makeReady()
      const staleTs = String(Math.floor(Date.now() / 1000) - 400)
      const ok = await service.verifyNotify(
        {
          'wechatpay-timestamp': staleTs,
          'wechatpay-nonce': 'nonce1',
          'wechatpay-signature': 'sig',
        },
        validBody,
      )
      expect(ok).toBe(false)
    })

    it('WX_PAY_PUB_KEY_ID 与 Wechatpay-Serial 不匹配 -> false', async () => {
      makeReady()
      process.env.WX_PAY_PUB_KEY_ID = 'PUB_KEY_ID_LOCAL'
      // 即便给了公钥文件，serial 不匹配也应先被拒
      process.env.WX_PAY_PUB_KEY_PATH = writeTempKeyFile('pub.pem', 'dummy-pub')
      const ok = await service.verifyNotify(
        {
          'wechatpay-timestamp': String(Math.floor(Date.now() / 1000)),
          'wechatpay-nonce': 'nonce1',
          'wechatpay-signature': 'sig',
          'wechatpay-serial': 'PUB_KEY_ID_REMOTE_DIFFERENT',
        },
        validBody,
      )
      expect(ok).toBe(false)
    })

    it('公钥文件路径缺失 -> false', async () => {
      makeReady()
      // 不设置 WX_PAY_PUB_KEY_PATH（或指向不存在的文件）
      process.env.WX_PAY_PUB_KEY_PATH = join(tmpDir, 'missing-pub.pem')
      const ok = await service.verifyNotify(
        {
          'wechatpay-timestamp': String(Math.floor(Date.now() / 1000)),
          'wechatpay-nonce': 'nonce1',
          'wechatpay-signature': 'sig',
        },
        validBody,
      )
      expect(ok).toBe(false)
    })
  })

  // --------------------------------------------------------------------------
  // 5. verifyNotify 真实签名验证（RSA-SHA256）
  // --------------------------------------------------------------------------
  describe('verifyNotify 真实签名', () => {
    it('正确签名 -> true；篡改 body -> false', async () => {
      makeReady()

      const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
      })
      const pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString()
      process.env.WX_PAY_PUB_KEY_PATH = writeTempKeyFile('wxpay_pub.pem', pubPem)
      // PUB_KEY_ID 与 Wechatpay-Serial 都不设置 -> serial 匹配检查被跳过

      const timestamp = String(Math.floor(Date.now() / 1000))
      const nonce = randomBytes(16).toString('hex')
      const rawBody = '{"id":"evt_real","resource":{}}'

      // 微信约定签名串：timestamp\nnonce\nbody\n
      const message = `${timestamp}\n${nonce}\n${rawBody}\n`
      const signer = createSign('RSA-SHA256')
      signer.update(message)
      const signature = signer.sign(privateKey, 'base64')

      const headers = {
        'wechatpay-timestamp': timestamp,
        'wechatpay-nonce': nonce,
        'wechatpay-signature': signature,
      }

      // 正确 body + 正确签名 -> 通过
      await expect(service.verifyNotify(headers, rawBody)).resolves.toBe(true)

      // 篡改 body（签名不变）-> 拒绝
      await expect(service.verifyNotify(headers, rawBody + 'tampered')).resolves.toBe(false)
    })

    it('Wechatpay-Serial 与本地 PUB_KEY_ID 一致时仍能验签通过', async () => {
      makeReady()
      const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
      })
      const pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString()
      process.env.WX_PAY_PUB_KEY_PATH = writeTempKeyFile('wxpay_pub.pem', pubPem)
      process.env.WX_PAY_PUB_KEY_ID = 'PUB_KEY_ID_MATCH'

      const timestamp = String(Math.floor(Date.now() / 1000))
      const nonce = randomBytes(16).toString('hex')
      const rawBody = '{"id":"evt_serial_match"}'
      const message = `${timestamp}\n${nonce}\n${rawBody}\n`
      const signer = createSign('RSA-SHA256')
      signer.update(message)
      const signature = signer.sign(privateKey, 'base64')

      const ok = await service.verifyNotify(
        {
          'wechatpay-timestamp': timestamp,
          'wechatpay-nonce': nonce,
          'wechatpay-signature': signature,
          'wechatpay-serial': 'PUB_KEY_ID_MATCH',
        },
        rawBody,
      )
      expect(ok).toBe(true)
    })
  })

  // --------------------------------------------------------------------------
  // 6. decryptResource —— AES-256-GCM 往返
  // --------------------------------------------------------------------------
  describe('decryptResource (AES-256-GCM)', () => {
    it('正确密文可解出原 JSON 对象', () => {
      const v3Key = 'k'.repeat(32) // 32 字节 APIv3 密钥
      process.env.WX_PAY_API_V3_KEY = v3Key

      const payload = { transaction_id: 'TX123', trade_state: 'SUCCESS', amount: { total: 1 } }
      const plaintext = JSON.stringify(payload)
      const nonce = randomBytes(12).toString('hex').slice(0, 12) // 12 字节 nonce
      const associatedData = 'transaction'

      const cipher = createCipheriv(
        'aes-256-gcm',
        Buffer.from(v3Key, 'utf-8'),
        Buffer.from(nonce, 'utf-8'),
      )
      cipher.setAAD(Buffer.from(associatedData, 'utf-8'))
      const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()])
      const authTag = cipher.getAuthTag()
      // 微信约定：ciphertext = base64(密文 + authTag)
      const ciphertext = Buffer.concat([encrypted, authTag]).toString('base64')

      const decoded = service.decryptResource({
        ciphertext,
        associated_data: associatedData,
        nonce,
      })
      expect(decoded).toEqual(payload)
    })

    it('未配置 WX_PAY_API_V3_KEY 时抛错', () => {
      // beforeEach 已清空 WX_PAY_API_V3_KEY
      expect(() =>
        service.decryptResource({
          ciphertext: 'whatever',
          nonce: 'n'.repeat(12),
        }),
      ).toThrow('WX_PAY_API_V3_KEY 未配置')
    })
  })
})
