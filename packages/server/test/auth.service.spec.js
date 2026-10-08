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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var globals_1 = require("@jest/globals");
var argon2 = require("argon2");
// nanoid@5 是纯 ESM，ts-jest(CJS) 默认不转换 node_modules，AuthService 导入 customAlphabet
// 会抛 "Cannot use import statement outside a module"。这里用工厂 mock 替换为等价的随机生成器。
globals_1.jest.mock('nanoid', function () { return ({
    customAlphabet: function (alphabet, size) { return function () {
        var s = '';
        for (var i = 0; i < size; i++) {
            s += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        return s;
    }; },
}); });
var auth_service_1 = require("../src/modules/auth/auth.service");
var refresh_token_blacklist_service_1 = require("../src/modules/auth/refresh-token-blacklist.service");
// 单测环境绝不连 Redis：黑名单服务在构造时快照 REDIS_URL，这里先清掉确保走纯内存路径
delete process.env.REDIS_URL;
// ----------------------------------------------------------------------------
// AuthService — 鉴权核心（真实测试）
//
// 实现位置：
//   packages/server/src/modules/auth/auth.service.ts
//   packages/server/src/modules/auth/refresh-token-blacklist.service.ts
//
// 关键行为契约：
//   - refresh token rotation：每次 refresh 都签发新 token，并把旧 jti 列入黑名单
//   - 旧 jti 重放：第二次拿同一个 refresh token → 'refresh token revoked'
//   - 错误语义：缺 _r → 'invalid refresh token'（2001）；真过期 → 2002
//   - adminLogin：argon2 校验、防枚举（账号不存在与密码错误同一文案）、禁用 → 2003
//   - logout：合法 token 吊销 jti；非法 token 仍幂等返回 ok:true
// ----------------------------------------------------------------------------
/** 断言抛出的 BizException 业务码 */
function expectBizCode(fn, code) {
    return __awaiter(this, void 0, void 0, function () {
        var e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fn()];
                case 1:
                    _a.sent();
                    throw new Error('should have thrown');
                case 2:
                    e_1 = _a.sent();
                    (0, globals_1.expect)(e_1.getResponse().code).toBe(code);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/** 捕获抛出异常的 message（用于防枚举对比） */
function catchMessage(fn) {
    return __awaiter(this, void 0, void 0, function () {
        var e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fn()];
                case 1:
                    _a.sent();
                    throw new Error('should have thrown');
                case 2:
                    e_2 = _a.sent();
                    return [2 /*return*/, e_2.getResponse().message];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function makeJwtMock() {
    var _this = this;
    return {
        verifyAsync: globals_1.jest.fn(),
        signAsync: globals_1.jest.fn(function (_payload, _options) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, 'tok'];
        }); }); }),
    };
}
function makeSmsMock() {
    return { sendVerifyCode: globals_1.jest.fn() };
}
// ============================================================================
// A. 黑名单核心 —— RefreshTokenBlacklistService
// ============================================================================
(0, globals_1.describe)('RefreshTokenBlacklistService 黑名单核心', function () {
    var blacklist;
    (0, globals_1.beforeEach)(function () {
        // 单测不设 REDIS_URL → 纯内存路径（与旧版行为完全一致，只是 API 变为 async）
        delete process.env.REDIS_URL;
        blacklist = new refresh_token_blacklist_service_1.RefreshTokenBlacklistService();
    });
    (0, globals_1.afterEach)(function () {
        globals_1.jest.useRealTimers();
    });
    (0, globals_1.it)('revoke 后 isRevoked 返回 true', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, blacklist.revoke('jti-a', 3600)];
                case 1:
                    _b.sent();
                    _a = globals_1.expect;
                    return [4 /*yield*/, blacklist.isRevoked('jti-a')];
                case 2:
                    _a.apply(void 0, [_b.sent()]).toBe(true);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('未被吊销的 jti → isRevoked 返回 false', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = globals_1.expect;
                    return [4 /*yield*/, blacklist.isRevoked('never-revoked')];
                case 1:
                    _a.apply(void 0, [_b.sent()]).toBe(false);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('懒过期：TTL 到点后 isRevoked 返回 false', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    globals_1.jest.useFakeTimers();
                    globals_1.jest.setSystemTime(new Date('2026-06-11T00:00:00Z'));
                    return [4 /*yield*/, blacklist.revoke('jti-short', 1)];
                case 1:
                    _c.sent();
                    _a = globals_1.expect;
                    return [4 /*yield*/, blacklist.isRevoked('jti-short')];
                case 2:
                    _a.apply(void 0, [_c.sent()]).toBe(true);
                    // 推进 2 秒，超过 1 秒 TTL → 懒过期清除
                    globals_1.jest.setSystemTime(Date.now() + 2000);
                    _b = globals_1.expect;
                    return [4 /*yield*/, blacklist.isRevoked('jti-short')];
                case 3:
                    _b.apply(void 0, [_c.sent()]).toBe(false);
                    return [2 /*return*/];
            }
        });
    }); });
});
// ============================================================================
// B/C/D. refresh rotation / 重放 / 错误语义
// ============================================================================
(0, globals_1.describe)('AuthService.refresh —— rotation / 重放 / 错误语义', function () {
    var blacklist;
    var jwt;
    var sms;
    var prisma;
    var service;
    (0, globals_1.beforeEach)(function () {
        blacklist = new refresh_token_blacklist_service_1.RefreshTokenBlacklistService();
        jwt = makeJwtMock();
        sms = makeSmsMock();
        prisma = {
            user: {
                findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/, ({
                                id: 'u1',
                                status: 'active',
                                role: 'customer',
                                merchantId: null,
                            })];
                    });
                }); }),
            },
        };
        service = new auth_service_1.AuthService(prisma, jwt, sms, blacklist);
    });
    // B. rotation
    (0, globals_1.it)('B：成功 rotation 返回新 token 对，且旧 jti 被列入黑名单', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    jwt.verifyAsync.mockResolvedValueOnce({
                        _r: 1,
                        sub: 'u1',
                        role: 'customer',
                        exp: Math.floor(Date.now() / 1000) + 3600,
                        jti: 'old-jti',
                    });
                    return [4 /*yield*/, service.refresh({ refreshToken: 'rt-old' })];
                case 1:
                    result = _b.sent();
                    (0, globals_1.expect)(result).toHaveProperty('accessToken');
                    (0, globals_1.expect)(result).toHaveProperty('refreshToken');
                    (0, globals_1.expect)(result).toHaveProperty('expiresIn');
                    _a = globals_1.expect;
                    return [4 /*yield*/, blacklist.isRevoked('old-jti')];
                case 2:
                    _a.apply(void 0, [_b.sent()]).toBe(true);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('B：refresh 保留原短信认证方式与时间，不延长 15 分钟窗口', function () { return __awaiter(void 0, void 0, void 0, function () {
        var amrAt;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    amrAt = Math.floor(Date.now() / 1000) - 300;
                    jwt.verifyAsync.mockResolvedValueOnce({
                        _r: 1,
                        sub: 'u1',
                        role: 'customer',
                        amr: 'sms',
                        amrAt: amrAt,
                        exp: Math.floor(Date.now() / 1000) + 3600,
                        jti: 'sms-old-jti',
                    });
                    return [4 /*yield*/, service.refresh({ refreshToken: 'rt-sms' })];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(jwt.signAsync.mock.calls[0][0]).toMatchObject({ amr: 'sms', amrAt: amrAt });
                    (0, globals_1.expect)(jwt.signAsync.mock.calls[1][0]).toMatchObject({ amr: 'sms', amrAt: amrAt });
                    return [2 /*return*/];
            }
        });
    }); });
    // C. 重放：同一 token 第二次 refresh
    (0, globals_1.it)('C：同一 refresh token 第二次使用 → 抛 2001 且 message 含 "revoked"', function () { return __awaiter(void 0, void 0, void 0, function () {
        var payload, msg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    payload = {
                        _r: 1,
                        sub: 'u1',
                        role: 'customer',
                        exp: Math.floor(Date.now() / 1000) + 3600,
                        jti: 'old-jti',
                    };
                    // 两次 verify 都通过（同一个 token），rotation 状态由黑名单维护
                    jwt.verifyAsync.mockResolvedValue(payload);
                    // 第一次成功，旧 jti 进黑名单
                    return [4 /*yield*/, service.refresh({ refreshToken: 'rt-old' })
                        // 第二次：jti 已在黑名单 → 重放被拒
                    ];
                case 1:
                    // 第一次成功，旧 jti 进黑名单
                    _a.sent();
                    return [4 /*yield*/, catchMessage(function () { return service.refresh({ refreshToken: 'rt-old' }); })];
                case 2:
                    msg = _a.sent();
                    (0, globals_1.expect)(msg).toContain('revoked');
                    return [4 /*yield*/, expectBizCode(function () { return service.refresh({ refreshToken: 'rt-old' }); }, 2001)];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    // D. 缺 _r 标志 / TokenExpiredError
    (0, globals_1.it)('D：payload 缺 _r 标志 → 2001 "invalid refresh token"', function () { return __awaiter(void 0, void 0, void 0, function () {
        var msg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    jwt.verifyAsync.mockResolvedValue({
                        sub: 'u1',
                        role: 'customer',
                        jti: 'x',
                    });
                    return [4 /*yield*/, catchMessage(function () {
                            return service.refresh({ refreshToken: 'access-token-by-mistake' });
                        })];
                case 1:
                    msg = _a.sent();
                    (0, globals_1.expect)(msg).toBe('invalid refresh token');
                    return [4 /*yield*/, expectBizCode(function () { return service.refresh({ refreshToken: 'access-token-by-mistake' }); }, 2001)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('D：verifyAsync 抛 TokenExpiredError → 2002', function () { return __awaiter(void 0, void 0, void 0, function () {
        var err;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    err = new Error('jwt expired');
                    err.name = 'TokenExpiredError';
                    jwt.verifyAsync.mockRejectedValue(err);
                    return [4 /*yield*/, expectBizCode(function () { return service.refresh({ refreshToken: 'rt-expired' }); }, 2002)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('concurrent refresh of the same credential has exactly one winner', function () { return __awaiter(void 0, void 0, void 0, function () {
        var results;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    jwt.verifyAsync.mockResolvedValue({
                        _r: 1,
                        sub: 'u1',
                        exp: Math.floor(Date.now() / 1000) + 3600,
                        jti: 'race',
                    });
                    return [4 /*yield*/, Promise.allSettled([
                            service.refresh({ refreshToken: 'same' }),
                            service.refresh({ refreshToken: 'same' }),
                        ])];
                case 1:
                    results = _a.sent();
                    (0, globals_1.expect)(results.filter(function (r) { return r.status === 'fulfilled'; })).toHaveLength(1);
                    (0, globals_1.expect)(results.filter(function (r) { return r.status === 'rejected'; })).toHaveLength(1);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('legacy refresh tokens are still one-use, without storing the raw token', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    jwt.verifyAsync.mockResolvedValue({
                        _r: 1,
                        sub: 'u1',
                        exp: Math.floor(Date.now() / 1000) + 3600,
                    });
                    return [4 /*yield*/, service.refresh({ refreshToken: 'legacy-secret' })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, expectBizCode(function () { return service.refresh({ refreshToken: 'legacy-secret' }); }, 2001)];
                case 2:
                    _a.sent();
                    (0, globals_1.expect)(__spreadArray([], blacklist.store.keys(), true)[0]).toMatch(/^legacy:[a-f0-9]{64}$/);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('refresh uses the current account role and rejects disabled accounts', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    jwt.verifyAsync.mockResolvedValue({
                        _r: 1,
                        sub: 'u1',
                        role: 'admin',
                        merchantId: 'old',
                        exp: Math.floor(Date.now() / 1000) + 3600,
                        jti: 'current',
                    });
                    return [4 /*yield*/, service.refresh({ refreshToken: 'current' })];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(jwt.signAsync.mock.calls[0][0]).toMatchObject({
                        role: 'customer',
                        merchantId: undefined,
                    });
                    prisma.user.findUnique.mockResolvedValue({ id: 'u1', status: 'disabled' });
                    jwt.verifyAsync.mockResolvedValue({
                        _r: 1,
                        sub: 'u1',
                        exp: Math.floor(Date.now() / 1000) + 3600,
                        jti: 'disabled',
                    });
                    return [4 /*yield*/, expectBizCode(function () { return service.refresh({ refreshToken: 'disabled' }); }, 2003)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
// ============================================================================
// E. adminLogin
// ============================================================================
(0, globals_1.describe)('AuthService.adminLogin', function () {
    var blacklist;
    var jwt;
    var sms;
    var prisma;
    var service;
    var PLAIN = 'secret123';
    (0, globals_1.beforeEach)(function () {
        blacklist = new refresh_token_blacklist_service_1.RefreshTokenBlacklistService();
        jwt = makeJwtMock();
        sms = makeSmsMock();
        prisma = {
            user: {
                findFirst: globals_1.jest.fn(),
                update: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, ({})];
                }); }); }),
            },
        };
        service = new auth_service_1.AuthService(prisma, jwt, sms, blacklist);
    });
    (0, globals_1.it)('E：正确密码 → 返回平铺 token 字段 + user.hasPassword=true 且响应不含 passwordHash', function () { return __awaiter(void 0, void 0, void 0, function () {
        var passwordHash, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, argon2.hash(PLAIN)];
                case 1:
                    passwordHash = _a.sent();
                    prisma.user.findFirst.mockResolvedValue({
                        id: 'admin-1',
                        username: 'admin',
                        role: 'admin',
                        status: 'active',
                        merchantId: null,
                        passwordHash: passwordHash,
                        adminRole: { name: '超级管理员' },
                    });
                    return [4 /*yield*/, service.adminLogin({ username: 'admin', password: PLAIN })
                        // 平铺 token 字段
                    ];
                case 2:
                    res = _a.sent();
                    // 平铺 token 字段
                    (0, globals_1.expect)(res.token).toBe(res.accessToken);
                    (0, globals_1.expect)(res).toHaveProperty('refreshToken');
                    (0, globals_1.expect)(res).toHaveProperty('expiresIn');
                    // hasPassword 暴露为 boolean
                    (0, globals_1.expect)(res.user.hasPassword).toBe(true);
                    // 绝不回传 passwordHash
                    (0, globals_1.expect)(res.user.passwordHash).toBeUndefined();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('E：密码错误 与 账号不存在 返回完全相同的文案（防枚举）', function () { return __awaiter(void 0, void 0, void 0, function () {
        var passwordHash, wrongPwdMsg, unknownMsg;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, argon2.hash(PLAIN)
                    // 第一次：账号存在但密码错
                ];
                case 1:
                    passwordHash = _a.sent();
                    // 第一次：账号存在但密码错
                    prisma.user.findFirst.mockResolvedValueOnce({
                        id: 'admin-1',
                        username: 'admin',
                        role: 'admin',
                        status: 'active',
                        passwordHash: passwordHash,
                        adminRole: null,
                    });
                    return [4 /*yield*/, catchMessage(function () {
                            return service.adminLogin({ username: 'admin', password: 'WRONG' });
                        })
                        // 第二次：账号不存在
                    ];
                case 2:
                    wrongPwdMsg = _a.sent();
                    // 第二次：账号不存在
                    prisma.user.findFirst.mockResolvedValueOnce(null);
                    return [4 /*yield*/, catchMessage(function () {
                            return service.adminLogin({ username: 'ghost', password: PLAIN });
                        })];
                case 3:
                    unknownMsg = _a.sent();
                    (0, globals_1.expect)(wrongPwdMsg).toBe(unknownMsg);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('E：账号被禁用 → 2003', function () { return __awaiter(void 0, void 0, void 0, function () {
        var passwordHash;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, argon2.hash(PLAIN)];
                case 1:
                    passwordHash = _a.sent();
                    prisma.user.findFirst.mockResolvedValue({
                        id: 'admin-1',
                        username: 'admin',
                        role: 'admin',
                        status: 'disabled',
                        passwordHash: passwordHash,
                        adminRole: null,
                    });
                    return [4 /*yield*/, expectBizCode(function () { return service.adminLogin({ username: 'admin', password: PLAIN }); }, 2003)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('E：账号形如手机号时 where.OR 含 3 个条件（username/email/phone）', function () { return __awaiter(void 0, void 0, void 0, function () {
        var passwordHash, callArg, keys;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, argon2.hash(PLAIN)];
                case 1:
                    passwordHash = _a.sent();
                    prisma.user.findFirst.mockResolvedValue({
                        id: 'm-1',
                        username: '13800138000',
                        role: 'merchant',
                        status: 'active',
                        passwordHash: passwordHash,
                        adminRole: null,
                    });
                    return [4 /*yield*/, service.adminLogin({ username: '13800138000', password: PLAIN })];
                case 2:
                    _a.sent();
                    callArg = prisma.user.findFirst.mock.calls[0][0];
                    (0, globals_1.expect)(callArg.where.OR).toHaveLength(3);
                    keys = callArg.where.OR.map(function (c) { return Object.keys(c)[0]; });
                    (0, globals_1.expect)(keys).toEqual(globals_1.expect.arrayContaining(['username', 'email', 'phone']));
                    return [2 /*return*/];
            }
        });
    }); });
});
// ============================================================================
// F. 商家 APP 专用手机号登录
// ============================================================================
(0, globals_1.describe)('AuthService 商家手机号登录', function () {
    var blacklist;
    var jwt;
    var sms;
    var prisma;
    var service;
    var PHONE = '13800138000';
    var PLAIN = 'secret123';
    (0, globals_1.beforeEach)(function () {
        blacklist = new refresh_token_blacklist_service_1.RefreshTokenBlacklistService();
        jwt = makeJwtMock();
        sms = makeSmsMock();
        prisma = {
            user: {
                findUnique: globals_1.jest.fn(),
                update: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, ({})];
                }); }); }),
                create: globals_1.jest.fn(),
            },
            merchant: {
                findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/, ({
                                status: 'active',
                                name: '测试门窗厂',
                                type: 'factory',
                                rejectReason: null,
                            })];
                    });
                }); }),
            },
            smsCode: {
                findFirst: globals_1.jest.fn(),
                update: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, ({})];
                }); }); }),
            },
        };
        service = new auth_service_1.AuthService(prisma, jwt, sms, blacklist);
    });
    (0, globals_1.it)('手机号密码成功：只按 phone 查询并返回商家申请状态', function () { return __awaiter(void 0, void 0, void 0, function () {
        var passwordHash, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, argon2.hash(PLAIN)];
                case 1:
                    passwordHash = _a.sent();
                    prisma.user.findUnique.mockResolvedValue({
                        id: 'merchant-user-1',
                        phone: PHONE,
                        nickname: '商家',
                        role: 'factory',
                        status: 'active',
                        merchantId: 'merchant-1',
                        passwordHash: passwordHash,
                        adminRole: null,
                    });
                    return [4 /*yield*/, service.merchantPasswordLogin({ phone: PHONE, password: PLAIN })];
                case 2:
                    res = _a.sent();
                    (0, globals_1.expect)(prisma.user.findUnique).toHaveBeenCalledWith({
                        where: { phone: PHONE },
                        include: { adminRole: true },
                    });
                    (0, globals_1.expect)(res.merchantApplication).toMatchObject({ status: 'active', type: 'factory' });
                    (0, globals_1.expect)(res.user.passwordHash).toBeUndefined();
                    (0, globals_1.expect)(jwt.signAsync.mock.calls[0][0]).toMatchObject({ amr: 'password' });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('密码错误与手机号不存在返回相同文案（防枚举）', function () { return __awaiter(void 0, void 0, void 0, function () {
        var passwordHash, wrongMessage, unknownMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, argon2.hash(PLAIN)];
                case 1:
                    passwordHash = _a.sent();
                    prisma.user.findUnique.mockResolvedValueOnce({
                        id: 'merchant-user-1',
                        role: 'factory',
                        status: 'active',
                        passwordHash: passwordHash,
                        adminRole: null,
                    });
                    return [4 /*yield*/, catchMessage(function () {
                            return service.merchantPasswordLogin({ phone: PHONE, password: 'wrong-password' });
                        })];
                case 2:
                    wrongMessage = _a.sent();
                    prisma.user.findUnique.mockResolvedValueOnce(null);
                    return [4 /*yield*/, catchMessage(function () {
                            return service.merchantPasswordLogin({ phone: PHONE, password: PLAIN });
                        })];
                case 3:
                    unknownMessage = _a.sent();
                    (0, globals_1.expect)(wrongMessage).toBe('手机号或密码错误');
                    (0, globals_1.expect)(unknownMessage).toBe(wrongMessage);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('手机号密码登录遇到禁用账号返回 2003', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, _b;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _b = (_a = prisma.user.findUnique).mockResolvedValue;
                    _c = {
                        id: 'merchant-user-1',
                        role: 'factory',
                        status: 'disabled'
                    };
                    return [4 /*yield*/, argon2.hash(PLAIN)];
                case 1:
                    _b.apply(_a, [(_c.passwordHash = _d.sent(),
                            _c.adminRole = null,
                            _c)]);
                    return [4 /*yield*/, expectBizCode(function () { return service.merchantPasswordLogin({ phone: PHONE, password: PLAIN }); }, 2003)];
                case 2:
                    _d.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('验证码登录未知手机号：明确提示先注册且绝不创建用户', function () { return __awaiter(void 0, void 0, void 0, function () {
        var message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma.user.findUnique.mockResolvedValue(null);
                    return [4 /*yield*/, catchMessage(function () {
                            return service.merchantSmsLogin({ phone: PHONE, code: '123456' });
                        })];
                case 1:
                    message = _a.sent();
                    (0, globals_1.expect)(message).toContain('请先注册');
                    (0, globals_1.expect)(prisma.user.create).not.toHaveBeenCalled();
                    (0, globals_1.expect)(prisma.smsCode.update).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('验证码错误或过期：不消费验证码', function () { return __awaiter(void 0, void 0, void 0, function () {
        var message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma.user.findUnique.mockResolvedValue({
                        id: 'merchant-user-1',
                        role: 'customer',
                        status: 'active',
                        passwordHash: null,
                        adminRole: null,
                    });
                    prisma.smsCode.findFirst.mockResolvedValue(null);
                    return [4 /*yield*/, catchMessage(function () {
                            return service.merchantSmsLogin({ phone: PHONE, code: '123456' });
                        })];
                case 1:
                    message = _a.sent();
                    (0, globals_1.expect)(message).toBe('验证码错误或已过期');
                    (0, globals_1.expect)(prisma.smsCode.update).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('验证码登录已有用户：消费 login 场景验证码并记录短信认证时间', function () { return __awaiter(void 0, void 0, void 0, function () {
        var res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma.user.findUnique.mockResolvedValue({
                        id: 'merchant-user-1',
                        phone: PHONE,
                        role: 'customer',
                        status: 'active',
                        passwordHash: null,
                        adminRole: null,
                    });
                    prisma.smsCode.findFirst.mockResolvedValue({ id: 'sms-1' });
                    return [4 /*yield*/, service.merchantSmsLogin({ phone: PHONE, code: '123456' })];
                case 1:
                    res = _a.sent();
                    (0, globals_1.expect)(prisma.smsCode.findFirst.mock.calls[0][0].where).toMatchObject({
                        phone: PHONE,
                        code: '123456',
                        scene: 'login',
                        used: false,
                    });
                    (0, globals_1.expect)(prisma.smsCode.update).toHaveBeenCalledWith({
                        where: { id: 'sms-1' },
                        data: { used: true },
                    });
                    (0, globals_1.expect)(res.merchantApplication.status).toBe('active');
                    (0, globals_1.expect)(jwt.signAsync.mock.calls[0][0]).toMatchObject({
                        amr: 'sms',
                        amrAt: globals_1.expect.any(Number),
                    });
                    return [2 /*return*/];
            }
        });
    }); });
});
// ============================================================================
// G. logout
// ============================================================================
(0, globals_1.describe)('AuthService.logout', function () {
    var blacklist;
    var jwt;
    var sms;
    var prisma;
    var service;
    (0, globals_1.beforeEach)(function () {
        blacklist = new refresh_token_blacklist_service_1.RefreshTokenBlacklistService();
        jwt = makeJwtMock();
        sms = makeSmsMock();
        prisma = {};
        service = new auth_service_1.AuthService(prisma, jwt, sms, blacklist);
    });
    (0, globals_1.it)('F：合法 refresh token → {ok:true} 且 jti 被吊销', function () { return __awaiter(void 0, void 0, void 0, function () {
        var res, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    jwt.verifyAsync.mockResolvedValue({
                        sub: 'u1',
                        jti: 'logout-jti',
                        exp: Math.floor(Date.now() / 1000) + 3600,
                    });
                    return [4 /*yield*/, service.logout('rt-valid')];
                case 1:
                    res = _b.sent();
                    (0, globals_1.expect)(res).toEqual({ ok: true });
                    _a = globals_1.expect;
                    return [4 /*yield*/, blacklist.isRevoked('logout-jti')];
                case 2:
                    _a.apply(void 0, [_b.sent()]).toBe(true);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('F：垃圾 token（verify 抛错）仍幂等返回 {ok:true}', function () { return __awaiter(void 0, void 0, void 0, function () {
        var res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    jwt.verifyAsync.mockRejectedValue(new Error('jwt malformed'));
                    return [4 /*yield*/, service.logout('garbage')];
                case 1:
                    res = _a.sent();
                    (0, globals_1.expect)(res).toEqual({ ok: true });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('does not report logout success when shared revocation fails', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    jwt.verifyAsync.mockResolvedValue({
                        sub: 'u1',
                        jti: 'logout-error',
                        exp: Math.floor(Date.now() / 1000) + 3600,
                    });
                    globals_1.jest.spyOn(blacklist, 'revoke').mockRejectedValue(new Error('unavailable'));
                    return [4 /*yield*/, (0, globals_1.expect)(service.logout('valid')).rejects.toThrow('unavailable')];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
