// Explicit one-shot OAuth probe. Never sends a push or prints credentials/responses.
import { constants, createPublicKey, verify } from 'node:crypto'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { HarmonyPushService } = require('../dist/modules/harmony-merchant/harmony-push.service.js')
const endpoint = 'https://oauth-login.cloud.huawei.com/oauth2/v3/token'
try {
  if (process.env.HUAWEI_PUSH_TEST_MESSAGE !== '1') throw Error('test_mode_required')
  const service = new HarmonyPushService({})
  const credentials = service.getCredentials()
  if (!credentials) throw Error('credentials_unavailable')
  const jwt = service.getServiceJwt(credentials)
  const [headerPart, payloadPart, signature] = jwt.split('.')
  const header = JSON.parse(Buffer.from(headerPart, 'base64url'))
  const claims = JSON.parse(Buffer.from(payloadPart, 'base64url'))
  const now = Math.floor(Date.now() / 1000)
  if (header.alg !== 'PS256' || claims.iss !== credentials.subAccount || claims.aud !== endpoint || claims.iat > now || claims.exp <= now || claims.exp - claims.iat > 3600) throw Error('invalid_claims')
  if (!verify('sha256', Buffer.from(`${headerPart}.${payloadPart}`), { key: createPublicKey(credentials.privateKey), padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: constants.RSA_PSS_SALTLEN_DIGEST }, Buffer.from(signature, 'base64url'))) throw Error('invalid_signature')
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
    signal: AbortSignal.timeout(15000),
  })
  const data = await response.json()
  const ok = response.ok && typeof data.access_token === 'string' && data.access_token.length > 0
  const error = String(data.error || data.error_code || '')
  console.log(JSON.stringify({ signatureVerified: true, testMode: true, tokenExchange: ok, httpStatus: response.status, error: /^[a-zA-Z0-9_-]{1,50}$/.test(error) ? error : undefined, pushSent: false }))
  if (!ok) process.exitCode = 1
} catch {
  console.log(JSON.stringify({ tokenExchange: false, error: 'local_validation_or_transport_failure', pushSent: false }))
  process.exitCode = 1
}
