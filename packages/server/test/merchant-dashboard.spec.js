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
    customAlphabet: function () { return function () { return 'DASHBOARDTEST'; }; },
}); });
var merchant_service_1 = require("../src/modules/merchant/merchant.service");
function makePrisma(previousAmount) {
    if (previousAmount === void 0) { previousAmount = 100; }
    var orderAggregate = globals_1.jest
        .fn()
        .mockResolvedValueOnce({ _count: { _all: 2 }, _sum: { payAmount: 300 } })
        .mockResolvedValueOnce({
        _count: { _all: previousAmount > 0 ? 1 : 0 },
        _sum: { payAmount: previousAmount },
    });
    var orderGroupBy = globals_1.jest
        .fn()
        .mockResolvedValueOnce([{ userId: 'customer-1' }, { userId: 'customer-2' }])
        .mockResolvedValueOnce(previousAmount > 0 ? [{ userId: 'customer-1' }] : []);
    return {
        order: {
            aggregate: orderAggregate,
            findMany: globals_1.jest.fn().mockResolvedValue([
                { paidAt: new Date('2026-08-21T16:30:00.000Z'), payAmount: 50 },
                { paidAt: new Date('2026-08-26T16:00:00.000Z'), payAmount: 100 },
                { paidAt: new Date('2026-08-27T03:00:00.000Z'), payAmount: 200 },
            ]),
            groupBy: orderGroupBy,
            count: globals_1.jest.fn().mockResolvedValue(4),
        },
        refund: { count: globals_1.jest.fn().mockResolvedValue(2) },
        store: { count: globals_1.jest.fn().mockResolvedValue(1) },
        chatSession: {
            aggregate: globals_1.jest.fn().mockResolvedValue({ _sum: { unreadCount: 7 } }),
        },
        product: {
            count: globals_1.jest
                .fn()
                .mockResolvedValueOnce(3)
                .mockResolvedValueOnce(5)
                .mockResolvedValueOnce(1),
            findMany: globals_1.jest.fn().mockResolvedValue([
                {
                    id: 'plaza-product-1',
                    name: '真实广场商品',
                    images: ['https://example.com/product.png'],
                    merchantId: 'factory-2',
                    merchant: { id: 'factory-2', name: '其他厂家' },
                    priceWholesaleMin: 88,
                    priceRetailMin: 100,
                    sales: 10,
                    tags: [],
                },
            ]),
        },
        agencyApplication: { findMany: globals_1.jest.fn().mockResolvedValue([]) },
        plazaPush: { findMany: globals_1.jest.fn().mockResolvedValue([]) },
        systemConfig: {
            findUnique: globals_1.jest.fn().mockResolvedValue({ value: ['internal-test-merchant'] }),
            findMany: globals_1.jest.fn().mockResolvedValue([]),
        },
    };
}
(0, globals_1.describe)('MerchantService.dashboard 商家工作台', function () {
    (0, globals_1.beforeEach)(function () {
        globals_1.jest.useFakeTimers().setSystemTime(new Date('2026-08-27T04:00:00.000Z'));
    });
    (0, globals_1.afterEach)(function () {
        globals_1.jest.useRealTimers();
    });
    (0, globals_1.it)('按北京时间 paidAt 统计真实成交并返回兼容字段和待办', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, service, result, plazaWhere;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    prisma = makePrisma();
                    service = new merchant_service_1.MerchantService(prisma, {}, {});
                    return [4 /*yield*/, service.dashboard('merchant-1')];
                case 1:
                    result = _c.sent();
                    (0, globals_1.expect)(prisma.order.aggregate).toHaveBeenNthCalledWith(1, globals_1.expect.objectContaining({
                        where: {
                            merchantId: 'merchant-1',
                            paidAt: {
                                gte: new Date('2026-08-26T16:00:00.000Z'),
                                lt: new Date('2026-08-27T16:00:00.000Z'),
                            },
                        },
                    }));
                    (0, globals_1.expect)(result.workbench.overview).toEqual({
                        paidAmount: 300,
                        paidOrders: 2,
                        paidCustomers: 2,
                        versusYesterday: {
                            paidAmountPct: 200,
                            paidOrdersPct: 100,
                            paidCustomersPct: 100,
                        },
                    });
                    (0, globals_1.expect)(result.workbench.actions).toEqual({
                        pendingShipment: 4,
                        pendingRefund: 2,
                        unreadMessages: 7,
                        rejectedProducts: 3,
                        auditingProducts: 5,
                        pendingStoreAuth: 1,
                    });
                    (0, globals_1.expect)(result.workbench.trend7d).toHaveLength(7);
                    (0, globals_1.expect)(result.workbench.trend7d.at(-1)).toEqual({ date: '2026-08-27', paidAmount: 300 });
                    (0, globals_1.expect)(result.today).toMatchObject({ orders: 2, newCustomers: 2, sales: 300 });
                    (0, globals_1.expect)(result.todos).toEqual({ pendingShipment: 4, pendingRefund: 2, pendingStoreAuth: 1 });
                    (0, globals_1.expect)(result.plazaHighlights).toEqual([
                        {
                            productId: 'plaza-product-1',
                            productImage: 'https://example.com/product.png',
                            price: 88,
                        },
                    ]);
                    plazaWhere = (_b = (_a = prisma.product.findMany.mock.calls[0]) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.where;
                    (0, globals_1.expect)(plazaWhere.merchantId.notIn).toEqual(globals_1.expect.arrayContaining(['merchant-1', 'internal-test-merchant']));
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('昨日没有成交时环比返回 null 而不是虚假 100%', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, service, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = makePrisma(0);
                    service = new merchant_service_1.MerchantService(prisma, {}, {});
                    return [4 /*yield*/, service.dashboard('merchant-1')];
                case 1:
                    result = _a.sent();
                    (0, globals_1.expect)(result.workbench.overview.versusYesterday).toEqual({
                        paidAmountPct: null,
                        paidOrdersPct: null,
                        paidCustomersPct: null,
                    });
                    return [2 /*return*/];
            }
        });
    }); });
});
