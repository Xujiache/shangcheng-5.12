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
var node_crypto_1 = require("node:crypto");
var huawei_iap_server_service_1 = require("../src/modules/harmony-merchant/huawei-iap-server.service");
describe('HuaweiIapServerService', function () {
    var keys = (0, node_crypto_1.generateKeyPairSync)('ec', { namedCurve: 'prime256v1' });
    var privateKey = keys.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
    var publicKey = keys.publicKey.export({ format: 'pem', type: 'spki' }).toString();
    beforeEach(function () {
        process.env.HUAWEI_IAP_APPLICATION_ID = '123456789';
        process.env.HUAWEI_IAP_ISSUER_ID = 'issuer-1';
        process.env.HUAWEI_IAP_KEY_ID = 'key-1';
        process.env.HUAWEI_IAP_PRIVATE_KEY = privateKey;
    });
    afterEach(function () {
        delete process.env.HUAWEI_IAP_APPLICATION_ID;
        delete process.env.HUAWEI_IAP_ISSUER_ID;
        delete process.env.HUAWEI_IAP_KEY_ID;
        delete process.env.HUAWEI_IAP_PRIVATE_KEY;
        delete process.env.HUAWEI_IAP_PRIVATE_KEY_FILE;
        delete process.env.HUAWEI_IAP_ROOT_URL;
    });
    it('binds an ES256 server JWT to the exact request body digest', function () {
        var service = new huawei_iap_server_service_1.HuaweiIapServerService();
        var credentials = service.getCredentials();
        var body = JSON.stringify({ purchaseToken: 'token-1', purchaseOrderId: 'order-1' });
        var token = service.createAuthorization(credentials, body);
        var _a = token.split('.'), headerPart = _a[0], payloadPart = _a[1], signaturePart = _a[2];
        var header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8'));
        var payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
        expect(header).toEqual({ alg: 'ES256', kid: 'key-1', typ: 'JWT' });
        expect(payload).toMatchObject({ iss: 'issuer-1', aud: 'iap-v1', aid: '123456789' });
        expect(payload.digest).toBe((0, node_crypto_1.createHash)('sha256').update(body).digest('hex'));
        expect(payload.exp - payload.iat).toBe(3600);
        expect((0, node_crypto_1.verify)('sha256', Buffer.from("".concat(headerPart, ".").concat(payloadPart)), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(signaturePart, 'base64url'))).toBe(true);
    });
    it('fails closed when any AppGallery IAP server credential is missing', function () { return __awaiter(void 0, void 0, void 0, function () {
        var service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    delete process.env.HUAWEI_IAP_PRIVATE_KEY;
                    service = new huawei_iap_server_service_1.HuaweiIapServerService();
                    expect(service.isConfigured()).toBe(false);
                    return [4 /*yield*/, expect(service.querySubscriptionStatus('token', 'order')).rejects.toMatchObject({
                            status: 503,
                        })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
