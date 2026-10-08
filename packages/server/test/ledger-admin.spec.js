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
// nanoid@5 是纯 ESM，ts-jest(CJS) 无法直接 require，使用轻量替身。
globals_1.jest.mock('nanoid', function () { return ({
    customAlphabet: function (alphabet, size) { return function () {
        var out = '';
        for (var i = 0; i < size; i++) {
            out += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        return out;
    }; },
}); });
var ledger_admin_service_1 = require("../src/modules/ledger/ledger-admin.service");
var DAY_MS = 86400000;
// approx：两个时间戳相差不超过 toleranceMs（默认 5s）。
function approxMs(actual, expected, toleranceMs) {
    if (toleranceMs === void 0) { toleranceMs = 5000; }
    (0, globals_1.expect)(Math.abs(actual - expected)).toBeLessThanOrEqual(toleranceMs);
}
function buildPrisma() {
    var _this = this;
    var delegates = {
        ledgerUser: {
            findUnique: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, null];
                }); });
            }),
            findMany: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, []];
                }); });
            }),
            count: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, 0];
                }); });
            }),
            create: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, ({})];
                }); });
            }),
            update: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, ({})];
                }); });
            }),
        },
        ledgerMembership: {
            findUnique: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, null];
                }); });
            }),
            create: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, ({})];
                }); });
            }),
            update: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, ({})];
                }); });
            }),
        },
        ledgerMembershipLog: {
            create: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, ({})];
                }); });
            }),
            findMany: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, []];
                }); });
            }),
        },
        ledgerNotification: {
            create: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, ({})];
                }); });
            }),
        },
        ledgerConfig: {
            findUnique: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, null];
                }); });
            }),
            upsert: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, ({})];
                }); });
            }),
        },
        ledgerFeedback: {
            findUnique: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, null];
                }); });
            }),
            update: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, ({})];
                }); });
            }),
            findMany: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, []];
                }); });
            }),
            count: globals_1.jest.fn(function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
                    return [2 /*return*/, 0];
                }); });
            }),
        },
    };
    return __assign(__assign({}, delegates), { $transaction: globals_1.jest.fn(function (work, _options) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_b) {
            return [2 /*return*/, work(delegates)];
        }); }); }) });
}
(0, globals_1.describe)('LedgerAdminService.grantMembership', function () {
    var prisma;
    var service;
    (0, globals_1.beforeEach)(function () {
        prisma = buildPrisma();
        service = new ledger_admin_service_1.LedgerAdminService(prisma);
    });
    (0, globals_1.it)('用例1：planKey=month 从未开通 → 到期≈now+30d，日志 deltaDays=30/beforeAt=null', function () { return __awaiter(void 0, void 0, void 0, function () {
        var now, res, updateArg, logArg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    // 用户存在，会员行存在但 expiresAt=null（从未开通）
                    prisma.ledgerUser.findUnique.mockResolvedValueOnce({ id: 'u1' });
                    prisma.ledgerMembership.findUnique.mockResolvedValueOnce({
                        id: 'm1',
                        expiresAt: null,
                        lastPlanKey: null,
                        perpetual: false,
                    });
                    // update 回传一个带 expiresAt 的会员，便于 deriveMembership 派生状态
                    prisma.ledgerMembership.update.mockImplementationOnce(function (args) { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_b) {
                            return [2 /*return*/, ({
                                    id: 'm1',
                                    expiresAt: args.data.expiresAt,
                                    lastPlanKey: args.data.lastPlanKey,
                                })];
                        });
                    }); });
                    now = Date.now();
                    return [4 /*yield*/, service.grantMembership('u1', { planKey: 'month' }, 'op1')];
                case 1:
                    res = _b.sent();
                    (0, globals_1.expect)(res.deltaDays).toBe(30);
                    updateArg = prisma.ledgerMembership.update.mock.calls[0][0];
                    approxMs(new Date(updateArg.data.expiresAt).getTime(), now + 30 * DAY_MS);
                    logArg = prisma.ledgerMembershipLog.create.mock.calls[0][0];
                    (0, globals_1.expect)(logArg.data.deltaDays).toBe(30);
                    (0, globals_1.expect)(logArg.data.beforeAt).toBeNull();
                    (0, globals_1.expect)(prisma.$transaction).toHaveBeenCalledWith(globals_1.expect.any(Function), {
                        isolationLevel: 'Serializable',
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例2：days 与 planKey 同传 → days 优先（days=5, planKey=year → delta=5）', function () { return __awaiter(void 0, void 0, void 0, function () {
        var now, res, logArg, updateArg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.ledgerUser.findUnique.mockResolvedValueOnce({ id: 'u1' });
                    prisma.ledgerMembership.findUnique.mockResolvedValueOnce({
                        id: 'm1',
                        expiresAt: null,
                        lastPlanKey: null,
                        perpetual: false,
                    });
                    prisma.ledgerMembership.update.mockImplementationOnce(function (args) { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_b) {
                            return [2 /*return*/, ({
                                    id: 'm1',
                                    expiresAt: args.data.expiresAt,
                                    lastPlanKey: args.data.lastPlanKey,
                                })];
                        });
                    }); });
                    now = Date.now();
                    return [4 /*yield*/, service.grantMembership('u1', { days: 5, planKey: 'year' })];
                case 1:
                    res = _b.sent();
                    (0, globals_1.expect)(res.deltaDays).toBe(5);
                    logArg = prisma.ledgerMembershipLog.create.mock.calls[0][0];
                    (0, globals_1.expect)(logArg.data.deltaDays).toBe(5);
                    updateArg = prisma.ledgerMembership.update.mock.calls[0][0];
                    approxMs(new Date(updateArg.data.expiresAt).getTime(), now + 5 * DAY_MS);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例3：无 days 且 planKey 非法/缺失 → 1001', function () { return __awaiter(void 0, void 0, void 0, function () {
        var e_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.ledgerUser.findUnique.mockResolvedValueOnce({ id: 'u1' });
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, service.grantMembership('u1', { planKey: 'nope' })];
                case 2:
                    _b.sent();
                    throw new Error('should have thrown');
                case 3:
                    e_1 = _b.sent();
                    (0, globals_1.expect)(e_1.getResponse().code).toBe(1001);
                    return [3 /*break*/, 4];
                case 4:
                    // 既未写会员也未写日志
                    (0, globals_1.expect)(prisma.ledgerMembership.update).not.toHaveBeenCalled();
                    (0, globals_1.expect)(prisma.ledgerMembershipLog.create).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例4：当前到期+10d，叠加 30 → afterAt≈+40d（不浪费剩余时长）', function () { return __awaiter(void 0, void 0, void 0, function () {
        var now, currentExpiry, res, updateArg, logArg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    now = Date.now();
                    currentExpiry = new Date(now + 10 * DAY_MS);
                    prisma.ledgerUser.findUnique.mockResolvedValueOnce({ id: 'u1' });
                    prisma.ledgerMembership.findUnique.mockResolvedValueOnce({
                        id: 'm1',
                        expiresAt: currentExpiry,
                        lastPlanKey: 'month',
                        perpetual: false,
                    });
                    prisma.ledgerMembership.update.mockImplementationOnce(function (args) { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_b) {
                            return [2 /*return*/, ({
                                    id: 'm1',
                                    expiresAt: args.data.expiresAt,
                                    lastPlanKey: args.data.lastPlanKey,
                                })];
                        });
                    }); });
                    return [4 /*yield*/, service.grantMembership('u1', { days: 30 })];
                case 1:
                    res = _b.sent();
                    (0, globals_1.expect)(res.deltaDays).toBe(30);
                    updateArg = prisma.ledgerMembership.update.mock.calls[0][0];
                    approxMs(new Date(updateArg.data.expiresAt).getTime(), now + 40 * DAY_MS);
                    logArg = prisma.ledgerMembershipLog.create.mock.calls[0][0];
                    (0, globals_1.expect)(new Date(logArg.data.beforeAt).getTime()).toBe(currentExpiry.getTime());
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例5：会员行缺失 → 自动创建后再开通', function () { return __awaiter(void 0, void 0, void 0, function () {
        var createArg, updateArg, logArg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.ledgerUser.findUnique.mockResolvedValueOnce({ id: 'u1' });
                    prisma.ledgerMembership.findUnique.mockResolvedValueOnce(null); // 没有 1:1 会员行
                    prisma.ledgerMembership.create.mockResolvedValueOnce({
                        id: 'm-new',
                        expiresAt: null,
                        lastPlanKey: null,
                    });
                    prisma.ledgerMembership.update.mockImplementationOnce(function (args) { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_b) {
                            return [2 /*return*/, ({
                                    id: 'm-new',
                                    expiresAt: args.data.expiresAt,
                                    lastPlanKey: args.data.lastPlanKey,
                                })];
                        });
                    }); });
                    return [4 /*yield*/, service.grantMembership('u1', { days: 7 })
                        // 自动建会员行
                    ];
                case 1:
                    _b.sent();
                    // 自动建会员行
                    (0, globals_1.expect)(prisma.ledgerMembership.create).toHaveBeenCalledTimes(1);
                    createArg = prisma.ledgerMembership.create.mock.calls[0][0];
                    (0, globals_1.expect)(createArg.data.userId).toBe('u1');
                    updateArg = prisma.ledgerMembership.update.mock.calls[0][0];
                    (0, globals_1.expect)(updateArg.where.id).toBe('m-new');
                    logArg = prisma.ledgerMembershipLog.create.mock.calls[0][0];
                    (0, globals_1.expect)(logArg.data.membershipId).toBe('m-new');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例6：通知写入失败不影响返回（best-effort）', function () { return __awaiter(void 0, void 0, void 0, function () {
        var res;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.ledgerUser.findUnique.mockResolvedValueOnce({ id: 'u1' });
                    prisma.ledgerMembership.findUnique.mockResolvedValueOnce({
                        id: 'm1',
                        expiresAt: null,
                        lastPlanKey: null,
                        perpetual: false,
                    });
                    prisma.ledgerMembership.update.mockImplementationOnce(function (args) { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_b) {
                            return [2 /*return*/, ({
                                    id: 'm1',
                                    expiresAt: args.data.expiresAt,
                                    lastPlanKey: args.data.lastPlanKey,
                                })];
                        });
                    }); });
                    prisma.ledgerNotification.create.mockRejectedValueOnce(new Error('db down'));
                    return [4 /*yield*/, service.grantMembership('u1', { days: 30 })
                        // 通知失败被吞掉，主流程照常返回
                    ];
                case 1:
                    res = _b.sent();
                    // 通知失败被吞掉，主流程照常返回
                    (0, globals_1.expect)(res.deltaDays).toBe(30);
                    (0, globals_1.expect)(res.membership).toBeDefined();
                    (0, globals_1.expect)(prisma.ledgerNotification.create).toHaveBeenCalledTimes(1);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例7：动态永久套餐 → expiresAt=null + 永久审计/通知，不写 3650 天', function () { return __awaiter(void 0, void 0, void 0, function () {
        var oldExpiry, res, updateArg, logArg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    oldExpiry = new Date(Date.now() + 30 * DAY_MS);
                    prisma.ledgerUser.findUnique.mockResolvedValueOnce({ id: 'u1' });
                    prisma.ledgerConfig.findUnique.mockResolvedValueOnce({
                        value: {
                            plans: [
                                {
                                    key: 'lifetime',
                                    label: '永久会员',
                                    days: 3650,
                                    price: '¥999',
                                    perpetual: true,
                                },
                            ],
                        },
                    });
                    prisma.ledgerMembership.findUnique.mockResolvedValueOnce({
                        id: 'm1',
                        expiresAt: oldExpiry,
                        lastPlanKey: 'month',
                        perpetual: false,
                    });
                    prisma.ledgerMembership.update.mockImplementationOnce(function (args) { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_b) {
                            return [2 /*return*/, ({
                                    id: 'm1',
                                    expiresAt: args.data.expiresAt,
                                    lastPlanKey: args.data.lastPlanKey,
                                    perpetual: args.data.perpetual,
                                    trialClaimedAt: null,
                                })];
                        });
                    }); });
                    return [4 /*yield*/, service.grantMembership('u1', { planKey: 'lifetime', note: '客户付费' }, 'op1')];
                case 1:
                    res = _b.sent();
                    (0, globals_1.expect)(res.deltaDays).toBe(0);
                    (0, globals_1.expect)(res.membership).toMatchObject({
                        active: true,
                        perpetual: true,
                        expiresAt: null,
                        lastPlanKey: 'lifetime',
                    });
                    updateArg = prisma.ledgerMembership.update.mock.calls[0][0];
                    (0, globals_1.expect)(updateArg.data).toMatchObject({
                        expiresAt: null,
                        lastPlanKey: 'lifetime',
                        perpetual: true,
                        updatedById: 'op1',
                    });
                    logArg = prisma.ledgerMembershipLog.create.mock.calls[0][0];
                    (0, globals_1.expect)(logArg.data).toMatchObject({
                        deltaDays: 0,
                        planKey: 'lifetime',
                        beforeAt: oldExpiry,
                        afterAt: null,
                        note: '开通永久会员；客户付费',
                    });
                    (0, globals_1.expect)(prisma.ledgerNotification.create).toHaveBeenCalledWith({
                        data: {
                            userId: 'u1',
                            type: 'member',
                            title: '永久会员已开通',
                            body: '已为您开通永久会员，长期有效。',
                        },
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用例8：审计日志写入失败 → 授予失败且不发成功通知', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma.ledgerUser.findUnique.mockResolvedValueOnce({ id: 'u1' });
                    prisma.ledgerMembership.findUnique.mockResolvedValueOnce({
                        id: 'm1',
                        expiresAt: null,
                        lastPlanKey: null,
                        perpetual: false,
                    });
                    prisma.ledgerMembership.update.mockImplementationOnce(function (args) { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_b) {
                            return [2 /*return*/, ({
                                    id: 'm1',
                                    expiresAt: args.data.expiresAt,
                                    lastPlanKey: args.data.lastPlanKey,
                                })];
                        });
                    }); });
                    prisma.ledgerMembershipLog.create.mockRejectedValueOnce(new Error('audit failed'));
                    return [4 /*yield*/, (0, globals_1.expect)(service.grantMembership('u1', { days: 30 })).rejects.toThrow('audit failed')];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(prisma.$transaction).toHaveBeenCalledTimes(1);
                    (0, globals_1.expect)(prisma.ledgerNotification.create).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, globals_1.describe)('LedgerAdminService.updateConfig', function () {
    var prisma;
    var service;
    (0, globals_1.beforeEach)(function () {
        prisma = buildPrisma();
        service = new ledger_admin_service_1.LedgerAdminService(prisma);
    });
    (0, globals_1.it)('用例9：normalizeLedgerConfig 收口 — 仅保留邀请奖励与会员套餐配置', function () { return __awaiter(void 0, void 0, void 0, function () {
        var merged, upsertArg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    // 当前持久化里有越界的 inviteRewardDays
                    prisma.ledgerConfig.findUnique.mockResolvedValueOnce({
                        value: { inviteRewardDays: 99999 },
                    });
                    return [4 /*yield*/, service.updateConfig({ inviteMaxRewarded: -5 })
                        // 邀请参数被钳制，历史试用字段不会再写回全局配置。
                    ];
                case 1:
                    merged = _b.sent();
                    // 邀请参数被钳制，历史试用字段不会再写回全局配置。
                    (0, globals_1.expect)(merged.inviteRewardDays).toBe(3650);
                    (0, globals_1.expect)(merged.inviteMaxRewarded).toBe(0);
                    (0, globals_1.expect)(merged).not.toHaveProperty('cutTrialDays');
                    (0, globals_1.expect)(merged).not.toHaveProperty('cutRequireMembership');
                    upsertArg = prisma.ledgerConfig.upsert.mock.calls[0][0];
                    (0, globals_1.expect)(upsertArg.update.value.inviteRewardDays).toBe(3650);
                    (0, globals_1.expect)(upsertArg.update.value.inviteMaxRewarded).toBe(0);
                    return [2 /*return*/];
            }
        });
    }); });
});
