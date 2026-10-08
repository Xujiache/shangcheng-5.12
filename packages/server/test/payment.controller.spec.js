"use strict";
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
// nanoid@5 是纯 ESM，ts-jest(CJS) 默认不转换 node_modules。导入 PaymentController 会经
// merchant.service → id.util 拉入 nanoid 的 customAlphabet，抛 "Cannot use import statement
// outside a module"。这里用工厂 mock 替换为等价随机生成器（本测试不依赖其产物）。
globals_1.jest.mock('nanoid', function () { return ({
    customAlphabet: function (alphabet, size) { return function () {
        var s = '';
        for (var i = 0; i < size; i++) {
            s += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        return s;
    }; },
}); });
var payment_controller_1 = require("../src/modules/payment/payment.controller");
// ----------------------------------------------------------------------------
// PaymentController.wechatNotify — 微信支付回调入口
//
// 实现位置：packages/server/src/modules/payment/payment.controller.ts
//
// 这里测的是"微信重试契约"：handler 返回顶层 {code:'SUCCESS'|'FAIL'}。
//   - SUCCESS  → 微信停止重试（已正确处理 / 幂等命中 / 非成功事件直接 ACK）
//   - FAIL     → 微信按梯度重试（验签失败 / 解密失败 / 找不到业务记录 / 抛异常）
// 关键保护：验签 → 解密 → 会员/订单分流 → 幂等 → 事务入账 → 推送（绝不阻塞 ACK）。
// ----------------------------------------------------------------------------
/** 构造一个带默认 happy-path mock 的 controller + 句柄，便于各用例覆写 */
function setup() {
    var _this = this;
    var wxpay = {
        verifyNotify: globals_1.jest.fn(function () {
            var _args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                _args[_i] = arguments[_i];
            }
            return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, true];
            }); });
        }),
        decryptResource: globals_1.jest.fn(function () {
            var _args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                _args[_i] = arguments[_i];
            }
            return ({
                out_trade_no: 'ORD-1',
                trade_state: 'SUCCESS',
                transaction_id: 'TX-1',
                attach: '',
            });
        }),
    };
    var merchantService = {
        activateMembership: globals_1.jest.fn(function () {
            var _args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                _args[_i] = arguments[_i];
            }
            return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, undefined];
            }); });
        }),
    };
    var chat = {
        emitOrderUpdate: globals_1.jest.fn(function () {
            var _args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                _args[_i] = arguments[_i];
            }
            return undefined;
        }),
    };
    var txMock = {
        order: { updateMany: globals_1.jest.fn(function () {
                var _args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _args[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, ({ count: 1 })];
                }); });
            }) },
        payment: { create: globals_1.jest.fn(function () {
                var _args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _args[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, ({ id: 'pay-1' })];
                }); });
            }) },
    };
    var prisma = {
        paymentRecord: { findUnique: globals_1.jest.fn(function () {
                var _args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _args[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, null];
                }); });
            }) },
        payment: {
            findFirst: globals_1.jest.fn(function () {
                var _args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _args[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, null];
                }); });
            }),
            create: globals_1.jest.fn(function () {
                var _args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _args[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, ({ id: 'pay-1' })];
                }); });
            }),
        },
        order: { findFirst: globals_1.jest.fn(function () {
                var _args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _args[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, null];
                }); });
            }) },
        $transaction: globals_1.jest.fn(function (cb) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, cb(txMock)];
        }); }); }),
    };
    var controller = new payment_controller_1.PaymentController(wxpay, prisma, merchantService, chat);
    return { controller: controller, wxpay: wxpay, prisma: prisma, merchantService: merchantService, chat: chat, txMock: txMock };
}
/** 标准回调入参：headers + 加密 body + 带 rawBody 的 req */
function makeArgs(body) {
    if (body === void 0) { body = { resource: { ciphertext: 'x', nonce: 'n' } }; }
    var headers = { 'wechatpay-signature': 'sig' };
    var req = { rawBody: Buffer.from(JSON.stringify(body)) };
    return { headers: headers, body: body, req: req };
}
(0, globals_1.describe)('PaymentController.wechatNotify — 微信回调 ACK / 幂等契约', function () {
    (0, globals_1.describe)('用例 1：验签失败', function () {
        (0, globals_1.it)('verifyNotify 返回 false → {code:"FAIL"} 且完全不碰 prisma', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, controller, wxpay, prisma, _b, headers, body, req, res;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = setup(), controller = _a.controller, wxpay = _a.wxpay, prisma = _a.prisma;
                        wxpay.verifyNotify.mockResolvedValueOnce(false);
                        _b = makeArgs(), headers = _b.headers, body = _b.body, req = _b.req;
                        return [4 /*yield*/, controller.wechatNotify(headers, body, req)];
                    case 1:
                        res = _c.sent();
                        (0, globals_1.expect)(res.code).toBe('FAIL');
                        (0, globals_1.expect)(wxpay.decryptResource).not.toHaveBeenCalled();
                        (0, globals_1.expect)(prisma.paymentRecord.findUnique).not.toHaveBeenCalled();
                        (0, globals_1.expect)(prisma.payment.findFirst).not.toHaveBeenCalled();
                        (0, globals_1.expect)(prisma.order.findFirst).not.toHaveBeenCalled();
                        (0, globals_1.expect)(prisma.$transaction).not.toHaveBeenCalled();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, globals_1.describe)('用例 2：非成功交易事件', function () {
        (0, globals_1.it)('trade_state 为 REFUND（非 SUCCESS）→ {code:"SUCCESS"} ACK 且不落库', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, controller, wxpay, prisma, _b, headers, body, req, res;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = setup(), controller = _a.controller, wxpay = _a.wxpay, prisma = _a.prisma;
                        wxpay.decryptResource.mockReturnValueOnce({
                            out_trade_no: 'ORD-1',
                            trade_state: 'REFUND',
                            transaction_id: 'TX-1',
                            attach: '',
                        });
                        _b = makeArgs(), headers = _b.headers, body = _b.body, req = _b.req;
                        return [4 /*yield*/, controller.wechatNotify(headers, body, req)];
                    case 1:
                        res = _c.sent();
                        (0, globals_1.expect)(res.code).toBe('SUCCESS');
                        (0, globals_1.expect)(prisma.paymentRecord.findUnique).not.toHaveBeenCalled();
                        (0, globals_1.expect)(prisma.payment.findFirst).not.toHaveBeenCalled();
                        (0, globals_1.expect)(prisma.order.findFirst).not.toHaveBeenCalled();
                        (0, globals_1.expect)(prisma.$transaction).not.toHaveBeenCalled();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, globals_1.describe)('用例 3：解密失败', function () {
        (0, globals_1.it)('decryptResource 抛错 → {code:"FAIL"} 让微信重试', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, controller, wxpay, prisma, _b, headers, body, req, res;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = setup(), controller = _a.controller, wxpay = _a.wxpay, prisma = _a.prisma;
                        wxpay.decryptResource.mockImplementationOnce(function () {
                            throw new Error('bad ciphertext');
                        });
                        _b = makeArgs(), headers = _b.headers, body = _b.body, req = _b.req;
                        return [4 /*yield*/, controller.wechatNotify(headers, body, req)];
                    case 1:
                        res = _c.sent();
                        (0, globals_1.expect)(res.code).toBe('FAIL');
                        (0, globals_1.expect)(prisma.$transaction).not.toHaveBeenCalled();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, globals_1.describe)('用例 4：会员订阅缴费回调', function () {
        function memDecrypt(attach) {
            if (attach === void 0) { attach = 'membership:rid-1'; }
            return {
                out_trade_no: 'MEM123',
                trade_state: 'SUCCESS',
                transaction_id: 'TX-MEM',
                attach: attach,
            };
        }
        (0, globals_1.it)('PaymentRecord 为 pending → 调 activateMembership(record.id) 并 SUCCESS', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, controller, wxpay, prisma, merchantService, _b, headers, body, req, res;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = setup(), controller = _a.controller, wxpay = _a.wxpay, prisma = _a.prisma, merchantService = _a.merchantService;
                        wxpay.decryptResource.mockReturnValueOnce(memDecrypt());
                        prisma.paymentRecord.findUnique.mockResolvedValueOnce({
                            id: 'rid-1',
                            no: 'MEM123',
                            status: 'pending',
                        });
                        _b = makeArgs(), headers = _b.headers, body = _b.body, req = _b.req;
                        return [4 /*yield*/, controller.wechatNotify(headers, body, req)];
                    case 1:
                        res = _c.sent();
                        (0, globals_1.expect)(res.code).toBe('SUCCESS');
                        (0, globals_1.expect)(merchantService.activateMembership).toHaveBeenCalledTimes(1);
                        (0, globals_1.expect)(merchantService.activateMembership).toHaveBeenCalledWith('rid-1');
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('PaymentRecord 已 paid → SUCCESS 且不再激活（幂等）', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, controller, wxpay, prisma, merchantService, _b, headers, body, req, res;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = setup(), controller = _a.controller, wxpay = _a.wxpay, prisma = _a.prisma, merchantService = _a.merchantService;
                        wxpay.decryptResource.mockReturnValueOnce(memDecrypt());
                        prisma.paymentRecord.findUnique.mockResolvedValueOnce({
                            id: 'rid-1',
                            no: 'MEM123',
                            status: 'paid',
                        });
                        _b = makeArgs(), headers = _b.headers, body = _b.body, req = _b.req;
                        return [4 /*yield*/, controller.wechatNotify(headers, body, req)];
                    case 1:
                        res = _c.sent();
                        (0, globals_1.expect)(res.code).toBe('SUCCESS');
                        (0, globals_1.expect)(merchantService.activateMembership).not.toHaveBeenCalled();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('attach 与 no 都查不到 PaymentRecord → {code:"FAIL"} 让微信重试', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, controller, wxpay, prisma, merchantService, _b, headers, body, req, res;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = setup(), controller = _a.controller, wxpay = _a.wxpay, prisma = _a.prisma, merchantService = _a.merchantService;
                        wxpay.decryptResource.mockReturnValueOnce(memDecrypt());
                        // 两次 findUnique（按 attach id / 按 no）都返回 null
                        prisma.paymentRecord.findUnique.mockResolvedValue(null);
                        _b = makeArgs(), headers = _b.headers, body = _b.body, req = _b.req;
                        return [4 /*yield*/, controller.wechatNotify(headers, body, req)];
                    case 1:
                        res = _c.sent();
                        (0, globals_1.expect)(res.code).toBe('FAIL');
                        (0, globals_1.expect)(merchantService.activateMembership).not.toHaveBeenCalled();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, globals_1.describe)('用例 5：普通订单的幂等保护', function () {
        function orderDecrypt() {
            return {
                out_trade_no: 'ORD-1',
                trade_state: 'SUCCESS',
                transaction_id: 'TX-1',
                attach: '',
            };
        }
        (0, globals_1.it)('按 wxTransactionId 命中 success → SUCCESS 且不开事务（幂等其一）', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, controller, wxpay, prisma, _b, headers, body, req, res;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = setup(), controller = _a.controller, wxpay = _a.wxpay, prisma = _a.prisma;
                        wxpay.decryptResource.mockReturnValueOnce(orderDecrypt());
                        prisma.payment.findFirst.mockResolvedValueOnce({
                            id: 'pay-old',
                            status: 'success',
                        });
                        _b = makeArgs(), headers = _b.headers, body = _b.body, req = _b.req;
                        return [4 /*yield*/, controller.wechatNotify(headers, body, req)];
                    case 1:
                        res = _c.sent();
                        (0, globals_1.expect)(res.code).toBe('SUCCESS');
                        (0, globals_1.expect)(prisma.$transaction).not.toHaveBeenCalled();
                        // 命中后无需再查订单
                        (0, globals_1.expect)(prisma.order.findFirst).not.toHaveBeenCalled();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('订单不存在 → {code:"FAIL"} 让微信重试', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, controller, wxpay, prisma, _b, headers, body, req, res;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = setup(), controller = _a.controller, wxpay = _a.wxpay, prisma = _a.prisma;
                        wxpay.decryptResource.mockReturnValueOnce(orderDecrypt());
                        prisma.payment.findFirst.mockResolvedValueOnce(null); // 无 tx 重复
                        prisma.order.findFirst.mockResolvedValueOnce(null); // 订单缺失
                        _b = makeArgs(), headers = _b.headers, body = _b.body, req = _b.req;
                        return [4 /*yield*/, controller.wechatNotify(headers, body, req)];
                    case 1:
                        res = _c.sent();
                        (0, globals_1.expect)(res.code).toBe('FAIL');
                        (0, globals_1.expect)(prisma.$transaction).not.toHaveBeenCalled();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('按 orderId 命中 success → SUCCESS 且不入账（幂等其二）', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, controller, wxpay, prisma, _b, headers, body, req, res;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = setup(), controller = _a.controller, wxpay = _a.wxpay, prisma = _a.prisma;
                        wxpay.decryptResource.mockReturnValueOnce(orderDecrypt());
                        // 第一次（按 wxTransactionId）未命中，第二次（按 orderId）命中
                        prisma.payment.findFirst
                            .mockResolvedValueOnce(null)
                            .mockResolvedValueOnce({ id: 'pay-old', status: 'success' });
                        prisma.order.findFirst.mockResolvedValueOnce({
                            id: 'order-1',
                            no: 'ORD-1',
                            payAmount: 100,
                            merchantId: 'm-1',
                        });
                        _b = makeArgs(), headers = _b.headers, body = _b.body, req = _b.req;
                        return [4 /*yield*/, controller.wechatNotify(headers, body, req)];
                    case 1:
                        res = _c.sent();
                        (0, globals_1.expect)(res.code).toBe('SUCCESS');
                        (0, globals_1.expect)(prisma.$transaction).not.toHaveBeenCalled();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, globals_1.describe)('用例 6：正常入账 happy path', function () {
        (0, globals_1.it)('开一次事务 + 改订单状态 + 写 Payment + 推商家 → SUCCESS', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, controller, wxpay, prisma, chat, txMock, _b, headers, body, req, res, updateArg, createArg;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = setup(), controller = _a.controller, wxpay = _a.wxpay, prisma = _a.prisma, chat = _a.chat, txMock = _a.txMock;
                        wxpay.decryptResource.mockReturnValueOnce({
                            out_trade_no: 'ORD-1',
                            trade_state: 'SUCCESS',
                            transaction_id: 'TX-1',
                            attach: '',
                        });
                        prisma.payment.findFirst.mockResolvedValue(null); // 两次幂等查询都不命中
                        prisma.order.findFirst.mockResolvedValueOnce({
                            id: 'order-1',
                            no: 'ORD-1',
                            payAmount: 100,
                            merchantId: 'm-1',
                        });
                        _b = makeArgs(), headers = _b.headers, body = _b.body, req = _b.req;
                        return [4 /*yield*/, controller.wechatNotify(headers, body, req)];
                    case 1:
                        res = _c.sent();
                        (0, globals_1.expect)(res.code).toBe('SUCCESS');
                        (0, globals_1.expect)(prisma.$transaction).toHaveBeenCalledTimes(1);
                        updateArg = txMock.order.updateMany.mock.calls[0][0];
                        (0, globals_1.expect)(updateArg.where).toMatchObject({ id: 'order-1', status: 'pending_payment' });
                        (0, globals_1.expect)(updateArg.data.status).toBe('pending_shipment');
                        createArg = txMock.payment.create.mock.calls[0][0];
                        (0, globals_1.expect)(createArg.data.amount).toBe(100);
                        (0, globals_1.expect)(createArg.data.wxTransactionId).toBe('TX-1');
                        // 推送商家（fire-and-forget）
                        (0, globals_1.expect)(chat.emitOrderUpdate).toHaveBeenCalledTimes(1);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, globals_1.describe)('用例 7：推送失败不阻塞 ACK', function () {
        (0, globals_1.it)('emitOrderUpdate 抛错 → 仍返回 {code:"SUCCESS"}', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, controller, wxpay, prisma, chat, _b, headers, body, req, res;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = setup(), controller = _a.controller, wxpay = _a.wxpay, prisma = _a.prisma, chat = _a.chat;
                        wxpay.decryptResource.mockReturnValueOnce({
                            out_trade_no: 'ORD-1',
                            trade_state: 'SUCCESS',
                            transaction_id: 'TX-1',
                            attach: '',
                        });
                        prisma.payment.findFirst.mockResolvedValue(null);
                        prisma.order.findFirst.mockResolvedValueOnce({
                            id: 'order-1',
                            no: 'ORD-1',
                            payAmount: 100,
                            merchantId: 'm-1',
                        });
                        chat.emitOrderUpdate.mockImplementationOnce(function () {
                            throw new Error('socket down');
                        });
                        _b = makeArgs(), headers = _b.headers, body = _b.body, req = _b.req;
                        return [4 /*yield*/, controller.wechatNotify(headers, body, req)
                            // 入账已成功，推送失败绝不能翻成 FAIL（否则微信重推污染对账）
                        ];
                    case 1:
                        res = _c.sent();
                        // 入账已成功，推送失败绝不能翻成 FAIL（否则微信重推污染对账）
                        (0, globals_1.expect)(res.code).toBe('SUCCESS');
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, globals_1.describe)('用例 8：事务失败', function () {
        (0, globals_1.it)('$transaction 抛错 → {code:"FAIL"} 且透传错误 message', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, controller, wxpay, prisma, _b, headers, body, req, res;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = setup(), controller = _a.controller, wxpay = _a.wxpay, prisma = _a.prisma;
                        wxpay.decryptResource.mockReturnValueOnce({
                            out_trade_no: 'ORD-1',
                            trade_state: 'SUCCESS',
                            transaction_id: 'TX-1',
                            attach: '',
                        });
                        prisma.payment.findFirst.mockResolvedValue(null);
                        prisma.order.findFirst.mockResolvedValueOnce({
                            id: 'order-1',
                            no: 'ORD-1',
                            payAmount: 100,
                            merchantId: 'm-1',
                        });
                        prisma.$transaction.mockRejectedValueOnce(new Error('db write conflict'));
                        _b = makeArgs(), headers = _b.headers, body = _b.body, req = _b.req;
                        return [4 /*yield*/, controller.wechatNotify(headers, body, req)];
                    case 1:
                        res = _c.sent();
                        (0, globals_1.expect)(res.code).toBe('FAIL');
                        (0, globals_1.expect)(res.message).toBe('db write conflict');
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
