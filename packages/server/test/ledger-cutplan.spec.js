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
// ── prisma 替身：仅含本批用例消费到的 ledgerCutPlan 方法 ──
function buildPrisma() {
    var _this = this;
    return {
        ledgerCutPlan: {
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
    };
}
// 方案行工厂：填齐 mapCutPlan 所需列，调用方按需覆写。
function planRow(over) {
    if (over === void 0) { over = {}; }
    return __assign({ id: 'p1', userId: 'u1', title: '阳台推拉门', material: 'glass', input: { sheetW: 2440, sheetH: 1220, kerf: 5, pieces: [{ w: 600, h: 800, qty: 4 }] }, summary: { material: 'glass', count: 4, util: 0.78, units: '块' }, updatedAt: new Date('2026-06-13T00:00:00.000Z') }, over);
}
(0, globals_1.describe)('LedgerService.listCutPlans（按 userId 隔离 + 倒序 + 上限）', function () {
    var prisma;
    var service;
    (0, globals_1.beforeEach)(function () {
        prisma = buildPrisma();
        service = new ledger_service_1.LedgerService(prisma);
    });
    (0, globals_1.it)('用例1：列表强制 where.userId、updatedAt 倒序、take 100，且映射为契约形态', function () { return __awaiter(void 0, void 0, void 0, function () {
        var res, arg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.ledgerCutPlan.findMany.mockResolvedValueOnce([
                        planRow({ id: 'p2', title: '型材清单', material: 'profile' }),
                        planRow({ id: 'p1' }),
                    ]);
                    return [4 /*yield*/, service.listCutPlans('u1')];
                case 1:
                    res = _b.sent();
                    arg = prisma.ledgerCutPlan.findMany.mock.calls[0][0];
                    (0, globals_1.expect)(arg.where.userId).toBe('u1');
                    (0, globals_1.expect)(arg.orderBy).toEqual({ updatedAt: 'desc' });
                    (0, globals_1.expect)(arg.take).toBe(100);
                    (0, globals_1.expect)(res).toHaveLength(2);
                    (0, globals_1.expect)(res[0]).toEqual({
                        id: 'p2',
                        title: '型材清单',
                        material: 'profile',
                        input: planRow().input,
                        summary: planRow().summary,
                        updatedAt: '2026-06-13T00:00:00.000Z',
                    });
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('LedgerService.createCutPlan（校验 + 落库 + 体积上限）', function () {
    var prisma;
    var service;
    (0, globals_1.beforeEach)(function () {
        prisma = buildPrisma();
        service = new ledger_service_1.LedgerService(prisma);
    });
    (0, globals_1.it)('用例2：happy path → 带 userId 落库并返回契约形态', function () { return __awaiter(void 0, void 0, void 0, function () {
        var res, createArg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.ledgerCutPlan.create.mockImplementationOnce(function (args) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_b) {
                        return [2 /*return*/, planRow(__assign({}, args.data))];
                    }); }); });
                    return [4 /*yield*/, service.createCutPlan('u1', {
                            title: '  阳台推拉门  ', // 落库前 trim
                            material: 'glass',
                            input: { sheetW: 2440, sheetH: 1220, kerf: 5, pieces: [{ w: 600, h: 800, qty: 4 }] },
                            summary: { material: 'glass', count: 4, util: 0.78, units: '块' },
                        })];
                case 1:
                    res = _b.sent();
                    createArg = prisma.ledgerCutPlan.create.mock.calls[0][0];
                    (0, globals_1.expect)(createArg.data.userId).toBe('u1');
                    (0, globals_1.expect)(createArg.data.title).toBe('阳台推拉门');
                    (0, globals_1.expect)(createArg.data.material).toBe('glass');
                    (0, globals_1.expect)(res.title).toBe('阳台推拉门');
                    (0, globals_1.expect)(res.material).toBe('glass');
                    (0, globals_1.expect)(typeof res.updatedAt).toBe('string');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例3：标题去空白后为空 → 1001 且不落库', function () { return __awaiter(void 0, void 0, void 0, function () {
        var e_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, service.createCutPlan('u1', {
                            title: '   ',
                            material: 'board',
                            input: {},
                            summary: {},
                        })];
                case 1:
                    _b.sent();
                    throw new Error('should have thrown');
                case 2:
                    e_1 = _b.sent();
                    (0, globals_1.expect)(e_1.getResponse().code).toBe(1001);
                    return [3 /*break*/, 3];
                case 3:
                    (0, globals_1.expect)(prisma.ledgerCutPlan.create).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例4：input 序列化 > 20KB → 1001（体积上限）且不落库', function () { return __awaiter(void 0, void 0, void 0, function () {
        var pieces, e_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    pieces = Array.from({ length: 1200 }, function (_, i) { return ({ w: 600, h: 800, qty: i }); });
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, service.createCutPlan('u1', {
                            title: '超大方案',
                            material: 'glass',
                            input: { sheetW: 2440, sheetH: 1220, kerf: 5, pieces: pieces },
                            summary: {},
                        })];
                case 2:
                    _b.sent();
                    throw new Error('should have thrown');
                case 3:
                    e_2 = _b.sent();
                    (0, globals_1.expect)(e_2.getResponse().code).toBe(1001);
                    return [3 /*break*/, 4];
                case 4:
                    (0, globals_1.expect)(prisma.ledgerCutPlan.create).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('LedgerService.updateCutPlan（归属隔离 + 字段增量）', function () {
    var prisma;
    var service;
    (0, globals_1.beforeEach)(function () {
        prisma = buildPrisma();
        service = new ledger_service_1.LedgerService(prisma);
    });
    (0, globals_1.it)('用例5：happy path → 仅更新传入字段（title 去空白、material/input 透传）', function () { return __awaiter(void 0, void 0, void 0, function () {
        var findArg, updateArg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.ledgerCutPlan.findFirst.mockResolvedValueOnce(planRow());
                    prisma.ledgerCutPlan.update.mockImplementationOnce(function (args) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_b) {
                        return [2 /*return*/, planRow(__assign({}, args.data))];
                    }); }); });
                    return [4 /*yield*/, service.updateCutPlan('u1', 'p1', {
                            title: ' 新名 ',
                            input: { sheetW: 3000, sheetH: 2000, kerf: 4, pieces: [] },
                        })
                        // 命中查询带 userId 隔离
                    ];
                case 1:
                    _b.sent();
                    findArg = prisma.ledgerCutPlan.findFirst.mock.calls[0][0];
                    (0, globals_1.expect)(findArg.where).toEqual({ id: 'p1', userId: 'u1' });
                    updateArg = prisma.ledgerCutPlan.update.mock.calls[0][0];
                    (0, globals_1.expect)(updateArg.where).toEqual({ id: 'p1', userId: 'u1' });
                    (0, globals_1.expect)(updateArg.data.title).toBe('新名');
                    (0, globals_1.expect)(updateArg.data.input).toEqual({ sheetW: 3000, sheetH: 2000, kerf: 4, pieces: [] });
                    // 未传字段不出现在 data 中
                    (0, globals_1.expect)('material' in updateArg.data).toBe(false);
                    (0, globals_1.expect)('summary' in updateArg.data).toBe(false);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例6：他人方案（findFirst 因 where 含 userId 返回 null）→ 1002 NOT_FOUND，且不 update', function () { return __awaiter(void 0, void 0, void 0, function () {
        var e_3, arg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.ledgerCutPlan.findFirst.mockResolvedValueOnce(null);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, service.updateCutPlan('u1', 'p-other', { title: '改名' })];
                case 2:
                    _b.sent();
                    throw new Error('should have thrown');
                case 3:
                    e_3 = _b.sent();
                    (0, globals_1.expect)(e_3.getResponse().code).toBe(1002);
                    return [3 /*break*/, 4];
                case 4:
                    arg = prisma.ledgerCutPlan.findFirst.mock.calls[0][0];
                    (0, globals_1.expect)(arg.where.userId).toBe('u1');
                    (0, globals_1.expect)(prisma.ledgerCutPlan.update).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例7：传入超大 summary → 1001 且不 update', function () { return __awaiter(void 0, void 0, void 0, function () {
        var big, e_4;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.ledgerCutPlan.findFirst.mockResolvedValueOnce(planRow());
                    big = { blob: 'x'.repeat(20001) };
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, service.updateCutPlan('u1', 'p1', { summary: big })];
                case 2:
                    _b.sent();
                    throw new Error('should have thrown');
                case 3:
                    e_4 = _b.sent();
                    (0, globals_1.expect)(e_4.getResponse().code).toBe(1001);
                    return [3 /*break*/, 4];
                case 4:
                    (0, globals_1.expect)(prisma.ledgerCutPlan.update).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('LedgerService.deleteCutPlan（归属隔离）', function () {
    var prisma;
    var service;
    (0, globals_1.beforeEach)(function () {
        prisma = buildPrisma();
        service = new ledger_service_1.LedgerService(prisma);
    });
    (0, globals_1.it)('用例8：happy path → 命中后删除并返回 {ok:true}', function () { return __awaiter(void 0, void 0, void 0, function () {
        var res, delArg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.ledgerCutPlan.findFirst.mockResolvedValueOnce(planRow());
                    return [4 /*yield*/, service.deleteCutPlan('u1', 'p1')];
                case 1:
                    res = _b.sent();
                    (0, globals_1.expect)(res).toEqual({ ok: true });
                    delArg = prisma.ledgerCutPlan.delete.mock.calls[0][0];
                    (0, globals_1.expect)(delArg.where).toEqual({ id: 'p1', userId: 'u1' });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例9：他人方案 → 1002 NOT_FOUND，且不 delete', function () { return __awaiter(void 0, void 0, void 0, function () {
        var e_5, arg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.ledgerCutPlan.findFirst.mockResolvedValueOnce(null);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, service.deleteCutPlan('u1', 'p-other')];
                case 2:
                    _b.sent();
                    throw new Error('should have thrown');
                case 3:
                    e_5 = _b.sent();
                    (0, globals_1.expect)(e_5.getResponse().code).toBe(1002);
                    return [3 /*break*/, 4];
                case 4:
                    arg = prisma.ledgerCutPlan.findFirst.mock.calls[0][0];
                    (0, globals_1.expect)(arg.where.userId).toBe('u1');
                    (0, globals_1.expect)(prisma.ledgerCutPlan.delete).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
});
