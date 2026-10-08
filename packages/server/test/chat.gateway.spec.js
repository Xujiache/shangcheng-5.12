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
var chat_gateway_1 = require("../src/modules/chat/chat.gateway");
// ----------------------------------------------------------------------------
// ChatGateway — Socket.IO 在线客服网关
//
// 实现位置：packages/server/src/modules/chat/chat.gateway.ts
// 构造：constructor(jwt, prisma)
//
// 直接实例化 gateway，用 plain-object fake socket + jest.fn() 验证行为契约：
//   - auth：role 严格从 JWT payload 推导，禁止信任客户端 role
//   - join/message/typing/read：均校验 sessionId 归属，防越权
//   - 'message' 广播 payload 固定 { sessionId, message }，三端依赖此结构
// ----------------------------------------------------------------------------
// 每个 case 各自的房间级 emit spy
var roomEmit;
var serverEmit;
var makeClient = function () {
    return ({
        id: 's1',
        data: {},
        emit: globals_1.jest.fn(),
        join: globals_1.jest.fn(),
        leave: globals_1.jest.fn(),
        to: globals_1.jest.fn(function () { return ({ emit: roomEmit }); }),
    });
};
var makeGateway = function () {
    var jwt = { verifyAsync: globals_1.jest.fn() };
    var prisma = {
        user: { findUnique: globals_1.jest.fn() },
        merchant: { findUnique: globals_1.jest.fn() },
        chatSession: { findFirst: globals_1.jest.fn(), findUnique: globals_1.jest.fn(), update: globals_1.jest.fn() },
        chatMessage: { create: globals_1.jest.fn(), updateMany: globals_1.jest.fn() },
    };
    var harmonyRealtime = {
        registerLegacyChatBridge: globals_1.jest.fn(),
        emitMerchant: globals_1.jest.fn(),
        emitChatMessage: globals_1.jest.fn(),
    };
    var gateway = new chat_gateway_1.ChatGateway(jwt, prisma, undefined, harmonyRealtime);
    gateway.server = { to: globals_1.jest.fn(function () { return ({ emit: serverEmit }); }) };
    return { gateway: gateway, jwt: jwt, prisma: prisma, harmonyRealtime: harmonyRealtime };
};
(0, globals_1.beforeEach)(function () {
    roomEmit = globals_1.jest.fn();
    serverEmit = globals_1.jest.fn();
});
(0, globals_1.describe)('ChatGateway.onAuth — 鉴权与通道推导', function () {
    (0, globals_1.it)('token 无效（verifyAsync reject）→ emit("error")，且不设置 data.role', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, gateway, jwt, client;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeGateway(), gateway = _a.gateway, jwt = _a.jwt;
                    jwt.verifyAsync.mockRejectedValue(new Error('bad token'));
                    client = makeClient();
                    return [4 /*yield*/, gateway.onAuth(client, { token: 'x' })];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(client.emit).toHaveBeenCalledWith('error', { message: 'token 无效或过期' });
                    (0, globals_1.expect)(client.data.role).toBeUndefined();
                    (0, globals_1.expect)(client.join).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('普通用户（payload.role=customer）→ join 一次 "user:<id>"，emit("authed", {role:"user"})', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, gateway, jwt, prisma, client;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeGateway(), gateway = _a.gateway, jwt = _a.jwt, prisma = _a.prisma;
                    jwt.verifyAsync.mockResolvedValue({ sub: 'u1', role: 'customer' });
                    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'customer' });
                    client = makeClient();
                    return [4 /*yield*/, gateway.onAuth(client, { token: 't' })];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(client.join).toHaveBeenCalledTimes(1);
                    (0, globals_1.expect)(client.join).toHaveBeenCalledWith('user:u1');
                    (0, globals_1.expect)(client.data.role).toBe('user');
                    (0, globals_1.expect)(client.data.userId).toBe('u1');
                    (0, globals_1.expect)(client.emit).toHaveBeenCalledWith('authed', {
                        role: 'user',
                        userId: 'u1',
                        merchantId: undefined,
                    });
                    (0, globals_1.expect)(prisma.merchant.findUnique).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('商家（payload.role=factory 且关联到 m1）→ 各 join 一次 user 与 merchant 房间，data.merchantId="m1"', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, gateway, jwt, prisma, client;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeGateway(), gateway = _a.gateway, jwt = _a.jwt, prisma = _a.prisma;
                    jwt.verifyAsync.mockResolvedValue({ sub: 'u2', role: 'factory' });
                    prisma.user.findUnique.mockResolvedValue({ id: 'u2', role: 'factory' });
                    prisma.merchant.findUnique.mockResolvedValue({ id: 'm1', userId: 'u2' });
                    client = makeClient();
                    return [4 /*yield*/, gateway.onAuth(client, { token: 't' })];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(client.join).toHaveBeenCalledTimes(2);
                    (0, globals_1.expect)(client.join).toHaveBeenCalledWith('user:u2');
                    (0, globals_1.expect)(client.join).toHaveBeenCalledWith('merchant:m1');
                    (0, globals_1.expect)(client.data.role).toBe('merchant');
                    (0, globals_1.expect)(client.data.merchantId).toBe('m1');
                    (0, globals_1.expect)(client.emit).toHaveBeenCalledWith('authed', {
                        role: 'merchant',
                        userId: 'u2',
                        merchantId: 'm1',
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('商家 role 但 User 未关联商户 → emit("error")，不进 merchant 房间', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, gateway, jwt, prisma, client;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeGateway(), gateway = _a.gateway, jwt = _a.jwt, prisma = _a.prisma;
                    jwt.verifyAsync.mockResolvedValue({ sub: 'u3', role: 'merchant' });
                    prisma.user.findUnique.mockResolvedValue({ id: 'u3', role: 'merchant' });
                    prisma.merchant.findUnique.mockResolvedValue(null);
                    client = makeClient();
                    return [4 /*yield*/, gateway.onAuth(client, { token: 't' })];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(client.emit).toHaveBeenCalledWith('error', { message: '当前账号未关联商户' });
                    (0, globals_1.expect)(client.join).not.toHaveBeenCalled();
                    (0, globals_1.expect)(client.data.role).toBeUndefined();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('防伪造：customer payload 即便 DB user.role=customer 也绝不进 merchant 房间（仅一次 join）', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, gateway, jwt, prisma, client;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeGateway(), gateway = _a.gateway, jwt = _a.jwt, prisma = _a.prisma;
                    jwt.verifyAsync.mockResolvedValue({ sub: 'u4', role: 'customer' });
                    prisma.user.findUnique.mockResolvedValue({ id: 'u4', role: 'customer' });
                    client = makeClient();
                    return [4 /*yield*/, gateway.onAuth(client, { token: 't' })];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(client.join).toHaveBeenCalledTimes(1);
                    (0, globals_1.expect)(client.join).toHaveBeenCalledWith('user:u4');
                    (0, globals_1.expect)(client.data.merchantId).toBeUndefined();
                    (0, globals_1.expect)(prisma.merchant.findUnique).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('防伪造：客户端附带 {token, role:"merchant"} 多余字段也不会切到 merchant 通道（只信 payload.role）', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, gateway, jwt, prisma, client;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeGateway(), gateway = _a.gateway, jwt = _a.jwt, prisma = _a.prisma;
                    jwt.verifyAsync.mockResolvedValue({ sub: 'u5', role: 'customer' });
                    prisma.user.findUnique.mockResolvedValue({ id: 'u5', role: 'customer' });
                    client = makeClient();
                    // 客户端试图通过 body 上的 role 字段提权
                    return [4 /*yield*/, gateway.onAuth(client, { token: 't', role: 'merchant' })];
                case 1:
                    // 客户端试图通过 body 上的 role 字段提权
                    _b.sent();
                    (0, globals_1.expect)(client.data.role).toBe('user');
                    (0, globals_1.expect)(client.data.merchantId).toBeUndefined();
                    (0, globals_1.expect)(client.join).toHaveBeenCalledTimes(1);
                    (0, globals_1.expect)(client.join).toHaveBeenCalledWith('user:u5');
                    (0, globals_1.expect)(prisma.merchant.findUnique).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('双身份 super-admin：token merchantId 与数据库绑定一致时进入商家通道', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, gateway, jwt, prisma, client;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeGateway(), gateway = _a.gateway, jwt = _a.jwt, prisma = _a.prisma;
                    jwt.verifyAsync.mockResolvedValue({ sub: 'u-admin', role: 'super-admin', merchantId: 'm1' });
                    prisma.user.findUnique.mockResolvedValue({
                        id: 'u-admin',
                        role: 'super-admin',
                        merchantId: 'm1',
                    });
                    prisma.merchant.findUnique.mockResolvedValue({ id: 'm1', userId: 'u-admin' });
                    client = makeClient();
                    return [4 /*yield*/, gateway.onAuth(client, { token: 't' })];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(client.data.role).toBe('merchant');
                    (0, globals_1.expect)(client.data.merchantId).toBe('m1');
                    (0, globals_1.expect)(client.join).toHaveBeenCalledWith('merchant:m1');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('双身份防伪造：token merchantId 与数据库绑定不一致时仍按普通用户处理', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, gateway, jwt, prisma, client;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeGateway(), gateway = _a.gateway, jwt = _a.jwt, prisma = _a.prisma;
                    jwt.verifyAsync.mockResolvedValue({ sub: 'u-admin', role: 'super-admin', merchantId: 'forged' });
                    prisma.user.findUnique.mockResolvedValue({
                        id: 'u-admin',
                        role: 'super-admin',
                        merchantId: 'm1',
                    });
                    client = makeClient();
                    return [4 /*yield*/, gateway.onAuth(client, { token: 't' })];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(client.data.role).toBe('user');
                    (0, globals_1.expect)(client.data.merchantId).toBeUndefined();
                    (0, globals_1.expect)(client.join).toHaveBeenCalledWith('user:u-admin');
                    (0, globals_1.expect)(prisma.merchant.findUnique).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('ChatGateway.onJoin — 会话房间归属校验', function () {
    (0, globals_1.it)('未鉴权（data.role 为空）→ emit("error", 未鉴权)，不查会话', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, gateway, prisma, client;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeGateway(), gateway = _a.gateway, prisma = _a.prisma;
                    client = makeClient();
                    return [4 /*yield*/, gateway.onJoin(client, { sessionId: 's-1' })];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(client.emit).toHaveBeenCalledWith('error', { message: '未鉴权' });
                    (0, globals_1.expect)(prisma.chatSession.findFirst).not.toHaveBeenCalled();
                    (0, globals_1.expect)(client.join).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('他人会话（findFirst 返回 null）→ emit("error", 无访问权限)，不 join', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, gateway, prisma, client;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeGateway(), gateway = _a.gateway, prisma = _a.prisma;
                    prisma.chatSession.findFirst.mockResolvedValue(null);
                    client = makeClient();
                    client.data.role = 'user';
                    client.data.userId = 'u1';
                    return [4 /*yield*/, gateway.onJoin(client, { sessionId: 's-other' })];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(client.emit).toHaveBeenCalledWith('error', { message: '无此会话访问权限' });
                    (0, globals_1.expect)(client.join).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('自己的会话 → join("session:<id>") + emit("joined")', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, gateway, prisma, client;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeGateway(), gateway = _a.gateway, prisma = _a.prisma;
                    prisma.chatSession.findFirst.mockResolvedValue({ id: 's-mine', userId: 'u1' });
                    client = makeClient();
                    client.data.role = 'user';
                    client.data.userId = 'u1';
                    return [4 /*yield*/, gateway.onJoin(client, { sessionId: 's-mine' })];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(client.join).toHaveBeenCalledWith('session:s-mine');
                    (0, globals_1.expect)(client.emit).toHaveBeenCalledWith('joined', { sessionId: 's-mine' });
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('ChatGateway.onMessage — 持久化与广播契约', function () {
    (0, globals_1.it)('持久化消息 + 更新会话(lastMessageAt/unreadCount+1) + 向 session 房间广播 { sessionId, message }', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, gateway, prisma, created, client, createArg, updateArg, messageCall, evt, payload;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeGateway(), gateway = _a.gateway, prisma = _a.prisma;
                    prisma.chatSession.findFirst.mockResolvedValue({ id: 's-1', userId: 'u1' });
                    created = { id: 'msg-1', sessionId: 's-1', sender: 'user', content: 'hi' };
                    prisma.chatMessage.create.mockResolvedValue(created);
                    client = makeClient();
                    client.data.role = 'user';
                    client.data.userId = 'u1';
                    return [4 /*yield*/, gateway.onMessage(client, { sessionId: 's-1', content: 'hi' })
                        // 落库
                    ];
                case 1:
                    _b.sent();
                    // 落库
                    (0, globals_1.expect)(prisma.chatMessage.create).toHaveBeenCalledTimes(1);
                    createArg = prisma.chatMessage.create.mock.calls[0][0];
                    (0, globals_1.expect)(createArg.data.sessionId).toBe('s-1');
                    (0, globals_1.expect)(createArg.data.sender).toBe('user');
                    (0, globals_1.expect)(createArg.data.content).toBe('hi');
                    // 更新会话：lastMessageAt + unreadCount 自增
                    (0, globals_1.expect)(prisma.chatSession.update).toHaveBeenCalledTimes(1);
                    updateArg = prisma.chatSession.update.mock.calls[0][0];
                    (0, globals_1.expect)(updateArg.where).toEqual({ id: 's-1' });
                    (0, globals_1.expect)(updateArg.data.unreadCount).toEqual({ increment: 1 });
                    (0, globals_1.expect)(updateArg.data.lastMessageAt).toBeInstanceOf(Date);
                    // 广播：到正确房间 + payload 形状严格为 { sessionId, message }
                    (0, globals_1.expect)(gateway.server.to).toHaveBeenCalledWith('session:s-1');
                    // session 房间供聊天详情接收；user 房间的 chat:message 供会话列表实时置顶。
                    (0, globals_1.expect)(serverEmit).toHaveBeenCalledTimes(2);
                    messageCall = serverEmit.mock.calls.find(function (call) { return call[0] === 'message'; });
                    evt = messageCall[0], payload = messageCall[1];
                    (0, globals_1.expect)(evt).toBe('message');
                    (0, globals_1.expect)(Object.keys(payload).sort()).toEqual(['message', 'sessionId']);
                    (0, globals_1.expect)(payload).toEqual({ sessionId: 's-1', message: created });
                    (0, globals_1.expect)(gateway.server.to).toHaveBeenCalledWith('user:u1');
                    (0, globals_1.expect)(serverEmit).toHaveBeenCalledWith('chat:message', { sessionId: 's-1', message: created });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('商家自己发送消息不增加商家侧 unreadCount', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, gateway, prisma, client, updateArg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeGateway(), gateway = _a.gateway, prisma = _a.prisma;
                    prisma.chatSession.findFirst.mockResolvedValue({
                        id: 's-1',
                        userId: 'u1',
                        merchantId: 'm1',
                    });
                    prisma.chatMessage.create.mockResolvedValue({
                        id: 'msg-m',
                        sessionId: 's-1',
                        sender: 'merchant',
                        content: '收到',
                        createdAt: new Date(),
                    });
                    client = makeClient();
                    client.data.role = 'merchant';
                    client.data.merchantId = 'm1';
                    return [4 /*yield*/, gateway.onMessage(client, { sessionId: 's-1', content: '收到', kind: 'quick' })];
                case 1:
                    _b.sent();
                    updateArg = prisma.chatSession.update.mock.calls[0][0];
                    (0, globals_1.expect)(updateArg.data.unreadCount).toBeUndefined();
                    (0, globals_1.expect)(updateArg.data.lastMessageAt).toBeInstanceOf(Date);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('空白/纯空格内容 → 不落库、不广播', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, gateway, prisma, client;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeGateway(), gateway = _a.gateway, prisma = _a.prisma;
                    client = makeClient();
                    client.data.role = 'user';
                    client.data.userId = 'u1';
                    return [4 /*yield*/, gateway.onMessage(client, { sessionId: 's-1', content: '   ' })];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(prisma.chatMessage.create).not.toHaveBeenCalled();
                    (0, globals_1.expect)(prisma.chatSession.update).not.toHaveBeenCalled();
                    (0, globals_1.expect)(serverEmit).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('ChatGateway.onTyping — 伪造 sessionId 防御', function () {
    (0, globals_1.it)('伪造 sessionId（findFirst 返回 null）→ 静默丢弃，不向房间转发', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, gateway, prisma, client;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeGateway(), gateway = _a.gateway, prisma = _a.prisma;
                    prisma.chatSession.findFirst.mockResolvedValue(null);
                    client = makeClient();
                    client.data.role = 'user';
                    client.data.userId = 'u1';
                    return [4 /*yield*/, gateway.onTyping(client, { sessionId: 's-forged', on: true })];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(client.to).not.toHaveBeenCalled();
                    (0, globals_1.expect)(roomEmit).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('ChatGateway.onRead — 已读回执', function () {
    (0, globals_1.it)('客户 HTTP 已读回执同步到 Harmony 商家身份通道', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, gateway, prisma, harmonyRealtime;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeGateway(), gateway = _a.gateway, prisma = _a.prisma, harmonyRealtime = _a.harmonyRealtime;
                    prisma.chatSession.findUnique.mockResolvedValue({ merchantId: 'm1' });
                    gateway.emitReadReceipt('s-1', 'user');
                    return [4 /*yield*/, Promise.resolve()];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, Promise.resolve()];
                case 2:
                    _b.sent();
                    (0, globals_1.expect)(harmonyRealtime.emitMerchant).toHaveBeenCalledWith('m1', 'chat.read', {
                        sessionId: 's-1',
                        byRole: 'user',
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('商家已读 → 仅把对方(user)未读标为已读，并清零会话 unreadCount', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, gateway, prisma, client, upd, sess;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeGateway(), gateway = _a.gateway, prisma = _a.prisma;
                    prisma.chatSession.findFirst.mockResolvedValue({ id: 's-1', merchantId: 'm1' });
                    client = makeClient();
                    client.data.role = 'merchant';
                    client.data.merchantId = 'm1';
                    return [4 /*yield*/, gateway.onRead(client, { sessionId: 's-1' })];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(prisma.chatMessage.updateMany).toHaveBeenCalledTimes(1);
                    upd = prisma.chatMessage.updateMany.mock.calls[0][0];
                    (0, globals_1.expect)(upd.where.sessionId).toBe('s-1');
                    (0, globals_1.expect)(upd.where.sender).toBe('user');
                    (0, globals_1.expect)(upd.where.read).toBe(false);
                    (0, globals_1.expect)(upd.data).toEqual({ read: true });
                    (0, globals_1.expect)(prisma.chatSession.update).toHaveBeenCalledTimes(1);
                    sess = prisma.chatSession.update.mock.calls[0][0];
                    (0, globals_1.expect)(sess.where).toEqual({ id: 's-1' });
                    (0, globals_1.expect)(sess.data).toEqual({ unreadCount: 0 });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('客户已读 → 标记商家消息已读，但不清零商家侧 unreadCount', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, gateway, prisma, client, upd;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeGateway(), gateway = _a.gateway, prisma = _a.prisma;
                    prisma.chatSession.findFirst.mockResolvedValue({ id: 's-1', userId: 'u1' });
                    client = makeClient();
                    client.data.role = 'user';
                    client.data.userId = 'u1';
                    return [4 /*yield*/, gateway.onRead(client, { sessionId: 's-1' })];
                case 1:
                    _b.sent();
                    upd = prisma.chatMessage.updateMany.mock.calls[0][0];
                    (0, globals_1.expect)(upd.where.sender).toBe('merchant');
                    (0, globals_1.expect)(prisma.chatSession.update).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('ChatGateway.emitOrderNew / emitChatMessage — 推送边界', function () {
    (0, globals_1.it)('emitOrderNew：merchantId 为空 → server.to 不调用', function () {
        var gateway = makeGateway().gateway;
        gateway.emitOrderNew('', { orderId: 'o1' });
        (0, globals_1.expect)(gateway.server.to).not.toHaveBeenCalled();
    });
    (0, globals_1.it)('emitChatMessage：sessionId 为空 → server.to 不调用', function () {
        var gateway = makeGateway().gateway;
        gateway.emitChatMessage('', { id: 'msg' });
        (0, globals_1.expect)(gateway.server.to).not.toHaveBeenCalled();
    });
    (0, globals_1.it)('server 未初始化（gateway.server=undefined）→ 安全返回不抛错', function () {
        var gateway = makeGateway().gateway;
        gateway.server = undefined;
        (0, globals_1.expect)(function () { return gateway.emitOrderNew('m1', { orderId: 'o1' }); }).not.toThrow();
        (0, globals_1.expect)(function () { return gateway.emitChatMessage('s1', { id: 'msg' }); }).not.toThrow();
    });
});
