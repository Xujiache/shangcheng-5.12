import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ChatGateway } from './chat.gateway'
import { resolveJwtSecret } from '../../common/utils/jwt-secret.util'

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
