/**
 * JWT 密钥解析（单一来源）。
 *
 * 抽取原因：AuthModule 与 ChatModule 此前各自持有一份同源副本，
 * 一旦其中一处调整（密钥长度阈值、生产环境拒绝策略、占位密钥），
 * 另一处极易遗漏而产生漂移，导致两端签发/校验 Token 行为不一致。
 *
 * - 生产环境：必须显式设置 JWT_SECRET，否则直接抛错让进程启动失败，
 *   避免使用占位字符串签发 Token（任何人都能伪造）。
 * - 非生产环境：允许临时使用占位密钥，方便本地启动。
 */
export function resolveJwtSecret(): string {
  const v = process.env.JWT_SECRET
  if (v && v.length >= 16) return v
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[security] 生产环境必须设置 JWT_SECRET (≥16 字符)，缺失或过短一律拒绝启动')
  }
  return v || 'dev-only-please-change-me-in-production'
}
