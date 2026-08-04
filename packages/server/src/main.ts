import { NestFactory, Reflector } from '@nestjs/core'
import { ValidationPipe, RequestMethod, Logger } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'

/**
 * 解析允许的 CORS 源列表。
 *
 * - 显式配置 CORS_ORIGIN（逗号分隔）→ 严格按白名单匹配
 * - 未配置 + 非生产 → 退化为允许任意源（true），便于本地多端联调
 * - 未配置 + 生产 → 直接退出进程（exit 1），强制运维显式配置白名单。
 *
 * 安全 P0：生产环境绝不允许"允许任意源"的兜底，否则任意第三方页面都能携 cookie
 * 调本服务接口，等同于 CSRF / 跨站数据泄露的开门钥匙。宁可启动失败让运维补配置，
 * 也绝不放过这道防线。
 */
function resolveCorsOrigin(): boolean | string[] {
  const raw = process.env.CORS_ORIGIN
  if (!raw || !raw.trim()) {
    if (process.env.NODE_ENV === 'production') {
      Logger.error(
        '[security] 生产环境未配置 CORS_ORIGIN —— 启动中止。请在环境变量中设置允许的前端域名列表（逗号分隔），例如 https://m.example.com,https://admin.example.com',
        'Bootstrap',
      )
      process.exit(1)
    }
    return true
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

async function bootstrap() {
  // rawBody:true 是微信支付 v3 回调验签的强依赖——
  // verifyNotify 要拿到 *未被 JSON.parse 改写过* 的原始字节，
  // 否则 Wechatpay-Signature 永远算不出一致的 SHA256-RSA 摘要。
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: resolveCorsOrigin(),
      credentials: true,
    },
    rawBody: true,
  })

  // 安全响应头：HSTS / X-Content-Type-Options / X-Frame-Options 等
  // helmet 是可选依赖（package.json 暂未列入），缺失时不阻塞启动；
  // 待运维执行 `pnpm --filter @jiujiu/server add helmet` 后自动生效。
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const helmet = require('helmet')
    // 默认配置已是合理基线；如未来要嵌微信支付收银台/小程序 webview 等需要放宽 CSP，
    // 可在这里传入 { contentSecurityPolicy: false } 或自定义 directives。
    app.use(helmet())
    Logger.log('[security] helmet 已启用', 'Bootstrap')
  } catch (e: any) {
    Logger.warn(
      `[security] helmet 未安装（${e?.code || e?.message || 'MODULE_NOT_FOUND'}），跳过；运行 \`pnpm --filter @jiujiu/server add helmet\` 后重启生效`,
      'Bootstrap',
    )
  }

  // 为 WebSocket Gateway 启用 socket.io IoAdapter，namespace 走 /ws/chat
  app.useWebSocketAdapter(new IoAdapter(app))

  // 全局前缀（exclude 旧 admin-pc 兼容路径）
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
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

  // Swagger —— 仅非生产环境暴露
  //
  // 安全 P0：生产环境强制关闭 /api/docs，不接受 SWAGGER_ENABLED=1 等"绕过开关"。
  // /api/docs 会把所有接口结构 + 参数 schema 暴露给互联网，给攻击者免费提供攻击面图。
  // 真正需要看接口文档的内部场景，请在运维网段单独跑一个非生产实例，
  // 而不是在线上开洞。
  const swaggerEnabled = process.env.NODE_ENV !== 'production'
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('经纬科技 API')
      .setDescription('用户端 user-mp / 商家端 / 平台端 / 管理后台 admin-pc 全量接口')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api/docs', app, document)
  }

  const port = Number(process.env.SERVER_PORT) || 3000
  await app.listen(port, '0.0.0.0')
  console.log(`🚀 Server running on http://localhost:${port}`)
  if (swaggerEnabled) {
    console.log(`📖 Swagger docs at http://localhost:${port}/api/docs`)
  } else {
    console.log('📖 Swagger 在生产环境已强制关闭')
  }
}

bootstrap().catch((e) => {
  console.error(e)
  process.exit(1)
})
