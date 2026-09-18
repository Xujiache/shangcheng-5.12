import { Global, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { resolveJwtSecret } from '../../common/utils/jwt-secret.util'
import { HarmonyRealtimeService } from './harmony-realtime.service'

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: resolveJwtSecret(config.get<string>('JWT_SECRET'), config.get<string>('NODE_ENV')),
      }),
    }),
  ],
  providers: [HarmonyRealtimeService],
  exports: [HarmonyRealtimeService],
})
export class HarmonyRealtimeModule {}
