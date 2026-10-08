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
// nanoid@5 纯 ESM，ts-jest(CJS) 无法直接 require —— 与其它 ledger 测试一致的轻量替身。
globals_1.jest.mock('nanoid', function () { return ({
    customAlphabet: function (alphabet, size) { return function () {
        var out = '';
        for (var i = 0; i < size; i++)
            out += alphabet[Math.floor(Math.random() * alphabet.length)];
        return out;
    }; },
}); });
var ledger_pay_service_1 = require("../src/modules/ledger/ledger-pay.service");
var DAY_MS = 86400000;
function approxMs(actual, expected, toleranceMs) {
    if (toleranceMs === void 0) { toleranceMs = 5000; }
    (0, globals_1.expect)(Math.abs(actual - expected)).toBeLessThanOrEqual(toleranceMs);
}
function buildPrisma() {
    var _this = this;
    var prisma = {
        ledgerConfig: { findUnique: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, null];
            }); }); }) },
        ledgerUser: { findUnique: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, null];
            }); }); }) },
        ledgerPaymentOrder: {
            create: globals_1.jest.fn(function (args) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, (__assign({ id: 'o1' }, args.data))];
            }); }); }),
            findUnique: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, null];
            }); }); }),
            update: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, ({})];
            }); }); }),
            updateMany: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, ({ count: 1 })];
            }); }); }),
        },
        ledgerMembership: {
            findUnique: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, null];
            }); }); }),
            create: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, ({ id: 'm1', expiresAt: null })];
            }); }); }),
            update: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, ({})];
            }); }); }),
        },
        ledgerMembershipLog: { create: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, ({})];
            }); }); }) },
        ledgerNotification: { create: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, ({})];
            }); }); }) },
    };
    // $transaction：把同一份 mock 当 tx 传入回调
    prisma.$transaction = globals_1.jest.fn(function (cb) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, cb(prisma)];
    }); }); });
    return prisma;
}
function buildWxpay(ready) {
    var _this = this;
    if (ready === void 0) { ready = true; }
    return {
        isReady: globals_1.jest.fn(function () { return ready; }),
        createMiniPay: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, ({
                        appId: 'wxLEDGER',
                        timeStamp: '1',
                        nonceStr: 'n',
                        package: 'prepay_id=x',
                        signType: 'RSA',
                        paySign: 'sig',
                    })];
            });
        }); }),
    };
}
(0, globals_1.describe)('LedgerPayService.createMembershipOrder', function () {
    var prisma;
    var wxpay;
    var auth;
    var service;
    var ENV0 = __assign({}, process.env);
    (0, globals_1.beforeEach)(function () {
        process.env.LEDGER_WX_APPID = 'wxLEDGER';
        process.env.LEDGER_PAY_NOTIFY_URL = 'https://ewsn.top/api/v1/l/pay/notify';
        prisma = buildPrisma();
        wxpay = buildWxpay(true);
        auth = { codeToOpenid: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, 'openid-from-code'];
            }); }); }) };
        service = new ledger_pay_service_1.LedgerPayService(prisma, wxpay, auth);
    });
    (0, globals_1.afterEach)(function () {
        process.env = __assign({}, ENV0);
    });
    (0, globals_1.it)('用例1：微信支付未就绪 → 抛错，绝不下单', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    wxpay.isReady.mockReturnValue(false);
                    return [4 /*yield*/, (0, globals_1.expect)(service.createMembershipOrder('u1', 'month')).rejects.toBeTruthy()];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(prisma.ledgerPaymentOrder.create).not.toHaveBeenCalled();
                    (0, globals_1.expect)(wxpay.createMiniPay).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例2：金额服务端权威锁定 —— 月卡"¥29"→2900 分，days=30 写库', function () { return __awaiter(void 0, void 0, void 0, function () {
        var r, orderArg, payArg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma.ledgerUser.findUnique.mockResolvedValueOnce({ id: 'u1', wxOpenid: 'op-bound' });
                    return [4 /*yield*/, service.createMembershipOrder('u1', 'month')];
                case 1:
                    r = _a.sent();
                    orderArg = prisma.ledgerPaymentOrder.create.mock.calls[0][0];
                    (0, globals_1.expect)(orderArg.data.amountFen).toBe(2900);
                    (0, globals_1.expect)(orderArg.data.days).toBe(30);
                    (0, globals_1.expect)(orderArg.data.planKey).toBe('month');
                    payArg = wxpay.createMiniPay.mock.calls[0][0];
                    (0, globals_1.expect)(payArg.totalFen).toBe(2900);
                    (0, globals_1.expect)(payArg.appid).toBe('wxLEDGER');
                    (0, globals_1.expect)(payArg.notifyUrl).toBe('https://ewsn.top/api/v1/l/pay/notify');
                    (0, globals_1.expect)(payArg.openid).toBe('op-bound'); // 已绑定优先用 wxOpenid
                    (0, globals_1.expect)(payArg.attach).toMatch(/^lmember:/);
                    (0, globals_1.expect)(r.signType).toBe('RSA');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例3：未绑定微信且无 code → 1001；带 code → 用 codeToOpenid 兑换', function () { return __awaiter(void 0, void 0, void 0, function () {
        var payArg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma.ledgerUser.findUnique.mockResolvedValue({ id: 'u1', wxOpenid: null });
                    return [4 /*yield*/, service.createMembershipOrder('u1', 'month', undefined).then(function () {
                            throw new Error('should throw');
                        }, function (e) { return (0, globals_1.expect)(e.getResponse().code).toBe(1001); })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, service.createMembershipOrder('u1', 'month', 'js-code')];
                case 2:
                    _a.sent();
                    (0, globals_1.expect)(auth.codeToOpenid).toHaveBeenCalledWith('js-code');
                    payArg = wxpay.createMiniPay.mock.calls[0][0];
                    (0, globals_1.expect)(payArg.openid).toBe('openid-from-code');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例4：套餐不存在 → 抛错，不下单', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma.ledgerUser.findUnique.mockResolvedValueOnce({ id: 'u1', wxOpenid: 'op' });
                    return [4 /*yield*/, (0, globals_1.expect)(service.createMembershipOrder('u1', 'no-such-plan')).rejects.toBeTruthy()];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(prisma.ledgerPaymentOrder.create).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('LedgerPayService.handleNotify', function () {
    var prisma;
    var service;
    (0, globals_1.beforeEach)(function () {
        prisma = buildPrisma();
        service = new ledger_pay_service_1.LedgerPayService(prisma, buildWxpay(), { codeToOpenid: globals_1.jest.fn() });
    });
    var pendingOrder = function (over) {
        if (over === void 0) { over = {}; }
        return (__assign({ id: 'o1', outTradeNo: 'LMEM-X', userId: 'u1', planKey: 'month', days: 30, amountFen: 2900, status: 'pending', grantedAt: null }, over));
    };
    (0, globals_1.it)('用例5：订单不存在 → 返回 false（让微信重试）', function () { return __awaiter(void 0, void 0, void 0, function () {
        var ok;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma.ledgerPaymentOrder.findUnique.mockResolvedValueOnce(null);
                    return [4 /*yield*/, service.handleNotify('LMEM-X', 'tx', 2900)];
                case 1:
                    ok = _a.sent();
                    (0, globals_1.expect)(ok).toBe(false);
                    (0, globals_1.expect)(prisma.ledgerMembership.update).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例6：已 paid → 幂等返回 true，不重复发放', function () { return __awaiter(void 0, void 0, void 0, function () {
        var ok;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma.ledgerPaymentOrder.findUnique.mockResolvedValueOnce(pendingOrder({ status: 'paid' }));
                    return [4 /*yield*/, service.handleNotify('LMEM-X', 'tx', 2900)];
                case 1:
                    ok = _a.sent();
                    (0, globals_1.expect)(ok).toBe(true);
                    (0, globals_1.expect)(prisma.$transaction).not.toHaveBeenCalled();
                    (0, globals_1.expect)(prisma.ledgerMembership.update).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例7：金额不一致 → 标记 failed、不发放、ACK', function () { return __awaiter(void 0, void 0, void 0, function () {
        var ok, updArg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma.ledgerPaymentOrder.findUnique.mockResolvedValueOnce(pendingOrder());
                    return [4 /*yield*/, service.handleNotify('LMEM-X', 'tx', 100)]; // 付了 1 元想换 29 元的卡
                case 1:
                    ok = _a.sent() // 付了 1 元想换 29 元的卡
                    ;
                    (0, globals_1.expect)(ok).toBe(true);
                    updArg = prisma.ledgerPaymentOrder.update.mock.calls[0][0];
                    (0, globals_1.expect)(updArg.data.status).toBe('failed');
                    (0, globals_1.expect)(prisma.ledgerMembership.update).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    globals_1.it.each([0, -1, NaN, Infinity])('无有效实付金额 %s → 拒绝且不发放', function (paidFen) { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.ledgerPaymentOrder.findUnique.mockResolvedValueOnce(pendingOrder());
                    _a = globals_1.expect;
                    return [4 /*yield*/, service.handleNotify('LMEM-X', 'tx', paidFen)];
                case 1:
                    _a.apply(void 0, [_b.sent()]).toBe(false);
                    (0, globals_1.expect)(prisma.$transaction).not.toHaveBeenCalled();
                    (0, globals_1.expect)(prisma.ledgerMembership.update).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('非 pending 的失败订单不能通过重复通知发放', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.ledgerPaymentOrder.findUnique.mockResolvedValueOnce(pendingOrder({ status: 'failed' }));
                    _a = globals_1.expect;
                    return [4 /*yield*/, service.handleNotify('LMEM-X', 'tx', 2900)];
                case 1:
                    _a.apply(void 0, [_b.sent()]).toBe(false);
                    (0, globals_1.expect)(prisma.$transaction).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例8：成功 → 开通会员（≈now+30d）+ 写日志 + 标记 grantedAt', function () { return __awaiter(void 0, void 0, void 0, function () {
        var now, ok, claim, memUpd, logArg, grantUpd;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma.ledgerPaymentOrder.findUnique.mockResolvedValueOnce(pendingOrder());
                    prisma.ledgerMembership.findUnique.mockResolvedValueOnce(null); // 无会员行 → 自动建
                    prisma.ledgerMembership.create.mockResolvedValueOnce({ id: 'm-new', expiresAt: null });
                    now = Date.now();
                    return [4 /*yield*/, service.handleNotify('LMEM-X', 'tx-success', 2900)];
                case 1:
                    ok = _a.sent();
                    (0, globals_1.expect)(ok).toBe(true);
                    claim = prisma.ledgerPaymentOrder.updateMany.mock.calls[0][0];
                    (0, globals_1.expect)(claim.where.status).toBe('pending');
                    (0, globals_1.expect)(claim.data.status).toBe('paid');
                    memUpd = prisma.ledgerMembership.update.mock.calls[0][0];
                    approxMs(new Date(memUpd.data.expiresAt).getTime(), now + 30 * DAY_MS);
                    (0, globals_1.expect)(memUpd.data.lastPlanKey).toBe('month');
                    logArg = prisma.ledgerMembershipLog.create.mock.calls[0][0];
                    (0, globals_1.expect)(logArg.data.deltaDays).toBe(30);
                    (0, globals_1.expect)(logArg.data.operatorId).toBeNull();
                    grantUpd = prisma.ledgerPaymentOrder.update.mock.calls.find(function (c) { var _a, _b; return (_b = (_a = c[0]) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.grantedAt; });
                    (0, globals_1.expect)(grantUpd).toBeTruthy();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例9：并发重复回调 —— updateMany 领取失败(count=0) → 不发放', function () { return __awaiter(void 0, void 0, void 0, function () {
        var ok;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma.ledgerPaymentOrder.findUnique.mockResolvedValueOnce(pendingOrder());
                    prisma.ledgerPaymentOrder.updateMany.mockResolvedValueOnce({ count: 0 });
                    return [4 /*yield*/, service.handleNotify('LMEM-X', 'tx', 2900)];
                case 1:
                    ok = _a.sent();
                    (0, globals_1.expect)(ok).toBe(true);
                    (0, globals_1.expect)(prisma.ledgerMembership.update).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
});
