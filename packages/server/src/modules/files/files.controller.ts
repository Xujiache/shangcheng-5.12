import { Body, Controller, Delete, Param, Post, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiConsumes } from '@nestjs/swagger'
import { FilesService } from './files.service'
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator'

@ApiTags('文件')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: any,
    @Body('bizType') bizType: string,
    @Body('ownerId') ownerId: string | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.filesService.upload(file, bizType || 'misc', ownerId || user?.sub)
  }

  @Post('batch-upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 20))
  batchUpload(
    @UploadedFiles() files: any[],
    @Body('bizType') bizType: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.filesService.batchUpload(files, bizType || 'misc', user?.sub)
  }

  @Delete(':key')
  remove(@Param('key') key: string, @CurrentUser() user: AuthUser) {
    return this.filesService.remove(key, user ? { userId: user.sub, role: user.role } : null)
  }
}
