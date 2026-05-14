import { describe, it } from '@jest/globals'

// ----------------------------------------------------------------------------
// AuthService — 鉴权核心
//
// 实现位置：packages/server/src/modules/auth/auth.service.ts
//          packages/server/src/modules/auth/refresh-token-blacklist.service.ts
//
// 关键点：
//   - refresh token rotation：每次 refresh 必须签发新 refresh_token，
//     且把旧 token 的 jti 加入黑名单（防止旧 token 重复使用）
//   - admin-login：账号 / 密码登录走 argon2 验证，错误 N 次后限流
//   - jti 黑名单：JwtGuard 必须先查黑名单再放行，被踢的 token 立即失效
//
// 占位骨架 — 等 prisma mock + Redis mock（黑名单存储）就绪后转正。
// ----------------------------------------------------------------------------
describe.skip('AuthService.refreshToken (rotation)', () => {
  it.todo('issues a NEW refresh_token on each call (different jti)')

  it.todo('adds the OLD jti to blacklist (so reused old refresh_token gets rejected)')

  it.todo('rejects when current refresh_token jti is already in blacklist (replay attack)')

  it.todo('rejects when refresh_token signature is invalid or expired')
})

describe.skip('AuthService.adminLogin', () => {
  it.todo('verifies password via argon2.verify (not plain comparison)')

  it.todo('returns access_token + refresh_token on success, with role embedded in payload')

  it.todo('throws BizException(UNAUTHORIZED) on wrong password (not generic 500)')

  it.todo('throws BizException(NOT_FOUND) on unknown account (do NOT leak which field is wrong)')
})

describe.skip('JwtGuard + RefreshTokenBlacklistService integration', () => {
  it.todo('blacklisted jti is rejected even if signature + expiry are valid')

  it.todo('non-blacklisted jti passes through guard normally')
})
