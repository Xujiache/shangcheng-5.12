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
    customAlphabet: function () { return function () { return 'PLAZATEST'; }; },
}); });
var merchant_service_1 = require("../src/modules/merchant/merchant.service");
(0, globals_1.describe)('MerchantService.plazaProducts 选品筛选', function () {
    (0, globals_1.it)('把标签、关键词和内部商户隔离同时下推到分页查询与总数统计', function () { return __awaiter(void 0, void 0, void 0, function () {
        var findMany, count, prisma, service, result, expectedWhere;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    findMany = globals_1.jest.fn().mockResolvedValue([]);
                    count = globals_1.jest.fn().mockResolvedValue(0);
                    prisma = {
                        systemConfig: {
                            findUnique: globals_1.jest.fn().mockResolvedValue({ value: ['internal-merchant'] }),
                        },
                        product: { findMany: findMany, count: count },
                    };
                    service = new merchant_service_1.MerchantService(prisma, {}, {});
                    return [4 /*yield*/, service.plazaProducts('current-merchant', {
                            keyword: '系统门窗',
                            tags: '厂家直供',
                            page: 2,
                            pageSize: 20,
                        })];
                case 1:
                    result = _a.sent();
                    expectedWhere = {
                        status: 'active',
                        merchantId: { notIn: ['current-merchant', 'internal-merchant'] },
                        name: { contains: '系统门窗', mode: 'insensitive' },
                        tags: { has: '厂家直供' },
                    };
                    (0, globals_1.expect)(findMany).toHaveBeenCalledWith(globals_1.expect.objectContaining({ where: expectedWhere, skip: 20, take: 20 }));
                    (0, globals_1.expect)(count).toHaveBeenCalledWith({ where: expectedWhere });
                    (0, globals_1.expect)(result).toEqual({ list: [], total: 0, page: 2, pageSize: 20, hasMore: false });
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('MerchantService 代理商品按单品变更', function () {
    var application = {
        id: 'application-1',
        merchantId: 'merchant-1',
        factoryMerchantId: 'factory-1',
        productIds: ['product-1', 'product-2'],
        markupPercent: 30,
        autoSyncPrice: true,
        message: 'test',
        status: 'approved',
    };
    (0, globals_1.it)('调整一件商品的售价时拆分申请，不影响同批其它商品', function () { return __awaiter(void 0, void 0, void 0, function () {
        var update, create, prisma, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    update = globals_1.jest.fn().mockResolvedValue({});
                    create = globals_1.jest.fn().mockResolvedValue({ id: 'application-2' });
                    prisma = {
                        agencyApplication: {
                            findFirst: globals_1.jest.fn().mockResolvedValue(application),
                        },
                        $transaction: globals_1.jest.fn().mockImplementation(function (work) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, work({ agencyApplication: { update: update, create: create } })];
                        }); }); }),
                    };
                    service = new merchant_service_1.MerchantService(prisma, {}, {});
                    return [4 /*yield*/, (0, globals_1.expect)(service.updateAgencyApplication('merchant-1', 'application-1:product-1', {
                            markupRatio: 45,
                        })).resolves.toEqual({ ok: true, id: 'application-2:product-1' })];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(update).toHaveBeenCalledWith({
                        where: { id: 'application-1' },
                        data: { productIds: ['product-2'] },
                    });
                    (0, globals_1.expect)(create).toHaveBeenCalledWith({
                        data: globals_1.expect.objectContaining({
                            merchantId: 'merchant-1',
                            productIds: ['product-1'],
                            markupPercent: 45,
                            status: 'approved',
                        }),
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('撤销一件商品时只从申请中移除目标商品', function () { return __awaiter(void 0, void 0, void 0, function () {
        var update, remove, prisma, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    update = globals_1.jest.fn().mockResolvedValue({});
                    remove = globals_1.jest.fn().mockResolvedValue({});
                    prisma = {
                        agencyApplication: {
                            findFirst: globals_1.jest.fn().mockResolvedValue(application),
                            update: update,
                            delete: remove,
                        },
                    };
                    service = new merchant_service_1.MerchantService(prisma, {}, {});
                    return [4 /*yield*/, (0, globals_1.expect)(service.cancelAgencyApplication('merchant-1', 'application-1:product-1')).resolves.toEqual({ ok: true })];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(update).toHaveBeenCalledWith({
                        where: { id: 'application-1' },
                        data: { productIds: ['product-2'] },
                    });
                    (0, globals_1.expect)(remove).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('拒绝不属于申请的复合商品 id', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = {
                        agencyApplication: {
                            findFirst: globals_1.jest.fn().mockResolvedValue(application),
                        },
                    };
                    service = new merchant_service_1.MerchantService(prisma, {}, {});
                    return [4 /*yield*/, (0, globals_1.expect)(service.cancelAgencyApplication('merchant-1', 'application-1:other-product')).rejects.toMatchObject({ message: '代理商品不存在' })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
