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
exports.SmsService = void 0;
/**
 * 短信服务（多 provider 适配）
 *
 * 国阳云「变量发送接口（ID版）」实现，文档：
 *   http://help.guoyangyun.com/API_manual/SendSmsBatch.html
 *
 * 端点：POST https://api.guoyangyun.com/api/sms/smsmtm.htm
 *
 * 鉴权（公共参数 — http://help.guoyangyun.com/API_manual/Parameter.html）：
 *   appkey    系统分配的用户唯一标识（不是登录账号！）
 *   appsecret 系统分配的应用密钥（不是登录密码！）
 *   ↑ 二者从 国阳云后台 → 账户信息 → 接口信息 里复制
 *
 * env：
 *   GYY_SMS_API_URL          https://api.guoyangyun.com/api/sms/smsmtm.htm
 *   GYY_SMS_APPKEY           appkey
 *   GYY_SMS_APPSECRET        appsecret
 *   GYY_SMS_SIGN             签名 ID（控制台 → 签名管理）
 *   GYY_SMS_TEMPLATE_LOGIN   登录验证码模板 ID（控制台 → 模板管理）
 *   GYY_SMS_TEMPLATE_VAR     模板变量名 —— 必须和模板正文里 **xxx** 写法完全一致，
 *                            含 `**` 包围符。例如模板正文 `您的验证码是 **验证码**`
 *                            对应 GYY_SMS_TEMPLATE_VAR=**验证码**。
 *                            如果填了不带星号的（如"验证码"或"code"），代码会自动
 *                            补全成 `**xxx**`，但仍建议直接写带星号的形式。
 *
 * ⚠️ 国阳云的 API 收到任何 content 都会先返回 code:0「成功」，**变量名错了不会立刻报错**，
 *    要去他们后台「发送记录」才能看到「失败：变量不匹配 / 模板内容不符」之类的最终状态。
 *
 * 性能：
 *   国阳云 HTTPS endpoint 单次 TLS 握手 ~3.8s，首次 5s+；通过 keep-alive Agent
 *   复用 socket，后续请求降到 <1s。
 *
 * 兼容旧 env 名（GYY_SMS_USERNAME / GYY_SMS_PASSWORD）：会自动当成 appkey/appsecret。
 *
 * 失败不阻塞用户：DB 里仍有验证码记录，dev 模式 0000 仍接受。
 */
var common_1 = require("@nestjs/common");
var undici_1 = require("undici");
var node_crypto_1 = require("node:crypto");
/**
 * 短信验证码日志脱敏。
 *
 * 完整 code 永远不应该出现在日志里 —— 即便是 dev 模式：
 *   - 共享日志（pino/journald/elk）的运维 / 同事会无意中看到
 *   - 容器编排 / CI 输出常被截屏共享
 *   - 攻击者拿到旧日志即可未经允许辅助暴力撞库
 *
 * 脱敏方案：保留后 2 位（用于人工核对最后几位是否一致），
 * 加上 4 位 sha256 前缀指纹（用于跨日志条目对照同一验证码而无需明文）。
 */
