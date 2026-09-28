import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { Public } from '../../common/decorators/public.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import { CurrentLedgerUser, LedgerAuthUser } from './decorators/current-ledger-user.decorator'
import { LedgerJwtGuard } from './guards/ledger-jwt.guard'
import { ToolEventsService } from './tool-events.service'

@ApiTags('门窗利账-工具使用')
@Public()
@UseGuards(LedgerJwtGuard)
@Controller('l/tools')
export class ToolEventsController {
  constructor(private readonly events: ToolEventsService) {}

  @Post('events')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  submit(@CurrentLedgerUser() user: LedgerAuthUser, @Body() body: unknown) {
    return this.events.submit(user.id, body)
  }
}

@ApiTags('门窗利账-后台')
@UseGuards(RolesGuard)
@Roles('platform', 'super-admin')
@Controller('p/ledger/users/:id/tools')
export class LedgerToolAdminController {
  constructor(private readonly events: ToolEventsService) {}

  @Get('summary')
  summary(@Param('id') id: string) {
    return this.events.summary(id)
  }

  @Get('events')
  timeline(@Param('id') id: string, @Query() query: Record<string, unknown>) {
    return this.events.timeline(id, query)
  }
}
