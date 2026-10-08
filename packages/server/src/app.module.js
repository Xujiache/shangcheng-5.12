"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
var common_1 = require("@nestjs/common");
var config_1 = require("@nestjs/config");
var throttler_1 = require("@nestjs/throttler");
var schedule_1 = require("@nestjs/schedule");
var core_1 = require("@nestjs/core");
var prisma_module_1 = require("./prisma/prisma.module");
var health_controller_1 = require("./health.controller");
var health_service_1 = require("./health.service");
var auth_module_1 = require("./modules/auth/auth.module");
var files_module_1 = require("./modules/files/files.module");
var user_mp_module_1 = require("./modules/user-mp/user-mp.module");
var merchant_module_1 = require("./modules/merchant/merchant.module");
var platform_module_1 = require("./modules/platform/platform.module");
var chat_module_1 = require("./modules/chat/chat.module");
var sms_module_1 = require("./modules/sms/sms.module");
var payment_module_1 = require("./modules/payment/payment.module");
var legal_module_1 = require("./modules/legal/legal.module");
var app_release_module_1 = require("./modules/app-release/app-release.module");
var ledger_module_1 = require("./modules/ledger/ledger.module");
var conversion_module_1 = require("./modules/ledger-conversion/conversion.module");
var content_security_module_1 = require("./modules/content-security/content-security.module");
var jwt_guard_1 = require("./common/guards/jwt.guard");
var harmony_realtime_module_1 = require("./modules/harmony-merchant/harmony-realtime.module");
var harmony_merchant_module_1 = require("./modules/harmony-merchant/harmony-merchant.module");
/**
 * 单桶限流（v2 修复）
 *
 * 之前用 5 桶配置（default/auth/sms/upload/payment-notify），但 @nestjs/throttler v6
 * 的实际行为是「每个请求评估所有桶」—— 任何端点都会被 sms(3/min) 这种严桶夹击 → 误杀，
 * 例如管理员登录会因为 sms 桶 3/min 上限被卡死返回 429 ThrottlerException。
 *
 * 修复策略：只留一个 default 桶（120/min），需要更严的端点用
 *   @Throttle({ default: { limit: X, ttl: 60_000 } })
 * 在 handler 上覆盖（这是 throttler v6 唯一可靠的 per-handler 覆盖姿势）。
 *
 * 当前端点限速：
 *   - 默认所有端点                       120 / 60s
 *   - /auth/admin-login                  10 / 60s   防密码字典爆破
 *   - /auth/phone-login                  10 / 60s   防短信验证码爆破
 *   - /auth/wechat-login                 60 / 60s   一次性 code 无爆破价值 + 冷启动高频
 *   - /auth/refresh                      60 / 60s   须带有效 refreshToken，无爆破面
 *   - /auth/sms-code                      3 / 60s   防短信轰炸
 *   - /files/upload                      60 / 60s   商品编辑批量上传需要
 *   - /payments/wechat/notify           200 / 60s   微信回调高频重试
 */
var AppModule = function () {
    var _classDecorators = [(0, common_1.Module)({
            imports: [
                config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
                content_security_module_1.ContentSecurityModule,
                harmony_realtime_module_1.HarmonyRealtimeModule,
                // ⚠️ 单桶模式（不要再加额外桶名！）
                //
                // @nestjs/throttler v6 行为：注册多个桶 → 每个请求被所有桶逐个评估，
                // 最严的桶会卡死所有端点（哪怕端点没 @Throttle 任何桶）。
                // 实测：登录第 4 次 → sms 桶 3/min 触发 429（截图日期 2026-05-15）。
                //
                // 单桶 + 端点级 @Throttle({ default: { limit: X, ttl: 60_000 } }) 覆盖
                // 是唯一可靠的姿势。需要 stricter / looser 的端点用本地 override：
                //   - /auth/admin-login           limit: 10
                //   - /auth/phone-login           limit: 10
                //   - /auth/wechat-login          limit: 60
                //   - /auth/refresh               limit: 60
                //   - /auth/sms-code              limit: 3
                //   - /files/upload               limit: 60
                //   - /payments/wechat/notify     limit: 200
                throttler_1.ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 120 }]),
                schedule_1.ScheduleModule.forRoot(),
                prisma_module_1.PrismaModule,
                auth_module_1.AuthModule,
                files_module_1.FilesModule,
                user_mp_module_1.UserMpModule,
                merchant_module_1.MerchantModule,
                platform_module_1.PlatformModule,
                chat_module_1.ChatModule,
                sms_module_1.SmsModule,
                payment_module_1.PaymentModule,
                legal_module_1.LegalModule,
                app_release_module_1.AppReleaseModule,
                harmony_merchant_module_1.HarmonyMerchantModule,
                ledger_module_1.LedgerModule,
                conversion_module_1.ConversionModule,
            ],
            controllers: [health_controller_1.HealthController],
            providers: [
                health_service_1.HealthService,
                // 全局守卫按数组顺序执行：JWT 鉴权先于限流，
                // 这样匿名滥用请求会被 JWT 的 @Public/Unauthorized 优先处理，
                // 已登录用户再走 IP 限流策略（避免限流提前触发让登录页都打不开）
                { provide: core_1.APP_GUARD, useClass: jwt_guard_1.JwtAuthGuard },
                { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            ],
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AppModule = _classThis = /** @class */ (function () {
        function AppModule_1() {
        }
        return AppModule_1;
    }());
    __setFunctionName(_classThis, "AppModule");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AppModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AppModule = _classThis;
}();
exports.AppModule = AppModule;
