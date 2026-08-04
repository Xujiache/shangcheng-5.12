import { Module } from '@nestjs/common'
import { LegalService } from './legal.service'
import { LegalPublicController, LegalAdminController } from './legal.controller'

@Module({
  controllers: [LegalPublicController, LegalAdminController],
  providers: [LegalService],
  exports: [LegalService],
})
export class LegalModule {}
