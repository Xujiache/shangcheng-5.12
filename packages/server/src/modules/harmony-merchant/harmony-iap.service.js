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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HarmonyIapService = void 0;
var common_1 = require("@nestjs/common");
var node_crypto_1 = require("node:crypto");
var nanoid_1 = require("nanoid");
var client_1 = require("@prisma/client");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
var HarmonyIapService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var HarmonyIapService = _classThis = /** @class */ (function () {
        function HarmonyIapService_1(prisma, jws, iapServer) {
            this.prisma = prisma;
            this.jws = jws;
            this.iapServer = iapServer;
        }
        HarmonyIapService_1.prototype.prepare = function (merchantId, userId, planId) {
            return __awaiter(this, void 0, void 0, function () {
                var plan, merchant, orderNo;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.memberPlan.findUnique({ where: { id: planId } })];
                        case 1:
                            plan = _a.sent();
                            if (!plan || plan.status !== 'active') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '套餐不存在或已下架');
                            }
                            if (!plan.huaweiProductId || !plan.huaweiProductType) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '该套餐尚未配置 AppGallery 商品');
                            }
                            if (!['subscription', 'consumable'].includes(plan.huaweiProductType)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, 'AppGallery 商品类型配置错误');
                            }
                            return [4 /*yield*/, this.prisma.merchant.findUnique({ where: { id: merchantId } })];
                        case 2:
                            merchant = _a.sent();
                            if (!merchant || merchant.status !== 'active') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '当前商户状态不允许购买会员');
                            }
                            orderNo = "HMI".concat(Date.now()).concat((0, nanoid_1.nanoid)(10));
                            return [4 /*yield*/, this.prisma.harmonyIapOrder.create({
                                    data: {
                                        orderNo: orderNo,
                                        merchantId: merchantId,
                                        userId: userId,
                                        planId: plan.id,
                                        productId: plan.huaweiProductId,
                                        productType: plan.huaweiProductType,
                                        amount: plan.price,
                                    },
                                })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, {
                                    orderNo: orderNo,
                                    productId: plan.huaweiProductId,
                                    productType: plan.huaweiProductType,
                                    developerPayload: JSON.stringify({ orderNo: orderNo }),
                                }];
                    }
                });
            });
        };
        HarmonyIapService_1.prototype.verify = function (merchantId, userId, orderNo, purchaseData) {
            return __awaiter(this, void 0, void 0, function () {
                var prepared, verified, result, error_1;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.harmonyIapOrder.findFirst({
                                where: { orderNo: orderNo, merchantId: merchantId, userId: userId },
                            })];
                        case 1:
                            prepared = _b.sent();
                            if (!prepared)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, 'IAP 订单不存在');
                            if (!(prepared.status === 'activated')) return [3 /*break*/, 3];
                            _a = {
                                ok: true
                            };
                            return [4 /*yield*/, this.currentMembership(merchantId)];
                        case 2: return [2 /*return*/, (_a.membership = _b.sent(),
                                _a.alreadyActivated = true,
                                _a.purchaseToken = prepared.purchaseToken,
                                _a.purchaseOrderId = prepared.providerOrderId,
                                _a.productType = prepared.productType,
                                _a)];
                        case 3:
                            if (prepared.status !== 'prepared' && prepared.status !== 'verified') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, "\u5F53\u524D IAP \u8BA2\u5355\u72B6\u6001\u4E0D\u53EF\u6FC0\u6D3B: ".concat(prepared.status));
                            }
                            verified = this.jws.verifyPurchaseData(purchaseData, prepared.productType);
                            this.assertPurchaseMatches(prepared, verified);
                            _b.label = 4;
                        case 4:
                            _b.trys.push([4, 6, , 7]);
                            return [4 /*yield*/, this.activate(prepared.id, verified, purchaseData)];
                        case 5:
                            result = _b.sent();
                            return [2 /*return*/, __assign({ ok: true }, result)];
                        case 6:
                            error_1 = _b.sent();
                            if (error_1 instanceof client_1.Prisma.PrismaClientKnownRequestError && error_1.code === 'P2002') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.CONFLICT, '该华为交易已被处理，不能重复发放权益');
                            }
                            throw error_1;
                        case 7: return [2 /*return*/];
                    }
                });
            });
        };
        HarmonyIapService_1.prototype.restore = function (merchantId, userId, productType, purchaseData) {
            return __awaiter(this, void 0, void 0, function () {
                var verified, prepared, result;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!['subscription', 'consumable'].includes(productType)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '不支持的华为商品类型');
                            }
                            verified = this.jws.verifyPurchaseData(purchaseData, productType);
                            return [4 /*yield*/, this.prisma.harmonyIapOrder.findFirst({
                                    where: {
                                        merchantId: merchantId,
                                        userId: userId,
                                        OR: __spreadArray([
                                            { purchaseToken: verified.purchaseToken },
                                            { providerOrderId: verified.providerOrderId }
                                        ], (verified.applicationUserName ? [{ orderNo: verified.applicationUserName }] : []), true),
                                    },
                                })];
                        case 1:
                            prepared = _b.sent();
                            if (!prepared) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '该华为购买记录不属于当前商家账号');
                            }
                            this.assertPurchaseMatches(prepared, verified);
                            if (!(prepared.status === 'activated')) return [3 /*break*/, 3];
                            _a = {
                                ok: true
                            };
                            return [4 /*yield*/, this.currentMembership(merchantId)];
                        case 2: return [2 /*return*/, (_a.membership = _b.sent(),
                                _a.alreadyActivated = true,
                                _a.purchaseToken = verified.purchaseToken,
                                _a.purchaseOrderId = verified.providerOrderId,
                                _a.productType = prepared.productType,
                                _a)];
                        case 3:
                            if (prepared.status !== 'prepared' && prepared.status !== 'verified') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, "\u5F53\u524D IAP \u8BA2\u5355\u72B6\u6001\u4E0D\u53EF\u6062\u590D: ".concat(prepared.status));
                            }
                            return [4 /*yield*/, this.activate(prepared.id, verified, purchaseData)];
                        case 4:
                            result = _b.sent();
                            return [2 /*return*/, __assign({ ok: true }, result)];
                    }
                });
            });
        };
        HarmonyIapService_1.prototype.assertPurchaseMatches = function (prepared, verified) {
            if (verified.productId !== prepared.productId) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, '华为支付商品与服务端订单不一致');
            }
            if (verified.applicationUserName && verified.applicationUserName !== prepared.orderNo) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, '华为支付账号绑定信息不一致');
            }
            if (verified.developerPayload) {
                try {
                    var payload = JSON.parse(verified.developerPayload);
                    if (payload.orderNo && payload.orderNo !== prepared.orderNo) {
                        throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, '华为支付商户扩展信息不一致');
                    }
                }
                catch (error) {
                    if (error instanceof biz_exception_1.BizException)
                        throw error;
                }
            }
        };
        HarmonyIapService_1.prototype.activate = function (iapOrderId, verified, purchaseData) {
            return __awaiter(this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                            var order, plan, payment, membership;
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0: return [4 /*yield*/, tx.harmonyIapOrder.findUnique({ where: { id: iapOrderId } })];
                                    case 1:
                                        order = _b.sent();
                                        if (!order)
                                            throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, 'IAP 订单不存在');
                                        if (!(order.status === 'activated')) return [3 /*break*/, 3];
                                        _a = {};
                                        return [4 /*yield*/, this.currentMembership(order.merchantId, tx)];
                                    case 2: return [2 /*return*/, (_a.membership = _b.sent(),
                                            _a.alreadyActivated = true,
                                            _a.purchaseToken = order.purchaseToken,
                                            _a.purchaseOrderId = order.providerOrderId,
                                            _a.productType = order.productType,
                                            _a)];
                                    case 3: return [4 /*yield*/, tx.memberPlan.findUnique({ where: { id: order.planId } })];
                                    case 4:
                                        plan = _b.sent();
                                        if (!plan || plan.status !== 'active' || plan.huaweiProductId !== verified.productId) {
                                            throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, '套餐配置在支付过程中发生变化');
                                        }
                                        return [4 /*yield*/, tx.harmonyIapOrder.update({
                                                where: { id: order.id },
                                                data: {
                                                    status: 'verified',
                                                    purchaseToken: verified.purchaseToken,
                                                    providerOrderId: verified.providerOrderId,
                                                    purchaseData: this.toJsonValue(purchaseData),
                                                    verifiedAt: new Date(),
                                                },
                                            })];
                                    case 5:
                                        _b.sent();
                                        return [4 /*yield*/, tx.paymentRecord.findUnique({ where: { no: order.orderNo } })];
                                    case 6:
                                        payment = _b.sent();
                                        if (!!payment) return [3 /*break*/, 8];
                                        return [4 /*yield*/, tx.paymentRecord.create({
                                                data: {
                                                    no: order.orderNo,
                                                    merchantId: order.merchantId,
                                                    planId: plan.id,
                                                    planName: plan.name,
                                                    planType: plan.type,
                                                    amount: order.amount,
                                                    paymentMethod: 'huawei_iap',
                                                    status: 'paid',
                                                    paidAt: new Date(),
                                                    providerOrderId: verified.providerOrderId,
                                                    purchaseToken: verified.purchaseToken,
                                                },
                                            })];
                                    case 7:
                                        payment = _b.sent();
                                        _b.label = 8;
                                    case 8:
                                        membership = null;
                                        if (!(plan.type === 'addon')) return [3 /*break*/, 10];
                                        return [4 /*yield*/, this.addQuotaPack(tx, order.merchantId, plan.constraints)];
                                    case 9:
                                        _b.sent();
                                        return [3 /*break*/, 12];
                                    case 10: return [4 /*yield*/, this.activateSubscription(tx, order.merchantId, plan, verified.providerOrderId, verified.expirationTime)];
                                    case 11:
                                        membership = _b.sent();
                                        _b.label = 12;
                                    case 12: return [4 /*yield*/, tx.harmonyIapOrder.update({
                                            where: { id: order.id },
                                            data: { status: 'activated', activatedAt: new Date() },
                                        })];
                                    case 13:
                                        _b.sent();
                                        return [2 /*return*/, {
                                                membership: membership,
                                                paymentId: payment.id,
                                                alreadyActivated: false,
                                                purchaseToken: verified.purchaseToken,
                                                purchaseOrderId: verified.providerOrderId,
                                                productType: order.productType,
                                            }];
                                }
                            });
                        }); })];
                });
            });
        };
        HarmonyIapService_1.prototype.activateSubscription = function (tx, merchantId, plan, providerSubscriptionId, signedExpirationTime) {
            return __awaiter(this, void 0, void 0, function () {
                var existing, now, startAt, endAt;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, tx.merchantMembership.findFirst({
                                where: { merchantId: merchantId, planId: plan.id, status: { in: ['trial', 'active'] } },
                                orderBy: { endAt: 'desc' },
                            })];
                        case 1:
                            existing = _a.sent();
                            now = new Date();
                            startAt = existing && existing.endAt > now ? existing.endAt : now;
                            endAt = new Date(startAt);
                            if (signedExpirationTime && signedExpirationTime > now.getTime()) {
                                endAt.setTime(signedExpirationTime);
                            }
                            else if (plan.period === 'monthly')
                                endAt.setMonth(endAt.getMonth() + plan.periodCount);
                            else if (plan.period === 'yearly')
                                endAt.setFullYear(endAt.getFullYear() + plan.periodCount);
                            else if (plan.period === 'weekly')
                                endAt.setDate(endAt.getDate() + 7 * plan.periodCount);
                            else if (plan.period === 'daily')
                                endAt.setDate(endAt.getDate() + plan.periodCount);
                            else
                                endAt.setFullYear(endAt.getFullYear() + 100);
                            return [4 /*yield*/, tx.merchantMembership.updateMany({
                                    where: { merchantId: merchantId, status: { in: ['trial', 'active'] }, NOT: { planId: plan.id } },
                                    data: { status: 'expired' },
                                })];
                        case 2:
                            _a.sent();
                            if (existing) {
                                return [2 /*return*/, tx.merchantMembership.update({
                                        where: { id: existing.id },
                                        data: {
                                            endAt: endAt,
                                            status: 'active',
                                            autoRenew: true,
                                            provider: 'huawei_iap',
                                            providerSubscriptionId: providerSubscriptionId,
                                        },
                                    })];
                            }
                            return [2 /*return*/, tx.merchantMembership.create({
                                    data: {
                                        merchantId: merchantId,
                                        planId: plan.id,
                                        planCode: plan.code,
                                        startAt: startAt,
                                        endAt: endAt,
                                        status: 'active',
                                        autoRenew: true,
                                        provider: 'huawei_iap',
                                        providerSubscriptionId: providerSubscriptionId,
                                    },
                                })];
                    }
                });
            });
        };
        HarmonyIapService_1.prototype.addQuotaPack = function (tx, merchantId, constraints) {
            return __awaiter(this, void 0, void 0, function () {
                var now, periodStart, periodEnd, pushSlots, banner, impression;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            now = new Date();
                            periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
                            periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                            pushSlots = Number((constraints === null || constraints === void 0 ? void 0 : constraints.pushSlots) || 0);
                            banner = Number((constraints === null || constraints === void 0 ? void 0 : constraints.bannerLimit) || 0);
                            impression = Number((constraints === null || constraints === void 0 ? void 0 : constraints.impressionLimit) || 0);
                            return [4 /*yield*/, tx.usageQuota.upsert({
                                    where: { merchantId_periodStart: { merchantId: merchantId, periodStart: periodStart } },
                                    create: {
                                        merchantId: merchantId,
                                        periodStart: periodStart,
                                        periodEnd: periodEnd,
                                        pushSlotsLimit: Math.max(0, pushSlots),
                                        bannerLimit: Math.max(0, banner),
                                        impressionLimit: Math.max(0, impression),
                                    },
                                    update: {
                                        pushSlotsLimit: { increment: Math.max(0, pushSlots) },
                                        bannerLimit: { increment: Math.max(0, banner) },
                                        impressionLimit: { increment: Math.max(0, impression) },
                                    },
                                })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        HarmonyIapService_1.prototype.currentMembership = function (merchantId_1) {
            return __awaiter(this, arguments, void 0, function (merchantId, client) {
                if (client === void 0) { client = this.prisma; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, client.merchantMembership.findFirst({
                            where: { merchantId: merchantId, status: { in: ['trial', 'active'] } },
                            orderBy: { endAt: 'desc' },
                            include: { plan: true },
                        })];
                });
            });
        };
        HarmonyIapService_1.prototype.handleNotification = function (body) {
            return __awaiter(this, void 0, void 0, function () {
                var object;
                return __generator(this, function (_a) {
                    object = body && typeof body === 'object' ? body : {};
                    if (object.notificationVersion || object.notificationMetaData) {
                        return [2 /*return*/, this.handleV3Notification(object)];
                    }
                    return [2 /*return*/, this.handleLegacySignedNotification(object)];
                });
            });
        };
        HarmonyIapService_1.prototype.handleV3Notification = function (notification) {
            return __awaiter(this, void 0, void 0, function () {
                var notificationType, version, requestId, signedTime, metadata, expectedApplicationId, expectedPackage, applicationId, packageName, environment, purchaseToken, purchaseOrderId, providerType, claimed, response, verified, order, purchaseData, response, verified, order, purchaseData, error_2;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            notificationType = String(notification.notificationType || '')
                                .trim()
                                .toUpperCase();
                            version = String(notification.notificationVersion || '')
                                .trim()
                                .toLowerCase();
                            requestId = String(notification.notificationRequestId || '').trim();
                            signedTime = Number(notification.signedTime || 0);
                            metadata = this.asObject(notification.notificationMetaData);
                            if (!notificationType || version !== 'v3' || !requestId || !metadata || !signedTime) {
                                throw new common_1.BadRequestException('华为 IAP v3 通知格式不正确');
                            }
                            if (requestId.length > 256 || signedTime > Date.now() + 10 * 60000) {
                                throw new common_1.BadRequestException('华为 IAP 通知标识或时间无效');
                            }
                            // The official test event intentionally uses a fixed test package and fake
                            // transaction IDs. It only proves callback reachability and must never
                            // query or mutate entitlements.
                            if (notificationType === 'TEST')
                                return [2 /*return*/, { result: 0 }];
                            expectedApplicationId = String(process.env.HUAWEI_IAP_APPLICATION_ID || '').trim();
                            if (!expectedApplicationId || !((_a = this.iapServer) === null || _a === void 0 ? void 0 : _a.isConfigured())) {
                                throw new common_1.ServiceUnavailableException('华为 IAP 服务端鉴权尚未配置');
                            }
                            expectedPackage = String(process.env.HUAWEI_IAP_PACKAGE_NAME || '').trim() || 'top.ewsn.jingwei.merchant';
                            applicationId = String(metadata.applicationId || '').trim();
                            packageName = String(metadata.packageName || '').trim();
                            environment = String(metadata.environment || '')
                                .trim()
                                .toUpperCase();
                            purchaseToken = String(metadata.purchaseToken || '').trim();
                            purchaseOrderId = String(metadata.purchaseOrderId || '').trim();
                            providerType = Number(metadata.type);
                            if (applicationId !== expectedApplicationId ||
                                packageName !== expectedPackage ||
                                !['NORMAL', 'SANDBOX'].includes(environment)) {
                                throw new common_1.BadRequestException('华为 IAP 通知应用身份不匹配');
                            }
                            if (purchaseToken.length < 16 ||
                                purchaseToken.length > 512 ||
                                purchaseOrderId.length < 8 ||
                                purchaseOrderId.length > 256) {
                                throw new common_1.BadRequestException('华为 IAP 通知缺少有效交易标识');
                            }
                            return [4 /*yield*/, this.claimNotification(requestId, notificationType, String(notification.notificationSubtype || '').trim(), environment, purchaseToken, purchaseOrderId, notification)];
                        case 1:
                            claimed = _b.sent();
                            if (!claimed)
                                return [2 /*return*/, { result: 0 }];
                            _b.label = 2;
                        case 2:
                            _b.trys.push([2, 23, , 25]);
                            if (!(providerType === 2)) return [3 /*break*/, 12];
                            return [4 /*yield*/, this.iapServer.querySubscriptionStatus(purchaseToken, purchaseOrderId)];
                        case 3:
                            response = _b.sent();
                            verified = void 0;
                            try {
                                verified = this.jws.verifySubscriptionStatus(response.jwsSubGroupStatus);
                            }
                            catch (_c) {
                                throw new common_1.BadGatewayException('华为 IAP 权威订阅状态验签失败');
                            }
                            this.assertNotificationTransaction(purchaseToken, purchaseOrderId, verified);
                            return [4 /*yield*/, this.findNotificationOrder(verified)];
                        case 4:
                            order = _b.sent();
                            if (!order) {
                                throw new common_1.ServiceUnavailableException('华为 IAP 交易尚未与本地订单关联');
                            }
                            this.assertPurchaseMatches(order, verified);
                            purchaseData = JSON.stringify({
                                notification: notification,
                                jwsSubGroupStatus: response.jwsSubGroupStatus,
                            });
                            if (!verified.active) return [3 /*break*/, 8];
                            if (!(order.status === 'prepared' || order.status === 'verified')) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.activate(order.id, verified, purchaseData)];
                        case 5:
                            _b.sent();
                            _b.label = 6;
                        case 6: return [4 /*yield*/, this.syncAuthoritativeSubscription(order, verified, purchaseData)];
                        case 7:
                            _b.sent();
                            return [3 /*break*/, 10];
                        case 8: return [4 /*yield*/, this.expireAuthoritativeSubscription(order, verified, purchaseData)];
                        case 9:
                            _b.sent();
                            _b.label = 10;
                        case 10: return [4 /*yield*/, this.completeNotification(requestId, order.id)];
                        case 11:
                            _b.sent();
                            return [2 /*return*/, { result: 0 }];
                        case 12:
                            if (!(providerType === 0 || providerType === 1)) return [3 /*break*/, 22];
                            return [4 /*yield*/, this.iapServer.queryOrderStatus(purchaseToken, purchaseOrderId)];
                        case 13:
                            response = _b.sent();
                            verified = void 0;
                            try {
                                verified = this.jws.verifyOrderStatus(response.jwsPurchaseOrder);
                            }
                            catch (_d) {
                                throw new common_1.BadGatewayException('华为 IAP 权威订单状态验签失败');
                            }
                            this.assertNotificationTransaction(purchaseToken, purchaseOrderId, verified);
                            return [4 /*yield*/, this.findNotificationOrder(verified)];
                        case 14:
                            order = _b.sent();
                            if (!order) {
                                throw new common_1.ServiceUnavailableException('华为 IAP 交易尚未与本地订单关联');
                            }
                            this.assertPurchaseMatches(order, verified);
                            purchaseData = JSON.stringify({
                                notification: notification,
                                jwsPurchaseOrder: response.jwsPurchaseOrder,
                            });
                            if (!verified.paid) return [3 /*break*/, 17];
                            if (!(order.status === 'prepared' || order.status === 'verified')) return [3 /*break*/, 16];
                            return [4 /*yield*/, this.activate(order.id, verified, purchaseData)];
                        case 15:
                            _b.sent();
                            _b.label = 16;
                        case 16: return [3 /*break*/, 20];
                        case 17:
                            if (!verified.refunded) return [3 /*break*/, 19];
                            return [4 /*yield*/, this.refundAuthoritativeOrder(order, verified.providerOrderId, purchaseData)];
                        case 18:
                            _b.sent();
                            return [3 /*break*/, 20];
                        case 19: throw new common_1.ServiceUnavailableException("\u534E\u4E3A IAP \u8BA2\u5355\u5C1A\u672A\u5B8C\u6210: ".concat(verified.status));
                        case 20: return [4 /*yield*/, this.completeNotification(requestId, order.id)];
                        case 21:
                            _b.sent();
                            return [2 /*return*/, { result: 0 }];
                        case 22: throw new common_1.BadRequestException("\u6682\u4E0D\u652F\u6301\u7684\u534E\u4E3A IAP \u5546\u54C1\u7C7B\u578B: ".concat(providerType));
                        case 23:
                            error_2 = _b.sent();
                            return [4 /*yield*/, this.releaseNotification(requestId)];
                        case 24:
                            _b.sent();
                            throw error_2;
                        case 25: return [2 /*return*/];
                    }
                });
            });
        };
        HarmonyIapService_1.prototype.handleLegacySignedNotification = function (object) {
            return __awaiter(this, void 0, void 0, function () {
                var signedPayload, payload, token, providerOrderId, order, event, rawPurchaseData, expirationTime;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            signedPayload = String(object.signedPayload ||
                                object.jwsNotification ||
                                object.notification ||
                                object.purchaseData ||
                                '');
                            if (!signedPayload)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '缺少通知签名载荷');
                            payload = this.jws.verifyCompactJws(signedPayload);
                            token = this.findString(payload, 'purchaseToken');
                            providerOrderId = this.findString(payload, 'purchaseOrderId') || this.findString(payload, 'orderId');
                            if (!token && !providerOrderId) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '通知缺少交易标识');
                            }
                            return [4 /*yield*/, this.prisma.harmonyIapOrder.findFirst({
                                    where: token ? { purchaseToken: token } : { providerOrderId: providerOrderId },
                                })];
                        case 1:
                            order = _a.sent();
                            if (!order)
                                return [2 /*return*/, { result: 0 }];
                            event = String(this.findString(payload, 'notificationType') || this.findString(payload, 'status') || '').toUpperCase();
                            rawPurchaseData = payload;
                            if (!/REFUND|REVOK/.test(event)) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.$transaction([
                                    this.prisma.harmonyIapOrder.update({
                                        where: { id: order.id },
                                        data: {
                                            status: 'refunded',
                                            refundedAt: new Date(),
                                            purchaseData: rawPurchaseData,
                                        },
                                    }),
                                    this.prisma.paymentRecord.updateMany({
                                        where: { no: order.orderNo },
                                        data: { status: 'refunded' },
                                    }),
                                    this.prisma.merchantMembership.updateMany({
                                        where: { merchantId: order.merchantId, planId: order.planId },
                                        data: { status: 'expired', autoRenew: false },
                                    }),
                                ])];
                        case 2:
                            _a.sent();
                            return [3 /*break*/, 9];
                        case 3:
                            if (!event.includes('EXPIRE')) return [3 /*break*/, 5];
                            // 到期并不等于支付失败：保留原 paid 账单，只收回当前权益。
                            return [4 /*yield*/, this.prisma.$transaction([
                                    this.prisma.harmonyIapOrder.update({
                                        where: { id: order.id },
                                        data: { status: 'expired', purchaseData: rawPurchaseData },
                                    }),
                                    this.prisma.merchantMembership.updateMany({
                                        where: { merchantId: order.merchantId, planId: order.planId },
                                        data: { status: 'expired', autoRenew: false },
                                    }),
                                ])];
                        case 4:
                            // 到期并不等于支付失败：保留原 paid 账单，只收回当前权益。
                            _a.sent();
                            return [3 /*break*/, 9];
                        case 5:
                            if (!/CANCEL|STOP_AUTO_RENEW/.test(event)) return [3 /*break*/, 7];
                            // 取消自动续费后，用户仍可使用已经付费的剩余有效期。
                            return [4 /*yield*/, this.prisma.$transaction([
                                    this.prisma.harmonyIapOrder.update({
                                        where: { id: order.id },
                                        data: { status: 'cancelled', purchaseData: rawPurchaseData },
                                    }),
                                    this.prisma.merchantMembership.updateMany({
                                        where: { merchantId: order.merchantId, planId: order.planId },
                                        data: { autoRenew: false },
                                    }),
                                ])];
                        case 6:
                            // 取消自动续费后，用户仍可使用已经付费的剩余有效期。
                            _a.sent();
                            return [3 /*break*/, 9];
                        case 7:
                            if (!/RENEW|ACTIVE|SUBSCRIB/.test(event)) return [3 /*break*/, 9];
                            expirationTime = this.findNumber(payload, 'expirationTime');
                            if (!(expirationTime > Date.now())) return [3 /*break*/, 9];
                            return [4 /*yield*/, this.prisma.$transaction([
                                    this.prisma.harmonyIapOrder.update({
                                        where: { id: order.id },
                                        data: { status: 'activated', purchaseData: rawPurchaseData },
                                    }),
                                    this.prisma.merchantMembership.updateMany({
                                        where: { merchantId: order.merchantId, planId: order.planId },
                                        data: { status: 'active', autoRenew: true, endAt: new Date(expirationTime) },
                                    }),
                                ])];
                        case 8:
                            _a.sent();
                            _a.label = 9;
                        case 9: return [2 /*return*/, { result: 0 }];
                    }
                });
            });
        };
        HarmonyIapService_1.prototype.assertNotificationTransaction = function (purchaseToken, purchaseOrderId, verified) {
            if (verified.purchaseToken !== purchaseToken || verified.providerOrderId !== purchaseOrderId) {
                throw new common_1.BadGatewayException('华为 IAP 查询结果与通知交易不一致');
            }
        };
        HarmonyIapService_1.prototype.findNotificationOrder = function (verified) {
            return __awaiter(this, void 0, void 0, function () {
                var orderNo;
                return __generator(this, function (_a) {
                    orderNo = this.purchaseOrderNo(verified);
                    return [2 /*return*/, this.prisma.harmonyIapOrder.findFirst({
                            where: {
                                OR: __spreadArray([
                                    { purchaseToken: verified.purchaseToken },
                                    { providerOrderId: verified.providerOrderId }
                                ], (orderNo ? [{ orderNo: orderNo }] : []), true),
                            },
                        })];
                });
            });
        };
        HarmonyIapService_1.prototype.purchaseOrderNo = function (verified) {
            if (verified.applicationUserName)
                return verified.applicationUserName;
            if (!verified.developerPayload)
                return '';
            try {
                var payload = JSON.parse(verified.developerPayload);
                return typeof payload.orderNo === 'string' ? payload.orderNo : '';
            }
            catch (_a) {
                return '';
            }
        };
        HarmonyIapService_1.prototype.syncAuthoritativeSubscription = function (order, verified, purchaseData) {
            return __awaiter(this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                var plan, membership, renewal;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, tx.memberPlan.findUnique({ where: { id: order.planId } })];
                                        case 1:
                                            plan = _a.sent();
                                            if (!plan || plan.huaweiProductId !== verified.productId) {
                                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, '华为订阅商品与会员套餐不一致');
                                            }
                                            return [4 /*yield*/, tx.merchantMembership.findFirst({
                                                    where: { merchantId: order.merchantId, planId: order.planId },
                                                    orderBy: { endAt: 'desc' },
                                                })];
                                        case 2:
                                            membership = _a.sent();
                                            if (!membership) return [3 /*break*/, 4];
                                            return [4 /*yield*/, tx.merchantMembership.update({
                                                    where: { id: membership.id },
                                                    data: __assign({ status: 'active', autoRenew: verified.autoRenew, provider: 'huawei_iap', providerSubscriptionId: verified.purchaseToken }, (verified.expirationTime && verified.expirationTime > Date.now()
                                                        ? { endAt: new Date(verified.expirationTime) }
                                                        : {})),
                                                })];
                                        case 3:
                                            _a.sent();
                                            _a.label = 4;
                                        case 4: return [4 /*yield*/, tx.harmonyIapOrder.update({
                                                where: { id: order.id },
                                                data: {
                                                    status: 'activated',
                                                    purchaseToken: verified.purchaseToken,
                                                    purchaseData: this.toJsonValue(purchaseData),
                                                },
                                            })];
                                        case 5:
                                            _a.sent();
                                            if (!(order.providerOrderId && order.providerOrderId !== verified.providerOrderId)) return [3 /*break*/, 8];
                                            return [4 /*yield*/, tx.paymentRecord.findUnique({
                                                    where: { providerOrderId: verified.providerOrderId },
                                                })];
                                        case 6:
                                            renewal = _a.sent();
                                            if (!!renewal) return [3 /*break*/, 8];
                                            return [4 /*yield*/, tx.paymentRecord.create({
                                                    data: {
                                                        no: "HMR".concat((0, node_crypto_1.createHash)('sha256').update(verified.providerOrderId).digest('hex').slice(0, 24)),
                                                        merchantId: order.merchantId,
                                                        planId: plan.id,
                                                        planName: plan.name,
                                                        planType: plan.type,
                                                        amount: order.amount,
                                                        paymentMethod: 'huawei_iap',
                                                        status: 'paid',
                                                        paidAt: new Date(),
                                                        providerOrderId: verified.providerOrderId,
                                                    },
                                                })];
                                        case 7:
                                            _a.sent();
                                            _a.label = 8;
                                        case 8: return [2 /*return*/];
                                    }
                                });
                            }); })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        HarmonyIapService_1.prototype.expireAuthoritativeSubscription = function (order, verified, purchaseData) {
            return __awaiter(this, void 0, void 0, function () {
                var status;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            status = verified.refunded ? 'refunded' : 'expired';
                            return [4 /*yield*/, this.prisma.$transaction(__spreadArray(__spreadArray([
                                    this.prisma.harmonyIapOrder.update({
                                        where: { id: order.id },
                                        data: __assign({ status: status, purchaseData: this.toJsonValue(purchaseData) }, (verified.refunded ? { refundedAt: new Date() } : {})),
                                    })
                                ], (verified.refunded
                                    ? [
                                        this.prisma.paymentRecord.updateMany({
                                            where: {
                                                OR: [{ no: order.orderNo }, { providerOrderId: verified.providerOrderId }],
                                            },
                                            data: { status: 'refunded' },
                                        }),
                                    ]
                                    : []), true), [
                                    this.prisma.merchantMembership.updateMany({
                                        where: { merchantId: order.merchantId, planId: order.planId },
                                        data: { status: 'expired', autoRenew: false },
                                    }),
                                ], false))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        HarmonyIapService_1.prototype.refundAuthoritativeOrder = function (order, providerOrderId, purchaseData) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.$transaction([
                                this.prisma.harmonyIapOrder.update({
                                    where: { id: order.id },
                                    data: {
                                        status: 'refunded',
                                        refundedAt: new Date(),
                                        purchaseData: this.toJsonValue(purchaseData),
                                    },
                                }),
                                this.prisma.paymentRecord.updateMany({
                                    where: { OR: [{ no: order.orderNo }, { providerOrderId: providerOrderId }] },
                                    data: { status: 'refunded' },
                                }),
                            ])];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        HarmonyIapService_1.prototype.claimNotification = function (requestId, notificationType, notificationSubtype, environment, purchaseToken, providerOrderId, payload) {
            return __awaiter(this, void 0, void 0, function () {
                var error_3, existing, staleBefore, reclaimed;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 5]);
                            return [4 /*yield*/, this.prisma.harmonyIapNotification.create({
                                    data: {
                                        requestId: requestId,
                                        notificationType: notificationType,
                                        notificationSubtype: notificationSubtype || null,
                                        environment: environment,
                                        purchaseToken: purchaseToken,
                                        providerOrderId: providerOrderId,
                                        status: 'processing',
                                        payload: payload,
                                    },
                                })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, true];
                        case 2:
                            error_3 = _a.sent();
                            if (!(error_3 instanceof client_1.Prisma.PrismaClientKnownRequestError) || error_3.code !== 'P2002') {
                                throw error_3;
                            }
                            return [4 /*yield*/, this.prisma.harmonyIapNotification.findUnique({
                                    where: { requestId: requestId },
                                })];
                        case 3:
                            existing = _a.sent();
                            if ((existing === null || existing === void 0 ? void 0 : existing.status) === 'processed')
                                return [2 /*return*/, false];
                            staleBefore = new Date(Date.now() - 10 * 60000);
                            return [4 /*yield*/, this.prisma.harmonyIapNotification.updateMany({
                                    where: { requestId: requestId, status: 'processing', updatedAt: { lt: staleBefore } },
                                    data: {
                                        notificationType: notificationType,
                                        notificationSubtype: notificationSubtype || null,
                                        environment: environment,
                                        purchaseToken: purchaseToken,
                                        providerOrderId: providerOrderId,
                                        payload: payload,
                                        updatedAt: new Date(),
                                    },
                                })];
                        case 4:
                            reclaimed = _a.sent();
                            if (reclaimed.count > 0)
                                return [2 /*return*/, true];
                            throw new common_1.ServiceUnavailableException('同一华为 IAP 通知正在处理中');
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        HarmonyIapService_1.prototype.completeNotification = function (requestId, orderId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.harmonyIapNotification.update({
                                where: { requestId: requestId },
                                data: { status: 'processed', orderId: orderId, processedAt: new Date() },
                            })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        HarmonyIapService_1.prototype.releaseNotification = function (requestId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, this.prisma.harmonyIapNotification.deleteMany({
                                    where: { requestId: requestId, status: 'processing' },
                                })];
                        case 1:
                            _b.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            _a = _b.sent();
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        HarmonyIapService_1.prototype.asObject = function (value) {
            return value !== null && typeof value === 'object' && !Array.isArray(value)
                ? value
                : null;
        };
        HarmonyIapService_1.prototype.findString = function (source, key) {
            if (!source || typeof source !== 'object')
                return '';
            if (Array.isArray(source)) {
                for (var _i = 0, source_1 = source; _i < source_1.length; _i++) {
                    var item = source_1[_i];
                    var value = this.findString(item, key);
                    if (value)
                        return value;
                }
                return '';
            }
            var record = source;
            if (typeof record[key] === 'string')
                return String(record[key]);
            for (var _a = 0, _b = Object.values(record); _a < _b.length; _a++) {
                var value = _b[_a];
                var found = this.findString(value, key);
                if (found)
                    return found;
            }
            return '';
        };
        HarmonyIapService_1.prototype.findNumber = function (source, key) {
            if (!source || typeof source !== 'object')
                return 0;
            if (Array.isArray(source)) {
                for (var _i = 0, source_2 = source; _i < source_2.length; _i++) {
                    var item = source_2[_i];
                    var value = this.findNumber(item, key);
                    if (value > 0)
                        return value;
                }
                return 0;
            }
            var record = source;
            var direct = Number(record[key] || 0);
            if (Number.isFinite(direct) && direct > 0)
                return direct;
            for (var _a = 0, _b = Object.values(record); _a < _b.length; _a++) {
                var value = _b[_a];
                var found = this.findNumber(value, key);
                if (found > 0)
                    return found;
            }
            return 0;
        };
        HarmonyIapService_1.prototype.toJsonValue = function (raw) {
            try {
                return JSON.parse(raw);
            }
            catch (_a) {
                return { compactJws: raw };
            }
        };
        return HarmonyIapService_1;
    }());
    __setFunctionName(_classThis, "HarmonyIapService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        HarmonyIapService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return HarmonyIapService = _classThis;
}();
exports.HarmonyIapService = HarmonyIapService;
