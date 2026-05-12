import { NestFactory, Reflector } from '@nestjs/core'
import { ValidationPipe, RequestMethod } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { JwtService } from '@nestjs/jwt'
import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { JwtAuthGuard } from './common/guards/jwt.guard'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true })

  // 全局前缀（exclude 旧 admin-pc 兼容路径）
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
    ],
  })

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  )

  app.useGlobalInterceptors(new ResponseInterceptor())
  app.useGlobalFilters(new GlobalExceptionFilter())

  // 全局 JWT 守卫（@Public 跳过）
  const reflector = app.get(Reflector)
  const jwtService = app.get(JwtService)
  app.useGlobalGuards(new JwtAuthGuard(reflector, jwtService))

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('经纬科技 API')
    .setDescription('用户端 user-mp / 商家端 / 平台端 / 管理后台 admin-pc 全量接口')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  const port = Number(process.env.SERVER_PORT) || 3000
  await app.listen(port, '0.0.0.0')
  console.log(`🚀 Server running on http://localhost:${port}`)
  console.log(`📖 Swagger docs at http://localhost:${port}/api/docs`)
}

bootstrap().catch((e) => {
  console.error(e)
  process.exit(1)
})
