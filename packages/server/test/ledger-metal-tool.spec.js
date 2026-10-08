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
globals_1.jest.mock('nanoid', function () { return ({ customAlphabet: function () { return function () { return 'test-id'; }; } }); });
var metal_tool_controller_1 = require("../src/modules/ledger/metal-tool.controller");
var metal_config_1 = require("../src/modules/ledger/metal.config");
var ledger_admin_service_1 = require("../src/modules/ledger/ledger-admin.service");
var metal_quote_service_1 = require("../src/modules/ledger/metal-quote.service");
var metal_calc_1 = require("../src/modules/ledger/metal.calc");
var ledger_membership_guard_1 = require("../src/modules/ledger/guards/ledger-membership.guard");
(0, globals_1.describe)('金属计算器配置', function () {
    (0, globals_1.it)('65 个材料有完整的离线/服务端默认值', function () {
        var config = (0, metal_config_1.normalizeMetalConfig)(null);
        (0, globals_1.expect)(metal_config_1.METAL_MATERIALS).toHaveLength(65);
        (0, globals_1.expect)(Object.keys(config.prices)).toHaveLength(65);
        (0, globals_1.expect)(config.prices['plate.carbon.hot']).toBe(3306);
        (0, globals_1.expect)(config.densities['plate.ss.316']).toBe(7.98);
        (0, globals_1.expect)(config.defaults).toEqual({ quoteFactor: 1, processingFeeFen: 0 });
    });
    (0, globals_1.it)('脏数据、未知 id、越界值收口，缺字段回落默认', function () {
        var config = (0, metal_config_1.normalizeMetalConfig)({
            prices: { 'plate.carbon.hot': 20000000, 'unknown.id': 9, 'plate.cu.t2': null },
            densities: { 'plate.ss.316': -1, 'unknown.id': 99 },
            priceMode: { 'plate.carbon.hot': 'nonsense' },
            defaults: { quoteFactor: 999, processingFeeFen: -2 },
            updatedAt: 'invalid',
        });
        (0, globals_1.expect)(config.prices['plate.carbon.hot']).toBe(10000000);
        (0, globals_1.expect)(config.prices['plate.cu.t2']).toBe(114730);
        (0, globals_1.expect)(config.densities['plate.ss.316']).toBe(0.01);
        (0, globals_1.expect)(config.priceMode['plate.carbon.hot']).toBe('live');
        (0, globals_1.expect)(config.defaults).toEqual({ quoteFactor: 100, processingFeeFen: 0 });
        (0, globals_1.expect)(config.updatedAt).toBe('');
        (0, globals_1.expect)(config.prices).not.toHaveProperty('unknown.id');
        var oversized = Object.fromEntries(Array.from({ length: 201 }, function (_, index) { return ["unknown-".concat(index), 1]; }));
        oversized['plate.carbon.hot'] = 1;
        (0, globals_1.expect)((0, metal_config_1.normalizeMetalConfig)({ prices: oversized }).prices['plate.carbon.hot']).toBe(3306);
    });
    (0, globals_1.it)('GET config 免用户鉴权且按 metal 行返回', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, result, guards;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = { ledgerConfig: { findUnique: globals_1.jest.fn(function () {
                                var _args = [];
                                for (var _i = 0; _i < arguments.length; _i++) {
                                    _args[_i] = arguments[_i];
                                }
                                return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                    return [2 /*return*/, ({ value: { prices: { 'plate.carbon.hot': 3510 } } })];
                                }); });
                            }) } };
                    return [4 /*yield*/, new metal_tool_controller_1.MetalToolController(prisma, {}).config()];
                case 1:
                    result = _a.sent();
                    (0, globals_1.expect)(prisma.ledgerConfig.findUnique).toHaveBeenCalledWith({ where: { key: 'metal' } });
                    (0, globals_1.expect)(result.prices['plate.carbon.hot']).toBe(3510);
                    (0, globals_1.expect)(result.materials).toHaveLength(65);
                    guards = Reflect.getMetadata('__guards__', metal_tool_controller_1.MetalToolController);
                    (0, globals_1.expect)(guards).toBeUndefined();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('平台更新只写 metal 行，不改 global 配置', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = { ledgerConfig: {
                            findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, null];
                            }); }); }),
                            upsert: globals_1.jest.fn(function (args) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, args];
                            }); }); }),
                        } };
                    return [4 /*yield*/, new ledger_admin_service_1.LedgerAdminService(prisma).updateConfig({ metal: { prices: { 'plate.carbon.hot': 3456 } } })];
                case 1:
                    result = _a.sent();
                    (0, globals_1.expect)(prisma.ledgerConfig.upsert).toHaveBeenCalledTimes(1);
                    (0, globals_1.expect)(prisma.ledgerConfig.upsert).toHaveBeenCalledWith(globals_1.expect.objectContaining({ where: { key: 'metal' } }));
                    (0, globals_1.expect)(result.metal.prices['plate.carbon.hot']).toBe(3456);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('报价金额用服务端吨价重算，不信任前端金额', function () {
        var item = (0, metal_calc_1.calculateMetalQuoteItem)({
            materialId: 'section.carbon.angle', category: 'section',
            spec: { model: '50*5', thicknessMm: 5, lengthM: 10 },
            density: 7.85, quoteFactor: 1.2, processingFeeFen: 2000,
            tonPriceFen: 1, amountFen: 1,
        }, (0, metal_config_1.normalizeMetalConfig)({ prices: { 'section.carbon.angle': 4000 } }));
        (0, globals_1.expect)(item.weightKg).toBe(37.7);
        (0, globals_1.expect)(item.tonPriceFen).toBe(400000);
        (0, globals_1.expect)(item.amountFen).toBe(20096);
    });
    (0, globals_1.it)('报价单保存和查询按账号隔离', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = {
                        ledgerConfig: { findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, null];
                            }); }); }) },
                        ledgerMetalQuote: {
                            create: globals_1.jest.fn(function (args) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, args.data];
                            }); }); }),
                            findMany: globals_1.jest.fn(function () {
                                var _args = [];
                                for (var _i = 0; _i < arguments.length; _i++) {
                                    _args[_i] = arguments[_i];
                                }
                                return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                    return [2 /*return*/, []];
                                }); });
                            }),
                            deleteMany: globals_1.jest.fn(function () {
                                var _args = [];
                                for (var _i = 0; _i < arguments.length; _i++) {
                                    _args[_i] = arguments[_i];
                                }
                                return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                    return [2 /*return*/, ({ count: 0 })];
                                }); });
                            }),
                        },
                    };
                    service = new metal_quote_service_1.MetalQuoteService(prisma);
                    return [4 /*yield*/, service.create('account-a', {
                            title: '样品', items: [{
                                    materialId: 'plate.carbon.hot', category: 'plate',
                                    spec: { lengthMm: 1000, widthMm: 2000, thicknessMm: 5, quantity: 1 },
                                    density: 7.85, quoteFactor: 1, processingFeeFen: 0,
                                }],
                        })];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(prisma.ledgerMetalQuote.create).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                        data: globals_1.expect.objectContaining({ userId: 'account-a', totalWeightKg: 78.5 }),
                    }));
                    return [4 /*yield*/, service.list('account-a', 0, 50)];
                case 2:
                    _a.sent();
                    (0, globals_1.expect)(prisma.ledgerMetalQuote.findMany).toHaveBeenCalledWith(globals_1.expect.objectContaining({ where: { userId: 'account-a' } }));
                    return [4 /*yield*/, (0, globals_1.expect)(service.remove('account-a', 'other-quote')).rejects.toThrow()];
                case 3:
                    _a.sent();
                    (0, globals_1.expect)(prisma.ledgerMetalQuote.deleteMany).toHaveBeenCalledWith({ where: { id: 'other-quote', userId: 'account-a' } });
                    return [4 /*yield*/, (0, globals_1.expect)(service.create('account-a', {
                            title: '大单', items: Array.from({ length: 200 }, function () { return ({
                                materialId: 'plate.carbon.hot', category: 'plate',
                                spec: { model: '甲'.repeat(80), lengthMm: 1000, widthMm: 2000, thicknessMm: 5, quantity: 1 },
                                density: 7.85, quoteFactor: 1, processingFeeFen: 0,
                            }); }),
                        })).rejects.toThrow('报价单超过 20KB')];
                case 4:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('会员到期后报价单只读，写入仍返回 6001', function () {
        var guard = new ledger_membership_guard_1.LedgerMembershipGuard();
        var context = function (method, path) { return ({
            switchToHttp: function () { return ({ getRequest: function () { return ({
                    method: method,
                    originalUrl: path, ledgerUser: { membership: { active: false, expired: true } },
                }); } }); },
        }); };
        (0, globals_1.expect)(guard.canActivate(context('GET', '/api/v1/l/tools/metal/quotes'))).toBe(true);
        (0, globals_1.expect)(function () { return guard.canActivate(context('POST', '/api/v1/l/tools/metal/quote')); })
            .toThrow(globals_1.expect.objectContaining({ response: globals_1.expect.objectContaining({ code: 6001 }) }));
    });
});
