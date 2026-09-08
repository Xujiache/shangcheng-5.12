import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { ChatGateway } from './chat.gateway'
import { resolveJwtSecret } from '../../common/utils/jwt-secret.util'
import { HarmonyPushModule } from '../harmony-merchant/harmony-push.module'

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: resolveJwtSecret(config.get<string>('JWT_SECRET'), config.get<string>('NODE_ENV')),
      }),
    }),
    HarmonyPushModule,
  ],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ChatModule {}
