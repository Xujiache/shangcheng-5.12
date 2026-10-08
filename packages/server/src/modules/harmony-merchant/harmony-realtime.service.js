"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HarmonyRealtimeService = void 0;
var node_crypto_1 = require("node:crypto");
var common_1 = require("@nestjs/common");
var ws_1 = require("ws");
var HarmonyRealtimeService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var HarmonyRealtimeService = _classThis = /** @class */ (function () {
        function HarmonyRealtimeService_1(adapterHost, jwt, prisma, contentSecurity) {
            this.adapterHost = adapterHost;
            this.jwt = jwt;
            this.prisma = prisma;
            this.contentSecurity = contentSecurity;
            this.logger = new common_1.Logger(HarmonyRealtimeService.name);
            this.server = new ws_1.WebSocketServer({ noServer: true, maxPayload: 128 * 1024 });
            this.clients = new Map();
        }
        HarmonyRealtimeService_1.prototype.onApplicationBootstrap = function () {
            var _this = this;
            var httpServer = this.adapterHost.httpAdapter.getHttpServer();
            httpServer.on('upgrade', function (request, socket, head) {
                var path = new URL(request.url || '/', 'http://localhost').pathname;
                if (path !== '/ws/harmony/merchant')
                    return;
                _this.server.handleUpgrade(request, socket, head, function (webSocket) {
                    _this.server.emit('connection', webSocket, request);
                });
            });
            this.server.on('connection', function (socket) { return _this.accept(socket); });
            this.heartbeatTimer = setInterval(function () { return _this.sweep(); }, 30000);
            this.heartbeatTimer.unref();
            this.logger.log('pure JSON WebSocket listening on /ws/harmony/merchant');
        };
        HarmonyRealtimeService_1.prototype.onModuleDestroy = function () {
            if (this.heartbeatTimer)
                clearInterval(this.heartbeatTimer);
            for (var _i = 0, _a = this.clients.keys(); _i < _a.length; _i++) {
                var socket = _a[_i];
                socket.close(1001, 'server shutdown');
            }
            this.server.close();
        };
        HarmonyRealtimeService_1.prototype.registerLegacyChatBridge = function (bridge) {
            this.legacyChatBridge = bridge;
        };
        HarmonyRealtimeService_1.prototype.emitMerchant = function (merchantId, event, data) {
            if (!merchantId)
                return;
            var eventId = (0, node_crypto_1.randomUUID)();
            for (var _i = 0, _a = this.clients; _i < _a.length; _i++) {
                var _b = _a[_i], socket = _b[0], state = _b[1];
                if (state.merchantId === merchantId)
                    this.send(socket, event, data, eventId);
            }
        };
        HarmonyRealtimeService_1.prototype.emitChatMessage = function (sessionId, merchantId, message) {
            this.emitMerchant(merchantId, 'chat.message', { sessionId: sessionId, message: message });
        };
        HarmonyRealtimeService_1.prototype.accept = function (socket) {
            var _this = this;
            var tracked = socket;
            tracked.harmonyAlive = true;
            var authDeadline = setTimeout(function () {
                if (!_this.clients.has(socket))
                    socket.close(4401, 'authentication timeout');
            }, 10000);
            socket.on('pong', function () {
                tracked.harmonyAlive = true;
            });
            socket.on('message', function (raw) { return void _this.handle(socket, raw); });
            socket.on('close', function () {
                clearTimeout(authDeadline);
                _this.clients.delete(socket);
            });
            socket.on('error', function (error) { return _this.logger.warn("Harmony WS error: ".concat(error.message)); });
            this.send(socket, 'connection.ready', { authTimeoutMs: 10000 });
        };
        HarmonyRealtimeService_1.prototype.handle = function (socket, raw) {
            return __awaiter(this, void 0, void 0, function () {
                var envelope, parsed, state, _a, sessionId, error_1, message;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            try {
                                parsed = JSON.parse(raw.toString());
                                if (parsed.v !== 1 || typeof parsed.event !== 'string' || !parsed.event)
                                    throw new Error();
                                envelope = parsed;
                            }
                            catch (_f) {
                                this.send(socket, 'error', { code: 'BAD_ENVELOPE', message: '消息信封格式不正确' });
                                return [2 /*return*/];
                            }
                            state = this.clients.get(socket);
                            if (!(envelope.event === 'auth' || envelope.event === 'token.update')) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.authenticate(socket, String(((_b = envelope.data) === null || _b === void 0 ? void 0 : _b.token) || ''), envelope.requestId)];
                        case 1:
                            _e.sent();
                            return [2 /*return*/];
                        case 2:
                            if (!state) {
                                this.send(socket, 'error', { code: 'UNAUTHORIZED', message: '请先发送 auth 首帧' }, envelope.requestId);
                                return [2 /*return*/];
                            }
                            if (envelope.requestId) {
                                if (state.requestIds.has(envelope.requestId)) {
                                    this.send(socket, 'ack', { duplicate: true }, envelope.requestId);
                                    return [2 /*return*/];
                                }
                                state.requestIds.add(envelope.requestId);
                                if (state.requestIds.size > 200)
                                    state.requestIds.delete(state.requestIds.values().next().value);
                            }
                            _e.label = 3;
                        case 3:
                            _e.trys.push([3, 17, , 18]);
                            _a = envelope.event;
                            switch (_a) {
                                case 'heartbeat': return [3 /*break*/, 4];
                                case 'ack': return [3 /*break*/, 5];
                                case 'chat.join': return [3 /*break*/, 6];
                                case 'chat.leave': return [3 /*break*/, 8];
                                case 'chat.typing': return [3 /*break*/, 9];
                                case 'chat.read': return [3 /*break*/, 11];
                                case 'chat.send': return [3 /*break*/, 13];
                            }
                            return [3 /*break*/, 15];
                        case 4:
                            this.send(socket, 'heartbeat.ack', {}, envelope.requestId);
                            return [2 /*return*/];
                        case 5: return [2 /*return*/];
                        case 6: return [4 /*yield*/, this.joinSession(socket, state, String(((_c = envelope.data) === null || _c === void 0 ? void 0 : _c.sessionId) || ''), envelope.requestId)];
                        case 7:
                            _e.sent();
                            return [2 /*return*/];
                        case 8:
                            {
                                sessionId = String(((_d = envelope.data) === null || _d === void 0 ? void 0 : _d.sessionId) || '');
                                state.sessions.delete(sessionId);
                                this.send(socket, 'chat.left', { sessionId: sessionId }, envelope.requestId);
                                return [2 /*return*/];
                            }
                            _e.label = 9;
                        case 9: return [4 /*yield*/, this.typing(socket, state, envelope)];
                        case 10:
                            _e.sent();
                            return [2 /*return*/];
                        case 11: return [4 /*yield*/, this.read(socket, state, envelope)];
                        case 12:
                            _e.sent();
                            return [2 /*return*/];
                        case 13: return [4 /*yield*/, this.sendChat(socket, state, envelope)];
                        case 14:
                            _e.sent();
                            return [2 /*return*/];
                        case 15:
                            this.send(socket, 'error', { code: 'UNKNOWN_EVENT', message: '不支持的事件' }, envelope.requestId);
                            _e.label = 16;
                        case 16: return [3 /*break*/, 18];
                        case 17:
                            error_1 = _e.sent();
                            message = error_1 instanceof Error ? error_1.message : '实时操作失败';
                            this.send(socket, 'error', { code: 'EVENT_FAILED', message: message }, envelope.requestId);
                            return [3 /*break*/, 18];
                        case 18: return [2 /*return*/];
                    }
                });
            });
        };
        HarmonyRealtimeService_1.prototype.authenticate = function (socket, token, requestId) {
            return __awaiter(this, void 0, void 0, function () {
                var payload, user, claimed, role, merchant, previous, error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 4, , 5]);
                            return [4 /*yield*/, this.jwt.verifyAsync(token)];
                        case 1:
                            payload = _a.sent();
                            if (payload._r || !payload.sub)
                                throw new Error('无效访问令牌');
                            return [4 /*yield*/, this.prisma.user.findUnique({
                                    where: { id: String(payload.sub) },
                                    select: { id: true, role: true, status: true, merchantId: true },
                                })];
                        case 2:
                            user = _a.sent();
                            if (!user || user.status !== 'active' || !user.merchantId)
                                throw new Error('商家身份已失效');
                            claimed = String(payload.merchantId || '');
                            role = String(payload.role || user.role).toLowerCase();
                            if (!['merchant', 'factory', 'store'].includes(role) && claimed !== user.merchantId) {
                                throw new Error('当前令牌不是商家令牌');
                            }
                            if (claimed && claimed !== user.merchantId)
                                throw new Error('商家身份已变更，请重新登录');
                            return [4 /*yield*/, this.prisma.merchant.findUnique({ where: { id: user.merchantId } })];
                        case 3:
                            merchant = _a.sent();
                            if (!merchant || merchant.status === 'disabled')
                                throw new Error('商户已停用');
                            previous = this.clients.get(socket);
                            this.clients.set(socket, {
                                userId: user.id,
                                merchantId: user.merchantId,
                                sessions: (previous === null || previous === void 0 ? void 0 : previous.sessions) || new Set(),
                                requestIds: (previous === null || previous === void 0 ? void 0 : previous.requestIds) || new Set(),
                                authenticatedAt: Date.now(),
                            });
                            this.send(socket, 'auth.ok', { userId: user.id, merchantId: user.merchantId, heartbeatMs: 30000 }, requestId);
                            return [3 /*break*/, 5];
                        case 4:
                            error_2 = _a.sent();
                            this.send(socket, 'auth.failed', { message: error_2 instanceof Error ? error_2.message : '令牌无效或已过期' }, requestId);
                            socket.close(4401, 'authentication failed');
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        HarmonyRealtimeService_1.prototype.ownSession = function (merchantId, sessionId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (!sessionId)
                        return [2 /*return*/, null];
                    return [2 /*return*/, this.prisma.chatSession.findFirst({ where: { id: sessionId, merchantId: merchantId } })];
                });
            });
        };
        HarmonyRealtimeService_1.prototype.joinSession = function (socket, state, sessionId, requestId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.ownSession(state.merchantId, sessionId)];
                        case 1:
                            if (!(_a.sent()))
                                throw new Error('无此会话访问权限');
                            state.sessions.add(sessionId);
                            this.send(socket, 'chat.joined', { sessionId: sessionId }, requestId);
                            return [2 /*return*/];
                    }
                });
            });
        };
        HarmonyRealtimeService_1.prototype.typing = function (socket, state, envelope) {
            return __awaiter(this, void 0, void 0, function () {
                var sessionId, payload;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            sessionId = String(((_a = envelope.data) === null || _a === void 0 ? void 0 : _a.sessionId) || '');
                            return [4 /*yield*/, this.ownSession(state.merchantId, sessionId)];
                        case 1:
                            if (!(_d.sent()))
                                throw new Error('无此会话访问权限');
                            payload = { sessionId: sessionId, fromRole: 'merchant', on: !!((_b = envelope.data) === null || _b === void 0 ? void 0 : _b.on) };
                            this.broadcastSession(sessionId, 'chat.typing', payload, socket);
                            (_c = this.legacyChatBridge) === null || _c === void 0 ? void 0 : _c.call(this, 'typing', sessionId, payload);
                            this.send(socket, 'ack', {}, envelope.requestId);
                            return [2 /*return*/];
                    }
                });
            });
        };
        HarmonyRealtimeService_1.prototype.read = function (socket, state, envelope) {
            return __awaiter(this, void 0, void 0, function () {
                var sessionId, payload;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            sessionId = String(((_a = envelope.data) === null || _a === void 0 ? void 0 : _a.sessionId) || '');
                            return [4 /*yield*/, this.ownSession(state.merchantId, sessionId)];
                        case 1:
                            if (!(_c.sent()))
                                throw new Error('无此会话访问权限');
                            return [4 /*yield*/, this.prisma.$transaction([
                                    this.prisma.chatMessage.updateMany({
                                        where: { sessionId: sessionId, sender: 'user', read: false },
                                        data: { read: true },
                                    }),
                                    this.prisma.chatSession.update({ where: { id: sessionId }, data: { unreadCount: 0 } }),
                                ])];
                        case 2:
                            _c.sent();
                            payload = { sessionId: sessionId, byRole: 'merchant' };
                            this.broadcastSession(sessionId, 'chat.read', payload, socket);
                            (_b = this.legacyChatBridge) === null || _b === void 0 ? void 0 : _b.call(this, 'read', sessionId, payload);
                            this.send(socket, 'ack', {}, envelope.requestId);
                            return [2 /*return*/];
                    }
                });
            });
        };
        HarmonyRealtimeService_1.prototype.sendChat = function (socket, state, envelope) {
            return __awaiter(this, void 0, void 0, function () {
                var sessionId, session, type, content, message, payload;
                var _a, _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            sessionId = String(((_a = envelope.data) === null || _a === void 0 ? void 0 : _a.sessionId) || '');
                            return [4 /*yield*/, this.ownSession(state.merchantId, sessionId)];
                        case 1:
                            session = _f.sent();
                            if (!session)
                                throw new Error('无此会话访问权限');
                            type = String(((_b = envelope.data) === null || _b === void 0 ? void 0 : _b.type) || 'text').toLowerCase();
                            content = String(((_c = envelope.data) === null || _c === void 0 ? void 0 : _c.content) || '').trim();
                            if (!['text', 'quick', 'image'].includes(type))
                                throw new Error('不支持的消息类型');
                            if (!content || content.length > 1000)
                                throw new Error('消息不能为空且不能超过 1000 个字符');
                            if (!(type === 'text' || type === 'quick')) return [3 /*break*/, 3];
                            if (!this.contentSecurity && process.env.NODE_ENV === 'production') {
                                throw new Error('内容安全服务暂不可用');
                            }
                            return [4 /*yield*/, ((_d = this.contentSecurity) === null || _d === void 0 ? void 0 : _d.assertTextSafe(content, { scope: 'mall', scene: 2 }))];
                        case 2:
                            _f.sent();
                            _f.label = 3;
                        case 3: return [4 /*yield*/, this.prisma.chatMessage.create({
                                data: { sessionId: sessionId, sender: 'merchant', type: type, content: content, read: false },
                            })];
                        case 4:
                            message = _f.sent();
                            return [4 /*yield*/, this.prisma.chatSession.update({
                                    where: { id: sessionId },
                                    data: { lastMessageAt: message.createdAt },
                                })];
                        case 5:
                            _f.sent();
                            payload = { sessionId: sessionId, message: message };
                            this.emitMerchant(state.merchantId, 'chat.message', payload);
                            (_e = this.legacyChatBridge) === null || _e === void 0 ? void 0 : _e.call(this, 'message', sessionId, payload);
                            this.send(socket, 'ack', { messageId: message.id }, envelope.requestId);
                            return [2 /*return*/];
                    }
                });
            });
        };
        HarmonyRealtimeService_1.prototype.broadcastSession = function (sessionId, event, data, except) {
            for (var _i = 0, _a = this.clients; _i < _a.length; _i++) {
                var _b = _a[_i], socket = _b[0], state = _b[1];
                if (socket !== except && state.sessions.has(sessionId))
                    this.send(socket, event, data);
            }
        };
        HarmonyRealtimeService_1.prototype.send = function (socket, event, data, requestId) {
            if (socket.readyState !== ws_1.WebSocket.OPEN)
                return;
            var envelope = { v: 1, event: event, requestId: requestId, ts: Date.now(), data: data };
            socket.send(JSON.stringify(envelope));
        };
        HarmonyRealtimeService_1.prototype.sweep = function () {
            for (var _i = 0, _a = this.server.clients; _i < _a.length; _i++) {
                var socket = _a[_i];
                var tracked = socket;
                if (tracked.harmonyAlive === false) {
                    socket.terminate();
                    continue;
                }
                tracked.harmonyAlive = false;
                socket.ping();
            }
        };
        return HarmonyRealtimeService_1;
    }());
    __setFunctionName(_classThis, "HarmonyRealtimeService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        HarmonyRealtimeService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return HarmonyRealtimeService = _classThis;
}();
exports.HarmonyRealtimeService = HarmonyRealtimeService;
