import { Module } from '@nestjs/common'
import { AppReleaseController } from './app-release.controller'
import { AppReleaseService } from './app-release.service'
import { FilesModule } from '../files/files.module'

@Module({
  imports: [FilesModule],
  controllers: [AppReleaseController],
  providers: [AppReleaseService],
})
export class AppReleaseModule {}
