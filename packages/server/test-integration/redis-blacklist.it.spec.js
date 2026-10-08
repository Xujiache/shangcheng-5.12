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
// ----------------------------------------------------------------------------
// Refresh Token 黑名单 Redis 集成测试
//
// 验证 RefreshTokenBlacklistService 在配置 REDIS_URL 时的真实 Redis 行为：
//   1. revoke → isRevoked=true（写穿 Redis）
//   2. TTL 1s → ~1.2s 后 isRevoked=false（真实 Redis EX 过期，非内存懒过期兜底）
//   3. 多实例一致性：实例 A revoke，实例 B（全新对象 = 模拟另一台机器）能看到
//      —— 这正是从进程内 Map 迁到 Redis 要换取的核心保证
//
// 运行前置：设置 REDIS_URL 指向一次性本地 Redis，例如 redis://localhost:6390/15。
// 全量验收缺少 Redis 必须失败；纯 PostgreSQL 验证请显式选择其他测试文件。
// ----------------------------------------------------------------------------
var refresh_token_blacklist_service_1 = require("../src/modules/auth/refresh-token-blacklist.service");
describe('RefreshTokenBlacklistService × Redis 集成', function () {
    var serviceA;
    var serviceB;
    beforeEach(function () {
        if (!process.env.REDIS_URL)
            throw new Error('Redis integration requires explicit REDIS_URL');
        // 两个独立实例：各自持有独立的内存 L1 和 Redis 连接，等价于两台后端机器
        serviceA = new refresh_token_blacklist_service_1.RefreshTokenBlacklistService();
        serviceB = new refresh_token_blacklist_service_1.RefreshTokenBlacklistService();
    });
    afterEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (serviceA === null || serviceA === void 0 ? void 0 : serviceA.onModuleDestroy())];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, (serviceB === null || serviceB === void 0 ? void 0 : serviceB.onModuleDestroy())];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('revoke 后 isRevoked 返回 true（写穿 Redis）', function () { return __awaiter(void 0, void 0, void 0, function () {
        var jti, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    jti = "it-rtbl-basic-".concat(Date.now());
                    return [4 /*yield*/, serviceA.revoke(jti, 60)];
                case 1:
                    _b.sent();
                    _a = expect;
                    return [4 /*yield*/, serviceA.isRevoked(jti)];
                case 2:
                    _a.apply(void 0, [_b.sent()]).toBe(true);
                    return [2 /*return*/];
            }
        });
    }); });
    it('未吊销的 jti → isRevoked 返回 false', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = expect;
                    return [4 /*yield*/, serviceA.isRevoked("it-rtbl-never-".concat(Date.now()))];
                case 1:
                    _a.apply(void 0, [_b.sent()]).toBe(false);
                    return [2 /*return*/];
            }
        });
    }); });
    it('TTL 1s：真实 Redis 过期后 isRevoked 返回 false', function () { return __awaiter(void 0, void 0, void 0, function () {
        var jti, _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    jti = "it-rtbl-ttl-".concat(Date.now());
                    return [4 /*yield*/, serviceA.revoke(jti, 1)];
                case 1:
                    _d.sent();
                    _a = expect;
                    return [4 /*yield*/, serviceA.isRevoked(jti)];
                case 2:
                    _a.apply(void 0, [_d.sent()]).toBe(true);
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1200); })
                        // 本实例视角：内存 L1 懒过期 + Redis EX 过期都已生效
                    ];
                case 3:
                    _d.sent();
                    // 本实例视角：内存 L1 懒过期 + Redis EX 过期都已生效
                    _b = expect;
                    return [4 /*yield*/, serviceA.isRevoked(jti)];
                case 4:
                    // 本实例视角：内存 L1 懒过期 + Redis EX 过期都已生效
                    _b.apply(void 0, [_d.sent()]).toBe(false);
                    // 跨实例视角：B 没有 L1 条目，纯走 Redis → 同样已过期
                    _c = expect;
                    return [4 /*yield*/, serviceB.isRevoked(jti)];
                case 5:
                    // 跨实例视角：B 没有 L1 条目，纯走 Redis → 同样已过期
                    _c.apply(void 0, [_d.sent()]).toBe(false);
                    return [2 /*return*/];
            }
        });
    }); });
    it('多实例一致性：实例 A revoke，实例 B 立即可见（核心保证）', function () { return __awaiter(void 0, void 0, void 0, function () {
        var jti, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    jti = "it-rtbl-multi-".concat(Date.now());
                    // B 此前从未见过该 jti（L1 必然未命中，只能靠 Redis 命中）
                    _a = expect;
                    return [4 /*yield*/, serviceB.isRevoked(jti)];
                case 1:
                    // B 此前从未见过该 jti（L1 必然未命中，只能靠 Redis 命中）
                    _a.apply(void 0, [_c.sent()]).toBe(false);
                    return [4 /*yield*/, serviceA.revoke(jti, 60)];
                case 2:
                    _c.sent();
                    _b = expect;
                    return [4 /*yield*/, serviceB.isRevoked(jti)];
                case 3:
                    _b.apply(void 0, [_c.sent()]).toBe(true);
                    return [2 /*return*/];
            }
        });
    }); });
});
