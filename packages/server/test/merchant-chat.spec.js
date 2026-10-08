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
globals_1.jest.mock('nanoid', function () { return ({
    customAlphabet: function () { return function () { return 'CHATTEST'; }; },
}); });
var merchant_service_1 = require("../src/modules/merchant/merchant.service");
function makeService(overrides) {
    var _this = this;
    if (overrides === void 0) { overrides = {}; }
    var prisma = {
        chatSession: __assign({ findFirst: globals_1.jest.fn(), findMany: globals_1.jest.fn(), update: globals_1.jest.fn().mockResolvedValue({}) }, overrides.chatSession),
        chatMessage: __assign({ findFirst: globals_1.jest.fn(), findMany: globals_1.jest.fn(), create: globals_1.jest.fn(), updateMany: globals_1.jest.fn().mockResolvedValue({ count: 0 }) }, overrides.chatMessage),
        $transaction: globals_1.jest.fn().mockImplementation(function (jobs) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, Promise.all(jobs)];
        }); }); }),
    };
    var chat = {
        isUserOnline: globals_1.jest.fn().mockReturnValue(false),
        emitChatMessage: globals_1.jest.fn(),
        emitReadReceipt: globals_1.jest.fn(),
    };
    var contentSecurity = { assertTextSafe: globals_1.jest.fn().mockResolvedValue(undefined) };
    var service = new merchant_service_1.MerchantService(prisma, {}, chat, contentSecurity);
    return { service: service, prisma: prisma, chat: chat, contentSecurity: contentSecurity };
}
(0, globals_1.describe)('MerchantService 商家客服', function () {
    (0, globals_1.it)('消息分页校验游标归属并把数据库倒序结果恢复为正序', function () { return __awaiter(void 0, void 0, void 0, function () {
        var older, newer, _a, service, prisma, rows;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    older = { id: 'm1', sessionId: 's1', createdAt: new Date('2026-08-01T00:00:00Z') };
                    newer = { id: 'm2', sessionId: 's1', createdAt: new Date('2026-08-02T00:00:00Z') };
                    _a = makeService({
                        chatSession: { findFirst: globals_1.jest.fn().mockResolvedValue({ id: 's1' }) },
                        chatMessage: {
                            findFirst: globals_1.jest.fn().mockResolvedValue({ id: 'cursor1' }),
                            findMany: globals_1.jest.fn().mockResolvedValue([newer, older]),
                        },
                    }), service = _a.service, prisma = _a.prisma;
                    return [4 /*yield*/, service.chatMessages('merchant1', 's1', { cursor: 'cursor1', pageSize: 30 })];
                case 1:
                    rows = _b.sent();
                    (0, globals_1.expect)(rows).toEqual([older, newer]);
                    (0, globals_1.expect)(prisma.chatMessage.findFirst).toHaveBeenCalledWith({
                        where: { id: 'cursor1', sessionId: 's1' },
                        select: { id: true },
                    });
                    (0, globals_1.expect)(prisma.chatMessage.findMany).toHaveBeenCalledWith(globals_1.expect.objectContaining({ take: 30, cursor: { id: 'cursor1' }, skip: 1 }));
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('快捷回复按 quick 类型落库、执行内容安全并向身份房间实时广播', function () { return __awaiter(void 0, void 0, void 0, function () {
        var session, created, _a, service, prisma, chat, contentSecurity, result;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    session = { id: 's1', merchantId: 'merchant1', userId: 'user1' };
                    created = {
                        id: 'msg1',
                        sessionId: 's1',
                        sender: 'merchant',
                        type: 'quick',
                        content: '已收到',
                        createdAt: new Date(),
                    };
                    _a = makeService({
                        chatSession: { findFirst: globals_1.jest.fn().mockResolvedValue(session) },
                        chatMessage: { create: globals_1.jest.fn().mockResolvedValue(created) },
                    }), service = _a.service, prisma = _a.prisma, chat = _a.chat, contentSecurity = _a.contentSecurity;
                    return [4 /*yield*/, service.chatSend('merchant1', 's1', 'quick', '  已收到  ')];
                case 1:
                    result = _b.sent();
                    (0, globals_1.expect)(result).toBe(created);
                    (0, globals_1.expect)(contentSecurity.assertTextSafe).toHaveBeenCalledWith('已收到', {
                        scope: 'mall',
                        scene: 2,
                    });
                    (0, globals_1.expect)(prisma.chatMessage.create).toHaveBeenCalledWith({
                        data: {
                            sessionId: 's1',
                            sender: 'merchant',
                            type: 'quick',
                            content: '已收到',
                            read: false,
                        },
                    });
                    (0, globals_1.expect)(chat.emitChatMessage).toHaveBeenCalledWith('s1', created, session);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('拒绝客户端伪造 system 消息且不落库', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, service, prisma;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeService({
                        chatSession: { findFirst: globals_1.jest.fn().mockResolvedValue({ id: 's1' }) },
                    }), service = _a.service, prisma = _a.prisma;
                    return [4 /*yield*/, (0, globals_1.expect)(service.chatSend('merchant1', 's1', 'system', '系统通知')).rejects.toMatchObject({
                            response: globals_1.expect.objectContaining({ message: '不支持的消息类型' }),
                        })];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(prisma.chatMessage.create).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('HTTP 已读同时清除用户未读消息和商家会话未读数并广播回执', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, service, prisma, chat;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeService({
                        chatSession: { findFirst: globals_1.jest.fn().mockResolvedValue({ id: 's1' }) },
                    }), service = _a.service, prisma = _a.prisma, chat = _a.chat;
                    return [4 /*yield*/, (0, globals_1.expect)(service.chatRead('merchant1', 's1')).resolves.toEqual({ ok: true })];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(prisma.chatMessage.updateMany).toHaveBeenCalledWith({
                        where: { sessionId: 's1', sender: 'user', read: false },
                        data: { read: true },
                    });
                    (0, globals_1.expect)(prisma.chatSession.update).toHaveBeenCalledWith({
                        where: { id: 's1' },
                        data: { unreadCount: 0 },
                    });
                    (0, globals_1.expect)(chat.emitReadReceipt).toHaveBeenCalledWith('s1', 'merchant');
                    return [2 /*return*/];
            }
        });
    }); });
});
