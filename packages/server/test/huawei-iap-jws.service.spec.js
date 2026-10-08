"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var crypto_1 = require("crypto");
var huawei_iap_jws_service_1 = require("../src/modules/harmony-merchant/huawei-iap-jws.service");
function compactJws(payload, alg, privateKey) {
    var header = Buffer.from(JSON.stringify({ alg: alg, typ: 'JWT' })).toString('base64url');
    var body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    var data = Buffer.from("".concat(header, ".").concat(body));
    var signature = alg === 'PS256'
        ? (0, crypto_1.sign)('sha256', data, {
            key: privateKey,
            padding: crypto_1.constants.RSA_PKCS1_PSS_PADDING,
            saltLength: crypto_1.constants.RSA_PSS_SALTLEN_DIGEST,
        })
        : (0, crypto_1.sign)('RSA-SHA256', data, privateKey);
    return "".concat(header, ".").concat(body, ".").concat(signature.toString('base64url'));
}
describe('HuaweiIapJwsService', function () {
    var keys = (0, crypto_1.generateKeyPairSync)('rsa', { modulusLength: 2048 });
    var privateKey = keys.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
    var publicKey = keys.publicKey.export({ format: 'pem', type: 'spki' }).toString();
    var service;
    beforeEach(function () {
        process.env.HUAWEI_IAP_PUBLIC_KEY = publicKey;
        service = new huawei_iap_jws_service_1.HuaweiIapJwsService();
    });
    afterAll(function () { return delete process.env.HUAWEI_IAP_PUBLIC_KEY; });
    it.each(['RS256', 'PS256'])('verifies %s compact JWS', function (alg) {
        var token = compactJws({ productId: 'member.monthly' }, alg, privateKey);
        expect(service.verifyCompactJws(token)).toEqual({ productId: 'member.monthly' });
    });
    it('extracts an active signed subscription purchase', function () {
        var signed = compactJws({
            lastSubscriptionStatus: {
                status: 1,
                expirationTime: 1893456000000,
                lastPurchaseOrder: {
                    productId: 'member.monthly',
                    purchaseToken: 'purchase-token-1',
                    purchaseOrderId: 'provider-order-1',
                    applicationUserName: 'HMI123',
                },
            },
        }, 'PS256', privateKey);
        var result = service.verifyPurchaseData(JSON.stringify({ jwsSubscriptionStatus: signed }), 'subscription');
        expect(result).toMatchObject({
            productId: 'member.monthly',
            purchaseToken: 'purchase-token-1',
            providerOrderId: 'provider-order-1',
            applicationUserName: 'HMI123',
            expirationTime: 1893456000000,
        });
    });
    it('accepts a signed inactive subscription status for authoritative expiry handling', function () {
        var signed = compactJws({
            lastSubscriptionStatus: {
                status: 2,
                renewStatus: 0,
                expirationTime: 1700000000000,
                lastPurchaseOrder: {
                    productId: 'member.monthly',
                    purchaseToken: 'purchase-token-1',
                    purchaseOrderId: 'provider-order-1',
                    refundStatus: 1,
                },
            },
        }, 'PS256', privateKey);
        expect(service.verifySubscriptionStatus(signed)).toMatchObject({
            active: false,
            autoRenew: false,
            refunded: true,
            status: '2',
            productId: 'member.monthly',
        });
    });
    it('verifies a paid consumable order returned by the server status API', function () {
        var signed = compactJws({
            purchaseOrder: {
                productId: 'member.addon',
                purchaseToken: 'purchase-token-addon',
                purchaseOrderId: 'provider-order-addon',
                purchaseStatus: 'PAID',
            },
        }, 'RS256', privateKey);
        expect(service.verifyOrderStatus(signed)).toMatchObject({
            paid: true,
            refunded: false,
            productId: 'member.addon',
        });
    });
    it('rejects a modified payload', function () {
        var signed = compactJws({ productId: 'member.monthly' }, 'RS256', privateKey);
        var parts = signed.split('.');
        parts[1] = Buffer.from(JSON.stringify({ productId: 'member.yearly' })).toString('base64url');
        expect(function () { return service.verifyCompactJws(parts.join('.')); }).toThrow('验签失败');
    });
    it('fails closed when the IAP public key is missing', function () {
        delete process.env.HUAWEI_IAP_PUBLIC_KEY;
        var signed = compactJws({ productId: 'member.monthly' }, 'RS256', privateKey);
        expect(function () { return service.verifyCompactJws(signed); }).toThrow('尚未完成服务端公钥配置');
    });
});
