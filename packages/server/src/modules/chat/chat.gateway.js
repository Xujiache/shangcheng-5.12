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
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
exports.ChatGateway = void 0;
/**
 * 在线客服 WebSocket Gateway
 *
 * 路径：ws://<host>/ws/chat（被 nginx 反代到 :3400 同路径）
 *
 * 协议：
 *   client → server：
 *     - { type: 'auth', token: '<jwt>', role: 'user' | 'merchant' }
 *     - { type: 'join', sessionId: 'xxx' }
 *     - { type: 'leave', sessionId: 'xxx' }
 *     - { type: 'message', sessionId: 'xxx', kind: 'text', content: '...' }
 *     - { type: 'typing', sessionId: 'xxx', on: boolean }
 *     - { type: 'read', sessionId: 'xxx' }
 *
 *   server → client：
 *     - { type: 'ready' }
 *     - { type: 'message', sessionId, message: ChatMessage }
 *     - { type: 'typing', sessionId, fromRole, on }
 *     - { type: 'read', sessionId, byRole }
 *     - { type: 'error', message }
 *
 * 房间命名：session:<sessionId>
 *
 * 鉴权：握手后必须先发 auth，JWT 校验通过才能 join/message。
 * 用户只能 join 自己的会话；商家只能 join 自己 merchantId 名下的会话。
 */
