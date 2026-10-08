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
exports.WxPayService = void 0;
/**
 * 微信支付 v3 · JSAPI 下单（小程序内支付）
 *
 * 流程：
 *   1. 用户在小程序里点"立即支付" → 前端调 /api/v1/u/orders/:id/pay
 *   2. 后端 prepay() 调微信支付 v3 /v3/pay/transactions/jsapi 拿 prepay_id
 *   3. 用 prepay_id 生成"小程序调起支付参数"（appId, timeStamp, nonceStr, package, signType, paySign）
 *   4. 返回给前端，前端 uni.requestPayment(params)
 *   5. 用户付完 → 微信回调 /api/v1/payments/wechat/notify
 *   6. 回调里校验签名 + 更新订单 status=paid
 *
 * 用到的 env：
 *   WX_MINIAPP_APPID   小程序 AppID
 *   WX_PAY_MCH_ID      商户号（申请中）
 *   WX_PAY_API_V3_KEY  APIv3 密钥（商户平台设置）
 *   WX_PAY_KEY_PATH    商户私钥文件（apiclient_key.pem）
 *   WX_PAY_CERT_PATH   商户证书文件（apiclient_cert.pem）
 *   WX_PAY_NOTIFY_URL  支付结果回调地址（https://ewsn.top/...）
 *   WX_PAY_PUB_KEY_ID  微信支付公钥 ID（新模式 Wechatpay-Serial 比对）
 *   WX_PAY_PUB_KEY_PATH 微信支付公钥 .pem 路径（验签用）
 *
 * 资金安全策略（不分环境）：
 *   - createMiniPay：env 未配齐 → 直接抛错，绝不返回占位 prepay，
 *     避免"未付款也能拿货"的资金风险（开发期请配真实沙箱凭证）
 *   - verifyNotify：未配齐 / 公钥缺失 → 直接拒绝回调，绝不放行未验签的回调
 *   - createRefund：env 未配齐 → 直接抛错，绝不返回占位退款
 */
