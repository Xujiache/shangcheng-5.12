import { Module } from '@nestjs/common'
import { VideoParserController } from './video-parser.controller'
import { VideoParserService } from './video-parser.service'

@Module({
  controllers: [VideoParserController],
  providers: [VideoParserService],
})
export class VideoParserModule {}