function maskCode(code) {
    var c = String(code || '');
    if (!c)
        return '';
    var tail = c.length >= 2 ? c.slice(-2) : c;
    var hashed = (0, node_crypto_1.createHash)('sha256').update(c).digest('hex').slice(0, 4);
    return "**".concat(tail, "#").concat(hashed);
}
var SmsService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var SmsService = _classThis = /** @class */ (function () {
        function SmsService_1() {
            this.logger = new common_1.Logger(SmsService.name);
            /**
             * 全局复用的 HTTPS 连接池（undici Agent，被原生 fetch dispatcher 直接消费）。
             * keepAliveTimeout=30s → 闲置 30s 后才关闭，覆盖单用户多次重发场景。
             * 实测国阳云首次握手 3.8s + 等响应 1.4s = 5.2s；复用 socket 后单次降到 ~1s。
             */
            this.dispatcher = new undici_1.Agent({
                keepAliveTimeout: 30000,
                keepAliveMaxTimeout: 60000,
                connections: 16,
                connect: { timeout: 5000 },
            });
        }
        /**
         * 发送验证码。
         *
         * 返回结构化结果而不是 boolean，便于上层把上游具体原因
         * （如"黑名单"/"手机号码不正确"/"模板已停用"）原样回传给用户，
         * 避免出现千篇一律的"短信发送失败"。
         *
         * 安全 P0（生产）：SMS_PROVIDER === 'none' 在生产环境一律返回 ok:false，
         * 不允许"dev 模式静默成功"的假 ok 通路。
         */
        SmsService_1.prototype.sendVerifyCode = function (phone_1, code_1) {
            return __awaiter(this, arguments, void 0, function (phone, code, scene) {
                var provider, isProd, t0, reason, e_1, reason;
                if (scene === void 0) { scene = 'login'; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            provider = (process.env.SMS_PROVIDER || 'none').toLowerCase();
                            isProd = process.env.NODE_ENV === 'production';
                            t0 = Date.now();
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 4, , 5]);
                            if (!(provider === 'guoyangyun')) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.adapterGuoyangyun(phone, code, scene)];
                        case 2:
                            _a.sent();
                            this.logger.log("[SMS][".concat(provider, "] phone=").concat(phone, " ok=true elapsed=").concat(Date.now() - t0, "ms"));
                            return [2 /*return*/, { ok: true }];
                        case 3:
                            // 生产环境若 provider=none 一律返回失败，绝不静默 ok（防"装作发了"导致用户收不到码）
                            if (isProd) {
                                reason = '生产环境未配置短信通道（SMS_PROVIDER=none）';
                                this.logger.error("[SMS] phone=".concat(phone, " ").concat(reason));
                                return [2 /*return*/, { ok: false, reason: reason }];
                            }
                            // dev 模式不真发短信，code 仍写入 SmsCode 表供开发查询；
                            // 日志只打脱敏指纹，避免把验证码写进可被他人共享的日志流
                            this.logger.log("[SMS][".concat(provider, "] phone=").concat(phone, " code=").concat(maskCode(code), " (no provider, dev mode)"));
                            return [2 /*return*/, { ok: true }];
                        case 4:
                            e_1 = _a.sent();
                            reason = String((e_1 === null || e_1 === void 0 ? void 0 : e_1.message) || e_1)
                                .replace(/^guoyangyun:\s*/, '')
                                .slice(0, 120);
                            this.logger.error("[SMS] phone=".concat(phone, " elapsed=").concat(Date.now() - t0, "ms failed: ").concat(reason));
                            return [2 /*return*/, { ok: false, reason: reason }];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        /** 国阳云 · 变量发送接口（ID版）。成功 resolve void；失败 throw 带具体原因。 */
        SmsService_1.prototype.adapterGuoyangyun = function (phone, code, _scene) {
            return __awaiter(this, void 0, void 0, function () {
                var url, appkey, appsecret, smsSignId, templateId, rawVar, tplVar, minuteValue, content, form, controller, timer, text, httpStatus, r, e_2, parsed, codeStr, failList, phoneFailed, sl, detail;
                var _a;
                var _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            url = process.env.GYY_SMS_API_URL || 'https://api.guoyangyun.com/api/sms/smsmtm.htm';
                            appkey = process.env.GYY_SMS_APPKEY || process.env.GYY_SMS_USERNAME || '';
                            appsecret = process.env.GYY_SMS_APPSECRET || process.env.GYY_SMS_PASSWORD || '';
                            smsSignId = process.env.GYY_SMS_SIGN || '';
                            templateId = process.env.GYY_SMS_TEMPLATE_LOGIN || '';
                            rawVar = process.env.GYY_SMS_TEMPLATE_VAR || '**code**';
                            tplVar = rawVar.startsWith('**') && rawVar.endsWith('**') ? rawVar : "**".concat(rawVar, "**");
                            minuteValue = process.env.GYY_SMS_TEMPLATE_MINUTE || '5';
                            if (!appkey || !appsecret || !smsSignId || !templateId) {
                                this.logger.warn('[SMS][guoyangyun] env 缺失：GYY_SMS_APPKEY / GYY_SMS_APPSECRET / GYY_SMS_SIGN / GYY_SMS_TEMPLATE_LOGIN');
                                throw new Error('guoyangyun: 服务端短信通道未配置');
                            }
                            content = JSON.stringify([(_a = { mobile: phone }, _a[tplVar] = code, _a['**minute**'] = minuteValue, _a)]);
                            form = new URLSearchParams();
                            form.set('appkey', appkey);
                            form.set('appsecret', appsecret);
                            form.set('smsSignId', smsSignId);
                            form.set('templateId', templateId);
                            form.set('content', content);
                            controller = new AbortController();
                            timer = setTimeout(function () { return controller.abort(); }, 8000);
                            text = '';
                            httpStatus = 0;
                            _d.label = 1;
                        case 1:
                            _d.trys.push([1, 4, 5, 6]);
                            return [4 /*yield*/, fetch(url, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                                    body: form.toString(),
                                    signal: controller.signal,
                                    // Node 原生 fetch 走 undici dispatcher 复用 socket，跳过 3.8s 的 TLS 握手
                                    dispatcher: this.dispatcher,
                                })];
                        case 2:
                            r = _d.sent();
                            httpStatus = r.status;
                            return [4 /*yield*/, r.text()];
                        case 3:
                            text = _d.sent();
                            return [3 /*break*/, 6];
                        case 4:
                            e_2 = _d.sent();
                            if ((e_2 === null || e_2 === void 0 ? void 0 : e_2.name) === 'AbortError')
                                throw new Error('guoyangyun: 上游响应超时 (>8s)');
                            throw e_2;
                        case 5:
                            clearTimeout(timer);
                            return [7 /*endfinally*/];
                        case 6:
                            if (httpStatus !== 200) {
                                throw new Error("guoyangyun: HTTP ".concat(httpStatus, " resp=").concat(text.slice(0, 200)));
                            }
                            this.logger.log("[SMS][guoyangyun] resp: ".concat(text.slice(0, 300)));
                            parsed = null;
                            try {
                                parsed = JSON.parse(text);
                            }
                            catch (_e) {
                                throw new Error("guoyangyun: \u975E JSON \u54CD\u5E94 ".concat(text.slice(0, 200)));
                            }
                            codeStr = String((_b = parsed === null || parsed === void 0 ? void 0 : parsed.code) !== null && _b !== void 0 ? _b : '');
                            failList = Array.isArray(parsed === null || parsed === void 0 ? void 0 : parsed.failList) ? parsed.failList : [];
                            phoneFailed = failList.find(function (it) { return String((it === null || it === void 0 ? void 0 : it.mobile) || '') === phone; });
                            if (codeStr === '0' && !phoneFailed) {
                                sl = Array.isArray(parsed === null || parsed === void 0 ? void 0 : parsed.successList) ? parsed.successList : [];
                                if (sl.length)
                                    this.logger.log("[SMS][guoyangyun] success sid=".concat(((_c = sl[0]) === null || _c === void 0 ? void 0 : _c.sid) || ''));
                                return [2 /*return*/];
                            }
                            detail = phoneFailed
                                ? "".concat((phoneFailed === null || phoneFailed === void 0 ? void 0 : phoneFailed.msg) || (phoneFailed === null || phoneFailed === void 0 ? void 0 : phoneFailed.code), " (").concat(phone, ")")
                                : (parsed === null || parsed === void 0 ? void 0 : parsed.msg) || codeStr;
                            throw new Error("guoyangyun: ".concat(detail || text.slice(0, 200)));
                    }
                });
            });
        };
        return SmsService_1;
    }());
    __setFunctionName(_classThis, "SmsService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SmsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SmsService = _classThis;
}();
exports.SmsService = SmsService;
