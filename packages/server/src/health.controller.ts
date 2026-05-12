import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Public } from './common/decorators/public.decorator'

@ApiTags('系统')
@Controller('health')
export class HealthController {
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
}
