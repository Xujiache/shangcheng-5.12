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
Object.defineProperty(exports, "__esModule", { value: true });
var globals_1 = require("@jest/globals");
var client_1 = require("@prisma/client");
globals_1.jest.mock('nanoid', function () { return ({
    nanoid: function () { return 'IAPFIXED01'; },
    customAlphabet: function () { return function () { return 'IAPFIXED01'; }; },
}); });
var biz_exception_1 = require("../src/common/exceptions/biz.exception");
var harmony_iap_service_1 = require("../src/modules/harmony-merchant/harmony-iap.service");
var activePlan = {
    id: 'plan-1',
    code: 'member-monthly',
    name: '月度会员',
    type: 'basic',
    price: 99,
    period: 'monthly',
    periodCount: 1,
    status: 'active',
    huaweiProductId: 'member.monthly',
    huaweiProductType: 'subscription',
    constraints: {},
};
var preparedOrder = {
    id: 'iap-1',
    orderNo: 'HMI-1',
    merchantId: 'merchant-1',
    userId: 'user-1',
    planId: 'plan-1',
    productId: 'member.monthly',
    productType: 'subscription',
    amount: 99,
    status: 'prepared',
    purchaseToken: null,
    providerOrderId: null,
};
var verifiedPurchase = {
    productId: 'member.monthly',
    purchaseToken: 'purchase-token-1',
    providerOrderId: 'provider-order-1',
    applicationUserName: 'HMI-1',
    developerPayload: JSON.stringify({ orderNo: 'HMI-1' }),
    expirationTime: Date.now() + 30 * 86400000,
};
var notificationInbox = function () { return ({
    create: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, ({})];
    }); }); }),
    update: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, ({})];
    }); }); }),
    deleteMany: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, ({ count: 0 })];
    }); }); }),
    findUnique: globals_1.jest.fn(),
    updateMany: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, ({ count: 0 })];
    }); }); }),
}); };
(0, globals_1.describe)('HarmonyIapService', function () {
    (0, globals_1.it)('creates only a server-scoped prepared order for a configured active merchant and plan', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, service, payload, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    prisma = {
                        memberPlan: { findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, activePlan];
                            }); }); }) },
                        merchant: { findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ id: 'merchant-1', status: 'active' })];
                            }); }); }) },
                        harmonyIapOrder: { create: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ id: 'iap-1' })];
                            }); }); }) },
                    };
                    service = new harmony_iap_service_1.HarmonyIapService(prisma, {}, {});
                    return [4 /*yield*/, (0, globals_1.expect)(service.prepare('merchant-1', 'user-1', 'plan-1')).resolves.toMatchObject({
                            productId: 'member.monthly',
                            productType: 'subscription',
                        })];
                case 1:
                    _c.sent();
                    (0, globals_1.expect)(prisma.harmonyIapOrder.create).toHaveBeenCalledWith({
                        data: globals_1.expect.objectContaining({
                            merchantId: 'merchant-1',
                            userId: 'user-1',
                            planId: 'plan-1',
                            productId: 'member.monthly',
                        }),
                    });
                    _b = (_a = JSON).parse;
                    return [4 /*yield*/, service.prepare('merchant-1', 'user-1', 'plan-1')];
                case 2:
                    payload = _b.apply(_a, [(_c.sent()).developerPayload]);
                    (0, globals_1.expect)(payload.orderNo).toMatch(/^HMI/);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('refuses to create an order when the AppGallery product mapping is absent', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = {
                        memberPlan: {
                            findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, (__assign(__assign({}, activePlan), { huaweiProductId: null }))];
                            }); }); }),
                        },
                        merchant: { findUnique: globals_1.jest.fn() },
                        harmonyIapOrder: { create: globals_1.jest.fn() },
                    };
                    service = new harmony_iap_service_1.HarmonyIapService(prisma, {}, {});
                    return [4 /*yield*/, (0, globals_1.expect)(service.prepare('merchant-1', 'user-1', 'plan-1')).rejects.toMatchObject({
                            response: { code: biz_exception_1.BizCode.BUSINESS_ERROR },
                        })];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(prisma.merchant.findUnique).not.toHaveBeenCalled();
                    (0, globals_1.expect)(prisma.harmonyIapOrder.create).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('verifies, records and activates a subscription once in a single transaction', function () { return __awaiter(void 0, void 0, void 0, function () {
        var tx, prisma, jws, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    tx = {
                        harmonyIapOrder: {
                            findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, preparedOrder];
                            }); }); }),
                            update: globals_1.jest.fn(function (_input) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({})];
                            }); }); }),
                        },
                        memberPlan: { findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, activePlan];
                            }); }); }) },
                        paymentRecord: {
                            findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, null];
                            }); }); }),
                            create: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ id: 'payment-1' })];
                            }); }); }),
                        },
                        merchantMembership: {
                            findFirst: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, null];
                            }); }); }),
                            updateMany: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ count: 0 })];
                            }); }); }),
                            create: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ id: 'membership-1', status: 'active' })];
                            }); }); }),
                        },
                    };
                    prisma = {
                        harmonyIapOrder: { findFirst: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, preparedOrder];
                            }); }); }) },
                        $transaction: globals_1.jest.fn(function (callback) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, callback(tx)];
                        }); }); }),
                    };
                    jws = { verifyPurchaseData: globals_1.jest.fn(function () { return verifiedPurchase; }) };
                    service = new harmony_iap_service_1.HarmonyIapService(prisma, jws, {});
                    return [4 /*yield*/, (0, globals_1.expect)(service.verify('merchant-1', 'user-1', 'HMI-1', 'signed-purchase')).resolves.toMatchObject({
                            ok: true,
                            alreadyActivated: false,
                            purchaseToken: 'purchase-token-1',
                            purchaseOrderId: 'provider-order-1',
                        })];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(tx.paymentRecord.create).toHaveBeenCalledTimes(1);
                    (0, globals_1.expect)(tx.merchantMembership.create).toHaveBeenCalledTimes(1);
                    (0, globals_1.expect)(tx.harmonyIapOrder.update).toHaveBeenLastCalledWith({
                        where: { id: 'iap-1' },
                        data: globals_1.expect.objectContaining({ status: 'activated' }),
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('returns an already activated order without verifying or granting a second entitlement', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, jws, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = {
                        harmonyIapOrder: {
                            findFirst: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, (__assign(__assign({}, preparedOrder), { status: 'activated', purchaseToken: 'token-1', providerOrderId: 'provider-1' }))];
                                });
                            }); }),
                        },
                        merchantMembership: { findFirst: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ id: 'membership-1' })];
                            }); }); }) },
                        $transaction: globals_1.jest.fn(),
                    };
                    jws = { verifyPurchaseData: globals_1.jest.fn() };
                    service = new harmony_iap_service_1.HarmonyIapService(prisma, jws, {});
                    return [4 /*yield*/, (0, globals_1.expect)(service.verify('merchant-1', 'user-1', 'HMI-1', 'replayed')).resolves.toMatchObject({
                            ok: true,
                            alreadyActivated: true,
                            purchaseToken: 'token-1',
                        })];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(jws.verifyPurchaseData).not.toHaveBeenCalled();
                    (0, globals_1.expect)(prisma.$transaction).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('rejects a signed purchase for a different product before opening a transaction', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, jws, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = {
                        harmonyIapOrder: { findFirst: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, preparedOrder];
                            }); }); }) },
                        $transaction: globals_1.jest.fn(),
                    };
                    jws = {
                        verifyPurchaseData: globals_1.jest.fn(function () { return (__assign(__assign({}, verifiedPurchase), { productId: 'member.yearly' })); }),
                    };
                    service = new harmony_iap_service_1.HarmonyIapService(prisma, jws, {});
                    return [4 /*yield*/, (0, globals_1.expect)(service.verify('merchant-1', 'user-1', 'HMI-1', 'signed')).rejects.toBeInstanceOf(biz_exception_1.BizException)];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(prisma.$transaction).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('does not revoke paid time when the user only cancels automatic renewal', function () { return __awaiter(void 0, void 0, void 0, function () {
        var expiration, updateOrder, updateMembership, updatePayment, prisma, jws, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    expiration = Date.now() + 15 * 86400000;
                    updateOrder = globals_1.jest.fn(function (_input) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({})];
                    }); }); });
                    updateMembership = globals_1.jest.fn(function (_input) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({ count: 1 })];
                    }); }); });
                    updatePayment = globals_1.jest.fn();
                    prisma = {
                        harmonyIapOrder: {
                            findFirst: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, (__assign(__assign({}, preparedOrder), { status: 'activated' }))];
                            }); }); }),
                            update: updateOrder,
                        },
                        merchantMembership: { updateMany: updateMembership },
                        paymentRecord: { updateMany: updatePayment },
                        $transaction: globals_1.jest.fn(function (operations) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, Promise.all(operations)];
                        }); }); }),
                    };
                    jws = {
                        verifyCompactJws: globals_1.jest.fn(function () { return ({
                            notificationType: 'CANCEL_SUBSCRIPTION',
                            purchaseToken: 'purchase-token-1',
                            purchaseOrderId: 'provider-order-1',
                            expirationTime: expiration,
                        }); }),
                    };
                    service = new harmony_iap_service_1.HarmonyIapService(prisma, jws, {});
                    return [4 /*yield*/, (0, globals_1.expect)(service.handleNotification({ signedPayload: 'signed' })).resolves.toEqual({ result: 0 })];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(updateMembership).toHaveBeenCalledWith({
                        where: { merchantId: 'merchant-1', planId: 'plan-1' },
                        data: { autoRenew: false },
                    });
                    (0, globals_1.expect)(updatePayment).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('revokes entitlement and marks the ledger refunded for a verified refund notification', function () { return __awaiter(void 0, void 0, void 0, function () {
        var updateOrder, updateMembership, updatePayment, prisma, jws, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    updateOrder = globals_1.jest.fn(function (_input) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({})];
                    }); }); });
                    updateMembership = globals_1.jest.fn(function (_input) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({ count: 1 })];
                    }); }); });
                    updatePayment = globals_1.jest.fn(function (_input) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({ count: 1 })];
                    }); }); });
                    prisma = {
                        harmonyIapOrder: {
                            findFirst: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, (__assign(__assign({}, preparedOrder), { status: 'activated' }))];
                            }); }); }),
                            update: updateOrder,
                        },
                        merchantMembership: { updateMany: updateMembership },
                        paymentRecord: { updateMany: updatePayment },
                        $transaction: globals_1.jest.fn(function (operations) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, Promise.all(operations)];
                        }); }); }),
                    };
                    jws = {
                        verifyCompactJws: globals_1.jest.fn(function () { return ({
                            notificationType: 'REFUND',
                            purchaseToken: 'purchase-token-1',
                        }); }),
                    };
                    service = new harmony_iap_service_1.HarmonyIapService(prisma, jws, {});
                    return [4 /*yield*/, service.handleNotification({ signedPayload: 'signed' })];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(updatePayment).toHaveBeenCalledWith({
                        where: { no: 'HMI-1' },
                        data: { status: 'refunded' },
                    });
                    (0, globals_1.expect)(updateMembership).toHaveBeenCalledWith({
                        where: { merchantId: 'merchant-1', planId: 'plan-1' },
                        data: { status: 'expired', autoRenew: false },
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('extends and reactivates the entitlement for a verified renewal notification', function () { return __awaiter(void 0, void 0, void 0, function () {
        var expiration, updateOrder, updateMembership, prisma, jws, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    expiration = Date.now() + 31 * 86400000;
                    updateOrder = globals_1.jest.fn(function (_input) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({})];
                    }); }); });
                    updateMembership = globals_1.jest.fn(function (_input) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({ count: 1 })];
                    }); }); });
                    prisma = {
                        harmonyIapOrder: {
                            findFirst: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, (__assign(__assign({}, preparedOrder), { status: 'cancelled' }))];
                            }); }); }),
                            update: updateOrder,
                        },
                        merchantMembership: { updateMany: updateMembership },
                        $transaction: globals_1.jest.fn(function (operations) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, Promise.all(operations)];
                        }); }); }),
                    };
                    jws = {
                        verifyCompactJws: globals_1.jest.fn(function () { return ({
                            data: {
                                notificationType: 'SUBSCRIPTION_RENEWED',
                                purchaseToken: 'purchase-token-1',
                                expirationTime: expiration,
                            },
                        }); }),
                    };
                    service = new harmony_iap_service_1.HarmonyIapService(prisma, jws, {});
                    return [4 /*yield*/, (0, globals_1.expect)(service.handleNotification({ signedPayload: 'signed' })).resolves.toEqual({ result: 0 })];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(updateOrder).toHaveBeenCalledWith({
                        where: { id: 'iap-1' },
                        data: { status: 'activated', purchaseData: globals_1.expect.any(Object) },
                    });
                    (0, globals_1.expect)(updateMembership).toHaveBeenCalledWith({
                        where: { merchantId: 'merchant-1', planId: 'plan-1' },
                        data: { status: 'active', autoRenew: true, endAt: new Date(expiration) },
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('expires entitlement without rewriting a successful payment as failed or refunded', function () { return __awaiter(void 0, void 0, void 0, function () {
        var updateOrder, updateMembership, updatePayment, prisma, jws, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    updateOrder = globals_1.jest.fn(function (_input) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({})];
                    }); }); });
                    updateMembership = globals_1.jest.fn(function (_input) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({ count: 1 })];
                    }); }); });
                    updatePayment = globals_1.jest.fn();
                    prisma = {
                        harmonyIapOrder: {
                            findFirst: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, (__assign(__assign({}, preparedOrder), { status: 'activated' }))];
                            }); }); }),
                            update: updateOrder,
                        },
                        merchantMembership: { updateMany: updateMembership },
                        paymentRecord: { updateMany: updatePayment },
                        $transaction: globals_1.jest.fn(function (operations) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, Promise.all(operations)];
                        }); }); }),
                    };
                    jws = {
                        verifyCompactJws: globals_1.jest.fn(function () { return ({
                            notification: {
                                status: 'SUBSCRIPTION_EXPIRED',
                                purchaseOrderId: 'provider-order-1',
                            },
                        }); }),
                    };
                    service = new harmony_iap_service_1.HarmonyIapService(prisma, jws, {});
                    return [4 /*yield*/, (0, globals_1.expect)(service.handleNotification({ signedPayload: 'signed' })).resolves.toEqual({ result: 0 })];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(updateOrder).toHaveBeenCalledWith({
                        where: { id: 'iap-1' },
                        data: { status: 'expired', purchaseData: globals_1.expect.any(Object) },
                    });
                    (0, globals_1.expect)(updateMembership).toHaveBeenCalledWith({
                        where: { merchantId: 'merchant-1', planId: 'plan-1' },
                        data: { status: 'expired', autoRenew: false },
                    });
                    (0, globals_1.expect)(updatePayment).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('handles a v3 callback only after querying and verifying Huawei authoritative status', function () { return __awaiter(void 0, void 0, void 0, function () {
        var updateOrder, updateMembership, updatePayment, prisma, jws, iapServer, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    process.env.HUAWEI_IAP_APPLICATION_ID = 'app-1';
                    updateOrder = globals_1.jest.fn(function (_input) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({})];
                    }); }); });
                    updateMembership = globals_1.jest.fn(function (_input) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({ count: 1 })];
                    }); }); });
                    updatePayment = globals_1.jest.fn(function (_input) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({ count: 1 })];
                    }); }); });
                    prisma = {
                        harmonyIapNotification: notificationInbox(),
                        harmonyIapOrder: {
                            findFirst: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, (__assign(__assign({}, preparedOrder), { status: 'activated', purchaseToken: 'purchase-token-1', providerOrderId: 'provider-order-1' }))];
                                });
                            }); }),
                            update: updateOrder,
                        },
                        merchantMembership: { updateMany: updateMembership },
                        paymentRecord: { updateMany: updatePayment },
                        $transaction: globals_1.jest.fn(function (operations) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, Promise.all(operations)];
                        }); }); }),
                    };
                    jws = {
                        verifySubscriptionStatus: globals_1.jest.fn(function (_input) { return (__assign(__assign({}, verifiedPurchase), { active: false, autoRenew: false, refunded: true, status: '2' })); }),
                    };
                    iapServer = {
                        isConfigured: globals_1.jest.fn(function () { return true; }),
                        querySubscriptionStatus: globals_1.jest.fn(function (_token, _orderId) { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/, ({
                                        jwsSubGroupStatus: 'signed-status',
                                    })];
                            });
                        }); }),
                    };
                    service = new harmony_iap_service_1.HarmonyIapService(prisma, jws, iapServer);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 3, 4]);
                    return [4 /*yield*/, (0, globals_1.expect)(service.handleNotification({
                            notificationType: 'DID_REVOKE_ENTITLEMENT',
                            notificationRequestId: 'notification-request-1',
                            notificationVersion: 'v3',
                            signedTime: Date.now(),
                            notificationMetaData: {
                                environment: 'NORMAL',
                                applicationId: 'app-1',
                                packageName: 'top.ewsn.jingwei.merchant',
                                type: 2,
                                purchaseToken: 'purchase-token-1',
                                purchaseOrderId: 'provider-order-1',
                            },
                        })).resolves.toEqual({ result: 0 })];
                case 2:
                    _a.sent();
                    (0, globals_1.expect)(iapServer.querySubscriptionStatus).toHaveBeenCalledWith('purchase-token-1', 'provider-order-1');
                    (0, globals_1.expect)(jws.verifySubscriptionStatus).toHaveBeenCalledWith('signed-status');
                    (0, globals_1.expect)(updatePayment).toHaveBeenCalledWith({
                        where: { OR: [{ no: 'HMI-1' }, { providerOrderId: 'provider-order-1' }] },
                        data: { status: 'refunded' },
                    });
                    (0, globals_1.expect)(updateMembership).toHaveBeenCalledWith({
                        where: { merchantId: 'merchant-1', planId: 'plan-1' },
                        data: { status: 'expired', autoRenew: false },
                    });
                    return [3 /*break*/, 4];
                case 3:
                    delete process.env.HUAWEI_IAP_APPLICATION_ID;
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('does not trust a forged v3 refund event when signed Huawei status remains active', function () { return __awaiter(void 0, void 0, void 0, function () {
        var membershipUpdate, paymentRefund, tx, prisma, jws, iapServer, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    process.env.HUAWEI_IAP_APPLICATION_ID = 'app-1';
                    membershipUpdate = globals_1.jest.fn(function (_input) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({})];
                    }); }); });
                    paymentRefund = globals_1.jest.fn();
                    tx = {
                        memberPlan: { findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, activePlan];
                            }); }); }) },
                        merchantMembership: {
                            findFirst: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ id: 'membership-1', endAt: new Date() })];
                            }); }); }),
                            update: membershipUpdate,
                        },
                        harmonyIapOrder: { update: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({})];
                            }); }); }) },
                        paymentRecord: { findUnique: globals_1.jest.fn(), create: globals_1.jest.fn() },
                    };
                    prisma = {
                        harmonyIapNotification: notificationInbox(),
                        harmonyIapOrder: {
                            findFirst: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, (__assign(__assign({}, preparedOrder), { status: 'activated', purchaseToken: 'purchase-token-1', providerOrderId: 'provider-order-1' }))];
                                });
                            }); }),
                        },
                        paymentRecord: { updateMany: paymentRefund },
                        $transaction: globals_1.jest.fn(function (callback) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, callback(tx)];
                        }); }); }),
                    };
                    jws = {
                        verifySubscriptionStatus: globals_1.jest.fn(function () { return (__assign(__assign({}, verifiedPurchase), { active: true, autoRenew: true, refunded: false, status: '1' })); }),
                    };
                    iapServer = {
                        isConfigured: globals_1.jest.fn(function () { return true; }),
                        querySubscriptionStatus: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ jwsSubGroupStatus: 'signed-active' })];
                        }); }); }),
                    };
                    service = new harmony_iap_service_1.HarmonyIapService(prisma, jws, iapServer);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 3, 4]);
                    return [4 /*yield*/, service.handleNotification({
                            notificationType: 'REFUND',
                            notificationRequestId: 'notification-request-2',
                            notificationVersion: 'v3',
                            signedTime: Date.now(),
                            notificationMetaData: {
                                environment: 'NORMAL',
                                applicationId: 'app-1',
                                packageName: 'top.ewsn.jingwei.merchant',
                                type: 2,
                                purchaseToken: 'purchase-token-1',
                                purchaseOrderId: 'provider-order-1',
                            },
                        })];
                case 2:
                    _a.sent();
                    (0, globals_1.expect)(membershipUpdate).toHaveBeenCalledWith({
                        where: { id: 'membership-1' },
                        data: globals_1.expect.objectContaining({ status: 'active', autoRenew: true }),
                    });
                    (0, globals_1.expect)(paymentRefund).not.toHaveBeenCalled();
                    return [3 /*break*/, 4];
                case 3:
                    delete process.env.HUAWEI_IAP_APPLICATION_ID;
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('acknowledges an already processed v3 request without querying or granting again', function () { return __awaiter(void 0, void 0, void 0, function () {
        var duplicate, inbox, prisma, iapServer, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    process.env.HUAWEI_IAP_APPLICATION_ID = 'app-1';
                    duplicate = new client_1.Prisma.PrismaClientKnownRequestError('duplicate request', {
                        code: 'P2002',
                        clientVersion: 'test',
                        meta: { target: ['requestId'] },
                    });
                    inbox = notificationInbox();
                    inbox.create.mockRejectedValueOnce(duplicate);
                    inbox.findUnique.mockResolvedValueOnce({ status: 'processed' });
                    prisma = {
                        harmonyIapNotification: inbox,
                        harmonyIapOrder: { findFirst: globals_1.jest.fn() },
                    };
                    iapServer = {
                        isConfigured: globals_1.jest.fn(function () { return true; }),
                        querySubscriptionStatus: globals_1.jest.fn(),
                    };
                    service = new harmony_iap_service_1.HarmonyIapService(prisma, {}, iapServer);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 3, 4]);
                    return [4 /*yield*/, (0, globals_1.expect)(service.handleNotification({
                            notificationType: 'DID_RENEW',
                            notificationRequestId: 'processed-request',
                            notificationVersion: 'v3',
                            signedTime: Date.now(),
                            notificationMetaData: {
                                environment: 'NORMAL',
                                applicationId: 'app-1',
                                packageName: 'top.ewsn.jingwei.merchant',
                                type: 2,
                                purchaseToken: 'purchase-token-replayed',
                                purchaseOrderId: 'provider-order-replayed',
                            },
                        })).resolves.toEqual({ result: 0 })];
                case 2:
                    _a.sent();
                    (0, globals_1.expect)(iapServer.querySubscriptionStatus).not.toHaveBeenCalled();
                    (0, globals_1.expect)(prisma.harmonyIapOrder.findFirst).not.toHaveBeenCalled();
                    return [3 /*break*/, 4];
                case 3:
                    delete process.env.HUAWEI_IAP_APPLICATION_ID;
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('accepts Huawei TEST reachability notifications without touching orders or entitlements', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, iapServer, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = { harmonyIapOrder: { findFirst: globals_1.jest.fn() } };
                    iapServer = { isConfigured: globals_1.jest.fn(), querySubscriptionStatus: globals_1.jest.fn() };
                    service = new harmony_iap_service_1.HarmonyIapService(prisma, {}, iapServer);
                    return [4 /*yield*/, (0, globals_1.expect)(service.handleNotification({
                            notificationType: 'TEST',
                            notificationRequestId: 'test-notification',
                            notificationVersion: 'v3',
                            signedTime: Date.now(),
                            notificationMetaData: {
                                environment: 'NORMAL',
                                applicationId: 'test-app',
                                packageName: 'testPackageName',
                                type: 0,
                                purchaseToken: 'testPurchaseToken',
                                purchaseOrderId: 'testPurchaseOrderId',
                            },
                        })).resolves.toEqual({ result: 0 })];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(prisma.harmonyIapOrder.findFirst).not.toHaveBeenCalled();
                    (0, globals_1.expect)(iapServer.querySubscriptionStatus).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
});
