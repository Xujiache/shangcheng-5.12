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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
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
