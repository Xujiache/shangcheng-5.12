import { Module } from '@nestjs/common'
import { LedgerJwtGuard } from '../ledger/guards/ledger-jwt.guard'
import { ConversionController } from './conversion.controller'
import { ConversionAdminController } from './conversion-admin.controller'
import { ConversionService } from './conversion.service'

@Module({
  controllers: [ConversionController, ConversionAdminController],
  providers: [ConversionService, LedgerJwtGuard],
})
export class ConversionModule {}
