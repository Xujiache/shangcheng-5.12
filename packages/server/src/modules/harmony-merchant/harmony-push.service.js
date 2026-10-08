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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HarmonyPushService = void 0;
var node_crypto_1 = require("node:crypto");
var node_fs_1 = require("node:fs");
var common_1 = require("@nestjs/common");
var undici_1 = require("undici");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
var HarmonyPushService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var HarmonyPushService = _classThis = /** @class */ (function () {
        function HarmonyPushService_1(prisma) {
            this.prisma = prisma;
            this.logger = new common_1.Logger(HarmonyPushService.name);
            this.jwtCache = null;
            this.warnedMissingConfig = false;
        }
        HarmonyPushService_1.prototype.register = function (userId, merchantId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var token, locale, row;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            token = String(dto.token || '').trim();
                            if (token.length < 16 || token.length > 4096) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, 'Push token 格式不正确');
                            }
                            locale = String(dto.locale || 'zh-CN').slice(0, 32);
                            return [4 /*yield*/, this.prisma.harmonyPushDevice.upsert({
                                    where: { token: token },
                                    create: {
                                        token: token,
                                        userId: userId,
                                        merchantId: merchantId,
                                        deviceId: dto.deviceId ? String(dto.deviceId).slice(0, 256) : null,
                                        locale: locale,
                                        enabled: true,
                                    },
                                    update: {
                                        userId: userId,
                                        merchantId: merchantId,
                                        deviceId: dto.deviceId ? String(dto.deviceId).slice(0, 256) : null,
                                        locale: locale,
                                        enabled: true,
                                        lastSeenAt: new Date(),
                                    },
                                    select: { id: true, locale: true, enabled: true, lastSeenAt: true },
                                })];
                        case 1:
                            row = _a.sent();
                            return [2 /*return*/, { ok: true, device: row }];
                    }
                });
            });
        };
        HarmonyPushService_1.prototype.unregister = function (userId, merchantId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var token, deviceId, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            token = String(dto.token || '').trim();
                            deviceId = String(dto.deviceId || '').trim();
                            if (!token && !deviceId) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请提供 token 或 deviceId');
                            }
                            return [4 /*yield*/, this.prisma.harmonyPushDevice.updateMany({
                                    where: __assign({ userId: userId, merchantId: merchantId }, (token ? { token: token } : { deviceId: deviceId })),
                                    data: { enabled: false, lastSeenAt: new Date() },
                                })];
                        case 1:
                            result = _a.sent();
                            return [2 /*return*/, { ok: true, disabled: result.count }];
                    }
                });
            });
        };
        HarmonyPushService_1.prototype.getPreferences = function (merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                var row;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.harmonyPushPreference.findUnique({ where: { merchantId: merchantId } })];
                        case 1:
                            row = _a.sent();
                            return [2 /*return*/, row
                                    ? { orders: row.orders, refunds: row.refunds, chat: row.chat }
                                    : { orders: true, refunds: true, chat: true }];
                    }
                });
            });
        };
        HarmonyPushService_1.prototype.setPreferences = function (merchantId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var current, next, row;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getPreferences(merchantId)];
                        case 1:
                            current = _a.sent();
                            next = {
                                orders: typeof dto.orders === 'boolean' ? dto.orders : current.orders,
                                refunds: typeof dto.refunds === 'boolean' ? dto.refunds : current.refunds,
                                chat: typeof dto.chat === 'boolean' ? dto.chat : current.chat,
                            };
                            return [4 /*yield*/, this.prisma.harmonyPushPreference.upsert({
                                    where: { merchantId: merchantId },
                                    create: __assign({ merchantId: merchantId }, next),
                                    update: next,
                                })];
                        case 2:
                            row = _a.sent();
                            return [2 /*return*/, { orders: row.orders, refunds: row.refunds, chat: row.chat }];
                    }
                });
            });
        };
        /**
         * 向某个商户当前启用的 HarmonyOS NEXT 设备发送 Push Kit 通知。
         *
         * 推送是业务写入后的 best-effort 副作用：华为网络或配置异常只能记录日志，
         * 不能让下单、售后或客服消息回滚。调用方因此无需再包裹 try/catch。
         */
        HarmonyPushService_1.prototype.sendToMerchant = function (merchantId, message) {
            return __awaiter(this, void 0, void 0, function () {
                var preferences, devices, tokens, credentials, sent, batchSize, offset, batch, ok, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 7, , 8]);
                            if (!merchantId)
                                return [2 /*return*/, { sent: 0, skipped: true, reason: 'no-device' }];
                            return [4 /*yield*/, this.getPreferences(merchantId)];
                        case 1:
                            preferences = _a.sent();
                            if (!preferences[message.topic]) {
                                return [2 /*return*/, { sent: 0, skipped: true, reason: 'preference-disabled' }];
                            }
                            return [4 /*yield*/, this.prisma.harmonyPushDevice.findMany({
                                    where: { merchantId: merchantId, enabled: true },
                                    select: { token: true },
                                    orderBy: { lastSeenAt: 'desc' },
                                })];
                        case 2:
                            devices = _a.sent();
                            tokens = __spreadArray([], new Set(devices.map(function (item) { return item.token; }).filter(Boolean)), true);
                            if (!tokens.length)
                                return [2 /*return*/, { sent: 0, skipped: true, reason: 'no-device' }];
                            credentials = this.getCredentials();
                            if (!credentials) {
                                if (!this.warnedMissingConfig) {
                                    this.warnedMissingConfig = true;
                                    this.logger.warn('Harmony Push Kit 未配置：请设置 HUAWEI_PUSH_PROJECT_ID 和服务账号密钥文件');
                                }
                                return [2 /*return*/, { sent: 0, skipped: true, reason: 'not-configured' }];
                            }
                            sent = 0;
                            batchSize = process.env.HUAWEI_PUSH_TEST_MESSAGE === '1' ? 10 : 500;
                            offset = 0;
                            _a.label = 3;
                        case 3:
                            if (!(offset < tokens.length)) return [3 /*break*/, 6];
                            batch = tokens.slice(offset, offset + batchSize);
                            return [4 /*yield*/, this.sendBatch(credentials, batch, message)];
                        case 4:
                            ok = _a.sent();
                            if (ok)
                                sent += batch.length;
                            _a.label = 5;
                        case 5:
                            offset += batchSize;
                            return [3 /*break*/, 3];
                        case 6: return [2 /*return*/, sent > 0
                                ? { sent: sent, skipped: false }
                                : { sent: 0, skipped: true, reason: 'provider-failed' }];
                        case 7:
                            error_1 = _a.sent();
                            this.logger.warn("Harmony Push Kit \u4E0B\u53D1\u5931\u8D25 merchantId=".concat(merchantId, ": ").concat((error_1 === null || error_1 === void 0 ? void 0 : error_1.message) || error_1));
                            return [2 /*return*/, { sent: 0, skipped: true, reason: 'provider-failed' }];
                        case 8: return [2 /*return*/];
                    }
                });
            });
        };
        HarmonyPushService_1.prototype.isConfigured = function () {
            return !!this.getCredentials();
        };
        HarmonyPushService_1.prototype.getCredentials = function () {
            if (this.credentialsCache !== undefined)
                return this.credentialsCache;
            try {
                var account = {};
                var accountPath = String(process.env.HUAWEI_PUSH_SERVICE_ACCOUNT_FILE || '').trim();
                if (accountPath) {
                    account = JSON.parse((0, node_fs_1.readFileSync)(accountPath, 'utf8'));
                }
                var projectId = String(process.env.HUAWEI_PUSH_PROJECT_ID || '').trim();
                var keyId = String(account.key_id || account.keyId || process.env.HUAWEI_PUSH_KEY_ID || '').trim();
                var subAccount = String(account.sub_account || account.subAccount || process.env.HUAWEI_PUSH_SUB_ACCOUNT || '').trim();
                var privateKey = String(account.private_key || account.privateKey || process.env.HUAWEI_PUSH_PRIVATE_KEY || '')
                    .replace(/\\n/g, '\n')
                    .trim();
                this.credentialsCache =
                    projectId && keyId && subAccount && privateKey
                        ? { projectId: projectId, keyId: keyId, subAccount: subAccount, privateKey: privateKey }
                        : null;
            }
            catch (error) {
                this.logger.warn("\u8BFB\u53D6 Harmony Push Kit \u670D\u52A1\u8D26\u53F7\u5931\u8D25: ".concat((error === null || error === void 0 ? void 0 : error.message) || error));
                this.credentialsCache = null;
            }
            return this.credentialsCache;
        };
        HarmonyPushService_1.prototype.getServiceJwt = function (credentials) {
            var now = Math.floor(Date.now() / 1000);
            if (this.jwtCache && this.jwtCache.expiresAt > now + 60)
                return this.jwtCache.value;
            var header = this.base64Url({ kid: credentials.keyId, typ: 'JWT', alg: 'PS256' });
            var payload = this.base64Url({
                iss: credentials.subAccount,
                aud: 'https://oauth-login.cloud.huawei.com/oauth2/v3/token',
                iat: now,
                exp: now + 3600,
            });
            var signingInput = "".concat(header, ".").concat(payload);
            var signature = (0, node_crypto_1.sign)('sha256', Buffer.from(signingInput), {
                key: credentials.privateKey,
                padding: node_crypto_1.constants.RSA_PKCS1_PSS_PADDING,
                saltLength: node_crypto_1.constants.RSA_PSS_SALTLEN_DIGEST,
            }).toString('base64url');
            var value = "".concat(signingInput, ".").concat(signature);
            this.jwtCache = { value: value, expiresAt: now + 3600 };
            return value;
        };
        HarmonyPushService_1.prototype.sendBatch = function (credentials, tokens, message) {
            return __awaiter(this, void 0, void 0, function () {
                var notification, response, raw, data, success;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            notification = this.buildNotification(message);
                            return [4 /*yield*/, (0, undici_1.request)("https://push-api.cloud.huawei.com/v3/".concat(encodeURIComponent(credentials.projectId), "/messages:send"), {
                                    method: 'POST',
                                    headers: {
                                        Authorization: "Bearer ".concat(this.getServiceJwt(credentials)),
                                        'Content-Type': 'application/json; charset=UTF-8',
                                        'push-type': '0',
                                    },
                                    body: JSON.stringify({
                                        payload: { notification: notification },
                                        target: { token: tokens },
                                        pushOptions: __assign({ ttl: 86400 }, (process.env.HUAWEI_PUSH_TEST_MESSAGE === '1' ? { testMessage: true } : {})),
                                    }),
                                    headersTimeout: 10000,
                                    bodyTimeout: 10000,
                                })];
                        case 1:
                            response = _a.sent();
                            return [4 /*yield*/, response.body.text()];
                        case 2:
                            raw = _a.sent();
                            data = {};
                            try {
                                data = raw ? JSON.parse(raw) : {};
                            }
                            catch (_b) {
                                // 保留 raw 进入下面的可观察错误日志。
                            }
                            success = response.statusCode >= 200 &&
                                response.statusCode < 300 &&
                                (!data.code || data.code === '80000000');
                            if (!success) {
                                this.logger.warn("Harmony Push Kit \u8FD4\u56DE\u5931\u8D25 status=".concat(response.statusCode, " code=").concat(data.code || '-', " requestId=").concat(data.requestId || '-', " message=").concat(data.msg || raw.slice(0, 300)));
                            }
                            return [2 /*return*/, success];
                    }
                });
            });
        };
        HarmonyPushService_1.prototype.buildNotification = function (message) {
            var title = this.cleanNotificationText(message.title, 128) || '经纬科技商家端';
            var body = this.cleanNotificationText(message.body, 512) || '您有一条新的业务通知';
            if (body === title)
                body = "".concat(body, "\uFF0C\u8BF7\u8FDB\u5165\u5E94\u7528\u67E5\u770B\u8BE6\u60C5");
            var clickData = {};
            for (var _i = 0, _a = Object.entries(message.data || {}); _i < _a.length; _i++) {
                var _b = _a[_i], key = _b[0], value = _b[1];
                if (value !== undefined && value !== null)
                    clickData[key] = String(value).slice(0, 512);
            }
            var appMessageId = String(message.appMessageId || '')
                .trim()
                .slice(0, 128);
            if (appMessageId)
                clickData.eventId = appMessageId;
            var notification = {
                category: String(process.env.HUAWEI_PUSH_CATEGORY || 'MARKETING').trim() || 'MARKETING',
                title: title,
                body: body,
                clickAction: __assign({ actionType: 1, action: String(process.env.HUAWEI_PUSH_CLICK_ACTION || '').trim() ||
                        'top.ewsn.jingwei.merchant.action.OPEN_DETAIL' }, (Object.keys(clickData).length ? { data: clickData } : {})),
                // 前台已经通过原生 WebSocket 实时刷新，避免同时再弹一条系统横幅。
                foregroundShow: false,
            };
            if (appMessageId)
                notification.appMessageId = appMessageId;
            return notification;
        };
        HarmonyPushService_1.prototype.base64Url = function (value) {
            return Buffer.from(JSON.stringify(value)).toString('base64url');
        };
        HarmonyPushService_1.prototype.cleanNotificationText = function (value, maxLength) {
            return String(value || '')
                .replace(/[\u0000-\u001f\u007f]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, maxLength);
        };
        return HarmonyPushService_1;
    }());
    __setFunctionName(_classThis, "HarmonyPushService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        HarmonyPushService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return HarmonyPushService = _classThis;
}();
exports.HarmonyPushService = HarmonyPushService;
