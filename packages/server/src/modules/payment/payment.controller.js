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
exports.PaymentController = void 0;
var common_1 = require("@nestjs/common");
var throttler_1 = require("@nestjs/throttler");
var public_decorator_1 = require("../../common/decorators/public.decorator");
var skip_response_decorator_1 = require("../../common/decorators/skip-response.decorator");
var common_2 = require("@nestjs/common");
/**
 * 微信支付回调
 * URL：POST /api/v1/payments/wechat/notify
 * 微信会 POST 加密 JSON；商户号申请通过后会被微信调用。
 *
 * 支持两类业务：
 *   1. 普通商品订单（outTradeNo = Order.no，不带 MEM 前缀）
 *      → 更新 Order.status='pending_shipment' + 写 Payment 对账记录
 *   2. 会员订阅缴费（outTradeNo 以 MEM 开头）
 *      → 通过 attach 字段（"membership:<recordId>"）或 PaymentRecord.no 找到
 *        待支付的 PaymentRecord，调 MerchantService.activateMembership 真正激活会员
 *
 * 关键保护：
 *   - rawBody 真实读取：main.ts 启用 NestExpress { rawBody: true } 后 req.rawBody 是 Buffer，
 *     验签必须用这份原始字节（JSON.stringify(body) 会被字段顺序 / 转义影响导致签名不一致）
 *   - 幂等：先按 wxTransactionId 或 (orderId, status='success') 查 Payment，命中直接 ACK
 *   - 事务：订单状态 + Payment 写入用 prisma.$transaction，任一失败回滚
 *   - 错误回 FAIL：业务失败返回 { code: 'FAIL' }，微信会按 5 分钟级别梯度重试
 *   - @SkipResponseWrap()：跳过全局 ResponseInterceptor 包装，让 { code:'SUCCESS'|'FAIL' }
 *     成为顶层结构，否则微信网关解析失败会无限重试这笔回调
 */