var common_1 = require("@nestjs/common");
var crypto_1 = require("crypto");
var fs_1 = require("fs");
var WxPayService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var WxPayService = _classThis = /** @class */ (function () {
        function WxPayService_1() {
            this.logger = new common_1.Logger(WxPayService.name);
        }
        /** 当前是否真实可用（4 个 env + 2 个 pem 文件都到位） */
        WxPayService_1.prototype.isReady = function () {
            return (!!process.env.WX_MINIAPP_APPID &&
                !!process.env.WX_PAY_MCH_ID &&
                !!process.env.WX_PAY_API_V3_KEY &&
                !!process.env.WX_PAY_KEY_PATH &&
                (0, fs_1.existsSync)(process.env.WX_PAY_KEY_PATH || ''));
        };
        /** JSAPI 下单 → 返回小程序调起支付所需的全部字段 */
        WxPayService_1.prototype.createMiniPay = function (args) {
            return __awaiter(this, void 0, void 0, function () {
                var appid, mchid, notifyUrl, keyPath, body, url, method, bodyStr, auth, r, resp, pkg, timeStamp, nonceStr, signStr, paySign;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.isReady()) {
                                // 资金 P0：不分环境一律抛错，绝不返回任何 mock 支付参数
                                throw new Error('微信支付未配置（缺商户号/API V3 密钥/证书），暂不可下单');
                            }
                            appid = args.appid || process.env.WX_MINIAPP_APPID;
                            mchid = process.env.WX_PAY_MCH_ID;
                            notifyUrl = args.notifyUrl || process.env.WX_PAY_NOTIFY_URL;
                            keyPath = process.env.WX_PAY_KEY_PATH;
                            body = {
                                appid: appid,
                                mchid: mchid,
                                description: args.description,
                                out_trade_no: args.outTradeNo,
                                notify_url: notifyUrl,
                                attach: args.attach,
                                amount: { total: args.totalFen, currency: 'CNY' },
                                payer: { openid: args.openid },
                            };
                            url = 'https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi';
                            method = 'POST';
                            bodyStr = JSON.stringify(body);
                            return [4 /*yield*/, this.buildAuthHeader(method, '/v3/pay/transactions/jsapi', bodyStr, keyPath)];
                        case 1:
                            auth = _a.sent();
                            return [4 /*yield*/, fetch(url, {
                                    method: method,
                                    headers: {
                                        'Content-Type': 'application/json',
                                        Accept: 'application/json',
                                        'Accept-Language': 'zh-CN',
                                        Authorization: auth,
                                    },
                                    body: bodyStr,
                                })];
                        case 2:
                            r = _a.sent();
                            return [4 /*yield*/, r.json()];
                        case 3:
                            resp = _a.sent();
                            if (!resp.prepay_id) {
                                this.logger.error("[wxpay] jsapi prepay failed: ".concat(JSON.stringify(resp)));
                                throw new Error("\u5FAE\u4FE1\u652F\u4ED8\u4E0B\u5355\u5931\u8D25\uFF1A".concat(resp.message || resp.code || 'unknown'));
                            }
                            pkg = "prepay_id=".concat(resp.prepay_id);
                            timeStamp = String(Math.floor(Date.now() / 1000));
                            nonceStr = (0, crypto_1.randomBytes)(16).toString('hex');
                            signStr = [appid, timeStamp, nonceStr, pkg, ''].join('\n');
                            paySign = this.signRSA(signStr, keyPath);
                            return [2 /*return*/, {
                                    appId: appid,
                                    timeStamp: timeStamp,
                                    nonceStr: nonceStr,
                                    package: pkg,
                                    signType: 'RSA',
                                    paySign: paySign,
                                }];
                    }
                });
            });
        };
        /** 构造 v3 Authorization 头 */
        WxPayService_1.prototype.buildAuthHeader = function (method, urlPath, body, keyPath) {
            return __awaiter(this, void 0, void 0, function () {
                var mchid, serialNo, timestamp, nonce, message, signature;
                return __generator(this, function (_a) {
                    mchid = process.env.WX_PAY_MCH_ID;
                    serialNo = process.env.WX_PAY_CERT_SERIAL || '';
                    timestamp = Math.floor(Date.now() / 1000);
                    nonce = (0, crypto_1.randomBytes)(16).toString('hex');
                    message = [method, urlPath, timestamp, nonce, body].join('\n') + '\n';
                    signature = this.signRSA(message, keyPath);
                    return [2 /*return*/, "WECHATPAY2-SHA256-RSA2048 mchid=\"".concat(mchid, "\",serial_no=\"").concat(serialNo, "\",timestamp=\"").concat(timestamp, "\",nonce_str=\"").concat(nonce, "\",signature=\"").concat(signature, "\"")];
                });
            });
        };
        WxPayService_1.prototype.signRSA = function (message, keyPath) {
            var pem = (0, fs_1.readFileSync)(keyPath, 'utf-8');
            var signer = (0, crypto_1.createSign)('RSA-SHA256');
            signer.update(message);
            return signer.sign(pem, 'base64');
        };
        /**
         * 回调签名校验（新版"微信支付公钥"模式）—— 严格安全策略
         *
         * 微信回调请求头里会带：
         *   Wechatpay-Timestamp
         *   Wechatpay-Nonce
         *   Wechatpay-Serial    ← 现在等于 PUB_KEY_ID_xxx（新模式）
         *   Wechatpay-Signature ← Base64 RSA-SHA256(timestamp\nnonce\nbody\n) 签名
         *
         * 验证流程：
         *   1. 用 Wechatpay-Serial 在本地查找对应公钥（新模式下就用 WX_PAY_PUB_KEY_ID 对应的 .pem）
         *   2. 用公钥 verify(message) → 是否匹配签名
         *
         * 关键修复（资金安全 P0）：
         *   - 之前的非生产环境会"未配置就放行"，这给了开发期 Bypass 真实签名的可能，
         *     即任何人构造一个回调就能把订单标已付。
         *   - 现在不论环境，未配置微信支付就一律拒绝处理回调；
         *     开发期商家想本地联调真实支付，请配真实沙箱凭证。
         *   - 公钥缺失同样直接拒绝，绝不放行未验签的回调。
         */
        WxPayService_1.prototype.verifyNotify = function (headers, bodyRaw) {
            return __awaiter(this, void 0, void 0, function () {
                var timestamp, nonce, serial, signature, tsNum, skewSec, pubKeyId, pubKeyPath, pubKey, message, verifier, ok;
                return __generator(this, function (_a) {
                    if (!this.isReady()) {
                        this.logger.error('[wxpay notify] 微信支付未配置（缺商户号/API V3 密钥/证书），拒绝处理回调');
                        return [2 /*return*/, false];
                    }
                    timestamp = headers['wechatpay-timestamp'] || headers['Wechatpay-Timestamp'];
                    nonce = headers['wechatpay-nonce'] || headers['Wechatpay-Nonce'];
                    serial = headers['wechatpay-serial'] || headers['Wechatpay-Serial'];
                    signature = headers['wechatpay-signature'] || headers['Wechatpay-Signature'];
                    if (!timestamp || !nonce || !signature) {
                        this.logger.warn('[wxpay notify] 缺少必需的微信支付签名头');
                        return [2 /*return*/, false];
                    }
                    tsNum = Number(timestamp);
                    if (!Number.isFinite(tsNum)) {
                        this.logger.warn("[wxpay notify] Wechatpay-Timestamp \u4E0D\u662F\u6709\u6548\u6570\u5B57\uFF1A".concat(timestamp));
                        return [2 /*return*/, false];
                    }
                    skewSec = Math.abs(Date.now() / 1000 - tsNum);
                    if (skewSec > 300) {
                        this.logger.warn("[wxpay notify] \u65F6\u95F4\u6233\u8D85\u51FA \u00B15min \u7A97\u53E3\uFF08skew=".concat(skewSec.toFixed(1), "s\uFF09\uFF0C\u7591\u4F3C\u56DE\u653E\uFF0C\u62D2\u7EDD"));
                        return [2 /*return*/, false];
                    }
                    pubKeyId = process.env.WX_PAY_PUB_KEY_ID || '';
                    pubKeyPath = process.env.WX_PAY_PUB_KEY_PATH || '';
                    // 新模式：Wechatpay-Serial 应该匹配我们配置的 PUB_KEY_ID
                    if (pubKeyId && serial && serial !== pubKeyId) {
                        this.logger.warn("[wxpay notify] Wechatpay-Serial \u4E0D\u5339\u914D\u672C\u5730\u516C\u94A5 ID\u3002expected=".concat(pubKeyId, " got=").concat(serial));
                        return [2 /*return*/, false];
                    }
                    if (!pubKeyPath || !(0, fs_1.existsSync)(pubKeyPath)) {
                        this.logger.error("[wxpay notify] \u7F3A\u5C11\u5FAE\u4FE1\u652F\u4ED8\u516C\u94A5\u6587\u4EF6\uFF1A".concat(pubKeyPath, "\uFF0C\u62D2\u7EDD\u56DE\u8C03"));
                        return [2 /*return*/, false];
                    }
                    pubKey = (0, fs_1.readFileSync)(pubKeyPath, 'utf-8');
                    message = "".concat(timestamp, "\n").concat(nonce, "\n").concat(bodyRaw, "\n");
                    verifier = (0, crypto_1.createVerify)('RSA-SHA256');
                    verifier.update(message);
                    ok = verifier.verify(pubKey, signature, 'base64');
                    if (!ok)
                        this.logger.warn('[wxpay notify] 签名验证失败');
                    return [2 /*return*/, ok];
                });
            });
        };
        /**
         * 申请微信支付 v3 退款
         *
         * 接口：POST https://api.mch.weixin.qq.com/v3/refund/domestic/refunds
         *
         * 资金安全策略（不分环境）：
         *   - env 未配齐 → 直接抛错，绝不返回任何 mock 退款，
         *     防"凭空退钱"（开发期请配真实沙箱凭证）
         *   - 退款金额单位：元（内部 * 100 → 分）
         *
         * 返回：
         *   - { refundId, status: 'PROCESSING' | 'SUCCESS' }
         *   - SUCCESS 表示微信侧已即时确认（少见，多数为 PROCESSING + 异步回调）
         *   - 调用方应把 refundId 持久化，等待 wxpay 异步退款结果通知
         *
         * 注意：
         *   - 当前没有抽出独立的"通用 v3 POST 调用器"，因此这里直接复用 buildAuthHeader/signRSA，
         *     与 createMiniPay 风格保持一致
         *   - 真实微信会校验 out_refund_no 幂等：同一 out_refund_no 重发会返回先前结果
         *     业务侧务必为同一退款单复用同一 outRefundNo（refundId）
         */
        WxPayService_1.prototype.createRefund = function (params) {
            return __awaiter(this, void 0, void 0, function () {
                var notifyUrl, keyPath, body, bodyStr, urlPath, auth, r, resp, status;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!params.outTradeNo || !params.outRefundNo) {
                                throw new Error('createRefund: outTradeNo / outRefundNo 必填');
                            }
                            if (!(params.refundAmount > 0) || !(params.totalAmount > 0)) {
                                throw new Error('createRefund: 金额必须为正');
                            }
                            if (params.refundAmount > params.totalAmount) {
                                throw new Error('createRefund: 退款金额不能大于原订单金额');
                            }
                            if (!this.isReady()) {
                                // 资金 P0：不分环境一律抛错，绝不返回任何 mock 退款
                                throw new Error('微信支付未配置（缺商户号/API V3 密钥/证书），退款功能暂不可用');
                            }
                            notifyUrl = process.env.WX_PAY_REFUND_NOTIFY_URL || process.env.WX_PAY_NOTIFY_URL || '';
                            keyPath = process.env.WX_PAY_KEY_PATH;
                            body = {
                                out_trade_no: params.outTradeNo,
                                out_refund_no: params.outRefundNo,
                                reason: (params.reason || '').slice(0, 80) || undefined,
                                notify_url: notifyUrl || undefined,
                                amount: {
                                    refund: Math.round(params.refundAmount * 100),
                                    total: Math.round(params.totalAmount * 100),
                                    currency: 'CNY',
                                },
                            };
                            bodyStr = JSON.stringify(body);
                            urlPath = '/v3/refund/domestic/refunds';
                            return [4 /*yield*/, this.buildAuthHeader('POST', urlPath, bodyStr, keyPath)];
                        case 1:
                            auth = _a.sent();
                            return [4 /*yield*/, fetch("https://api.mch.weixin.qq.com".concat(urlPath), {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        Accept: 'application/json',
                                        'Accept-Language': 'zh-CN',
                                        Authorization: auth,
                                    },
                                    body: bodyStr,
                                })];
                        case 2:
                            r = _a.sent();
                            return [4 /*yield*/, r.json().catch(function () { return ({}); })];
                        case 3:
                            resp = _a.sent();
                            if (!resp || !resp.refund_id) {
                                this.logger.error("[wxpay] refund failed: ".concat(JSON.stringify(resp)));
                                throw new Error("\u5FAE\u4FE1\u9000\u6B3E\u5931\u8D25\uFF1A".concat((resp === null || resp === void 0 ? void 0 : resp.message) || (resp === null || resp === void 0 ? void 0 : resp.code) || 'unknown'));
                            }
                            status = resp.status;
                            if (status === 'SUCCESS' || status === 'PROCESSING') {
                                return [2 /*return*/, { refundId: resp.refund_id, status: status }];
                            }
                            throw new Error("\u5FAE\u4FE1\u9000\u6B3E\u8FD4\u56DE\u5F02\u5E38\u72B6\u6001\uFF1A".concat(status || 'unknown'));
                    }
                });
            });
        };
        /** 解密微信回调的 resource.ciphertext（AES-256-GCM） */
        WxPayService_1.prototype.decryptResource = function (resource) {
            var v3Key = process.env.WX_PAY_API_V3_KEY || '';
            if (!v3Key)
                throw new Error('WX_PAY_API_V3_KEY 未配置');
            var buf = Buffer.from(resource.ciphertext, 'base64');
            var authTag = buf.slice(buf.length - 16);
            var data = buf.slice(0, buf.length - 16);
            var decipher = (0, crypto_1.createDecipheriv)('aes-256-gcm', Buffer.from(v3Key, 'utf-8'), Buffer.from(resource.nonce, 'utf-8'));
            decipher.setAuthTag(authTag);
            if (resource.associated_data) {
                decipher.setAAD(Buffer.from(resource.associated_data, 'utf-8'));
            }
            var plain = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf-8');
            try {
                return JSON.parse(plain);
            }
            catch (_a) {
                return plain;
            }
        };
        return WxPayService_1;
    }());
    __setFunctionName(_classThis, "WxPayService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WxPayService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WxPayService = _classThis;
}();
exports.WxPayService = WxPayService;
