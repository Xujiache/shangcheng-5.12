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
exports.JwtAuthGuard = void 0;
exports._clearJwtUserCache = _clearJwtUserCache;
var common_1 = require("@nestjs/common");
var biz_exception_1 = require("../exceptions/biz.exception");
var public_decorator_1 = require("../decorators/public.decorator");
var USER_CACHE_TTL_MS = 60 * 1000;
var USER_CACHE_MAX = 5000;
var userCache = new Map();
function getCachedUser(sub) {
    var row = userCache.get(sub);
    if (!row)
        return null;
    if (row.expireAt < Date.now()) {
        userCache.delete(sub);
        return null;
    }
    return row.data;
}
function setCachedUser(sub, data) {
    // 简易 LRU 上限：超过 MAX 时清掉一半最老的（Map 迭代顺序即插入顺序）
    if (userCache.size >= USER_CACHE_MAX) {
        var half = Math.floor(USER_CACHE_MAX / 2);
        var i = 0;
        for (var _i = 0, _a = userCache.keys(); _i < _a.length; _i++) {
            var k = _a[_i];
            userCache.delete(k);
            if (++i >= half)
                break;
        }
    }
    userCache.set(sub, { data: data, expireAt: Date.now() + USER_CACHE_TTL_MS });
}
/** 测试或紧急情况下可手动清理缓存 */
function _clearJwtUserCache(sub) {
    if (sub)
        userCache.delete(sub);
    else
        userCache.clear();
}
var JwtAuthGuard = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var JwtAuthGuard = _classThis = /** @class */ (function () {
        function JwtAuthGuard_1(reflector, jwt, prisma) {
            this.reflector = reflector;
            this.jwt = jwt;
            this.prisma = prisma;
        }
        JwtAuthGuard_1.prototype.canActivate = function (context) {
            return __awaiter(this, void 0, void 0, function () {
                var isPublic, req, auth, token, payload, e_1, sub, readOnly, fresh, u;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
                                context.getHandler(),
                                context.getClass(),
                            ]);
                            if (isPublic)
                                return [2 /*return*/, true];
                            req = context.switchToHttp().getRequest();
                            auth = req.headers.authorization || '';
                            token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
                            if (!token)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.UNAUTHORIZED, '未登录');
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.jwt.verifyAsync(token)];
                        case 2:
                            // 不再传 secret，让 JwtService 使用注册时通过 resolveJwtSecret 解析出来的密钥
                            // 这样生产环境一定使用真实 JWT_SECRET，不会回退到占位字符串
                            payload = _b.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            e_1 = _b.sent();
                            if ((e_1 === null || e_1 === void 0 ? void 0 : e_1.name) === 'TokenExpiredError') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.TOKEN_EXPIRED, 'Token 已过期');
                            }
                            throw new biz_exception_1.BizException(biz_exception_1.BizCode.UNAUTHORIZED, '无效 Token');
                        case 4:
                            sub = payload === null || payload === void 0 ? void 0 : payload.sub;
                            if (!sub)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.UNAUTHORIZED, '无效 Token');
                            // refresh token（签发时打了 _r 标记）只能用于 /auth/refresh 换取 access token，
                            // 绝不允许直接当 access token 访问业务接口（否则可访问窗口被放大到 refresh 的 30 天 TTL）。
                            if (payload === null || payload === void 0 ? void 0 : payload._r)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.UNAUTHORIZED, 'refresh token 不能用于业务接口');
                            readOnly = !req.method || req.method === 'GET' || req.method === 'HEAD';
                            fresh = readOnly ? getCachedUser(sub) : null;
                            if (!!fresh) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.prisma.user.findUnique({
                                    where: { id: sub },
                                    select: { id: true, status: true, role: true, merchantId: true },
                                })];
                        case 5:
                            u = _b.sent();
                            if (!u) {
                                // 用户已被物理删除：与 disabled 同等待遇，立即吊销
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.UNAUTHORIZED, '账号不存在或已注销');
                            }
                            fresh = { id: u.id, status: u.status, role: u.role, merchantId: u.merchantId };
                            setCachedUser(sub, fresh);
                            _b.label = 6;
                        case 6:
                            if (fresh.status === 'disabled') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '账号已被禁用');
                            }
                            // 把最新 role/merchantId 覆盖到 req.user，确保下游 @CurrentUser 拿到的是 DB 当前值，
                            // 让被降级的用户立刻失去新权限，被晋升的用户也无需重新登录
                            ;
                            req.user = __assign(__assign({}, payload), { sub: fresh.id, role: fresh.role, 
                                // A cleared DB association must not resurrect the signed token's old merchant.
                                merchantId: (_a = fresh.merchantId) !== null && _a !== void 0 ? _a : undefined });
                            return [2 /*return*/, true];
                    }
                });
            });
        };
        return JwtAuthGuard_1;
    }());
    __setFunctionName(_classThis, "JwtAuthGuard");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        JwtAuthGuard = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return JwtAuthGuard = _classThis;
}();
exports.JwtAuthGuard = JwtAuthGuard;
