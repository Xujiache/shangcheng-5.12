import { Module } from '@nestjs/common'
import { UserMpController } from './user-mp.controller'
import { UserMpService } from './user-mp.service'
import { ChatModule } from '../chat/chat.module'

@Module({
  imports: [ChatModule],
  controllers: [UserMpController],
  providers: [UserMpService],
})
export class UserMpModule {}
