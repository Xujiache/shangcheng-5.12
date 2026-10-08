"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerAuthController = void 0;
var common_1 = require("@nestjs/common");
var swagger_1 = require("@nestjs/swagger");
var throttler_1 = require("@nestjs/throttler");
var public_decorator_1 = require("../../common/decorators/public.decorator");
/** 门窗利账 App · 鉴权（/api/v1/l/auth/*）。整体 @Public 跳过商城全局守卫。 */
var LedgerAuthController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('门窗利账-鉴权'), (0, public_decorator_1.Public)(), (0, common_1.Controller)('l/auth')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _config_decorators;
    var _wechatLogin_decorators;
    var LedgerAuthController = _classThis = /** @class */ (function () {
        function LedgerAuthController_1(auth) {
            this.auth = (__runInitializers(this, _instanceExtraInitializers), auth);
        }
        // 公开配置：登录前加载品牌 LOGO。
        LedgerAuthController_1.prototype.config = function () {
            return this.auth.getPublicConfig();
        };
        // 唯一登录入口：首次登录按 openid 自动建号，后续复用同一微信账号。
        LedgerAuthController_1.prototype.wechatLogin = function (dto) {
            return this.auth.wechatLogin(dto);
        };
        return LedgerAuthController_1;
    }());
    __setFunctionName(_classThis, "LedgerAuthController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _config_decorators = [(0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60000 } }), (0, common_1.Get)('config')];
        _wechatLogin_decorators = [(0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }), (0, common_1.Post)('wechat-login')];
        __esDecorate(_classThis, null, _config_decorators, { kind: "method", name: "config", static: false, private: false, access: { has: function (obj) { return "config" in obj; }, get: function (obj) { return obj.config; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _wechatLogin_decorators, { kind: "method", name: "wechatLogin", static: false, private: false, access: { has: function (obj) { return "wechatLogin" in obj; }, get: function (obj) { return obj.wechatLogin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LedgerAuthController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LedgerAuthController = _classThis;
}();
exports.LedgerAuthController = LedgerAuthController;
