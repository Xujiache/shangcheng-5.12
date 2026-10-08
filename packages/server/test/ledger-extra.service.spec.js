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
globals_1.jest.mock('nanoid', function () { return ({ customAlphabet: function () { return function () { return 'TESTCODE'; }; } }); });
var ledger_extra_service_1 = require("../src/modules/ledger/ledger-extra.service");
(0, globals_1.describe)('LedgerExtraService.importData', function () {
    (0, globals_1.it)('批量导入时保留长客户名归属并按 250 条写订单', function () { return __awaiter(void 0, void 0, void 0, function () {
        var customerWrites, orderWrites, prisma, service, longName, samePrefix, token, result, longCustomerIds;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    customerWrites = [];
                    orderWrites = [];
                    prisma = {
                        ledgerCustomer: {
                            findMany: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, []];
                            }); }); }),
                            createMany: globals_1.jest.fn(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                                var data = _b.data;
                                return __generator(this, function (_c) {
                                    customerWrites.push.apply(customerWrites, data);
                                    return [2 /*return*/, { count: data.length }];
                                });
                            }); }),
                        },
                        ledgerOrder: {
                            createMany: globals_1.jest.fn(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                                var data = _b.data;
                                return __generator(this, function (_c) {
                                    orderWrites.push(data);
                                    return [2 /*return*/, { count: data.length }];
                                });
                            }); }),
                        },
                    };
                    service = new ledger_extra_service_1.LedgerExtraService(prisma);
                    longName = 'A'.repeat(41) + '1';
                    samePrefix = 'A'.repeat(41) + '2';
                    token = service.encrypt({
                        v: 1,
                        owner: 'u1',
                        allowShare: false,
                        data: {
                            customers: [{ name: longName }, { name: samePrefix }, { name: '短客户' }],
                            orders: Array.from({ length: 251 }, function (_, index) { return ({
                                customerName: index % 2 ? samePrefix : longName,
                                date: '2026-09-01',
                                total: 1000,
                            }); }),
                        },
                    });
                    return [4 /*yield*/, service.importData('u1', token)];
                case 1:
                    result = _a.sent();
                    (0, globals_1.expect)(result).toEqual({ ok: true, customers: 2, orders: 251 });
                    (0, globals_1.expect)(customerWrites).toHaveLength(2);
                    (0, globals_1.expect)(customerWrites.map(function (row) { return row.name; })).toEqual(['A'.repeat(40), '短客户']);
                    (0, globals_1.expect)(orderWrites).toHaveLength(2);
                    (0, globals_1.expect)(orderWrites[0]).toHaveLength(250);
                    (0, globals_1.expect)(orderWrites[1]).toHaveLength(1);
                    longCustomerIds = new Set(orderWrites.flat().map(function (row) { return row.customerId; }).filter(Boolean));
                    (0, globals_1.expect)(longCustomerIds.size).toBe(1);
                    return [2 /*return*/];
            }
        });
    }); });
});
