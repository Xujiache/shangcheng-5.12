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
// nanoid@5 是纯 ESM，ts-jest(CJS) 使用确定性替身。
globals_1.jest.mock('nanoid', function () { return ({
    customAlphabet: function (_alphabet, size) { return function () { return 'A'.repeat(size); }; },
}); });
var ledger_auth_service_1 = require("../src/modules/ledger/ledger-auth.service");
function buildPrisma() {
    var _this = this;
    return {
        ledgerUser: {
            findUnique: globals_1.jest.fn(function () {
                var _args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _args[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, null];
                }); });
            }),
            create: globals_1.jest.fn(function () {
                var _args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _args[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, null];
                }); });
            }),
            update: globals_1.jest.fn(function () {
                var _args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _args[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, ({})];
                }); });
            }),
            count: globals_1.jest.fn(function () {
                var _args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _args[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, 0];
                }); });
            }),
        },
        ledgerConfig: {
            findUnique: globals_1.jest.fn(function () {
                var _args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _args[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, null];
                }); });
            }),
        },
        systemConfig: {
            findUnique: globals_1.jest.fn(function () {
                var _args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _args[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, null];
                }); });
            }),
        },
        ledgerMembership: {
            create: globals_1.jest.fn(function () {
                var _args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _args[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, null];
                }); });
            }),
            upsert: globals_1.jest.fn(function () {
                var _args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _args[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, null];
                }); });
            }),
            update: globals_1.jest.fn(function () {
                var _args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _args[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, null];
                }); });
            }),
        },
        ledgerMembershipLog: {
            create: globals_1.jest.fn(function () {
                var _args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _args[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, null];
                }); });
            }),
        },
        ledgerNotification: {
            create: globals_1.jest.fn(function () {
                var _args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _args[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, null];
                }); });
            }),
        },
    };
}
function buildService(prisma) {
    var _this = this;
    var jwt = { signAsync: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, 'ledger-token'];
        }); }); }) };
    var service = new ledger_auth_service_1.LedgerAuthService(prisma, jwt);
    service.jscode2session = globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, 'openid-1'];
    }); }); });
    return { service: service, jwt: jwt };
}
var activeUser = function (overrides) {
    if (overrides === void 0) { overrides = {}; }
    return (__assign({ id: 'user-abc12345', nickname: '微信用户', avatar: null, status: 'active', membership: null }, overrides));
};
(0, globals_1.describe)('LedgerAuthService 纯微信登录', function () {
    var prisma;
    var service;
    (0, globals_1.beforeEach)(function () {
        prisma = buildPrisma();
        service = buildService(prisma).service;
    });
    (0, globals_1.it)('已有 openid 直接登录，不重复建号', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma.ledgerUser.findUnique.mockResolvedValueOnce(activeUser());
                    return [4 /*yield*/, service.wechatLogin({ code: 'wx-code' })];
                case 1:
                    result = _a.sent();
                    (0, globals_1.expect)(result.token).toBe('ledger-token');
                    (0, globals_1.expect)(result.created).toBe(false);
                    (0, globals_1.expect)(result.user).toMatchObject({
                        id: 'user-abc12345',
                        accountCode: 'ABC12345',
                        nickname: '微信用户',
                    });
                    (0, globals_1.expect)(prisma.ledgerUser.create).not.toHaveBeenCalled();
                    (0, globals_1.expect)(prisma.ledgerUser.update).toHaveBeenCalledWith({
                        where: { id: 'user-abc12345' },
                        data: { lastLoginAt: globals_1.expect.any(Date) },
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('历史微信账号缺少会员行时，登录会补建默认未开通会员档案', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma.ledgerUser.findUnique.mockResolvedValueOnce(activeUser());
                    prisma.ledgerMembership.upsert.mockResolvedValueOnce({
                        id: 'member-1',
                        userId: 'user-abc12345',
                        expiresAt: null,
                        lastPlanKey: null,
                        perpetual: false,
                        trialClaimedAt: null,
                    });
                    return [4 /*yield*/, service.wechatLogin({ code: 'wx-code' })];
                case 1:
                    result = _a.sent();
                    (0, globals_1.expect)(prisma.ledgerMembership.upsert).toHaveBeenCalledWith({
                        where: { userId: 'user-abc12345' },
                        create: { userId: 'user-abc12345' },
                        update: {},
                    });
                    (0, globals_1.expect)(result.membership).toMatchObject({ active: false, never: true });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('首次微信登录自动创建账号和空会员记录', function () { return __awaiter(void 0, void 0, void 0, function () {
        var created, result, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    created = activeUser();
                    prisma.ledgerUser.findUnique.mockResolvedValueOnce(null);
                    prisma.ledgerUser.create.mockResolvedValueOnce(created);
                    return [4 /*yield*/, service.wechatLogin({ code: 'wx-code' })];
                case 1:
                    result = _a.sent();
                    (0, globals_1.expect)(result.created).toBe(true);
                    (0, globals_1.expect)(prisma.ledgerUser.create).toHaveBeenCalledWith({
                        data: {
                            wxOpenid: 'openid-1',
                            nickname: '微信用户',
                            inviteCode: 'AAAAAAAA',
                            invitedById: null,
                            membership: { create: {} },
                        },
                        select: {
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
                        },
                    });
                    data = prisma.ledgerUser.create.mock.calls[0][0].data;
                    (0, globals_1.expect)(data).not.toHaveProperty('phone');
                    (0, globals_1.expect)(data).not.toHaveProperty('passwordHash');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('同一 openid 并发首次登录时复用唯一索引已创建账号', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma.ledgerUser.findUnique
                        .mockResolvedValueOnce(null)
                        .mockResolvedValueOnce(activeUser());
                    prisma.ledgerUser.create.mockRejectedValueOnce({ code: 'P2002' });
                    return [4 /*yield*/, service.wechatLogin({ code: 'wx-code' })];
                case 1:
                    result = _a.sent();
                    (0, globals_1.expect)(result.created).toBe(false);
                    (0, globals_1.expect)(result.user.id).toBe('user-abc12345');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('禁用的微信账号不能登录', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma.ledgerUser.findUnique.mockResolvedValueOnce(activeUser({ status: 'disabled' }));
                    return [4 /*yield*/, (0, globals_1.expect)(service.wechatLogin({ code: 'wx-code' })).rejects.toMatchObject({
                            message: '账号已被禁用，请联系管理员',
                        })];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(prisma.ledgerUser.update).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('邀请奖励只在好友首次微信登录建号后发放', function () { return __awaiter(void 0, void 0, void 0, function () {
        var inviter, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    inviter = {
                        id: 'inviter-87654321',
                        status: 'active',
                        membership: {
                            id: 'member-1',
                            expiresAt: null,
                            lastPlanKey: null,
                        },
                    };
                    prisma.ledgerUser.findUnique
                        .mockResolvedValueOnce(null)
                        .mockResolvedValueOnce({ id: inviter.id, status: 'active' })
                        .mockResolvedValueOnce(inviter);
                    prisma.ledgerUser.create.mockResolvedValueOnce(activeUser());
                    prisma.ledgerUser.count.mockResolvedValueOnce(1);
                    prisma.ledgerConfig.findUnique.mockResolvedValueOnce({
                        value: { inviteRewardDays: 7, inviteMaxRewarded: 50 },
                    });
                    return [4 /*yield*/, service.wechatLogin({ code: 'wx-code', inviteCode: 'invite88' })];
                case 1:
                    result = _a.sent();
                    (0, globals_1.expect)(result.created).toBe(true);
                    (0, globals_1.expect)(prisma.ledgerUser.create).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                        data: globals_1.expect.objectContaining({ invitedById: inviter.id }),
                    }));
                    (0, globals_1.expect)(prisma.ledgerMembershipLog.create).toHaveBeenCalledWith({
                        data: globals_1.expect.objectContaining({
                            membershipId: 'member-1',
                            deltaDays: 7,
                            planKey: 'invite',
                        }),
                    });
                    (0, globals_1.expect)(prisma.ledgerNotification.create).toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('LedgerAuthService 登录页公开配置', function () {
    (0, globals_1.it)('只返回品牌 LOGO，不再返回其他登录方式开关', function () { return __awaiter(void 0, void 0, void 0, function () {
        var prisma, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = buildPrisma();
                    prisma.systemConfig.findUnique.mockResolvedValueOnce({
                        value: { site: { logo: 'https://cdn.example/logo.png' } },
                    });
                    service = buildService(prisma).service;
                    return [4 /*yield*/, (0, globals_1.expect)(service.getPublicConfig()).resolves.toEqual({
                            logoUrl: 'https://cdn.example/logo.png',
                        })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
