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
exports.LedgerPayService = void 0;
var common_1 = require("@nestjs/common");
var nanoid_1 = require("nanoid");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
var ledger_constants_1 = require("./ledger.constants");
var genTradeSuffix = (0, nanoid_1.customAlphabet)('ACDEFGHJKLMNPQRSTUVWXYZ23456789', 10);
/**
 * 门窗利账 · 会员在线支付（用户直接付款 → 微信回调自动开通会员）。
 *
 * 资金安全（P0）：
 *   - 金额/天数在下单时按后台套餐锁定写库，回调以本表为准，绝不信任前端传值
 *   - 回调校验签名 + 解密 + 金额比对 + 行级幂等（updateMany where status=pending）
 *   - 微信支付未配齐 → payEnabled=false，App 自动回退到「留言找管理员」流程
 *
 * 注意：门窗利账是独立小程序（appid=LEDGER_WX_APPID），与商城共用商户号(WX_PAY_MCH_ID)，
 * 故下单时显式传 appid + 专用回调地址 LEDGER_PAY_NOTIFY_URL，避免回调串到商城路由。
 */
var LedgerPayService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var LedgerPayService = _classThis = /** @class */ (function () {
        function LedgerPayService_1(prisma, wxpay, auth) {
            this.prisma = prisma;
            this.wxpay = wxpay;
            this.auth = auth;
            this.logger = new common_1.Logger(LedgerPayService.name);
        }
        /** 在线支付是否就绪：微信支付配齐 + ledger 小程序 appid + 专用回调地址都到位。 */
        LedgerPayService_1.prototype.payEnabled = function () {
            return this.wxpay.isReady() && !!process.env.LEDGER_WX_APPID && !!this.notifyUrl();
        };
        LedgerPayService_1.prototype.notifyUrl = function () {
            return process.env.LEDGER_PAY_NOTIFY_URL || '';
        };
        LedgerPayService_1.prototype.readConfig = function () {
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
        /** 下单：锁定套餐天数/金额 → 解析 openid → 微信 JSAPI 下单 → 返回小程序调起支付参数。 */
        LedgerPayService_1.prototype.createMembershipOrder = function (userId, planKey, code) {
            return __awaiter(this, void 0, void 0, function () {
                var cfg, plan, amountFen, user, openid, outTradeNo, order, invoke, e_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.payEnabled()) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '在线支付暂未开通，请联系管理员开通会员');
                            }
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
                                    select: { wxOpenid: true },
                                })];
                        case 2:
                            user = _a.sent();
                            if (!user)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '账号不存在');
                            openid = user.wxOpenid || '';
                            if (!!openid) return [3 /*break*/, 4];
                            if (!code)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '缺少微信授权，请重试');
                            return [4 /*yield*/, this.auth.codeToOpenid(code)];
                        case 3:
                            openid = _a.sent();
                            _a.label = 4;
                        case 4:
                            outTradeNo = 'LMEM' + Date.now().toString(36).toUpperCase() + genTradeSuffix();
                            return [4 /*yield*/, this.prisma.ledgerPaymentOrder.create({
                                    data: {
                                        outTradeNo: outTradeNo,
                                        userId: userId,
                                        planKey: plan.key,
                                        days: plan.days,
                                        amountFen: amountFen,
                                        status: 'pending',
                                    },
                                })];
                        case 5:
                            order = _a.sent();
                            _a.label = 6;
                        case 6:
                            _a.trys.push([6, 8, , 10]);
                            return [4 /*yield*/, this.wxpay.createMiniPay({
                                    outTradeNo: outTradeNo,
                                    description: "\u95E8\u7A97\u5229\u8D26\u4F1A\u5458 \u00B7 ".concat(plan.label),
                                    totalFen: amountFen,
                                    openid: openid,
                                    attach: "lmember:".concat(order.id),
                                    appid: process.env.LEDGER_WX_APPID,
                                    notifyUrl: this.notifyUrl(),
                                })];
                        case 7:
                            invoke = _a.sent();
                            return [2 /*return*/, __assign(__assign({}, invoke), { outTradeNo: outTradeNo, amountFen: amountFen, planKey: plan.key })];
                        case 8:
                            e_1 = _a.sent();
                            return [4 /*yield*/, this.prisma.ledgerPaymentOrder
                                    .update({ where: { id: order.id }, data: { status: 'failed' } })
                                    .catch(function () { })];
                        case 9:
                            _a.sent();
                            throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, (e_1 === null || e_1 === void 0 ? void 0 : e_1.message) || '微信下单失败，请稍后再试');
                        case 10: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * 微信支付回调入账（幂等 + 金额校验 + 自动发放会员）。
         * 返回 true=已正确处理（回 SUCCESS）；false=未找到订单（回 FAIL 让微信按梯度重试）。
         */
        LedgerPayService_1.prototype.handleNotify = function (outTradeNo, transactionId, paidFen) {
            return __awaiter(this, void 0, void 0, function () {
                var order, now, cfgForGrant, planForGrant, isPerpetual, isTrial, granted, g;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerPaymentOrder.findUnique({ where: { outTradeNo: outTradeNo } })];
                        case 1:
                            order = _a.sent();
                            if (!order) {
                                this.logger.warn("[ledger pay] \u627E\u4E0D\u5230\u8BA2\u5355 outTradeNo=".concat(outTradeNo));
                                return [2 /*return*/, false];
                            }
                            // 无法证明实付金额时拒绝入账；零金额、NaN 和未锁定正数金额均不可发放会员。
                            if (!Number.isSafeInteger(paidFen) || paidFen <= 0 || order.amountFen <= 0) {
                                this.logger.warn("[ledger pay] \u56DE\u8C03\u91D1\u989D\u65E0\u6548 outTradeNo=".concat(outTradeNo));
                                return [2 /*return*/, false];
                            }
                            // 幂等：已入账直接 ACK
                            if (order.status === 'paid' || order.grantedAt) {
                                this.logger.log("[ledger pay] \u5E42\u7B49\u547D\u4E2D outTradeNo=".concat(outTradeNo));
                                return [2 /*return*/, true];
                            }
                            if (order.status !== 'pending')
                                return [2 /*return*/, false
                                    // 金额防篡改：回调金额必须与下单锁定金额一致
                                ];
                            if (!(paidFen !== order.amountFen)) return [3 /*break*/, 3];
                            this.logger.error("[ledger pay] \u91D1\u989D\u4E0D\u4E00\u81F4 outTradeNo=".concat(outTradeNo, " expect=").concat(order.amountFen, " got=").concat(paidFen));
                            return [4 /*yield*/, this.prisma.ledgerPaymentOrder
                                    .update({ where: { id: order.id }, data: { status: 'failed' } })
                                    .catch(function () { })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, true]; // ACK 不重发，金额异常交人工对账/退款
                        case 3:
                            now = new Date();
                            return [4 /*yield*/, this.readConfig()];
                        case 4:
                            cfgForGrant = _a.sent();
                            planForGrant = cfgForGrant.plans.find(function (p) { return p.key === order.planKey; });
                            isPerpetual = !!(planForGrant === null || planForGrant === void 0 ? void 0 : planForGrant.perpetual);
                            isTrial = !!(planForGrant === null || planForGrant === void 0 ? void 0 : planForGrant.trial);
                            granted = null;
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var claim, membership, before, after;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, tx.ledgerPaymentOrder.updateMany({
                                                    where: { id: order.id, status: 'pending' },
                                                    data: { status: 'paid', paidAt: now, transactionId: transactionId || null },
                                                })];
                                            case 1:
                                                claim = _a.sent();
                                                if (claim.count === 0)
                                                    return [2 /*return*/]; // 已被另一并发回调处理
                                                return [4 /*yield*/, tx.ledgerMembership.findUnique({ where: { userId: order.userId } })];
                                            case 2:
                                                membership = _a.sent();
                                                if (!!membership) return [3 /*break*/, 4];
                                                return [4 /*yield*/, tx.ledgerMembership.create({ data: { userId: order.userId } })];
                                            case 3:
                                                membership = _a.sent();
                                                _a.label = 4;
                                            case 4:
                                                before = membership.expiresAt;
                                                after = (0, ledger_constants_1.computeGrantExpiry)(before, order.days, now);
                                                return [4 /*yield*/, tx.ledgerMembership.update({
                                                        where: { id: membership.id },
                                                        data: __assign(__assign({ expiresAt: after, lastPlanKey: order.planKey }, (isPerpetual ? { perpetual: true } : {})), (isTrial ? { trialClaimedAt: now } : {})),
                                                    })];
                                            case 5:
                                                _a.sent();
                                                return [4 /*yield*/, tx.ledgerMembershipLog.create({
                                                        data: {
                                                            membershipId: membership.id,
                                                            deltaDays: order.days,
                                                            planKey: order.planKey,
                                                            beforeAt: before,
                                                            afterAt: after,
                                                            operatorId: null,
                                                            note: "\u5728\u7EBF\u652F\u4ED8\u5F00\u901A\uFF08".concat((order.amountFen / 100).toFixed(2), " \u5143 / ").concat(outTradeNo, "\uFF09"),
                                                        },
                                                    })];
                                            case 6:
                                                _a.sent();
                                                return [4 /*yield*/, tx.ledgerPaymentOrder.update({ where: { id: order.id }, data: { grantedAt: now } })];
                                            case 7:
                                                _a.sent();
                                                granted = { after: after, days: order.days };
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 5:
                            _a.sent();
                            if (!granted) return [3 /*break*/, 7];
                            g = granted;
                            return [4 /*yield*/, this.prisma.ledgerNotification
                                    .create({
                                    data: {
                                        userId: order.userId,
                                        type: 'member',
                                        title: '会员开通成功',
                                        body: "\u652F\u4ED8\u6210\u529F\uFF0C\u5DF2\u4E3A\u60A8\u589E\u52A0 ".concat(g.days, " \u5929\u4F1A\u5458\u65F6\u957F\uFF0C\u6709\u6548\u671F\u81F3 ").concat(g.after.toISOString().slice(0, 10), "\u3002"),
                                    },
                                })
                                    .catch(function () { })];
                        case 6:
                            _a.sent();
                            this.logger.log("[ledger pay] \u5F00\u901A\u6210\u529F outTradeNo=".concat(outTradeNo, " txid=").concat(transactionId));
                            _a.label = 7;
                        case 7: return [2 /*return*/, true];
                    }
                });
            });
        };
        return LedgerPayService_1;
    }());
    __setFunctionName(_classThis, "LedgerPayService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LedgerPayService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LedgerPayService = _classThis;
}();
exports.LedgerPayService = LedgerPayService;
