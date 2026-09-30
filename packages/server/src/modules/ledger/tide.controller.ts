import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { Public } from '../../common/decorators/public.decorator'
import { TideService } from './tide.service'

@ApiTags('门窗利账-潮汐表')
@Public()
@Controller('l/tides')
export class TideController {
  constructor(private readonly tide: TideService) {}

  @Get('stations')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  stations(@Query('q') query = '') { return this.tide.search(query) }

  @Get('nearby')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  nearby(@Query('lat') lat: string, @Query('lon') lon: string) {
    return this.tide.nearby(Number(lat), Number(lon))
  }

  @Get('forecast')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  forecast(@Query('stationId') stationId = '', @Query('date') date = '') {
    return this.tide.forecast(stationId, date)
  }

  @Get('alerts')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  alerts(@Query('lat') lat: string, @Query('lon') lon: string) {
    return this.tide.alerts(Number(lat), Number(lon))
  }
}
