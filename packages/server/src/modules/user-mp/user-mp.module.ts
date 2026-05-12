import { Module } from '@nestjs/common'
import { UserMpController } from './user-mp.controller'
import { UserMpService } from './user-mp.service'

@Module({ controllers: [UserMpController], providers: [UserMpService] })
export class UserMpModule {}
