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
// nanoid@5 是纯 ESM，ts-jest(CJS) 无法直接 require。轻量替身保留字符集+长度契约。
// ledger.service 间接 import ledger.constants（含 customAlphabet），故必须 mock。
globals_1.jest.mock('nanoid', function () { return ({
    customAlphabet: function (alphabet, size) { return function () {
        var out = '';
        for (var i = 0; i < size; i++) {
            out += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        return out;
    }; },
}); });
var ledger_service_1 = require("../src/modules/ledger/ledger.service");
// ── prisma 替身：仅含本服务消费到的模型/方法 ──
function buildPrisma() {
    var _this = this;
    return {
        ledgerOrder: {
            findMany: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, []];
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
            create: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, ({})];
                }); });
            }),
            update: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, ({})];
                }); });
            }),
            delete: globals_1.jest.fn(function () {
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
            count: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, 0];
                }); });
            }),
            aggregate: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, ({ _count: { _all: 0 }, _sum: {} })];
                }); });
            }),
            groupBy: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, []];
                }); });
            }),
        },
        ledgerCustomer: {
            findMany: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, []];
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
            create: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, ({})];
                }); });
            }),
            update: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, ({})];
                }); });
            }),
            delete: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, ({})];
                }); });
            }),
        },
        ledgerNotification: {
            create: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, ({})];
                }); });
            }),
        },
        ledgerSetting: {
            // 默认无设置行 → pushNotification 按 schema 默认值（order/report/goal 开、system 关）
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
        ledgerGoal: {
            findUnique: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, null];
                }); });
            }),
            upsert: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, ({})];
                }); });
            }),
        },
        ledgerConfig: {
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
        ledgerUser: {
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
// 订单行工厂：填齐 mapOrder/OrderRow 所需列，调用方按需覆写。
function orderRow(over) {
    if (over === void 0) { over = {}; }
    return __assign({ id: 'o1', customerId: 'c1', customerName: '张三', date: new Date('2026-06-01T00:00:00.000Z'), total: 0, received: 0, costProfile: 0, costGlass: 0, costHardware: 0, costLabor: 0, costScreen: 0, extras: [], customCosts: [], items: [], discount: 0, deposit: 0, note: null }, over);
}
(0, globals_1.describe)('LedgerService.getOrder（映射 + 计算口径）', function () {
    var prisma;
    var service;
    (0, globals_1.beforeEach)(function () {
        prisma = buildPrisma();
        service = new ledger_service_1.LedgerService(prisma);
    });
    (0, globals_1.it)('用例1：成本/利润/营收/利润率 + 门窗明细金额与未收额计算正确', function () { return __awaiter(void 0, void 0, void 0, function () {
        var items, res;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    items = [
                        {
                            name: '平开窗',
                            unitPrice: 500,
                            baseArea: 0,
                            qty: 0,
                            // 1200×1500mm = 1.8㎡ → 小计 round(1.8*500)=900
                            sizes: [{ w: 1200, h: 1500, note: '' }],
                        },
                        {
                            name: '推拉门',
                            unitPrice: 300,
                            baseArea: 0,
                            qty: 0,
                            // 2000×2000mm = 4㎡ → 小计 round(4*300)=1200
                            sizes: [{ w: 2000, h: 2000, note: '' }],
                        },
                    ];
                    prisma.ledgerOrder.findFirst.mockResolvedValueOnce(orderRow({
                        total: 58200,
                        received: 2000,
                        costProfile: 16800,
                        costGlass: 9200,
                        costHardware: 4100,
                        costLabor: 6800,
                        costScreen: 1900,
                        extras: [{ type: 'freight', amount: 600 }],
                        customCosts: [{ name: 'lift', amount: 400 }],
                        items: items,
                        deposit: 20000,
                    }));
                    return [4 /*yield*/, service.getOrder('u1', 'o1')];
                case 1:
                    res = _b.sent();
                    (0, globals_1.expect)(res.cost).toBe(39200); // 成本 = 固定38800 + 自定义400（卖旧门窗600 是收入不计成本）
                    // 利润 = 营收(总价58200 + 卖旧门窗600) − 成本39200 = 19600
                    (0, globals_1.expect)(res.profit).toBe(19600);
                    // 营收 = 总价 + 卖旧门窗收入 = 58200 + 600
                    (0, globals_1.expect)(res.revenue).toBe(58800);
                    (0, globals_1.expect)(res.margin).toBeCloseTo(19600 / 58800, 6);
                    // 金额 = Σ各项小计 = 900 + 1200 = 2100
                    (0, globals_1.expect)(res.amount).toBe(2100);
                    // 未收 = max(0, total − deposit − received) = 58200 − 20000 − 2000 = 36200
                    (0, globals_1.expect)(res.unpaid).toBe(36200);
                    // 派生明细汇总
                    (0, globals_1.expect)(res.fixedCost).toBe(38800);
                    (0, globals_1.expect)(res.extrasTotal).toBe(600);
                    (0, globals_1.expect)(res.customCostsTotal).toBe(400);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例2：他人订单（findFirst 因 where 含 userId 返回 null）→ 1002 NOT_FOUND', function () { return __awaiter(void 0, void 0, void 0, function () {
        var e_1, arg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    // where:{ id, userId } 命不中他人订单 → null
                    prisma.ledgerOrder.findFirst.mockResolvedValueOnce(null);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, service.getOrder('u1', 'o-other')];
                case 2:
                    _b.sent();
                    throw new Error('should have thrown');
                case 3:
                    e_1 = _b.sent();
                    (0, globals_1.expect)(e_1.getResponse().code).toBe(1002);
                    return [3 /*break*/, 4];
                case 4:
                    arg = prisma.ledgerOrder.findFirst.mock.calls[0][0];
                    (0, globals_1.expect)(arg.where.userId).toBe('u1');
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('LedgerService.listOrders（内存过滤/排序/分页/汇总）', function () {
    var prisma;
    var service;
    (0, globals_1.beforeEach)(function () {
        prisma = buildPrisma();
        service = new ledger_service_1.LedgerService(prisma);
    });
    (0, globals_1.it)('用例3：profit 区间内存过滤 + profit 降序 + 分页切片 + 汇总覆盖全集', function () { return __awaiter(void 0, void 0, void 0, function () {
        var rows, res;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    rows = [
                        orderRow({ id: 'a', total: 1000 }),
                        orderRow({ id: 'b', total: 3000 }),
                        orderRow({ id: 'c', total: 5000 }),
                    ];
                    prisma.ledgerOrder.findMany.mockResolvedValueOnce(rows);
                    return [4 /*yield*/, service.listOrders('u1', {
                            profitMin: '2000', // 过滤掉利润 1000 的那笔
                            sort: 'profit',
                            page: '2',
                            pageSize: '2',
                        })
                        // 过滤后剩 2 笔（3000/5000），降序 [5000, 3000]，pageSize=2 → 第2页只剩 0 笔
                    ];
                case 1:
                    res = _b.sent();
                    // 过滤后剩 2 笔（3000/5000），降序 [5000, 3000]，pageSize=2 → 第2页只剩 0 笔
                    (0, globals_1.expect)(res.total).toBe(2);
                    (0, globals_1.expect)(res.page).toBe(2);
                    (0, globals_1.expect)(res.list).toHaveLength(0);
                    // 汇总基于过滤后的全集（不止当前页）：profit = 3000 + 5000 = 8000
                    (0, globals_1.expect)(res.summary.count).toBe(2);
                    (0, globals_1.expect)(res.summary.profit).toBe(8000);
                    (0, globals_1.expect)(res.summary.revenue).toBe(8000);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例3b：3 笔 pageSize=2 → 第2页有 1 笔，降序后取最小利润', function () { return __awaiter(void 0, void 0, void 0, function () {
        var rows, res;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    rows = [
                        orderRow({ id: 'a', total: 1000 }),
                        orderRow({ id: 'b', total: 3000 }),
                        orderRow({ id: 'c', total: 5000 }),
                    ];
                    prisma.ledgerOrder.findMany.mockResolvedValueOnce(rows);
                    return [4 /*yield*/, service.listOrders('u1', {
                            sort: 'profit',
                            page: '2',
                            pageSize: '2',
                        })
                        // 降序 [5000,3000,1000]，第2页(slice 2..4) → 仅 1000 这一笔
                    ];
                case 1:
                    res = _b.sent();
                    // 降序 [5000,3000,1000]，第2页(slice 2..4) → 仅 1000 这一笔
                    (0, globals_1.expect)(res.total).toBe(3);
                    (0, globals_1.expect)(res.list).toHaveLength(1);
                    (0, globals_1.expect)(res.list[0].profit).toBe(1000);
                    // 汇总仍覆盖全集 3 笔
                    (0, globals_1.expect)(res.summary.count).toBe(3);
                    (0, globals_1.expect)(res.summary.profit).toBe(9000);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('回填完成后按数据库筛选、分页、聚合，列表营收口径仍为 total', function () { return __awaiter(void 0, void 0, void 0, function () {
        var oldFlag, res, query;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    oldFlag = process.env.LEDGER_FAST_READS;
                    process.env.LEDGER_FAST_READS = '1';
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, , 3, 4]);
                    prisma.ledgerOrder.count.mockResolvedValueOnce(0);
                    prisma.ledgerOrder.findMany.mockResolvedValueOnce([
                        orderRow({ total: 300, costProfile: 100, extras: [{ type: 'old-window', amount: 50 }] }),
                    ]);
                    prisma.ledgerOrder.aggregate.mockResolvedValueOnce({
                        _count: { _all: 1 },
                        _sum: { total: 300, costAmount: 100, profitAmount: 250 },
                    });
                    return [4 /*yield*/, service.listOrders('u1', {
                            profitMin: '200',
                            sort: 'profit',
                            page: '1',
                            pageSize: '20',
                        })];
                case 2:
                    res = _b.sent();
                    query = prisma.ledgerOrder.findMany.mock.calls[0][0];
                    (0, globals_1.expect)(query.where).toMatchObject({ userId: 'u1', profitAmount: { gte: 200 } });
                    (0, globals_1.expect)(query.take).toBe(20);
                    (0, globals_1.expect)(query.skip).toBe(0);
                    (0, globals_1.expect)(res.list[0].profit).toBe(250);
                    (0, globals_1.expect)(res.summary).toMatchObject({ count: 1, revenue: 300, cost: 100, profit: 250 });
                    return [3 /*break*/, 4];
                case 3:
                    if (oldFlag === undefined)
                        delete process.env.LEDGER_FAST_READS;
                    else
                        process.env.LEDGER_FAST_READS = oldFlag;
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('历史空派生字段仍回退旧路径，不漏单', function () { return __awaiter(void 0, void 0, void 0, function () {
        var oldFlag, res;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    oldFlag = process.env.LEDGER_FAST_READS;
                    process.env.LEDGER_FAST_READS = '1';
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, , 3, 4]);
                    prisma.ledgerOrder.count.mockResolvedValueOnce(1);
                    prisma.ledgerOrder.findMany.mockResolvedValueOnce([orderRow({ total: 500 })]);
                    return [4 /*yield*/, service.listOrders('u1', {})];
                case 2:
                    res = _b.sent();
                    (0, globals_1.expect)(res.total).toBe(1);
                    (0, globals_1.expect)(prisma.ledgerOrder.aggregate).not.toHaveBeenCalled();
                    return [3 /*break*/, 4];
                case 3:
                    if (oldFlag === undefined)
                        delete process.env.LEDGER_FAST_READS;
                    else
                        process.env.LEDGER_FAST_READS = oldFlag;
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('LedgerService 可配置成本统计', function () {
    var prisma;
    var service;
    (0, globals_1.beforeEach)(function () {
        prisma = buildPrisma();
        service = new ledger_service_1.LedgerService(prisma);
    });
    (0, globals_1.it)('overview 按自定义分类 id 分别聚合，不再全部归入“其他”', function () { return __awaiter(void 0, void 0, void 0, function () {
        var year, result;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    year = new Date().getFullYear();
                    prisma.ledgerOrder.findMany.mockResolvedValueOnce([
                        orderRow({
                            date: new Date("".concat(year, "-02-01T00:00:00.000Z")),
                            total: 1000,
                            customCosts: [
                                { id: 'board', color: 'c2', name: '石膏板', amount: 120 },
                                { id: 'paint', color: 'c3', name: '刮大白', amount: 80 },
                            ],
                        }),
                    ]);
                    return [4 /*yield*/, service.overview('u1', 'year')];
                case 1:
                    result = _b.sent();
                    (0, globals_1.expect)(result.costSlices).toEqual([
                        { key: 'board', name: '石膏板', color: 'c2', value: 120 },
                        { key: 'paint', name: '刮大白', color: 'c3', value: 80 },
                    ]);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('monthlySeries 同时兼容旧人工字段与新版 labor 分类，并生成各分类逐月数据', function () { return __awaiter(void 0, void 0, void 0, function () {
        var year, result, march;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    year = new Date().getFullYear();
                    prisma.ledgerOrder.findMany.mockResolvedValueOnce([
                        orderRow({
                            date: new Date("".concat(year, "-03-01T00:00:00.000Z")),
                            total: 1000,
                            costLabor: 100,
                            customCosts: [
                                { id: 'labor', color: 'c4', name: '施工人工', amount: 50 },
                                { id: 'furniture', color: 'c5', name: '家具', amount: 200 },
                            ],
                        }),
                    ]);
                    return [4 /*yield*/, service.monthlySeries('u1', year)];
                case 1:
                    result = _b.sent();
                    march = result.series[2];
                    (0, globals_1.expect)(march.labor).toBe(150);
                    (0, globals_1.expect)(march.categoryCosts).toMatchObject({ labor: 150, furniture: 200 });
                    (0, globals_1.expect)(march.otherCost).toBe(200);
                    (0, globals_1.expect)(result.yearLabor).toBe(150);
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('LedgerService.createOrder（校验 + 明细优先 + 通知）', function () {
    var prisma;
    var service;
    (0, globals_1.beforeEach)(function () {
        prisma = buildPrisma();
        service = new ledger_service_1.LedgerService(prisma);
    });
    (0, globals_1.it)('用例4a：客户名为空 → 1001 INVALID_PARAMS', function () { return __awaiter(void 0, void 0, void 0, function () {
        var e_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, service.createOrder('u1', {
                            customerName: '   ',
                            date: '2026-06-01',
                            total: 100,
                        })];
                case 1:
                    _b.sent();
                    throw new Error('should have thrown');
                case 2:
                    e_2 = _b.sent();
                    (0, globals_1.expect)(e_2.getResponse().code).toBe(1001);
                    return [3 /*break*/, 3];
                case 3:
                    (0, globals_1.expect)(prisma.ledgerOrder.create).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例4b：无明细且 total=0 → 1001（总价须 > 0）', function () { return __awaiter(void 0, void 0, void 0, function () {
        var e_3;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, service.createOrder('u1', { customerName: '张三', date: '2026-06-01', total: 0 })];
                case 1:
                    _b.sent();
                    throw new Error('should have thrown');
                case 2:
                    e_3 = _b.sent();
                    (0, globals_1.expect)(e_3.getResponse().code).toBe(1001);
                    return [3 /*break*/, 3];
                case 3:
                    (0, globals_1.expect)(prisma.ledgerOrder.create).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例4c：日期非法 → 1001', function () { return __awaiter(void 0, void 0, void 0, function () {
        var e_4;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, service.createOrder('u1', { customerName: '张三', date: 'garbage', total: 100 })];
                case 1:
                    _b.sent();
                    throw new Error('should have thrown');
                case 2:
                    e_4 = _b.sent();
                    (0, globals_1.expect)(e_4.getResponse().code).toBe(1001);
                    return [3 /*break*/, 3];
                case 3:
                    (0, globals_1.expect)(prisma.ledgerOrder.create).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例4d：有明细时落库 total = 金额−优惠（忽略 dto.total），并写一条 order 通知', function () { return __awaiter(void 0, void 0, void 0, function () {
        var items, res, createArg, notifyArg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    // 明细：500×(2㎡)=1000，优惠 200 → 落库 total = 1000 − 200 = 800（无视 dto.total=999）
                    prisma.ledgerOrder.create.mockImplementationOnce(function (args) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_b) {
                        return [2 /*return*/, orderRow(__assign({}, args.data))];
                    }); }); });
                    items = [
                        {
                            name: '平开窗',
                            unitPrice: 500,
                            baseArea: 0,
                            qty: 0,
                            sizes: [{ w: 1000, h: 2000, note: '' }],
                        },
                    ];
                    return [4 /*yield*/, service.createOrder('u1', {
                            customerName: '张三',
                            date: '2026-06-01',
                            total: 999, // 应被明细覆盖
                            discount: 200,
                            items: items,
                        })];
                case 1:
                    res = _b.sent();
                    createArg = prisma.ledgerOrder.create.mock.calls[0][0];
                    (0, globals_1.expect)(createArg.data.total).toBe(800);
                    (0, globals_1.expect)(createArg.data).toMatchObject({
                        revenueAmount: 800n,
                        costAmount: 0n,
                        profitAmount: 800n,
                    });
                    (0, globals_1.expect)(res.total).toBe(800);
                    // 录单成功 → 写入一条 order 类型通知
                    (0, globals_1.expect)(prisma.ledgerNotification.create).toHaveBeenCalledTimes(1);
                    notifyArg = prisma.ledgerNotification.create.mock.calls[0][0];
                    (0, globals_1.expect)(notifyArg.data.type).toBe('order');
                    (0, globals_1.expect)(notifyArg.data.userId).toBe('u1');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例5：customerId 不属于本账号 → customerId 落库为 null，但保留 customerName（快录兜底）', function () { return __awaiter(void 0, void 0, void 0, function () {
        var createArg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    // resolveCustomer 内 findFirst(where:{id,userId}) 命不中 → 忽略 id 保名字
                    prisma.ledgerCustomer.findFirst.mockResolvedValueOnce(null);
                    prisma.ledgerOrder.create.mockImplementationOnce(function (args) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_b) {
                        return [2 /*return*/, orderRow(__assign({}, args.data))];
                    }); }); });
                    return [4 /*yield*/, service.createOrder('u1', {
                            customerId: 'not-mine',
                            customerName: '李四',
                            date: '2026-06-01',
                            total: 500,
                        })];
                case 1:
                    _b.sent();
                    createArg = prisma.ledgerOrder.create.mock.calls[0][0];
                    (0, globals_1.expect)(createArg.data.customerId).toBeNull();
                    (0, globals_1.expect)(createArg.data.customerName).toBe('李四');
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('LedgerService.updateOrder（明细驱动 total 重算）', function () {
    var prisma;
    var service;
    (0, globals_1.beforeEach)(function () {
        prisma = buildPrisma();
        service = new ledger_service_1.LedgerService(prisma);
    });
    (0, globals_1.it)('用例6a：传入新明细 + 优惠 → update.data.total 由新明细重算', function () { return __awaiter(void 0, void 0, void 0, function () {
        var items, updateArg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.ledgerOrder.findFirst.mockResolvedValueOnce(orderRow({ items: [], discount: 0 }));
                    prisma.ledgerOrder.update.mockImplementationOnce(function (args) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_b) {
                        return [2 /*return*/, orderRow(__assign({}, args.data))];
                    }); }); });
                    items = [
                        {
                            name: '推拉门',
                            unitPrice: 300,
                            baseArea: 0,
                            qty: 0,
                            sizes: [{ w: 2000, h: 2000, note: '' }],
                        },
                    ];
                    // 小计 round(4㎡*300)=1200，优惠 100 → total = 1100
                    return [4 /*yield*/, service.updateOrder('u1', 'o1', { items: items, discount: 100, total: 99999 })];
                case 1:
                    // 小计 round(4㎡*300)=1200，优惠 100 → total = 1100
                    _b.sent();
                    updateArg = prisma.ledgerOrder.update.mock.calls[0][0];
                    (0, globals_1.expect)(updateArg.data.total).toBe(1100);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例6b：仅传优惠（exist.items 非空）→ 仍用 exist.items 重算 total', function () { return __awaiter(void 0, void 0, void 0, function () {
        var existItems, updateArg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    existItems = [
                        {
                            name: '平开窗',
                            unitPrice: 500,
                            baseArea: 0,
                            qty: 0,
                            sizes: [{ w: 2000, h: 2000, note: '' }],
                        },
                    ];
                    // 既有明细小计 round(4㎡*500)=2000
                    prisma.ledgerOrder.findFirst.mockResolvedValueOnce(orderRow({ items: existItems, discount: 0 }));
                    prisma.ledgerOrder.update.mockImplementationOnce(function (args) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_b) {
                        return [2 /*return*/, orderRow(__assign(__assign({}, args.data), { items: existItems }))];
                    }); }); });
                    // 只改优惠 300，不传 items → total = 2000 − 300 = 1700（用 exist.items）
                    return [4 /*yield*/, service.updateOrder('u1', 'o1', { discount: 300 })];
                case 1:
                    // 只改优惠 300，不传 items → total = 2000 − 300 = 1700（用 exist.items）
                    _b.sent();
                    updateArg = prisma.ledgerOrder.update.mock.calls[0][0];
                    (0, globals_1.expect)(updateArg.data.total).toBe(1700);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('修改成本时按原公式同步双写派生金额，卖旧窗收入不算成本', function () { return __awaiter(void 0, void 0, void 0, function () {
        var data;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.ledgerOrder.findFirst.mockResolvedValueOnce(orderRow({
                        total: 500,
                        extras: [{ type: 'old-window', amount: 100 }],
                        customCosts: [{ name: '运费', amount: 50 }],
                        costProfile: 20,
                    }));
                    prisma.ledgerOrder.update.mockImplementationOnce(function (args) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_b) {
                        return [2 /*return*/, orderRow(__assign({}, args.data))];
                    }); }); });
                    return [4 /*yield*/, service.updateOrder('u1', 'o1', { costGlass: 30 })];
                case 1:
                    _b.sent();
                    data = prisma.ledgerOrder.update.mock.calls[0][0].data;
                    (0, globals_1.expect)(data).toMatchObject({ revenueAmount: 600n, costAmount: 100n, profitAmount: 500n });
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('LedgerService.pushNotification（偏好开关过滤）', function () {
    var prisma;
    var service;
    // 设置行工厂：默认全部与 schema @default 一致，按需覆写
    function settingRow(over) {
        if (over === void 0) { over = {}; }
        return __assign({ notifyOrder: true, notifyReport: true, notifyGoal: true, notifySystem: false, dndEnabled: false, dndStart: '22:00', dndEnd: '08:00' }, over);
    }
    (0, globals_1.beforeEach)(function () {
        prisma = buildPrisma();
        service = new ledger_service_1.LedgerService(prisma);
    });
    (0, globals_1.it)('用例8a：notifyOrder 关闭 → order 通知被抑制（不写库）', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.ledgerSetting.findUnique.mockResolvedValueOnce(settingRow({ notifyOrder: false }));
                    return [4 /*yield*/, service.pushNotification('u1', 'order', '订单已保存', 'x')];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(prisma.ledgerNotification.create).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例8b：notifyOrder 开启 → order 通知正常写库', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.ledgerSetting.findUnique.mockResolvedValueOnce(settingRow({ notifyOrder: true }));
                    return [4 /*yield*/, service.pushNotification('u1', 'order', '订单已保存', 'x')];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(prisma.ledgerNotification.create).toHaveBeenCalledTimes(1);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例8c：无设置行 → 按默认值（goal 默认开 → 写库；system 默认关 → 抑制）', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: 
                // buildPrisma 默认 findUnique → null（无设置行）
                return [4 /*yield*/, service.pushNotification('u1', 'goal', '目标达成', 'x')];
                case 1:
                    // buildPrisma 默认 findUnique → null（无设置行）
                    _b.sent();
                    (0, globals_1.expect)(prisma.ledgerNotification.create).toHaveBeenCalledTimes(1);
                    return [4 /*yield*/, service.pushNotification('u1', 'system', '系统通知', 'x')];
                case 2:
                    _b.sent();
                    (0, globals_1.expect)(prisma.ledgerNotification.create).toHaveBeenCalledTimes(1); // 未新增
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例8d：member 类型走 notifySystem 开关', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.ledgerSetting.findUnique.mockResolvedValueOnce(settingRow({ notifySystem: true }));
                    return [4 /*yield*/, service.pushNotification('u1', 'member', '邀请奖励到账', 'x')];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(prisma.ledgerNotification.create).toHaveBeenCalledTimes(1);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例8e：写库/查偏好抛错均不外抛（fire-and-forget 语义不变）', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.ledgerSetting.findUnique.mockRejectedValueOnce(new Error('db down'));
                    return [4 /*yield*/, (0, globals_1.expect)(service.pushNotification('u1', 'order', 't', 'b')).resolves.toBeUndefined()];
                case 1:
                    _b.sent();
                    prisma.ledgerNotification.create.mockRejectedValueOnce(new Error('db down'));
                    return [4 /*yield*/, (0, globals_1.expect)(service.pushNotification('u1', 'goal', 't', 'b')).resolves.toBeUndefined()];
                case 2:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('LedgerService 客户改名/删除（订单冗余名同步与解绑）', function () {
    var prisma;
    var service;
    (0, globals_1.beforeEach)(function () {
        prisma = buildPrisma();
        service = new ledger_service_1.LedgerService(prisma);
    });
    (0, globals_1.it)('用例7a：客户改名 → ledgerOrder.updateMany 同步历史订单 customerName', function () { return __awaiter(void 0, void 0, void 0, function () {
        var arg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.ledgerCustomer.findFirst.mockResolvedValueOnce({ id: 'c1', name: '老名' });
                    prisma.ledgerCustomer.update.mockResolvedValueOnce({ id: 'c1', name: '新名' });
                    return [4 /*yield*/, service.updateCustomer('u1', 'c1', { name: '新名' })];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(prisma.ledgerOrder.updateMany).toHaveBeenCalledTimes(1);
                    arg = prisma.ledgerOrder.updateMany.mock.calls[0][0];
                    (0, globals_1.expect)(arg.where.userId).toBe('u1');
                    (0, globals_1.expect)(arg.where.customerId).toBe('c1');
                    (0, globals_1.expect)(arg.data.customerName).toBe('新名');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例7b：删除客户 → 先 updateMany 解绑 customerId，再 delete', function () { return __awaiter(void 0, void 0, void 0, function () {
        var order, unbindArg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.ledgerCustomer.findFirst.mockResolvedValueOnce({ id: 'c1', name: '张三' });
                    order = [];
                    prisma.ledgerOrder.updateMany.mockImplementationOnce(function () {
                        var _a = [];
                        for (var _i = 0; _i < arguments.length; _i++) {
                            _a[_i] = arguments[_i];
                        }
                        return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_b) {
                                order.push('updateMany');
                                return [2 /*return*/, { count: 1 }];
                            });
                        });
                    });
                    prisma.ledgerCustomer.delete.mockImplementationOnce(function () {
                        var _a = [];
                        for (var _i = 0; _i < arguments.length; _i++) {
                            _a[_i] = arguments[_i];
                        }
                        return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_b) {
                                order.push('delete');
                                return [2 /*return*/, {}];
                            });
                        });
                    });
                    return [4 /*yield*/, service.deleteCustomer('u1', 'c1')
                        // 先解绑（customerId=null）再删档，避免外键约束失败
                    ];
                case 1:
                    _b.sent();
                    // 先解绑（customerId=null）再删档，避免外键约束失败
                    (0, globals_1.expect)(order).toEqual(['updateMany', 'delete']);
                    unbindArg = prisma.ledgerOrder.updateMany.mock.calls[0][0];
                    (0, globals_1.expect)(unbindArg.where.customerId).toBe('c1');
                    (0, globals_1.expect)(unbindArg.data.customerId).toBeNull();
                    return [2 /*return*/];
            }
        });
    }); });
});
