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
// ----------------------------------------------------------------------------
// OrderShare 集成测试（真实 Postgres）
//
// Part A：OrderShareService 服务往返（真实 PrismaClient，不打桩）
//   1. createShare 落库；同订单二次创建撤销旧分享（旧 revoked=true，新生效）
//   2. getPublicByCode 字段门控（仅 basics 时不泄露 customer/pricing/items/extra）
//      + viewCount 异步自增真实落库
//   3. revoked / 过期 → 2003（FORBIDDEN）；未知 shareCode → 1002（NOT_FOUND）
//   4. listByMerchant 真分页（skip/take + count）与 revoked 过滤
//
// Part B：deploy/order-share-init.sql 回填脚本真执行
//   - 按旧 SystemConfig（key=`order_share:<shareCode>`）格式造两行数据
//   - 逐条执行脚本语句（剥离注释；跳过 BEGIN/COMMIT 与末尾校验 SELECT）
//   - 断言字段映射正确（visibleFields 顺序 / viewCount / revoked / expiresAt）
//   - 重复执行幂等（IF NOT EXISTS + ON CONFLICT DO NOTHING，不报错不重复）
//
// 运行方式（见 test-integration/README.md，需指向一次性本地测试库）：
//   $env:DATABASE_URL = "postgresql://test:test@localhost:5440/qa?schema=public"
//   pnpm --filter @jiujiu/server db:push:test && pnpm --filter @jiujiu/server test:integration
// ----------------------------------------------------------------------------
var fs = require("fs");
var path = require("path");
// nanoid@5 是纯 ESM，ts-jest(CJS) 不转换 node_modules；与单测 test/order-share.service.spec.ts
// 一致，用等价随机生成器替换 customAlphabet，避免 "Cannot use import statement outside a module"。
// 仅替换 shareCode 生成器，DB 读写仍走真实 Prisma。
jest.mock('nanoid', function () { return ({
    customAlphabet: function (alphabet, size) { return function () {
        var s = '';
        for (var i = 0; i < size; i++) {
            s += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        return s;
    }; },
}); });
var order_share_service_1 = require("../src/modules/merchant/order-share.service");
var biz_exception_1 = require("../src/common/exceptions/biz.exception");
var db_1 = require("./helpers/db");
jest.setTimeout(30000);
var SQL_PATH = path.resolve(__dirname, '..', '..', '..', 'deploy', 'order-share-init.sql');
var orderSeq = 0;
/** 创建测试订单（填齐全部必填列：no 唯一 / 金额 Decimal / address Json） */
function createOrder(prisma, userId, merchantId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            orderSeq += 1;
            return [2 /*return*/, prisma.order.create({
                    data: {
                        no: "IT".concat(Date.now()).concat(orderSeq),
                        userId: userId,
                        merchantId: merchantId,
                        status: 'paid',
                        totalAmount: 1999.5,
                        payAmount: 1899.5,
                        address: {
                            name: '王五',
                            phone: '13800000000',
                            region: '北京市/北京市/朝阳区',
                            detail: '幸福路 8 号',
                        },
                    },
                })];
        });
    });
}
/** 断言异步调用抛出指定业务码的 BizException */
function expectBizCode(fn, code) {
    return __awaiter(this, void 0, void 0, function () {
        var caught, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    caught = null;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fn()];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _a.sent();
                    caught = e_1;
                    return [3 /*break*/, 4];
                case 4:
                    expect(caught).toBeInstanceOf(biz_exception_1.BizException);
                    expect(caught.getResponse().code).toBe(code);
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * 轮询等待 viewCount 达到期望值（getPublicByCode 的自增是 fire-and-forget，
 * 不阻塞响应，需短暂重试后再读库断言；上限约 1.5s）
 */
function waitForViewCount(prisma, shareCode, expected) {
    return __awaiter(this, void 0, void 0, function () {
        var deadline, row;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    deadline = Date.now() + 1500;
                    _b.label = 1;
                case 1: return [4 /*yield*/, prisma.orderShare.findUnique({ where: { shareCode: shareCode } })];
                case 2:
                    row = _b.sent();
                    if (((_a = row === null || row === void 0 ? void 0 : row.viewCount) !== null && _a !== void 0 ? _a : 0) >= expected || Date.now() > deadline)
                        return [2 /*return*/, row];
                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 50); })];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4: return [3 /*break*/, 1];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * 读取回填脚本并切分为可逐条执行的语句：
 *   - 剥离整行注释（^--）
 *   - 按分号切分（脚本无 DO $$ 块，分号即语句边界）
 *   - 跳过 BEGIN/COMMIT（prisma.$executeRawUnsafe 单语句执行，无需事务包裹）
 *   - 跳过末尾的校验 SELECT（查询语句不能走 executeRaw）
 */
function loadBackfillStatements() {
    var raw = fs.readFileSync(SQL_PATH, 'utf8');
    return raw
        .split(/\r?\n/)
        .filter(function (line) { return !line.trim().startsWith('--'); })
        .join('\n')
        .split(';')
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return s.length > 0; })
        .filter(function (s) { return !/^(BEGIN|COMMIT)$/i.test(s); })
        .filter(function (s) { return !/^SELECT/i.test(s); });
}
describe('OrderShare 集成测试（真实 Postgres）', function () {
    var prisma;
    var service;
    beforeAll(function () {
        prisma = (0, db_1.makeClient)();
        service = new order_share_service_1.OrderShareService(prisma);
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
    // ──────────────────────────────────────────────────────────
    // Part A · OrderShareService 服务往返
    // ──────────────────────────────────────────────────────────
    describe('Part A · OrderShareService 服务往返', function () {
        var user;
        var merchant;
        beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, db_1.resetDb)(prisma)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, (0, db_1.createUser)(prisma)];
                    case 2:
                        user = _a.sent();
                        return [4 /*yield*/, (0, db_1.createMerchant)(prisma, user.id)];
                    case 3:
                        merchant = _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('createShare 落库；同订单二次创建撤销旧分享', function () { return __awaiter(void 0, void 0, void 0, function () {
            var order, first, row1, second, oldRow, newRow;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, createOrder(prisma, user.id, merchant.id)];
                    case 1:
                        order = _a.sent();
                        return [4 /*yield*/, service.createShare({
                                orderId: order.id,
                                merchantId: merchant.id,
                                callerSub: user.id,
                                visibleFields: ['basics', 'items'],
                            })];
                    case 2:
                        first = _a.sent();
                        expect(first.shareCode).toHaveLength(12);
                        expect(first.orderNo).toBe(order.no);
                        return [4 /*yield*/, prisma.orderShare.findUnique({ where: { shareCode: first.shareCode } })];
                    case 3:
                        row1 = _a.sent();
                        expect(row1).toBeTruthy();
                        expect(row1.orderId).toBe(order.id);
                        expect(row1.merchantId).toBe(merchant.id);
                        expect(row1.visibleFields).toEqual(['basics', 'items']);
                        expect(row1.expiresAt).toBeNull(); // 未传 expiresInDays = 永久
                        expect(row1.revoked).toBe(false);
                        expect(row1.createdBy).toBe(user.id);
                        return [4 /*yield*/, service.createShare({
                                orderId: order.id,
                                merchantId: merchant.id,
                                callerSub: user.id,
                                visibleFields: ['basics'],
                            })];
                    case 4:
                        second = _a.sent();
                        expect(second.shareCode).not.toBe(first.shareCode);
                        return [4 /*yield*/, prisma.orderShare.findUnique({ where: { shareCode: first.shareCode } })];
                    case 5:
                        oldRow = _a.sent();
                        return [4 /*yield*/, prisma.orderShare.findUnique({ where: { shareCode: second.shareCode } })];
                    case 6:
                        newRow = _a.sent();
                        expect(oldRow.revoked).toBe(true);
                        expect(newRow.revoked).toBe(false);
                        expect(newRow.visibleFields).toEqual(['basics']);
                        return [2 /*return*/];
                }
            });
        }); });
        it('getPublicByCode 字段门控（仅 basics）+ viewCount 真实自增', function () { return __awaiter(void 0, void 0, void 0, function () {
            var order, created, pub, row;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, createOrder(prisma, user.id, merchant.id)];
                    case 1:
                        order = _a.sent();
                        return [4 /*yield*/, service.createShare({
                                orderId: order.id,
                                merchantId: merchant.id,
                                callerSub: user.id,
                                visibleFields: ['basics'],
                                intro: '门窗报价单',
                            })];
                    case 2:
                        created = _a.sent();
                        return [4 /*yield*/, service.getPublicByCode(created.shareCode)
                            // 应有：shareCode + merchant + basics
                        ];
                    case 3:
                        pub = _a.sent();
                        // 应有：shareCode + merchant + basics
                        expect(pub.shareCode).toBe(created.shareCode);
                        expect(pub.merchant).toMatchObject({ id: merchant.id, name: merchant.name });
                        expect(pub.basics).toBeDefined();
                        expect(pub.basics.no).toBe(order.no);
                        expect(pub.basics.status).toBe('paid');
                        expect(Number(pub.basics.totalAmount)).toBeCloseTo(1999.5);
                        expect(Number(pub.basics.payAmount)).toBeCloseTo(1899.5);
                        // 不应有：未授权字段不出现在返回 JSON 中（防 devtools 反向取敏感信息）
                        expect(pub).not.toHaveProperty('customer');
                        expect(pub).not.toHaveProperty('pricing');
                        expect(pub).not.toHaveProperty('items');
                        expect(pub).not.toHaveProperty('extra');
                        return [4 /*yield*/, waitForViewCount(prisma, created.shareCode, 1)];
                    case 4:
                        row = _a.sent();
                        expect(row.viewCount).toBe(1);
                        return [2 /*return*/];
                }
            });
        }); });
        it('revoked → 2003；过期 → 2003；未知 code → 1002', function () { return __awaiter(void 0, void 0, void 0, function () {
            var o1, s1, rv, o2, s2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, createOrder(prisma, user.id, merchant.id)];
                    case 1:
                        o1 = _a.sent();
                        return [4 /*yield*/, service.createShare({
                                orderId: o1.id,
                                merchantId: merchant.id,
                                callerSub: user.id,
                                visibleFields: ['basics'],
                            })];
                    case 2:
                        s1 = _a.sent();
                        return [4 /*yield*/, service.revokeByOrder(o1.id, merchant.id)];
                    case 3:
                        rv = _a.sent();
                        expect(rv).toMatchObject({ ok: true, revoked: true, shareCode: s1.shareCode });
                        return [4 /*yield*/, expectBizCode(function () { return service.getPublicByCode(s1.shareCode); }, biz_exception_1.BizCode.FORBIDDEN)
                            // 已过期：先建 1 天有效期的分享，再手动把 expiresAt 改到过去
                        ]; // 2003
                    case 4:
                        _a.sent(); // 2003
                        return [4 /*yield*/, createOrder(prisma, user.id, merchant.id)];
                    case 5:
                        o2 = _a.sent();
                        return [4 /*yield*/, service.createShare({
                                orderId: o2.id,
                                merchantId: merchant.id,
                                callerSub: user.id,
                                visibleFields: ['basics'],
                                expiresInDays: 1,
                            })];
                    case 6:
                        s2 = _a.sent();
                        expect(s2.expiresAt).toBeTruthy();
                        return [4 /*yield*/, prisma.orderShare.update({
                                where: { shareCode: s2.shareCode },
                                data: { expiresAt: new Date(Date.now() - 3600000) },
                            })];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, expectBizCode(function () { return service.getPublicByCode(s2.shareCode); }, biz_exception_1.BizCode.FORBIDDEN)
                            // 不存在的 shareCode
                        ]; // 2003
                    case 8:
                        _a.sent(); // 2003
                        // 不存在的 shareCode
                        return [4 /*yield*/, expectBizCode(function () { return service.getPublicByCode('zzzzzzzzzzzz'); }, biz_exception_1.BizCode.NOT_FOUND)]; // 1002
                    case 9:
                        // 不存在的 shareCode
                        _a.sent(); // 1002
                        return [2 /*return*/];
                }
            });
        }); });
        it('listByMerchant 真分页 + revoked 过滤', function () { return __awaiter(void 0, void 0, void 0, function () {
            var orders, _a, shares, _i, orders_1, o, _b, _c, p1, p2, allCodes, reshared, revokedPage, activePage, activeCodes, allPage;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, createOrder(prisma, user.id, merchant.id)];
                    case 1:
                        _a = [
                            _d.sent()
                        ];
                        return [4 /*yield*/, createOrder(prisma, user.id, merchant.id)];
                    case 2:
                        _a = _a.concat([
                            _d.sent()
                        ]);
                        return [4 /*yield*/, createOrder(prisma, user.id, merchant.id)];
                    case 3:
                        orders = _a.concat([
                            _d.sent()
                        ]);
                        shares = [];
                        _i = 0, orders_1 = orders;
                        _d.label = 4;
                    case 4:
                        if (!(_i < orders_1.length)) return [3 /*break*/, 7];
                        o = orders_1[_i];
                        _c = (_b = shares).push;
                        return [4 /*yield*/, service.createShare({
                                orderId: o.id,
                                merchantId: merchant.id,
                                callerSub: user.id,
                                visibleFields: ['basics'],
                            })];
                    case 5:
                        _c.apply(_b, [_d.sent()]);
                        _d.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 4];
                    case 7: return [4 /*yield*/, service.listByMerchant(merchant.id, { page: 1, pageSize: 2 })];
                    case 8:
                        p1 = _d.sent();
                        expect(p1.total).toBe(3);
                        expect(p1.list).toHaveLength(2);
                        expect(p1.page).toBe(1);
                        expect(p1.pageSize).toBe(2);
                        expect(p1.hasMore).toBe(true);
                        expect(p1.list[0].orderNo).toBeTruthy(); // 拼了订单号摘要
                        return [4 /*yield*/, service.listByMerchant(merchant.id, { page: 2, pageSize: 2 })];
                    case 9:
                        p2 = _d.sent();
                        expect(p2.list).toHaveLength(1);
                        expect(p2.hasMore).toBe(false);
                        allCodes = __spreadArray(__spreadArray([], p1.list, true), p2.list, true).map(function (r) { return r.shareCode; }).sort();
                        expect(allCodes).toEqual(shares.map(function (s) { return s.shareCode; }).sort());
                        return [4 /*yield*/, service.createShare({
                                orderId: orders[0].id,
                                merchantId: merchant.id,
                                callerSub: user.id,
                                visibleFields: ['basics'],
                            })];
                    case 10:
                        reshared = _d.sent();
                        return [4 /*yield*/, service.listByMerchant(merchant.id, { revoked: 'true' })];
                    case 11:
                        revokedPage = _d.sent();
                        expect(revokedPage.total).toBe(1);
                        expect(revokedPage.list[0].shareCode).toBe(shares[0].shareCode);
                        expect(revokedPage.list[0].revoked).toBe(true);
                        return [4 /*yield*/, service.listByMerchant(merchant.id, { revoked: false })];
                    case 12:
                        activePage = _d.sent();
                        expect(activePage.total).toBe(3);
                        activeCodes = activePage.list.map(function (r) { return r.shareCode; });
                        expect(activeCodes).toContain(reshared.shareCode);
                        expect(activeCodes).not.toContain(shares[0].shareCode);
                        return [4 /*yield*/, service.listByMerchant(merchant.id, {})];
                    case 13:
                        allPage = _d.sent();
                        expect(allPage.total).toBe(4);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    // ──────────────────────────────────────────────────────────
    // Part B · deploy/order-share-init.sql 回填脚本真执行
    // ──────────────────────────────────────────────────────────
    describe('Part B · deploy/order-share-init.sql 回填脚本', function () {
        var LEGACY_EXPIRES = '2099-01-02T03:04:05.000Z';
        var LEGACY_CREATED_1 = '2026-05-01T08:00:00.000Z';
        var LEGACY_CREATED_2 = '2026-05-02T09:30:00.000Z';
        it('SystemConfig 旧格式两行 → 回填 OrderShare，重复执行幂等', function () { return __awaiter(void 0, void 0, void 0, function () {
            var statements, _i, statements_1, stmt, rows, abc, xyz, _a, statements_2, stmt, rowsAgain, abcAgain;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: 
                    // 1. 清场：OrderShare 清空 + 删除旧 order_share 配置行
                    return [4 /*yield*/, prisma.$executeRawUnsafe('TRUNCATE TABLE "OrderShare" CASCADE')];
                    case 1:
                        // 1. 清场：OrderShare 清空 + 删除旧 order_share 配置行
                        _b.sent();
                        return [4 /*yield*/, prisma.systemConfig.deleteMany({ where: { key: { startsWith: 'order_share:' } } })
                            // 2. 按旧版 SystemConfig KV 格式造两行（key = order_share:<12位shareCode>）
                            //    行一：永久（expiresAt null）+ 未撤销；行二：有过期时间 + 已撤销
                        ];
                    case 2:
                        _b.sent();
                        // 2. 按旧版 SystemConfig KV 格式造两行（key = order_share:<12位shareCode>）
                        //    行一：永久（expiresAt null）+ 未撤销；行二：有过期时间 + 已撤销
                        return [4 /*yield*/, prisma.systemConfig.create({
                                data: {
                                    key: 'order_share:ABC123def456',
                                    value: {
                                        orderId: 'order-legacy-1',
                                        merchantId: 'merchant-legacy-1',
                                        visibleFields: ['basics', 'items'],
                                        expiresAt: null,
                                        intro: '旧分享一',
                                        viewCount: 7,
                                        revoked: false,
                                        createdAt: LEGACY_CREATED_1,
                                        createdBy: 'user-legacy-1',
                                    },
                                },
                            })];
                    case 3:
                        // 2. 按旧版 SystemConfig KV 格式造两行（key = order_share:<12位shareCode>）
                        //    行一：永久（expiresAt null）+ 未撤销；行二：有过期时间 + 已撤销
                        _b.sent();
                        return [4 /*yield*/, prisma.systemConfig.create({
                                data: {
                                    key: 'order_share:XYZ789ghi012',
                                    value: {
                                        orderId: 'order-legacy-2',
                                        merchantId: 'merchant-legacy-2',
                                        visibleFields: ['items', 'basics'], // 顺序故意与行一不同，验证数组顺序保真
                                        expiresAt: LEGACY_EXPIRES,
                                        intro: '旧分享二',
                                        viewCount: 7,
                                        revoked: true,
                                        createdAt: LEGACY_CREATED_2,
                                        createdBy: 'user-legacy-2',
                                    },
                                },
                            })
                            // 3. 逐条执行脚本语句（建表 + 3 索引 + INSERT 回填 = 5 条）
                        ];
                    case 4:
                        _b.sent();
                        statements = loadBackfillStatements();
                        expect(statements).toHaveLength(5);
                        expect(statements[0]).toMatch(/^CREATE TABLE IF NOT EXISTS "OrderShare"/);
                        expect(statements[4]).toMatch(/^INSERT INTO "OrderShare"/);
                        _i = 0, statements_1 = statements;
                        _b.label = 5;
                    case 5:
                        if (!(_i < statements_1.length)) return [3 /*break*/, 8];
                        stmt = statements_1[_i];
                        return [4 /*yield*/, prisma.$executeRawUnsafe(stmt)];
                    case 6:
                        _b.sent();
                        _b.label = 7;
                    case 7:
                        _i++;
                        return [3 /*break*/, 5];
                    case 8: return [4 /*yield*/, prisma.orderShare.findMany({ orderBy: { shareCode: 'asc' } })];
                    case 9:
                        rows = _b.sent();
                        expect(rows).toHaveLength(2);
                        abc = rows.find(function (r) { return r.shareCode === 'ABC123def456'; });
                        expect(abc).toBeTruthy();
                        expect(abc.orderId).toBe('order-legacy-1');
                        expect(abc.merchantId).toBe('merchant-legacy-1');
                        expect(abc.visibleFields).toEqual(['basics', 'items']);
                        expect(abc.expiresAt).toBeNull();
                        expect(abc.intro).toBe('旧分享一');
                        expect(abc.viewCount).toBe(7);
                        expect(abc.revoked).toBe(false);
                        expect(abc.createdBy).toBe('user-legacy-1');
                        expect(abc.createdAt.toISOString()).toBe(LEGACY_CREATED_1);
                        xyz = rows.find(function (r) { return r.shareCode === 'XYZ789ghi012'; });
                        expect(xyz).toBeTruthy();
                        expect(xyz.orderId).toBe('order-legacy-2');
                        expect(xyz.merchantId).toBe('merchant-legacy-2');
                        expect(xyz.visibleFields).toEqual(['items', 'basics']);
                        expect(xyz.expiresAt).not.toBeNull();
                        expect(xyz.expiresAt.toISOString()).toBe(LEGACY_EXPIRES);
                        expect(xyz.viewCount).toBe(7);
                        expect(xyz.revoked).toBe(true);
                        expect(xyz.createdAt.toISOString()).toBe(LEGACY_CREATED_2);
                        _a = 0, statements_2 = statements;
                        _b.label = 10;
                    case 10:
                        if (!(_a < statements_2.length)) return [3 /*break*/, 13];
                        stmt = statements_2[_a];
                        return [4 /*yield*/, prisma.$executeRawUnsafe(stmt)];
                    case 11:
                        _b.sent();
                        _b.label = 12;
                    case 12:
                        _a++;
                        return [3 /*break*/, 10];
                    case 13: return [4 /*yield*/, prisma.orderShare.findMany()];
                    case 14:
                        rowsAgain = _b.sent();
                        expect(rowsAgain).toHaveLength(2);
                        abcAgain = rowsAgain.find(function (r) { return r.shareCode === 'ABC123def456'; });
                        expect(abcAgain.viewCount).toBe(7);
                        expect(abcAgain.revoked).toBe(false);
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
