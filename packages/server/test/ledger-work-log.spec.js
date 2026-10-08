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
globals_1.jest.mock('nanoid', function () { return ({ customAlphabet: function () { return function () { return 'ABCDEFGH'; }; } }); });
var ledger_service_1 = require("../src/modules/ledger/ledger.service");
var now = new Date('2026-06-15T08:00:00.000Z');
function buildService() {
    var _this = this;
    var rows = [];
    var prisma = {
        ledgerWorkLog: {
            findMany: globals_1.jest.fn(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                var where = _b.where;
                return __generator(this, function (_c) {
                    return [2 /*return*/, rows.filter(function (row) {
                            return row.userId === where.userId &&
                                row.workDate >= where.workDate.gte &&
                                row.workDate < where.workDate.lt;
                        })];
                });
            }); }),
            create: globals_1.jest.fn(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                var row;
                var data = _b.data;
                return __generator(this, function (_c) {
                    row = __assign({ id: "w".concat(rows.length + 1), createdAt: now, updatedAt: now }, data);
                    rows.push(row);
                    return [2 /*return*/, row];
                });
            }); }),
            findFirst: globals_1.jest.fn(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                var where = _b.where;
                return __generator(this, function (_c) {
                    return [2 /*return*/, rows.find(function (row) { return row.id === where.id && row.userId === where.userId; }) || null];
                });
            }); }),
            update: globals_1.jest.fn(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                var row;
                var where = _b.where, data = _b.data;
                return __generator(this, function (_c) {
                    row = rows.find(function (item) { return item.id === where.id; });
                    Object.assign(row, data, { updatedAt: now });
                    return [2 /*return*/, row];
                });
            }); }),
            deleteMany: globals_1.jest.fn(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
                var index;
                var where = _b.where;
                return __generator(this, function (_c) {
                    index = rows.findIndex(function (row) { return row.id === where.id && row.userId === where.userId; });
                    if (index < 0)
                        return [2 /*return*/, { count: 0 }];
                    rows.splice(index, 1);
                    return [2 /*return*/, { count: 1 }];
                });
            }); }),
        },
    };
    return { service: new ledger_service_1.LedgerService(prisma), prisma: prisma, rows: rows };
}
(0, globals_1.describe)('LedgerService work logs', function () {
    (0, globals_1.it)('recalculates amount on create and aggregates the requested month only', function () { return __awaiter(void 0, void 0, void 0, function () {
        var service, created, out;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    service = buildService().service;
                    return [4 /*yield*/, service.createWorkLog('u1', {
                            workDate: '2026-06-10',
                            workerName: '张工',
                            jobType: '安装',
                            unit: 'day',
                            quantity: 1.25,
                            unitPrice: 320,
                            note: '阳台',
                        })];
                case 1:
                    created = _a.sent();
                    (0, globals_1.expect)(created.amount).toBe(400);
                    return [4 /*yield*/, service.listWorkLogs('u1', { month: '2026-06' })];
                case 2:
                    out = _a.sent();
                    (0, globals_1.expect)(out.summary).toEqual({ totalAmount: 400, dayQuantity: 1.25, hourQuantity: 0, count: 1 });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('rejects cross-account updates and recalculates an edited amount', function () { return __awaiter(void 0, void 0, void 0, function () {
        var service, created, updated;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    service = buildService().service;
                    return [4 /*yield*/, service.createWorkLog('u1', {
                            workDate: '2026-06-10',
                            workerName: '李工',
                            unit: 'hour',
                            quantity: 8,
                            unitPrice: 35,
                        })];
                case 1:
                    created = _a.sent();
                    return [4 /*yield*/, (0, globals_1.expect)(service.updateWorkLog('u2', created.id, { unitPrice: 99 })).rejects.toThrow('记工记录不存在')];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, service.updateWorkLog('u1', created.id, { quantity: 7.5, unitPrice: 40 })];
                case 3:
                    updated = _a.sent();
                    (0, globals_1.expect)(updated.amount).toBe(300);
                    return [2 /*return*/];
            }
        });
    }); });
});
