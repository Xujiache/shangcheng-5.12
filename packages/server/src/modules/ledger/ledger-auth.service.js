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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerAuthService = void 0;
var common_1 = require("@nestjs/common");
var nanoid_1 = require("nanoid");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
var ledger_avatar_util_1 = require("./ledger-avatar.util");
var ledger_constants_1 = require("./ledger.constants");
var genJti = (0, nanoid_1.customAlphabet)('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 12);
var LEDGER_LOGIN_USER_SELECT = {
    id: true,
    status: true,
    nickname: true,
    avatar: true,
    membership: {
        select: {
            expiresAt: true,
            lastPlanKey: true,
            perpetual: true,
            trialClaimedAt: true,
        },
    },
};
/** 门窗利账鉴权：只接受微信 wx.login，openid 是唯一登录身份。 */
var LedgerAuthService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var LedgerAuthService = _classThis = /** @class */ (function () {
        function LedgerAuthService_1(prisma, jwt) {
            this.prisma = prisma;
            this.jwt = jwt;
            this.logger = new common_1.Logger(LedgerAuthService.name);
        }
        LedgerAuthService_1.prototype.accountCode = function (id) {
            return id.slice(-8).toUpperCase();
        };
        LedgerAuthService_1.prototype.signToken = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var ttl;
                return __generator(this, function (_a) {
                    ttl = Number(process.env.JWT_LEDGER_TOKEN_TTL) || 30 * 24 * 3600;
                    return [2 /*return*/, this.jwt.signAsync({ sub: userId, scope: 'ledger', jti: genJti() }, { expiresIn: ttl })];
                });
            });
        };
        LedgerAuthService_1.prototype.publicUser = function (u) {
            var _a, _b, _c, _d, _e;
            return {
                id: u.id,
                accountCode: this.accountCode(u.id),
                nickname: u.nickname,
                avatar: (0, ledger_avatar_util_1.sanitizeLedgerAvatar)(u.avatar),
                membership: (0, ledger_constants_1.deriveMembership)((_b = (_a = u.membership) === null || _a === void 0 ? void 0 : _a.expiresAt) !== null && _b !== void 0 ? _b : null, (_c = u.membership) === null || _c === void 0 ? void 0 : _c.lastPlanKey, new Date(), {
                    perpetual: (_d = u.membership) === null || _d === void 0 ? void 0 : _d.perpetual,
                    trialClaimedAt: (_e = u.membership) === null || _e === void 0 ? void 0 : _e.trialClaimedAt,
                }),
            };
        };
        LedgerAuthService_1.prototype.readConfig = function () {
            return __awaiter(this, void 0, void 0, function () {
                var row;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerConfig.findUnique({ where: { key: 'global' } })];
                        case 1:
                            row = _a.sent();
                            return [2 /*return*/, (0, ledger_constants_1.normalizeLedgerConfig)(row === null || row === void 0 ? void 0 : row.value)];
                    }
                });
            });
        };
        /** 登录页仅下发品牌配置，不暴露任何额外鉴权开关。 */
        LedgerAuthService_1.prototype.getPublicConfig = function () {
            return __awaiter(this, void 0, void 0, function () {
                var logoUrl, row, _a;
                var _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            logoUrl = '';
                            _d.label = 1;
                        case 1:
                            _d.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.prisma.systemConfig.findUnique({ where: { key: 'system_settings' } })];
                        case 2:
                            row = _d.sent();
                            logoUrl = ((_c = (_b = row === null || row === void 0 ? void 0 : row.value) === null || _b === void 0 ? void 0 : _b.site) === null || _c === void 0 ? void 0 : _c.logo) || '';
                            return [3 /*break*/, 4];
                        case 3:
                            _a = _d.sent();
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/, { logoUrl: logoUrl }];
                    }
                });
            });
        };
        /** 用 wx.login 的 code 换 openid（需配 LEDGER_WX_APPID / LEDGER_WX_SECRET）。 */
        LedgerAuthService_1.prototype.jscode2session = function (code) {
            return __awaiter(this, void 0, void 0, function () {
                var appid, secret, url, data, res, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            appid = process.env.LEDGER_WX_APPID || '';
                            secret = process.env.LEDGER_WX_SECRET || '';
                            if (!appid || !secret) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '微信登录未配置（缺少 AppID / AppSecret）');
                            }
                            url = 'https://api.weixin.qq.com/sns/jscode2session' +
                                "?appid=".concat(encodeURIComponent(appid), "&secret=").concat(encodeURIComponent(secret)) +
                                "&js_code=".concat(encodeURIComponent(code), "&grant_type=authorization_code");
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, globalThis.fetch(url)];
                        case 2:
                            res = _b.sent();
                            return [4 /*yield*/, res.json()];
                        case 3:
                            data = _b.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            _a = _b.sent();
                            throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '微信服务暂不可用，请稍后再试');
                        case 5:
                            if (!(data === null || data === void 0 ? void 0 : data.openid)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '微信授权失败：' + ((data === null || data === void 0 ? void 0 : data.errmsg) || '无效的 code'));
                            }
                            return [2 /*return*/, data.openid];
                    }
                });
            });
        };
        /** 支付下单复用，与登录使用同一个 ledger 小程序 AppID。 */
        LedgerAuthService_1.prototype.codeToOpenid = function (code) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.jscode2session(code)];
                });
            });
        };
        /** 虚拟支付需要 session_key 生成用户态签名。 */
        LedgerAuthService_1.prototype.codeToSession = function (code) {
            return __awaiter(this, void 0, void 0, function () {
                var appid, secret, url, data, res, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            appid = process.env.LEDGER_WX_APPID || '';
                            secret = process.env.LEDGER_WX_SECRET || '';
                            if (!appid || !secret) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '微信登录未配置（缺少 AppID / AppSecret）');
                            }
                            url = 'https://api.weixin.qq.com/sns/jscode2session' +
                                "?appid=".concat(encodeURIComponent(appid), "&secret=").concat(encodeURIComponent(secret)) +
                                "&js_code=".concat(encodeURIComponent(code), "&grant_type=authorization_code");
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, globalThis.fetch(url)];
                        case 2:
                            res = _b.sent();
                            return [4 /*yield*/, res.json()];
                        case 3:
                            data = _b.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            _a = _b.sent();
                            throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '微信服务暂不可用，请稍后再试');
                        case 5:
                            if (!(data === null || data === void 0 ? void 0 : data.openid) || !(data === null || data === void 0 ? void 0 : data.session_key)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '微信授权失败：' + ((data === null || data === void 0 ? void 0 : data.errmsg) || '无效的 code'));
                            }
                            return [2 /*return*/, { openid: data.openid, sessionKey: data.session_key }];
                    }
                });
            });
        };
        LedgerAuthService_1.prototype.resolveInviter = function (inviteCode) {
            return __awaiter(this, void 0, void 0, function () {
                var code, inviter;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            code = String(inviteCode || '')
                                .trim()
                                .toUpperCase();
                            if (!code)
                                return [2 /*return*/, null];
                            return [4 /*yield*/, this.prisma.ledgerUser.findUnique({
                                    where: { inviteCode: code },
                                    select: { id: true, status: true },
                                })];
                        case 1:
                            inviter = _a.sent();
                            return [2 /*return*/, inviter && inviter.status !== 'disabled' ? inviter.id : null];
                    }
                });
            });
        };
        LedgerAuthService_1.prototype.createWechatUser = function (openid, inviteCode) {
            return __awaiter(this, void 0, void 0, function () {
                var inviterId, i, user, e_1, existing;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.resolveInviter(inviteCode)];
                        case 1:
                            inviterId = _a.sent();
                            i = 0;
                            _a.label = 2;
                        case 2:
                            if (!(i < 6)) return [3 /*break*/, 8];
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 5, , 7]);
                            return [4 /*yield*/, this.prisma.ledgerUser.create({
                                    data: {
                                        wxOpenid: openid,
                                        nickname: '微信用户',
                                        inviteCode: (0, ledger_constants_1.genLedgerInviteCode)(),
                                        invitedById: inviterId,
                                        membership: { create: {} },
                                    },
                                    select: LEDGER_LOGIN_USER_SELECT,
                                })];
                        case 4:
                            user = _a.sent();
                            return [2 /*return*/, { user: user, created: true, inviterId: inviterId }];
                        case 5:
                            e_1 = _a.sent();
                            if ((e_1 === null || e_1 === void 0 ? void 0 : e_1.code) !== 'P2002')
                                throw e_1;
                            return [4 /*yield*/, this.prisma.ledgerUser.findUnique({
                                    where: { wxOpenid: openid },
                                    select: LEDGER_LOGIN_USER_SELECT,
                                })];
                        case 6:
                            existing = _a.sent();
                            if (existing)
                                return [2 /*return*/, { user: existing, created: false, inviterId: null }];
                            if (i === 5) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '微信账号创建失败，请重试');
                            }
                            return [3 /*break*/, 7];
                        case 7:
                            i++;
                            return [3 /*break*/, 2];
                        case 8: throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '微信账号创建失败，请重试');
                    }
                });
            });
        };
        /**
         * 微信账号与会员档案是一对一关系：首次登录创建空档案，历史微信账号登录时也补齐。
         * 空档案不代表会员有效，expiresAt=null 会被 deriveMembership 判为“尚未开通”。
         */
        LedgerAuthService_1.prototype.ensureMembership = function (user) {
            return __awaiter(this, void 0, void 0, function () {
                var membership;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (user.membership)
                                return [2 /*return*/, user];
                            return [4 /*yield*/, this.prisma.ledgerMembership.upsert({
                                    where: { userId: user.id },
                                    create: { userId: user.id },
                                    update: {},
                                })];
                        case 1:
                            membership = _a.sent();
                            return [2 /*return*/, __assign(__assign({}, user), { membership: membership })];
                    }
                });
            });
        };
        /** 唯一登录入口：已有 openid 直接登录，不存在则自动建立微信账号。 */
        LedgerAuthService_1.prototype.wechatLogin = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var code, openid, user, created, inviterId, result, cfg, rewarded, e_2, token, pub;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            code = String(dto.code || '').trim();
                            if (!code)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '缺少微信登录 code');
                            return [4 /*yield*/, this.jscode2session(code)];
                        case 1:
                            openid = _a.sent();
                            return [4 /*yield*/, this.prisma.ledgerUser.findUnique({
                                    where: { wxOpenid: openid },
                                    select: LEDGER_LOGIN_USER_SELECT,
                                })];
                        case 2:
                            user = _a.sent();
                            created = false;
                            inviterId = null;
                            if (!!user) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.createWechatUser(openid, dto.inviteCode)];
                        case 3:
                            result = _a.sent();
                            user = result.user;
                            created = result.created;
                            inviterId = result.inviterId;
                            _a.label = 4;
                        case 4: return [4 /*yield*/, this.ensureMembership(user)];
                        case 5:
                            // 对早期已绑定微信、但遗漏 LedgerMembership 行的账号做幂等补齐。
                            // 这样“微信账号 → 会员档案”的关系不会因历史数据而断裂。
                            user = _a.sent();
                            if (user.status === 'disabled') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '账号已被禁用，请联系管理员');
                            }
                            return [4 /*yield*/, this.prisma.ledgerUser.update({
                                    where: { id: user.id },
                                    data: { lastLoginAt: new Date() },
                                })];
                        case 6:
                            _a.sent();
                            if (!(created && inviterId)) return [3 /*break*/, 14];
                            _a.label = 7;
                        case 7:
                            _a.trys.push([7, 13, , 14]);
                            return [4 /*yield*/, this.readConfig()];
                        case 8:
                            cfg = _a.sent();
                            if (!(cfg.inviteRewardDays > 0)) return [3 /*break*/, 12];
                            return [4 /*yield*/, this.prisma.ledgerUser.count({ where: { invitedById: inviterId } })];
                        case 9:
                            rewarded = _a.sent();
                            if (!(cfg.inviteMaxRewarded <= 0 || rewarded <= cfg.inviteMaxRewarded)) return [3 /*break*/, 11];
                            return [4 /*yield*/, this.rewardInviter(inviterId, cfg.inviteRewardDays, this.accountCode(user.id))];
                        case 10:
                            _a.sent();
                            return [3 /*break*/, 12];
                        case 11:
                            this.logger.warn("invite reward capped: inviter=".concat(inviterId, " rewarded=").concat(rewarded, ">").concat(cfg.inviteMaxRewarded));
                            _a.label = 12;
                        case 12: return [3 /*break*/, 14];
                        case 13:
                            e_2 = _a.sent();
                            // 奖励失败不能阻断新用户首次登录。
                            this.logger.warn('invite reward failed: ' + ((e_2 === null || e_2 === void 0 ? void 0 : e_2.message) || e_2));
                            return [3 /*break*/, 14];
                        case 14: return [4 /*yield*/, this.signToken(user.id)];
                        case 15:
                            token = _a.sent();
                            pub = this.publicUser(user);
                            return [2 /*return*/, { token: token, user: pub, membership: pub.membership, created: created }];
                    }
                });
            });
        };
        LedgerAuthService_1.prototype.rewardInviter = function (inviterId, days, newUserCode) {
            return __awaiter(this, void 0, void 0, function () {
                var inviter, membership, before, after;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerUser.findUnique({
                                where: { id: inviterId },
                                select: {
                                    id: true,
                                    membership: {
                                        select: {
                                            id: true,
                                            expiresAt: true,
                                            lastPlanKey: true,
                                        },
                                    },
                                },
                            })];
                        case 1:
                            inviter = _a.sent();
                            if (!inviter)
                                return [2 /*return*/];
                            membership = inviter.membership;
                            if (!!membership) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.ledgerMembership.create({ data: { userId: inviterId } })];
                        case 2:
                            membership = _a.sent();
                            _a.label = 3;
                        case 3:
                            before = membership.expiresAt;
                            after = (0, ledger_constants_1.computeGrantExpiry)(before, days);
                            return [4 /*yield*/, this.prisma.ledgerMembership.update({
                                    where: { id: membership.id },
                                    data: { expiresAt: after, lastPlanKey: membership.lastPlanKey || 'invite' },
                                })];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.ledgerMembershipLog.create({
                                    data: {
                                        membershipId: membership.id,
                                        deltaDays: days,
                                        planKey: 'invite',
                                        beforeAt: before,
                                        afterAt: after,
                                        operatorId: null,
                                        note: "\u9080\u8BF7\u5FAE\u4FE1\u7528\u6237 ".concat(newUserCode, " \u767B\u5F55\u5956\u52B1"),
                                    },
                                })];
                        case 5:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.ledgerNotification
                                    .create({
                                    data: {
                                        userId: inviterId,
                                        type: 'member',
                                        title: '邀请奖励到账',
                                        body: "\u60A8\u9080\u8BF7\u7684\u597D\u53CB ".concat(newUserCode, " \u5DF2\u9996\u6B21\u767B\u5F55\uFF0C\u8D60\u9001 ").concat(days, " \u5929\u4F1A\u5458\uFF0C\u6709\u6548\u671F\u81F3 ").concat(after
                                            .toISOString()
                                            .slice(0, 10), "\u3002"),
                                    },
                                })
                                    .catch(function () { })];
                        case 6:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        return LedgerAuthService_1;
    }());
    __setFunctionName(_classThis, "LedgerAuthService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LedgerAuthService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LedgerAuthService = _classThis;
}();
exports.LedgerAuthService = LedgerAuthService;
