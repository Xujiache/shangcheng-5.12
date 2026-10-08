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
exports.LedgerXpayService = void 0;
var common_1 = require("@nestjs/common");
var crypto_1 = require("crypto");
var nanoid_1 = require("nanoid");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
var ledger_constants_1 = require("./ledger.constants");
var genTradeSuffix = (0, nanoid_1.customAlphabet)('ACDEFGHJKLMNPQRSTUVWXYZ23456789', 10);
/**
 * 门窗利账 · 小程序虚拟支付（道具直购 short_series_goods）。
 *
 * 为什么：会员是虚拟商品，微信规定虚拟商品须用官方「小程序虚拟支付」，不能用普通微信支付
 * （否则审核被拒，见 docs/虚拟支付接入）。本服务取代普通微信支付卖会员，覆盖 Android + iOS。
 *
 * 流程：createOrder 生成 signData/paySig/signature → 前端 wx.requestVirtualPayment →
 *       平台收银台(iOS:Apple Pay / 安卓:微信) → 发货回调 deliver-notify(本服务验签) →
 *       复用 LedgerPayService.handleNotify（按 outTradeNo 幂等 + 金额校验 + 发放会员）。
 *
 * 配置开关：LEDGER_XPAY_OFFER_ID + LEDGER_XPAY_APP_KEY 齐备才 xpayEnabled()=true；
 *           缺失则前端 virtualPayEnabled=false，自动回退「留言找管理员」，不影响线上。
 *
 * 签名（官方）：paySig    = hex(HMAC_SHA256(AppKey,      'requestVirtualPayment&' + signData))
 *               signature = hex(HMAC_SHA256(session_key, signData))
 * ⚠️ 联调须知：signData/回调字段名与回调验签头以官方《小程序虚拟支付接入指引》最新示例为准，
 *    拿到正式 AppKey/offerId 后用真机核对一次（见各 TODO）。
 */
