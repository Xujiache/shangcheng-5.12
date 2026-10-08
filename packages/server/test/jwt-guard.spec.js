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
var jwt_guard_1 = require("../src/common/guards/jwt.guard");
// ----------------------------------------------------------------------------
// JwtAuthGuard — JWT 鉴权拦截器
//
// 实现位置：packages/server/src/common/guards/jwt.guard.ts
//
// 关键行为契约：
//   - @Public() 路由（reflector 返回 true）直接放行，连 token 都不读
//   - 缺 Authorization → UNAUTHORIZED(2001)
//   - verifyAsync 抛 TokenExpiredError → TOKEN_EXPIRED(2002)；其它错误 → 2001
//   - refresh token（payload._r 标记）不允许访问业务接口 → 2001
//   - payload 无 sub → 2001
//   - DB 查无此用户 → 2001（被删除等同吊销）
//   - status 为 disabled → FORBIDDEN(2003)
//   - 成功时把 DB 最新 role/merchantId 覆盖到 req.user（DB 当前值优先于 payload）
//   - 进程内缓存：同一 sub 连续请求只查一次 DB；_clearJwtUserCache 后再查
//
// 模块级缓存跨用例共享，必须在 beforeEach 中清空，否则用例互相污染。
// ----------------------------------------------------------------------------
// 业务码常量（与 BizCode 对齐）
var UNAUTHORIZED = 2001;
var TOKEN_EXPIRED = 2002;
var FORBIDDEN = 2003;
/** 构造一个最小可用的 ExecutionContext mock，request 为可变对象便于断言 req.user */
function makeContext(req, isPublicHandler, isPublicClass) {
    if (isPublicHandler === void 0) { isPublicHandler = false; }
    if (isPublicClass === void 0) { isPublicClass = false; }
    return {
        getHandler: function () { return (isPublicHandler ? 'handlerWithPublic' : 'handler'); },
        getClass: function () { return (isPublicClass ? 'classWithPublic' : 'class'); },
        switchToHttp: function () { return ({
            getRequest: function () { return req; },
        }); },
    };
}
/** reflector mock：根据传入布尔值决定 getAllAndOverride 返回 */
function makeReflector(isPublic) {
    return {
        getAllAndOverride: globals_1.jest.fn(function () { return isPublic; }),
    };
}
/** 期望抛出指定 BizCode */
function expectBizCode(fn, code) {
    return __awaiter(this, void 0, void 0, function () {
        var e_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fn()];
                case 1:
                    _b.sent();
                    throw new Error('should have thrown');
                case 2:
                    e_1 = _b.sent();
                    (0, globals_1.expect)((_a = e_1.getResponse) === null || _a === void 0 ? void 0 : _a.call(e_1).code).toBe(code);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
(0, globals_1.describe)('JwtAuthGuard.canActivate', function () {
    (0, globals_1.beforeEach)(function () {
        (0, jwt_guard_1._clearJwtUserCache)();
    });
    (0, globals_1.it)('@Public 路由直接放行，不读取 token', function () { return __awaiter(void 0, void 0, void 0, function () {
        var reflector, jwt, prisma, guard, req, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    reflector = makeReflector(true);
                    jwt = { verifyAsync: globals_1.jest.fn() };
                    prisma = { user: { findUnique: globals_1.jest.fn() } };
                    guard = new jwt_guard_1.JwtAuthGuard(reflector, jwt, prisma);
                    req = { headers: {} };
                    return [4 /*yield*/, guard.canActivate(makeContext(req, true, true))];
                case 1:
                    result = _a.sent();
                    (0, globals_1.expect)(result).toBe(true);
                    // 公共路由不应触碰 token 校验与 DB 查询
                    (0, globals_1.expect)(jwt.verifyAsync).not.toHaveBeenCalled();
                    (0, globals_1.expect)(prisma.user.findUnique).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('缺少 Authorization 头 → UNAUTHORIZED(2001)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var reflector, jwt, prisma, guard, req;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    reflector = makeReflector(false);
                    jwt = { verifyAsync: globals_1.jest.fn() };
                    prisma = { user: { findUnique: globals_1.jest.fn() } };
                    guard = new jwt_guard_1.JwtAuthGuard(reflector, jwt, prisma);
                    req = { headers: {} };
                    return [4 /*yield*/, expectBizCode(function () { return guard.canActivate(makeContext(req)); }, UNAUTHORIZED)];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(jwt.verifyAsync).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('verifyAsync 抛 TokenExpiredError → TOKEN_EXPIRED(2002)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var reflector, jwt, prisma, guard, req;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    reflector = makeReflector(false);
                    jwt = {
                        verifyAsync: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () {
                            var err;
                            return __generator(this, function (_a) {
                                err = new Error('jwt expired');
                                err.name = 'TokenExpiredError';
                                throw err;
                            });
                        }); }),
                    };
                    prisma = { user: { findUnique: globals_1.jest.fn() } };
                    guard = new jwt_guard_1.JwtAuthGuard(reflector, jwt, prisma);
                    req = { headers: { authorization: 'Bearer expired-token' } };
                    return [4 /*yield*/, expectBizCode(function () { return guard.canActivate(makeContext(req)); }, TOKEN_EXPIRED)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('verifyAsync 抛普通错误 → UNAUTHORIZED(2001)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var reflector, jwt, prisma, guard, req;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    reflector = makeReflector(false);
                    jwt = {
                        verifyAsync: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                throw new Error('invalid signature');
                            });
                        }); }),
                    };
                    prisma = { user: { findUnique: globals_1.jest.fn() } };
                    guard = new jwt_guard_1.JwtAuthGuard(reflector, jwt, prisma);
                    req = { headers: { authorization: 'Bearer bad-token' } };
                    return [4 /*yield*/, expectBizCode(function () { return guard.canActivate(makeContext(req)); }, UNAUTHORIZED)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('refresh token（payload._r=1）不能访问业务接口 → UNAUTHORIZED(2001)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var reflector, jwt, prisma, guard, req;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    reflector = makeReflector(false);
                    jwt = {
                        verifyAsync: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ sub: 'u1', _r: 1 })];
                        }); }); }),
                    };
                    prisma = { user: { findUnique: globals_1.jest.fn() } };
                    guard = new jwt_guard_1.JwtAuthGuard(reflector, jwt, prisma);
                    req = { headers: { authorization: 'Bearer refresh-token' } };
                    return [4 /*yield*/, expectBizCode(function () { return guard.canActivate(makeContext(req)); }, UNAUTHORIZED)
                        // refresh token 直接拦在 DB 查询之前
                    ];
                case 1:
                    _a.sent();
                    // refresh token 直接拦在 DB 查询之前
                    (0, globals_1.expect)(prisma.user.findUnique).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('payload 缺 sub → UNAUTHORIZED(2001)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var reflector, jwt, prisma, guard, req;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    reflector = makeReflector(false);
                    jwt = {
                        verifyAsync: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ role: 'customer' })];
                        }); }); }),
                    };
                    prisma = { user: { findUnique: globals_1.jest.fn() } };
                    guard = new jwt_guard_1.JwtAuthGuard(reflector, jwt, prisma);
                    req = { headers: { authorization: 'Bearer no-sub' } };
                    return [4 /*yield*/, expectBizCode(function () { return guard.canActivate(makeContext(req)); }, UNAUTHORIZED)];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(prisma.user.findUnique).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('DB 查无此用户（findUnique 返回 null）→ UNAUTHORIZED(2001)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var reflector, jwt, prisma, guard, req;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    reflector = makeReflector(false);
                    jwt = {
                        verifyAsync: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ sub: 'ghost' })];
                        }); }); }),
                    };
                    prisma = {
                        user: { findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, null];
                            }); }); }) },
                    };
                    guard = new jwt_guard_1.JwtAuthGuard(reflector, jwt, prisma);
                    req = { headers: { authorization: 'Bearer ghost-token' } };
                    return [4 /*yield*/, expectBizCode(function () { return guard.canActivate(makeContext(req)); }, UNAUTHORIZED)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('用户状态为 disabled → FORBIDDEN(2003)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var reflector, jwt, prisma, guard, req;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    reflector = makeReflector(false);
                    jwt = {
                        verifyAsync: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ sub: 'u1' })];
                        }); }); }),
                    };
                    prisma = {
                        user: {
                            findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, ({
                                            id: 'u1',
                                            status: 'disabled',
                                            role: 'customer',
                                            merchantId: null,
                                        })];
                                });
                            }); }),
                        },
                    };
                    guard = new jwt_guard_1.JwtAuthGuard(reflector, jwt, prisma);
                    req = { headers: { authorization: 'Bearer disabled-token' } };
                    return [4 /*yield*/, expectBizCode(function () { return guard.canActivate(makeContext(req)); }, FORBIDDEN)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('成功放行：req.user 使用 DB 当前的 role/merchantId（覆盖 payload）', function () { return __awaiter(void 0, void 0, void 0, function () {
        var reflector, jwt, prisma, guard, req, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    reflector = makeReflector(false);
                    jwt = {
                        verifyAsync: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ sub: 'u1', role: 'customer' })];
                        }); }); }),
                    };
                    prisma = {
                        user: {
                            findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, ({
                                            id: 'u1',
                                            status: 'active',
                                            role: 'factory',
                                            merchantId: 'm1',
                                        })];
                                });
                            }); }),
                        },
                    };
                    guard = new jwt_guard_1.JwtAuthGuard(reflector, jwt, prisma);
                    req = { headers: { authorization: 'Bearer good-token' } };
                    return [4 /*yield*/, guard.canActivate(makeContext(req))];
                case 1:
                    result = _a.sent();
                    (0, globals_1.expect)(result).toBe(true);
                    // DB 当前值优先：role 被覆盖为 factory，merchantId 为 m1
                    (0, globals_1.expect)(req.user.role).toBe('factory');
                    (0, globals_1.expect)(req.user.merchantId).toBe('m1');
                    (0, globals_1.expect)(req.user.sub).toBe('u1');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('进程内缓存：同一 sub 连续两次只查一次 DB；清缓存后第三次再查', function () { return __awaiter(void 0, void 0, void 0, function () {
        var reflector, jwt, prisma, guard, req1, req2, req3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    reflector = makeReflector(false);
                    jwt = {
                        verifyAsync: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ sub: 'u1', role: 'customer' })];
                        }); }); }),
                    };
                    prisma = {
                        user: {
                            findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, ({
                                            id: 'u1',
                                            status: 'active',
                                            role: 'factory',
                                            merchantId: 'm1',
                                        })];
                                });
                            }); }),
                        },
                    };
                    guard = new jwt_guard_1.JwtAuthGuard(reflector, jwt, prisma);
                    req1 = { headers: { authorization: 'Bearer t' } };
                    req2 = { headers: { authorization: 'Bearer t' } };
                    return [4 /*yield*/, guard.canActivate(makeContext(req1))];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, guard.canActivate(makeContext(req2))
                        // 第二次命中缓存，DB 只被查询一次
                    ];
                case 2:
                    _a.sent();
                    // 第二次命中缓存，DB 只被查询一次
                    (0, globals_1.expect)(prisma.user.findUnique).toHaveBeenCalledTimes(1);
                    // 清掉该 sub 的缓存后，再次请求必须重新查 DB
                    (0, jwt_guard_1._clearJwtUserCache)('u1');
                    req3 = { headers: { authorization: 'Bearer t' } };
                    return [4 /*yield*/, guard.canActivate(makeContext(req3))];
                case 3:
                    _a.sent();
                    (0, globals_1.expect)(prisma.user.findUnique).toHaveBeenCalledTimes(2);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)("兼容 'Bearer xxx' 与裸 'xxx' 两种 Authorization 形式", function () { return __awaiter(void 0, void 0, void 0, function () {
        var reflector, jwt, prisma, guard, reqBearer, _a, reqBare, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    reflector = makeReflector(false);
                    jwt = {
                        verifyAsync: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ sub: 'u1' })];
                        }); }); }),
                    };
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
                    guard = new jwt_guard_1.JwtAuthGuard(reflector, jwt, prisma);
                    reqBearer = { headers: { authorization: 'Bearer abc123' } };
                    _a = globals_1.expect;
                    return [4 /*yield*/, guard.canActivate(makeContext(reqBearer))];
                case 1:
                    _a.apply(void 0, [_c.sent()]).toBe(true);
                    (0, globals_1.expect)(jwt.verifyAsync).toHaveBeenLastCalledWith('abc123');
                    // 形式二：admin-pc 直传裸 token（无 Bearer 前缀）
                    (0, jwt_guard_1._clearJwtUserCache)();
                    reqBare = { headers: { authorization: 'abc123' } };
                    _b = globals_1.expect;
                    return [4 /*yield*/, guard.canActivate(makeContext(reqBare))];
                case 2:
                    _b.apply(void 0, [_c.sent()]).toBe(true);
                    (0, globals_1.expect)(jwt.verifyAsync).toHaveBeenLastCalledWith('abc123');
                    return [2 /*return*/];
            }
        });
    }); });
});
