import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ChatGateway } from './chat.gateway'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'please-change-me-in-production',
    }),
  ],
  providers: [ChatGateway],
})
export class ChatModule {}
