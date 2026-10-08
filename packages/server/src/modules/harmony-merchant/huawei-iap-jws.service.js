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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HuaweiIapJwsService = void 0;
var common_1 = require("@nestjs/common");
var crypto_1 = require("crypto");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
function asObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value
        : null;
}
function readPath(source, path) {
    var current = source;
    for (var _i = 0, path_1 = path; _i < path_1.length; _i++) {
        var key = path_1[_i];
        var object = asObject(current);
        if (!object)
            return undefined;
        current = object[key];
    }
    return current;
}
function firstString(source, paths) {
    for (var _i = 0, paths_1 = paths; _i < paths_1.length; _i++) {
        var path = paths_1[_i];
        var value = readPath(source, path);
        if (typeof value === 'string' && value.trim())
            return value.trim();
    }
    return '';
}
function firstNumber(source, paths) {
    for (var _i = 0, paths_2 = paths; _i < paths_2.length; _i++) {
        var path = paths_2[_i];
        var value = readPath(source, path);
        var parsed = typeof value === 'number' ? value : Number(value);
        if (Number.isFinite(parsed))
            return parsed;
    }
    return undefined;
}
function firstValue(source, paths) {
    for (var _i = 0, paths_3 = paths; _i < paths_3.length; _i++) {
        var path = paths_3[_i];
        var value = readPath(source, path);
        if (value !== undefined && value !== null)
            return value;
    }
    return undefined;
}
function asBoolean(value, fallback) {
    if (typeof value === 'boolean')
        return value;
    if (value === 1 || value === '1')
        return true;
    if (value === 0 || value === '0')
        return false;
    var normalized = String(value !== null && value !== void 0 ? value : '')
        .trim()
        .toUpperCase();
    if (['TRUE', 'ACTIVE', 'ENABLED', 'ON'].includes(normalized))
        return true;
    if (['FALSE', 'INACTIVE', 'DISABLED', 'OFF'].includes(normalized))
        return false;
    return fallback;
}
var HuaweiIapJwsService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var HuaweiIapJwsService = _classThis = /** @class */ (function () {
        function HuaweiIapJwsService_1() {
        }
        HuaweiIapJwsService_1.prototype.resolvePublicKey = function () {
            var _a;
            var configured = String(process.env.HUAWEI_IAP_PUBLIC_KEY || '').trim();
            if (!configured) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '华为 IAP 尚未完成服务端公钥配置');
            }
            var pem = configured.includes('BEGIN PUBLIC KEY')
                ? configured.replace(/\\n/g, '\n')
                : "-----BEGIN PUBLIC KEY-----\n".concat(((_a = configured.match(/.{1,64}/g)) === null || _a === void 0 ? void 0 : _a.join('\n')) || configured, "\n-----END PUBLIC KEY-----");
            try {
                return (0, crypto_1.createPublicKey)(pem);
            }
            catch (_b) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '华为 IAP 公钥格式无效');
            }
        };
        HuaweiIapJwsService_1.prototype.verifyCompactJws = function (jws) {
            var parts = String(jws || '').split('.');
            if (parts.length !== 3 || parts.some(function (part) { return !part; })) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, '华为支付凭证不是有效 JWS');
            }
            var header;
            var payload;
            try {
                header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
                payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
            }
            catch (_a) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, '华为支付凭证无法解析');
            }
            var alg = String(header.alg || '');
            if (alg !== 'PS256' && alg !== 'RS256') {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, "\u4E0D\u652F\u6301\u7684\u534E\u4E3A\u652F\u4ED8\u7B7E\u540D\u7B97\u6CD5: ".concat(alg || 'unknown'));
            }
            var data = Buffer.from("".concat(parts[0], ".").concat(parts[1]), 'utf8');
            var signature = Buffer.from(parts[2], 'base64url');
            var key = this.resolvePublicKey();
            var ok = alg === 'PS256'
                ? (0, crypto_1.verify)('sha256', data, {
                    key: key,
                    padding: crypto_1.constants.RSA_PKCS1_PSS_PADDING,
                    saltLength: crypto_1.constants.RSA_PSS_SALTLEN_DIGEST,
                }, signature)
                : (0, crypto_1.verify)('RSA-SHA256', data, key, signature);
            if (!ok)
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, '华为支付凭证验签失败');
            return payload;
        };
        HuaweiIapJwsService_1.prototype.verifyPurchaseData = function (purchaseData, productType) {
            var _a, _b, _c;
            if (!purchaseData || purchaseData.length > 128 * 1024) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, 'purchaseData 格式不正确');
            }
            var outer;
            try {
                outer = purchaseData.trim().startsWith('{')
                    ? JSON.parse(purchaseData)
                    : { compactJws: purchaseData };
            }
            catch (_d) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, '华为支付结果无法解析');
            }
            var jws = firstString(outer, [
                ['jwsSubscriptionStatus'],
                ['jwsPurchaseOrder'],
                ['jwsPurchaseOrderStatus'],
                ['jwsOrderStatus'],
                ['compactJws'],
            ]);
            if (!jws)
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, '华为支付结果缺少签名凭证');
            var payload = this.verifyCompactJws(jws);
            var subscription = asObject(payload.lastSubscriptionStatus);
            var order = asObject(subscription === null || subscription === void 0 ? void 0 : subscription.lastPurchaseOrder) || asObject(payload.purchaseOrder) || payload;
            if (productType === 'subscription') {
                var status_1 = (_a = subscription === null || subscription === void 0 ? void 0 : subscription.status) !== null && _a !== void 0 ? _a : payload.status;
                if (!(status_1 === 1 || status_1 === '1' || String(status_1).toUpperCase() === 'ACTIVE')) {
                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, '订阅当前未生效');
                }
            }
            else {
                var state = (_c = (_b = order.purchaseStatus) !== null && _b !== void 0 ? _b : order.purchaseState) !== null && _c !== void 0 ? _c : order.status;
                var normalized = String(state !== null && state !== void 0 ? state : '').toUpperCase();
                if (!(state === 0 ||
                    state === 1 ||
                    normalized === 'SUCCESS' ||
                    normalized === 'PAID' ||
                    normalized === 'PURCHASED')) {
                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, '商品订单当前未支付');
                }
            }
            var productId = firstString(order, [['productId'], ['productID']]);
            var purchaseToken = firstString(order, [['purchaseToken']]);
            var providerOrderId = firstString(order, [['purchaseOrderId'], ['orderId']]);
            if (!productId || !purchaseToken || !providerOrderId) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, '华为支付凭证缺少商品或订单标识');
            }
            return {
                payload: payload,
                productId: productId,
                purchaseToken: purchaseToken,
                providerOrderId: providerOrderId,
                applicationUserName: firstString(order, [['applicationUserName']]) || undefined,
                developerPayload: firstString(order, [['developerPayload']]) || undefined,
                expirationTime: firstNumber(payload, [
                    ['lastSubscriptionStatus', 'expirationTime'],
                    ['lastSubscriptionStatus', 'expireTime'],
                    ['expirationTime'],
                ]),
            };
        };
        /**
         * Verifies the authoritative JWS returned by Huawei's server-side
         * subscription status API. Unlike verifyPurchaseData, inactive states are
         * valid input here because expiry, cancellation and refund callbacks must be
         * processed without treating the signed status as a malformed purchase.
         */
        HuaweiIapJwsService_1.prototype.verifySubscriptionStatus = function (jwsSubGroupStatus) {
            var _a, _b;
            var payload = this.verifyCompactJws(jwsSubGroupStatus);
            var subscription = asObject(payload.lastSubscriptionStatus);
            if (!subscription) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, '华为订阅状态缺少最新订阅信息');
            }
            var order = asObject(subscription.lastPurchaseOrder);
            if (!order) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, '华为订阅状态缺少最新订单信息');
            }
            var productId = firstString(order, [['productId'], ['productID']]);
            var purchaseToken = firstString(order, [['purchaseToken']]);
            var providerOrderId = firstString(order, [['purchaseOrderId'], ['orderId']]);
            if (!productId || !purchaseToken || !providerOrderId) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, '华为订阅状态缺少商品或订单标识');
            }
            var rawStatus = (_a = subscription.status) !== null && _a !== void 0 ? _a : payload.status;
            var normalizedStatus = String(rawStatus !== null && rawStatus !== void 0 ? rawStatus : '')
                .trim()
                .toUpperCase();
            var active = rawStatus === 1 || rawStatus === '1' || normalizedStatus === 'ACTIVE';
            var autoRenewValue = firstValue(payload, [
                ['lastSubscriptionStatus', 'autoRenewStatus'],
                ['lastSubscriptionStatus', 'renewStatus'],
                ['lastSubscriptionStatus', 'autoRenewing'],
                ['lastSubscriptionStatus', 'lastPurchaseOrder', 'autoRenewStatus'],
                ['lastSubscriptionStatus', 'lastPurchaseOrder', 'renewStatus'],
                ['lastSubscriptionStatus', 'lastPurchaseOrder', 'autoRenewing'],
            ]);
            var refundValue = firstValue(payload, [
                ['lastSubscriptionStatus', 'lastPurchaseOrder', 'refundStatus'],
                ['lastSubscriptionStatus', 'lastPurchaseOrder', 'refunded'],
                ['lastSubscriptionStatus', 'refundStatus'],
            ]);
            var orderState = String((_b = firstValue(payload, [
                ['lastSubscriptionStatus', 'lastPurchaseOrder', 'purchaseStatus'],
                ['lastSubscriptionStatus', 'lastPurchaseOrder', 'purchaseState'],
            ])) !== null && _b !== void 0 ? _b : '').toUpperCase();
            var refundTime = firstNumber(payload, [
                ['lastSubscriptionStatus', 'lastPurchaseOrder', 'refundTime'],
                ['lastSubscriptionStatus', 'lastPurchaseOrder', 'refundedAt'],
            ]);
            return {
                payload: payload,
                productId: productId,
                purchaseToken: purchaseToken,
                providerOrderId: providerOrderId,
                applicationUserName: firstString(order, [['applicationUserName']]) || undefined,
                developerPayload: firstString(order, [['developerPayload']]) || undefined,
                expirationTime: firstNumber(payload, [
                    ['lastSubscriptionStatus', 'expirationTime'],
                    ['lastSubscriptionStatus', 'expireTime'],
                    ['lastSubscriptionStatus', 'lastPurchaseOrder', 'expirationTime'],
                ]),
                active: active,
                autoRenew: asBoolean(autoRenewValue, active),
                refunded: asBoolean(refundValue, false) ||
                    Boolean(refundTime && refundTime > 0) ||
                    /REFUND|REVOK/.test(orderState),
                status: normalizedStatus || 'UNKNOWN',
            };
        };
        HuaweiIapJwsService_1.prototype.verifyOrderStatus = function (jwsPurchaseOrder) {
            var _a, _b;
            var payload = this.verifyCompactJws(jwsPurchaseOrder);
            var order = asObject(payload.purchaseOrder) || payload;
            var productId = firstString(order, [['productId'], ['productID']]);
            var purchaseToken = firstString(order, [['purchaseToken']]);
            var providerOrderId = firstString(order, [['purchaseOrderId'], ['orderId']]);
            if (!productId || !purchaseToken || !providerOrderId) {
                throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, '华为订单状态缺少商品或订单标识');
            }
            var rawState = (_b = (_a = order.purchaseStatus) !== null && _a !== void 0 ? _a : order.purchaseState) !== null && _b !== void 0 ? _b : order.status;
            var normalized = String(rawState !== null && rawState !== void 0 ? rawState : '')
                .trim()
                .toUpperCase();
            var refundValue = firstValue(order, [['refundStatus'], ['refunded']]);
            var refundTime = firstNumber(order, [['refundTime'], ['refundedAt']]);
            var refunded = asBoolean(refundValue, false) ||
                Boolean(refundTime && refundTime > 0) ||
                /REFUND|REVOK/.test(normalized);
            var paid = !refunded &&
                (rawState === 0 ||
                    rawState === 1 ||
                    ['SUCCESS', 'PAID', 'PURCHASED', 'COMPLETED'].includes(normalized));
            return {
                payload: payload,
                productId: productId,
                purchaseToken: purchaseToken,
                providerOrderId: providerOrderId,
                applicationUserName: firstString(order, [['applicationUserName']]) || undefined,
                developerPayload: firstString(order, [['developerPayload']]) || undefined,
                paid: paid,
                refunded: refunded,
                status: normalized || 'UNKNOWN',
            };
        };
        return HuaweiIapJwsService_1;
    }());
    __setFunctionName(_classThis, "HuaweiIapJwsService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        HuaweiIapJwsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return HuaweiIapJwsService = _classThis;
}();
exports.HuaweiIapJwsService = HuaweiIapJwsService;
