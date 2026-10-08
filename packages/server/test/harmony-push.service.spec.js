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
var harmony_push_service_1 = require("../src/modules/harmony-merchant/harmony-push.service");
describe('HarmonyPushService', function () {
    it('upserts the current device inside the authenticated merchant scope', function () { return __awaiter(void 0, void 0, void 0, function () {
        var upsert, prisma, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    upsert = jest.fn().mockResolvedValue({
                        id: 'device-1',
                        locale: 'zh-CN',
                        enabled: true,
                        lastSeenAt: new Date(),
                    });
                    prisma = { harmonyPushDevice: { upsert: upsert } };
                    service = new harmony_push_service_1.HarmonyPushService(prisma);
                    return [4 /*yield*/, service.register('user-1', 'merchant-1', {
                            token: 'a-valid-push-token-value',
                            deviceId: 'phone-1',
                            locale: 'zh-CN',
                        })];
                case 1:
                    _a.sent();
                    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
                        where: { token: 'a-valid-push-token-value' },
                        create: expect.objectContaining({ userId: 'user-1', merchantId: 'merchant-1' }),
                    }));
                    return [2 /*return*/];
            }
        });
    }); });
    it('merges partial preferences without resetting other switches', function () { return __awaiter(void 0, void 0, void 0, function () {
        var findUnique, upsert, prisma, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    findUnique = jest
                        .fn()
                        .mockResolvedValue({ merchantId: 'merchant-1', orders: true, refunds: false, chat: true });
                    upsert = jest
                        .fn()
                        .mockResolvedValue({ merchantId: 'merchant-1', orders: false, refunds: false, chat: true });
                    prisma = { harmonyPushPreference: { findUnique: findUnique, upsert: upsert } };
                    service = new harmony_push_service_1.HarmonyPushService(prisma);
                    return [4 /*yield*/, expect(service.setPreferences('merchant-1', { orders: false })).resolves.toEqual({
                            orders: false,
                            refunds: false,
                            chat: true,
                        })];
                case 1:
                    _a.sent();
                    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
                        update: { orders: false, refunds: false, chat: true },
                    }));
                    return [2 /*return*/];
            }
        });
    }); });
    it('does not query devices when the merchant disabled the matching topic', function () { return __awaiter(void 0, void 0, void 0, function () {
        var findMany, prisma, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    findMany = jest.fn();
                    prisma = {
                        harmonyPushPreference: {
                            findUnique: jest.fn().mockResolvedValue({ orders: false, refunds: true, chat: true }),
                        },
                        harmonyPushDevice: { findMany: findMany },
                    };
                    service = new harmony_push_service_1.HarmonyPushService(prisma);
                    return [4 /*yield*/, expect(service.sendToMerchant('merchant-1', {
                            topic: 'orders',
                            title: '新订单',
                            body: '订单已付款',
                        })).resolves.toEqual({ sent: 0, skipped: true, reason: 'preference-disabled' })];
                case 1:
                    _a.sent();
                    expect(findMany).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    it('deduplicates device tokens and uses the Push Kit test batch limit', function () { return __awaiter(void 0, void 0, void 0, function () {
        var oldTestMessage, tokens, prisma, service, sendBatch;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    oldTestMessage = process.env.HUAWEI_PUSH_TEST_MESSAGE;
                    process.env.HUAWEI_PUSH_TEST_MESSAGE = '1';
                    tokens = Array.from({ length: 13 }, function (_, index) { return ({ token: "token-".concat(index) }); });
                    tokens.push({ token: 'token-0' });
                    prisma = {
                        harmonyPushPreference: { findUnique: jest.fn().mockResolvedValue(null) },
                        harmonyPushDevice: { findMany: jest.fn().mockResolvedValue(tokens) },
                    };
                    service = new harmony_push_service_1.HarmonyPushService(prisma);
                    jest.spyOn(service, 'getCredentials').mockReturnValue({
                        projectId: 'project',
                        keyId: 'key',
                        subAccount: 'account',
                        privateKey: 'private-key',
                    });
                    sendBatch = jest.spyOn(service, 'sendBatch').mockResolvedValue(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 3, 4]);
                    return [4 /*yield*/, expect(service.sendToMerchant('merchant-1', {
                            topic: 'chat',
                            title: '客户消息',
                            body: '客户咨询了尺寸',
                        })).resolves.toEqual({ sent: 13, skipped: false })];
                case 2:
                    _a.sent();
                    expect(sendBatch).toHaveBeenCalledTimes(2);
                    expect(sendBatch.mock.calls[0][1]).toHaveLength(10);
                    expect(sendBatch.mock.calls[1][1]).toHaveLength(3);
                    return [3 /*break*/, 4];
                case 3:
                    if (oldTestMessage === undefined)
                        delete process.env.HUAWEI_PUSH_TEST_MESSAGE;
                    else
                        process.env.HUAWEI_PUSH_TEST_MESSAGE = oldTestMessage;
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    it('fails open when cloud credentials are absent', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = {
                        harmonyPushPreference: { findUnique: jest.fn().mockResolvedValue(null) },
                        harmonyPushDevice: { findMany: jest.fn().mockResolvedValue([{ token: 'token-1' }]) },
                    };
                    service = new harmony_push_service_1.HarmonyPushService(prisma);
                    jest.spyOn(service, 'getCredentials').mockReturnValue(null);
                    return [4 /*yield*/, expect(service.sendToMerchant('merchant-1', {
                            topic: 'refunds',
                            title: '售后申请',
                            body: '有一笔售后待处理',
                        })).resolves.toEqual({ sent: 0, skipped: true, reason: 'not-configured' })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('uses the provider message id as the client click-event dedupe id', function () {
        var service = new harmony_push_service_1.HarmonyPushService({});
        var notification = service.buildNotification({
            topic: 'orders',
            title: '新订单',
            body: '订单 ORD-1 已付款',
            data: { route: 'order-detail', id: 'order-1', status: 'paid' },
            appMessageId: 'order-paid-order-1',
        });
        expect(notification.appMessageId).toBe('order-paid-order-1');
        expect(notification.clickAction.data).toEqual({
            route: 'order-detail',
            id: 'order-1',
            status: 'paid',
            eventId: 'order-paid-order-1',
        });
    });
});
