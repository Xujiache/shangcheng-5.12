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
// nanoid@5 是纯 ESM，ts-jest(CJS) 不转换 node_modules；order-share.service 在模块加载时
// 通过 customAlphabet 生成 12 位 shareCode。用等价随机生成器替换，避免
// "Cannot use import statement outside a module"。
globals_1.jest.mock('nanoid', function () { return ({
    customAlphabet: function (alphabet, size) { return function () {
        var s = '';
        for (var i = 0; i < size; i++) {
            s += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        return s;
    }; },
}); });
var order_share_service_1 = require("../src/modules/merchant/order-share.service");
// ----------------------------------------------------------------------------
// OrderShareService — 重写版（独立 OrderShare 表，替代 SystemConfig 兜底）
//
// 实现位置：packages/server/src/modules/merchant/order-share.service.ts
//
// 重点契约：
//   - createShare：visibleFields 空 → 1001；订单不存在 → 1002；
//                  跨商户 → 2003；正常 → 先 updateMany 撤销旧分享再 create，
//                  落库 visibleFields 经白名单过滤，返回 { shareCode, orderNo,
//                  expiresAt, visibleFields, intro }
//   - getPublicByCode：不存在 → 1002；revoked → 2003；过期 → 2003；
//                  字段门控（visibleFields=[basics] 时只返回 basics，不泄露
//                  customer/pricing/items/extra）；viewCount 自增 update 被触发
//   - listByMerchant：真分页（findMany 带 skip/take，count 取 total），
//                  列表行带 orderNo
// ----------------------------------------------------------------------------
/** 断言抛出的 BizException 业务码 */
function expectBizCode(fn, code) {
    return __awaiter(this, void 0, void 0, function () {
        var e_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fn()];
                case 1:
                    _b.sent();
                    throw new Error('should have thrown');
                case 2:
                    e_1 = _b.sent();
                    (0, globals_1.expect)(e_1.getResponse().code).toBe(code);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// ── prisma 替身：仅含本服务消费到的模型/方法 ──
function buildPrisma() {
    var _this = this;
    return {
        order: {
            findUnique: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, null];
                }); });
            }),
            findMany: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, []];
                }); });
            }),
        },
        orderShare: {
            findUnique: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, null];
                }); });
            }),
            findFirst: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, null];
                }); });
            }),
            findMany: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, []];
                }); });
            }),
            count: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, 0];
                }); });
            }),
            create: globals_1.jest.fn(function (args) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                return [2 /*return*/, (__assign({ shareCode: 'SC' }, args === null || args === void 0 ? void 0 : args.data))];
            }); }); }),
            update: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, ({})];
                }); });
            }),
            updateMany: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, ({ count: 0 })];
                }); });
            }),
        },
        merchant: {
            findUnique: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, null];
                }); });
            }),
        },
    };
}
(0, globals_1.describe)('OrderShareService.createShare（校验 + 撤销旧分享 + 落库）', function () {
    var prisma;
    var service;
    (0, globals_1.beforeEach)(function () {
        prisma = buildPrisma();
        service = new order_share_service_1.OrderShareService(prisma);
    });
    (0, globals_1.it)('用例1：visibleFields 为空 → 1001 INVALID_PARAMS，不落库', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    // 给一个归属正确的订单，确保 1001 来自空字段校验而非订单/越权分支
                    prisma.order.findUnique.mockResolvedValue({ id: 'o1', merchantId: 'm1', no: 'NO-1' });
                    return [4 /*yield*/, expectBizCode(function () {
                            return service.createShare({
                                orderId: 'o1',
                                merchantId: 'm1',
                                callerSub: 'u1',
                                visibleFields: [],
                            });
                        }, 1001)];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(prisma.orderShare.create).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例2：订单不存在（order.findUnique 返回 null）→ 1002 NOT_FOUND', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.order.findUnique.mockResolvedValue(null);
                    return [4 /*yield*/, expectBizCode(function () {
                            return service.createShare({
                                orderId: 'missing',
                                merchantId: 'm1',
                                callerSub: 'u1',
                                visibleFields: ['basics'],
                            });
                        }, 1002)];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(prisma.orderShare.create).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例3：订单归属他人（merchantId 不匹配）→ 2003 FORBIDDEN', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.order.findUnique.mockResolvedValue({ id: 'o1', merchantId: 'other', no: 'NO-1' });
                    return [4 /*yield*/, expectBizCode(function () {
                            return service.createShare({
                                orderId: 'o1',
                                merchantId: 'm1',
                                callerSub: 'u1',
                                visibleFields: ['basics'],
                            });
                        }, 2003)];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(prisma.orderShare.create).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例4：正常 → 先 updateMany 撤销旧分享，再 create；白名单过滤非法字段；返回结构正确', function () { return __awaiter(void 0, void 0, void 0, function () {
        var calls, res, createArg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.order.findUnique.mockResolvedValue({ id: 'o1', merchantId: 'm1', no: 'NO-1' });
                    calls = [];
                    prisma.orderShare.updateMany.mockImplementationOnce(function () {
                        var _a = [];
                        for (var _i = 0; _i < arguments.length; _i++) {
                            _a[_i] = arguments[_i];
                        }
                        return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_b) {
                                calls.push('updateMany');
                                return [2 /*return*/, { count: 1 }];
                            });
                        });
                    });
                    prisma.orderShare.create.mockImplementationOnce(function (args) { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_b) {
                            calls.push('create');
                            return [2 /*return*/, __assign({ shareCode: 'NEWCODE12345' }, args.data)];
                        });
                    }); });
                    return [4 /*yield*/, service.createShare({
                            orderId: 'o1',
                            merchantId: 'm1',
                            callerSub: 'u1',
                            // 混入一个非法字段 'evil'，应被白名单过滤掉
                            visibleFields: ['basics', 'pricing', 'evil'],
                            intro: '门窗报价单',
                        })
                        // 撤销旧分享发生在创建之前
                    ];
                case 1:
                    res = _b.sent();
                    // 撤销旧分享发生在创建之前
                    (0, globals_1.expect)(prisma.orderShare.updateMany).toHaveBeenCalledTimes(1);
                    (0, globals_1.expect)(prisma.orderShare.create).toHaveBeenCalledTimes(1);
                    (0, globals_1.expect)(calls).toEqual(['updateMany', 'create']);
                    createArg = prisma.orderShare.create.mock.calls[0][0];
                    (0, globals_1.expect)(createArg.data.visibleFields).toEqual(['basics', 'pricing']);
                    (0, globals_1.expect)(createArg.data.orderId).toBe('o1');
                    (0, globals_1.expect)(createArg.data.merchantId).toBe('m1');
                    // 返回结构契约
                    (0, globals_1.expect)(res.orderNo).toBe('NO-1');
                    (0, globals_1.expect)(res.visibleFields).toEqual(['basics', 'pricing']);
                    (0, globals_1.expect)(res.intro).toBe('门窗报价单');
                    (0, globals_1.expect)(typeof res.shareCode).toBe('string');
                    (0, globals_1.expect)('expiresAt' in res).toBe(true);
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('OrderShareService.getPublicByCode（撤销/过期拦截 + 字段门控 + 浏览数自增）', function () {
    var prisma;
    var service;
    (0, globals_1.beforeEach)(function () {
        prisma = buildPrisma();
        service = new order_share_service_1.OrderShareService(prisma);
    });
    function shareRow(over) {
        if (over === void 0) { over = {}; }
        return __assign({ shareCode: 'CODE12345678', orderId: 'o1', merchantId: 'm1', visibleFields: ['basics'], expiresAt: null, intro: '报价', viewCount: 0, revoked: false, createdBy: 'u1', createdAt: new Date('2026-06-01T00:00:00.000Z'), updatedAt: new Date('2026-06-01T00:00:00.000Z') }, over);
    }
    function orderRow(over) {
        if (over === void 0) { over = {}; }
        return __assign({ id: 'o1', no: 'NO-1', merchantId: 'm1', status: 'paid', totalAmount: 10000, payAmount: 8000, discountAmount: 2000, shippingFee: 0, couponDiscount: 0, paymentMethod: 'wxpay', address: { name: '张三', phone: '13800000000', region: '广东', detail: 'xx路1号' }, remark: '尽快', shippingMethod: 'express', trackingCompany: null, trackingNumber: null, createdAt: new Date('2026-06-01T00:00:00.000Z'), items: [
                {
                    id: 'it1',
                    productName: '平开窗',
                    productImage: '',
                    specsLabel: '',
                    unitPrice: 500,
                    quantity: 2,
                },
            ] }, over);
    }
    (0, globals_1.it)('用例5：分享不存在 → 1002 NOT_FOUND', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.orderShare.findUnique.mockResolvedValue(null);
                    return [4 /*yield*/, expectBizCode(function () { return service.getPublicByCode('CODE12345678'); }, 1002)];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例6：分享已撤销 → 2003 FORBIDDEN', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.orderShare.findUnique.mockResolvedValue(shareRow({ revoked: true }));
                    return [4 /*yield*/, expectBizCode(function () { return service.getPublicByCode('CODE12345678'); }, 2003)];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例7：分享已过期（expiresAt 在过去）→ 2003 FORBIDDEN', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.orderShare.findUnique.mockResolvedValue(shareRow({ expiresAt: new Date(Date.now() - 86400000) }));
                    return [4 /*yield*/, expectBizCode(function () { return service.getPublicByCode('CODE12345678'); }, 2003)];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例8：visibleFields=[basics] → 仅返回 basics，不泄露 customer/pricing/items/extra；浏览数自增被触发', function () { return __awaiter(void 0, void 0, void 0, function () {
        var res;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.orderShare.findUnique.mockResolvedValue(shareRow({ visibleFields: ['basics'] }));
                    prisma.order.findUnique.mockResolvedValue(orderRow());
                    prisma.merchant.findUnique.mockResolvedValue({
                        id: 'm1',
                        name: '门窗店',
                        contactPhone: '123',
                    });
                    return [4 /*yield*/, service.getPublicByCode('CODE12345678')
                        // 命中字段
                    ];
                case 1:
                    res = _b.sent();
                    // 命中字段
                    (0, globals_1.expect)(res.basics).toBeDefined();
                    // 字段门控：未授权字段一律不出现在返回 JSON 中（防 devtools 反向取敏感信息）
                    (0, globals_1.expect)(res.customer).toBeUndefined();
                    (0, globals_1.expect)(res.pricing).toBeUndefined();
                    (0, globals_1.expect)(res.items).toBeUndefined();
                    (0, globals_1.expect)(res.extra).toBeUndefined();
                    // 浏览数自增 update 被触发（实现可能 fire-and-forget，等一拍微任务）
                    return [4 /*yield*/, Promise.resolve()];
                case 2:
                    // 浏览数自增 update 被触发（实现可能 fire-and-forget，等一拍微任务）
                    _b.sent();
                    return [4 /*yield*/, Promise.resolve()];
                case 3:
                    _b.sent();
                    (0, globals_1.expect)(prisma.orderShare.update).toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('OrderShareService.listByMerchant（真分页 skip/take + count + orderNo 拼接）', function () {
    var prisma;
    var service;
    (0, globals_1.beforeEach)(function () {
        prisma = buildPrisma();
        service = new order_share_service_1.OrderShareService(prisma);
    });
    (0, globals_1.it)('用例9：findMany 带 skip/take（真分页，非 take:500），count 取 total，行带 orderNo', function () { return __awaiter(void 0, void 0, void 0, function () {
        var res, findArg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.orderShare.findMany.mockResolvedValue([
                        {
                            shareCode: 'C1',
                            orderId: 'o1',
                            merchantId: 'm1',
                            visibleFields: ['basics'],
                            expiresAt: null,
                            intro: '报价',
                            viewCount: 3,
                            revoked: false,
                            createdAt: new Date('2026-06-01T00:00:00.000Z'),
                        },
                    ]);
                    prisma.orderShare.count.mockResolvedValue(42);
                    prisma.order.findMany.mockResolvedValue([{ id: 'o1', no: 'NO-1' }]);
                    return [4 /*yield*/, service.listByMerchant('m1', { page: 2, pageSize: 20 })
                        // 真分页：findMany 必须带 skip/take，绝不是内存切 take:500
                    ];
                case 1:
                    res = _b.sent();
                    findArg = prisma.orderShare.findMany.mock.calls[0][0];
                    (0, globals_1.expect)(findArg.skip).toBe(20); // (page2-1)*20
                    (0, globals_1.expect)(findArg.take).toBe(20);
                    (0, globals_1.expect)(findArg.take).not.toBe(500);
                    // total 来自 count，而非当前页行数
                    (0, globals_1.expect)(prisma.orderShare.count).toHaveBeenCalledTimes(1);
                    (0, globals_1.expect)(res.total).toBe(42);
                    // 列表行拼接了订单号
                    (0, globals_1.expect)(res.list).toHaveLength(1);
                    (0, globals_1.expect)(res.list[0].orderNo).toBe('NO-1');
                    return [2 /*return*/];
            }
        });
    }); });
});
