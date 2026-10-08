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
globals_1.jest.mock('nanoid', function () { return ({
    customAlphabet: function (alphabet, size) { return function () { return alphabet.slice(0, size); }; },
}); });
var ledger_service_1 = require("../src/modules/ledger/ledger.service");
function orderRow(date) {
    return {
        id: 'o1',
        customerId: null,
        customerName: '张三',
        date: date,
        total: 1000,
        costProfile: 100,
        costGlass: 0,
        costHardware: 0,
        costLabor: 0,
        costScreen: 0,
        extras: [],
        customCosts: [],
        items: [],
        discount: 0,
        recycle: 0,
        deposit: 0,
        received: 0,
        note: null,
        revenueAmount: 1000n,
        costAmount: 100n,
        profitAmount: 900n,
    };
}
(0, globals_1.afterEach)(function () {
    delete process.env.LEDGER_FAST_READS;
});
(0, globals_1.describe)('LedgerService performance paths', function () {
    (0, globals_1.it)('overview and series use the database bucket totals after backfill', function () { return __awaiter(void 0, void 0, void 0, function () {
        var now, month, row, grouped, prisma, service, overview, series;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    process.env.LEDGER_FAST_READS = '1';
                    now = new Date();
                    month = now.getMonth();
                    row = orderRow(new Date(now.getFullYear(), month, 2));
                    grouped = Array.from({ length: 12 }, function (_, index) { return ({
                        index: index,
                        count: index === month ? '1' : '0',
                        revenue: index === month ? '1000' : '0',
                        cost: index === month ? '100' : '0',
                        profit: index === month ? '900' : '0',
                    }); });
                    prisma = {
                        ledgerOrder: {
                            count: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, 0];
                            }); }); }),
                            findMany: globals_1.jest.fn(function (args) { return __awaiter(void 0, void 0, void 0, function () { var _a; return __generator(this, function (_b) {
                                return [2 /*return*/, (((_a = args.select) === null || _a === void 0 ? void 0 : _a.extras) ? [row] : [])];
                            }); }); }),
                        },
                        ledgerSetting: { findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ costCategories: [] })];
                            }); }); }) },
                        ledgerGoal: { findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ monthly: 1000, yearly: 10000 })];
                            }); }); }) },
                        $queryRaw: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, grouped];
                        }); }); }),
                    };
                    service = new ledger_service_1.LedgerService(prisma);
                    return [4 /*yield*/, service.overview('u1', 'month')];
                case 1:
                    overview = _a.sent();
                    (0, globals_1.expect)(overview).toMatchObject({ count: 1, revenue: 1000, cost: 100, profit: 900 });
                    (0, globals_1.expect)(overview.monthProfit).toBe(900);
                    (0, globals_1.expect)(overview.trend[month]).toMatchObject({ count: 1, revenue: 1000, profit: 900 });
                    return [4 /*yield*/, service.series('u1', 'month')];
                case 2:
                    series = _a.sent();
                    (0, globals_1.expect)(series.summary).toMatchObject({ count: 1, revenue: 1000, cost: 100, profit: 900 });
                    (0, globals_1.expect)(prisma.$queryRaw).toHaveBeenCalledTimes(2);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('concurrent fast-read checks share one readiness query', function () { return __awaiter(void 0, void 0, void 0, function () {
        var release, gate, count, prisma, service, first, second;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    process.env.LEDGER_FAST_READS = '1';
                    gate = new Promise(function (resolve) {
                        release = resolve;
                    });
                    count = globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, gate];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/, 0];
                            }
                        });
                    }); });
                    prisma = {
                        ledgerOrder: {
                            count: count,
                            findMany: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, []];
                            }); }); }),
                            aggregate: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ _count: { _all: 0 }, _sum: {} })];
                            }); }); }),
                            groupBy: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, []];
                            }); }); }),
                        },
                        ledgerCustomer: { findMany: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, []];
                            }); }); }) },
                    };
                    service = new ledger_service_1.LedgerService(prisma);
                    first = service.listOrders('u1', {});
                    second = service.listCustomers('u1');
                    return [4 /*yield*/, Promise.resolve()];
                case 1:
                    _a.sent();
                    release();
                    return [4 /*yield*/, Promise.all([first, second])];
                case 2:
                    _a.sent();
                    (0, globals_1.expect)(count).toHaveBeenCalledTimes(1);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('fast order and customer reads use one repeatable-read snapshot', function () { return __awaiter(void 0, void 0, void 0, function () {
        var transaction, prisma, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    process.env.LEDGER_FAST_READS = '1';
                    transaction = globals_1.jest.fn(function (calls, _options) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, Promise.all(calls)];
                    }); }); });
                    prisma = {
                        ledgerOrder: {
                            count: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, 0];
                            }); }); }),
                            findMany: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, []];
                            }); }); }),
                            aggregate: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ _count: { _all: 0 }, _sum: {} })];
                            }); }); }),
                            groupBy: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, []];
                            }); }); }),
                        },
                        ledgerCustomer: { findMany: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, []];
                            }); }); }) },
                        $transaction: transaction,
                    };
                    service = new ledger_service_1.LedgerService(prisma);
                    return [4 /*yield*/, service.listOrders('u1', { page: '1', pageSize: '20' })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, service.listCustomers('u1')];
                case 2:
                    _a.sent();
                    (0, globals_1.expect)(transaction).toHaveBeenCalledTimes(2);
                    (0, globals_1.expect)(transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'RepeatableRead' });
                    (0, globals_1.expect)(transaction.mock.calls[1][1]).toEqual({ isolationLevel: 'RepeatableRead' });
                    return [2 /*return*/];
            }
        });
    }); });
});
