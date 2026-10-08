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
exports.GlobalExceptionFilter = void 0;
var common_1 = require("@nestjs/common");
var trace_1 = require("../trace");
var GlobalExceptionFilter = function () {
    var _classDecorators = [(0, common_1.Catch)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var GlobalExceptionFilter = _classThis = /** @class */ (function () {
        function GlobalExceptionFilter_1() {
            this.logger = new common_1.Logger(GlobalExceptionFilter.name);
        }
        GlobalExceptionFilter_1.prototype.catch = function (exception, host) {
            var _a;
            var ctx = host.switchToHttp();
            var req = ctx.getRequest();
            var res = ctx.getResponse();
            var traceId = (0, trace_1.requestTraceId)(req);
            var status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            var code = 1000;
            var message = '内部错误';
            if (exception instanceof common_1.HttpException) {
                status = exception.getStatus();
                var response = exception.getResponse();
                if (typeof response === 'string') {
                    message = response;
                }
                else if (typeof response === 'object' && response !== null) {
                    var r = response;
                    message = Array.isArray(r.message)
                        ? r.message.filter(function (value) { return typeof value === 'string'; }).join('；') ||
                            message
                        : typeof r.message === 'string'
                            ? r.message
                            : message;
                    code = r.code || status;
                }
            }
            else if (exception instanceof Error) {
                message = '服务暂时不可用，请稍后重试';
                // Keep call sites for diagnosis, not the message (which can contain credentials).
                var stack = (_a = exception.stack) === null || _a === void 0 ? void 0 : _a.split('\n').slice(1).filter(function (line) {
                    return /^\s+at /.test(line) && !/https?:\/\/|postgres(?:ql)?:\/\/|redis:\/\//i.test(line);
                }).slice(0, 12).join('\n');
                this.logger.error({ traceId: traceId, error: exception.name, stack: stack });
            }
            // 微信支付 v3 回调：要求顶层 { code: 'SUCCESS'|'FAIL', message }
            // 即使异常分支也不能被业务统一壳包装，否则微信会按梯度重试
            if ((req === null || req === void 0 ? void 0 : req.url) && req.url.includes('/payments/wechat/notify')) {
                res.status(200).json({ code: 'FAIL', message: message });
                return;
            }
            res.status(status).json({
                code: code,
                data: null,
                message: message,
                msg: message,
                traceId: traceId,
                timestamp: Date.now(),
            });
        };
        return GlobalExceptionFilter_1;
    }());
    __setFunctionName(_classThis, "GlobalExceptionFilter");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        GlobalExceptionFilter = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return GlobalExceptionFilter = _classThis;
}();
exports.GlobalExceptionFilter = GlobalExceptionFilter;
