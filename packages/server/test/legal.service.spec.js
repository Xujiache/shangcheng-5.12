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
var legal_service_1 = require("../src/modules/legal/legal.service");
var legal_defaults_en_1 = require("../src/modules/legal/legal.defaults.en");
var legal_defaults_1 = require("../src/modules/legal/legal.defaults");
var legal_merchant_harmony_1 = require("../src/modules/legal/legal.merchant-harmony");
function makeService(row) {
    if (row === void 0) { row = null; }
    var prisma = {
        systemConfig: {
            findUnique: globals_1.jest.fn().mockResolvedValue(row),
            upsert: globals_1.jest.fn(),
        },
    };
    return { service: new legal_service_1.LegalService(prisma), prisma: prisma };
}
(0, globals_1.describe)('LegalService language negotiation', function () {
    (0, globals_1.it)('returns complete English HarmonyOS disclosures for an English locale', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, service, prisma, result;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeService(), service = _a.service, prisma = _a.prisma;
                    return [4 /*yield*/, service.list('en-US')];
                case 1:
                    result = _b.sent();
                    (0, globals_1.expect)(prisma.systemConfig.findUnique).toHaveBeenCalledWith({
                        where: { key: legal_defaults_en_1.LEGAL_AGREEMENTS_EN_KEY },
                    });
                    (0, globals_1.expect)(result.user.title).toBe('Jingwei Technology Terms of Service');
                    (0, globals_1.expect)(result.privacy.body).toContain('Asset Store');
                    (0, globals_1.expect)(result.collect.body).toContain('Huawei Push Kit');
                    (0, globals_1.expect)(result.collect.body).toContain('Huawei IAP Kit');
                    (0, globals_1.expect)(result.collect.body).toContain('Huawei Map Kit / Location Kit');
                    (0, globals_1.expect)(result.collect.body).toContain('Huawei AppGallery');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('deep-merges a partial English administrator override with English defaults', function () { return __awaiter(void 0, void 0, void 0, function () {
        var service, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    service = makeService({
                        value: {
                            privacy: {
                                title: 'Custom English Privacy Notice',
                            },
                        },
                    }).service;
                    return [4 /*yield*/, service.list('EN-gb,en;q=0.9')];
                case 1:
                    result = _a.sent();
                    (0, globals_1.expect)(result.privacy.title).toBe('Custom English Privacy Notice');
                    (0, globals_1.expect)(result.privacy.body).toContain('personal information');
                    (0, globals_1.expect)(result.user.title).toBe('Jingwei Technology Terms of Service');
                    (0, globals_1.expect)(result.collect.title).toBe('Jingwei Technology Personal Information Collection List');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('keeps the existing Chinese agreement key and defaults for Chinese clients', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, service, prisma, result;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeService(), service = _a.service, prisma = _a.prisma;
                    return [4 /*yield*/, service.list('zh-CN,zh;q=0.9')];
                case 1:
                    result = _b.sent();
                    (0, globals_1.expect)(prisma.systemConfig.findUnique).toHaveBeenCalledWith({
                        where: { key: legal_defaults_1.LEGAL_AGREEMENTS_KEY },
                    });
                    (0, globals_1.expect)(result.user.title).toBe('《经纬科技用户服务协议》');
                    (0, globals_1.expect)(result.privacy.title).toBe('《经纬科技隐私政策》');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('returns a dedicated minimum-collection notice for the native Harmony merchant client', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, service, prisma, result;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeService(), service = _a.service, prisma = _a.prisma;
                    prisma.systemConfig.findUnique.mockImplementation(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                        var where = _b.where;
                        return __generator(this, function (_c) {
                            if (where.key === 'system_settings') {
                                return [2 /*return*/, {
                                        value: {
                                            service: {
                                                phone: '400-123-4567',
                                                email: 'privacy@example.com',
                                                workTime: '9:00-18:00',
                                            },
                                        },
                                    }];
                            }
                            return [2 /*return*/, null];
                        });
                    }); });
                    return [4 /*yield*/, service.list('zh-CN', 'merchant-harmony')];
                case 1:
                    result = _b.sent();
                    (0, globals_1.expect)(prisma.systemConfig.findUnique).toHaveBeenCalledWith({
                        where: { key: legal_merchant_harmony_1.MERCHANT_HARMONY_LEGAL_KEY },
                    });
                    (0, globals_1.expect)(result.privacy.title).toBe('《经纬科技商家端隐私政策》');
                    (0, globals_1.expect)(result.privacy.body).toContain('辽宁经纬建筑装饰有限公司');
                    (0, globals_1.expect)(result.privacy.body).toContain('privacy@example.com');
                    (0, globals_1.expect)(result.privacy.body).toContain('Asset Store');
                    (0, globals_1.expect)(result.collect.body).toContain('Huawei IAP');
                    (0, globals_1.expect)(result.collect.body).toContain('不读取通讯录');
                    (0, globals_1.expect)(result.collect.body).toContain('不接入微信登录/微信支付/腾讯定位');
                    (0, globals_1.expect)(result.collect.body).not.toContain('WIFI 列表');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('supports an independently overridable English Harmony merchant notice', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, service, prisma, result;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeService(), service = _a.service, prisma = _a.prisma;
                    prisma.systemConfig.findUnique.mockImplementation(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                        var where = _b.where;
                        return __generator(this, function (_c) {
                            if (where.key === legal_merchant_harmony_1.MERCHANT_HARMONY_LEGAL_EN_KEY) {
                                return [2 /*return*/, { value: { privacy: { title: 'Approved merchant privacy notice' } } }];
                            }
                            if (where.key === 'system_settings') {
                                return [2 /*return*/, { value: { service: { email: 'privacy@example.com' } } }];
                            }
                            return [2 /*return*/, null];
                        });
                    }); });
                    return [4 /*yield*/, service.list('en-US', 'merchant-harmony')];
                case 1:
                    result = _b.sent();
                    (0, globals_1.expect)(result.privacy.title).toBe('Approved merchant privacy notice');
                    (0, globals_1.expect)(result.privacy.body).toContain('does not read contacts');
                    (0, globals_1.expect)(result.collect.body).toContain('Huawei Push Kit');
                    (0, globals_1.expect)(result.user.title).toBe('Jingwei Merchant Terms of Service');
                    return [2 /*return*/];
            }
        });
    }); });
});
