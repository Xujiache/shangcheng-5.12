import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { randomUUID } from 'node:crypto'
import { Public } from '../../common/decorators/public.decorator'
import { GlassEstimateDto } from './dto/glass-estimate.dto'
import { CurrentLedgerUser, LedgerAuthUser } from './decorators/current-ledger-user.decorator'
import { LedgerJwtGuard } from './guards/ledger-jwt.guard'
import { GlassToolService } from './glass-tool.service'
import { ToolEventsService } from './tool-events.service'

@ApiTags('门窗利账-玻璃计算')
@Public()
@UseGuards(LedgerJwtGuard)
@Controller('l/tools/glass')
export class GlassToolController {
  constructor(
    private readonly service: GlassToolService,
    private readonly events: ToolEventsService,
  ) {}

  @Post('estimate')
  @HttpCode(200)
  async estimate(@CurrentLedgerUser() user: LedgerAuthUser, @Body() dto: GlassEstimateDto) {
    const sourceId = randomUUID()
    let result: Awaited<ReturnType<GlassToolService['estimate']>>
    try {
      result = await this.service.estimate(dto)
    } catch (error) {
      await this.events.recordServerEvent(user.id, 'glass', 'failure', sourceId)
      throw error
    }
    await this.events.recordServerEvent(user.id, 'glass', 'success', sourceId)
    return result
  }
}
