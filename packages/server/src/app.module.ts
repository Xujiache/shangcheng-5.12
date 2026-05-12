import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { ScheduleModule } from '@nestjs/schedule'
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
  ],
  controllers: [HealthController],
})
export class AppModule {}
