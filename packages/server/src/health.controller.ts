import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { ApiTags } from '@nestjs/swagger'
import { Public } from './common/decorators/public.decorator'
import { SkipResponseWrap } from './common/decorators/skip-response.decorator'
import { HealthService } from './health.service'

@ApiTags('系统')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: '@jiujiu/server',
      version: '0.0.1',
    }
  }

  @Public()
  @SkipThrottle()
  @SkipResponseWrap()
  @Get('live')
  live() {
    return { status: 'ok' }
  }

  @Public()
  @SkipThrottle()
  @SkipResponseWrap()
  @Get('ready')
  async ready() {
    if (!(await this.health.ready())) {
      throw new ServiceUnavailableException('Service not ready')
    }
    return { status: 'ok' }
  }
}
