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
// nanoid@5 是纯 ESM，ts-jest(CJS) 默认不转换 node_modules；user-mp.service.ts → id.util.ts
// 导入 customAlphabet 会抛 "Cannot use import statement outside a module"。
// 这里用工厂 mock 替换为等价的随机生成器（与 auth.service.spec 同策略）。
globals_1.jest.mock('nanoid', function () { return ({
    customAlphabet: function (alphabet, size) { return function () {
        var s = '';
        for (var i = 0; i < size; i++) {
            s += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        return s;
    }; },
}); });
var user_mp_service_1 = require("../src/modules/user-mp/user-mp.service");
// ----------------------------------------------------------------------------
// UserMpService — 用户端保护性业务（createOrder 之外的防御契约，真实测试）
//
// 实现位置：
//   packages/server/src/modules/user-mp/user-mp.service.ts
//
// 构造：constructor(prisma, wxpay, chat)
//
// 覆盖范围（均为"防御 / 资金 / 状态机 / 库存回滚"关键路径）：
//   - listCart   ：available 标志聚合（下架 / 规格停用 / 0 库存 → 不可下单）+ 价格扁平化为 number
//   - addFavorite：upsert 幂等（复合主键 userId_productId）
//   - refundOrder：状态机 + 金额校验 + 防重复 + 事务原子（Refund + Order.after_sale）
//   - cancelOrder：状态机 + 库存回滚契约（每条 item 归还库存）
//   - confirmOrder：状态机（仅已发货可确认收货）+ WS 推送
//   - bindPhone  ：验证码 / 手机号占用 / 当前账号已绑别号
//   - claimCoupon：领取校验链 + 交互式 Serializable $transaction（per-user 限领并发安全）
//   - myCoupons  ：UserCoupon 单表读取 + used>expired>unused 三态映射 + status 过滤
// ----------------------------------------------------------------------------
/** 断言抛出的 BizException 业务码 */
function expectBizCode(fn, code) {
    return __awaiter(this, void 0, void 0, function () {
        var e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fn()];
                case 1:
                    _a.sent();
                    throw new Error('should have thrown');
                case 2:
                    e_1 = _a.sent();
                    (0, globals_1.expect)(e_1.getResponse().code).toBe(code);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/** chat 网关：全部 jest.fn，调用即记录，永不抛 */
function makeChatMock() {
    return {
        broadcastUserUpdate: globals_1.jest.fn(function () {
            var _args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                _args[_i] = arguments[_i];
            }
            return undefined;
        }),
        emitOrderNew: globals_1.jest.fn(function () {
            var _args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                _args[_i] = arguments[_i];
            }
            return undefined;
        }),
        emitOrderUpdate: globals_1.jest.fn(function () {
            var _args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                _args[_i] = arguments[_i];
            }
            return undefined;
        }),
        emitRefundNew: globals_1.jest.fn(function () {
            var _args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                _args[_i] = arguments[_i];
            }
            return undefined;
        }),
    };
}
/** wxpay 网关：本套用例不触达支付，最小桩即可 */
function makeWxpayMock() {
    return {
        isReady: globals_1.jest.fn(function () { return true; }),
        createMiniPay: globals_1.jest.fn(),
    };
}
// ============================================================================
// listCart — available 聚合 + 价格扁平化
// ============================================================================
(0, globals_1.describe)('UserMpService.listCart available 聚合', function () {
    /** 构造一条 cartItem，product/sku 字段可覆写以制造不同不可用场景 */
    function makeRow(over) {
        if (over === void 0) { over = {}; }
        return {
            id: 'c1',
            productId: 'p1',
            skuId: 's1',
            quantity: 2,
            createdAt: new Date(),
            updatedAt: new Date(),
            product: __assign({ id: 'p1', name: '门窗A', images: ['img.jpg'], status: 'active', merchantId: 'm1', priceRetailMin: 100 }, over.product),
            sku: __assign({ id: 's1', specsLabel: '规格1', priceRetail: 100, priceWholesale: 80, priceMember: 70, stock: 5, active: true }, over.sku),
        };
    }
    function svcWithRows(rows) {
        var _this = this;
        var prisma = { cartItem: { findMany: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, rows];
                }); }); }) } };
        return new user_mp_service_1.UserMpService(prisma, makeWxpayMock(), makeChatMock());
    }
    (0, globals_1.it)('正常商品/规格/有库存 → available=true', function () { return __awaiter(void 0, void 0, void 0, function () {
        var svc, list;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    svc = svcWithRows([makeRow()]);
                    return [4 /*yield*/, svc.listCart('u1')];
                case 1:
                    list = _a.sent();
                    (0, globals_1.expect)(list[0].available).toBe(true);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('商品已下架 → available=false', function () { return __awaiter(void 0, void 0, void 0, function () {
        var svc, list;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    svc = svcWithRows([makeRow({ product: { status: 'offline' } })]);
                    return [4 /*yield*/, svc.listCart('u1')];
                case 1:
                    list = _a.sent();
                    (0, globals_1.expect)(list[0].available).toBe(false);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('SKU 停用(active=false) → available=false', function () { return __awaiter(void 0, void 0, void 0, function () {
        var svc, list;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    svc = svcWithRows([makeRow({ sku: { active: false } })]);
                    return [4 /*yield*/, svc.listCart('u1')];
                case 1:
                    list = _a.sent();
                    (0, globals_1.expect)(list[0].available).toBe(false);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('库存为 0 → available=false', function () { return __awaiter(void 0, void 0, void 0, function () {
        var svc, list;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    svc = svcWithRows([makeRow({ sku: { stock: 0 } })]);
                    return [4 /*yield*/, svc.listCart('u1')];
                case 1:
                    list = _a.sent();
                    (0, globals_1.expect)(list[0].available).toBe(false);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('价格字段扁平化为 number：priceRetail/priceWholesale/priceMember', function () { return __awaiter(void 0, void 0, void 0, function () {
        var decimalLike, svc, list;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    decimalLike = function (n) { return ({ valueOf: function () { return n; } }); };
                    svc = svcWithRows([
                        makeRow({
                            sku: {
                                priceRetail: decimalLike(100),
                                priceWholesale: decimalLike(80),
                                priceMember: decimalLike(70),
                            },
                        }),
                    ]);
                    return [4 /*yield*/, svc.listCart('u1')];
                case 1:
                    list = _a.sent();
                    (0, globals_1.expect)(typeof list[0].sku.priceRetail).toBe('number');
                    (0, globals_1.expect)(typeof list[0].sku.priceWholesale).toBe('number');
                    (0, globals_1.expect)(typeof list[0].sku.priceMember).toBe('number');
                    (0, globals_1.expect)(list[0].sku.priceRetail).toBe(100);
                    (0, globals_1.expect)(list[0].sku.priceWholesale).toBe(80);
                    (0, globals_1.expect)(list[0].sku.priceMember).toBe(70);
                    return [2 /*return*/];
            }
        });
    }); });
});
// ============================================================================
// addFavorite — upsert 幂等（复合主键）
// ============================================================================
(0, globals_1.describe)('UserMpService.addFavorite 幂等收藏', function () {
    (0, globals_1.it)('调用 favorite.upsert，where 为复合主键 userId_productId', function () { return __awaiter(void 0, void 0, void 0, function () {
        var upsert, prisma, svc, r, arg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    upsert = globals_1.jest.fn(function () {
                        var _args = [];
                        for (var _i = 0; _i < arguments.length; _i++) {
                            _args[_i] = arguments[_i];
                        }
                        return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ id: 'f1' })];
                        }); });
                    });
                    prisma = {
                        product: { findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ merchantId: 'm1' })];
                            }); }); }) },
                        favorite: { upsert: upsert },
                    };
                    svc = new user_mp_service_1.UserMpService(prisma, makeWxpayMock(), makeChatMock());
                    return [4 /*yield*/, svc.addFavorite('u1', 'p1')];
                case 1:
                    r = _a.sent();
                    (0, globals_1.expect)(r).toEqual({ ok: true });
                    (0, globals_1.expect)(upsert).toHaveBeenCalledTimes(1);
                    arg = upsert.mock.calls[0][0];
                    (0, globals_1.expect)(arg.where).toEqual({ userId_productId: { userId: 'u1', productId: 'p1' } });
                    // 幂等：update 为空对象，已存在时不改动
                    (0, globals_1.expect)(arg.update).toEqual({});
                    (0, globals_1.expect)(arg.create).toEqual({ userId: 'u1', productId: 'p1' });
                    return [2 /*return*/];
            }
        });
    }); });
});
// ============================================================================
// refundOrder — 状态机 + 金额校验 + 防重复 + 事务原子
// ============================================================================
(0, globals_1.describe)('UserMpService.refundOrder 售后防御', function () {
    function baseOrder(over) {
        if (over === void 0) { over = {}; }
        return __assign({ id: 'o1', no: 'NO1', userId: 'u1', merchantId: 'm1', status: 'shipped', payAmount: 100, items: [{ id: 'oi1', skuId: 's1', quantity: 1 }] }, over);
    }
    function makeSvc(opts) {
        var _this = this;
        var chat = opts.chat || makeChatMock();
        var prisma = {
            order: {
                findFirst: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, opts.order];
                }); }); }),
                update: globals_1.jest.fn(function () {
                    var _args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        _args[_i] = arguments[_i];
                    }
                    return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({})];
                    }); });
                }),
            },
            refund: {
                findFirst: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { var _a; return __generator(this, function (_b) {
                    return [2 /*return*/, (_a = opts.dupRefund) !== null && _a !== void 0 ? _a : null];
                }); }); }),
                create: globals_1.jest.fn(function () {
                    var _args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        _args[_i] = arguments[_i];
                    }
                    return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, ({
                                    id: 'r1',
                                    no: 'RF1',
                                    createdAt: new Date(),
                                })];
                        });
                    });
                }),
            },
            $transaction: globals_1.jest.fn(function (cb) { return __awaiter(_this, void 0, void 0, function () {
                var tx;
                return __generator(this, function (_a) {
                    tx = {
                        refund: { create: prisma.refund.create },
                        order: { update: prisma.order.update },
                    };
                    return [2 /*return*/, cb(tx)];
                });
            }); }),
        };
        var svc = new user_mp_service_1.UserMpService(prisma, makeWxpayMock(), chat);
        return { svc: svc, prisma: prisma, chat: chat };
    }
    (0, globals_1.it)('状态为 pending_payment（未付款）→ ORDER_STATUS_INVALID(4001)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    svc = makeSvc({ order: baseOrder({ status: 'pending_payment' }) }).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.refundOrder('u1', 'o1', { reason: '不想要了' }); }, 4001)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('退款金额超过实付金额 → INVALID_PARAMS(1001)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    svc = makeSvc({ order: baseOrder({ payAmount: 100 }) }).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.refundOrder('u1', 'o1', { reason: '质量问题', amount: 200 }); }, 1001)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('已有进行中的售后单 → CONFLICT(1003)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    svc = makeSvc({
                        order: baseOrder(),
                        dupRefund: { id: 'rOld', status: 'pending' },
                    }).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.refundOrder('u1', 'o1', { reason: '重复提交' }); }, 1003)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('正常路径：事务内 refund.create + order.update(after_sale)，推 emitRefundNew，返回 refundNo', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, svc, prisma, chat, r, updArg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeSvc({ order: baseOrder() }), svc = _a.svc, prisma = _a.prisma, chat = _a.chat;
                    return [4 /*yield*/, svc.refundOrder('u1', 'o1', { reason: '尺寸不对', amount: 50 })];
                case 1:
                    r = _b.sent();
                    (0, globals_1.expect)(prisma.$transaction).toHaveBeenCalledTimes(1);
                    (0, globals_1.expect)(prisma.refund.create).toHaveBeenCalledTimes(1);
                    (0, globals_1.expect)(prisma.order.update).toHaveBeenCalledTimes(1);
                    updArg = prisma.order.update.mock.calls[0][0];
                    (0, globals_1.expect)(updArg.data.status).toBe('after_sale');
                    // 商家端实时推送
                    (0, globals_1.expect)(chat.emitRefundNew).toHaveBeenCalledTimes(1);
                    (0, globals_1.expect)(r.refundNo).toBe('RF1');
                    (0, globals_1.expect)(r.ok).toBe(true);
                    return [2 /*return*/];
            }
        });
    }); });
});
// ============================================================================
// cancelOrder — 状态机 + 库存回滚契约
// ============================================================================
(0, globals_1.describe)('UserMpService.cancelOrder 取消与库存回滚', function () {
    function makeSvc(order) {
        var _this = this;
        var chat = makeChatMock();
        var prisma = {
            order: {
                findFirst: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, order];
                }); }); }),
                update: globals_1.jest.fn(function () {
                    var _args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        _args[_i] = arguments[_i];
                    }
                    return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({})];
                    }); });
                }),
            },
            sku: { update: globals_1.jest.fn(function () {
                    var _args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        _args[_i] = arguments[_i];
                    }
                    return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({})];
                    }); });
                }) },
            $transaction: globals_1.jest.fn(function (cb) { return __awaiter(_this, void 0, void 0, function () {
                var tx;
                return __generator(this, function (_a) {
                    tx = {
                        order: { update: prisma.order.update },
                        sku: { update: prisma.sku.update },
                    };
                    return [2 /*return*/, cb(tx)];
                });
            }); }),
        };
        var svc = new user_mp_service_1.UserMpService(prisma, makeWxpayMock(), chat);
        return { svc: svc, prisma: prisma, chat: chat };
    }
    (0, globals_1.it)('已发货订单不允许取消 → ORDER_STATUS_INVALID(4001)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    svc = makeSvc({ id: 'o1', status: 'shipped', items: [] }).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.cancelOrder('u1', 'o1'); }, 4001)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('待付款订单可取消：事务内 order.update(cancelled) + 每条 item 归还库存', function () { return __awaiter(void 0, void 0, void 0, function () {
        var order, _a, svc, prisma, r, updArg, calls, s1, s2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    order = {
                        id: 'o1',
                        no: 'NO1',
                        merchantId: 'm1',
                        status: 'pending_payment',
                        items: [
                            { id: 'oi1', skuId: 's1', quantity: 2 },
                            { id: 'oi2', skuId: 's2', quantity: 3 },
                        ],
                    };
                    _a = makeSvc(order), svc = _a.svc, prisma = _a.prisma;
                    return [4 /*yield*/, svc.cancelOrder('u1', 'o1')];
                case 1:
                    r = _b.sent();
                    (0, globals_1.expect)(r).toEqual({ ok: true });
                    updArg = prisma.order.update.mock.calls[0][0];
                    (0, globals_1.expect)(updArg.data.status).toBe('cancelled');
                    // 两条 item 各归还一次库存（stock increment）
                    (0, globals_1.expect)(prisma.sku.update).toHaveBeenCalledTimes(2);
                    calls = prisma.sku.update.mock.calls.map(function (c) { return c[0]; });
                    s1 = calls.find(function (a) { return a.where.id === 's1'; });
                    s2 = calls.find(function (a) { return a.where.id === 's2'; });
                    (0, globals_1.expect)(s1.data.stock).toEqual({ increment: 2 });
                    (0, globals_1.expect)(s2.data.stock).toEqual({ increment: 3 });
                    return [2 /*return*/];
            }
        });
    }); });
});
// ============================================================================
// confirmOrder — 状态机（仅已发货可确认收货）
// ============================================================================
(0, globals_1.describe)('UserMpService.confirmOrder 确认收货', function () {
    function makeSvc(order) {
        var _this = this;
        var chat = makeChatMock();
        var prisma = {
            order: {
                findFirst: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, order];
                }); }); }),
                update: globals_1.jest.fn(function () {
                    var _args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        _args[_i] = arguments[_i];
                    }
                    return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({})];
                    }); });
                }),
            },
        };
        var svc = new user_mp_service_1.UserMpService(prisma, makeWxpayMock(), chat);
        return { svc: svc, prisma: prisma, chat: chat };
    }
    (0, globals_1.it)('未发货订单 → ORDER_STATUS_INVALID(4001)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    svc = makeSvc({ id: 'o1', status: 'pending_shipment' }).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.confirmOrder('u1', 'o1'); }, 4001)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('已发货 → 切 completed 并推 emitOrderUpdate', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, svc, prisma, chat, r, updArg, payload;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeSvc({
                        id: 'o1',
                        no: 'NO1',
                        merchantId: 'm1',
                        status: 'shipped',
                    }), svc = _a.svc, prisma = _a.prisma, chat = _a.chat;
                    return [4 /*yield*/, svc.confirmOrder('u1', 'o1')];
                case 1:
                    r = _b.sent();
                    (0, globals_1.expect)(r).toEqual({ ok: true });
                    updArg = prisma.order.update.mock.calls[0][0];
                    (0, globals_1.expect)(updArg.data.status).toBe('completed');
                    (0, globals_1.expect)(chat.emitOrderUpdate).toHaveBeenCalledTimes(1);
                    payload = chat.emitOrderUpdate.mock.calls[0][1];
                    (0, globals_1.expect)(payload.status).toBe('completed');
                    return [2 /*return*/];
            }
        });
    }); });
});
// ============================================================================
// bindPhone — 验证码 / 占用 / 当前账号已绑别号
// ============================================================================
(0, globals_1.describe)('UserMpService.bindPhone 手机号绑定防御', function () {
    /**
     * @param smsRec   smsCode.findFirst 返回（null 表示验证码错误/过期）
     * @param occupied user.findUnique(by phone) 返回（占用检查）
     * @param me       user.findUnique(by id) 返回（当前账号）
     */
    function makeSvc(opts) {
        var _this = this;
        var chat = makeChatMock();
        var prisma = {
            smsCode: {
                findFirst: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, opts.smsRec];
                }); }); }),
                update: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, ({})];
                }); }); }),
            },
            user: {
                // 第一次 findUnique 用 phone 查占用，第二次用 id 查 me
                findUnique: globals_1.jest.fn(function (args) { return __awaiter(_this, void 0, void 0, function () {
                    var _a;
                    return __generator(this, function (_b) {
                        if ((_a = args === null || args === void 0 ? void 0 : args.where) === null || _a === void 0 ? void 0 : _a.phone)
                            return [2 /*return*/, opts.occupied];
                        return [2 /*return*/, opts.me];
                    });
                }); }),
                update: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, opts.me];
                }); }); }),
            },
        };
        var svc = new user_mp_service_1.UserMpService(prisma, makeWxpayMock(), chat);
        return { svc: svc, prisma: prisma, chat: chat };
    }
    (0, globals_1.it)('验证码错误/过期(smsCode.findFirst null) → INVALID_PARAMS(1001)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    svc = makeSvc({ smsRec: null, occupied: null, me: { id: 'u1' } }).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.bindPhone('u1', { phone: '13800000000', code: '123456' }); }, 1001)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('手机号被其他账号占用 → BUSINESS_ERROR(1000)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    svc = makeSvc({
                        smsRec: { id: 'sc1' },
                        occupied: { id: 'uOther', phone: '13800000000' },
                        me: { id: 'u1' },
                    }).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.bindPhone('u1', { phone: '13800000000', code: '123456' }); }, 1000)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('当前账号已绑定其他手机号 → BUSINESS_ERROR(1000)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    svc = makeSvc({
                        smsRec: { id: 'sc1' },
                        occupied: null,
                        me: { id: 'u1', phone: '13900000000' },
                    }).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.bindPhone('u1', { phone: '13800000000', code: '123456' }); }, 1000)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
