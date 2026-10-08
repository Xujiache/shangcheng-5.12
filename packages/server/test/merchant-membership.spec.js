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
// nanoid@5 是纯 ESM；服务类会间接导入 id.util，因此在 CJS Jest 中提供轻量替身。
globals_1.jest.mock('nanoid', function () { return ({
    customAlphabet: function () { return function () { return 'ANDROIDTEST1'; }; },
}); });
var biz_exception_1 = require("../src/common/exceptions/biz.exception");
var merchant_service_1 = require("../src/modules/merchant/merchant.service");
(0, globals_1.describe)('MerchantService.subscribe 客户端支付门禁', function () {
    (0, globals_1.it)('Android 支付未启用时在创建支付单之前拒绝', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, wxpay, service, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = {
                        memberPlan: { findUnique: globals_1.jest.fn() },
                        paymentRecord: { create: globals_1.jest.fn() },
                    };
                    wxpay = { isReady: globals_1.jest.fn(), createMiniPay: globals_1.jest.fn() };
                    service = new merchant_service_1.MerchantService(prisma, wxpay, {});
                    return [4 /*yield*/, (0, globals_1.expect)(service.subscribe('merchant-1', 'user-1', {
                            planId: 'plan-1',
                            payMethod: 'wechat',
                            clientPlatform: 'android',
                        })).rejects.toBeInstanceOf(biz_exception_1.BizException)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, service.subscribe('merchant-1', 'user-1', {
                            planId: 'plan-1',
                            clientPlatform: 'android',
                        })];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    (0, globals_1.expect)(error_1.getResponse()).toMatchObject({
                        code: biz_exception_1.BizCode.BUSINESS_ERROR,
                        message: 'Android 支付即将开放',
                    });
                    return [3 /*break*/, 5];
                case 5:
                    (0, globals_1.expect)(prisma.memberPlan.findUnique).not.toHaveBeenCalled();
                    (0, globals_1.expect)(prisma.paymentRecord.create).not.toHaveBeenCalled();
                    (0, globals_1.expect)(wxpay.createMiniPay).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('拒绝未知客户端且不访问数据库', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = { memberPlan: { findUnique: globals_1.jest.fn() } };
                    service = new merchant_service_1.MerchantService(prisma, {}, {});
                    return [4 /*yield*/, (0, globals_1.expect)(service.subscribe('merchant-1', 'user-1', {
                            planId: 'plan-1',
                            clientPlatform: 'desktop',
                        })).rejects.toMatchObject({
                            response: { code: biz_exception_1.BizCode.INVALID_PARAMS },
                        })];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(prisma.memberPlan.findUnique).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('MerchantService.membershipNotices language negotiation', function () {
    (0, globals_1.it)('returns localized quota warnings without changing the quota contract', function () { return __awaiter(void 0, void 0, void 0, function () {
        var service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    service = new merchant_service_1.MerchantService({}, {}, {});
                    globals_1.jest.spyOn(service, 'quota').mockResolvedValue({
                        pushSlotsLimit: 10,
                        pushSlotsUsed: 8,
                        bannerLimit: 2,
                        bannerUsed: 2,
                        impressionLimit: 100,
                        impressionUsed: 10,
                        periodStart: new Date('2026-08-01T00:00:00.000Z'),
                        periodEnd: new Date('2026-09-01T00:00:00.000Z'),
                    });
                    return [4 /*yield*/, (0, globals_1.expect)(service.membershipNotices('merchant-1', 'en-US')).resolves.toEqual([
                            {
                                type: 'warn',
                                text: 'Featured plaza slots used: 8/10',
                                link: '/merchant/member',
                            },
                            {
                                type: 'error',
                                text: 'Banner quota has been fully used',
                                link: '/merchant/member',
                            },
                        ])];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, (0, globals_1.expect)(service.membershipNotices('merchant-1', 'zh-CN')).resolves.toEqual([
                            {
                                type: 'warn',
                                text: '广场推荐次数已用 8/10',
                                link: '/merchant/member',
                            },
                            {
                                type: 'error',
                                text: 'Banner 配额已用尽',
                                link: '/merchant/member',
                            },
                        ])];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
