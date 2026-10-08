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
var tool_events_service_1 = require("../src/modules/ledger/tool-events.service");
var event = function (id) { return ({ id: id, tool: 'rmb', status: 'success', occurredAt: new Date().toISOString() }); };
describe('Ledger tool events', function () {
    var events = new Map();
    var prisma = {
        ledgerToolEvent: {
            createMany: jest.fn(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                var count, _i, data_1, item;
                var data = _b.data;
                return __generator(this, function (_c) {
                    count = 0;
                    for (_i = 0, data_1 = data; _i < data_1.length; _i++) {
                        item = data_1[_i];
                        if (!events.has(item.id)) {
                            events.set(item.id, item);
                            count++;
                        }
                    }
                    return [2 /*return*/, { count: count }];
                });
            }); }),
            groupBy: jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, []];
            }); }); }),
            count: jest.fn(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                var where = _b.where;
                return __generator(this, function (_c) {
                    return [2 /*return*/, __spreadArray([], events.values(), true).filter(function (item) { return item.userId === where.userId; }).length];
                });
            }); }),
            findMany: jest.fn(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                var where = _b.where;
                return __generator(this, function (_c) {
                    return [2 /*return*/, __spreadArray([], events.values(), true).filter(function (item) { return item.userId === where.userId; })];
                });
            }); }),
        },
        ledgerUser: { findUnique: jest.fn(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                var where = _b.where;
                return __generator(this, function (_c) {
                    return [2 /*return*/, ({ id: where.id })];
                });
            }); }) },
        $transaction: jest.fn(function (calls) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, Promise.all(calls)];
        }); }); }),
    };
    var service = new tool_events_service_1.ToolEventsService(prisma);
    beforeEach(function () { events.clear(); jest.clearAllMocks(); });
    it('deduplicates UUIDs and attributes events to the authenticated account', function () { return __awaiter(void 0, void 0, void 0, function () {
        var id, _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    id = '123e4567-e89b-42d3-a456-426614174000';
                    _a = expect;
                    return [4 /*yield*/, service.submit('alice', { events: [event(id)] })];
                case 1:
                    _a.apply(void 0, [_d.sent()]).toEqual({ accepted: 1, inserted: 1 });
                    _b = expect;
                    return [4 /*yield*/, service.submit('alice', { events: [event(id)] })];
                case 2:
                    _b.apply(void 0, [_d.sent()]).toEqual({ accepted: 1, inserted: 0 });
                    expect(events.get(id).userId).toBe('alice');
                    _c = expect;
                    return [4 /*yield*/, service.timeline('bob', {})];
                case 3:
                    _c.apply(void 0, [_d.sent()]).toMatchObject({ total: 0, items: [] });
                    return [2 /*return*/];
            }
        });
    }); });
    it('rejects payload data and client forged server results', function () { return __awaiter(void 0, void 0, void 0, function () {
        var id;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    id = '123e4567-e89b-42d3-a456-426614174000';
                    return [4 /*yield*/, expect(service.submit('alice', { events: [__assign(__assign({}, event(id)), { amount: 123 })] })).rejects.toThrow()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, expect(service.submit('alice', { events: [__assign(__assign({}, event(id)), { tool: 'glass' })] })).rejects.toThrow()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, expect(service.submit('alice', { events: [__assign(__assign({}, event(id)), { tool: 'glass-weight' })] })).rejects.toThrow()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, expect(service.submit('alice', { events: [event(id), event(id)] })).rejects.toThrow()];
                case 4:
                    _a.sent();
                    expect(events.size).toBe(0);
                    return [2 /*return*/];
            }
        });
    }); });
    it('uses deterministic server IDs for terminal conversion events', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, service.recordServerEvent('alice', 'format', 'success', 'job-1')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, service.recordServerEvent('alice', 'format', 'success', 'job-1')];
                case 2:
                    _a.sent();
                    expect(events.size).toBe(1);
                    expect(__spreadArray([], events.values(), true)[0]).toMatchObject({ userId: 'alice', tool: 'format', status: 'success' });
                    return [2 /*return*/];
            }
        });
    }); });
});
