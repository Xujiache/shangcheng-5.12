import { NestFactory, Reflector } from '@nestjs/core'
import { ValidationPipe, RequestMethod } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'

async function bootstrap() {
  // rawBody:true 是微信支付 v3 回调验签的强依赖——
  // verifyNotify 要拿到 *未被 JSON.parse 改写过* 的原始字节，
  // 否则 Wechatpay-Signature 永远算不出一致的 SHA256-RSA 摘要。
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    rawBody: true,
  })
  // 为 WebSocket Gateway 启用 socket.io IoAdapter，namespace 走 /ws/chat
  app.useWebSocketAdapter(new IoAdapter(app))

  // 全局前缀（exclude 旧 admin-pc 兼容路径）
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
    ],
  })

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  )

  // ResponseInterceptor 需要 Reflector 读取 @SkipResponseWrap 元数据
  const reflector = app.get(Reflector)
  app.useGlobalInterceptors(new ResponseInterceptor(reflector))
  app.useGlobalFilters(new GlobalExceptionFilter())

  // 全局守卫（JwtAuthGuard + ThrottlerGuard）已通过 APP_GUARD 在 AppModule 注册，
  // 这里不再 useGlobalGuards，避免双重执行；走 DI 注册也便于守卫注入 Reflector/JwtService

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