var common_1 = require("@nestjs/common");
var websockets_1 = require("@nestjs/websockets");
var ChatGateway = function () {
    var _classDecorators = [(0, websockets_1.WebSocketGateway)({
            path: '/ws/chat',
            cors: { origin: true, credentials: true },
            transports: ['websocket', 'polling'],
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _server_decorators;
    var _server_initializers = [];
    var _server_extraInitializers = [];
    var _onAuth_decorators;
    var _onJoin_decorators;
    var _onLeave_decorators;
    var _onMessage_decorators;
    var _onTyping_decorators;
    var _onRead_decorators;
    var ChatGateway = _classThis = /** @class */ (function () {
        function ChatGateway_1(jwt, prisma, contentSecurity, harmonyRealtime, harmonyPush) {
            var _this = this;
            var _a;
            this.jwt = (__runInitializers(this, _instanceExtraInitializers), jwt);
            this.prisma = prisma;
            this.contentSecurity = contentSecurity;
            this.harmonyRealtime = harmonyRealtime;
            this.harmonyPush = harmonyPush;
            this.logger = new common_1.Logger(ChatGateway.name);
            this.server = __runInitializers(this, _server_initializers, void 0);
            __runInitializers(this, _server_extraInitializers);
            this.jwt = jwt;
            this.prisma = prisma;
            this.contentSecurity = contentSecurity;
            this.harmonyRealtime = harmonyRealtime;
            this.harmonyPush = harmonyPush;
            (_a = this.harmonyRealtime) === null || _a === void 0 ? void 0 : _a.registerLegacyChatBridge(function (event, sessionId, payload) {
                if (!_this.server)
                    return;
                _this.server.to("session:".concat(sessionId)).emit(event, payload);
            });
        }
        ChatGateway_1.prototype.handleConnection = function (client) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    this.logger.log("socket connected: ".concat(client.id));
                    client.emit('ready', { ts: Date.now() });
                    return [2 /*return*/];
                });
            });
        };
        ChatGateway_1.prototype.handleDisconnect = function (client) {
            this.logger.log("socket disconnected: ".concat(client.id));
        };
        /**
         * 1. 鉴权：握手后必须先发 auth 才能 join/message
         *
         * 安全 P0：role 完全从 JWT payload 中解析，**不接受**任何客户端传入的 role 字段。
         * 之前接受 `data.role` 让任何已登录用户都能把自己标成 merchant 加 merchant 房间，
         * 接收他商家的订单广播 / 售后单广播，等于把后台数据流推给任意外部用户。
         *
         * payload.role 取自登录时 signTokens 注入的字段（顾客=customer/promoter；
         * 商家=factory/store/merchant；后台=admin/platform/super-admin）。
         * 这里把 factory/store/merchant 视为商家 role，其余视为用户 role；
         * 想接 merchant 通道必须先在 User 表确实绑定到商户（findUnique by userId）。
         */
        ChatGateway_1.prototype.onAuth = function (client, data) {
            return __awaiter(this, void 0, void 0, function () {
                var payload, user, jwtRole, claimedMerchantId, boundMerchantId, hasVerifiedMerchantClaim, isMerchantRole, m, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 6, , 7]);
                            return [4 /*yield*/, this.jwt.verifyAsync(data.token)];
                        case 1:
                            payload = _b.sent();
                            return [4 /*yield*/, this.prisma.user.findUnique({ where: { id: payload.sub } })];
                        case 2:
                            user = _b.sent();
                            if (!user) {
                                client.emit('error', { message: '用户不存在' });
                                return [2 /*return*/];
                            }
                            jwtRole = String((payload === null || payload === void 0 ? void 0 : payload.role) || user.role || 'customer').toLowerCase();
                            claimedMerchantId = String((payload === null || payload === void 0 ? void 0 : payload.merchantId) || '');
                            boundMerchantId = String(user.merchantId || '');
                            hasVerifiedMerchantClaim = !!claimedMerchantId && !!boundMerchantId && claimedMerchantId === boundMerchantId;
                            isMerchantRole = ['factory', 'store', 'merchant'].includes(jwtRole) || hasVerifiedMerchantClaim;
                            if (!isMerchantRole) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.prisma.merchant.findUnique({ where: { userId: user.id } })];
                        case 3:
                            m = _b.sent();
                            if (!m) {
                                client.emit('error', { message: '当前账号未关联商户' });
                                return [2 /*return*/];
                            }
                            if (claimedMerchantId && claimedMerchantId !== m.id) {
                                client.emit('error', { message: '商户身份已失效，请重新登录' });
                                return [2 /*return*/];
                            }
                            client.data.role = 'merchant';
                            client.data.merchantId = m.id;
                            client.data.userId = user.id;
                            // 商家也进自己的 user 房间，资料更新同样同步
                            client.join("user:".concat(user.id));
                            // 商家额外进 merchant 房间（如以后要给商家广播订单等）
                            client.join("merchant:".concat(m.id));
                            return [3 /*break*/, 5];
                        case 4:
                            client.data.role = 'user';
                            client.data.userId = user.id;
                            // 用户进自己 user 房间，资料更新会推到所有 socket
                            client.join("user:".concat(user.id));
                            _b.label = 5;
                        case 5:
                            client.emit('authed', {
                                role: client.data.role,
                                userId: client.data.userId,
                                merchantId: client.data.merchantId,
                            });
                            return [3 /*break*/, 7];
                        case 6:
                            _a = _b.sent();
                            client.emit('error', { message: 'token 无效或过期' });
                            return [3 /*break*/, 7];
                        case 7: return [2 /*return*/];
                    }
                });
            });
        };
        /** 2. 加入会话房间（限自己的会话） */
        ChatGateway_1.prototype.onJoin = function (client, data) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!client.data.role) {
                                client.emit('error', { message: '未鉴权' });
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, this.findOwnSession(client, data.sessionId)];
                        case 1:
                            session = _a.sent();
                            if (!session) {
                                client.emit('error', { message: '无此会话访问权限' });
                                return [2 /*return*/];
                            }
                            client.join("session:".concat(data.sessionId));
                            client.emit('joined', { sessionId: data.sessionId });
                            return [2 /*return*/];
                    }
                });
            });
        };
        ChatGateway_1.prototype.onLeave = function (client, data) {
            client.leave("session:".concat(data.sessionId));
            client.emit('left', { sessionId: data.sessionId });
        };
        /** 3. 收发消息 */
        ChatGateway_1.prototype.onMessage = function (client, data) {
            return __awaiter(this, void 0, void 0, function () {
                var content, kind, session, error_1, sender, msg;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!client.data.role) {
                                client.emit('error', { message: '未鉴权' });
                                return [2 /*return*/];
                            }
                            content = String(data.content || '').trim();
                            if (!content)
                                return [2 /*return*/];
                            if (content.length > 1000) {
                                client.emit('error', { message: '消息不能超过 1000 个字符' });
                                return [2 /*return*/];
                            }
                            kind = String(data.kind || 'text').toLowerCase();
                            if (!['text', 'image', 'quick', 'product', 'order'].includes(kind)) {
                                client.emit('error', { message: '不支持的消息类型' });
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, this.findOwnSession(client, data.sessionId)];
                        case 1:
                            session = _b.sent();
                            if (!session) {
                                client.emit('error', { message: '无此会话访问权限' });
                                return [2 /*return*/];
                            }
                            if (!(kind === 'text' || kind === 'quick')) return [3 /*break*/, 5];
                            if (!this.contentSecurity && process.env.NODE_ENV === 'production') {
                                client.emit('error', { message: '内容安全服务暂不可用，请稍后重试' });
                                return [2 /*return*/];
                            }
                            _b.label = 2;
                        case 2:
                            _b.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, ((_a = this.contentSecurity) === null || _a === void 0 ? void 0 : _a.assertTextSafe(content, { scope: 'mall', scene: 2 }))];
                        case 3:
                            _b.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            error_1 = _b.sent();
                            client.emit('error', { message: (error_1 === null || error_1 === void 0 ? void 0 : error_1.message) || '消息未通过内容安全检测' });
                            return [2 /*return*/];
                        case 5:
                            sender = client.data.role === 'merchant' ? 'merchant' : 'user';
                            return [4 /*yield*/, this.prisma.chatMessage.create({
                                    data: {
                                        sessionId: data.sessionId,
                                        sender: sender,
                                        type: kind,
                                        content: content,
                                        read: false,
                                    },
                                })];
                        case 6:
                            msg = _b.sent();
                            return [4 /*yield*/, this.prisma.chatSession.update({
                                    where: { id: data.sessionId },
                                    data: __assign({ lastMessageAt: msg.createdAt || new Date() }, (sender === 'user' ? { unreadCount: { increment: 1 } } : {})),
                                })
                                // 广播到房间，包括发送方（让 UI 用 server 时间戳）
                            ];
                        case 7:
                            _b.sent();
                            // 广播到房间，包括发送方（让 UI 用 server 时间戳）
                            this.emitChatMessage(data.sessionId, msg, session);
                            return [2 /*return*/];
                    }
                });
            });
        };
        /** 4. 正在输入提示（不持久化） */
        ChatGateway_1.prototype.onTyping = function (client, data) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!client.data.role)
                                return [2 /*return*/];
                            if (!(data === null || data === void 0 ? void 0 : data.sessionId))
                                return [2 /*return*/];
                            return [4 /*yield*/, this.findOwnSession(client, data.sessionId)];
                        case 1:
                            session = _a.sent();
                            if (!session)
                                return [2 /*return*/];
                            client.to("session:".concat(data.sessionId)).emit('typing', {
                                sessionId: data.sessionId,
                                fromRole: client.data.role,
                                on: !!data.on,
                            });
                            return [2 /*return*/];
                    }
                });
            });
        };
        /** 5. 已读回执 */
        ChatGateway_1.prototype.onRead = function (client, data) {
            return __awaiter(this, void 0, void 0, function () {
                var session, otherSender;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!client.data.role)
                                return [2 /*return*/];
                            return [4 /*yield*/, this.findOwnSession(client, data.sessionId)];
                        case 1:
                            session = _a.sent();
                            if (!session)
                                return [2 /*return*/];
                            otherSender = client.data.role === 'merchant' ? 'user' : 'merchant';
                            return [4 /*yield*/, this.prisma.chatMessage.updateMany({
                                    where: { sessionId: data.sessionId, sender: otherSender, read: false },
                                    data: { read: true },
                                })
                                // ChatSession.unreadCount 只表示商家侧未读；顾客已读不能清掉商家未读。
                            ];
                        case 2:
                            _a.sent();
                            if (!(client.data.role === 'merchant')) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.prisma.chatSession.update({
                                    where: { id: data.sessionId },
                                    data: { unreadCount: 0 },
                                })];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4:
                            client.to("session:".concat(data.sessionId)).emit('read', {
                                sessionId: data.sessionId,
                                byRole: client.data.role,
                            });
                            return [2 /*return*/];
                    }
                });
            });
        };
        /** 校验当前 socket 是否有该会话访问权限 */
        ChatGateway_1.prototype.findOwnSession = function (client, sessionId) {
            return __awaiter(this, void 0, void 0, function () {
                var where;
                return __generator(this, function (_a) {
                    if (!sessionId)
                        return [2 /*return*/, null];
                    where = { id: sessionId };
                    if (client.data.role === 'merchant') {
                        if (!client.data.merchantId)
                            return [2 /*return*/, null];
                        where.merchantId = client.data.merchantId;
                    }
                    else {
                        if (!client.data.userId)
                            return [2 /*return*/, null];
                        where.userId = client.data.userId;
                    }
                    return [2 /*return*/, this.prisma.chatSession.findFirst({ where: where })];
                });
            });
        };
        /**
         * 给某用户的所有在线设备推送资料更新（PATCH /u/profile 后调用）
         * 客户端事件名：'user:update' → payload 是完整序列化后的 User 对象
         */
        ChatGateway_1.prototype.broadcastUserUpdate = function (userId, user) {
            if (!this.server)
                return;
            this.server.to("user:".concat(userId)).emit('user:update', { user: user });
        };
        /**
         * 商家端实时通知 —— 新订单
         *
         * 触发点：user-mp.service.createOrder() 订单建单成功（status=pending_payment）。
         * 接收方：商家所有已 auth 的 socket（房间 merchant:<merchantId>）。
         * 用法：merchant-app 的 useMerchantNotifyStream 订阅 'order:new' 后即可弹通知/刷新待发货数。
         *
         * 失败保护：自身 try/catch；外部 service 也再裹一层避免推送异常阻塞主业务。
         */
        ChatGateway_1.prototype.emitOrderNew = function (merchantId, payload) {
            var _a, _b, _c;
            if (!merchantId)
                return;
            try {
                (_a = this.server) === null || _a === void 0 ? void 0 : _a.to("merchant:".concat(merchantId)).emit('order:new', payload);
                (_b = this.harmonyRealtime) === null || _b === void 0 ? void 0 : _b.emitMerchant(merchantId, 'order.new', payload);
                void ((_c = this.harmonyPush) === null || _c === void 0 ? void 0 : _c.sendToMerchant(merchantId, {
                    topic: 'orders',
                    title: '收到新订单',
                    body: (payload === null || payload === void 0 ? void 0 : payload.no) ? "\u8BA2\u5355 ".concat(payload.no, " \u5DF2\u521B\u5EFA\uFF0C\u8BF7\u53CA\u65F6\u67E5\u770B") : '收到一笔新订单，请及时查看',
                    data: {
                        route: 'order-detail',
                        id: (payload === null || payload === void 0 ? void 0 : payload.id) || (payload === null || payload === void 0 ? void 0 : payload.orderId) || '',
                        status: (payload === null || payload === void 0 ? void 0 : payload.status) || '',
                    },
                    appMessageId: (payload === null || payload === void 0 ? void 0 : payload.id) ? "order-new-".concat(payload.id) : undefined,
                }));
            }
            catch (e) {
                this.logger.warn("emitOrderNew failed merchantId=".concat(merchantId, ": ").concat((e === null || e === void 0 ? void 0 : e.message) || e));
            }
        };
        /**
         * 商家端实时通知 —— 订单状态变更
         *
         * 触发点示例：
         *   - 微信支付回调后订单转 pending_shipment
         *   - 商家发货 → shipped
         *   - 用户确认收货 → completed
         *   - 用户取消 → cancelled
         *
         * payload 建议字段：{ orderId, no?, status, updatedAt }
         */
        ChatGateway_1.prototype.emitOrderUpdate = function (merchantId, payload) {
            var _a, _b, _c;
            if (!merchantId)
                return;
            try {
                (_a = this.server) === null || _a === void 0 ? void 0 : _a.to("merchant:".concat(merchantId)).emit('order:update', payload);
                (_b = this.harmonyRealtime) === null || _b === void 0 ? void 0 : _b.emitMerchant(merchantId, 'order.update', payload);
                var status_1 = String((payload === null || payload === void 0 ? void 0 : payload.status) || '');
                var statusText = {
                    pending_shipment: '已付款，等待发货',
                    shipped: '已发货',
                    completed: '已完成',
                    cancelled: '已取消',
                    after_sale: '进入售后处理',
                };
                if (statusText[status_1]) {
                    var id = (payload === null || payload === void 0 ? void 0 : payload.orderId) || (payload === null || payload === void 0 ? void 0 : payload.id) || '';
                    void ((_c = this.harmonyPush) === null || _c === void 0 ? void 0 : _c.sendToMerchant(merchantId, {
                        topic: 'orders',
                        title: '订单状态更新',
                        body: (payload === null || payload === void 0 ? void 0 : payload.no)
                            ? "\u8BA2\u5355 ".concat(payload.no, " ").concat(statusText[status_1])
                            : "\u4E00\u7B14\u8BA2\u5355".concat(statusText[status_1]),
                        data: { route: 'order-detail', id: id, status: status_1 },
                        appMessageId: id ? "order-".concat(status_1, "-").concat(id) : undefined,
                    }));
                }
            }
            catch (e) {
                this.logger.warn("emitOrderUpdate failed merchantId=".concat(merchantId, ": ").concat((e === null || e === void 0 ? void 0 : e.message) || e));
            }
        };
        /**
         * 商家端实时通知 —— 新售后单
         *
         * 触发点：用户发起退款/售后申请时（当前仓库无对外创建退款的 controller；
         * 预留接口给未来 user-mp 退款入口或 admin 代发起退款接入）。
         */
        ChatGateway_1.prototype.emitRefundNew = function (merchantId, payload) {
            var _a, _b, _c;
            if (!merchantId)
                return;
            try {
                (_a = this.server) === null || _a === void 0 ? void 0 : _a.to("merchant:".concat(merchantId)).emit('refund:new', payload);
                (_b = this.harmonyRealtime) === null || _b === void 0 ? void 0 : _b.emitMerchant(merchantId, 'refund.new', payload);
                var id = (payload === null || payload === void 0 ? void 0 : payload.refundId) || (payload === null || payload === void 0 ? void 0 : payload.id) || '';
                var status_2 = String((payload === null || payload === void 0 ? void 0 : payload.status) || 'pending');
                void ((_c = this.harmonyPush) === null || _c === void 0 ? void 0 : _c.sendToMerchant(merchantId, {
                    topic: 'refunds',
                    title: status_2 === 'pending' ? '收到新的售后申请' : '售后状态更新',
                    body: (payload === null || payload === void 0 ? void 0 : payload.no) ? "\u552E\u540E\u5355 ".concat(payload.no, " \u6709\u65B0\u7684\u5904\u7406\u52A8\u6001") : '有一笔售后申请需要查看',
                    data: { route: 'after-sale-detail', id: id, status: status_2 },
                    appMessageId: id ? "refund-".concat(status_2, "-").concat(id) : undefined,
                }));
            }
            catch (e) {
                this.logger.warn("emitRefundNew failed merchantId=".concat(merchantId, ": ").concat((e === null || e === void 0 ? void 0 : e.message) || e));
            }
        };
        /**
         * HTTP REST 入口（user-mp 的 chatSend / merchant 的 chatSend）发完消息后，
         * 通过本方法把同一条 ChatMessage 同步推送到房间，让对方在 WS 长连中即时收到。
         *
         * 此前 HTTP 链路只写 DB，对方需要等下次 chatMessages 拉接口才能看到消息，
         * 体验上等于"客服没收到消息" —— 这是 P1 体验断点。
         *
         * 注意：
         *   - WS 链路（onMessage 内部 emit）已带广播，仅 HTTP 链路缺这一步
         *   - 失败 fire-and-forget，不阻塞 HTTP 主流程；DB 已落库的消息丢推送也不影响后续轮询
         *   - 仅推送给已 join(`session:<sessionId>`) 的 socket；用户/商家未在线就跳过
         */
        /**
         * 同时推送会话详情事件和列表级事件。
         * chat:message 发到 merchant/user 身份房间，列表页无需 join 最多100个 session 房间。
         */
        ChatGateway_1.prototype.emitChatMessage = function (sessionId, message, session) {
            var _a, _b, _c, _d, _e;
            if (!sessionId)
                return;
            try {
                (_a = this.server) === null || _a === void 0 ? void 0 : _a.to("session:".concat(sessionId)).emit('message', { sessionId: sessionId, message: message });
                var payload = { sessionId: sessionId, message: message };
                if (session === null || session === void 0 ? void 0 : session.merchantId) {
                    (_b = this.server) === null || _b === void 0 ? void 0 : _b.to("merchant:".concat(session.merchantId)).emit('chat:message', payload);
                    (_c = this.harmonyRealtime) === null || _c === void 0 ? void 0 : _c.emitChatMessage(sessionId, session.merchantId, message);
                    if ((message === null || message === void 0 ? void 0 : message.sender) === 'user') {
                        var content = (message === null || message === void 0 ? void 0 : message.type) === 'image'
                            ? '[图片]'
                            : String((message === null || message === void 0 ? void 0 : message.content) || '客户发来一条新消息').slice(0, 80);
                        void ((_d = this.harmonyPush) === null || _d === void 0 ? void 0 : _d.sendToMerchant(session.merchantId, {
                            topic: 'chat',
                            title: '客户发来新消息',
                            body: content,
                            data: { route: 'chat-detail', id: sessionId },
                            appMessageId: (message === null || message === void 0 ? void 0 : message.id) ? "chat-".concat(message.id) : undefined,
                        }));
                    }
                }
                if (session === null || session === void 0 ? void 0 : session.userId) {
                    (_e = this.server) === null || _e === void 0 ? void 0 : _e.to("user:".concat(session.userId)).emit('chat:message', payload);
                }
            }
            catch (e) {
                this.logger.warn("emitChatMessage failed sessionId=".concat(sessionId, ": ").concat((e === null || e === void 0 ? void 0 : e.message) || e));
            }
        };
        ChatGateway_1.prototype.emitReadReceipt = function (sessionId, byRole) {
            var _this = this;
            if (!this.server || !sessionId)
                return;
            try {
                var payload_1 = { sessionId: sessionId, byRole: byRole };
                this.server.to("session:".concat(sessionId)).emit('read', payload_1);
                // HarmonyOS NEXT uses a separate pure-JSON socket. Resolve the owning merchant
                // asynchronously so customer read receipts also reach native merchant clients.
                void this.prisma.chatSession
                    .findUnique({ where: { id: sessionId }, select: { merchantId: true } })
                    .then(function (session) {
                    var _a;
                    if (session === null || session === void 0 ? void 0 : session.merchantId)
                        (_a = _this.harmonyRealtime) === null || _a === void 0 ? void 0 : _a.emitMerchant(session.merchantId, 'chat.read', payload_1);
                })
                    .catch(function () { });
            }
            catch (e) {
                this.logger.warn("emitReadReceipt failed sessionId=".concat(sessionId, ": ").concat((e === null || e === void 0 ? void 0 : e.message) || e));
            }
        };
        ChatGateway_1.prototype.isUserOnline = function (userId) {
            var _a, _b, _c, _d;
            if (!this.server || !userId)
                return false;
            try {
                var rooms = (_c = (_b = (_a = this.server) === null || _a === void 0 ? void 0 : _a.sockets) === null || _b === void 0 ? void 0 : _b.adapter) === null || _c === void 0 ? void 0 : _c.rooms;
                return !!((_d = rooms === null || rooms === void 0 ? void 0 : rooms.get("user:".concat(userId))) === null || _d === void 0 ? void 0 : _d.size);
            }
            catch (_e) {
                return false;
            }
        };
        return ChatGateway_1;
    }());
    __setFunctionName(_classThis, "ChatGateway");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _server_decorators = [(0, websockets_1.WebSocketServer)()];
        _onAuth_decorators = [(0, websockets_1.SubscribeMessage)('auth')];
        _onJoin_decorators = [(0, websockets_1.SubscribeMessage)('join')];
        _onLeave_decorators = [(0, websockets_1.SubscribeMessage)('leave')];
        _onMessage_decorators = [(0, websockets_1.SubscribeMessage)('message')];
        _onTyping_decorators = [(0, websockets_1.SubscribeMessage)('typing')];
        _onRead_decorators = [(0, websockets_1.SubscribeMessage)('read')];
        __esDecorate(_classThis, null, _onAuth_decorators, { kind: "method", name: "onAuth", static: false, private: false, access: { has: function (obj) { return "onAuth" in obj; }, get: function (obj) { return obj.onAuth; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _onJoin_decorators, { kind: "method", name: "onJoin", static: false, private: false, access: { has: function (obj) { return "onJoin" in obj; }, get: function (obj) { return obj.onJoin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _onLeave_decorators, { kind: "method", name: "onLeave", static: false, private: false, access: { has: function (obj) { return "onLeave" in obj; }, get: function (obj) { return obj.onLeave; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _onMessage_decorators, { kind: "method", name: "onMessage", static: false, private: false, access: { has: function (obj) { return "onMessage" in obj; }, get: function (obj) { return obj.onMessage; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _onTyping_decorators, { kind: "method", name: "onTyping", static: false, private: false, access: { has: function (obj) { return "onTyping" in obj; }, get: function (obj) { return obj.onTyping; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _onRead_decorators, { kind: "method", name: "onRead", static: false, private: false, access: { has: function (obj) { return "onRead" in obj; }, get: function (obj) { return obj.onRead; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, null, _server_decorators, { kind: "field", name: "server", static: false, private: false, access: { has: function (obj) { return "server" in obj; }, get: function (obj) { return obj.server; }, set: function (obj, value) { obj.server = value; } }, metadata: _metadata }, _server_initializers, _server_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ChatGateway = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ChatGateway = _classThis;
}();
exports.ChatGateway = ChatGateway;
