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
exports.LedgerJwtGuard = void 0;
var common_1 = require("@nestjs/common");
var biz_exception_1 = require("../../../common/exceptions/biz.exception");
var ledger_constants_1 = require("../ledger.constants");
var ledger_avatar_util_1 = require("../ledger-avatar.util");
/**
 * 记账小程序 App 鉴权守卫。
 *
 * 与商城全局 JwtAuthGuard 隔离：
 *   - ledger App 控制器整体 @Public() 跳过全局守卫，再挂本守卫。
 *   - 只接受 scope==='ledger' 的 token（sub = LedgerUser.id）；
 *     商城 token（无 scope / scope!=ledger）一律拒绝，杜绝跨域越权。
 *   - 反向保险：商城全局守卫用 sub 查 User 表，ledger 的 sub 不在 User 表 → 自然被拒。
 *   - 每次请求查最新 LedgerUser 状态 + 会员，禁用/过期即时生效。
 */
var LedgerJwtGuard = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var LedgerJwtGuard = _classThis = /** @class */ (function () {
        function LedgerJwtGuard_1(jwt, prisma) {
            this.jwt = jwt;
            this.prisma = prisma;
        }
        LedgerJwtGuard_1.prototype.canActivate = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var req, auth, token, payload, e_1, user;
                var _a, _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            req = context.switchToHttp().getRequest();
                            auth = req.headers.authorization || '';
                            token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
                            if (!token)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.UNAUTHORIZED, '未登录');
                            _f.label = 1;
                        case 1:
                            _f.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.jwt.verifyAsync(token)];
                        case 2:
                            payload = _f.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            e_1 = _f.sent();
                            if ((e_1 === null || e_1 === void 0 ? void 0 : e_1.name) === 'TokenExpiredError') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.TOKEN_EXPIRED, '登录已过期，请重新登录');
                            }
                            throw new biz_exception_1.BizException(biz_exception_1.BizCode.UNAUTHORIZED, '无效 Token');
                        case 4:
                            if (payload === null || payload === void 0 ? void 0 : payload._r)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.UNAUTHORIZED, 'refresh token 不能用于业务接口');
                            if ((payload === null || payload === void 0 ? void 0 : payload.scope) !== 'ledger' || !(payload === null || payload === void 0 ? void 0 : payload.sub)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.UNAUTHORIZED, '无效 Token');
                            }
                            return [4 /*yield*/, this.prisma.ledgerUser.findUnique({
                                    where: { id: payload.sub },
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
                                })];
                        case 5:
                            user = _f.sent();
                            if (!user)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.UNAUTHORIZED, '账号不存在或已注销');
                            if (user.status === 'disabled')
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '账号已被禁用');
                            req.ledgerUser = {
                                id: user.id,
                                accountCode: user.id.slice(-8).toUpperCase(),
                                nickname: user.nickname,
                                avatar: (0, ledger_avatar_util_1.sanitizeLedgerAvatar)(user.avatar),
                                membership: (0, ledger_constants_1.deriveMembership)((_b = (_a = user.membership) === null || _a === void 0 ? void 0 : _a.expiresAt) !== null && _b !== void 0 ? _b : null, (_c = user.membership) === null || _c === void 0 ? void 0 : _c.lastPlanKey, new Date(), {
                                    perpetual: (_d = user.membership) === null || _d === void 0 ? void 0 : _d.perpetual,
                                    trialClaimedAt: (_e = user.membership) === null || _e === void 0 ? void 0 : _e.trialClaimedAt,
                                }),
                            };
                            return [2 /*return*/, true];
                    }
                });
            });
        };
        return LedgerJwtGuard_1;
    }());
    __setFunctionName(_classThis, "LedgerJwtGuard");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LedgerJwtGuard = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LedgerJwtGuard = _classThis;
}();
exports.LedgerJwtGuard = LedgerJwtGuard;
