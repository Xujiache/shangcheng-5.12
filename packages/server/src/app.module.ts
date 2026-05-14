import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { ScheduleModule } from '@nestjs/schedule'
import { APP_GUARD } from '@nestjs/core'
import { PrismaModule } from './prisma/prisma.module'
import { HealthController } from './health.controller'
import { AuthModule } from './modules/auth/auth.module'
import { FilesModule } from './modules/files/files.module'
import { UserMpModule } from './modules/user-mp/user-mp.module'
import { MerchantModule } from './modules/merchant/merchant.module'
import { PlatformModule } from './modules/platform/platform.module'
import { ChatModule } from './modules/chat/chat.module'
import { SmsModule } from './modules/sms/sms.module'
import { PaymentModule } from './modules/payment/payment.module'
import { LegalModule } from './modules/legal/legal.module'
import { AppReleaseModule } from './modules/app-release/app-release.module'
import { JwtAuthGuard } from './common/guards/jwt.guard'

/**
 * 多档限流（修复 P1-25）
 *
 * 之前只有一个全局 60/min 桶，登录爆破 / SMS 轰炸 / 支付回调风暴都用同一档，
 * 攻击者可以用 59 次/分钟的合法节奏不停爆破登录而不触发限流。
 *
 * 现按场景拆 4 档：
 *   - default       60 / 60s  常规读 API 兜底
 *   - auth          10 / 60s  登录 / refresh / admin-login —— 防爆破
 *   - sms            3 / 60s  发短信验证码 —— 防短信轰炸（同 IP 1 分钟最多 3 次）
 *   - payment-notify 200 / 60s 微信回调专用 —— 微信会高频重试，给宽松桶避免误杀
 *
 * 每个 controller 用 @Throttle({ <name>: { limit, ttl } }) 显式覆盖。
 * 未显式声明的 endpoint 走 `default` 桶。
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 60 },
      { name: 'auth', ttl: 60_000, limit: 10 },
      { name: 'sms', ttl: 60_000, limit: 3 },
      { name: 'payment-notify', ttl: 60_000, limit: 200 },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    FilesModule,
    UserMpModule,
    MerchantModule,
    PlatformModule,
    ChatModule,
    SmsModule,
    PaymentModule,
    LegalModule,
    AppReleaseModule,
  ],
  controllers: [HealthController],
  providers: [
    // 全局守卫按数组顺序执行：JWT 鉴权先于限流，
    // 这样匿名滥用请求会被 JWT 的 @Public/Unauthorized 优先处理，
    // 已登录用户再走 IP 限流策略（避免限流提前触发让登录页都打不开）
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
