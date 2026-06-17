import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiConsumes, ApiTags } from '@nestjs/swagger'
import { AppReleaseService } from './app-release.service'
import { Roles } from '../../common/decorators/roles.decorator'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator'

@ApiTags('APP 发布')
@Controller()
export class AppReleaseController {
  constructor(private readonly svc: AppReleaseService) {}

  // ===== 平台管理（仅 super-admin / admin / platform）=====
  @UseGuards(RolesGuard)
  @Roles('admin', 'platform', 'super-admin')
  @Post('p/app-releases')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  create(@UploadedFile() file: any, @Body() body: any, @CurrentUser() user: AuthUser) {
    return this.svc.create(
      file,
      {
        platform: body.platform,
        version: body.version,
        versionCode: Number(body.versionCode),
        changelog: body.changelog,
        force: body.force === true || body.force === 'true',
      },
      user?.sub,
    )
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'platform', 'super-admin')
  @Get('p/app-releases')
  list(@Query('platform') platform?: string) {
    return this.svc.list(platform)
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'platform', 'super-admin')
  @Delete('p/app-releases/:id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.svc.remove(id, user ? { userId: user.sub, role: user.role } : null)
  }

  // ===== 端上公开（启动时检查更新）=====
  @Public()
  @Get('m/app/latest')
  merchantLatest(@Query('platform') platform?: string) {
    return this.svc.latest(platform || 'merchant')
  }
}
