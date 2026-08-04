/**
 * 微信支付 mchid + 证书 + APIv3 密钥 一致性自检
 *
 * 用法：cd /www/shangcheng/packages/server && tsx scripts/verify-wxpay.ts [mchid]
 *
 * 调微信支付 GET /v3/certificates（最轻量、无业务副作用的接口）
 * - 返回 200 → mchid + 证书 + serial 三者一致，可以正常下单
 * - 返回 401 → 签名/证书/mchid 不匹配
 *
 * 用此脚本分别试两个 mchid，哪个返回 200，就在 .env 里固定下来。
 */
import { createSign, randomBytes } from 'crypto'
import { readFileSync } from 'fs'

const candidateMchid = process.argv[2] || process.env.WX_PAY_MCH_ID || '1745510292'
const serial = process.env.WX_PAY_CERT_SERIAL || ''
const keyPath = process.env.WX_PAY_KEY_PATH || '/www/shangcheng/secrets/wxpay/apiclient_key.pem'

function signRSA(message: string): string {
  const pem = readFileSync(keyPath, 'utf-8')
  const signer = createSign('RSA-SHA256')
  signer.update(message)
  return signer.sign(pem, 'base64')
}

async function probe(mchid: string) {
  const method = 'GET'
  const urlPath = '/v3/certificates'
  const timestamp = Math.floor(Date.now() / 1000)
  const nonce = randomBytes(16).toString('hex')
  const message = [method, urlPath, timestamp, nonce, ''].join('\n') + '\n'
  const signature = signRSA(message)
  const auth = `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",serial_no="${serial}",timestamp="${timestamp}",nonce_str="${nonce}",signature="${signature}"`

  const r = await fetch(`https://api.mch.weixin.qq.com${urlPath}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'zh-CN',
      'User-Agent': 'jingwei-verify/1.0',
      Authorization: auth,
    },
  })
  const text = await r.text()
  return { status: r.status, body: text.slice(0, 500) }
}

;(async () => {
  console.log(`\n>>> 验证 mchid = ${candidateMchid}`)
  console.log(`>>> serial = ${serial.slice(0, 8)}...${serial.slice(-8)}`)
  console.log(`>>> key = ${keyPath}\n`)
  const r = await probe(candidateMchid)
  console.log(`HTTP ${r.status}`)
  console.log(r.body)
  if (r.status === 200) {
    console.log('\n✅ 此 mchid 配置正确，可以下单')
  } else if (r.status === 401) {
    console.log('\n❌ 签名/mchid/证书 不匹配。错误详情见上面 body。')
  } else {
    console.log(`\n⚠️  其它响应（${r.status}），可能是 v3key 或别的问题`)
  }
})().catch((e) => {
  console.error('verify failed:', e?.message || e)
  process.exit(1)
})
