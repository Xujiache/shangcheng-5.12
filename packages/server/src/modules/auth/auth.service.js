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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
var common_1 = require("@nestjs/common");
var argon2 = require("argon2");
var node_crypto_1 = require("node:crypto");
var nanoid_1 = require("nanoid");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
var jwt_guard_1 = require("../../common/guards/jwt.guard");
/** 12 字符 jti（足以承载几十亿条记录且明显短于 UUID） */
var genJti = (0, nanoid_1.customAlphabet)('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 12);
var AuthService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AuthService = _classThis = /** @class */ (function () {
        function AuthService_1(prisma, jwt, sms, refreshBlacklist) {
            this.prisma = prisma;
            this.jwt = jwt;
            this.sms = sms;
            this.refreshBlacklist = refreshBlacklist;
            this.logger = new common_1.Logger(AuthService.name);
        }
        /**
         * 签发 access + refresh token 对。
         *
         * jti（JWT ID）安全说明：
         *   - access / refresh 各持独立的 jti（access 的 jti 仅作审计；refresh 的 jti 是 rotation 关键）
         *   - refresh() 拿到旧 refresh token 时会先 isRevoked(jti) 检查；
         *     一次性 refresh 成功后旧 jti 立即加入黑名单，攻击者拿到旧 token 也用不了。
         */
        AuthService_1.prototype.signTokens = function (payload) {
            return __awaiter(this, void 0, void 0, function () {
                var accessTtl, refreshTtl, accessToken, refreshToken;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            accessTtl = Number(process.env.JWT_ACCESS_TOKEN_TTL) || 7200;
                            refreshTtl = Number(process.env.JWT_REFRESH_TOKEN_TTL) || 2592000;
                            return [4 /*yield*/, this.jwt.signAsync(__assign(__assign({}, payload), { jti: genJti() }), { expiresIn: accessTtl })];
                        case 1:
                            accessToken = _a.sent();
                            return [4 /*yield*/, this.jwt.signAsync(__assign(__assign({}, payload), { _r: 1, jti: genJti() }), { expiresIn: refreshTtl })];
                        case 2:
                            refreshToken = _a.sent();
                            return [2 /*return*/, { accessToken: accessToken, refreshToken: refreshToken, expiresIn: accessTtl }];
                    }
                });
            });
        };
        AuthService_1.prototype.toUser = function (u) {
            var _a, _b;
            if (!u)
                return null;
            var passwordHash = u.passwordHash, rest = __rest(u, ["passwordHash"]);
            return __assign(__assign({}, rest), { 
                // admin-pc UserInfo 兼容字段
                userId: u.id, userName: u.username || u.nickname, roles: [u.role], buttons: [], 
                // 关联 AdminRole.name 平铺，便于前端直接展示角色显示名（admin-pc 用户中心 / 平台账号列表）
                // u.adminRole 在调用方使用 include: { adminRole: true } 时存在；缺失时为 null
                roleName: (_b = (_a = u.adminRole) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : null, 
                // 首次登录判断：用户是否已设过密码。
                // 商家端登录页拿到 false → 强制跳"设置密码"，避免后续 admin-pc 因无密码登不上。
                // 注意：不能直接把 passwordHash 给前端（即便是 boolean 化，也只在登录响应里返回，
                // /u/profile 等接口不应包含此字段）。
                hasPassword: !!passwordHash });
        };
        /** 商家 APP 登录统一返回的申请摘要，避免前端靠角色猜测审核状态。 */
        AuthService_1.prototype.merchantApplication = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.merchant.findUnique({
                            where: { userId: userId },
                            select: {
                                status: true,
                                name: true,
                                type: true,
                                rejectReason: true,
                            },
                        })];
                });
            });
        };
        AuthService_1.prototype.merchantLoginSession = function (user, amr, amrAt) {
            return __awaiter(this, void 0, void 0, function () {
                var tokens, _a;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.signTokens({
                                sub: user.id,
                                role: user.role,
                                merchantId: user.merchantId || undefined,
                                amr: amr,
                                amrAt: amrAt,
                            })];
                        case 1:
                            tokens = _c.sent();
                            _a = [__assign({ user: this.toUser(user) }, tokens)];
                            _b = { expiresAt: Date.now() + tokens.expiresIn * 1000 };
                            return [4 /*yield*/, this.merchantApplication(user.id)];
                        case 2: return [2 /*return*/, __assign.apply(void 0, _a.concat([(_b.merchantApplication = _c.sent(), _b)]))];
                    }
                });
            });
        };
        /**
         * 微信小程序登录
         * dto.code = wx.login() 返回的临时 code
         *
         * 流程：
         *   1. 拿 code + appid + secret 调 https://api.weixin.qq.com/sns/jscode2session
         *      → 拿到 openid / unionid / session_key
         *   2. 通过 openid 查/建 User
         *   3. 签发 JWT
         *
         * 配置：环境变量 WX_MINIAPP_APPID / WX_MINIAPP_SECRET
         *
         * 安全规则：
         *   - 生产环境（NODE_ENV=production）：必须真实换到 openid，否则拒绝登录，
         *     杜绝伪造 code 直接获取账号的风险。
         *   - 非生产环境：env 缺失或调用失败时使用与 code 强相关的派生 openid，
         *     便于本地联调；但该 openid 是确定性的，绝不可与任何真实 openid 冲突。
         */
        AuthService_1.prototype.wechatLogin = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var appid, secret, isProd, openid, unionid, url, r, data, e_1, user, created, tokens;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            appid = process.env.WX_MINIAPP_APPID;
                            secret = process.env.WX_MINIAPP_SECRET;
                            isProd = process.env.NODE_ENV === 'production';
                            openid = null;
                            unionid = null;
                            if (!(appid && secret && dto.code)) return [3 /*break*/, 6];
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 4, , 5]);
                            url = "https://api.weixin.qq.com/sns/jscode2session?appid=".concat(appid, "&secret=").concat(secret, "&js_code=").concat(encodeURIComponent(dto.code), "&grant_type=authorization_code");
                            return [4 /*yield*/, fetch(url, { method: 'GET' })];
                        case 2:
                            r = _a.sent();
                            return [4 /*yield*/, r.json()];
                        case 3:
                            data = _a.sent();
                            if ((data === null || data === void 0 ? void 0 : data.errcode) && data.errcode !== 0) {
                                // 40029 = invalid code, 45011 = frequency limit, etc.
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, "\u5FAE\u4FE1\u767B\u5F55\u5931\u8D25\uFF1A".concat(data.errmsg || data.errcode));
                            }
                            if (data === null || data === void 0 ? void 0 : data.openid) {
                                openid = data.openid;
                                unionid = data.unionid || null;
                            }
                            return [3 /*break*/, 5];
                        case 4:
                            e_1 = _a.sent();
                            if (e_1 instanceof biz_exception_1.BizException)
                                throw e_1;
                            if (isProd) {
                                // 生产环境：网络故障也要明确告知前端，避免静默走假数据
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '微信登录服务暂不可用，请稍后重试');
                            }
                            return [3 /*break*/, 5];
                        case 5: return [3 /*break*/, 7];
                        case 6:
                            if (isProd) {
                                // 生产环境必须配齐 WeChat 凭证
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '服务端未配置微信小程序凭证，无法完成登录');
                            }
                            _a.label = 7;
                        case 7:
                            if (!openid) {
                                if (isProd) {
                                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '微信授权失败，未获取到 openid');
                                }
                                // 仅本地/测试：根据 code 派生确定性 openid，便于联调（带前缀避免与真实 openid 冲突）
                                openid = dto.code ? "dev_wx_".concat(dto.code.slice(0, 16)) : "dev_wx_anon_".concat(Date.now());
                            }
                            return [4 /*yield*/, this.prisma.user.findUnique({
                                    where: { openid: openid },
                                    include: { adminRole: true },
                                })];
                        case 8:
                            user = _a.sent();
                            if (!!user) return [3 /*break*/, 11];
                            return [4 /*yield*/, this.prisma.user.create({
                                    data: {
                                        openid: openid,
                                        unionid: unionid || undefined,
                                        nickname: '微信用户',
                                        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=".concat(openid),
                                        role: 'customer',
                                    },
                                })];
                        case 9:
                            created = _a.sent();
                            return [4 /*yield*/, this.prisma.user.findUnique({
                                    where: { id: created.id },
                                    include: { adminRole: true },
                                })];
                        case 10:
                            user = _a.sent();
                            _a.label = 11;
                        case 11: return [4 /*yield*/, this.signTokens({
                                sub: user.id,
                                role: user.role,
                                merchantId: user.merchantId || undefined,
                            })];
                        case 12:
                            tokens = _a.sent();
                            return [2 /*return*/, __assign(__assign({ user: this.toUser(user) }, tokens), { expiresAt: Date.now() + tokens.expiresIn * 1000 })];
                    }
                });
            });
        };
        /** 手机号验证码登录 */
        AuthService_1.prototype.phoneLogin = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var code, rec, user, created, amrAt, tokens;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            code = dto.smsCode || dto.code;
                            if (!code)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '验证码不能为空');
                            return [4 /*yield*/, this.prisma.smsCode.findFirst({
                                    where: { phone: dto.phone, code: code, used: false, expiresAt: { gt: new Date() } },
                                    orderBy: { createdAt: 'desc' },
                                })];
                        case 1:
                            rec = _a.sent();
                            if (!rec)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '验证码错误或已过期');
                            return [4 /*yield*/, this.prisma.smsCode.update({ where: { id: rec.id }, data: { used: true } })];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.user.findUnique({
                                    where: { phone: dto.phone },
                                    include: { adminRole: true },
                                })];
                        case 3:
                            user = _a.sent();
                            if (!!user) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.prisma.user.create({
                                    data: {
                                        phone: dto.phone,
                                        nickname: "\u7528\u6237".concat(dto.phone.slice(-4)),
                                        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=".concat(dto.phone),
                                        role: 'customer',
                                    },
                                })];
                        case 4:
                            created = _a.sent();
                            return [4 /*yield*/, this.prisma.user.findUnique({
                                    where: { id: created.id },
                                    include: { adminRole: true },
                                })];
                        case 5:
                            user = _a.sent();
                            _a.label = 6;
                        case 6: return [4 /*yield*/, this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })];
                        case 7:
                            _a.sent();
                            amrAt = Math.floor(Date.now() / 1000);
                            return [4 /*yield*/, this.signTokens({
                                    sub: user.id,
                                    role: user.role,
                                    merchantId: user.merchantId || undefined,
                                    amr: 'sms',
                                    amrAt: amrAt,
                                })];
                        case 8:
                            tokens = _a.sent();
                            return [2 /*return*/, __assign(__assign({ user: this.toUser(user) }, tokens), { expiresAt: Date.now() + tokens.expiresIn * 1000 })];
                    }
                });
            });
        };
        /** 商家 APP 手机号 + 密码登录；不存在与密码错误故意使用相同提示，防止账号枚举。 */
        AuthService_1.prototype.merchantPasswordLogin = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user, ok;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findUnique({
                                where: { phone: dto.phone },
                                include: { adminRole: true },
                            })];
                        case 1:
                            user = _a.sent();
                            if (!user || !user.passwordHash) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '手机号或密码错误');
                            }
                            return [4 /*yield*/, argon2.verify(user.passwordHash, dto.password)];
                        case 2:
                            ok = _a.sent();
                            if (!ok)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '手机号或密码错误');
                            if (user.status === 'disabled')
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '账号已禁用');
                            return [4 /*yield*/, this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, this.merchantLoginSession(user, 'password')];
                    }
                });
            });
        };
        /** 商家 APP 短信登录；未知手机号明确引导注册，且不会创建 User。 */
        AuthService_1.prototype.merchantSmsLogin = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user, rec, amrAt;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findUnique({
                                where: { phone: dto.phone },
                                include: { adminRole: true },
                            })];
                        case 1:
                            user = _a.sent();
                            if (!user) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '该手机号尚未注册商家账号，请先注册');
                            }
                            return [4 /*yield*/, this.prisma.smsCode.findFirst({
                                    where: {
                                        phone: dto.phone,
                                        code: dto.code,
                                        scene: 'login',
                                        used: false,
                                        expiresAt: { gt: new Date() },
                                    },
                                    orderBy: { createdAt: 'desc' },
                                })];
                        case 2:
                            rec = _a.sent();
                            if (!rec)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '验证码错误或已过期');
                            if (user.status === 'disabled')
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '账号已禁用');
                            return [4 /*yield*/, this.prisma.smsCode.update({ where: { id: rec.id }, data: { used: true } })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })];
                        case 4:
                            _a.sent();
                            amrAt = Math.floor(Date.now() / 1000);
                            return [2 /*return*/, this.merchantLoginSession(user, 'sms', amrAt)];
                    }
                });
            });
        };
        /**
         * 发送短信验证码（异步火并忘，把客户端等待降到 ~50ms）
         *
         * 客户端流程：
         *   1. 校验手机号格式 & 60s 节流
         *   2. 写 SmsCode 表（必须同步，phone-login 校验依赖它）
         *   3. **立即** 返回 { ok: true }
         *   4. 异步去调短信 provider，发完后台日志记录（成功/失败都不影响客户端）
         *
         * 失败原因会写到日志便于后台排查；如果上游调用失败，
         * 下次用户重发会重新建一条 SmsCode 记录。
         *
         * 安全 P0（生产）：SMS_PROVIDER === 'none' 在生产环境一律抛错，
         * 因为这意味着没有真实下发短信通道，用户根本收不到验证码 → 留接口风险。
         * 非生产 / 开发期：保留 SMS_PROVIDER=none 兜底，DB 里有真 6 位码，
         * 开发者可在 SmsCode 表里查码做联调（同样需控制好 SmsCode 表的访问权限）。
         */
        AuthService_1.prototype.sendSmsCode = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var provider, isProd, useRealSms, code, recent, row;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            provider = (process.env.SMS_PROVIDER || 'none').toLowerCase();
                            isProd = process.env.NODE_ENV === 'production';
                            if (isProd && provider === 'none') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '短信服务未配置，请联系运维配置 SMS_PROVIDER');
                            }
                            useRealSms = provider !== 'none' && isProd;
                            code = String((0, node_crypto_1.randomInt)(100000, 1000000));
                            return [4 /*yield*/, this.prisma.smsCode.findFirst({
                                    where: { phone: dto.phone, createdAt: { gt: new Date(Date.now() - 60000) } },
                                    orderBy: { createdAt: 'desc' },
                                })];
                        case 1:
                            recent = _a.sent();
                            if (recent) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '请勿频繁请求，60 秒后再试');
                            }
                            return [4 /*yield*/, this.prisma.smsCode.create({
                                    data: {
                                        phone: dto.phone,
                                        code: code,
                                        scene: dto.scene || 'login',
                                        expiresAt: new Date(Date.now() + 5 * 60000),
                                    },
                                })];
                        case 2:
                            row = _a.sent();
                            if (useRealSms) {
                                // 火并忘：立刻返回，国阳云调用走后台
                                // 这样客户端等待时间从 ~700ms 降到 ~30ms（只剩 DB 写 + 网络往返）
                                this.sms
                                    .sendVerifyCode(dto.phone, code, (dto.scene || 'login'))
                                    .then(function (res) {
                                    if (!res.ok) {
                                        // 失败：删掉这条 SmsCode（避免用户拿到没真正发出去的验证码后困惑）
                                        // 同时这意味着 phoneLogin 校验会拒绝该 code，让用户重发
                                        _this.prisma.smsCode.delete({ where: { id: row.id } }).catch(function () { });
                                    }
                                })
                                    .catch(function () {
                                    _this.prisma.smsCode.delete({ where: { id: row.id } }).catch(function () { });
                                });
                            }
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        /** 后台账号密码登录（admin-pc / platform-app / merchant-app 共用） */
        AuthService_1.prototype.adminLogin = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var username, u, looksLikePhone, user, ok, tokens;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            username = dto.username || dto.userName;
                            if (!username)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '账号不能为空');
                            u = String(username).trim();
                            looksLikePhone = /^1[3-9]\d{9}$/.test(u);
                            return [4 /*yield*/, this.prisma.user.findFirst({
                                    where: looksLikePhone
                                        ? { OR: [{ username: u }, { email: u }, { phone: u }] }
                                        : { OR: [{ username: u }, { email: u }] },
                                    include: { adminRole: true },
                                })];
                        case 1:
                            user = _a.sent();
                            if (!user || !user.passwordHash) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '账号或密码错误');
                            }
                            return [4 /*yield*/, argon2.verify(user.passwordHash, dto.password)];
                        case 2:
                            ok = _a.sent();
                            if (!ok)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '账号或密码错误');
                            if (user.status === 'disabled')
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '账号已禁用');
                            return [4 /*yield*/, this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, this.signTokens({
                                    sub: user.id,
                                    role: user.role,
                                    merchantId: user.merchantId || undefined,
                                })];
                        case 4:
                            tokens = _a.sent();
                            return [2 /*return*/, __assign(__assign({ user: this.toUser(user) }, tokens), { 
                                    // admin-pc 期望平铺
                                    token: tokens.accessToken, expiresAt: Date.now() + tokens.expiresIn * 1000 })];
                    }
                });
            });
        };
        /** Verify current account, sign, then atomically consume before exposing new tokens. */
        AuthService_1.prototype.refresh = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var payload, error_1, remaining, receipt, user, tokens;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, this.jwt.verifyAsync(dto.refreshToken)];
                        case 1:
                            payload = _b.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            error_1 = _b.sent();
                            if (error_1 instanceof Error && error_1.name === 'TokenExpiredError')
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.TOKEN_EXPIRED, 'refreshToken 已过期');
                            throw new biz_exception_1.BizException(biz_exception_1.BizCode.UNAUTHORIZED, 'invalid refresh token');
                        case 3:
                            if ((payload === null || payload === void 0 ? void 0 : payload._r) !== 1 ||
                                typeof payload.sub !== 'string' ||
                                !payload.sub ||
                                typeof payload.exp !== 'number' ||
                                !Number.isFinite(payload.exp))
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.UNAUTHORIZED, 'invalid refresh token');
                            remaining = payload.exp - Math.floor(Date.now() / 1000);
                            if (remaining <= 0)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.TOKEN_EXPIRED, 'refreshToken 已过期');
                            receipt = this.refreshReceipt(payload.jti, dto.refreshToken);
                            return [4 /*yield*/, this.refreshBlacklist.isRevoked(receipt)];
                        case 4:
                            if (_b.sent())
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.UNAUTHORIZED, 'refresh token revoked');
                            return [4 /*yield*/, this.prisma.user.findUnique({
                                    where: { id: payload.sub },
                                    select: { id: true, status: true, role: true, merchantId: true },
                                })];
                        case 5:
                            user = _b.sent();
                            if (!user)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.UNAUTHORIZED, '账号不存在或已注销');
                            if (user.status === 'disabled')
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '账号已被禁用');
                            return [4 /*yield*/, this.signTokens({
                                    sub: user.id,
                                    role: user.role,
                                    merchantId: (_a = user.merchantId) !== null && _a !== void 0 ? _a : undefined,
                                    amr: payload.amr === 'sms' || payload.amr === 'password' ? payload.amr : undefined,
                                    amrAt: typeof payload.amrAt === 'number' && Number.isFinite(payload.amrAt)
                                        ? payload.amrAt
                                        : undefined,
                                })
                                // Sign failures leave the old token usable; only the atomic winner returns its new pair.
                            ];
                        case 6:
                            tokens = _b.sent();
                            return [4 /*yield*/, this.refreshBlacklist.consume(receipt, remaining)];
                        case 7:
                            // Sign failures leave the old token usable; only the atomic winner returns its new pair.
                            if (!(_b.sent()))
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.UNAUTHORIZED, 'refresh token revoked');
                            return [2 /*return*/, tokens];
                    }
                });
            });
        };
        AuthService_1.prototype.refreshReceipt = function (jti, token) {
            return typeof jti === 'string' && jti
                ? jti
                : 'legacy:' + (0, node_crypto_1.createHash)('sha256').update(token).digest('hex');
        };
        /** 当前用户信息 */
        AuthService_1.prototype.userInfo = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var user;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findUnique({
                                where: { id: userId },
                                include: { adminRole: true },
                            })];
                        case 1:
                            user = _a.sent();
                            if (!user)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '用户不存在');
                            return [2 /*return*/, this.toUser(user)];
                    }
                });
            });
        };
        /**
         * 注销登录 —— 真吊销
         *
         * 安全设计要点：
         *   - 如果带 refreshToken：verify 拿 jti，加入 refresh-token-blacklist；
         *     即便攻击者拿到这个 refresh token 也无法换新 access token。
         *   - 即使 verify 失败（已过期 / 篡改）也吞掉异常，按"已失效"返回 ok=true，
         *     不向客户端泄露"token 是什么状态"的副信息，并避免给攻击者扫探的接口。
         *   - 同步清除 JwtGuard 的 user 缓存：让管理员"禁用 + 用户主动 logout"双重保险时，
         *     该账号即使持仍未过期的 access token 也会下次请求即重查 DB，被禁用立即失效。
         *
         * 局限性：access token 本身（JWT 无状态）无法在过期前强制作废，因此客户端必须
         * 在收到 ok=true 后立刻删除本地存的 access/refresh token；前端拦截器也已做这步。
         * 若严格要求"access token 也能即时吊销"，需要切到 token-introspection / Redis 黑名单。
         */
        AuthService_1.prototype.logout = function (refreshToken, callerSub) {
            return __awaiter(this, void 0, void 0, function () {
                var payload, _a, remaining;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!refreshToken) return [3 /*break*/, 7];
                            payload = void 0;
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.jwt.verifyAsync(refreshToken)];
                        case 2:
                            payload = _b.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            _a = _b.sent();
                            this.logger.debug('[auth.logout] invalid or expired credential');
                            return [3 /*break*/, 4];
                        case 4:
                            if (!(payload && typeof payload.exp === 'number' && Number.isFinite(payload.exp))) return [3 /*break*/, 6];
                            remaining = payload.exp - Math.floor(Date.now() / 1000);
                            if (!(remaining > 0)) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.refreshBlacklist.revoke(this.refreshReceipt(payload.jti, refreshToken), remaining)];
                        case 5:
                            _b.sent();
                            _b.label = 6;
                        case 6:
                            if (!callerSub && (payload === null || payload === void 0 ? void 0 : payload.sub))
                                callerSub = payload.sub;
                            _b.label = 7;
                        case 7:
                            if (callerSub) {
                                try {
                                    (0, jwt_guard_1._clearJwtUserCache)(callerSub);
                                }
                                catch (_c) {
                                    // 缓存清理失败不影响登出语义；最坏只是 60s 内仍有缓存命中
                                }
                            }
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        /**
         * 修改密码（任意已登录账号都可调）
         *
         * 规则：
         *   - 必须验旧密码（argon2 verify），防止 token 被劫持后无感改密
         *   - 新密码长度 ≥ 6（与 admin-login 校验一致）
         *   - 改完立刻清 JwtGuard 用户缓存，让该用户在所有设备上下次请求重查 DB
         *   - 不签发新 token；客户端如想"踢掉其它设备"应自行重新登录
         */
        AuthService_1.prototype.changePassword = function (userId, dto, amr, amrAt) {
            return __awaiter(this, void 0, void 0, function () {
                var oldPwd, newPwd, user, now, isFirstSet, ok, newHash, patch, dup;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            oldPwd = String((dto === null || dto === void 0 ? void 0 : dto.oldPassword) || '');
                            newPwd = String((dto === null || dto === void 0 ? void 0 : dto.newPassword) || '');
                            if (!newPwd) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请填写新密码');
                            }
                            if (newPwd.length < 6) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '新密码至少 6 位');
                            }
                            return [4 /*yield*/, this.prisma.user.findUnique({ where: { id: userId } })];
                        case 1:
                            user = _a.sent();
                            if (!user)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '用户不存在');
                            if (!user.passwordHash) {
                                now = Math.floor(Date.now() / 1000);
                                if (amr !== 'sms' || !amrAt || now - amrAt > 15 * 60 || now < amrAt) {
                                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '首次设置密码前请重新完成短信验证');
                                }
                            }
                            // 首次设密码场景允许 oldPassword 为空；非首次必须填且与新密码不一致
                            if (user.passwordHash) {
                                if (!oldPwd) {
                                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请填写旧密码');
                                }
                                if (oldPwd === newPwd) {
                                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '新密码不能与旧密码相同');
                                }
                            }
                            isFirstSet = !user.passwordHash;
                            if (!user.passwordHash) return [3 /*break*/, 3];
                            return [4 /*yield*/, argon2.verify(user.passwordHash, oldPwd)];
                        case 2:
                            ok = _a.sent();
                            if (!ok)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '旧密码不正确');
                            _a.label = 3;
                        case 3: return [4 /*yield*/, argon2.hash(newPwd)
                            // 首次设密码 + 无 username 的账号（手机号注册的商家）→ 同步把 username 设为手机号，
                            // 这样他们之后能用「手机号 + 密码」登录管理后台 admin-pc（admin-login 三段 OR 查询）。
                            // 已有 username 的不动；用户名冲突时不强行覆盖（罕见，用户不抱怨即可）。
                        ];
                        case 4:
                            newHash = _a.sent();
                            patch = { passwordHash: newHash };
                            if (!(isFirstSet && !user.username && user.phone)) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.prisma.user.findFirst({
                                    where: { username: user.phone, id: { not: userId } },
                                    select: { id: true },
                                })];
                        case 5:
                            dup = _a.sent();
                            if (!dup)
                                patch.username = user.phone;
                            _a.label = 6;
                        case 6: return [4 /*yield*/, this.prisma.user.update({ where: { id: userId }, data: patch })];
                        case 7:
                            _a.sent();
                            try {
                                (0, jwt_guard_1._clearJwtUserCache)(userId);
                            }
                            catch (_b) {
                                /* ignore */
                            }
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        /**
         * 修改手机号（先验旧手机号 SMS 码 + 验新手机号 SMS 码 二次确认）
         *
         * 安全考量：
         *   - 只有当前账号已绑定手机号时，需要"旧手机号 + 新手机号"双码（防丢号被改）
         *   - 当前账号没有手机号（如纯微信登录的客户首次绑定），仅需新手机号 SMS 码
         *   - 新手机号不能被其他账号占用（同 user-mp bindPhone 的唯一性检查）
         *   - 改完清 JwtGuard 缓存
         */
        AuthService_1.prototype.changePhone = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var newPhone, newCode, user, occupied, oldCode, oldRec, newRec;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            newPhone = String((dto === null || dto === void 0 ? void 0 : dto.newPhone) || '').trim();
                            newCode = String((dto === null || dto === void 0 ? void 0 : dto.newSmsCode) || '').trim();
                            if (!/^1[3-9]\d{9}$/.test(newPhone)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '新手机号格式不正确');
                            }
                            if (!/^\d{4,6}$/.test(newCode)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '新手机号验证码格式不正确');
                            }
                            return [4 /*yield*/, this.prisma.user.findUnique({ where: { id: userId } })];
                        case 1:
                            user = _a.sent();
                            if (!user)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '用户不存在');
                            return [4 /*yield*/, this.prisma.user.findUnique({ where: { phone: newPhone } })];
                        case 2:
                            occupied = _a.sent();
                            if (occupied && occupied.id !== userId) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '该手机号已被其他账号绑定');
                            }
                            if (user.phone === newPhone) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '新手机号与当前相同');
                            }
                            if (!user.phone) return [3 /*break*/, 5];
                            oldCode = String((dto === null || dto === void 0 ? void 0 : dto.oldSmsCode) || '').trim();
                            if (!/^\d{4,6}$/.test(oldCode)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请输入原手机号收到的验证码');
                            }
                            return [4 /*yield*/, this.prisma.smsCode.findFirst({
                                    where: { phone: user.phone, code: oldCode, used: false, expiresAt: { gt: new Date() } },
                                    orderBy: { createdAt: 'desc' },
                                })];
                        case 3:
                            oldRec = _a.sent();
                            if (!oldRec)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '原手机号验证码错误或已过期');
                            return [4 /*yield*/, this.prisma.smsCode.update({ where: { id: oldRec.id }, data: { used: true } })];
                        case 4:
                            _a.sent();
                            _a.label = 5;
                        case 5: return [4 /*yield*/, this.prisma.smsCode.findFirst({
                                where: { phone: newPhone, code: newCode, used: false, expiresAt: { gt: new Date() } },
                                orderBy: { createdAt: 'desc' },
                            })];
                        case 6:
                            newRec = _a.sent();
                            if (!newRec)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '新手机号验证码错误或已过期');
                            return [4 /*yield*/, this.prisma.smsCode.update({ where: { id: newRec.id }, data: { used: true } })];
                        case 7:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.user.update({ where: { id: userId }, data: { phone: newPhone } })];
                        case 8:
                            _a.sent();
                            try {
                                (0, jwt_guard_1._clearJwtUserCache)(userId);
                            }
                            catch (_b) {
                                /* ignore */
                            }
                            return [2 /*return*/, { ok: true, phone: newPhone }];
                    }
                });
            });
        };
        return AuthService_1;
    }());
    __setFunctionName(_classThis, "AuthService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AuthService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AuthService = _classThis;
}();
exports.AuthService = AuthService;
