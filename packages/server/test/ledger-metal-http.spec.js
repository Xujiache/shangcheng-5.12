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
var globals_1 = require("@jest/globals");
globals_1.jest.mock('nanoid', function () { return ({ customAlphabet: function () { return function () { return 'test-id'; }; } }); });
var common_1 = require("@nestjs/common");
var core_1 = require("@nestjs/core");
var testing_1 = require("@nestjs/testing");
var jwt_1 = require("@nestjs/jwt");
var throttler_1 = require("@nestjs/throttler");
var jwt_guard_1 = require("../src/common/guards/jwt.guard");
var response_interceptor_1 = require("../src/common/interceptors/response.interceptor");
var global_exception_filter_1 = require("../src/common/filters/global-exception.filter");
var prisma_service_1 = require("../src/prisma/prisma.service");
var metal_tool_controller_1 = require("../src/modules/ledger/metal-tool.controller");
var metal_quote_service_1 = require("../src/modules/ledger/metal-quote.service");
var ledger_jwt_guard_1 = require("../src/modules/ledger/guards/ledger-jwt.guard");
var ledger_membership_guard_1 = require("../src/modules/ledger/guards/ledger-membership.guard");
(0, globals_1.describe)('金属工具真实 HTTP 鉴权与限流', function () {
    var app;
    var base;
    var quotes = [];
    var call = function (path_1) {
        var args_1 = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args_1[_i - 1] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([path_1], args_1, true), void 0, function (path, token, method, body) {
            var response;
            var _a;
            if (token === void 0) { token = ''; }
            if (method === void 0) { method = 'GET'; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, fetch(base + path, __assign({ method: method, headers: __assign({ 'Content-Type': 'application/json' }, (token ? { Authorization: 'Bearer ' + token } : {})) }, (body ? { body: JSON.stringify(body) } : {})))];
                    case 1:
                        response = _b.sent();
                        _a = { status: response.status };
                        return [4 /*yield*/, response.json()];
                    case 2: return [2 /*return*/, (_a.body = (_b.sent()), _a)];
                }
            });
        });
    };
    var input = {
        title: '六类材料样品', items: [{
                materialId: 'plate.carbon.hot', category: 'plate',
                spec: { lengthMm: 1000, widthMm: 2000, thicknessMm: 5, quantity: 1 },
                density: 7.85, quoteFactor: 1, processingFeeFen: 0,
                amountFen: 1, tonPriceFen: 1,
            }],
    };
    (0, globals_1.beforeAll)(function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, module;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = {
                        ledgerConfig: { findUnique: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, null];
                            }); }); } },
                        ledgerUser: { findUnique: function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                                var where = _b.where;
                                return __generator(this, function (_c) {
                                    return [2 /*return*/, ({
                                            id: where.id, nickname: '测试', status: 'active',
                                            membership: { expiresAt: new Date(where.id === 'expired' ? '2000-01-01' : '2099-01-01') },
                                        })];
                                });
                            }); } },
                        ledgerMetalQuote: {
                            create: function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                                var quote;
                                var data = _b.data;
                                return __generator(this, function (_c) {
                                    quote = __assign(__assign({}, data), { id: 'quote-' + quotes.length, createdAt: new Date().toISOString() });
                                    quotes.push(quote);
                                    return [2 /*return*/, quote];
                                });
                            }); },
                            findMany: function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                                var where = _b.where, skip = _b.skip, take = _b.take;
                                return __generator(this, function (_c) {
                                    return [2 /*return*/, quotes.filter(function (row) { return row.userId === where.userId; }).slice(skip, skip + take)];
                                });
                            }); },
                            findFirst: function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                                var where = _b.where;
                                return __generator(this, function (_c) {
                                    return [2 /*return*/, quotes.find(function (row) { return row.id === where.id && row.userId === where.userId; }) || null];
                                });
                            }); },
                            deleteMany: function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                                var count;
                                var where = _b.where;
                                return __generator(this, function (_c) {
                                    count = quotes.filter(function (row) { return row.id === where.id && row.userId === where.userId; }).length;
                                    quotes = quotes.filter(function (row) { return row.id !== where.id || row.userId !== where.userId; });
                                    return [2 /*return*/, { count: count }];
                                });
                            }); },
                        },
                    };
                    return [4 /*yield*/, testing_1.Test.createTestingModule({
                            imports: [throttler_1.ThrottlerModule.forRoot([{ name: 'default', limit: 100, ttl: 60000 }])],
                            controllers: [metal_tool_controller_1.MetalToolController],
                            providers: [
                                metal_quote_service_1.MetalQuoteService, ledger_jwt_guard_1.LedgerJwtGuard, ledger_membership_guard_1.LedgerMembershipGuard,
                                { provide: prisma_service_1.PrismaService, useValue: prisma },
                                { provide: jwt_1.JwtService, useValue: { verifyAsync: function (token) { return __awaiter(void 0, void 0, void 0, function () {
                                            return __generator(this, function (_a) {
                                                return [2 /*return*/, ({
                                                        sub: token, scope: token === 'mall' ? 'mall' : 'ledger',
                                                    })];
                                            });
                                        }); } } },
                                { provide: core_1.APP_GUARD, useClass: jwt_guard_1.JwtAuthGuard },
                                { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
                            ],
                        }).compile()];
                case 1:
                    module = _a.sent();
                    app = module.createNestApplication();
                    app.setGlobalPrefix('api/v1');
                    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
                    app.useGlobalInterceptors(new response_interceptor_1.ResponseInterceptor(app.get(core_1.Reflector)));
                    app.useGlobalFilters(new global_exception_filter_1.GlobalExceptionFilter());
                    return [4 /*yield*/, app.listen(0, '127.0.0.1')];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, app.getUrl()];
                case 3:
                    base = (_a.sent()) + '/api/v1/l/tools/metal/';
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.afterAll)(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (app === null || app === void 0 ? void 0 : app.close())];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    }); }); });
    (0, globals_1.it)('游客读配置；未登录、商城 token 和无会员写操作被拒绝', function () { return __awaiter(void 0, void 0, void 0, function () {
        var config, guestWrite, _a, expired;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, call('config')];
                case 1:
                    config = _b.sent();
                    (0, globals_1.expect)(config.status).toBe(200);
                    (0, globals_1.expect)(config.body.code).toBe(0);
                    (0, globals_1.expect)(config.body.data.materials).toHaveLength(65);
                    return [4 /*yield*/, call('quote', '', 'POST', input)];
                case 2:
                    guestWrite = _b.sent();
                    (0, globals_1.expect)(guestWrite.status).toBe(200);
                    (0, globals_1.expect)(guestWrite.body.code).toBe(2001);
                    _a = globals_1.expect;
                    return [4 /*yield*/, call('quote', 'mall', 'POST', input)];
                case 3:
                    _a.apply(void 0, [(_b.sent()).body.code]).toBe(2001);
                    return [4 /*yield*/, call('quote', 'expired', 'POST', input)];
                case 4:
                    expired = _b.sent();
                    (0, globals_1.expect)(expired.status).toBe(200);
                    (0, globals_1.expect)(expired.body.code).toBe(6001);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('会员保存重算，账号隔离，到期仍可读自己的数据，导出与删除被拦截', function () { return __awaiter(void 0, void 0, void 0, function () {
        var saved, id, _a, _b, _c, _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0: return [4 /*yield*/, call('quote', 'member', 'POST', input)];
                case 1:
                    saved = _h.sent();
                    (0, globals_1.expect)(saved.status).toBe(200);
                    (0, globals_1.expect)(saved.body.data.totalWeightKg).toBe(78.5);
                    (0, globals_1.expect)(saved.body.data.totalAmountFen).toBe(25952);
                    (0, globals_1.expect)(saved.body.data.items[0].tonPriceFen).toBe(330600);
                    id = saved.body.data.id;
                    _a = globals_1.expect;
                    return [4 /*yield*/, call('quotes', 'other')];
                case 2:
                    _a.apply(void 0, [(_h.sent()).body.data]).toEqual([]);
                    quotes.push(__assign(__assign({}, saved.body.data), { id: 'expired-history', userId: 'expired' }));
                    _b = globals_1.expect;
                    return [4 /*yield*/, call('quotes', 'expired')];
                case 3:
                    _b.apply(void 0, [(_h.sent()).body.data]).toHaveLength(1);
                    _c = globals_1.expect;
                    return [4 /*yield*/, call('quotes/expired-history/export', 'expired', 'POST')];
                case 4:
                    _c.apply(void 0, [(_h.sent()).body.code]).toBe(6001);
                    _d = globals_1.expect;
                    return [4 /*yield*/, call('quotes/expired-history', 'expired', 'DELETE')];
                case 5:
                    _d.apply(void 0, [(_h.sent()).body.code]).toBe(6001);
                    _e = globals_1.expect;
                    return [4 /*yield*/, call('quotes/' + id + '/export', 'member', 'POST')];
                case 6:
                    _e.apply(void 0, [(_h.sent()).body.data.id]).toBe(id);
                    _f = globals_1.expect;
                    return [4 /*yield*/, call('quotes/' + id + '/export', 'other', 'POST')];
                case 7:
                    _f.apply(void 0, [(_h.sent()).body.code]).toBe(1002);
                    _g = globals_1.expect;
                    return [4 /*yield*/, call('quotes/' + id, 'other', 'DELETE')];
                case 8:
                    _g.apply(void 0, [(_h.sent()).body.code]).toBe(1002);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('每页最多 50，嵌套非法输入拒绝，配置第 61 次触发单桶限流', function () { return __awaiter(void 0, void 0, void 0, function () {
        var invalidQuery, invalidItem, index, _a, limited;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, call('quotes?take=51', 'member')];
                case 1:
                    invalidQuery = _b.sent();
                    (0, globals_1.expect)(invalidQuery.status).toBe(200);
                    (0, globals_1.expect)(invalidQuery.body.code).toBe(1001);
                    return [4 /*yield*/, call('quote', 'member', 'POST', __assign(__assign({}, input), { items: [__assign(__assign({}, input.items[0]), { density: -1 })] }))];
                case 2:
                    invalidItem = _b.sent();
                    (0, globals_1.expect)(invalidItem.status).toBe(200);
                    (0, globals_1.expect)(invalidItem.body.code).toBe(1001);
                    index = 0;
                    _b.label = 3;
                case 3:
                    if (!(index < 59)) return [3 /*break*/, 6];
                    _a = globals_1.expect;
                    return [4 /*yield*/, call('config')];
                case 4:
                    _a.apply(void 0, [(_b.sent()).status]).toBe(200);
                    _b.label = 5;
                case 5:
                    index++;
                    return [3 /*break*/, 3];
                case 6: return [4 /*yield*/, call('config')];
                case 7:
                    limited = _b.sent();
                    (0, globals_1.expect)(limited.status).toBe(200);
                    (0, globals_1.expect)(limited.body.code).toBe(429);
                    (0, globals_1.expect)(limited.body).toEqual(globals_1.expect.objectContaining({ data: null, message: globals_1.expect.any(String), msg: globals_1.expect.any(String), traceId: globals_1.expect.any(String), timestamp: globals_1.expect.any(Number) }));
                    return [2 /*return*/];
            }
        });
    }); });
});
