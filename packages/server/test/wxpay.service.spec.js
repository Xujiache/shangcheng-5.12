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
var node_crypto_1 = require("node:crypto");
var node_fs_1 = require("node:fs");
var node_os_1 = require("node:os");
var node_path_1 = require("node:path");
var wxpay_service_1 = require("../src/modules/payment/wxpay.service");
// ----------------------------------------------------------------------------
// WxPayService — 微信支付 v3 · 资金安全行为契约测试
//
// 实现位置：packages/server/src/modules/payment/wxpay.service.ts
// 核心立场（资金 P0）：未配置 / 验签失败一律拒绝，绝不返回任何 mock 支付 / 退款 / 放行。
//
// WxPayService 没有构造依赖，直接 new。所有配置通过 process.env 驱动，
// 因此每个用例前备份并清空相关 env，用例后恢复，互不污染。
// 涉及文件的（私钥/公钥）写入 os.tmpdir()，整套结束后删目录。
// ----------------------------------------------------------------------------
// 本服务读取的全部 env key（含 readiness / 验签 / 解密 / 退款）
var ENV_KEYS = [
    'WX_MINIAPP_APPID',
    'WX_PAY_MCH_ID',
    'WX_PAY_API_V3_KEY',
    'WX_PAY_KEY_PATH',
    'WX_PAY_CERT_PATH',
    'WX_PAY_NOTIFY_URL',
    'WX_PAY_REFUND_NOTIFY_URL',
    'WX_PAY_CERT_SERIAL',
    'WX_PAY_PUB_KEY_ID',
    'WX_PAY_PUB_KEY_PATH',
];
(0, globals_1.describe)('WxPayService 微信支付 v3 资金安全契约', function () {
    var service;
    var tmpDir;
    var backup = {};
    (0, globals_1.beforeEach)(function () {
        service = new wxpay_service_1.WxPayService();
        tmpDir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), 'wxpay-test-'));
        // 备份并清空所有相关 env，确保每个用例从"未配置"起步
        for (var _i = 0, ENV_KEYS_1 = ENV_KEYS; _i < ENV_KEYS_1.length; _i++) {
            var k = ENV_KEYS_1[_i];
            backup[k] = process.env[k];
            delete process.env[k];
        }
    });
    (0, globals_1.afterEach)(function () {
        // 恢复 env 原值
        for (var _i = 0, ENV_KEYS_2 = ENV_KEYS; _i < ENV_KEYS_2.length; _i++) {
            var k = ENV_KEYS_2[_i];
            if (backup[k] === undefined)
                delete process.env[k];
            else
                process.env[k] = backup[k];
        }
        (0, node_fs_1.rmSync)(tmpDir, { recursive: true, force: true });
    });
    /** 写一个真实存在的临时私钥文件并返回路径（仅用于让 existsSync/readFileSync 通过） */
    function writeTempKeyFile(name, content) {
        var p = (0, node_path_1.join)(tmpDir, name);
        (0, node_fs_1.writeFileSync)(p, content, 'utf-8');
        return p;
    }
    /** 配齐 isReady 所需的 4 个 env + 真实私钥文件，返回该私钥路径 */
    function makeReady() {
        var keyPath = writeTempKeyFile('apiclient_key.pem', 'dummy-private-key');
        process.env.WX_MINIAPP_APPID = 'wxe8ed8b7d9d154165';
        process.env.WX_PAY_MCH_ID = '1745510292';
        process.env.WX_PAY_API_V3_KEY = 'a'.repeat(32);
        process.env.WX_PAY_KEY_PATH = keyPath;
        return keyPath;
    }
    // --------------------------------------------------------------------------
    // 1. isReady
    // --------------------------------------------------------------------------
    (0, globals_1.describe)('isReady', function () {
        (0, globals_1.it)('env 未配齐时返回 false', function () {
            (0, globals_1.expect)(service.isReady()).toBe(false);
        });
        (0, globals_1.it)('4 个 env 配齐且私钥文件真实存在时返回 true', function () {
            makeReady();
            (0, globals_1.expect)(service.isReady()).toBe(true);
        });
        (0, globals_1.it)('env 配齐但私钥文件路径不存在时返回 false', function () {
            process.env.WX_MINIAPP_APPID = 'wxe8ed8b7d9d154165';
            process.env.WX_PAY_MCH_ID = '1745510292';
            process.env.WX_PAY_API_V3_KEY = 'a'.repeat(32);
            process.env.WX_PAY_KEY_PATH = (0, node_path_1.join)(tmpDir, 'not-exists.pem');
            (0, globals_1.expect)(service.isReady()).toBe(false);
        });
    });
    // --------------------------------------------------------------------------
    // 2. createMiniPay —— 资金红线：未配置绝不返回任何 mock 支付
    // --------------------------------------------------------------------------
    (0, globals_1.describe)('createMiniPay', function () {
        (0, globals_1.it)('未配置时直接 reject，绝不返回占位 prepay', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, globals_1.expect)(service.createMiniPay({
                            outTradeNo: 'OT123',
                            description: '测试商品',
                            totalFen: 100,
                            openid: 'openid_test',
                        })).rejects.toThrow('微信支付未配置')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    // --------------------------------------------------------------------------
    // 3. createRefund —— 参数校验 + 未配置拒绝
    // --------------------------------------------------------------------------
    (0, globals_1.describe)('createRefund', function () {
        (0, globals_1.it)('缺少 outTradeNo / outRefundNo 时抛错', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, globals_1.expect)(service.createRefund({
                            outTradeNo: '',
                            outRefundNo: 'RF1',
                            refundAmount: 1,
                            totalAmount: 1,
                        })).rejects.toThrow('outTradeNo / outRefundNo 必填')];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, (0, globals_1.expect)(service.createRefund({
                                outTradeNo: 'OT1',
                                outRefundNo: '',
                                refundAmount: 1,
                                totalAmount: 1,
                            })).rejects.toThrow('outTradeNo / outRefundNo 必填')];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('金额 <= 0 时抛错', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, globals_1.expect)(service.createRefund({
                            outTradeNo: 'OT1',
                            outRefundNo: 'RF1',
                            refundAmount: 0,
                            totalAmount: 10,
                        })).rejects.toThrow('金额必须为正')];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, (0, globals_1.expect)(service.createRefund({
                                outTradeNo: 'OT1',
                                outRefundNo: 'RF1',
                                refundAmount: 5,
                                totalAmount: -1,
                            })).rejects.toThrow('金额必须为正')];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('退款金额大于原订单金额时抛错', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, globals_1.expect)(service.createRefund({
                            outTradeNo: 'OT1',
                            outRefundNo: 'RF1',
                            refundAmount: 20,
                            totalAmount: 10,
                        })).rejects.toThrow('退款金额不能大于原订单金额')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('参数合法但未配置微信支付时抛错（提示未配置）', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, globals_1.expect)(service.createRefund({
                            outTradeNo: 'OT1',
                            outRefundNo: 'RF1',
                            refundAmount: 5,
                            totalAmount: 10,
                        })).rejects.toThrow('微信支付未配置')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    // --------------------------------------------------------------------------
    // 4. verifyNotify —— 拒绝链（任一异常即 false，绝不放行）
    // --------------------------------------------------------------------------
    (0, globals_1.describe)('verifyNotify 拒绝链', function () {
        var validBody = '{"id":"evt_1"}';
        (0, globals_1.it)('未配置微信支付 -> false', function () { return __awaiter(void 0, void 0, void 0, function () {
            var ok;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, service.verifyNotify({
                            'wechatpay-timestamp': String(Math.floor(Date.now() / 1000)),
                            'wechatpay-nonce': 'nonce1',
                            'wechatpay-signature': 'sig',
                        }, validBody)];
                    case 1:
                        ok = _a.sent();
                        (0, globals_1.expect)(ok).toBe(false);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('已配置但缺少签名头 -> false', function () { return __awaiter(void 0, void 0, void 0, function () {
            var ok;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        makeReady();
                        return [4 /*yield*/, service.verifyNotify({
                                'wechatpay-timestamp': String(Math.floor(Date.now() / 1000)),
                                'wechatpay-nonce': 'nonce1',
                                // 缺 signature
                            }, validBody)];
                    case 1:
                        ok = _a.sent();
                        (0, globals_1.expect)(ok).toBe(false);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('Wechatpay-Timestamp 非数字 -> false', function () { return __awaiter(void 0, void 0, void 0, function () {
            var ok;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        makeReady();
                        return [4 /*yield*/, service.verifyNotify({
                                'wechatpay-timestamp': 'not-a-number',
                                'wechatpay-nonce': 'nonce1',
                                'wechatpay-signature': 'sig',
                            }, validBody)];
                    case 1:
                        ok = _a.sent();
                        (0, globals_1.expect)(ok).toBe(false);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('时间戳偏移 400s（超出 ±300s 回放窗口）-> false', function () { return __awaiter(void 0, void 0, void 0, function () {
            var staleTs, ok;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        makeReady();
                        staleTs = String(Math.floor(Date.now() / 1000) - 400);
                        return [4 /*yield*/, service.verifyNotify({
                                'wechatpay-timestamp': staleTs,
                                'wechatpay-nonce': 'nonce1',
                                'wechatpay-signature': 'sig',
                            }, validBody)];
                    case 1:
                        ok = _a.sent();
                        (0, globals_1.expect)(ok).toBe(false);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('WX_PAY_PUB_KEY_ID 与 Wechatpay-Serial 不匹配 -> false', function () { return __awaiter(void 0, void 0, void 0, function () {
            var ok;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        makeReady();
                        process.env.WX_PAY_PUB_KEY_ID = 'PUB_KEY_ID_LOCAL';
                        // 即便给了公钥文件，serial 不匹配也应先被拒
                        process.env.WX_PAY_PUB_KEY_PATH = writeTempKeyFile('pub.pem', 'dummy-pub');
                        return [4 /*yield*/, service.verifyNotify({
                                'wechatpay-timestamp': String(Math.floor(Date.now() / 1000)),
                                'wechatpay-nonce': 'nonce1',
                                'wechatpay-signature': 'sig',
                                'wechatpay-serial': 'PUB_KEY_ID_REMOTE_DIFFERENT',
                            }, validBody)];
                    case 1:
                        ok = _a.sent();
                        (0, globals_1.expect)(ok).toBe(false);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('公钥文件路径缺失 -> false', function () { return __awaiter(void 0, void 0, void 0, function () {
            var ok;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        makeReady();
                        // 不设置 WX_PAY_PUB_KEY_PATH（或指向不存在的文件）
                        process.env.WX_PAY_PUB_KEY_PATH = (0, node_path_1.join)(tmpDir, 'missing-pub.pem');
                        return [4 /*yield*/, service.verifyNotify({
                                'wechatpay-timestamp': String(Math.floor(Date.now() / 1000)),
                                'wechatpay-nonce': 'nonce1',
                                'wechatpay-signature': 'sig',
                            }, validBody)];
                    case 1:
                        ok = _a.sent();
                        (0, globals_1.expect)(ok).toBe(false);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    // --------------------------------------------------------------------------
    // 5. verifyNotify 真实签名验证（RSA-SHA256）
    // --------------------------------------------------------------------------
    (0, globals_1.describe)('verifyNotify 真实签名', function () {
        (0, globals_1.it)('正确签名 -> true；篡改 body -> false', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, privateKey, publicKey, pubPem, timestamp, nonce, rawBody, message, signer, signature, headers;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        makeReady();
                        _a = (0, node_crypto_1.generateKeyPairSync)('rsa', {
                            modulusLength: 2048,
                        }), privateKey = _a.privateKey, publicKey = _a.publicKey;
                        pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
                        process.env.WX_PAY_PUB_KEY_PATH = writeTempKeyFile('wxpay_pub.pem', pubPem);
                        timestamp = String(Math.floor(Date.now() / 1000));
                        nonce = (0, node_crypto_1.randomBytes)(16).toString('hex');
                        rawBody = '{"id":"evt_real","resource":{}}';
                        message = "".concat(timestamp, "\n").concat(nonce, "\n").concat(rawBody, "\n");
                        signer = (0, node_crypto_1.createSign)('RSA-SHA256');
                        signer.update(message);
                        signature = signer.sign(privateKey, 'base64');
                        headers = {
                            'wechatpay-timestamp': timestamp,
                            'wechatpay-nonce': nonce,
                            'wechatpay-signature': signature,
                        };
                        // 正确 body + 正确签名 -> 通过
                        return [4 /*yield*/, (0, globals_1.expect)(service.verifyNotify(headers, rawBody)).resolves.toBe(true)
                            // 篡改 body（签名不变）-> 拒绝
                        ];
                    case 1:
                        // 正确 body + 正确签名 -> 通过
                        _b.sent();
                        // 篡改 body（签名不变）-> 拒绝
                        return [4 /*yield*/, (0, globals_1.expect)(service.verifyNotify(headers, rawBody + 'tampered')).resolves.toBe(false)];
                    case 2:
                        // 篡改 body（签名不变）-> 拒绝
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('Wechatpay-Serial 与本地 PUB_KEY_ID 一致时仍能验签通过', function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, privateKey, publicKey, pubPem, timestamp, nonce, rawBody, message, signer, signature, ok;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        makeReady();
                        _a = (0, node_crypto_1.generateKeyPairSync)('rsa', {
                            modulusLength: 2048,
                        }), privateKey = _a.privateKey, publicKey = _a.publicKey;
                        pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
                        process.env.WX_PAY_PUB_KEY_PATH = writeTempKeyFile('wxpay_pub.pem', pubPem);
                        process.env.WX_PAY_PUB_KEY_ID = 'PUB_KEY_ID_MATCH';
                        timestamp = String(Math.floor(Date.now() / 1000));
                        nonce = (0, node_crypto_1.randomBytes)(16).toString('hex');
                        rawBody = '{"id":"evt_serial_match"}';
                        message = "".concat(timestamp, "\n").concat(nonce, "\n").concat(rawBody, "\n");
                        signer = (0, node_crypto_1.createSign)('RSA-SHA256');
                        signer.update(message);
                        signature = signer.sign(privateKey, 'base64');
                        return [4 /*yield*/, service.verifyNotify({
                                'wechatpay-timestamp': timestamp,
                                'wechatpay-nonce': nonce,
                                'wechatpay-signature': signature,
                                'wechatpay-serial': 'PUB_KEY_ID_MATCH',
                            }, rawBody)];
                    case 1:
                        ok = _b.sent();
                        (0, globals_1.expect)(ok).toBe(true);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    // --------------------------------------------------------------------------
    // 6. decryptResource —— AES-256-GCM 往返
    // --------------------------------------------------------------------------
    (0, globals_1.describe)('decryptResource (AES-256-GCM)', function () {
        (0, globals_1.it)('正确密文可解出原 JSON 对象', function () {
            var v3Key = 'k'.repeat(32); // 32 字节 APIv3 密钥
            process.env.WX_PAY_API_V3_KEY = v3Key;
            var payload = { transaction_id: 'TX123', trade_state: 'SUCCESS', amount: { total: 1 } };
            var plaintext = JSON.stringify(payload);
            var nonce = (0, node_crypto_1.randomBytes)(12).toString('hex').slice(0, 12); // 12 字节 nonce
            var associatedData = 'transaction';
            var cipher = (0, node_crypto_1.createCipheriv)('aes-256-gcm', Buffer.from(v3Key, 'utf-8'), Buffer.from(nonce, 'utf-8'));
            cipher.setAAD(Buffer.from(associatedData, 'utf-8'));
            var encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
            var authTag = cipher.getAuthTag();
            // 微信约定：ciphertext = base64(密文 + authTag)
            var ciphertext = Buffer.concat([encrypted, authTag]).toString('base64');
            var decoded = service.decryptResource({
                ciphertext: ciphertext,
                associated_data: associatedData,
                nonce: nonce,
            });
            (0, globals_1.expect)(decoded).toEqual(payload);
        });
        (0, globals_1.it)('未配置 WX_PAY_API_V3_KEY 时抛错', function () {
            // beforeEach 已清空 WX_PAY_API_V3_KEY
            (0, globals_1.expect)(function () {
                return service.decryptResource({
                    ciphertext: 'whatever',
                    nonce: 'n'.repeat(12),
                });
            }).toThrow('WX_PAY_API_V3_KEY 未配置');
        });
    });
});
