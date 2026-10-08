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
// claimCoupon 并发集成测试（真库真事务 —— Serializable 修复的核心证明）
//
// 单测只能用 mock 验证调用顺序，无法证明并发下不超领。本套件直连一次性本地
// Postgres（DATABASE_URL 由 global-setup 安全闸校验），用真实 PrismaClient 跑
// UserMpService.claimCoupon 的 Serializable 交互式事务：
//   1. 同一用户双并发 → 恰好一成一败（重复 5 轮防偶发），DB 持券 1 行 / received=1
//   2. 两个不同用户并发 → 双双成功（落败方靠 P2034 重试自愈），received=2
//   3. 同一用户串行二次领取 → 按 perUserLimit 拒绝（非竞态路径）
//   4. myCoupons 回读：unused → 核销后 used
// ----------------------------------------------------------------------------
// nanoid@5 是纯 ESM，ts-jest(CJS) 不转换 node_modules；user-mp.service → id.util
// 在模块加载时导入 customAlphabet 会抛 "Cannot use import statement outside a module"。
// 用与单测同款的"忠实"轻量替身（保留字符集 + 长度契约，仅替换熵源）。
// 本套件不触达 orderNo/refundNo 生成路径，替身只为让模块图可加载。
jest.mock('nanoid', function () { return ({
    customAlphabet: function (alphabet, size) { return function () {
        var out = '';
        for (var i = 0; i < size; i++) {
            out += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        return out;
    }; },
}); });
var db_1 = require("./helpers/db");
var user_mp_service_1 = require("../src/modules/user-mp/user-mp.service");
var biz_exception_1 = require("../src/common/exceptions/biz.exception");
// 5 轮竞态 × 每轮 resetDb（~23 表 TRUNCATE），放宽整体超时
jest.setTimeout(120000);
describe('claimCoupon 并发安全（Serializable 真库集成）', function () {
    var prisma;
    var svc;
    beforeAll(function () {
        prisma = (0, db_1.makeClient)();
        // 只测优惠券路径：wxpay / chat 用最小桩即可（claimCoupon/myCoupons 不触达）
        svc = new user_mp_service_1.UserMpService(prisma, { isReady: function () { return false; } }, {
            emitOrderNew: function () { },
            emitOrderUpdate: function () { },
            emitRefundNew: function () { },
            emitChatMessage: function () { },
            broadcastUserUpdate: function () { },
        });
    });
    afterAll(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.$disconnect()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    /**
     * 每轮标准夹具：清库后建 买家 u1（可选 u2）+ 商家 owner + 商家 +
     * 活动券（perUserLimit=1 / stock=10 / 有效期横跨 now）
     */
    function setupFixtures() {
        return __awaiter(this, arguments, void 0, function (opts) {
            var u1, u2, _a, owner, merchant, coupon;
            if (opts === void 0) { opts = {}; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, (0, db_1.resetDb)(prisma)];
                    case 1:
                        _b.sent();
                        return [4 /*yield*/, (0, db_1.createUser)(prisma)];
                    case 2:
                        u1 = _b.sent();
                        if (!opts.secondUser) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, db_1.createUser)(prisma)];
                    case 3:
                        _a = _b.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        _a = null;
                        _b.label = 5;
                    case 5:
                        u2 = _a;
                        return [4 /*yield*/, (0, db_1.createUser)(prisma, { role: 'merchant' })];
                    case 6:
                        owner = _b.sent();
                        return [4 /*yield*/, (0, db_1.createMerchant)(prisma, owner.id)];
                    case 7:
                        merchant = _b.sent();
                        return [4 /*yield*/, (0, db_1.createCoupon)(prisma, merchant.id, {
                                stock: 10,
                                perUserLimit: 1,
                            })];
                    case 8:
                        coupon = _b.sent();
                        return [2 /*return*/, { u1: u1, u2: u2, coupon: coupon }];
                }
            });
        });
    }
    it('同一用户双并发领同一张券：恰好一成一败，DB 持券 1 行且 received=1（重复 5 轮）', function () { return __awaiter(void 0, void 0, void 0, function () {
        var round, _a, u1, coupon, results, fulfilled, rejected, err, ucCount, fresh;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    round = 1;
                    _b.label = 1;
                case 1:
                    if (!(round <= 5)) return [3 /*break*/, 7];
                    return [4 /*yield*/, setupFixtures()];
                case 2:
                    _a = _b.sent(), u1 = _a.u1, coupon = _a.coupon;
                    return [4 /*yield*/, Promise.allSettled([
                            svc.claimCoupon(u1.id, coupon.id),
                            svc.claimCoupon(u1.id, coupon.id),
                        ])];
                case 3:
                    results = _b.sent();
                    fulfilled = results.filter(function (r) { return r.status === 'fulfilled'; });
                    rejected = results.filter(function (r) { return r.status === 'rejected'; });
                    // 把 round 编进断言对象，失败时能直接看出是第几轮炸的
                    expect({
                        round: round,
                        fulfilled: fulfilled.length,
                        rejected: rejected.length,
                    }).toEqual({ round: round, fulfilled: 1, rejected: 1 });
                    err = rejected[0].reason;
                    expect(err).toBeInstanceOf(biz_exception_1.BizException);
                    expect(String(err.message)).toMatch(/已达上限|领取太频繁/);
                    return [4 /*yield*/, prisma.userCoupon.count({
                            where: { userId: u1.id, couponId: coupon.id },
                        })];
                case 4:
                    ucCount = _b.sent();
                    expect({ round: round, ucCount: ucCount }).toEqual({ round: round, ucCount: 1 });
                    return [4 /*yield*/, prisma.coupon.findUnique({ where: { id: coupon.id } })];
                case 5:
                    fresh = _b.sent();
                    expect({ round: round, received: fresh.received }).toEqual({ round: round, received: 1 });
                    _b.label = 6;
                case 6:
                    round++;
                    return [3 /*break*/, 1];
                case 7: return [2 /*return*/];
            }
        });
    }); });
    it('两个不同用户并发领同一张券：双双成功，received=2', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, u1, u2, coupon, results, fresh, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, setupFixtures({ secondUser: true })];
                case 1:
                    _a = _d.sent(), u1 = _a.u1, u2 = _a.u2, coupon = _a.coupon;
                    return [4 /*yield*/, Promise.allSettled([
                            svc.claimCoupon(u1.id, coupon.id),
                            svc.claimCoupon(u2.id, coupon.id),
                        ])
                        // 不同用户互不占额度：即使在同一行 Coupon.received 上撞出 P2034，
                        // claimCoupon 内置重试也应让落败方自愈成功
                    ];
                case 2:
                    results = _d.sent();
                    // 不同用户互不占额度：即使在同一行 Coupon.received 上撞出 P2034，
                    // claimCoupon 内置重试也应让落败方自愈成功
                    expect(results.map(function (r) { return r.status; })).toEqual(['fulfilled', 'fulfilled']);
                    return [4 /*yield*/, prisma.coupon.findUnique({ where: { id: coupon.id } })];
                case 3:
                    fresh = _d.sent();
                    expect(fresh.received).toBe(2);
                    _b = expect;
                    return [4 /*yield*/, prisma.userCoupon.count({ where: { userId: u1.id, couponId: coupon.id } })];
                case 4:
                    _b.apply(void 0, [_d.sent()]).toBe(1);
                    _c = expect;
                    return [4 /*yield*/, prisma.userCoupon.count({ where: { userId: u2.id, couponId: coupon.id } })];
                case 5:
                    _c.apply(void 0, [_d.sent()]).toBe(1);
                    return [2 /*return*/];
            }
        });
    }); });
    it('同一用户串行第二次领取：按 perUserLimit 拒绝（非竞态路径）', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, u1, coupon, first, caught, e_1, _b, fresh;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, setupFixtures()];
                case 1:
                    _a = _c.sent(), u1 = _a.u1, coupon = _a.coupon;
                    return [4 /*yield*/, svc.claimCoupon(u1.id, coupon.id)];
                case 2:
                    first = _c.sent();
                    expect(first.ok).toBe(true);
                    _c.label = 3;
                case 3:
                    _c.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, svc.claimCoupon(u1.id, coupon.id)];
                case 4:
                    _c.sent();
                    return [3 /*break*/, 6];
                case 5:
                    e_1 = _c.sent();
                    caught = e_1;
                    return [3 /*break*/, 6];
                case 6:
                    expect(caught).toBeInstanceOf(biz_exception_1.BizException);
                    // 串行路径没有写冲突，必须命中明确的"已达上限"，而非重试耗尽兜底
                    expect(String(caught.message)).toMatch(/已达上限/);
                    _b = expect;
                    return [4 /*yield*/, prisma.userCoupon.count({ where: { userId: u1.id, couponId: coupon.id } })];
                case 7:
                    _b.apply(void 0, [_c.sent()]).toBe(1);
                    return [4 /*yield*/, prisma.coupon.findUnique({ where: { id: coupon.id } })];
                case 8:
                    fresh = _c.sent();
                    expect(fresh.received).toBe(1);
                    return [2 /*return*/];
            }
        });
    }); });
    it('myCoupons 回读：领取后 1 行 unused 且带券名，核销后变 used', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, u1, coupon, claimed, before, after;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, setupFixtures()];
                case 1:
                    _a = _b.sent(), u1 = _a.u1, coupon = _a.coupon;
                    return [4 /*yield*/, svc.claimCoupon(u1.id, coupon.id)];
                case 2:
                    claimed = _b.sent();
                    expect(claimed.ok).toBe(true);
                    return [4 /*yield*/, svc.myCoupons(u1.id)];
                case 3:
                    before = _b.sent();
                    expect(before).toHaveLength(1);
                    expect(before[0].no).toBe(claimed.no);
                    expect(before[0].status).toBe('unused');
                    expect(before[0].name).toBe(coupon.name);
                    expect(before[0].usedAt).toBeNull();
                    // 模拟核销：直接改 UserCoupon 行（status=used + usedAt）
                    return [4 /*yield*/, prisma.userCoupon.update({
                            where: { no: claimed.no },
                            data: { status: 'used', usedAt: new Date() },
                        })];
                case 4:
                    // 模拟核销：直接改 UserCoupon 行（status=used + usedAt）
                    _b.sent();
                    return [4 /*yield*/, svc.myCoupons(u1.id)];
                case 5:
                    after = _b.sent();
                    expect(after).toHaveLength(1);
                    expect(after[0].no).toBe(claimed.no);
                    expect(after[0].status).toBe('used');
                    expect(after[0].usedAt).toBeTruthy();
                    return [2 /*return*/];
            }
        });
    }); });
});
