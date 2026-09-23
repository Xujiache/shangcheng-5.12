import { Controller, Delete, Param, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import { ConversionService } from './conversion.service'

/** 处理利账注销申请时，管理员先清除私有转换文件，再删除账号。 */
@ApiTags('门窗利账-格式转换管理')
@UseGuards(RolesGuard)
@Roles('platform', 'super-admin')
@Controller('p/ledger')
export class ConversionAdminController {
  constructor(private readonly service: ConversionService) {}

  @Delete('users/:id/conversions')
  purgeUser(@Param('id') id: string) {
    return this.service.purgeUser(id)
  }
}
