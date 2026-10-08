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
exports.LedgerPayController = void 0;
var common_1 = require("@nestjs/common");
var throttler_1 = require("@nestjs/throttler");
var swagger_1 = require("@nestjs/swagger");
var public_decorator_1 = require("../../common/decorators/public.decorator");
var skip_response_decorator_1 = require("../../common/decorators/skip-response.decorator");
var ledger_jwt_guard_1 = require("./guards/ledger-jwt.guard");
/**
 * 门窗利账 · 会员在线支付（/api/v1/l/*）。
 * - POST l/membership/pay  下单（需登录）→ 小程序 wx.requestPayment 参数
 * - POST l/pay/notify      微信支付回调（公开，须配 LEDGER_PAY_NOTIFY_URL 指向此地址）
 */
var LedgerPayController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('门窗利账-支付'), (0, public_decorator_1.Public)(), (0, common_1.Controller)('l')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _createPay_decorators;
    var _createXpay_decorators;
    var _notify_decorators;
    var _xpayVerify_decorators;
    var _xpayDeliver_decorators;
    var LedgerPayController = _classThis = /** @class */ (function () {
        function LedgerPayController_1(pay, xpay, wxpay) {
            this.pay = (__runInitializers(this, _instanceExtraInitializers), pay);
            this.xpay = xpay;
            this.wxpay = wxpay;
            this.logger = new common_1.Logger(LedgerPayController.name);
        }
        /** 会员在线支付下单（需登录）→ 返回小程序 wx.requestPayment 所需参数。 */
        LedgerPayController_1.prototype.createPay = function (user, dto) {
            return this.pay.createMembershipOrder(user.id, dto.planKey, dto.code);
        };
        /**
         * 会员虚拟支付下单（需登录）→ 返回小程序 wx.requestVirtualPayment 所需
         * { mode, signData, paySig, signature }。虚拟商品合规内购，取代普通微信支付。
         */
        LedgerPayController_1.prototype.createXpay = function (user, dto) {
            return this.xpay.createOrder(user.id, dto.planKey, dto.code);
        };
        /**
         * 微信支付回调（公开，专用于门窗利账会员）。
         * rawBody 验签 → 解密 → SUCCESS 才入账；返回顶层 { code:'SUCCESS'|'FAIL' }（SkipResponseWrap）。
         */
        LedgerPayController_1.prototype.notify = function (headers, body, req) {
            return __awaiter(this, void 0, void 0, function () {
                var rawBuf, raw, ok, decrypted, outTradeNo, tradeState, transactionId, paidFen, handled, e_1;
                var _a, _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            rawBuf = req.rawBody;
                            if (!rawBuf || !Buffer.isBuffer(rawBuf) || !rawBuf.length) {
                                return [2 /*return*/, { code: 'FAIL', message: '原始报文缺失' }];
                            }
                            raw = rawBuf.toString('utf8');
                            return [4 /*yield*/, this.wxpay.verifyNotify(headers, raw)];
                        case 1:
                            ok = _f.sent();
                            if (!ok)
                                return [2 /*return*/, { code: 'FAIL', message: '签名验证失败' }];
                            decrypted = null;
                            if ((_a = body === null || body === void 0 ? void 0 : body.resource) === null || _a === void 0 ? void 0 : _a.ciphertext) {
                                try {
                                    decrypted = this.wxpay.decryptResource(body.resource);
                                }
                                catch (e) {
                                    this.logger.error("[ledger pay notify] \u89E3\u5BC6\u5931\u8D25\uFF1A".concat((e === null || e === void 0 ? void 0 : e.message) || e));
                                    return [2 /*return*/, { code: 'FAIL', message: '解密失败，请重试' }];
                                }
                            }
                            outTradeNo = (decrypted === null || decrypted === void 0 ? void 0 : decrypted.out_trade_no) || (body === null || body === void 0 ? void 0 : body.out_trade_no);
                            tradeState = (decrypted === null || decrypted === void 0 ? void 0 : decrypted.trade_state) || (body === null || body === void 0 ? void 0 : body.trade_state);
                            transactionId = (decrypted === null || decrypted === void 0 ? void 0 : decrypted.transaction_id) || (body === null || body === void 0 ? void 0 : body.transaction_id);
                            paidFen = Number((_e = (_c = (_b = decrypted === null || decrypted === void 0 ? void 0 : decrypted.amount) === null || _b === void 0 ? void 0 : _b.total) !== null && _c !== void 0 ? _c : (_d = decrypted === null || decrypted === void 0 ? void 0 : decrypted.amount) === null || _d === void 0 ? void 0 : _d.payer_total) !== null && _e !== void 0 ? _e : 0);
                            if (!outTradeNo || tradeState !== 'SUCCESS') {
                                // 非成功事件直接 ACK（微信只对 FAIL 重试）
                                return [2 /*return*/, { code: 'SUCCESS', message: 'OK' }];
                            }
                            _f.label = 2;
                        case 2:
                            _f.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.pay.handleNotify(outTradeNo, transactionId, paidFen)];
                        case 3:
                            handled = _f.sent();
                            return [2 /*return*/, handled
                                    ? { code: 'SUCCESS', message: 'OK' }
                                    : { code: 'FAIL', message: 'order not found' }];
                        case 4:
                            e_1 = _f.sent();
                            this.logger.error("[ledger pay notify] \u5904\u7406\u5931\u8D25 outTradeNo=".concat(outTradeNo, ": ").concat((e_1 === null || e_1 === void 0 ? void 0 : e_1.message) || e_1));
                            return [2 /*return*/, { code: 'FAIL', message: (e_1 === null || e_1 === void 0 ? void 0 : e_1.message) || '处理失败，请重试' }];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * 微信「消息推送」URL 校验（GET）。公众平台保存消息推送配置时发起：
         * 校验 sha1(Token,timestamp,nonce)==signature → 原样返回 echostr，否则配置保存失败。
         */
        LedgerPayController_1.prototype.xpayVerify = function (q) {
            var ok = this.xpay.verifyPushSignature(q.signature, q.timestamp, q.nonce);
            this.logger.log("[ledger xpay verify] ".concat(ok ? 'OK' : 'FAIL'));
            return ok ? q.echostr || '' : 'signature mismatch';
        };
        /**
         * 虚拟支付「发货回调」(xpay_goods_deliver_notify)，经微信「消息推送」通道下发（POST）。
         * 公开 + SkipResponseWrap。明文模式：用 Token 校验 signature → 复用 handleNotify 幂等发放会员。
         * 非 xpay 事件（如订阅消息回执）直接回 "success" 忽略，避免微信重试。
         * ⚠️ 联调核对：发货事件字段名 / ack 格式以官方《小程序虚拟支付接入指引》为准。
         */
        LedgerPayController_1.prototype.xpayDeliver = function (q, body, req) {
            return __awaiter(this, void 0, void 0, function () {
                var rawBuf, event, isDeliver, ok, e_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            rawBuf = req.rawBody;
                            if (!rawBuf || !Buffer.isBuffer(rawBuf) || !rawBuf.length) {
                                return [2 /*return*/, { ErrCode: 1, ErrMsg: 'raw body missing' }];
                            }
                            // 消息推送验签（明文模式：Token + timestamp + nonce）
                            if (!this.xpay.verifyPushSignature(q.signature, q.timestamp, q.nonce)) {
                                return [2 /*return*/, { ErrCode: 1, ErrMsg: 'sign verify failed' }];
                            }
                            event = String((body === null || body === void 0 ? void 0 : body.Event) || (body === null || body === void 0 ? void 0 : body.event) || '');
                            isDeliver = event === 'xpay_goods_deliver_notify' ||
                                !!((body === null || body === void 0 ? void 0 : body.OutTradeNo) || (body === null || body === void 0 ? void 0 : body.out_trade_no) || (body === null || body === void 0 ? void 0 : body.outTradeNo));
                            if (!isDeliver)
                                return [2 /*return*/, 'success'];
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.xpay.handleDeliverNotify(body)];
                        case 2:
                            ok = _a.sent();
                            return [2 /*return*/, ok
                                    ? { ErrCode: 0, ErrMsg: 'success' }
                                    : { ErrCode: 1, ErrMsg: 'payment not confirmed' }];
                        case 3:
                            e_2 = _a.sent();
                            this.logger.error("[ledger xpay deliver] \u5904\u7406\u5931\u8D25: ".concat((e_2 === null || e_2 === void 0 ? void 0 : e_2.message) || e_2));
                            return [2 /*return*/, { ErrCode: 1, ErrMsg: 'process failed' }];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        return LedgerPayController_1;
    }());
    __setFunctionName(_classThis, "LedgerPayController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _createPay_decorators = [(0, common_1.UseGuards)(ledger_jwt_guard_1.LedgerJwtGuard), (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60000 } }), (0, common_1.Post)('membership/pay')];
        _createXpay_decorators = [(0, common_1.UseGuards)(ledger_jwt_guard_1.LedgerJwtGuard), (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60000 } }), (0, common_1.Post)('membership/xpay-order')];
        _notify_decorators = [(0, skip_response_decorator_1.SkipResponseWrap)(), (0, throttler_1.Throttle)({ default: { limit: 200, ttl: 60000 } }), (0, common_1.Post)('pay/notify')];
        _xpayVerify_decorators = [(0, skip_response_decorator_1.SkipResponseWrap)(), (0, common_1.Get)('xpay/deliver-notify')];
        _xpayDeliver_decorators = [(0, skip_response_decorator_1.SkipResponseWrap)(), (0, throttler_1.Throttle)({ default: { limit: 200, ttl: 60000 } }), (0, common_1.Post)('xpay/deliver-notify')];
        __esDecorate(_classThis, null, _createPay_decorators, { kind: "method", name: "createPay", static: false, private: false, access: { has: function (obj) { return "createPay" in obj; }, get: function (obj) { return obj.createPay; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createXpay_decorators, { kind: "method", name: "createXpay", static: false, private: false, access: { has: function (obj) { return "createXpay" in obj; }, get: function (obj) { return obj.createXpay; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _notify_decorators, { kind: "method", name: "notify", static: false, private: false, access: { has: function (obj) { return "notify" in obj; }, get: function (obj) { return obj.notify; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _xpayVerify_decorators, { kind: "method", name: "xpayVerify", static: false, private: false, access: { has: function (obj) { return "xpayVerify" in obj; }, get: function (obj) { return obj.xpayVerify; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _xpayDeliver_decorators, { kind: "method", name: "xpayDeliver", static: false, private: false, access: { has: function (obj) { return "xpayDeliver" in obj; }, get: function (obj) { return obj.xpayDeliver; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LedgerPayController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LedgerPayController = _classThis;
}();
exports.LedgerPayController = LedgerPayController;
