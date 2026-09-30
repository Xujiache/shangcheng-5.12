import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, UseFilters, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { Public } from '../../common/decorators/public.decorator'
import { PrismaService } from '../../prisma/prisma.service'
import { METAL_MATERIALS, normalizeMetalConfig } from './metal.config'
import { CurrentLedgerUser, LedgerAuthUser } from './decorators/current-ledger-user.decorator'
import { LedgerJwtGuard } from './guards/ledger-jwt.guard'
import { LedgerMembershipGuard } from './guards/ledger-membership.guard'
import { CreateMetalQuoteDto, MetalQuoteQueryDto } from './dto/metal-quote.dto'
import { MetalQuoteService } from './metal-quote.service'
import { MetalToolExceptionFilter } from './metal-tool-exception.filter'

@ApiTags('门窗利账-金属计算器')
@Public()
@UseFilters(MetalToolExceptionFilter)
@Controller('l/tools/metal')
export class MetalToolController {
  constructor(private readonly prisma: PrismaService, private readonly quotes: MetalQuoteService) {}

  @Get('config')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async config() {
    const row = await this.prisma.ledgerConfig.findUnique({ where: { key: 'metal' } })
    return { ...normalizeMetalConfig(row?.value), materials: METAL_MATERIALS }
  }

  @Post('quote')
  @HttpCode(200)
  @UseGuards(LedgerJwtGuard, LedgerMembershipGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  create(@CurrentLedgerUser() user: LedgerAuthUser, @Body() dto: CreateMetalQuoteDto) {
    return this.quotes.create(user.id, dto)
  }

  @Get('quotes')
  @UseGuards(LedgerJwtGuard, LedgerMembershipGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  list(@CurrentLedgerUser() user: LedgerAuthUser, @Query() query: MetalQuoteQueryDto) {
    return this.quotes.list(user.id, query.skip, query.take)
  }

  @Delete('quotes/:id')
  @UseGuards(LedgerJwtGuard, LedgerMembershipGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  remove(@CurrentLedgerUser() user: LedgerAuthUser, @Param('id') id: string) {
    return this.quotes.remove(user.id, id)
  }

  @Post('quotes/:id/export')
  @HttpCode(200)
  @UseGuards(LedgerJwtGuard, LedgerMembershipGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  export(@CurrentLedgerUser() user: LedgerAuthUser, @Param('id') id: string) {
    return this.quotes.get(user.id, id)
  }
}
