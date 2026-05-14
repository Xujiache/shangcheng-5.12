import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { AdminPcCompatController } from './admin-pc-compat.controller'

/**
 * JWT 密钥解析。
 *
 * - 生产环境：必须显式设置 JWT_SECRET，否则直接抛错让进程启动失败，
 *   避免使用占位字符串签发 Token（任何人都能伪造）。
 * - 非生产环境：允许临时使用占位密钥，方便本地启动。
 */
function resolveJwtSecret(): string {
  const v = process.env.JWT_SECRET
  if (v && v.length >= 16) return v
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[security] 生产环境必须设置 JWT_SECRET (≥16 字符)，缺失或过短一律拒绝启动',
    )
  }
  return v || 'dev-only-please-change-me-in-production'
}

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: resolveJwtSecret(),
      signOptions: { expiresIn: '2h' },
    }),
  ],
  controllers: [AuthController, AdminPcCompatController],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