// ============================================================================
// claimCoupon — 领取校验链 + 交互式 Serializable $transaction（per-user 限领并发安全）
// ============================================================================
(0, globals_1.describe)('UserMpService.claimCoupon 领券校验链', function () {
    var now = Date.now();
    function activeCoupon(over) {
        if (over === void 0) { over = {}; }
        return __assign({ id: 'cp1', status: 'active', validFrom: new Date(now - 86400000), validTo: new Date(now + 86400000), stock: 100, received: 0, perUserLimit: 1 }, over);
    }
    /**
     * @param coupon       coupon.findUnique 返回（null 表示券不存在）
     * @param userClaimed  已领数量（tx.userCoupon.count 返回值）
     *
     * 新实现用「交互式 Serializable 事务」+ 正式 UserCoupon 表：claimCoupon 调
     * prisma.$transaction(async (cb) => cb(tx), { isolationLevel })。
     * 每人限领数量（count）必须在 **tx 客户端** 上读 —— 这是并发安全的关键，
     * 因此 txMock 暴露 userCoupon.{count,create} 与 coupon.update。
     * 基座 prisma.userCoupon.count 仅作哨兵：断言它不会被用于读 count。
     */
    function makeSvc(opts) {
        var _this = this;
        var chat = makeChatMock();
        var couponUpdate = globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, ({})];
        }); }); });
        var ucCreate = globals_1.jest.fn(function (_arg) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, ({})];
        }); }); });
        var txUcCount = globals_1.jest.fn(function (_arg) { return __awaiter(_this, void 0, void 0, function () { var _a; return __generator(this, function (_b) {
            return [2 /*return*/, (_a = opts.userClaimed) !== null && _a !== void 0 ? _a : 0];
        }); }); });
        // tx 客户端：事务回调内的全部读写都打在它身上
        var txMock = {
            coupon: { update: couponUpdate },
            userCoupon: { count: txUcCount, create: ucCreate },
        };
        // 基座 userCoupon.count —— 哨兵，断言 count 不从这里读
        var baseUcCount = globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error('base prisma.userCoupon.count 不应被用于读 per-user count');
            });
        }); });
        var prisma = {
            coupon: { findUnique: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, opts.coupon];
                }); }); }), update: couponUpdate },
            userCoupon: { count: baseUcCount, create: ucCreate },
            // 回调形式：claimCoupon 传入 (cb, opts)，把 txMock 喂给回调
            $transaction: globals_1.jest.fn(function (cb, _opts) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, cb(txMock)];
            }); }); }),
        };
        var svc = new user_mp_service_1.UserMpService(prisma, makeWxpayMock(), chat);
        return { svc: svc, prisma: prisma, txMock: txMock, couponUpdate: couponUpdate, ucCreate: ucCreate, txUcCount: txUcCount, baseUcCount: baseUcCount };
    }
    (0, globals_1.it)('券不存在 → NOT_FOUND(1002)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    svc = makeSvc({ coupon: null }).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.claimCoupon('u1', 'cp1'); }, 1002)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('券未上架/已下架 → BUSINESS_ERROR(1000)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    svc = makeSvc({ coupon: activeCoupon({ status: 'paused' }) }).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.claimCoupon('u1', 'cp1'); }, 1000)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('券不在有效期内（已过期）→ BUSINESS_ERROR(1000)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    svc = makeSvc({
                        coupon: activeCoupon({ validTo: new Date(now - 1000) }),
                    }).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.claimCoupon('u1', 'cp1'); }, 1000)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('券已被领完(received>=stock) → BUSINESS_ERROR(1000)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var svc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    svc = makeSvc({ coupon: activeCoupon({ stock: 10, received: 10 }) }).svc;
                    return [4 /*yield*/, expectBizCode(function () { return svc.claimCoupon('u1', 'cp1'); }, 1000)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('超出每人限领(perUserLimit) → BUSINESS_ERROR(1000)，且 count 读在 tx 客户端上', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, svc, txUcCount, baseUcCount, couponUpdate, ucCreate;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeSvc({
                        coupon: activeCoupon({ perUserLimit: 1 }),
                        userClaimed: 1,
                    }), svc = _a.svc, txUcCount = _a.txUcCount, baseUcCount = _a.baseUcCount, couponUpdate = _a.couponUpdate, ucCreate = _a.ucCreate;
                    return [4 /*yield*/, expectBizCode(function () { return svc.claimCoupon('u1', 'cp1'); }, 1000)
                        // per-user count 必须在事务客户端读（并发安全核心），不能读基座 prisma
                    ];
                case 1:
                    _b.sent();
                    // per-user count 必须在事务客户端读（并发安全核心），不能读基座 prisma
                    (0, globals_1.expect)(txUcCount).toHaveBeenCalledTimes(1);
                    (0, globals_1.expect)(txUcCount).toHaveBeenCalledWith({ where: { userId: 'u1', couponId: 'cp1' } });
                    (0, globals_1.expect)(baseUcCount).not.toHaveBeenCalled();
                    // 超限路径绝不写库存（事务回滚），received 不应被 +1，持券行也不应落表
                    (0, globals_1.expect)(couponUpdate).not.toHaveBeenCalled();
                    (0, globals_1.expect)(ucCreate).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('正常领取：回调形式 $transaction(Serializable) 被调用，tx 内读 count + 写，返回 {ok:true, no, count}', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, svc, prisma, txMock, couponUpdate, ucCreate, txUcCount, baseUcCount, r, txOpts, createArg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeSvc({
                        coupon: activeCoupon(),
                    }), svc = _a.svc, prisma = _a.prisma, txMock = _a.txMock, couponUpdate = _a.couponUpdate, ucCreate = _a.ucCreate, txUcCount = _a.txUcCount, baseUcCount = _a.baseUcCount;
                    return [4 /*yield*/, svc.claimCoupon('u1', 'cp1')];
                case 1:
                    r = _b.sent();
                    (0, globals_1.expect)(prisma.$transaction).toHaveBeenCalledTimes(1);
                    // 回调形式：第一个参数是函数，第二个参数带 Serializable 隔离级别
                    (0, globals_1.expect)(typeof prisma.$transaction.mock.calls[0][0]).toBe('function');
                    txOpts = prisma.$transaction.mock.calls[0][1];
                    (0, globals_1.expect)(txOpts === null || txOpts === void 0 ? void 0 : txOpts.isolationLevel).toBe('Serializable');
                    // per-user count 读在 tx 客户端（tx.userCoupon.count），而非基座 prisma
                    (0, globals_1.expect)(txUcCount).toHaveBeenCalledTimes(1);
                    (0, globals_1.expect)(txUcCount).toHaveBeenCalledWith({ where: { userId: 'u1', couponId: 'cp1' } });
                    (0, globals_1.expect)(baseUcCount).not.toHaveBeenCalled();
                    // received +1 + 持券行 create 均在 tx 客户端求值
                    (0, globals_1.expect)(txMock.coupon.update).toBe(couponUpdate);
                    (0, globals_1.expect)(couponUpdate).toHaveBeenCalledTimes(1);
                    (0, globals_1.expect)(ucCreate).toHaveBeenCalledTimes(1);
                    createArg = ucCreate.mock.calls[0][0];
                    (0, globals_1.expect)(createArg.data.userId).toBe('u1');
                    (0, globals_1.expect)(createArg.data.couponId).toBe('cp1');
                    (0, globals_1.expect)(createArg.data.no).toBe(r.no);
                    (0, globals_1.expect)(r.ok).toBe(true);
                    (0, globals_1.expect)(typeof r.no).toBe('string');
                    (0, globals_1.expect)(r.no.length).toBeGreaterThan(0);
                    (0, globals_1.expect)(r.count).toBe(1);
                    return [2 /*return*/];
            }
        });
    }); });
});
// ============================================================================
// myCoupons — UserCoupon 单表读取 + 三态映射（used > expired > unused）+ status 过滤
// ============================================================================
(0, globals_1.describe)('UserMpService.myCoupons 我的优惠券', function () {
    var now = Date.now();
    /** 券基础信息（coupon.findMany 返回，含 merchant 名称） */
    function coupon(id, over) {
        if (over === void 0) { over = {}; }
        return __assign({ id: id, name: "\u5238".concat(id), type: 'fullReduce', amount: 50, discountPercent: null, threshold: 100, merchantId: 'm1', merchant: { id: 'm1', name: '商家一号' }, validFrom: new Date(now - 86400000), validTo: new Date(now + 86400000) }, over);
    }
    /** UserCoupon 持券行（userCoupon.findMany 返回） */
    function ucRow(no, couponId, over) {
        if (over === void 0) { over = {}; }
        return __assign({ no: no, userId: 'u1', couponId: couponId, status: 'unused', usedAt: null, orderId: null, orderNo: null, claimedAt: new Date(now - 3600000) }, over);
    }
    function makeSvc(rows, coupons) {
        var _this = this;
        var ucFindMany = globals_1.jest.fn(function (_arg) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, rows];
        }); }); });
        var cpFindMany = globals_1.jest.fn(function (_arg) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, coupons];
        }); }); });
        var prisma = {
            userCoupon: { findMany: ucFindMany },
            coupon: { findMany: cpFindMany },
        };
        var svc = new user_mp_service_1.UserMpService(prisma, makeWxpayMock(), makeChatMock());
        return { svc: svc, ucFindMany: ucFindMany, cpFindMany: cpFindMany };
    }
    (0, globals_1.it)('三态映射：已核销→used（即便券已过期，used 优先于 expired），过期未用→expired，其余→unused', function () { return __awaiter(void 0, void 0, void 0, function () {
        var usedAt, rows, coupons, _a, svc, ucFindMany, list, arg, byNo, u;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    usedAt = new Date(now - 1800000);
                    rows = [
                        // 已核销 + 券已过期 → 仍 used（与旧 SystemConfig 实现的优先级一致）
                        ucRow('UC_used_expired', 'cpExpired', { status: 'used', usedAt: usedAt }),
                        // 未核销 + 券已过期 → expired
                        ucRow('UC_expired', 'cpExpired'),
                        // 未核销 + 在有效期 → unused
                        ucRow('UC_unused', 'cpActive'),
                    ];
                    coupons = [coupon('cpExpired', { validTo: new Date(now - 1000) }), coupon('cpActive')];
                    _a = makeSvc(rows, coupons), svc = _a.svc, ucFindMany = _a.ucFindMany;
                    return [4 /*yield*/, svc.myCoupons('u1')
                        // 单表查询：where userId + claimedAt desc + take 500
                    ];
                case 1:
                    list = _b.sent();
                    arg = ucFindMany.mock.calls[0][0];
                    (0, globals_1.expect)(arg.where).toEqual({ userId: 'u1' });
                    (0, globals_1.expect)(arg.orderBy).toEqual({ claimedAt: 'desc' });
                    (0, globals_1.expect)(arg.take).toBe(500);
                    (0, globals_1.expect)(list).toHaveLength(3);
                    byNo = new Map(list.map(function (x) { return [x.no, x]; }));
                    (0, globals_1.expect)(byNo.get('UC_used_expired').status).toBe('used');
                    (0, globals_1.expect)(byNo.get('UC_used_expired').usedAt).toBe(usedAt.toISOString());
                    (0, globals_1.expect)(byNo.get('UC_expired').status).toBe('expired');
                    (0, globals_1.expect)(byNo.get('UC_expired').usedAt).toBeNull();
                    (0, globals_1.expect)(byNo.get('UC_unused').status).toBe('unused');
                    u = byNo.get('UC_unused');
                    (0, globals_1.expect)(u.claimedAt).toBe(rows[2].claimedAt.toISOString());
                    (0, globals_1.expect)(u.amount).toBe(50);
                    (0, globals_1.expect)(u.threshold).toBe(100);
                    (0, globals_1.expect)(u.merchantName).toBe('商家一号');
                    (0, globals_1.expect)(u.couponId).toBe('cpActive');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('query.status 过滤：只返回指定状态（used），未知 couponId 的持券行被跳过', function () { return __awaiter(void 0, void 0, void 0, function () {
        var rows, svc, list;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    rows = [
                        ucRow('UC_used', 'cpActive', { status: 'used', usedAt: new Date(now - 60000) }),
                        ucRow('UC_unused', 'cpActive'),
                        // 券已被删/查不到 → 行直接跳过，不进结果
                        ucRow('UC_orphan', 'cpGone', { status: 'used', usedAt: new Date(now - 60000) }),
                    ];
                    svc = makeSvc(rows, [coupon('cpActive')]).svc;
                    return [4 /*yield*/, svc.myCoupons('u1', { status: 'used' })];
                case 1:
                    list = _a.sent();
                    (0, globals_1.expect)(list).toHaveLength(1);
                    (0, globals_1.expect)(list[0].no).toBe('UC_used');
                    (0, globals_1.expect)(list[0].status).toBe('used');
                    return [2 /*return*/];
            }
        });
    }); });
});
