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
var strict_1 = require("node:assert/strict");
var node_perf_hooks_1 = require("node:perf_hooks");
var client_1 = require("@prisma/client");
var ledger_service_1 = require("../src/modules/ledger/ledger.service");
var url = new URL(process.env.DATABASE_URL || 'postgresql://invalid/invalid');
if (!['127.0.0.1', 'localhost'].includes(url.hostname) ||
    url.pathname !== '/ledger_verify' ||
    process.env.LEDGER_VERIFY_DATASET !== '1')
    throw new Error('Only isolated local ledger_verify with LEDGER_VERIFY_DATASET=1 is allowed');
var prisma = new client_1.PrismaClient();
var service = new ledger_service_1.LedgerService(prisma);
var legacyStats = new ledger_service_1.LedgerService({
    ledgerOrder: {
        findMany: function (args) {
            return prisma.ledgerOrder.findMany(__assign(__assign({}, args), { where: { userId: args.where.userId } }));
        },
    },
    ledgerSetting: prisma.ledgerSetting,
    ledgerGoal: prisma.ledgerGoal,
});
var accounts = [
    { id: 'ledger-verify-1k', size: 1000 },
    { id: 'ledger-verify-10k', size: 10000 },
];
function seed() {
    return __awaiter(this, void 0, void 0, function () {
        var _loop_1, _i, accounts_1, account;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _loop_1 = function (account) {
                        var _loop_2, start;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0: return [4 /*yield*/, prisma.ledgerUser.upsert({
                                        where: { id: account.id },
                                        create: { id: account.id, nickname: account.id },
                                        update: {},
                                    })];
                                case 1:
                                    _b.sent();
                                    return [4 /*yield*/, prisma.ledgerOrder.deleteMany({ where: { userId: account.id } })];
                                case 2:
                                    _b.sent();
                                    _loop_2 = function (start) {
                                        var rows;
                                        return __generator(this, function (_c) {
                                            switch (_c.label) {
                                                case 0:
                                                    rows = Array.from({ length: Math.min(500, account.size - start) }, function (_, i) {
                                                        var n = start + i;
                                                        return {
                                                            id: "".concat(account.id, "-order-").concat(String(n).padStart(5, '0')),
                                                            userId: account.id,
                                                            customerName: "\u5BA2\u6237".concat(n % 20),
                                                            date: new Date(Date.UTC(2000, 0, 1 + n)),
                                                            total: 1000 + (n % 1999),
                                                            costProfile: n % 500,
                                                            costGlass: n % 200,
                                                            extras: [{ type: 'old', amount: n % 75 }],
                                                            customCosts: [{ name: '其他', amount: n % 33 }],
                                                        };
                                                    });
                                                    return [4 /*yield*/, prisma.ledgerOrder.createMany({ data: rows })];
                                                case 1:
                                                    _c.sent();
                                                    return [2 /*return*/];
                                            }
                                        });
                                    };
                                    start = 0;
                                    _b.label = 3;
                                case 3:
                                    if (!(start < account.size)) return [3 /*break*/, 6];
                                    return [5 /*yield**/, _loop_2(start)];
                                case 4:
                                    _b.sent();
                                    _b.label = 5;
                                case 5:
                                    start += 500;
                                    return [3 /*break*/, 3];
                                case 6:
                                    console.log("seeded ".concat(account.id, ": ").concat(account.size, " orders"));
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, accounts_1 = accounts;
                    _a.label = 1;
                case 1:
                    if (!(_i < accounts_1.length)) return [3 /*break*/, 4];
                    account = accounts_1[_i];
                    return [5 /*yield**/, _loop_1(account)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function compare() {
    return __awaiter(this, void 0, void 0, function () {
        var _i, accounts_2, account, missing, queries, _a, queries_1, query, oldStart, oldResult, oldMs, fastStart, fastResult, fastMs, oldCustomers, fastCustomers, userId, _b, _c, period, fastOverview, legacyOverview, _d, _e, year, fastMonthly, legacyMonthly, _f, _g, unit, fastSeries, legacySeries;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    _i = 0, accounts_2 = accounts;
                    _h.label = 1;
                case 1:
                    if (!(_i < accounts_2.length)) return [3 /*break*/, 11];
                    account = accounts_2[_i];
                    return [4 /*yield*/, prisma.ledgerOrder.count({
                            where: { userId: account.id, profitAmount: null },
                        })];
                case 2:
                    missing = _h.sent();
                    strict_1.default.equal(missing, 0, "backfill not complete for ".concat(account.id));
                    queries = [
                        { page: '1', pageSize: '20' },
                        { page: '2', pageSize: '20', sort: 'profit' },
                        { page: '9', pageSize: '20', profitMin: '1250', profitMax: '2000' },
                        { page: '1', pageSize: '20', customer: '客户7' },
                        { page: '1', pageSize: '20', dateFrom: '2020-01-01', dateTo: '2024-12-31' },
                    ];
                    _a = 0, queries_1 = queries;
                    _h.label = 3;
                case 3:
                    if (!(_a < queries_1.length)) return [3 /*break*/, 7];
                    query = queries_1[_a];
                    process.env.LEDGER_FAST_READS = '0';
                    oldStart = node_perf_hooks_1.performance.now();
                    return [4 /*yield*/, service.listOrders(account.id, query)];
                case 4:
                    oldResult = _h.sent();
                    oldMs = node_perf_hooks_1.performance.now() - oldStart;
                    process.env.LEDGER_FAST_READS = '1';
                    fastStart = node_perf_hooks_1.performance.now();
                    return [4 /*yield*/, service.listOrders(account.id, query)];
                case 5:
                    fastResult = _h.sent();
                    fastMs = node_perf_hooks_1.performance.now() - fastStart;
                    strict_1.default.deepEqual(fastResult, oldResult, "".concat(account.id, " ").concat(JSON.stringify(query)));
                    console.log("".concat(account.id, " ").concat(JSON.stringify(query), " old=").concat(oldMs.toFixed(1), "ms fast=").concat(fastMs.toFixed(1), "ms"));
                    _h.label = 6;
                case 6:
                    _a++;
                    return [3 /*break*/, 3];
                case 7:
                    process.env.LEDGER_FAST_READS = '0';
                    return [4 /*yield*/, service.listCustomers(account.id)];
                case 8:
                    oldCustomers = _h.sent();
                    process.env.LEDGER_FAST_READS = '1';
                    return [4 /*yield*/, service.listCustomers(account.id)];
                case 9:
                    fastCustomers = _h.sent();
                    strict_1.default.deepEqual(fastCustomers.sort(function (a, b) { return a.name.localeCompare(b.name); }), oldCustomers.sort(function (a, b) { return a.name.localeCompare(b.name); }), "".concat(account.id, " customer summary"));
                    console.log("".concat(account.id, " customers equivalent"));
                    _h.label = 10;
                case 10:
                    _i++;
                    return [3 /*break*/, 1];
                case 11:
                    userId = 'ledger-verify-10k';
                    _b = 0, _c = ['month', 'quarter', 'year'];
                    _h.label = 12;
                case 12:
                    if (!(_b < _c.length)) return [3 /*break*/, 16];
                    period = _c[_b];
                    process.env.LEDGER_FAST_READS = '1';
                    return [4 /*yield*/, service.overview(userId, period)];
                case 13:
                    fastOverview = _h.sent();
                    process.env.LEDGER_FAST_READS = '0';
                    return [4 /*yield*/, legacyStats.overview(userId, period)];
                case 14:
                    legacyOverview = _h.sent();
                    strict_1.default.deepEqual(fastOverview, legacyOverview);
                    _h.label = 15;
                case 15:
                    _b++;
                    return [3 /*break*/, 12];
                case 16:
                    _d = 0, _e = [2025, 2026];
                    _h.label = 17;
                case 17:
                    if (!(_d < _e.length)) return [3 /*break*/, 21];
                    year = _e[_d];
                    process.env.LEDGER_FAST_READS = '1';
                    return [4 /*yield*/, service.monthlySeries(userId, year)];
                case 18:
                    fastMonthly = _h.sent();
                    process.env.LEDGER_FAST_READS = '0';
                    return [4 /*yield*/, legacyStats.monthlySeries(userId, year)];
                case 19:
                    legacyMonthly = _h.sent();
                    strict_1.default.deepEqual(fastMonthly, legacyMonthly);
                    _h.label = 20;
                case 20:
                    _d++;
                    return [3 /*break*/, 17];
                case 21:
                    _f = 0, _g = ['day', 'month', 'year'];
                    _h.label = 22;
                case 22:
                    if (!(_f < _g.length)) return [3 /*break*/, 26];
                    unit = _g[_f];
                    process.env.LEDGER_FAST_READS = '1';
                    return [4 /*yield*/, service.series(userId, unit)];
                case 23:
                    fastSeries = _h.sent();
                    process.env.LEDGER_FAST_READS = '0';
                    return [4 /*yield*/, legacyStats.series(userId, unit)];
                case 24:
                    legacySeries = _h.sent();
                    strict_1.default.deepEqual(fastSeries, legacySeries);
                    _h.label = 25;
                case 25:
                    _f++;
                    return [3 /*break*/, 22];
                case 26:
                    console.log('10k orders: overview/monthlySeries/series equivalent');
                    return [2 /*return*/];
            }
        });
    });
}
function bench() {
    return __awaiter(this, void 0, void 0, function () {
        var userId, _a, _b, query, samples, i, _i, _c, mode, start, p95, oldP95, fastP95, statsSamples, i, _d, _e, mode, start, statsOldP95, statsFastP95;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    userId = 'ledger-verify-10k';
                    _b = (_a = strict_1.default).equal;
                    return [4 /*yield*/, prisma.ledgerOrder.count({ where: { userId: userId } })];
                case 1:
                    _b.apply(_a, [_f.sent(), 10000]);
                    query = { page: '1', pageSize: '20' };
                    samples = { old: [], fast: [] };
                    i = -2;
                    _f.label = 2;
                case 2:
                    if (!(i < 30)) return [3 /*break*/, 7];
                    _i = 0, _c = ['old', 'fast'];
                    _f.label = 3;
                case 3:
                    if (!(_i < _c.length)) return [3 /*break*/, 6];
                    mode = _c[_i];
                    process.env.LEDGER_FAST_READS = mode === 'fast' ? '1' : '0';
                    start = node_perf_hooks_1.performance.now();
                    return [4 /*yield*/, service.listOrders(userId, query)];
                case 4:
                    _f.sent();
                    if (i >= 0)
                        samples[mode].push(node_perf_hooks_1.performance.now() - start);
                    _f.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6:
                    i++;
                    return [3 /*break*/, 2];
                case 7:
                    p95 = function (values) {
                        var sorted = __spreadArray([], values, true).sort(function (a, b) { return a - b; });
                        return sorted[Math.ceil(sorted.length * 0.95) - 1];
                    };
                    oldP95 = p95(samples.old);
                    fastP95 = p95(samples.fast);
                    console.log("local synthetic 10k orders p95 old=".concat(oldP95.toFixed(1), "ms fast=").concat(fastP95.toFixed(1), "ms reduction=").concat((100 * (1 - fastP95 / oldP95)).toFixed(1), "%"));
                    statsSamples = { old: [], fast: [] };
                    i = -2;
                    _f.label = 8;
                case 8:
                    if (!(i < 30)) return [3 /*break*/, 16];
                    _d = 0, _e = ['old', 'fast'];
                    _f.label = 9;
                case 9:
                    if (!(_d < _e.length)) return [3 /*break*/, 15];
                    mode = _e[_d];
                    start = node_perf_hooks_1.performance.now();
                    if (!(mode === 'old')) return [3 /*break*/, 11];
                    return [4 /*yield*/, legacyStats.overview(userId, 'month')];
                case 10:
                    _f.sent();
                    return [3 /*break*/, 13];
                case 11: return [4 /*yield*/, service.overview(userId, 'month')];
                case 12:
                    _f.sent();
                    _f.label = 13;
                case 13:
                    if (i >= 0)
                        statsSamples[mode].push(node_perf_hooks_1.performance.now() - start);
                    _f.label = 14;
                case 14:
                    _d++;
                    return [3 /*break*/, 9];
                case 15:
                    i++;
                    return [3 /*break*/, 8];
                case 16:
                    statsOldP95 = p95(statsSamples.old);
                    statsFastP95 = p95(statsSamples.fast);
                    console.log("local synthetic 10k overview p95 old=".concat(statsOldP95.toFixed(1), "ms fast=").concat(statsFastP95.toFixed(1), "ms reduction=").concat((100 * (1 - statsFastP95 / statsOldP95)).toFixed(1), "%"));
                    return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, , 8, 10]);
                    if (!process.argv.includes('--seed')) return [3 /*break*/, 2];
                    return [4 /*yield*/, seed()];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 2:
                    if (!process.argv.includes('--compare')) return [3 /*break*/, 4];
                    return [4 /*yield*/, compare()];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 4:
                    if (!process.argv.includes('--bench')) return [3 /*break*/, 6];
                    return [4 /*yield*/, bench()];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 6: throw new Error('pass --seed, --compare or --bench');
                case 7: return [3 /*break*/, 10];
                case 8:
                    delete process.env.LEDGER_FAST_READS;
                    return [4 /*yield*/, prisma.$disconnect()];
                case 9:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 10: return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    console.error(error);
    process.exitCode = 1;
});