var LedgerXpayService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var LedgerXpayService = _classThis = /** @class */ (function () {
        function LedgerXpayService_1(prisma, auth, pay, contentSecurity) {
            this.prisma = prisma;
            this.auth = auth;
            this.pay = pay;
            this.contentSecurity = contentSecurity;
            this.logger = new common_1.Logger(LedgerXpayService.name);
        }
        LedgerXpayService_1.prototype.offerId = function () {
            return process.env.LEDGER_XPAY_OFFER_ID || '';
        };
        LedgerXpayService_1.prototype.appKey = function () {
            return process.env.LEDGER_XPAY_APP_KEY || '';
        };
        /** 虚拟支付环境：'1'=沙箱，默认 0=现网（iOS 无沙箱）。 */
        LedgerXpayService_1.prototype.env = function () {
            return process.env.LEDGER_XPAY_ENV === '1' ? 1 : 0;
        };
        /** 虚拟支付是否就绪（道具号 + 密钥齐备）。未就绪则前端回退留言开通。 */
        LedgerXpayService_1.prototype.xpayEnabled = function () {
            return !!this.offerId() && !!this.appKey();
        };
        LedgerXpayService_1.prototype.readConfig = function () {
            return __awaiter(this, void 0, void 0, function () {
                var row;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerConfig.findUnique({ where: { key: 'global' } })];
                        case 1:
                            row = _a.sent();
                            return [2 /*return*/, (0, ledger_constants_1.normalizeLedgerConfig)(row === null || row === void 0 ? void 0 : row.value)];
                    }
                });
            });
        };
        /** 套餐 → 虚拟支付道具 productId：优先 env JSON 映射，其次 plan.productId，最后回退 plan.key。 */
        LedgerXpayService_1.prototype.productIdOf = function (planKey, plan) {
            try {
                var map = JSON.parse(process.env.LEDGER_XPAY_PRODUCTS || '{}');
                if (map && map[planKey])
                    return String(map[planKey]);
            }
            catch (_a) {
                /* 非法 JSON 忽略，走回退 */
            }
            return String((plan === null || plan === void 0 ? void 0 : plan.productId) || planKey);
        };
        LedgerXpayService_1.prototype.hmac = function (key, data) {
            return (0, crypto_1.createHmac)('sha256', key).update(data, 'utf8').digest('hex');
        };
        /**
         * 下单：锁定套餐天数/金额写库 → 用本次 wx.login code 换 session_key → 生成
         * wx.requestVirtualPayment 所需 { mode, signData, paySig, signature }。
         */
        LedgerXpayService_1.prototype.createOrder = function (userId, planKey, code) {
            return __awaiter(this, void 0, void 0, function () {
                var cfg, plan, amountFen, user, sessionKey, outTradeNo, order, signData, paySig, signature;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.xpayEnabled()) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '虚拟支付暂未开通，请联系管理员开通会员');
                            }
                            if (!code)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '缺少微信授权，请重试');
                            return [4 /*yield*/, this.readConfig()];
                        case 1:
                            cfg = _a.sent();
                            plan = cfg.plans.find(function (p) { return p.key === planKey; });
                            if (!plan)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '套餐不存在');
                            amountFen = (0, ledger_constants_1.ledgerPlanPriceFen)(plan.price);
                            if (amountFen <= 0) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '该套餐暂不支持在线支付，请联系管理员');
                            }
                            // ???????????????????? 30 ??????????
                            if (plan.trial) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '体验卡免费领取，无需支付');
                            }
                            return [4 /*yield*/, this.prisma.ledgerUser.findUnique({
                                    where: { id: userId },
                                    select: { id: true },
                                })];
                        case 2:
                            user = _a.sent();
                            if (!user)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '账号不存在');
                            return [4 /*yield*/, this.auth.codeToSession(code)];
                        case 3:
                            sessionKey = (_a.sent()).sessionKey;
                            outTradeNo = 'LXP' + Date.now().toString(36).toUpperCase() + genTradeSuffix();
                            return [4 /*yield*/, this.prisma.ledgerPaymentOrder.create({
                                    data: {
                                        outTradeNo: outTradeNo,
                                        userId: userId,
                                        planKey: plan.key,
                                        days: plan.days,
                                        amountFen: amountFen,
                                        status: 'pending',
                                    },
                                })
                                // 道具直购 signData。paySig 与 signature 都对“这串字符”签名、前端原样回传，故字段顺序无需规范化。
                            ];
                        case 4:
                            order = _a.sent();
                            signData = JSON.stringify({
                                offerId: this.offerId(),
                                buyQuantity: 1,
                                env: this.env(),
                                currencyType: 'CNY',
                                productId: this.productIdOf(plan.key, plan),
                                goodsPrice: amountFen, // 分
                                outTradeNo: outTradeNo,
                                attach: "lmember:".concat(order.id),
                            });
                            paySig = this.hmac(this.appKey(), 'requestVirtualPayment&' + signData);
                            signature = this.hmac(sessionKey, signData);
                            return [2 /*return*/, {
                                    mode: 'short_series_goods',
                                    env: this.env(),
                                    signData: signData,
                                    paySig: paySig,
                                    signature: signature,
                                    outTradeNo: outTradeNo,
                                    amountFen: amountFen,
                                }];
                    }
                });
            });
        };
        /** 服务端/回调签名校验：sig = hex(HMAC_SHA256(AppKey, uriPath + '&' + body))。 */
        LedgerXpayService_1.prototype.verifySig = function (uriPath, body, sig) {
            if (!sig)
                return false;
            return this.hmac(this.appKey(), uriPath + '&' + body) === sig;
        };
        /**
         * 微信「消息推送」签名校验（虚拟支付发货回调走此通道下发）。
         * 明文模式：signature = sha1(sort([Token, timestamp, nonce]).join(''))。
         * Token 取 LEDGER_WX_PUSH_TOKEN（与公众平台「消息推送」配置一致）。
         */
        LedgerXpayService_1.prototype.verifyPushSignature = function (signature, timestamp, nonce) {
            var token = process.env.LEDGER_WX_PUSH_TOKEN || '';
            if (!token || !signature || !timestamp || !nonce)
                return false;
            if (!/^\d{10}$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300)
                return false;
            if (!/^[a-f0-9]{40}$/i.test(signature))
                return false;
            var sha1 = (0, crypto_1.createHash)('sha1').update([token, timestamp, nonce].sort().join('')).digest('hex');
            var received = Buffer.from(signature, 'hex');
            var expected = Buffer.from(sha1, 'hex');
            return received.length === expected.length && (0, crypto_1.timingSafeEqual)(received, expected);
        };
        /** 推送 URL 签名不覆盖报文；发放前必须向微信查单确认真实付款。 */
        LedgerXpayService_1.prototype.confirmedPayment = function (outTradeNo) {
            return __awaiter(this, void 0, void 0, function () {
                var order, user, token, body, sig, response, _a, result, paidFen;
                var _b, _c, _d, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerPaymentOrder.findUnique({ where: { outTradeNo: outTradeNo } })];
                        case 1:
                            order = _g.sent();
                            if (!order || order.status !== 'pending' || order.amountFen <= 0)
                                return [2 /*return*/, null];
                            return [4 /*yield*/, this.prisma.ledgerUser.findUnique({ where: { id: order.userId } })];
                        case 2:
                            user = _g.sent();
                            if (!(user === null || user === void 0 ? void 0 : user.wxOpenid) || !this.contentSecurity)
                                return [2 /*return*/, null];
                            return [4 /*yield*/, this.contentSecurity.ledgerAccessToken()];
                        case 3:
                            token = _g.sent();
                            if (!token)
                                return [2 /*return*/, null];
                            body = JSON.stringify({ openid: user.wxOpenid, env: this.env(), order_id: outTradeNo });
                            sig = this.hmac(this.appKey(), '/xpay/query_order&' + body);
                            _g.label = 4;
                        case 4:
                            _g.trys.push([4, 6, , 7]);
                            return [4 /*yield*/, fetch("https://api.weixin.qq.com/xpay/query_order?access_token=".concat(encodeURIComponent(token), "&pay_sig=").concat(sig), {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: body,
                                    signal: AbortSignal.timeout(10000),
                                })];
                        case 5:
                            response = _g.sent();
                            return [3 /*break*/, 7];
                        case 6:
                            _a = _g.sent();
                            this.logger.warn('[ledger xpay] 微信查单不可用，延后发放');
                            return [2 /*return*/, null];
                        case 7: return [4 /*yield*/, response.json().catch(function () { return null; })];
                        case 8:
                            result = _g.sent();
                            paidFen = (_b = result === null || result === void 0 ? void 0 : result.order) === null || _b === void 0 ? void 0 : _b.paid_fee;
                            if (!response.ok ||
                                (result === null || result === void 0 ? void 0 : result.errcode) !== 0 ||
                                ((_c = result === null || result === void 0 ? void 0 : result.order) === null || _c === void 0 ? void 0 : _c.order_id) !== outTradeNo ||
                                ![2, 3, 4].includes((_d = result === null || result === void 0 ? void 0 : result.order) === null || _d === void 0 ? void 0 : _d.status) ||
                                !Number.isSafeInteger(paidFen) ||
                                paidFen <= 0 ||
                                paidFen !== order.amountFen ||
                                ((_e = result === null || result === void 0 ? void 0 : result.order) === null || _e === void 0 ? void 0 : _e.order_fee) !== order.amountFen ||
                                ((_f = result === null || result === void 0 ? void 0 : result.order) === null || _f === void 0 ? void 0 : _f.env_type) !== this.env() + 1) {
                                this.logger.warn("[ledger xpay] \u5FAE\u4FE1\u67E5\u5355\u672A\u786E\u8BA4\u4ED8\u6B3E outTradeNo=".concat(outTradeNo));
                                return [2 /*return*/, null];
                            }
                            return [2 /*return*/, { paidFen: paidFen, txid: String(result.order.wxpay_order_id || result.order.wx_order_id || '') }];
                    }
                });
            });
        };
        /**
         * 发货回调（xpay_goods_deliver_notify）：用 outTradeNo 查微信权威订单 → 复用 pay.handleNotify
         * 幂等发放会员。返回 true=已处理。
         * URL 签名未绑定请求体，绝不能直接信任回调自报的金额与支付状态。
         */
        LedgerXpayService_1.prototype.handleDeliverNotify = function (payload) {
            return __awaiter(this, void 0, void 0, function () {
                var outTradeNo, local, confirmed;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            outTradeNo = (payload === null || payload === void 0 ? void 0 : payload.OutTradeNo) || (payload === null || payload === void 0 ? void 0 : payload.out_trade_no) || (payload === null || payload === void 0 ? void 0 : payload.outTradeNo) || '';
                            if (!outTradeNo) {
                                this.logger.warn('[ledger xpay] 发货回调缺 outTradeNo');
                                return [2 /*return*/, false];
                            }
                            return [4 /*yield*/, this.prisma.ledgerPaymentOrder.findUnique({ where: { outTradeNo: outTradeNo } })];
                        case 1:
                            local = _a.sent();
                            if ((local === null || local === void 0 ? void 0 : local.status) === 'paid' || (local === null || local === void 0 ? void 0 : local.grantedAt))
                                return [2 /*return*/, true];
                            return [4 /*yield*/, this.confirmedPayment(outTradeNo)];
                        case 2:
                            confirmed = _a.sent();
                            if (!confirmed)
                                return [2 /*return*/, false];
                            return [2 /*return*/, this.pay.handleNotify(outTradeNo, confirmed.txid, confirmed.paidFen)];
                    }
                });
            });
        };
        return LedgerXpayService_1;
    }());
    __setFunctionName(_classThis, "LedgerXpayService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LedgerXpayService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LedgerXpayService = _classThis;
}();
exports.LedgerXpayService = LedgerXpayService;
