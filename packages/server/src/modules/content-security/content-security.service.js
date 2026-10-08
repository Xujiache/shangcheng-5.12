"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentSecurityService = void 0;
var common_1 = require("@nestjs/common");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
/**
 * 微信小程序内容安全校验的唯一服务入口。
 *
 * - 文本：`wxa/msg_sec_check`，用于昵称、备注、反馈和聊天消息；
 * - 图片：`wxa/img_sec_check`，用于头像及其它用户上传图片；
 * - 生产环境缺 AppID/Secret 或微信接口不可用时 fail closed，不能让未校验 UGC 落库；
 * - 本地开发未配置凭据时只跳过远程调用，以维持离线测试可运行。
 */
var ContentSecurityService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var ContentSecurityService = _classThis = /** @class */ (function () {
        function ContentSecurityService_1() {
            this.logger = new common_1.Logger(ContentSecurityService.name);
            this.tokenCache = new Map();
        }
        ContentSecurityService_1.prototype.credentials = function (scope) {
            return scope === 'ledger'
                ? {
                    appid: process.env.LEDGER_WX_APPID || '',
                    secret: process.env.LEDGER_WX_SECRET || '',
                }
                : {
                    appid: process.env.WX_MINIAPP_APPID || '',
                    secret: process.env.WX_MINIAPP_SECRET || '',
                };
        };
        ContentSecurityService_1.prototype.isProduction = function () {
            return process.env.NODE_ENV === 'production';
        };
        ContentSecurityService_1.prototype.timeoutMs = function () {
            var configured = Number(process.env.WX_CONTENT_SECURITY_TIMEOUT_MS || 10000);
            return Number.isSafeInteger(configured) && configured >= 1000 && configured <= 30000
                ? configured
                : 10000;
        };
        ContentSecurityService_1.prototype.getAccessToken = function (scope) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, appid, secret, cached, response, error_1, payload, ttlMs, token;
                var _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _a = this.credentials(scope), appid = _a.appid, secret = _a.secret;
                            if (!appid || !secret) {
                                if (this.isProduction()) {
                                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '内容安全服务未配置，暂时无法提交用户内容');
                                }
                                this.logger.warn("[content-security] ".concat(scope, " \u672A\u914D\u7F6E AppID/Secret\uFF0C\u975E\u751F\u4EA7\u73AF\u5883\u8DF3\u8FC7\u8FDC\u7A0B\u6821\u9A8C"));
                                return [2 /*return*/, null];
                            }
                            cached = this.tokenCache.get(scope);
                            if (cached && cached.expiresAt > Date.now())
                                return [2 /*return*/, cached.value];
                            _d.label = 1;
                        case 1:
                            _d.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, fetch("https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=".concat(encodeURIComponent(appid), "&secret=").concat(encodeURIComponent(secret)), { signal: AbortSignal.timeout(this.timeoutMs()) })];
                        case 2:
                            response = _d.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            error_1 = _d.sent();
                            this.logger.error("[content-security] \u83B7\u53D6 ".concat(scope, " access_token \u5931\u8D25: ").concat((error_1 === null || error_1 === void 0 ? void 0 : error_1.message) || error_1));
                            throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '内容安全服务暂不可用，请稍后重试');
                        case 4: return [4 /*yield*/, response.json().catch(function () { return ({}); })];
                        case 5:
                            payload = _d.sent();
                            if (!response.ok || !(payload === null || payload === void 0 ? void 0 : payload.access_token)) {
                                this.logger.error("[content-security] \u83B7\u53D6 ".concat(scope, " access_token \u5931\u8D25: http=").concat(response.status, " errcode=").concat((_b = payload === null || payload === void 0 ? void 0 : payload.errcode) !== null && _b !== void 0 ? _b : '-', " ") +
                                    "errmsg=".concat((_c = payload === null || payload === void 0 ? void 0 : payload.errmsg) !== null && _c !== void 0 ? _c : '-'));
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '内容安全服务暂不可用，请稍后重试');
                            }
                            ttlMs = Math.max(60, Number(payload.expires_in) || 7200) * 1000;
                            token = String(payload.access_token);
                            // 提前 5 分钟刷新，避免在微信接口调用中间过期。
                            this.tokenCache.set(scope, {
                                value: token,
                                expiresAt: Date.now() + Math.max(60000, ttlMs - 300000),
                            });
                            return [2 /*return*/, token];
                    }
                });
            });
        };
        /** 与虚拟支付查单共享 ledger 小程序 access_token，避免各模块重复刷新。 */
        ContentSecurityService_1.prototype.ledgerAccessToken = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.getAccessToken('ledger')];
                });
            });
        };
        ContentSecurityService_1.prototype.assertWechatResult = function (payload, kind) {
            var _a, _b, _c;
            if ((payload === null || payload === void 0 ? void 0 : payload.errcode) && Number(payload.errcode) !== 0) {
                this.logger.warn("[content-security] ".concat(kind, "\u68C0\u6D4B\u63A5\u53E3\u62D2\u7EDD: errcode=").concat(payload.errcode, " errmsg=").concat((payload === null || payload === void 0 ? void 0 : payload.errmsg) || '-'));
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '内容安全检测失败，请修改后重试');
            }
            // v2 返回 result.suggest；旧版成功响应没有 result 时仍按微信的 errcode=0 兼容。
            var suggest = String(((_a = payload === null || payload === void 0 ? void 0 : payload.result) === null || _a === void 0 ? void 0 : _a.suggest) || '').toLowerCase();
            if (suggest && suggest !== 'pass') {
                this.logger.warn("[content-security] ".concat(kind, "\u672A\u901A\u8FC7: suggest=").concat(suggest, " label=").concat((_c = (_b = payload === null || payload === void 0 ? void 0 : payload.result) === null || _b === void 0 ? void 0 : _b.label) !== null && _c !== void 0 ? _c : '-'));
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '内容未通过安全检测，请修改后重试');
            }
        };
        ContentSecurityService_1.prototype.assertTextSafe = function (content_1) {
            return __awaiter(this, arguments, void 0, function (content, options) {
                var normalized, scope, token, response, error_2, payload;
                if (options === void 0) { options = {}; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            normalized = String(content || '').trim();
                            if (!normalized)
                                return [2 /*return*/];
                            scope = options.scope || 'mall';
                            return [4 /*yield*/, this.getAccessToken(scope)];
                        case 1:
                            token = _a.sent();
                            if (!token)
                                return [2 /*return*/];
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, fetch("https://api.weixin.qq.com/wxa/msg_sec_check?access_token=".concat(encodeURIComponent(token)), {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(__assign({ version: 2, scene: options.scene || 2, content: normalized }, (options.openid ? { openid: options.openid } : {}))),
                                    signal: AbortSignal.timeout(this.timeoutMs()),
                                })];
                        case 3:
                            response = _a.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            error_2 = _a.sent();
                            this.logger.error("[content-security] \u6587\u672C\u68C0\u6D4B\u8BF7\u6C42\u5931\u8D25: ".concat((error_2 === null || error_2 === void 0 ? void 0 : error_2.message) || error_2));
                            throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '内容安全服务暂不可用，请稍后重试');
                        case 5: return [4 /*yield*/, response.json().catch(function () { return ({}); })];
                        case 6:
                            payload = _a.sent();
                            if (!response.ok) {
                                this.logger.error("[content-security] \u6587\u672C\u68C0\u6D4B HTTP \u5931\u8D25: ".concat(response.status));
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '内容安全服务暂不可用，请稍后重试');
                            }
                            this.assertWechatResult(payload, '文本');
                            return [2 /*return*/];
                    }
                });
            });
        };
        ContentSecurityService_1.prototype.assertImageSafe = function (buffer_1) {
            return __awaiter(this, arguments, void 0, function (buffer, options) {
                var scope, token, form, response, error_3, payload;
                if (options === void 0) { options = {}; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(buffer === null || buffer === void 0 ? void 0 : buffer.length))
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '图片内容为空');
                            scope = options.scope || 'mall';
                            return [4 /*yield*/, this.getAccessToken(scope)];
                        case 1:
                            token = _a.sent();
                            if (!token)
                                return [2 /*return*/];
                            form = new FormData();
                            form.set('media', new Blob([buffer], { type: options.mimeType || 'application/octet-stream' }), options.filename || 'upload-image');
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, fetch("https://api.weixin.qq.com/wxa/img_sec_check?access_token=".concat(encodeURIComponent(token)), {
                                    method: 'POST',
                                    body: form,
                                    signal: AbortSignal.timeout(this.timeoutMs()),
                                })];
                        case 3:
                            response = _a.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            error_3 = _a.sent();
                            this.logger.error("[content-security] \u56FE\u7247\u68C0\u6D4B\u8BF7\u6C42\u5931\u8D25: ".concat((error_3 === null || error_3 === void 0 ? void 0 : error_3.message) || error_3));
                            throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '内容安全服务暂不可用，请稍后重试');
                        case 5: return [4 /*yield*/, response.json().catch(function () { return ({}); })];
                        case 6:
                            payload = _a.sent();
                            if (!response.ok) {
                                this.logger.error("[content-security] \u56FE\u7247\u68C0\u6D4B HTTP \u5931\u8D25: ".concat(response.status));
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '内容安全服务暂不可用，请稍后重试');
                            }
                            this.assertWechatResult(payload, '图片');
                            return [2 /*return*/];
                    }
                });
            });
        };
        return ContentSecurityService_1;
    }());
    __setFunctionName(_classThis, "ContentSecurityService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ContentSecurityService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ContentSecurityService = _classThis;
}();
exports.ContentSecurityService = ContentSecurityService;
