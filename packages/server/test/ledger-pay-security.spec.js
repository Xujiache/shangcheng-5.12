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
var crypto_1 = require("crypto");
var globals_1 = require("@jest/globals");
globals_1.jest.mock('nanoid', function () { return ({ customAlphabet: function () { return function () { return 'TEST'; }; } }); });
var ledger_pay_controller_1 = require("../src/modules/ledger/ledger-pay.controller");
var ledger_xpay_service_1 = require("../src/modules/ledger/ledger-xpay.service");
(0, globals_1.describe)('ledger payment callback security', function () {
    var env0 = __assign({}, process.env);
    var fetch0 = global.fetch;
    (0, globals_1.afterEach)(function () {
        process.env = __assign({}, env0);
        global.fetch = fetch0;
    });
    (0, globals_1.it)('微信支付缺原始报文时不验签、不发放', function () { return __awaiter(void 0, void 0, void 0, function () {
        var pay, wxpay, controller, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    pay = { handleNotify: globals_1.jest.fn() };
                    wxpay = { verifyNotify: globals_1.jest.fn() };
                    controller = new ledger_pay_controller_1.LedgerPayController(pay, {}, wxpay);
                    return [4 /*yield*/, controller.notify({}, { out_trade_no: 'forged' }, {
                            rawBody: undefined,
                        })];
                case 1:
                    result = _a.sent();
                    (0, globals_1.expect)(result.code).toBe('FAIL');
                    (0, globals_1.expect)(wxpay.verifyNotify).not.toHaveBeenCalled();
                    (0, globals_1.expect)(pay.handleNotify).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('虚拟支付缺原始报文时不处理发货', function () { return __awaiter(void 0, void 0, void 0, function () {
        var xpay, controller, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    xpay = { verifyPushSignature: globals_1.jest.fn(), handleDeliverNotify: globals_1.jest.fn() };
                    controller = new ledger_pay_controller_1.LedgerPayController({}, xpay, {});
                    return [4 /*yield*/, controller.xpayDeliver({}, { Event: 'xpay_goods_deliver_notify' }, {
                            rawBody: undefined,
                        })];
                case 1:
                    result = _a.sent();
                    (0, globals_1.expect)(result).toMatchObject({ ErrCode: 1 });
                    (0, globals_1.expect)(xpay.verifyPushSignature).not.toHaveBeenCalled();
                    (0, globals_1.expect)(xpay.handleDeliverNotify).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('虚拟支付只在确认付款后返回微信要求的成功 ACK', function () { return __awaiter(void 0, void 0, void 0, function () {
        var xpay, controller, query, body, request, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    xpay = {
                        verifyPushSignature: globals_1.jest.fn(function () { return true; }),
                        handleDeliverNotify: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, false];
                        }); }); }),
                    };
                    controller = new ledger_pay_controller_1.LedgerPayController({}, xpay, {});
                    query = { signature: 's', timestamp: 't', nonce: 'n' };
                    body = { Event: 'xpay_goods_deliver_notify', OutTradeNo: 'LXP123' };
                    request = { rawBody: Buffer.from(JSON.stringify(body)) };
                    _a = globals_1.expect;
                    return [4 /*yield*/, controller.xpayDeliver(query, body, request)];
                case 1:
                    _a.apply(void 0, [_c.sent()]).toMatchObject({ ErrCode: 1 });
                    xpay.handleDeliverNotify.mockResolvedValueOnce(true);
                    _b = globals_1.expect;
                    return [4 /*yield*/, controller.xpayDeliver(query, body, request)];
                case 2:
                    _b.apply(void 0, [_c.sent()]).toEqual({
                        ErrCode: 0,
                        ErrMsg: 'success',
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('虚拟支付推送签名拒绝旧时间戳和伪签名', function () {
        process.env.LEDGER_WX_PUSH_TOKEN = 'test-only-token';
        var xpay = new ledger_xpay_service_1.LedgerXpayService({}, {}, {});
        var nonce = 'nonce';
        var sign = function (timestamp) {
            return (0, crypto_1.createHash)('sha1').update(['test-only-token', timestamp, nonce].sort().join('')).digest('hex');
        };
        var current = String(Math.floor(Date.now() / 1000));
        var old = String(Math.floor(Date.now() / 1000) - 3600);
        (0, globals_1.expect)(xpay.verifyPushSignature(sign(current), current, nonce)).toBe(true);
        (0, globals_1.expect)(xpay.verifyPushSignature(sign(old), old, nonce)).toBe(false);
        (0, globals_1.expect)(xpay.verifyPushSignature('00'.repeat(20), current, nonce)).toBe(false);
    });
    (0, globals_1.it)('虚拟支付必须由微信查单确认订单、金额和状态，不能信回调自报金额', function () { return __awaiter(void 0, void 0, void 0, function () {
        var order, prisma, pay, contentSecurity, xpay, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    process.env.LEDGER_XPAY_APP_KEY = 'test-app-key';
                    process.env.LEDGER_XPAY_ENV = '0';
                    order = { outTradeNo: 'LXP123', userId: 'u1', status: 'pending', amountFen: 2900 };
                    prisma = {
                        ledgerPaymentOrder: { findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, order];
                            }); }); }) },
                        ledgerUser: { findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ wxOpenid: 'openid-u1' })];
                            }); }); }) },
                    };
                    pay = { handleNotify: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, true];
                        }); }); }) };
                    contentSecurity = { ledgerAccessToken: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, 'test-access-token'];
                        }); }); }) };
                    xpay = new ledger_xpay_service_1.LedgerXpayService(prisma, {}, pay, contentSecurity);
                    global.fetch = globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, ({
                                    ok: true,
                                    json: function () { return __awaiter(void 0, void 0, void 0, function () {
                                        return __generator(this, function (_a) {
                                            return [2 /*return*/, ({
                                                    errcode: 0,
                                                    order: { order_id: 'LXP123', status: 1, order_fee: 2900, paid_fee: 2900, env_type: 1 },
                                                })];
                                        });
                                    }); },
                                })];
                        });
                    }); });
                    _a = globals_1.expect;
                    return [4 /*yield*/, xpay.handleDeliverNotify({ OutTradeNo: 'LXP123', GoodsInfo: { ActualPrice: 2900 } })];
                case 1:
                    _a.apply(void 0, [_c.sent()]).toBe(false);
                    (0, globals_1.expect)(pay.handleNotify).not.toHaveBeenCalled();
                    global.fetch = globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, ({
                                    ok: true,
                                    json: function () { return __awaiter(void 0, void 0, void 0, function () {
                                        return __generator(this, function (_a) {
                                            return [2 /*return*/, ({
                                                    errcode: 0,
                                                    order: {
                                                        order_id: 'LXP123',
                                                        status: 2,
                                                        order_fee: 2900,
                                                        paid_fee: 2900,
                                                        env_type: 1,
                                                        wxpay_order_id: 'wx-transaction',
                                                    },
                                                })];
                                        });
                                    }); },
                                })];
                        });
                    }); });
                    _b = globals_1.expect;
                    return [4 /*yield*/, xpay.handleDeliverNotify({ OutTradeNo: 'LXP123', GoodsInfo: { ActualPrice: 1 } })];
                case 2:
                    _b.apply(void 0, [_c.sent()]).toBe(true);
                    (0, globals_1.expect)(pay.handleNotify).toHaveBeenCalledWith('LXP123', 'wx-transaction', 2900);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('虚拟支付重复通知已入账时幂等 ACK，不再查单和二次发放', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, pay, xpay, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma = {
                        ledgerPaymentOrder: { findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ status: 'paid' })];
                            }); }); }) },
                    };
                    pay = { handleNotify: globals_1.jest.fn() };
                    xpay = new ledger_xpay_service_1.LedgerXpayService(prisma, {}, pay);
                    global.fetch = globals_1.jest.fn();
                    _a = globals_1.expect;
                    return [4 /*yield*/, xpay.handleDeliverNotify({ OutTradeNo: 'LXP123' })];
                case 1:
                    _a.apply(void 0, [_b.sent()]).toBe(true);
                    (0, globals_1.expect)(global.fetch).not.toHaveBeenCalled();
                    (0, globals_1.expect)(pay.handleNotify).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
});
