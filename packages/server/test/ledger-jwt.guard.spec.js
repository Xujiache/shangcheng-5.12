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
globals_1.jest.mock('nanoid', function () { return ({ customAlphabet: function () { return function () { return 'TEST'; }; } }); });
var ledger_jwt_guard_1 = require("../src/modules/ledger/guards/ledger-jwt.guard");
function context(token) {
    if (token === void 0) { token = 'jwt'; }
    var req = { headers: { authorization: "Bearer ".concat(token) } };
    var ctx = { switchToHttp: function () { return ({ getRequest: function () { return req; } }); } };
    return { ctx: ctx, req: req };
}
(0, globals_1.describe)('LedgerJwtGuard token domain and status', function () {
    (0, globals_1.it)('拒绝商城 token 与 refresh token，不查询账号', function () { return __awaiter(void 0, void 0, void 0, function () {
        var jwt, prisma, guard;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    jwt = { verifyAsync: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ sub: 'u1', scope: 'mall' })];
                        }); }); }) };
                    prisma = { ledgerUser: { findUnique: globals_1.jest.fn() } };
                    guard = new ledger_jwt_guard_1.LedgerJwtGuard(jwt, prisma);
                    return [4 /*yield*/, (0, globals_1.expect)(guard.canActivate(context().ctx)).rejects.toBeTruthy()];
                case 1:
                    _a.sent();
                    jwt.verifyAsync.mockResolvedValueOnce({ sub: 'u1', scope: 'ledger', _r: true });
                    return [4 /*yield*/, (0, globals_1.expect)(guard.canActivate(context().ctx)).rejects.toBeTruthy()];
                case 2:
                    _a.sent();
                    (0, globals_1.expect)(prisma.ledgerUser.findUnique).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('禁用账号即使签名有效也拒绝', function () { return __awaiter(void 0, void 0, void 0, function () {
        var jwt, prisma;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    jwt = { verifyAsync: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ sub: 'u1', scope: 'ledger' })];
                        }); }); }) };
                    prisma = { ledgerUser: { findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ id: 'u1', status: 'disabled' })];
                            }); }); }) } };
                    return [4 /*yield*/, (0, globals_1.expect)(new ledger_jwt_guard_1.LedgerJwtGuard(jwt, prisma).canActivate(context().ctx)).rejects.toBeTruthy()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('有效 ledger token 按当前账号状态建立请求身份', function () { return __awaiter(void 0, void 0, void 0, function () {
        var jwt, prisma, _a, ctx, req, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    jwt = { verifyAsync: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ sub: 'u1', scope: 'ledger' })];
                        }); }); }) };
                    prisma = { ledgerUser: { findUnique: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    return [2 /*return*/, ({
                                            id: 'u1', status: 'active', nickname: 'user', avatar: null, membership: null,
                                        })];
                                });
                            }); }) } };
                    _a = context(), ctx = _a.ctx, req = _a.req;
                    _b = globals_1.expect;
                    return [4 /*yield*/, new ledger_jwt_guard_1.LedgerJwtGuard(jwt, prisma).canActivate(ctx)];
                case 1:
                    _b.apply(void 0, [_c.sent()]).toBe(true);
                    (0, globals_1.expect)(req.ledgerUser.id).toBe('u1');
                    (0, globals_1.expect)(prisma.ledgerUser.findUnique).toHaveBeenCalledWith({
                        where: { id: 'u1' },
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
                    return [2 /*return*/];
            }
        });
    }); });
});
