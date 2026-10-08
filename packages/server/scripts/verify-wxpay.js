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
/**
 * 微信支付 mchid + 证书 + APIv3 密钥 一致性自检
 *
 * 用法：cd /www/shangcheng/packages/server && tsx scripts/verify-wxpay.ts [mchid]
 *
 * 调微信支付 GET /v3/certificates（最轻量、无业务副作用的接口）
 * - 返回 200 → mchid + 证书 + serial 三者一致，可以正常下单
 * - 返回 401 → 签名/证书/mchid 不匹配
 *
 * 用此脚本分别试两个 mchid，哪个返回 200，就在 .env 里固定下来。
 */
var crypto_1 = require("crypto");
var fs_1 = require("fs");
var candidateMchid = process.argv[2] || process.env.WX_PAY_MCH_ID || '1745510292';
var serial = process.env.WX_PAY_CERT_SERIAL || '';
var keyPath = process.env.WX_PAY_KEY_PATH || '/www/shangcheng/secrets/wxpay/apiclient_key.pem';
function signRSA(message) {
    var pem = (0, fs_1.readFileSync)(keyPath, 'utf-8');
    var signer = (0, crypto_1.createSign)('RSA-SHA256');
    signer.update(message);
    return signer.sign(pem, 'base64');
}
function probe(mchid) {
    return __awaiter(this, void 0, void 0, function () {
        var method, urlPath, timestamp, nonce, message, signature, auth, r, text;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    method = 'GET';
                    urlPath = '/v3/certificates';
                    timestamp = Math.floor(Date.now() / 1000);
                    nonce = (0, crypto_1.randomBytes)(16).toString('hex');
                    message = [method, urlPath, timestamp, nonce, ''].join('\n') + '\n';
                    signature = signRSA(message);
                    auth = "WECHATPAY2-SHA256-RSA2048 mchid=\"".concat(mchid, "\",serial_no=\"").concat(serial, "\",timestamp=\"").concat(timestamp, "\",nonce_str=\"").concat(nonce, "\",signature=\"").concat(signature, "\"");
                    return [4 /*yield*/, fetch("https://api.mch.weixin.qq.com".concat(urlPath), {
                            method: method,
                            headers: {
                                Accept: 'application/json',
                                'Accept-Language': 'zh-CN',
                                'User-Agent': 'jingwei-verify/1.0',
                                Authorization: auth,
                            },
                        })];
                case 1:
                    r = _a.sent();
                    return [4 /*yield*/, r.text()];
                case 2:
                    text = _a.sent();
                    return [2 /*return*/, { status: r.status, body: text.slice(0, 500) }];
            }
        });
    });
}
;
(function () { return __awaiter(void 0, void 0, void 0, function () {
    var r;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log("\n>>> \u9A8C\u8BC1 mchid = ".concat(candidateMchid));
                console.log(">>> serial = ".concat(serial.slice(0, 8), "...").concat(serial.slice(-8)));
                console.log(">>> key = ".concat(keyPath, "\n"));
                return [4 /*yield*/, probe(candidateMchid)];
            case 1:
                r = _a.sent();
                console.log("HTTP ".concat(r.status));
                console.log(r.body);
                if (r.status === 200) {
                    console.log('\n✅ 此 mchid 配置正确，可以下单');
                }
                else if (r.status === 401) {
                    console.log('\n❌ 签名/mchid/证书 不匹配。错误详情见上面 body。');
                }
                else {
                    console.log("\n\u26A0\uFE0F  \u5176\u5B83\u54CD\u5E94\uFF08".concat(r.status, "\uFF09\uFF0C\u53EF\u80FD\u662F v3key \u6216\u522B\u7684\u95EE\u9898"));
                }
                return [2 /*return*/];
        }
    });
}); })().catch(function (e) {
    console.error('verify failed:', (e === null || e === void 0 ? void 0 : e.message) || e);
    process.exit(1);
});