var PaymentController = function () {
    var _classDecorators = [(0, skip_response_decorator_1.SkipResponseWrap)(), (0, common_1.Controller)('payments')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _wechatNotify_decorators;
    var PaymentController = _classThis = /** @class */ (function () {
        function PaymentController_1(wxpay, prisma, merchantService, chat) {
            this.wxpay = (__runInitializers(this, _instanceExtraInitializers), wxpay);
            this.prisma = prisma;
            this.merchantService = merchantService;
            this.chat = chat;
            this.logger = new common_2.Logger(PaymentController.name);
        }
        // P1-25：微信支付回调走 'payment-notify' 桶（200/min/IP），
        // 微信高峰期会高频重试，桶要宽松；同时拒绝 default 桶的 60/min 误杀
        PaymentController_1.prototype.wechatNotify = function (headers, body, req) {
            return __awaiter(this, void 0, void 0, function () {
                var rawBuf, raw, ok, decrypted, outTradeNo, tradeState, transactionId, attach, isMembership, recordIdFromAttach, record, _a, dupByTx, order_1, dupByOrder, paidAt_1, e_1;
                var _this = this;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            rawBuf = req.rawBody;
                            raw = rawBuf
                                ? Buffer.isBuffer(rawBuf)
                                    ? rawBuf.toString('utf8')
                                    : String(rawBuf)
                                : JSON.stringify(body);
                            return [4 /*yield*/, this.wxpay.verifyNotify(headers, raw)];
                        case 1:
                            ok = _c.sent();
                            if (!ok)
                                return [2 /*return*/, { code: 'FAIL', message: '签名验证失败' }];
                            decrypted = null;
                            if ((_b = body === null || body === void 0 ? void 0 : body.resource) === null || _b === void 0 ? void 0 : _b.ciphertext) {
                                try {
                                    decrypted = this.wxpay.decryptResource(body.resource);
                                }
                                catch (e) {
                                    this.logger.error("[wxpay notify] \u89E3\u5BC6\u5931\u8D25\uFF1A".concat((e === null || e === void 0 ? void 0 : e.message) || e));
                                    return [2 /*return*/, { code: 'FAIL', message: '解密失败，请重试' }];
                                }
                            }
                            outTradeNo = (decrypted === null || decrypted === void 0 ? void 0 : decrypted.out_trade_no) || (body === null || body === void 0 ? void 0 : body.out_trade_no);
                            tradeState = (decrypted === null || decrypted === void 0 ? void 0 : decrypted.trade_state) || (body === null || body === void 0 ? void 0 : body.trade_state);
                            transactionId = (decrypted === null || decrypted === void 0 ? void 0 : decrypted.transaction_id) || (body === null || body === void 0 ? void 0 : body.transaction_id);
                            attach = (decrypted === null || decrypted === void 0 ? void 0 : decrypted.attach) || (body === null || body === void 0 ? void 0 : body.attach) || '';
                            if (!outTradeNo || tradeState !== 'SUCCESS') {
                                // 非成功事件直接 ACK 即可（微信只会对 FAIL 重试）
                                return [2 /*return*/, { code: 'SUCCESS', message: 'OK' }];
                            }
                            _c.label = 2;
                        case 2:
                            _c.trys.push([2, 17, , 18]);
                            isMembership = outTradeNo.startsWith('MEM') || attach.startsWith('membership:');
                            if (!isMembership) return [3 /*break*/, 11];
                            recordIdFromAttach = attach.startsWith('membership:')
                                ? attach.slice('membership:'.length)
                                : null;
                            if (!recordIdFromAttach) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.prisma.paymentRecord.findUnique({ where: { id: recordIdFromAttach } })];
                        case 3:
                            _a = _c.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            _a = null;
                            _c.label = 5;
                        case 5:
                            record = _a;
                            if (!!record) return [3 /*break*/, 7];
                            return [4 /*yield*/, this.prisma.paymentRecord.findUnique({ where: { no: outTradeNo } })];
                        case 6:
                            record = _c.sent();
                            _c.label = 7;
                        case 7:
                            if (!record) {
                                this.logger.warn("[wxpay notify] \u627E\u4E0D\u5230 PaymentRecord no=".concat(outTradeNo));
                                // 业务上找不到记录就当未处理 → 让微信继续重试，给运维一个补登记的窗口
                                return [2 /*return*/, { code: 'FAIL', message: 'PaymentRecord not found' }];
                            }
                            if (record.status === 'paid') {
                                this.logger.log("[wxpay notify] \u4F1A\u5458\u5E42\u7B49\u547D\u4E2D no=".concat(outTradeNo, "\uFF08PaymentRecord \u5DF2 paid\uFF09"));
                                return [2 /*return*/, { code: 'SUCCESS', message: 'OK' }];
                            }
                            if (!(record.status === 'pending')) return [3 /*break*/, 9];
                            return [4 /*yield*/, this.merchantService.activateMembership(record.id)];
                        case 8:
                            _c.sent();
                            this.logger.log("[wxpay notify] \u4F1A\u5458\u6FC0\u6D3B\u6210\u529F no=".concat(outTradeNo, " txid=").concat(transactionId));
                            return [3 /*break*/, 10];
                        case 9:
                            // refunding / refunded / failed 等不合法状态 → 仍当作 SUCCESS 让微信停止重试，由人工对账
                            this.logger.warn("[wxpay notify] PaymentRecord \u72B6\u6001\u5F02\u5E38 no=".concat(outTradeNo, " status=").concat(record.status));
                            _c.label = 10;
                        case 10: return [2 /*return*/, { code: 'SUCCESS', message: 'OK' }];
                        case 11:
                            if (!transactionId) return [3 /*break*/, 13];
                            return [4 /*yield*/, this.prisma.payment.findFirst({
                                    where: { wxTransactionId: transactionId, status: 'success' },
                                })];
                        case 12:
                            dupByTx = _c.sent();
                            if (dupByTx) {
                                this.logger.log("[wxpay notify] \u5E42\u7B49\u547D\u4E2D\uFF08wxTransactionId\uFF09 txid=".concat(transactionId));
                                return [2 /*return*/, { code: 'SUCCESS', message: 'OK' }];
                            }
                            _c.label = 13;
                        case 13: return [4 /*yield*/, this.prisma.order.findFirst({ where: { no: outTradeNo } })];
                        case 14:
                            order_1 = _c.sent();
                            if (!order_1) {
                                this.logger.warn("[wxpay notify] \u627E\u4E0D\u5230 Order no=".concat(outTradeNo));
                                return [2 /*return*/, { code: 'FAIL', message: 'Order not found' }];
                            }
                            return [4 /*yield*/, this.prisma.payment.findFirst({
                                    where: { orderId: order_1.id, status: 'success' },
                                })];
                        case 15:
                            dupByOrder = _c.sent();
                            if (dupByOrder) {
                                this.logger.log("[wxpay notify] \u5E42\u7B49\u547D\u4E2D\uFF08orderId\uFF09 orderId=".concat(order_1.id));
                                return [2 /*return*/, { code: 'SUCCESS', message: 'OK' }];
                            }
                            paidAt_1 = new Date();
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, tx.order.updateMany({
                                                    where: { id: order_1.id, status: 'pending_payment' },
                                                    data: {
                                                        status: 'pending_shipment',
                                                        paidAt: paidAt_1,
                                                        paymentMethod: 'wechat',
                                                    },
                                                })];
                                            case 1:
                                                _a.sent();
                                                return [4 /*yield*/, tx.payment.create({
                                                        data: {
                                                            orderId: order_1.id,
                                                            method: 'wechat',
                                                            amount: order_1.payAmount,
                                                            status: 'success',
                                                            paidAt: paidAt_1,
                                                            wxTransactionId: transactionId || null,
                                                        },
                                                    })];
                                            case 2:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 16:
                            _c.sent();
                            this.logger.log("[wxpay notify] \u8BA2\u5355\u5165\u8D26\u6210\u529F no=".concat(outTradeNo, " txid=").concat(transactionId));
                            // 推商家：订单已付款待发货。fire-and-forget，绝不能阻塞回调返回 SUCCESS
                            // （回调超时未返回会被微信无限重试，污染对账）
                            try {
                                this.chat.emitOrderUpdate(order_1.merchantId, {
                                    orderId: order_1.id,
                                    no: order_1.no,
                                    status: 'pending_shipment',
                                    updatedAt: paidAt_1,
                                });
                            }
                            catch (e) {
                                this.logger.warn("[wxpay notify] emit order:update \u5931\u8D25 orderId=".concat(order_1.id, ": ").concat((e === null || e === void 0 ? void 0 : e.message) || e));
                            }
                            return [2 /*return*/, { code: 'SUCCESS', message: 'OK' }];
                        case 17:
                            e_1 = _c.sent();
                            // 业务失败：返回 FAIL 让微信按梯度重试（不要吞错回 SUCCESS）
                            this.logger.error("[wxpay notify] \u4E1A\u52A1\u5904\u7406\u5931\u8D25 no=".concat(outTradeNo, ": ").concat((e_1 === null || e_1 === void 0 ? void 0 : e_1.message) || e_1));
                            return [2 /*return*/, { code: 'FAIL', message: (e_1 === null || e_1 === void 0 ? void 0 : e_1.message) || '处理失败，请重试' }];
                        case 18: return [2 /*return*/];
                    }
                });
            });
        };
        return PaymentController_1;
    }());
    __setFunctionName(_classThis, "PaymentController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _wechatNotify_decorators = [(0, public_decorator_1.Public)(), (0, throttler_1.Throttle)({ default: { limit: 200, ttl: 60000 } }), (0, common_1.Post)('wechat/notify')];
        __esDecorate(_classThis, null, _wechatNotify_decorators, { kind: "method", name: "wechatNotify", static: false, private: false, access: { has: function (obj) { return "wechatNotify" in obj; }, get: function (obj) { return obj.wechatNotify; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PaymentController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PaymentController = _classThis;
}();
exports.PaymentController = PaymentController;
