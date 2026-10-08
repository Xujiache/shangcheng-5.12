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
exports.MerchantModule = void 0;
var common_1 = require("@nestjs/common");
var merchant_controller_1 = require("./merchant.controller");
var merchant_service_1 = require("./merchant.service");
var merchant_analytics_service_1 = require("./merchant-analytics.service");
var order_share_service_1 = require("./order-share.service");
var chat_module_1 = require("../chat/chat.module");
/**
 * MerchantModule 不需要显式导入 PaymentModule —— PaymentModule 是 @Global，
 * WxPayService 已经全局可注入。导入会触发循环依赖。
 *
 * 引入 ChatModule：MerchantService.ship/agreeRefund/rejectRefund 等动作需要通过
 * ChatGateway 给商家端房间推送 order:update/refund:update 事件。
 * ChatModule 只依赖 JwtModule + PrismaService，不存在循环依赖。
 */
var MerchantModule = function () {
    var _classDecorators = [(0, common_1.Module)({
            imports: [chat_module_1.ChatModule],
            controllers: [merchant_controller_1.MerchantController],
            providers: [merchant_service_1.MerchantService, order_share_service_1.OrderShareService, merchant_analytics_service_1.MerchantAnalyticsService],
            // OrderShareService 也 export 给 UserMpModule 的 @Public 公开访问路由使用
            exports: [merchant_service_1.MerchantService, order_share_service_1.OrderShareService],
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var MerchantModule = _classThis = /** @class */ (function () {
        function MerchantModule_1() {
        }
        return MerchantModule_1;
    }());
    __setFunctionName(_classThis, "MerchantModule");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MerchantModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MerchantModule = _classThis;
}();
exports.MerchantModule = MerchantModule;
