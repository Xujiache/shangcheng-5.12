import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ChatGateway } from './chat.gateway'

/** 与 AuthModule.resolveJwtSecret 同源；保留独立函数避免循环依赖。 */
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
      secret: resolveJwtSecret(),
    }),
  ],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ChatModule {}
