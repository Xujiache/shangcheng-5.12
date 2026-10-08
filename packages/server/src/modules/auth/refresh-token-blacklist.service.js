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
exports.RefreshTokenBlacklistService = void 0;
var common_1 = require("@nestjs/common");
var ioredis_1 = require("ioredis");
/** Shared refresh receipts. Production requires Redis; failures reject writes and lookups.
 * Development/test may use bounded process-local receipts. Live receipts are never cleared on overflow.
 */
var RefreshTokenBlacklistService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var RefreshTokenBlacklistService = _classThis = /** @class */ (function () {
        function RefreshTokenBlacklistService_1() {
            var _this = this;
            this.logger = new common_1.Logger(RefreshTokenBlacklistService.name);
            this.store = new Map(); // jti -> expireAt(ms)
            this.MAX_ENTRIES = 100000;
            this.sweepTimer = null;
            /** 构造时快照 REDIS_URL；未设置 → 纯内存模式（与旧版行为完全一致） */
            this.redisUrl = process.env.REDIS_URL;
            /** 懒创建的 ioredis 客户端（首次使用时才建连） */
            this.redis = null;
            /** 进行中的 connect()，避免并发重复建连（ioredis 重复 connect 会抛错） */
            this.connecting = null;
            /** Redis 错误日志限流：每分钟最多 warn 一次 */
            this.lastRedisWarnAt = 0;
            // 启动后台清理；用 unref 避免阻塞进程退出
            this.sweepTimer = setInterval(function () { return _this.sweep(); }, 60000);
            if (this.sweepTimer && typeof this.sweepTimer.unref === 'function') {
                this.sweepTimer.unref();
            }
        }
        /**
         * 吊销指定 jti。ttlSeconds 应等于"该 refresh token 距离过期还有多少秒"，
         * 这样黑名单条目过期时该 token 也已天然失效，可以安全清掉。
         *
         * 两种模式都先写 L1（内存 Map），配置了 Redis 时再写穿到 Redis；
         * Redis 写失败必须向调用方返回暂不可用，不能报告吊销成功。
         */
        RefreshTokenBlacklistService_1.prototype.revoke = function (jti, ttlSeconds) {
            return __awaiter(this, void 0, void 0, function () {
                var ttlSec, client, e_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!jti)
                                return [2 /*return*/];
                            ttlSec = Math.max(1, Math.floor(ttlSeconds));
                            if (!this.redisUrl) {
                                this.requireLocalFallback();
                                this.remember(jti, ttlSec);
                                return [2 /*return*/];
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, this.getRedis()];
                        case 2:
                            client = _a.sent();
                            return [4 /*yield*/, client.set(RefreshTokenBlacklistService.KEY_PREFIX + jti, '1', 'EX', ttlSec)];
                        case 3:
                            _a.sent();
                            this.remember(jti, ttlSec);
                            return [3 /*break*/, 5];
                        case 4:
                            e_1 = _a.sent();
                            this.warnRedisError('revoke', e_1);
                            throw new common_1.ServiceUnavailableException('登录状态暂不可用，请稍后重试');
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * 是否已吊销。先查 L1（快路径 + Redis 故障兜底），未命中且配置了 Redis 再查 L2。
         * Redis 查询出错会拒绝请求，不把未知状态当作未吊销。
         */
        RefreshTokenBlacklistService_1.prototype.isRevoked = function (jti) {
            return __awaiter(this, void 0, void 0, function () {
                var expireAt, client, exists, e_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!jti)
                                return [2 /*return*/, false
                                    // L1 快路径（含懒过期清理）
                                ];
                            expireAt = this.store.get(jti);
                            if (expireAt !== undefined) {
                                if (expireAt >= Date.now())
                                    return [2 /*return*/, true];
                                this.store.delete(jti);
                            }
                            // L2：跨实例可见性
                            if (!this.redisUrl) {
                                this.requireLocalFallback();
                                return [2 /*return*/, false];
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, this.getRedis()];
                        case 2:
                            client = _a.sent();
                            return [4 /*yield*/, client.exists(RefreshTokenBlacklistService.KEY_PREFIX + jti)];
                        case 3:
                            exists = _a.sent();
                            return [2 /*return*/, exists > 0];
                        case 4:
                            e_2 = _a.sent();
                            this.warnRedisError('isRevoked', e_2);
                            throw new common_1.ServiceUnavailableException('登录状态暂不可用，请稍后重试');
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        /** 模块销毁时关闭 Redis 连接（避免测试 / 优雅退出时悬挂句柄） */
        RefreshTokenBlacklistService_1.prototype.onModuleDestroy = function () {
            return __awaiter(this, void 0, void 0, function () {
                var client, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (this.sweepTimer) {
                                clearInterval(this.sweepTimer);
                                this.sweepTimer = null;
                            }
                            client = this.redis;
                            this.redis = null;
                            this.connecting = null;
                            if (!client)
                                return [2 /*return*/];
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 5, , 6]);
                            if (!(client.status === 'wait' || client.status === 'end')) return [3 /*break*/, 2];
                            client.disconnect();
                            return [3 /*break*/, 4];
                        case 2: return [4 /*yield*/, client.quit()];
                        case 3:
                            _b.sent();
                            _b.label = 4;
                        case 4: return [3 /*break*/, 6];
                        case 5:
                            _a = _b.sent();
                            client.disconnect();
                            return [3 /*break*/, 6];
                        case 6: return [2 /*return*/];
                    }
                });
            });
        };
        /** 测试 / 紧急运维入口；只清 L1，生产不建议直接调 */
        RefreshTokenBlacklistService_1.prototype._clear = function () {
            this.store.clear();
        };
        /** Atomic check-and-consume; never issue two refresh results for one receipt. */
        RefreshTokenBlacklistService_1.prototype.consume = function (jti, ttlSeconds) {
            return __awaiter(this, void 0, void 0, function () {
                var ttl, client, result, error_1;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!jti || !Number.isFinite(ttlSeconds))
                                throw new common_1.ServiceUnavailableException('登录状态校验失败');
                            ttl = Math.max(1, Math.floor(ttlSeconds));
                            if (((_a = this.store.get(jti)) !== null && _a !== void 0 ? _a : 0) > Date.now())
                                return [2 /*return*/, false];
                            if (!this.redisUrl) {
                                this.requireLocalFallback();
                                // Deliberately no await between the local check and mutation.
                                this.remember(jti, ttl);
                                return [2 /*return*/, true];
                            }
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, this.getRedis()];
                        case 2:
                            client = _b.sent();
                            return [4 /*yield*/, client.set(RefreshTokenBlacklistService.KEY_PREFIX + jti, '1', 'EX', ttl, 'NX')];
                        case 3:
                            result = _b.sent();
                            if (result !== 'OK')
                                return [2 /*return*/, false];
                            this.remember(jti, ttl);
                            return [2 /*return*/, true];
                        case 4:
                            error_1 = _b.sent();
                            this.warnRedisError('consume', error_1);
                            throw new common_1.ServiceUnavailableException('登录状态暂不可用，请稍后重试');
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        RefreshTokenBlacklistService_1.prototype.requireLocalFallback = function () {
            if (process.env.NODE_ENV === 'production')
                throw new common_1.ServiceUnavailableException('登录状态暂不可用，请稍后重试');
        };
        RefreshTokenBlacklistService_1.prototype.remember = function (jti, ttl) {
            if (!this.store.has(jti) && this.store.size >= this.MAX_ENTRIES) {
                this.sweep();
                if (this.store.size >= this.MAX_ENTRIES) {
                    if (!this.redisUrl)
                        throw new common_1.ServiceUnavailableException('登录状态暂不可用，请稍后重试');
                    // Shared Redis still holds the receipt; evict only one local cache entry.
                    this.store.delete(this.store.keys().next().value);
                }
            }
            this.store.set(jti, Date.now() + ttl * 1000);
        };
        /**
         * 懒创建并确保 Redis 连接就绪。
         * lazyConnect + enableOfflineQueue:false：未就绪时命令立即失败（由调用方降级），
         * 不堆积队列；命令超时限制为 2 秒，不进行无限重试。
         */
        RefreshTokenBlacklistService_1.prototype.getRedis = function () {
            return __awaiter(this, void 0, void 0, function () {
                var flight_1, clear;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.redis) {
                                this.redis = new ioredis_1.default(this.redisUrl, {
                                    lazyConnect: true,
                                    maxRetriesPerRequest: 0,
                                    commandTimeout: 2000,
                                    retryStrategy: function () { return null; },
                                    enableOfflineQueue: false,
                                    connectTimeout: 2000, // 建连兜底超时，避免首次使用时长时间阻塞登录/刷新链路
                                });
                                // 必须挂 error 监听，否则 ioredis 的 'error' 事件会变成 unhandled 抛崩进程；
                                // 真正的错误处理在每次调用的 try/catch 里完成。
                                this.redis.on('error', function () { return undefined; });
                            }
                            if (!(this.redis.status !== 'ready')) return [3 /*break*/, 2];
                            if (!this.connecting) {
                                flight_1 = this.redis.connect();
                                this.connecting = flight_1;
                                clear = function () {
                                    if (_this.connecting === flight_1)
                                        _this.connecting = null;
                                };
                                void flight_1.then(clear, clear);
                            }
                            return [4 /*yield*/, this.connecting];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2: return [2 /*return*/, this.redis];
                    }
                });
            });
        };
        /** Redis 错误日志限流：每分钟最多一条 warn（故障期间每次调用都会出错） */
        RefreshTokenBlacklistService_1.prototype.warnRedisError = function (op, e) {
            var now = Date.now();
            if (now - this.lastRedisWarnAt < 60000)
                return;
            this.lastRedisWarnAt = now;
            this.logger.warn("[refresh-blacklist] Redis ".concat(op, " unavailable; request rejected"));
        };
        RefreshTokenBlacklistService_1.prototype.sweep = function () {
            var now = Date.now();
            var removed = 0;
            for (var _i = 0, _a = this.store.entries(); _i < _a.length; _i++) {
                var _b = _a[_i], jti = _b[0], expireAt = _b[1];
                if (expireAt < now) {
                    this.store.delete(jti);
                    removed++;
                }
            }
            if (removed > 0) {
                this.logger.debug("[refresh-blacklist] swept ".concat(removed, " expired entries, remain=").concat(this.store.size));
            }
        };
        return RefreshTokenBlacklistService_1;
    }());
    __setFunctionName(_classThis, "RefreshTokenBlacklistService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        RefreshTokenBlacklistService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    /** Redis key 前缀：rtbl = refresh-token-blacklist */
    _classThis.KEY_PREFIX = 'rtbl:';
    (function () {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return RefreshTokenBlacklistService = _classThis;
}();
exports.RefreshTokenBlacklistService = RefreshTokenBlacklistService;
