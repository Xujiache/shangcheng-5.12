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
exports.HuaweiIapServerService = void 0;
var common_1 = require("@nestjs/common");
var node_crypto_1 = require("node:crypto");
var node_fs_1 = require("node:fs");
var undici_1 = require("undici");
/**
 * HarmonyOS IAP server API client.
 *
 * Huawei's current HarmonyOS API does not use the legacy OAuth client secret.
 * Every request is bound to its exact JSON body through the SHA-256 `digest`
 * claim and signed with the AppGallery IAP server key (ES256). Keeping this in
 * a dedicated service prevents a plain callback envelope from ever becoming
 * an entitlement authority.
 */
var HuaweiIapServerService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var HuaweiIapServerService = _classThis = /** @class */ (function () {
        function HuaweiIapServerService_1() {
        }
        HuaweiIapServerService_1.prototype.isConfigured = function () {
            return !!this.getCredentials();
        };
        HuaweiIapServerService_1.prototype.querySubscriptionStatus = function (purchaseToken, purchaseOrderId) {
            return __awaiter(this, void 0, void 0, function () {
                var credentials, body, payload, jwsSubGroupStatus;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            credentials = this.getCredentials();
                            if (!credentials) {
                                throw new common_1.ServiceUnavailableException('华为 IAP 服务端密钥尚未配置');
                            }
                            body = JSON.stringify({ purchaseToken: purchaseToken, purchaseOrderId: purchaseOrderId });
                            return [4 /*yield*/, this.post(credentials, '/subscription/harmony/v1/application/subscription/status/query', body)];
                        case 1:
                            payload = _a.sent();
                            jwsSubGroupStatus = String(payload.jwsSubGroupStatus || '').trim();
                            if (!jwsSubGroupStatus) {
                                throw new common_1.BadGatewayException('华为 IAP 状态查询缺少签名结果');
                            }
                            return [2 /*return*/, { jwsSubGroupStatus: jwsSubGroupStatus }];
                    }
                });
            });
        };
        HuaweiIapServerService_1.prototype.queryOrderStatus = function (purchaseToken, purchaseOrderId) {
            return __awaiter(this, void 0, void 0, function () {
                var credentials, body, payload, jwsPurchaseOrder;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            credentials = this.getCredentials();
                            if (!credentials) {
                                throw new common_1.ServiceUnavailableException('华为 IAP 服务端密钥尚未配置');
                            }
                            body = JSON.stringify({ purchaseToken: purchaseToken, purchaseOrderId: purchaseOrderId });
                            return [4 /*yield*/, this.post(credentials, '/order/harmony/v1/application/order/status/query', body)];
                        case 1:
                            payload = _a.sent();
                            jwsPurchaseOrder = String(payload.jwsPurchaseOrder || payload.jwsPurchaseOrderStatus || payload.jwsOrderStatus || '').trim();
                            if (!jwsPurchaseOrder) {
                                throw new common_1.BadGatewayException('华为 IAP 订单查询缺少签名结果');
                            }
                            return [2 /*return*/, { jwsPurchaseOrder: jwsPurchaseOrder }];
                    }
                });
            });
        };
        HuaweiIapServerService_1.prototype.post = function (credentials, path, body) {
            return __awaiter(this, void 0, void 0, function () {
                var authorization, endpoint, response, _a, text, payload;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            authorization = this.createAuthorization(credentials, body);
                            endpoint = "".concat(credentials.rootUrl).concat(path);
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, (0, undici_1.request)(endpoint, {
                                    method: 'POST',
                                    headers: {
                                        accept: 'application/json',
                                        authorization: "Bearer ".concat(authorization),
                                        'content-type': 'application/json;charset=UTF-8',
                                    },
                                    body: body,
                                    headersTimeout: 8000,
                                    bodyTimeout: 8000,
                                })];
                        case 2:
                            response = _b.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            _a = _b.sent();
                            throw new common_1.ServiceUnavailableException('华为 IAP 状态查询暂时不可用');
                        case 4: return [4 /*yield*/, response.body.text()];
                        case 5:
                            text = _b.sent();
                            payload = {};
                            try {
                                payload = text ? JSON.parse(text) : {};
                            }
                            catch (_c) {
                                throw new common_1.BadGatewayException('华为 IAP 状态查询返回了无效数据');
                            }
                            if (response.statusCode < 200 || response.statusCode >= 300 || payload.responseCode !== '0') {
                                throw new common_1.BadGatewayException("\u534E\u4E3A IAP \u72B6\u6001\u67E5\u8BE2\u5931\u8D25: ".concat(payload.responseCode || response.statusCode));
                            }
                            return [2 /*return*/, payload];
                    }
                });
            });
        };
        HuaweiIapServerService_1.prototype.getCredentials = function () {
            if (this.credentialsCache !== undefined)
                return this.credentialsCache;
            try {
                var applicationId = String(process.env.HUAWEI_IAP_APPLICATION_ID || '').trim();
                var issuerId = String(process.env.HUAWEI_IAP_ISSUER_ID || '').trim();
                var keyId = String(process.env.HUAWEI_IAP_KEY_ID || '').trim();
                var privateKeyPath = String(process.env.HUAWEI_IAP_PRIVATE_KEY_FILE || '').trim();
                var privateKey = String(privateKeyPath
                    ? (0, node_fs_1.readFileSync)(privateKeyPath, 'utf8')
                    : process.env.HUAWEI_IAP_PRIVATE_KEY || '')
                    .replace(/\\n/g, '\n')
                    .trim();
                var configuredRoot = String(process.env.HUAWEI_IAP_ROOT_URL || '').trim();
                var rootUrl = (configuredRoot || 'https://iap.cloud.huawei.com').replace(/\/+$/, '');
                if (!applicationId || !issuerId || !keyId || !privateKey || !/^https:\/\//.test(rootUrl)) {
                    this.credentialsCache = null;
                    return null;
                }
                (0, node_crypto_1.createPrivateKey)(privateKey);
                this.credentialsCache = { applicationId: applicationId, issuerId: issuerId, keyId: keyId, privateKey: privateKey, rootUrl: rootUrl };
            }
            catch (_a) {
                this.credentialsCache = null;
            }
            return this.credentialsCache;
        };
        HuaweiIapServerService_1.prototype.createAuthorization = function (credentials, body) {
            var now = Math.floor(Date.now() / 1000);
            var header = this.base64Url({ alg: 'ES256', kid: credentials.keyId, typ: 'JWT' });
            var payload = this.base64Url({
                iss: credentials.issuerId,
                digest: (0, node_crypto_1.createHash)('sha256').update(body, 'utf8').digest('hex'),
                aud: 'iap-v1',
                exp: now + 3600,
                iat: now,
                aid: credentials.applicationId,
            });
            var signingInput = "".concat(header, ".").concat(payload);
            var signature = (0, node_crypto_1.sign)('sha256', Buffer.from(signingInput, 'utf8'), {
                key: credentials.privateKey,
                dsaEncoding: 'ieee-p1363',
            }).toString('base64url');
            return "".concat(signingInput, ".").concat(signature);
        };
        HuaweiIapServerService_1.prototype.base64Url = function (value) {
            return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
        };
        return HuaweiIapServerService_1;
    }());
    __setFunctionName(_classThis, "HuaweiIapServerService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        HuaweiIapServerService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return HuaweiIapServerService = _classThis;
}();
exports.HuaweiIapServerService = HuaweiIapServerService;
