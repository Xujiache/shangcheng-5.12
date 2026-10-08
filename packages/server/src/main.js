"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@nestjs/core");
var common_1 = require("@nestjs/common");
var swagger_1 = require("@nestjs/swagger");
var platform_socket_io_1 = require("@nestjs/platform-socket.io");
var config_1 = require("@nestjs/config");
var app_module_1 = require("./app.module");
var global_exception_filter_1 = require("./common/filters/global-exception.filter");
var response_interceptor_1 = require("./common/interceptors/response.interceptor");
var express_1 = require("express");
var helmet_1 = require("helmet");
var trace_1 = require("./common/trace");
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
function resolveCorsOrigin(config) {
    var raw = config.get('CORS_ORIGIN');
    if (!raw || !raw.trim()) {
        if (config.get('NODE_ENV') === 'production') {
            common_1.Logger.error('[security] 生产环境未配置 CORS_ORIGIN —— 启动中止。请在环境变量中设置允许的前端域名列表（逗号分隔），例如 https://m.example.com,https://admin.example.com', 'Bootstrap');
            process.exit(1);
        }
        return true;
    }
    return raw
        .split(',')
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return s.length > 0; });
}
function bootstrap() {
    return __awaiter(this, void 0, void 0, function () {
        var app, configService, workbookSyncJson, reflector, swaggerEnabled, config, document_1, port, host, httpServer;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, core_1.NestFactory.create(app_module_1.AppModule, {
                        rawBody: true,
                    })];
                case 1:
                    app = _a.sent();
                    configService = app.get(config_1.ConfigService);
                    app.enableCors({
                        origin: resolveCorsOrigin(configService),
                        credentials: true,
                    });
                    workbookSyncJson = (0, express_1.json)({ limit: '8mb' });
                    app.use('/api/v1/l/workbook/sync', function (req, res, next) {
                        return workbookSyncJson(req, res, next);
                    });
                    app.getHttpAdapter().getInstance().disable('x-powered-by');
                    app.use((0, helmet_1.default)({
                        hsts: configService.get('NODE_ENV') === 'production' ? { maxAge: 31536000 } : false,
                        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
                    }));
                    app.use(function (req, res, next) {
                        res.setHeader('X-Trace-Id', (0, trace_1.requestTraceId)(req));
                        if (req.path.startsWith('/api/v1/l/'))
                            res.setHeader('Cache-Control', 'private, no-store');
                        next();
                    });
                    app.enableShutdownHooks();
                    // 为 WebSocket Gateway 启用 socket.io IoAdapter，namespace 走 /ws/chat
                    app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app));
                    // 全局前缀（exclude 旧 admin-pc 兼容路径）
                    app.setGlobalPrefix('api/v1', {
                        exclude: ['health', 'health/live', 'health/ready'].map(function (path) { return ({
                            path: path,
                            method: common_1.RequestMethod.GET,
                        }); }),
                    });
                    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }));
                    reflector = app.get(core_1.Reflector);
                    app.useGlobalInterceptors(new response_interceptor_1.ResponseInterceptor(reflector));
                    app.useGlobalFilters(new global_exception_filter_1.GlobalExceptionFilter());
                    swaggerEnabled = configService.get('NODE_ENV') !== 'production';
                    if (swaggerEnabled) {
                        config = new swagger_1.DocumentBuilder()
                            .setTitle('经纬科技 API')
                            .setDescription('用户端 user-mp / 商家端 / 平台端 / 管理后台 admin-pc 全量接口')
                            .setVersion('1.0.0')
                            .addBearerAuth()
                            .build();
                        document_1 = swagger_1.SwaggerModule.createDocument(app, config);
                        swagger_1.SwaggerModule.setup('api/docs', app, document_1);
                    }
                    port = Number(configService.get('SERVER_PORT')) || 3000;
                    host = configService.get('SERVER_HOST') || '127.0.0.1';
                    httpServer = app.getHttpServer();
                    httpServer.keepAliveTimeout = 30000;
                    return [4 /*yield*/, app.listen(port, host)];
                case 2:
                    _a.sent();
                    console.log("\uD83D\uDE80 Server running on http://".concat(host, ":").concat(port));
                    if (swaggerEnabled) {
                        console.log("\uD83D\uDCD6 Swagger docs at http://localhost:".concat(port, "/api/docs"));
                    }
                    else {
                        console.log('📖 Swagger 在生产环境已强制关闭');
                    }
                    return [2 /*return*/];
            }
        });
    });
}
bootstrap().catch(function (e) {
    console.error(e);
    process.exit(1);
});
