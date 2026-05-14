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
 * 单桶限流（v2 修复）
 *
 * 之前用 5 桶配置（default/auth/sms/upload/payment-notify），但 @nestjs/throttler v6
 * 的实际行为是「每个请求评估所有桶」—— 任何端点都会被 sms(3/min) 这种严桶夹击 → 误杀，
 * 例如管理员登录会因为 sms 桶 3/min 上限被卡死返回 429 ThrottlerException。
 *
 * 修复策略：只留一个 default 桶（120/min），需要更严的端点用
 *   @Throttle({ default: { limit: X, ttl: 60_000 } })
 * 在 handler 上覆盖（这是 throttler v6 唯一可靠的 per-handler 覆盖姿势）。
 *
 * 当前端点限速：
 *   - 默认所有端点                  120 / 60s
 *   - /auth/admin-login + 登录类     10 / 60s   防爆破
 *   - /auth/sms-code                  3 / 60s   防短信轰炸
 *   - /files/upload                  60 / 60s   商品编辑批量上传需要
 *   - /payments/wechat/notify        200 / 60s 微信回调高频重试
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    // ⚠️ 单桶模式（不要再加额外桶名！）
    //
    // @nestjs/throttler v6 行为：注册多个桶 → 每个请求被所有桶逐个评估，
    // 最严的桶会卡死所有端点（哪怕端点没 @Throttle 任何桶）。
    // 实测：登录第 4 次 → sms 桶 3/min 触发 429（截图日期 2026-05-15）。
    //
    // 单桶 + 端点级 @Throttle({ default: { limit: X, ttl: 60_000 } }) 覆盖
    // 是唯一可靠的姿势。需要 stricter / looser 的端点用本地 override：
    //   - /auth/admin-login 等登录类   limit: 10
    //   - /auth/sms-code              limit: 3
    //   - /files/upload               limit: 60
    //   - /payments/wechat/notify     limit: 200
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 120 },
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
