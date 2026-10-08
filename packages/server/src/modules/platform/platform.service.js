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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformService = void 0;
var common_1 = require("@nestjs/common");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
var pagination_util_1 = require("../../common/utils/pagination.util");
var decimal_util_1 = require("../../common/utils/decimal.util");
var argon2 = require("argon2");
/** updateAdmin 服务层二次过滤白名单（DTO 是入口防御，service 是出口防御，双保险） */
var ADMIN_UPDATABLE_FIELDS = [
    'username',
    'phone',
    'email',
    'nickname',
    'avatar',
    'role',
    'status',
];
var PlatformService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var PlatformService = _classThis = /** @class */ (function () {
        function PlatformService_1(prisma, merchantService, 
        // PaymentModule 是 @Global，可直接注入；平台代审退款时调微信支付 v3
        wxpay, contentSecurity) {
            this.prisma = prisma;
            this.merchantService = merchantService;
            this.wxpay = wxpay;
            this.contentSecurity = contentSecurity;
            this.logger = new common_1.Logger(PlatformService.name);
            // ========== 广告 ==========
            /**
             * AdSlot 写入字段白名单。
             * - preview / startAt / endAt 走主表（schema 已加列），不再走 SystemConfig 兜底
             * - 其它非 schema 字段一律丢弃，避免 prisma ValidationError
             *
             * TODO(运维): 历史数据如有 SystemConfig.system_settings.business.adSlotMeta，
             * 需要执行 migrateAdSlotMeta() 把兜底数据同步回主表（详见 README 数据迁移）。
             */
            this.AD_SLOT_FIELDS = [
                'code',
                'name',
                'scene',
                'target',
                'position',
                'size',
                'sort',
                'unitPrice',
                'enabled',
                'status',
                'preview',
                'startAt',
                'endAt',
            ];
        }
        // ========== Dashboard ==========
        PlatformService_1.prototype.dashboard = function () {
            return __awaiter(this, void 0, void 0, function () {
                var today0, yesterday0, _a, merchants, merchantsYday, orderAgg, todayOrderAgg, ydayOrderAgg, users, usersYday, pendingMerchants, pendingProducts, pendingAds, complaints, pendingWithdraws, factoryCount, storeCount, ymCount, yyCount, trialCount, totalGmv, todayGmv, ydayGmv, gmvDelta, trendWindows, trendCounts, registrationTrend, orderItems, catMap, _i, orderItems_1, it_1, c, categorySales;
                var _this = this;
                var _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            today0 = new Date();
                            today0.setHours(0, 0, 0, 0);
                            yesterday0 = new Date(today0.getTime() - 86400000);
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.merchant.count({ where: { status: 'active' } }),
                                    this.prisma.merchant.count({ where: { status: 'active', createdAt: { lt: today0 } } }),
                                    this.prisma.order.aggregate({ _sum: { payAmount: true }, _count: true }),
                                    this.prisma.order.aggregate({
                                        where: { createdAt: { gte: today0 } },
                                        _sum: { payAmount: true },
                                        _count: true,
                                    }),
                                    this.prisma.order.aggregate({
                                        where: { createdAt: { gte: yesterday0, lt: today0 } },
                                        _sum: { payAmount: true },
                                        _count: true,
                                    }),
                                    this.prisma.user.count(),
                                    this.prisma.user.count({ where: { createdAt: { lt: today0 } } }),
                                    this.prisma.merchant.count({ where: { status: 'pending' } }),
                                    this.prisma.product.count({ where: { status: 'auditing' } }),
                                    this.prisma.adCreative.count({ where: { status: 'pending' } }),
                                    this.prisma.refund.count({ where: { status: 'pending' } }),
                                    this.prisma.withdraw.count({ where: { status: 'pending' } }),
                                    this.prisma.merchant.count({ where: { type: 'factory', status: 'active' } }),
                                    this.prisma.merchant.count({ where: { type: 'store', status: 'active' } }),
                                    this.prisma.merchantMembership.count({
                                        where: { status: { in: ['active'] }, plan: { period: 'yearly' } },
                                    }),
                                    this.prisma.merchantMembership.count({
                                        where: { status: { in: ['active'] }, plan: { period: 'monthly' } },
                                    }),
                                    this.prisma.merchantMembership.count({ where: { status: 'trial' } }),
                                ])];
                        case 1:
                            _a = _d.sent(), merchants = _a[0], merchantsYday = _a[1], orderAgg = _a[2], todayOrderAgg = _a[3], ydayOrderAgg = _a[4], users = _a[5], usersYday = _a[6], pendingMerchants = _a[7], pendingProducts = _a[8], pendingAds = _a[9], complaints = _a[10], pendingWithdraws = _a[11], factoryCount = _a[12], storeCount = _a[13], ymCount = _a[14], yyCount = _a[15], trialCount = _a[16];
                            totalGmv = Number(orderAgg._sum.payAmount || 0);
                            todayGmv = Number(todayOrderAgg._sum.payAmount || 0);
                            ydayGmv = Number(ydayOrderAgg._sum.payAmount || 0);
                            gmvDelta = ydayGmv > 0 ? Math.round(((todayGmv - ydayGmv) / ydayGmv) * 100) : 0;
                            trendWindows = Array.from({ length: 7 }, function (_, idx) {
                                var i = 6 - idx;
                                var d = new Date(Date.now() - i * 86400000);
                                d.setHours(0, 0, 0, 0);
                                return {
                                    label: "".concat(String(d.getMonth() + 1).padStart(2, '0'), "-").concat(String(d.getDate()).padStart(2, '0')),
                                    gte: d,
                                    lt: new Date(d.getTime() + 86400000),
                                };
                            });
                            return [4 /*yield*/, Promise.all(trendWindows.map(function (w) {
                                    return _this.prisma.user.count({ where: { createdAt: { gte: w.gte, lt: w.lt } } });
                                }))];
                        case 2:
                            trendCounts = _d.sent();
                            registrationTrend = trendWindows.map(function (w, idx) { return ({
                                date: w.label,
                                value: trendCounts[idx],
                            }); });
                            return [4 /*yield*/, this.prisma.orderItem.findMany({
                                    where: { order: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } },
                                    include: { product: { include: { category: true } } },
                                })];
                        case 3:
                            orderItems = _d.sent();
                            catMap = new Map();
                            for (_i = 0, orderItems_1 = orderItems; _i < orderItems_1.length; _i++) {
                                it_1 = orderItems_1[_i];
                                c = ((_c = (_b = it_1.product) === null || _b === void 0 ? void 0 : _b.category) === null || _c === void 0 ? void 0 : _c.name) || '其它';
                                catMap.set(c, (catMap.get(c) || 0) + Number(it_1.unitPrice) * it_1.quantity);
                            }
                            categorySales = Array.from(catMap.entries()).map(function (_a) {
                                var category = _a[0], value = _a[1];
                                return ({
                                    category: category,
                                    value: Math.round(value),
                                });
                            });
                            return [2 /*return*/, {
                                    overview: {
                                        merchants: merchants,
                                        merchantsDelta: merchants - merchantsYday,
                                        orders: orderAgg._count,
                                        ordersDelta: todayOrderAgg._count - ydayOrderAgg._count,
                                        gmv: Math.round(totalGmv),
                                        gmvDelta: gmvDelta,
                                        users: users,
                                        usersDelta: users - usersYday,
                                    },
                                    registrationTrend: registrationTrend,
                                    todos: {
                                        pendingMerchants: pendingMerchants,
                                        pendingProducts: pendingProducts,
                                        pendingAds: pendingAds,
                                        complaints: complaints,
                                        pendingWithdraws: pendingWithdraws,
                                    },
                                    merchantTypeDistribution: { factory: factoryCount, store: storeCount },
                                    categorySales: categorySales,
                                    memberPlanDistribution: {
                                        yearly: yyCount,
                                        monthly: ymCount,
                                        trial: trialCount,
                                    },
                                }];
                    }
                });
            });
        };
        /**
         * 平台运营报表
         *
         * period 支持：today / week / month / year
         *   - today：按小时聚合，24 个桶
         *   - week / month：按天聚合
         *   - year：按月聚合，12 个桶
         *
         * 返回：
         *   - salesTrend：[{date, value}] 销售额时间序列
         *   - topMerchants：销售额 TOP 10 商家
         *
         * 全部走 Order 表实时聚合，无任何 mock 兜底。
         */
        PlatformService_1.prototype.stats = function (q) {
            return __awaiter(this, void 0, void 0, function () {
                var period, now, sinceDate, segments, bucketMs, labelFn, orders, salesTrend, _loop_1, i, _loop_2, i, byMerchant, _i, orders_1, o, cur, topIds, merchantInfo, _a, infoMap, topMerchants;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            period = ['today', 'week', 'month', 'year'].includes(q === null || q === void 0 ? void 0 : q.period)
                                ? q.period
                                : 'today';
                            now = new Date();
                            if (period === 'today') {
                                sinceDate = new Date(now);
                                sinceDate.setHours(0, 0, 0, 0);
                                segments = 24;
                                bucketMs = 3600000;
                                labelFn = function (d) { return "".concat(String(d.getHours()).padStart(2, '0'), ":00"); };
                            }
                            else if (period === 'week') {
                                sinceDate = new Date(now.getTime() - 6 * 86400000);
                                sinceDate.setHours(0, 0, 0, 0);
                                segments = 7;
                                bucketMs = 86400000;
                                labelFn = function (d) { return "".concat(d.getMonth() + 1, "/").concat(d.getDate()); };
                            }
                            else if (period === 'month') {
                                sinceDate = new Date(now.getTime() - 29 * 86400000);
                                sinceDate.setHours(0, 0, 0, 0);
                                segments = 30;
                                bucketMs = 86400000;
                                labelFn = function (d) { return "".concat(d.getMonth() + 1, "/").concat(d.getDate()); };
                            }
                            else {
                                sinceDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
                                segments = 12;
                                bucketMs = 0; // year 模式按月切分，单独处理
                                labelFn = function (d) { return "".concat(d.getMonth() + 1, "\u6708"); };
                            }
                            return [4 /*yield*/, this.prisma.order.findMany({
                                    where: {
                                        createdAt: { gte: sinceDate },
                                        status: { in: ['pending_shipment', 'shipped', 'completed'] },
                                    },
                                    select: { merchantId: true, payAmount: true, createdAt: true },
                                })
                                // 时间序列
                            ];
                        case 1:
                            orders = _b.sent();
                            salesTrend = [];
                            if (period === 'year') {
                                _loop_1 = function (i) {
                                    var segStart = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
                                    var segEnd = new Date(now.getFullYear(), now.getMonth() - (11 - i) + 1, 1);
                                    var sum = orders
                                        .filter(function (o) { return o.createdAt >= segStart && o.createdAt < segEnd; })
                                        .reduce(function (s, o) { return s + Number(o.payAmount); }, 0);
                                    salesTrend.push({ date: labelFn(segStart), value: Math.round(sum) });
                                };
                                for (i = 0; i < 12; i++) {
                                    _loop_1(i);
                                }
                            }
                            else {
                                _loop_2 = function (i) {
                                    var segStart = new Date(sinceDate.getTime() + i * bucketMs);
                                    var segEnd = new Date(segStart.getTime() + bucketMs);
                                    var sum = orders
                                        .filter(function (o) { return o.createdAt >= segStart && o.createdAt < segEnd; })
                                        .reduce(function (s, o) { return s + Number(o.payAmount); }, 0);
                                    salesTrend.push({ date: labelFn(segStart), value: Math.round(sum) });
                                };
                                for (i = 0; i < segments; i++) {
                                    _loop_2(i);
                                }
                            }
                            byMerchant = new Map();
                            for (_i = 0, orders_1 = orders; _i < orders_1.length; _i++) {
                                o = orders_1[_i];
                                cur = byMerchant.get(o.merchantId) || 0;
                                byMerchant.set(o.merchantId, cur + Number(o.payAmount));
                            }
                            topIds = Array.from(byMerchant.entries())
                                .sort(function (a, b) { return b[1] - a[1]; })
                                .slice(0, 10);
                            if (!topIds.length) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.merchant.findMany({
                                    where: { id: { in: topIds.map(function (_a) {
                                                var id = _a[0];
                                                return id;
                                            }) } },
                                    select: { id: true, name: true, type: true, region: true },
                                })];
                        case 2:
                            _a = _b.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            _a = [];
                            _b.label = 4;
                        case 4:
                            merchantInfo = _a;
                            infoMap = new Map(merchantInfo.map(function (m) { return [m.id, m]; }));
                            topMerchants = topIds.map(function (_a) {
                                var id = _a[0], amount = _a[1];
                                var info = infoMap.get(id);
                                return {
                                    merchantId: id,
                                    name: (info === null || info === void 0 ? void 0 : info.name) || '未知商家',
                                    type: (info === null || info === void 0 ? void 0 : info.type) || '',
                                    region: (info === null || info === void 0 ? void 0 : info.region) || '',
                                    sales: Math.round(amount),
                                };
                            });
                            return [2 /*return*/, { period: period, salesTrend: salesTrend, topMerchants: topMerchants }];
                    }
                });
            });
        };
        // ========== 商户 ==========
        /**
         * 商户列表。
         *
         * 历史上有两套查询写法：
         *   - admin-pc 早期视图传 `tab=all|active|pending|disabled|factory|store`（单一字段）
         *   - 新视图传 `status` + `type`（两个字段）
         *
         * 两套并存，所以这里都接，避免新前端切换页签筛不到。
         * `tab` 优先级低于显式 `status`/`type`，让外部可以叠加更细的过滤。
         */
        PlatformService_1.prototype.merchants = function (q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, where, tab, _b, list, total;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            where = {};
                            // 显式 status / type 优先
                            if (q.status && q.status !== 'all')
                                where.status = q.status;
                            if (q.type && q.type !== 'all')
                                where.type = q.type;
                            // tab 兼容：当外部没传 status/type 时由 tab 推导
                            if (q.tab && typeof q.tab === 'string') {
                                tab = q.tab;
                                if (tab === 'all') {
                                    // 不过滤
                                }
                                else if (tab === 'disabled') {
                                    if (!where.status)
                                        where.status = 'disabled';
                                }
                                else if (tab === 'pending') {
                                    if (!where.status)
                                        where.status = 'pending';
                                }
                                else if (tab === 'active') {
                                    if (!where.status)
                                        where.status = 'active';
                                }
                                else if (tab === 'rejected') {
                                    if (!where.status)
                                        where.status = 'rejected';
                                }
                                else if (tab === 'factory') {
                                    if (!where.type)
                                        where.type = 'factory';
                                }
                                else if (tab === 'store') {
                                    if (!where.type)
                                        where.type = 'store';
                                }
                            }
                            if (q.keyword)
                                where.OR = [{ name: { contains: q.keyword } }, { legalName: { contains: q.keyword } }];
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.merchant.findMany({ where: where, skip: skip, take: take, orderBy: { createdAt: 'desc' } }),
                                    this.prisma.merchant.count({ where: where }),
                                ])];
                        case 1:
                            _b = _c.sent(), list = _b[0], total = _b[1];
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list.map(decimal_util_1.decimalToNumber), total, page, pageSize)];
                    }
                });
            });
        };
        PlatformService_1.prototype.auditMerchants = function (q) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.merchants(__assign(__assign({}, q), { status: 'pending' }))];
                });
            });
        };
        /**
         * 审核通过商家入驻申请。
         *
         * 关键：必须同步把申请人 `User.role` 从 `customer` 升级为 `merchant`，
         * 并设 `User.merchantId`，否则申请人审核通过后用同一账号无法登录
         * merchant-app（RolesGuard 拒绝 customer 访问 /m/* 路由），形成入驻闭环断裂。
         */
        PlatformService_1.prototype.approveMerchant = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var merchant;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.merchant.findUnique({
                                where: { id: id },
                                select: { id: true, userId: true, type: true },
                            })];
                        case 1:
                            merchant = _a.sent();
                            if (!merchant)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '商家不存在');
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var targetRole;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, tx.merchant.update({ where: { id: id }, data: { status: 'active' } })];
                                            case 1:
                                                _a.sent();
                                                if (!merchant.userId) return [3 /*break*/, 3];
                                                targetRole = ['factory', 'store'].includes(merchant.type)
                                                    ? merchant.type
                                                    : 'merchant';
                                                return [4 /*yield*/, tx.user.update({
                                                        where: { id: merchant.userId },
                                                        data: { role: targetRole, merchantId: merchant.id },
                                                    })];
                                            case 2:
                                                _a.sent();
                                                _a.label = 3;
                                            case 3: return [4 /*yield*/, tx.auditRecord.create({ data: { type: 'merchant', targetId: id, status: 'approved' } })];
                                            case 4:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        PlatformService_1.prototype.rejectMerchant = function (id, reason) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.merchant.update({
                                where: { id: id },
                                data: { status: 'rejected', rejectReason: reason },
                            })];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.auditRecord.create({
                                    data: { type: 'merchant', targetId: id, status: 'rejected', reason: reason },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        PlatformService_1.prototype.pauseMerchant = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.merchant.update({ where: { id: id }, data: { status: 'disabled' } })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        PlatformService_1.prototype.resumeMerchant = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.merchant.update({ where: { id: id }, data: { status: 'active' } })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // ========== 订单 ==========
        PlatformService_1.prototype.orders = function (q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, where, _b, list, total;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            where = {};
                            if (q.status && q.status !== 'all')
                                where.status = q.status;
                            if (q.keyword)
                                where.no = { contains: q.keyword };
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.order.findMany({
                                        where: where,
                                        skip: skip,
                                        take: take,
                                        orderBy: { createdAt: 'desc' },
                                        include: { merchant: true, user: true },
                                    }),
                                    this.prisma.order.count({ where: where }),
                                ])];
                        case 1:
                            _b = _c.sent(), list = _b[0], total = _b[1];
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list.map(decimal_util_1.decimalToNumber), total, page, pageSize)];
                    }
                });
            });
        };
        // ========== 商品审核 ==========
        PlatformService_1.prototype.auditProducts = function (q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, status, where, _b, list, total, mapped;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            status = q.status || 'pending';
                            where = status === 'pending' ? { status: 'auditing' } : { status: status };
                            if (q.keyword)
                                where.name = { contains: q.keyword };
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.product.findMany({
                                        where: where,
                                        skip: skip,
                                        take: take,
                                        orderBy: { createdAt: 'desc' },
                                        include: { merchant: true },
                                    }),
                                    this.prisma.product.count({ where: where }),
                                ])
                                // 映射成 admin-pc AuditProduct 形状：
                                //   - status: 'auditing' → 'pending'（前端 tab key 是 'pending'，否则 filter 不到）
                                //   - 字段平铺：image / category / merchant / price / submittedAt
                            ];
                        case 1:
                            _b = _c.sent(), list = _b[0], total = _b[1];
                            mapped = list.map(function (p) {
                                var _a, _b, _c;
                                var d = (0, decimal_util_1.decimalToNumber)(p);
                                return {
                                    id: d.id,
                                    name: d.name,
                                    image: Array.isArray(d.images) && d.images[0] ? d.images[0] : '',
                                    category: d.categoryId || '',
                                    merchant: ((_a = p.merchant) === null || _a === void 0 ? void 0 : _a.name) || '',
                                    merchantId: d.merchantId,
                                    price: Number((_c = (_b = d.priceRetailMin) !== null && _b !== void 0 ? _b : d.priceWholesaleMin) !== null && _c !== void 0 ? _c : 0),
                                    submittedAt: (d.createdAt instanceof Date
                                        ? d.createdAt
                                        : new Date(d.createdAt)).toISOString(),
                                    status: d.status === 'auditing' ? 'pending' : d.status,
                                    rejectReason: d.rejectReason || undefined,
                                };
                            });
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(mapped, total, page, pageSize)];
                    }
                });
            });
        };
        /**
         * 商品审核配置（autoApprove 主开关 / conditions 命中条件 / samplingRate 抽检比例）
         *
         * Bug 修复：之前用 `v?.value || defaults` —— 一旦 stored 有任何值就完全覆盖默认，
         * 导致前端保存时只更新部分字段（如只改 samplingRate）后续读取就丢失 autoApprove。
         * 现改成 deep-merge：以 defaults 为底，stored 覆盖到键。
         */
        PlatformService_1.prototype.getAuditConfig = function () {
            return __awaiter(this, void 0, void 0, function () {
                var v, defaults, stored;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.systemConfig.findUnique({ where: { key: 'audit_product_config' } })];
                        case 1:
                            v = _a.sent();
                            defaults = {
                                autoApprove: false,
                                conditions: [
                                    { key: 'vip', label: 'VIP 商家', enabled: true },
                                    { key: 'credit', label: '信用 A/B', enabled: true },
                                    { key: 'rejectRate', label: '驳回率 < 5%', enabled: true },
                                    { key: 'category', label: '常见品类', enabled: false },
                                ],
                                samplingRate: 10,
                            };
                            stored = (v === null || v === void 0 ? void 0 : v.value) || {};
                            return [2 /*return*/, {
                                    autoApprove: typeof stored.autoApprove === 'boolean' ? stored.autoApprove : defaults.autoApprove,
                                    conditions: Array.isArray(stored.conditions) && stored.conditions.length > 0
                                        ? stored.conditions
                                        : defaults.conditions,
                                    samplingRate: typeof stored.samplingRate === 'number' ? stored.samplingRate : defaults.samplingRate,
                                }];
                    }
                });
            });
        };
        PlatformService_1.prototype.saveAuditConfig = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.systemConfig.upsert({
                                where: { key: 'audit_product_config' },
                                update: { value: dto },
                                create: { key: 'audit_product_config', value: dto },
                            })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        PlatformService_1.prototype.approveProduct = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.product.update({ where: { id: id }, data: { status: 'active' } })];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.auditRecord.create({
                                    data: { type: 'product', targetId: id, status: 'approved' },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        PlatformService_1.prototype.rejectProduct = function (id, reason) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.product.update({
                                where: { id: id },
                                data: { status: 'rejected', rejectReason: reason },
                            })];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.auditRecord.create({
                                    data: { type: 'product', targetId: id, status: 'rejected', reason: reason },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        PlatformService_1.prototype.sanitizeAdSlotDto = function (dto) {
            if (!dto || typeof dto !== 'object')
                return {};
            var out = {};
            for (var _i = 0, _a = this.AD_SLOT_FIELDS; _i < _a.length; _i++) {
                var k = _a[_i];
                if (dto[k] === undefined || dto[k] === null)
                    continue;
                if (k === 'startAt' || k === 'endAt') {
                    var d = new Date(dto[k]);
                    if (Number.isFinite(d.getTime()))
                        out[k] = d;
                }
                else {
                    out[k] = dto[k];
                }
            }
            return out;
        };
        PlatformService_1.prototype.adSlots = function () {
            return __awaiter(this, void 0, void 0, function () {
                var list, meta, cfg, business, _a;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.prisma.adSlot.findMany({ orderBy: { sort: 'asc' } })
                            // 兼容旧数据：若主表 preview/startAt/endAt 为空但 SystemConfig 仍有兜底 meta，
                            // 读时合并展示（不写回，避免每次读触发副作用）；运维迁移完成后此分支自然为空。
                        ];
                        case 1:
                            list = _c.sent();
                            meta = {};
                            _c.label = 2;
                        case 2:
                            _c.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.prisma.systemConfig.findUnique({ where: { key: 'system_settings' } })];
                        case 3:
                            cfg = _c.sent();
                            business = (_b = cfg === null || cfg === void 0 ? void 0 : cfg.value) === null || _b === void 0 ? void 0 : _b.business;
                            if (business && business.adSlotMeta && typeof business.adSlotMeta === 'object') {
                                meta = business.adSlotMeta;
                            }
                            return [3 /*break*/, 5];
                        case 4:
                            _a = _c.sent();
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/, list.map(function (s) {
                                var m = meta[s.id] || {};
                                return (0, decimal_util_1.decimalToNumber)(__assign(__assign({}, s), { preview: s.preview || m.preview || null, startAt: s.startAt || (m.startAt ? new Date(m.startAt) : null), endAt: s.endAt || (m.endAt ? new Date(m.endAt) : null) }));
                            })];
                    }
                });
            });
        };
        PlatformService_1.prototype.createAdSlot = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var data, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            data = this.sanitizeAdSlotDto(dto);
                            if (!data.code) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '广告位 code 必填');
                            }
                            if (!data.name) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '广告位 name 必填');
                            }
                            _a = decimal_util_1.decimalToNumber;
                            return [4 /*yield*/, this.prisma.adSlot.create({ data: data })];
                        case 1: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        PlatformService_1.prototype.updateAdSlot = function (id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var data, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            data = this.sanitizeAdSlotDto(dto);
                            if (Object.keys(data).length === 0) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '没有可更新的字段');
                            }
                            _a = decimal_util_1.decimalToNumber;
                            return [4 /*yield*/, this.prisma.adSlot.update({ where: { id: id }, data: data })];
                        case 1: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        PlatformService_1.prototype.deleteAdSlot = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.adSlot.delete({ where: { id: id } })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        PlatformService_1.prototype.adCreatives = function (q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, where, _b, list, total;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            where = {};
                            if (q.slotId)
                                where.slotId = q.slotId;
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.adCreative.findMany({ where: where, skip: skip, take: take, orderBy: { createdAt: 'desc' } }),
                                    this.prisma.adCreative.count({ where: where }),
                                ])];
                        case 1:
                            _b = _c.sent(), list = _b[0], total = _b[1];
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list.map(decimal_util_1.decimalToNumber), total, page, pageSize)];
                    }
                });
            });
        };
        PlatformService_1.prototype.createAdCreative = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = decimal_util_1.decimalToNumber;
                            return [4 /*yield*/, this.prisma.adCreative.create({ data: dto })];
                        case 1: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        PlatformService_1.prototype.updateAdCreative = function (id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = decimal_util_1.decimalToNumber;
                            return [4 /*yield*/, this.prisma.adCreative.update({ where: { id: id }, data: dto })];
                        case 1: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        PlatformService_1.prototype.deleteAdCreative = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.adCreative.delete({ where: { id: id } })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        /**
         * 广告创意审核通过（pending → active）
         *
         * 复用 approveProduct 套路：
         *   1. 校验存在 + 当前状态确实是 pending（防误把 paused/ended 再批一遍）
         *   2. 写 AdCreative.status='active'
         *   3. 写 AuditRecord(type='ad', targetId=creativeId, status='approved')
         *
         * 注：AuditRecord.type 此前枚举只列了 merchant/product，这里扩展 'ad'。
         * 前端 audit-records 表格按 type 透传过滤，新 type 不会破坏旧筛选。
         */
        PlatformService_1.prototype.approveAdCreative = function (id, callerSub) {
            return __awaiter(this, void 0, void 0, function () {
                var c;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.adCreative.findUnique({
                                where: { id: id },
                                select: { id: true, status: true },
                            })];
                        case 1:
                            c = _a.sent();
                            if (!c)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '广告创意不存在');
                            if (c.status !== 'pending') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, "\u5F53\u524D\u72B6\u6001 ".concat(c.status, " \u4E0D\u53EF\u5BA1\u6838\u901A\u8FC7"));
                            }
                            return [4 /*yield*/, this.prisma.$transaction([
                                    this.prisma.adCreative.update({ where: { id: id }, data: { status: 'active' } }),
                                    this.prisma.auditRecord.create({
                                        data: {
                                            type: 'ad',
                                            targetId: id,
                                            status: 'approved',
                                            auditorId: callerSub || null,
                                            reviewedAt: new Date(),
                                        },
                                    }),
                                ])];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        /**
         * 广告创意审核驳回（pending → rejected）
         *
         * reason 必填，原因写进 AuditRecord.reason 供运营回溯。
         * 与 approveAdCreative 保持同一审核入口语义，前端 platform-app 已经在调
         * `POST /p/ads/creatives/:id/reject` 接口（带 silent 降级），落地后立即生效。
         */
        PlatformService_1.prototype.rejectAdCreative = function (id, reason, callerSub) {
            return __awaiter(this, void 0, void 0, function () {
                var c;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!reason || !String(reason).trim()) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请填写驳回原因');
                            }
                            return [4 /*yield*/, this.prisma.adCreative.findUnique({
                                    where: { id: id },
                                    select: { id: true, status: true },
                                })];
                        case 1:
                            c = _a.sent();
                            if (!c)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '广告创意不存在');
                            if (c.status !== 'pending') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, "\u5F53\u524D\u72B6\u6001 ".concat(c.status, " \u4E0D\u53EF\u9A73\u56DE"));
                            }
                            return [4 /*yield*/, this.prisma.$transaction([
                                    this.prisma.adCreative.update({ where: { id: id }, data: { status: 'rejected' } }),
                                    this.prisma.auditRecord.create({
                                        data: {
                                            type: 'ad',
                                            targetId: id,
                                            status: 'rejected',
                                            reason: String(reason).trim(),
                                            auditorId: callerSub || null,
                                            reviewedAt: new Date(),
                                        },
                                    }),
                                ])];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // ========== 选品广场推送 ==========
        PlatformService_1.prototype.plazaPushes = function (q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, where, _b, list, total;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            where = {};
                            if (q.status)
                                where.status = q.status;
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.plazaPush.findMany({ where: where, skip: skip, take: take, orderBy: { createdAt: 'desc' } }),
                                    this.prisma.plazaPush.count({ where: where }),
                                ])];
                        case 1:
                            _b = _c.sent(), list = _b[0], total = _b[1];
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list, total, page, pageSize)];
                    }
                });
            });
        };
        PlatformService_1.prototype.createPlazaPush = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.plazaPush.create({
                            data: __assign(__assign({}, dto), { scheduledStart: new Date(dto.scheduledStart || Date.now()), scheduledEnd: new Date(dto.scheduledEnd || Date.now() + 7 * 86400000) }),
                        })];
                });
            });
        };
        PlatformService_1.prototype.plazaProductsAll = function (q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, _b, list, total;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.product.findMany({
                                        where: { status: 'active' },
                                        skip: skip,
                                        take: take,
                                        include: { merchant: true },
                                    }),
                                    this.prisma.product.count({ where: { status: 'active' } }),
                                ])];
                        case 1:
                            _b = _c.sent(), list = _b[0], total = _b[1];
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list.map(decimal_util_1.decimalToNumber), total, page, pageSize)];
                    }
                });
            });
        };
        PlatformService_1.prototype.plazaFactoriesAll = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.merchant.findMany({
                            where: { type: 'factory', status: 'active' },
                            take: 200,
                        })];
                });
            });
        };
        PlatformService_1.prototype.plazaRecords = function (q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, _b, list, total;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.agencyApplication.findMany({
                                        skip: skip,
                                        take: take,
                                        orderBy: { createdAt: 'desc' },
                                        include: { merchant: true },
                                    }),
                                    this.prisma.agencyApplication.count(),
                                ])];
                        case 1:
                            _b = _c.sent(), list = _b[0], total = _b[1];
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list, total, page, pageSize)];
                    }
                });
            });
        };
        // ========== 会员套餐 ==========
        /**
         * 新商家通用试用天数(0=关闭试用),持久化到 SystemConfig key=member:trialDays。
         * 平台后台 + platform-app 都通过这两个接口读写,所以"试用期"是真实的全局配置。
         */
        PlatformService_1.prototype.getMemberTrialDays = function () {
            return __awaiter(this, void 0, void 0, function () {
                var v, raw, days;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.systemConfig.findUnique({ where: { key: 'member:trialDays' } })];
                        case 1:
                            v = _b.sent();
                            raw = v === null || v === void 0 ? void 0 : v.value;
                            days = typeof raw === 'number' ? raw : Number((_a = raw === null || raw === void 0 ? void 0 : raw.days) !== null && _a !== void 0 ? _a : 30);
                            return [2 /*return*/, { days: Number.isFinite(days) ? days : 30 }];
                    }
                });
            });
        };
        PlatformService_1.prototype.setMemberTrialDays = function (days) {
            return __awaiter(this, void 0, void 0, function () {
                var clean;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            clean = Math.max(0, Math.min(365, Math.floor(Number(days) || 0)));
                            return [4 /*yield*/, this.prisma.systemConfig.upsert({
                                    where: { key: 'member:trialDays' },
                                    update: { value: clean },
                                    create: { key: 'member:trialDays', value: clean },
                                })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { ok: true, days: clean }];
                    }
                });
            });
        };
        PlatformService_1.prototype.memberPlans = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = decimal_util_1.decimalToNumber;
                            return [4 /*yield*/, this.prisma.memberPlan.findMany({ orderBy: { sort: 'asc' } })];
                        case 1: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
                    }
                });
            });
        };
        PlatformService_1.prototype.saveMemberPlan = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var normalize, data, existing, enabling, nameEn, rightsEn, id, updateData, _a, _b;
                var _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            normalize = function (value) {
                                return Array.isArray(value)
                                    ? value
                                        .filter(function (item) { return typeof item === 'string'; })
                                        .map(function (item) { return item.trim(); })
                                        .filter(Boolean)
                                    : [];
                            };
                            data = __assign(__assign({}, dto), { nameEn: typeof dto.nameEn === 'string' ? dto.nameEn.trim() || null : dto.nameEn, rightsEn: dto.rightsEn === undefined ? undefined : normalize(dto.rightsEn) });
                            if (!dto.id) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.memberPlan.findUnique({ where: { id: dto.id } })];
                        case 1:
                            existing = _f.sent();
                            if (!existing)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '会员套餐不存在');
                            enabling = existing.status !== 'active' && data.status === 'active';
                            if (enabling) {
                                nameEn = String((_d = (_c = data.nameEn) !== null && _c !== void 0 ? _c : existing.nameEn) !== null && _d !== void 0 ? _d : '').trim();
                                rightsEn = data.rightsEn === undefined ? normalize(existing.rightsEn) : data.rightsEn;
                                if (!nameEn || rightsEn.length === 0) {
                                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '启用套餐前必须填写英文名称和英文权益');
                                }
                            }
                            id = data.id, updateData = __rest(data, ["id"]);
                            _a = decimal_util_1.decimalToNumber;
                            return [4 /*yield*/, this.prisma.memberPlan.update({ where: { id: id }, data: updateData })];
                        case 2: return [2 /*return*/, _a.apply(void 0, [_f.sent()])];
                        case 3:
                            if (((_e = data.status) !== null && _e !== void 0 ? _e : 'active') === 'active' &&
                                (!String(data.nameEn || '').trim() || normalize(data.rightsEn).length === 0)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '新建启用套餐必须填写英文名称和英文权益');
                            }
                            _b = decimal_util_1.decimalToNumber;
                            return [4 /*yield*/, this.prisma.memberPlan.create({
                                    data: __assign(__assign({}, data), { code: data.code || "plan_".concat(Date.now()) }),
                                })];
                        case 4: return [2 /*return*/, _b.apply(void 0, [_f.sent()])];
                    }
                });
            });
        };
        PlatformService_1.prototype.deleteMemberPlan = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.memberPlan.delete({ where: { id: id } })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        /**
         * 套餐订阅商家列表;扁平化 merchant.name/plan.* 并计算 totalDays/subscribedAt,
         * 给 admin-pc 平台后台「订阅商家」表格直接消费。
         */
        PlatformService_1.prototype.planSubscriptions = function (planId) {
            return __awaiter(this, void 0, void 0, function () {
                var list;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.merchantMembership.findMany({
                                where: { planId: planId },
                                include: { merchant: true, plan: true },
                                orderBy: { createdAt: 'desc' },
                            })];
                        case 1:
                            list = _a.sent();
                            return [2 /*return*/, list.map(function (m) {
                                    var _a, _b, _c, _d, _e, _f;
                                    var totalDays = Math.max(1, Math.ceil((m.endAt.getTime() - m.startAt.getTime()) / 86400000));
                                    return (0, decimal_util_1.decimalToNumber)(__assign(__assign({}, m), { merchantName: (_b = (_a = m.merchant) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : '', planName: (_d = (_c = m.plan) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : '', planType: (_f = (_e = m.plan) === null || _e === void 0 ? void 0 : _e.type) !== null && _f !== void 0 ? _f : '', price: m.plan ? Number(m.plan.price) : 0, totalDays: totalDays, subscribedAt: m.createdAt }));
                                })];
                    }
                });
            });
        };
        // ========== 会员缴费订单 ==========
        /**
         * 缴费订单分页列表;flatten merchant.name 并加 payMethod 别名,
         * 让 admin-pc 视图直接 row.merchantName / row.payMethod 可用。
         */
        PlatformService_1.prototype.memberPayOrders = function (q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, where, _b, list, total, mapped;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            where = {};
                            if (q.status)
                                where.status = q.status;
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.paymentRecord.findMany({
                                        where: where,
                                        skip: skip,
                                        take: take,
                                        orderBy: { createdAt: 'desc' },
                                        include: { merchant: true },
                                    }),
                                    this.prisma.paymentRecord.count({ where: where }),
                                ])];
                        case 1:
                            _b = _c.sent(), list = _b[0], total = _b[1];
                            mapped = list.map(function (r) {
                                var _a, _b;
                                return (0, decimal_util_1.decimalToNumber)(__assign(__assign({}, r), { merchantName: (_b = (_a = r.merchant) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : '', payMethod: r.paymentMethod }));
                            });
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(mapped, total, page, pageSize)];
                    }
                });
            });
        };
        /**
         * 平台手动改 PaymentRecord 状态（人工补登记 / 修正异常订单）。
         *
         * 关键业务联动：当人工把缴费订单标成 `paid` 时，必须同步触发会员激活
         * （否则会出现"订单已付但 MerchantMembership 没建/没续期"的数据脱节）。
         *
         * activateMembership 自带幂等：
         *   - record.status 已是 paid → 直接返回 alreadyPaid，不会重复扣账
         *   - planId 已被删除 → 抛 BUSINESS_ERROR，由平台日志承接
         */
        PlatformService_1.prototype.updatePayStatus = function (id, status) {
            return __awaiter(this, void 0, void 0, function () {
                var before, e_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.paymentRecord.findUnique({
                                where: { id: id },
                                select: { id: true, status: true, planId: true },
                            })];
                        case 1:
                            before = _a.sent();
                            if (!before)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '缴费记录不存在');
                            if (!(status === 'paid' && before.status !== 'paid' && before.planId)) return [3 /*break*/, 5];
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.merchantService.activateMembership(id)];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, { ok: true, activated: true }];
                        case 4:
                            e_1 = _a.sent();
                            // 激活失败（如套餐已删除等）→ 写日志后降级为普通改状态，
                            // 避免人工补登记被卡死；后续可由运维手工修数据。
                            this.logger.error("[platform.updatePayStatus] activateMembership \u5931\u8D25 recordId=".concat(id, " err=").concat((e_1 === null || e_1 === void 0 ? void 0 : e_1.message) || e_1));
                            return [3 /*break*/, 5];
                        case 5: return [4 /*yield*/, this.prisma.paymentRecord.update({ where: { id: id }, data: { status: status } })];
                        case 6:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        PlatformService_1.prototype.approveRefund = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var record, amount, refundResp, e_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.paymentRecord.findUnique({ where: { id: id } })];
                        case 1:
                            record = _a.sent();
                            if (!record)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '缴费订单不存在');
                            if (record.status !== 'paid' && record.status !== 'refunding') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, "\u5F53\u524D\u72B6\u6001 ".concat(record.status, " \u4E0D\u53EF\u9000\u6B3E"));
                            }
                            amount = Number(record.amount);
                            if (!(amount > 0))
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '退款金额必须大于 0');
                            if (!(record.paymentMethod === 'wechat')) return [3 /*break*/, 7];
                            refundResp = void 0;
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.wxpay.createRefund({
                                    outTradeNo: record.no, // 缴费下单时 PaymentRecord.no 即微信 out_trade_no
                                    outRefundNo: "".concat(record.no, "-R"),
                                    reason: '会员缴费退款',
                                    refundAmount: amount,
                                    totalAmount: amount,
                                })];
                        case 3:
                            refundResp = _a.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            e_2 = _a.sent();
                            throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, "\u5FAE\u4FE1\u9000\u6B3E\u5931\u8D25\uFF1A".concat((e_2 === null || e_2 === void 0 ? void 0 : e_2.message) || e_2));
                        case 5: return [4 /*yield*/, this.prisma.paymentRecord.update({
                                where: { id: id },
                                data: { status: 'refunded', refundReason: "wxRefundId=".concat(refundResp.refundId) },
                            })];
                        case 6:
                            _a.sent();
                            return [2 /*return*/, { ok: true, wxRefundId: refundResp.refundId }];
                        case 7: 
                        // 非微信渠道（线下/余额等）暂无自动退款通道，需平台线下退款；这里仅置状态并标注，
                        // 避免像之前那样在任何渠道都谎报"已退款"。
                        return [4 /*yield*/, this.prisma.paymentRecord.update({
                                where: { id: id },
                                data: { status: 'refunded', refundReason: "".concat(record.paymentMethod, " \u7EBF\u4E0B\u9000\u6B3E") },
                            })];
                        case 8:
                            // 非微信渠道（线下/余额等）暂无自动退款通道，需平台线下退款；这里仅置状态并标注，
                            // 避免像之前那样在任何渠道都谎报"已退款"。
                            _a.sent();
                            return [2 /*return*/, { ok: true, offline: true }];
                    }
                });
            });
        };
        PlatformService_1.prototype.rejectRefund = function (id, reason) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.paymentRecord.update({
                                where: { id: id },
                                data: { status: 'paid', refundReason: reason },
                            })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // ========== 功能开关 ==========
        PlatformService_1.prototype.featureFlags = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: 
                        // 首次访问时确保几条"默认规则"存在，避免管理员每次都要手动配置
                        return [4 /*yield*/, this.ensureDefaultFlags()];
                        case 1:
                            // 首次访问时确保几条"默认规则"存在，避免管理员每次都要手动配置
                            _a.sent();
                            return [2 /*return*/, this.prisma.featureFlag.findMany({ orderBy: [{ group: 'asc' }, { sort: 'asc' }] })];
                    }
                });
            });
        };
        /** 平台首次启动 / 首次进入 feature-flag 页时，写入用户期望的默认规则 */
        PlatformService_1.prototype.ensureDefaultFlags = function () {
            return __awaiter(this, void 0, void 0, function () {
                var DEFAULTS, _i, DEFAULTS_1, d;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            DEFAULTS = [
                                // 用户明确要求：门店端默认不显示「门店」入口
                                {
                                    key: 'home.entry.store',
                                    label: '门店入口（仅厂家）',
                                    group: 'home_entry',
                                    defaultEnabled: false,
                                    audience: 'store',
                                    sort: 10,
                                },
                                // 用户明确要求：门店端默认不显示「上传到选品广场」按钮
                                {
                                    key: 'role.button.uploadToPlaza',
                                    label: '上传到选品广场',
                                    group: 'role_button',
                                    defaultEnabled: false,
                                    audience: 'store',
                                    sort: 10,
                                },
                            ];
                            _i = 0, DEFAULTS_1 = DEFAULTS;
                            _c.label = 1;
                        case 1:
                            if (!(_i < DEFAULTS_1.length)) return [3 /*break*/, 4];
                            d = DEFAULTS_1[_i];
                            return [4 /*yield*/, this.prisma.featureFlag.upsert({
                                    where: { key: d.key },
                                    update: {}, // 已存在则不覆盖（保留管理员之前的调整）
                                    create: {
                                        key: d.key,
                                        label: d.label,
                                        group: d.group,
                                        defaultEnabled: d.defaultEnabled,
                                        audience: (_a = d.audience) !== null && _a !== void 0 ? _a : 'all',
                                        sort: (_b = d.sort) !== null && _b !== void 0 ? _b : 100,
                                        specificMerchantIds: [],
                                        grayPercent: 100,
                                        grayWhitelist: [],
                                    },
                                })];
                        case 2:
                            _c.sent();
                            _c.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        PlatformService_1.prototype.toggleFeatureFlag = function (id, enabled) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.featureFlag.update({ where: { id: id }, data: { defaultEnabled: enabled } })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        /** 新增功能开关（平台增减默认规则） */
        PlatformService_1.prototype.createFeatureFlag = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    if (!(dto === null || dto === void 0 ? void 0 : dto.key) || !(dto === null || dto === void 0 ? void 0 : dto.label)) {
                        throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, 'key 与 label 不能为空');
                    }
                    return [2 /*return*/, this.prisma.featureFlag.create({
                            data: {
                                key: dto.key,
                                label: dto.label,
                                group: dto.group || 'home_entry',
                                defaultEnabled: (_a = dto.defaultEnabled) !== null && _a !== void 0 ? _a : true,
                                audience: dto.audience || 'all',
                                specificMerchantIds: [],
                                grayPercent: 100,
                                grayWhitelist: [],
                            },
                        })];
                });
            });
        };
        PlatformService_1.prototype.deleteFeatureFlag = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.featureFlag.delete({ where: { id: id } })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        PlatformService_1.prototype.featureFlagGray = function () {
            return __awaiter(this, void 0, void 0, function () {
                var flags;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.featureFlag.findMany()];
                        case 1:
                            flags = _a.sent();
                            return [2 /*return*/, flags.map(function (f) { return ({
                                    key: f.key,
                                    label: f.label,
                                    grayPercent: f.grayPercent,
                                    grayWhitelist: f.grayWhitelist,
                                    audience: f.audience,
                                    scheduledAt: f.scheduledAt,
                                }); })];
                    }
                });
            });
        };
        PlatformService_1.prototype.setFeatureFlagGray = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.featureFlag.update({
                                where: { key: dto.key },
                                data: {
                                    grayPercent: (_a = dto.grayPercent) !== null && _a !== void 0 ? _a : 100,
                                    grayWhitelist: dto.grayWhitelist || [],
                                    audience: dto.audience,
                                    scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
                                },
                            })];
                        case 1:
                            _b.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        PlatformService_1.prototype.resetFeatureFlags = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.featureFlag.updateMany({ data: { grayPercent: 100, grayWhitelist: [] } })];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.merchantFeatureOverride.deleteMany({})];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // ========== 管理员 / 角色 ==========
        /**
         * 平台管理员分页列表
         *
         * 支持：page / pageSize / keyword（在 username / nickname / email 中模糊匹配）
         * 返回 buildPage 形式 { list, total, page, pageSize, hasMore }，
         * 让 admin-pc 的 PaginatedResponse<UserItem> 类型可以直接消费。
         */
        PlatformService_1.prototype.admins = function () {
            return __awaiter(this, arguments, void 0, function (query) {
                var _a, skip, take, page, pageSize, where, keyword, _b, rows, total, list;
                if (query === void 0) { query = {}; }
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(query), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            where = { role: { in: ['admin', 'platform', 'super-admin'] } };
                            keyword = String((query === null || query === void 0 ? void 0 : query.keyword) || '').trim();
                            if (keyword) {
                                where.OR = [
                                    { username: { contains: keyword, mode: 'insensitive' } },
                                    { nickname: { contains: keyword, mode: 'insensitive' } },
                                    { email: { contains: keyword, mode: 'insensitive' } },
                                ];
                            }
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.user.findMany({
                                        where: where,
                                        skip: skip,
                                        take: take,
                                        include: { adminRole: true },
                                        orderBy: { createdAt: 'desc' },
                                    }),
                                    this.prisma.user.count({ where: where }),
                                ])];
                        case 1:
                            _b = _c.sent(), rows = _b[0], total = _b[1];
                            list = rows.map(function (u) {
                                var _a;
                                return ({
                                    id: u.id,
                                    username: u.username,
                                    nickname: u.nickname,
                                    avatar: u.avatar,
                                    email: u.email,
                                    role: u.role,
                                    roleName: (_a = u.adminRole) === null || _a === void 0 ? void 0 : _a.name,
                                    status: u.status,
                                    lastLoginAt: u.lastLoginAt,
                                });
                            });
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list, total, page, pageSize)];
                    }
                });
            });
        };
        /**
         * 创建平台管理员账号。
         *
         * 安全要求（防纵向提权）：
         *   - 任何非 super-admin 调用者，role 只能落到 'admin' / 'platform'
         *   - 仅 super-admin 才能创建 super-admin
         *   - 未声明 role 默认 'platform'（最小权限）
         */
        PlatformService_1.prototype.createAdmin = function (dto, callerRole) {
            return __awaiter(this, void 0, void 0, function () {
                var rawPassword, ALLOWED_NORMAL_ROLES, role, hash, u;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            rawPassword = typeof dto.password === 'string' ? dto.password.trim() : '';
                            if (!rawPassword) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '必须设置初始密码');
                            }
                            if (rawPassword.length < 8) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '密码至少 8 位');
                            }
                            if (!dto.username || !String(dto.username).trim()) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '必须设置账号');
                            }
                            ALLOWED_NORMAL_ROLES = ['admin', 'platform'];
                            role = dto.role || 'platform';
                            if (role === 'super-admin' && callerRole !== 'super-admin') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '仅 super-admin 可创建 super-admin');
                            }
                            if (!ALLOWED_NORMAL_ROLES.includes(role) && role !== 'super-admin') {
                                role = 'platform';
                            }
                            return [4 /*yield*/, argon2.hash(rawPassword)];
                        case 1:
                            hash = _a.sent();
                            return [4 /*yield*/, this.prisma.user.create({
                                    data: {
                                        username: dto.username,
                                        email: dto.email,
                                        nickname: dto.nickname || dto.username,
                                        passwordHash: hash,
                                        role: role,
                                        adminRoleId: dto.roleId,
                                        avatar: dto.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=".concat(dto.username),
                                    },
                                })];
                        case 2:
                            u = _a.sent();
                            return [2 /*return*/, { id: u.id, username: u.username }];
                    }
                });
            });
        };
        /**
         * 更新管理员账号 —— 字段白名单 + 越权防御
         *
         * 历史风险：之前是 `data: { ...dto }` 宽松 spread，
         * 任何人都能通过 dto 注入 `passwordHash` / `id` / `merchantId` /
         * `adminRoleId` / `createdAt` 等敏感字段达成提权或绕过密码哈希。
         *
         * 现在：
         *   - controller 用 UpdateAdminDto + class-validator 白名单（入口防御）
         *   - service 用 ADMIN_UPDATABLE_FIELDS 二次过滤（出口防御）
         *   - 密码、roleId、merchantId 等敏感字段一律禁止通过本接口修改
         */
        PlatformService_1.prototype.updateAdmin = function (id, dto, callerRole, callerSub) {
            return __awaiter(this, void 0, void 0, function () {
                var allowed, _i, ADMIN_UPDATABLE_FIELDS_1, k;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            allowed = {};
                            for (_i = 0, ADMIN_UPDATABLE_FIELDS_1 = ADMIN_UPDATABLE_FIELDS; _i < ADMIN_UPDATABLE_FIELDS_1.length; _i++) {
                                k = ADMIN_UPDATABLE_FIELDS_1[_i];
                                if (dto[k] !== undefined) {
                                    allowed[k] = dto[k];
                                }
                            }
                            if (allowed.role !== undefined) {
                                if (allowed.role === 'super-admin' && callerRole !== 'super-admin') {
                                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '仅 super-admin 可指派 super-admin 角色');
                                }
                                if (id === callerSub && allowed.role !== callerRole) {
                                    throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '不允许修改自己的角色');
                                }
                            }
                            if (id === callerSub && allowed.status === 'disabled') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '不允许禁用自己');
                            }
                            if (Object.keys(allowed).length === 0) {
                                return [2 /*return*/, { ok: true, updated: false }];
                            }
                            return [4 /*yield*/, this.prisma.user.update({ where: { id: id }, data: allowed })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { ok: true, updated: true }];
                    }
                });
            });
        };
        PlatformService_1.prototype.deleteAdmin = function (id, callerSub, callerRole) {
            return __awaiter(this, void 0, void 0, function () {
                var target;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (id === callerSub)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '不允许删除自己的账号');
                            return [4 /*yield*/, this.prisma.user.findUnique({ where: { id: id } })];
                        case 1:
                            target = _a.sent();
                            if (!target)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '账号不存在');
                            // 仅 super-admin 可删除 super-admin，防止普通管理员纵向越权删除超管
                            if (target.role === 'super-admin' && callerRole !== 'super-admin') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '仅 super-admin 可删除 super-admin');
                            }
                            return [4 /*yield*/, this.prisma.user.delete({ where: { id: id } })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        PlatformService_1.prototype.toggleAdmin = function (id, callerSub, callerRole) {
            return __awaiter(this, void 0, void 0, function () {
                var u;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (id === callerSub)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '不允许禁用自己的账号');
                            return [4 /*yield*/, this.prisma.user.findUnique({ where: { id: id } })];
                        case 1:
                            u = _a.sent();
                            if (!u)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '账号不存在');
                            // 仅 super-admin 可启用/禁用 super-admin
                            if (u.role === 'super-admin' && callerRole !== 'super-admin') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '仅 super-admin 可操作 super-admin');
                            }
                            return [4 /*yield*/, this.prisma.user.update({
                                    where: { id: id },
                                    data: { status: u.status === 'active' ? 'disabled' : 'active' },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        /**
         * 平台后台角色分页列表
         *
         * 支持：page / pageSize / keyword（在 name / code 中模糊匹配）
         * 返回 buildPage 形式 { list, total, page, pageSize, hasMore }，
         * 与 admins 接口对齐，admin-pc 的 PaginatedResponse 类型统一消费。
         */
        PlatformService_1.prototype.roles = function () {
            return __awaiter(this, arguments, void 0, function (query) {
                var _a, skip, take, page, pageSize, where, keyword, _b, list, total;
                if (query === void 0) { query = {}; }
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(query), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            where = {};
                            keyword = String((query === null || query === void 0 ? void 0 : query.keyword) || '').trim();
                            if (keyword) {
                                where.OR = [
                                    { name: { contains: keyword, mode: 'insensitive' } },
                                    { code: { contains: keyword, mode: 'insensitive' } },
                                ];
                            }
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.adminRole.findMany({
                                        where: where,
                                        skip: skip,
                                        take: take,
                                        orderBy: { createdAt: 'asc' },
                                    }),
                                    this.prisma.adminRole.count({ where: where }),
                                ])];
                        case 1:
                            _b = _c.sent(), list = _b[0], total = _b[1];
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list, total, page, pageSize)];
                    }
                });
            });
        };
        PlatformService_1.prototype.saveRole = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var id, data;
                return __generator(this, function (_a) {
                    if (dto.id) {
                        id = dto.id, data = __rest(dto, ["id"]);
                        return [2 /*return*/, this.prisma.adminRole.update({ where: { id: id }, data: data })];
                    }
                    return [2 /*return*/, this.prisma.adminRole.create({
                            data: __assign(__assign({}, dto), { code: dto.code || "role_".concat(Date.now()) }),
                        })];
                });
            });
        };
        PlatformService_1.prototype.updateRole = function (id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.adminRole.update({ where: { id: id }, data: dto })];
                });
            });
        };
        PlatformService_1.prototype.deleteRole = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.adminRole.delete({ where: { id: id } })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // ========== 审核记录 ==========
        /**
         * 审核日志分页查询（平台后台 / 商家申诉调阅用）
         *
         * AuditRecord 之前只在 approveMerchant/rejectMerchant/approveProduct/rejectProduct
         * 等方法里 create，但从来没有读接口暴露，导致平台无法回溯"谁在什么时候批/驳的"。
         *
         * 支持过滤：
         *   - type: 'merchant' | 'product'
         *   - status: 'pending' | 'approved' | 'rejected' | 'auto_approved' | 'sample_check'
         *   - targetId: 精确匹配某一被审核对象
         *   - page / pageSize 分页（默认 1 / 20）
         *
         * 返回：
         *   - 在 record 上挂 `auditor: { id, username, nickname }` 摘要（auditorId 不为空时）
         *   - 标准 buildPage 形式 { list, total, page, pageSize, hasMore }
         */
        PlatformService_1.prototype.auditRecords = function () {
            return __awaiter(this, arguments, void 0, function (query) {
                var _a, skip, take, page, pageSize, where, _b, rows, total, actorIds, actorMap, actors, _i, actors_1, a, list;
                if (query === void 0) { query = {}; }
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(query), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            where = {};
                            if ((query === null || query === void 0 ? void 0 : query.type) && ['merchant', 'product', 'ad', 'refund'].includes(query.type)) {
                                where.type = query.type;
                            }
                            if (query === null || query === void 0 ? void 0 : query.status)
                                where.status = query.status;
                            if (query === null || query === void 0 ? void 0 : query.targetId)
                                where.targetId = query.targetId;
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.auditRecord.findMany({
                                        where: where,
                                        skip: skip,
                                        take: take,
                                        orderBy: { createdAt: 'desc' },
                                    }),
                                    this.prisma.auditRecord.count({ where: where }),
                                ])
                                // 批量取 actor 摘要：AuditRecord 没有 relation，手动 IN 查 User 拼接
                            ];
                        case 1:
                            _b = _c.sent(), rows = _b[0], total = _b[1];
                            actorIds = Array.from(new Set(rows.map(function (r) { return r.auditorId; }).filter(function (id) { return !!id; })));
                            actorMap = new Map();
                            if (!actorIds.length) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.user.findMany({
                                    where: { id: { in: actorIds } },
                                    select: { id: true, username: true, nickname: true },
                                })];
                        case 2:
                            actors = _c.sent();
                            for (_i = 0, actors_1 = actors; _i < actors_1.length; _i++) {
                                a = actors_1[_i];
                                actorMap.set(a.id, a);
                            }
                            _c.label = 3;
                        case 3:
                            list = rows.map(function (r) { return ({
                                id: r.id,
                                type: r.type,
                                targetId: r.targetId,
                                status: r.status,
                                reason: r.reason,
                                autoApproved: r.autoApproved,
                                sampleChecked: r.sampleChecked,
                                reviewedAt: r.reviewedAt,
                                createdAt: r.createdAt,
                                auditor: r.auditorId ? actorMap.get(r.auditorId) || null : null,
                            }); });
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list, total, page, pageSize)];
                    }
                });
            });
        };
        // ========== 提现审核（平台层） ==========
        /**
         * 平台审核提现申请的分页列表
         *
         * 之前提现审核挂在商家自助接口下属于产品设计错误（商家自审 = 无审核），
         * 这里在平台层重建：支持 status / keyword / 商家筛选 + 分页。
         *
         * 返回每条记录会扁平化商家摘要（merchantName / merchantType / merchantStatus）
         * 给 admin-pc「提现审核」表格直接 row.merchantName 消费。
         */
        PlatformService_1.prototype.withdrawsList = function (q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, where, _b, rows, total, list;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            where = {};
                            if ((q === null || q === void 0 ? void 0 : q.status) && q.status !== 'all')
                                where.status = q.status;
                            if (q === null || q === void 0 ? void 0 : q.merchantId)
                                where.merchantId = q.merchantId;
                            if (q === null || q === void 0 ? void 0 : q.keyword) {
                                where.OR = [{ no: { contains: q.keyword } }, { account: { contains: q.keyword } }];
                            }
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.withdraw.findMany({
                                        where: where,
                                        skip: skip,
                                        take: take,
                                        orderBy: { createdAt: 'desc' },
                                        include: {
                                            merchant: { select: { id: true, name: true, type: true, status: true } },
                                            user: { select: { id: true, nickname: true, phone: true } },
                                        },
                                    }),
                                    this.prisma.withdraw.count({ where: where }),
                                ])];
                        case 1:
                            _b = _c.sent(), rows = _b[0], total = _b[1];
                            list = rows.map(function (r) {
                                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
                                return (0, decimal_util_1.decimalToNumber)(__assign(__assign({}, r), { 
                                    // 前端（admin-pc / platform-app）按 `amount` 读取提现金额，而 Withdraw 表字段是
                                    // applyAmount/actualAmount，补一个 amount 别名（=申请金额）避免两端显示 ¥0 / NaN。
                                    amount: r.applyAmount, merchantName: (_b = (_a = r.merchant) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : '', merchantType: (_d = (_c = r.merchant) === null || _c === void 0 ? void 0 : _c.type) !== null && _d !== void 0 ? _d : '', merchantStatus: (_f = (_e = r.merchant) === null || _e === void 0 ? void 0 : _e.status) !== null && _f !== void 0 ? _f : '', applicantName: (_h = (_g = r.user) === null || _g === void 0 ? void 0 : _g.nickname) !== null && _h !== void 0 ? _h : '', applicantPhone: (_k = (_j = r.user) === null || _j === void 0 ? void 0 : _j.phone) !== null && _k !== void 0 ? _k : '' }));
                            });
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list, total, page, pageSize)];
                    }
                });
            });
        };
        /**
         * 平台审核 → 通过
         *
         * 仅允许 pending → approved；其他状态一律拒绝（避免误把 paid 改成 approved 等）。
         * 同步写入 reviewedBy + reviewedAt + remark；不直接转 paid（保留运营手动 mark-paid 步骤）。
         */
        PlatformService_1.prototype.approveWithdraw = function (id, remark, callerSub) {
            return __awaiter(this, void 0, void 0, function () {
                var w;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.withdraw.findUnique({ where: { id: id } })];
                        case 1:
                            w = _a.sent();
                            if (!w)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '提现单不存在');
                            if (w.status !== 'pending') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, "\u5F53\u524D\u72B6\u6001 ".concat(w.status, " \u4E0D\u53EF\u5BA1\u6838\u901A\u8FC7"));
                            }
                            return [4 /*yield*/, this.prisma.withdraw.update({
                                    where: { id: id },
                                    data: {
                                        status: 'approved',
                                        reviewedBy: callerSub || null,
                                        reviewedAt: new Date(),
                                        remark: remark || w.remark || null,
                                    },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        /**
         * 平台审核 → 驳回
         *
         * 仅允许 pending → rejected；其他状态拒绝。
         * 注：当前 Merchant schema 没有 balance 表，商家可用余额是按完成订单 - 已 paid 提现实时算的，
         *   驳回时无需回写余额。如果未来引入冻结余额，需要在事务里同时退回冻结额。
         */
        PlatformService_1.prototype.rejectWithdrawPlat = function (id, reason, callerSub) {
            return __awaiter(this, void 0, void 0, function () {
                var w;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!reason || !reason.trim()) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请填写驳回原因');
                            }
                            return [4 /*yield*/, this.prisma.withdraw.findUnique({ where: { id: id } })];
                        case 1:
                            w = _a.sent();
                            if (!w)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '提现单不存在');
                            if (w.status !== 'pending') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, "\u5F53\u524D\u72B6\u6001 ".concat(w.status, " \u4E0D\u53EF\u9A73\u56DE"));
                            }
                            return [4 /*yield*/, this.prisma.withdraw.update({
                                    where: { id: id },
                                    data: {
                                        status: 'rejected',
                                        reviewedBy: callerSub || null,
                                        reviewedAt: new Date(),
                                        remark: reason.trim(),
                                    },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        /**
         * 平台标记打款完成
         *
         * 仅允许 approved → paid；其他状态拒绝（防止跳步把 pending 直接打款）。
         * - transactionId：第三方支付流水号（可选，运营走线下转账时可留空）
         * - remark：运营追加备注（如银行回单号等）。
         * 写入 paidAt = now，便于商家端「我的提现记录」展示到账时间。
         */
        PlatformService_1.prototype.markWithdrawPaid = function (id, body, callerSub) {
            return __awaiter(this, void 0, void 0, function () {
                var w, tail, newRemark;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.withdraw.findUnique({ where: { id: id } })];
                        case 1:
                            w = _a.sent();
                            if (!w)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '提现单不存在');
                            if (w.status !== 'approved') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, "\u5F53\u524D\u72B6\u6001 ".concat(w.status, " \u4E0D\u53EF\u6807\u8BB0\u6253\u6B3E\uFF08\u5FC5\u987B\u5148\u5BA1\u6838\u901A\u8FC7\uFF09"));
                            }
                            tail = (body === null || body === void 0 ? void 0 : body.transactionId) ? " | tx=".concat(body.transactionId) : '';
                            newRemark = ((body === null || body === void 0 ? void 0 : body.remark) || w.remark || '') + tail;
                            return [4 /*yield*/, this.prisma.withdraw.update({
                                    where: { id: id },
                                    data: {
                                        status: 'paid',
                                        paidAt: new Date(),
                                        reviewedBy: w.reviewedBy || callerSub || null,
                                        remark: newRemark.trim() || null,
                                    },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // ========== 抽检 / 平台广场上下架 ==========
        /**
         * 平台抽检某商品的审核结果。
         *
         * 用途："加入抽检队列"——把自动审通过的商品标记为待抽检，商品维持当前上架状态。
         * 仅写 AuditRecord(status='sample_check', sampleChecked=true) 供审计；
         * 通过/驳回的最终裁决分别走 approveProduct / rejectProduct，本接口不改 product.status。
         */
        PlatformService_1.prototype.sampleCheckProduct = function (productId, callerSub) {
            return __awaiter(this, void 0, void 0, function () {
                var p;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.product.findUnique({ where: { id: productId } })];
                        case 1:
                            p = _a.sent();
                            if (!p)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '商品不存在');
                            return [4 /*yield*/, this.prisma.auditRecord.create({
                                    data: {
                                        type: 'product',
                                        targetId: productId,
                                        status: 'sample_check',
                                        auditorId: callerSub || null,
                                        sampleChecked: true,
                                        reviewedAt: new Date(),
                                    },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true, productId: productId, status: p.status }];
                    }
                });
            });
        };
        /**
         * 平台维度上下架某商品（仅控制广场展示，不动商家原始 status）。
         *
         * 当前 Product schema 没有独立的 `plazaVisible` 列，因此用 SystemConfig 兜底，
         * key 形如 `plaza:product:${productId}`，value 为 { online: boolean, at: ISO }。
         * - 选品广场列表查询时可批量 IN 读这些 key 过滤；
         * - 后续若加 plazaVisible 列，可在此一并迁移而不破坏接口形状。
         */
        PlatformService_1.prototype.setPlazaProductOnline = function (productId, online) {
            return __awaiter(this, void 0, void 0, function () {
                var p, key;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.product.findUnique({
                                where: { id: productId },
                                select: { id: true, merchantId: true },
                            })];
                        case 1:
                            p = _a.sent();
                            if (!p)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '商品不存在');
                            key = "plaza:product:".concat(productId);
                            return [4 /*yield*/, this.prisma.systemConfig.upsert({
                                    where: { key: key },
                                    update: { value: { online: !!online, at: new Date().toISOString() } },
                                    create: { key: key, value: { online: !!online, at: new Date().toISOString() } },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true, productId: productId, online: !!online }];
                    }
                });
            });
        };
        // ========== 超管重置管理员密码 ==========
        /**
         * 仅 super-admin 可调；
         * 用于「我忘记密码 / 给同事重置」场景，由超管直接覆盖密码（无需短信验证码）。
         *
         * 安全约束：
         *   1. 调用方角色必须是 super-admin —— 普通 admin / platform 拒绝
         *   2. 不允许给自己重置（防自锁、防绕过审计）
         *   3. 密码长度 ≥ 8
         *   4. 目标用户必须是后台管理员角色（admin/platform/super-admin），不能拿去重置普通用户密码
         *      —— 普通用户走 phone-login 走短信重置链路，与本接口完全隔离
         *   5. 不能把另一个 super-admin 的密码改了（防超管之间互相覆盖；要改请走人工流程）
         */
        PlatformService_1.prototype.resetAdminPassword = function (id, newPwd, callerSub, callerRole) {
            return __awaiter(this, void 0, void 0, function () {
                var pwd, target, hash;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (callerRole !== 'super-admin') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '仅 super-admin 可重置管理员密码');
                            }
                            if (!callerSub) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.UNAUTHORIZED, '未登录');
                            }
                            if (id === callerSub) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '不允许重置自己的密码（请走个人设置）');
                            }
                            pwd = typeof newPwd === 'string' ? newPwd.trim() : '';
                            if (pwd.length < 8) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '新密码至少 8 位');
                            }
                            return [4 /*yield*/, this.prisma.user.findUnique({
                                    where: { id: id },
                                    select: { id: true, role: true },
                                })];
                        case 1:
                            target = _a.sent();
                            if (!target)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '账号不存在');
                            if (!['admin', 'platform', 'super-admin'].includes(target.role)) {
                                // 普通客户/商家请走自助找回（短信验证码），不允许通过本接口覆盖密码
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '该账号非后台管理员，不可通过本接口重置');
                            }
                            if (target.role === 'super-admin') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '不允许重置另一位 super-admin 的密码（请走人工流程）');
                            }
                            return [4 /*yield*/, argon2.hash(pwd)];
                        case 2:
                            hash = _a.sent();
                            return [4 /*yield*/, this.prisma.user.update({ where: { id: id }, data: { passwordHash: hash } })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, { ok: true, userId: id }];
                    }
                });
            });
        };
        // ========== 订单分享数据看板（管理后台） ==========
        /**
         * 订单分享列表
         *
         * 业务背景：商家通过 OrderShareService 创建的订单分享存在正式表 OrderShare。
         * 这里给平台后台提供一个统一查询入口，方便运营回溯「谁在分享什么订单 /
         * 浏览数多少」。
         *
         * 实现策略：
         *   1. 直接查 OrderShare 表（只是一张表，不存在模块循环依赖，无需注入
         *      OrderShareService）
         *   2. where 走索引按 merchantId / revoked / createdAt 时间范围过滤
         *   3. 真分页（skip / take）+ count + 拼商家名 / 订单号 / 分享 URL 摘要
         */
        PlatformService_1.prototype.orderShares = function () {
            return __awaiter(this, arguments, void 0, function (query) {
                var _a, skip, take, page, pageSize, where, startAt, endAt, now, _b, rows, total, merchantIds, orderIds, _c, merchants, orders, merchantMap, orderMap, shareBase, list;
                if (query === void 0) { query = {}; }
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(query), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            where = {};
                            if (query.merchantId)
                                where.merchantId = query.merchantId;
                            if (query.revoked === true || query.revoked === 'true')
                                where.revoked = true;
                            else if (query.revoked === false || query.revoked === 'false')
                                where.revoked = false;
                            startAt = query.startDate ? new Date(String(query.startDate)) : null;
                            endAt = query.endDate ? new Date(String(query.endDate)) : null;
                            if (startAt || endAt) {
                                where.createdAt = {};
                                if (startAt)
                                    where.createdAt.gte = startAt;
                                if (endAt)
                                    where.createdAt.lte = endAt;
                            }
                            now = Date.now();
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.orderShare.findMany({
                                        where: where,
                                        orderBy: { updatedAt: 'desc' },
                                        skip: skip,
                                        take: take,
                                    }),
                                    this.prisma.orderShare.count({ where: where }),
                                ])
                                // 批量取商家名 / 订单号摘要，避免 N+1
                            ];
                        case 1:
                            _b = _d.sent(), rows = _b[0], total = _b[1];
                            merchantIds = Array.from(new Set(rows.map(function (r) { return r.merchantId; }).filter(Boolean)));
                            orderIds = Array.from(new Set(rows.map(function (r) { return r.orderId; }).filter(Boolean)));
                            return [4 /*yield*/, Promise.all([
                                    merchantIds.length
                                        ? this.prisma.merchant.findMany({
                                            where: { id: { in: merchantIds } },
                                            select: { id: true, name: true },
                                        })
                                        : Promise.resolve([]),
                                    orderIds.length
                                        ? this.prisma.order.findMany({
                                            where: { id: { in: orderIds } },
                                            select: { id: true, no: true },
                                        })
                                        : Promise.resolve([]),
                                ])];
                        case 2:
                            _c = _d.sent(), merchants = _c[0], orders = _c[1];
                            merchantMap = new Map(merchants.map(function (m) { return [m.id, m.name]; }));
                            orderMap = new Map(orders.map(function (o) { return [o.id, o.no]; }));
                            shareBase = (process.env.SHARE_BASE_URL ||
                                process.env.PUBLIC_SHARE_BASE_URL ||
                                'https://ewsn.top').replace(/\/$/, '');
                            list = rows.map(function (r) { return ({
                                shareCode: r.shareCode,
                                orderId: r.orderId,
                                orderNo: orderMap.get(r.orderId) || null,
                                merchantId: r.merchantId,
                                merchantName: merchantMap.get(r.merchantId) || '未知商家',
                                visibleFields: r.visibleFields || [],
                                expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
                                intro: r.intro || '',
                                viewCount: r.viewCount || 0,
                                revoked: !!r.revoked,
                                expired: !!(r.expiresAt && r.expiresAt.getTime() < now),
                                createdAt: r.createdAt.toISOString(),
                                shareUrl: "".concat(shareBase, "/share?code=").concat(r.shareCode),
                            }); });
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list, total, page, pageSize)];
                    }
                });
            });
        };
        /**
         * 订单分享聚合统计
         *
         * 给平台后台「订单分享」KPI / 趋势 / TopN 面板消费。
         *   - 总分享数 / 总浏览数
         *   - 活跃（未撤销且未过期）/ 已撤销 / 已过期
         *   - 近 7 日新增分享趋势（按 createdAt 日期分桶，本地日期，含今天）
         *   - TOP 10 商户（按分享数 + 浏览数综合排序）
         *
         * 实现策略：直接走 OrderShare 表的 count / aggregate / groupBy 聚合；
         *   7 日趋势只取最近 7 天的 createdAt + viewCount 行在内存分桶（有界）。
         */
        PlatformService_1.prototype.orderSharesStats = function () {
            return __awaiter(this, void 0, void 0, function () {
                var now, day0, trendSince, _a, totalShares, viewsAgg, revoked, expired, trendRows, merchantGroups, totalViews, active, trend, _loop_3, i, merchantIds, merchantInfo, _b, nameMap, topMerchants;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            now = Date.now();
                            day0 = new Date();
                            day0.setHours(0, 0, 0, 0);
                            trendSince = new Date(day0.getTime() - 6 * 86400000);
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.orderShare.count(),
                                    this.prisma.orderShare.aggregate({ _sum: { viewCount: true } }),
                                    this.prisma.orderShare.count({ where: { revoked: true } }),
                                    // 已过期：未撤销 + expiresAt 已过
                                    this.prisma.orderShare.count({
                                        where: { revoked: false, expiresAt: { lt: new Date(now) } },
                                    }),
                                    // 近 7 日（含今天）新增分享，仅取 createdAt 分桶用，行数有界
                                    this.prisma.orderShare.findMany({
                                        where: { createdAt: { gte: trendSince } },
                                        select: { createdAt: true },
                                    }),
                                    // TopN 商户：按 merchantId 分组聚合分享数 + 浏览数
                                    this.prisma.orderShare.groupBy({
                                        by: ['merchantId'],
                                        _count: { _all: true },
                                        _sum: { viewCount: true },
                                        orderBy: [{ _count: { merchantId: 'desc' } }, { _sum: { viewCount: 'desc' } }],
                                        take: 10,
                                    }),
                                ])];
                        case 1:
                            _a = _c.sent(), totalShares = _a[0], viewsAgg = _a[1], revoked = _a[2], expired = _a[3], trendRows = _a[4], merchantGroups = _a[5];
                            totalViews = Number(viewsAgg._sum.viewCount || 0);
                            active = totalShares - revoked - expired;
                            trend = [];
                            _loop_3 = function (i) {
                                var d = new Date(day0.getTime() - i * 86400000);
                                var next = new Date(d.getTime() + 86400000);
                                var label = "".concat(String(d.getMonth() + 1).padStart(2, '0'), "-").concat(String(d.getDate()).padStart(2, '0'));
                                var count = trendRows.filter(function (r) {
                                    var ts = r.createdAt.getTime();
                                    return ts >= d.getTime() && ts < next.getTime();
                                }).length;
                                trend.push({ date: label, count: count });
                            };
                            for (i = 6; i >= 0; i--) {
                                _loop_3(i);
                            }
                            merchantIds = merchantGroups.map(function (g) { return g.merchantId; }).filter(Boolean);
                            if (!merchantIds.length) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.merchant.findMany({
                                    where: { id: { in: merchantIds } },
                                    select: { id: true, name: true },
                                })];
                        case 2:
                            _b = _c.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            _b = [];
                            _c.label = 4;
                        case 4:
                            merchantInfo = _b;
                            nameMap = new Map(merchantInfo.map(function (m) { return [m.id, m.name]; }));
                            topMerchants = merchantGroups.map(function (g) { return ({
                                merchantId: g.merchantId,
                                name: nameMap.get(g.merchantId) || '未知商家',
                                shareCount: g._count._all,
                                viewCount: Number(g._sum.viewCount || 0),
                            }); });
                            return [2 /*return*/, {
                                    totalShares: totalShares,
                                    totalViews: totalViews,
                                    active: active,
                                    revoked: revoked,
                                    expired: expired,
                                    trend: trend,
                                    topMerchants: topMerchants,
                                }];
                    }
                });
            });
        };
        // ========== 系统配置 ==========
        /**
         * 系统设置 —— 平台后台「系统设置」页消费
         *
         * 返回稳定 shape：site / payment / logistics / service / security / business
         * 即使 SystemConfig 表里没有任何记录，前端 `s.business.*` 也不会 undefined 报错。
         *
         * 已存在的数据会与默认值浅合并，避免后续新增字段时旧数据缺字段。
         */
        PlatformService_1.prototype.systemSettings = function () {
            return __awaiter(this, void 0, void 0, function () {
                var DEFAULT, v, persisted;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            DEFAULT = {
                                site: { name: '经纬科技', logo: '', icp: '' },
                                payment: {
                                    wechat: { enabled: true },
                                    alipay: { enabled: false },
                                    balance: { enabled: true },
                                },
                                logistics: { providers: ['顺丰', '京东', '中通'], defaultFreight: 10 },
                                service: { phone: '400-000-0000', email: 'support@jiujiu.com', workTime: '9:00-18:00' },
                                security: { passwordPolicy: { minLength: 8, requireUppercase: true }, ipWhitelist: [] },
                                // P1-9 修复：admin-pc 系统设置页有 business 块（新商户/商品自动审核、平台佣金率、提现门槛），
                                // 之前默认对象缺这一块，前端 `s.business.*` 取值 undefined 报错
                                business: {
                                    newMerchantAutoApprove: false,
                                    newProductAutoApprove: false,
                                    platformCommissionRate: 5,
                                    withdrawMinAmount: 100,
                                },
                            };
                            return [4 /*yield*/, this.prisma.systemConfig.findUnique({ where: { key: 'system_settings' } })];
                        case 1:
                            v = _a.sent();
                            persisted = (v === null || v === void 0 ? void 0 : v.value) || {};
                            return [2 /*return*/, __assign(__assign(__assign({}, DEFAULT), persisted), { 
                                    // 嵌套字段浅合并，保证旧记录缺 business 时仍有默认值
                                    business: __assign(__assign({}, DEFAULT.business), (persisted.business || {})) })];
                    }
                });
            });
        };
        /**
         * 保存系统设置（透传到 SystemConfig）
         *
         * 任意可被 JSON 序列化的字段都允许写入；business 由前端控制是否包含。
         * 保存后下次读取时会与最新 DEFAULT 浅合并，缺字段自动回退默认值。
         */
        PlatformService_1.prototype.saveSystemSettings = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.systemConfig.upsert({
                                where: { key: 'system_settings' },
                                update: { value: dto },
                                create: { key: 'system_settings', value: dto },
                            })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // ========== 工单系统 (基于 SystemConfig 兜底) ==========
        /**
         * 工单系统最小实现 —— 不改 prisma schema,沿用 SystemConfig key='ticket:<id>'。
         *
         * 用 SystemConfig 兜底 (而不是单独建表) 的理由:
         *   - 业务量小且早期容易迭代字段
         *   - 已有 SystemConfig 通用读写,无需 migration
         *   - 字段以 JSON 形式存储,新增字段无需 ALTER
         *
         * 数据形态 (TicketRow):
         *   { id, title, content, fromUserId, fromUserName, status:'open'|'handling'|'closed',
         *     priority:'low'|'normal'|'high', createdAt, handledBy?, handledAt?, reply? }
         *
         * 未来若业务扩展,可以无痛迁到独立 Ticket 表 + 全文索引。
         */
        PlatformService_1.prototype.tickets = function () {
            return __awaiter(this, arguments, void 0, function (query) {
                var _a, skip, take, page, pageSize, rows, all, kw_1, total, list;
                if (query === void 0) { query = {}; }
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(query), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            return [4 /*yield*/, this.prisma.systemConfig.findMany({
                                    where: { key: { startsWith: 'ticket:' } },
                                    orderBy: { updatedAt: 'desc' },
                                })];
                        case 1:
                            rows = _b.sent();
                            all = rows
                                .map(function (r) {
                                var v = (r.value || {});
                                return {
                                    id: v.id || r.key.replace(/^ticket:/, ''),
                                    title: v.title || '',
                                    content: v.content || '',
                                    fromUserId: v.fromUserId || null,
                                    fromUserName: v.fromUserName || '匿名用户',
                                    status: v.status || 'open',
                                    priority: v.priority || 'normal',
                                    createdAt: v.createdAt || r.updatedAt.toISOString(),
                                    handledBy: v.handledBy || null,
                                    handledAt: v.handledAt || null,
                                    reply: v.reply || '',
                                };
                            })
                                .filter(function (t) { return t.id; });
                            if ((query === null || query === void 0 ? void 0 : query.status) && query.status !== 'all') {
                                all = all.filter(function (t) { return t.status === query.status; });
                            }
                            if ((query === null || query === void 0 ? void 0 : query.priority) && query.priority !== 'all') {
                                all = all.filter(function (t) { return t.priority === query.priority; });
                            }
                            if (query === null || query === void 0 ? void 0 : query.keyword) {
                                kw_1 = String(query.keyword).toLowerCase();
                                all = all.filter(function (t) {
                                    return t.title.toLowerCase().includes(kw_1) ||
                                        t.content.toLowerCase().includes(kw_1) ||
                                        t.fromUserName.toLowerCase().includes(kw_1);
                                });
                            }
                            total = all.length;
                            list = all.slice(skip, skip + take);
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list, total, page, pageSize)];
                    }
                });
            });
        };
        /** 已处理工单数 (最近 30 天 closed) — 给 platform-app 个人中心徽章用 */
        PlatformService_1.prototype.handledTicketCount = function () {
            return __awaiter(this, void 0, void 0, function () {
                var thirtyDaysAgo, rows, count;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
                            return [4 /*yield*/, this.prisma.systemConfig.findMany({
                                    where: { key: { startsWith: 'ticket:' } },
                                    select: { value: true, updatedAt: true },
                                })];
                        case 1:
                            rows = _a.sent();
                            count = rows.filter(function (r) {
                                var v = (r.value || {});
                                if (v.status !== 'closed')
                                    return false;
                                var handledAt = v.handledAt ? new Date(v.handledAt) : r.updatedAt;
                                return handledAt.getTime() >= thirtyDaysAgo.getTime();
                            }).length;
                            return [2 /*return*/, { count: count }];
                    }
                });
            });
        };
        /** 未处理工单数 (open + handling) — 给个人中心徽章用 */
        PlatformService_1.prototype.pendingTicketCount = function () {
            return __awaiter(this, void 0, void 0, function () {
                var rows, count;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.systemConfig.findMany({
                                where: { key: { startsWith: 'ticket:' } },
                                select: { value: true },
                            })];
                        case 1:
                            rows = _a.sent();
                            count = rows.filter(function (r) {
                                var v = (r.value || {});
                                return v.status === 'open' || v.status === 'handling' || !v.status;
                            }).length;
                            return [2 /*return*/, { count: count }];
                    }
                });
            });
        };
        /**
         * 处理工单 — 写回 reply / status / handledBy / handledAt 到 SystemConfig。
         *
         * @param id 工单 id (会拼成 key='ticket:<id>')
         * @param dto.reply 回复内容
         * @param dto.status 目标状态 open / handling / closed
         * @param callerSub 当前管理员 sub (写入 handledBy)
         */
        PlatformService_1.prototype.handleTicket = function (id, dto, callerSub) {
            return __awaiter(this, void 0, void 0, function () {
                var key, row, cur, nextStatus, next;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!id)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '工单 id 必填');
                            key = "ticket:".concat(id);
                            return [4 /*yield*/, this.prisma.systemConfig.findUnique({ where: { key: key } })];
                        case 1:
                            row = _c.sent();
                            if (!row)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '工单不存在');
                            cur = (row.value || {});
                            nextStatus = (dto === null || dto === void 0 ? void 0 : dto.status) || cur.status || 'handling';
                            if (!['open', 'handling', 'closed'].includes(nextStatus)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, 'status 仅支持 open/handling/closed');
                            }
                            next = __assign(__assign({}, cur), { id: cur.id || id, reply: (_b = (_a = dto === null || dto === void 0 ? void 0 : dto.reply) !== null && _a !== void 0 ? _a : cur.reply) !== null && _b !== void 0 ? _b : '', status: nextStatus, handledBy: callerSub || cur.handledBy || null, handledAt: new Date().toISOString() });
                            return [4 /*yield*/, this.prisma.systemConfig.update({ where: { key: key }, data: { value: next } })];
                        case 2:
                            _c.sent();
                            return [2 /*return*/, { ok: true, ticket: next }];
                    }
                });
            });
        };
        /**
         * 创建工单 — 用户端/管理后台 都可调用。
         *
         * id 由后端生成 (Date.now()-rand),写入 SystemConfig key='ticket:<id>'。
         * status 默认 'open',priority 默认 'normal'。
         */
        PlatformService_1.prototype.createTicket = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var id, value;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(dto === null || dto === void 0 ? void 0 : dto.title))
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '工单标题必填');
                            id = "".concat(Date.now()).concat(Math.random().toString(36).slice(2, 6));
                            value = {
                                id: id,
                                title: dto.title,
                                content: dto.content || '',
                                fromUserId: dto.fromUserId || null,
                                fromUserName: dto.fromUserName || '匿名用户',
                                status: 'open',
                                priority: dto.priority || 'normal',
                                createdAt: new Date().toISOString(),
                                handledBy: null,
                                handledAt: null,
                                reply: '',
                            };
                            return [4 /*yield*/, this.prisma.systemConfig.create({
                                    data: { key: "ticket:".concat(id), value: value },
                                })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, value];
                    }
                });
            });
        };
        // ============ 消息中心 (基于 SystemConfig 兜底) ============
        /**
         * 平台消息中心:系统通知 / 待办提醒 / 业务提示
         * 存储:SystemConfig key='notification:<id>' value={id,type,title,content,unread,createdAt,readBy[]}
         * 用户维度:readBy 数组记录哪些 user.sub 已读;markAll 时把 readBy 加入 callerSub
         *
         * 实际生产推荐迁移到 Notification 正式表 + Redis 维度缓存;现阶段量级 < 千级可用。
         */
        PlatformService_1.prototype.notifications = function () {
            return __awaiter(this, arguments, void 0, function (query) {
                var page, pageSize, type, rows, list, total, start;
                if (query === void 0) { query = {}; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            page = Math.max(1, Number(query === null || query === void 0 ? void 0 : query.page) || 1);
                            pageSize = Math.min(100, Math.max(1, Number(query === null || query === void 0 ? void 0 : query.pageSize) || 20));
                            type = (query === null || query === void 0 ? void 0 : query.type) || '';
                            return [4 /*yield*/, this.prisma.systemConfig.findMany({
                                    where: { key: { startsWith: 'notification:' } },
                                    orderBy: { updatedAt: 'desc' },
                                    take: 500,
                                })];
                        case 1:
                            rows = _a.sent();
                            list = rows.map(function (r) { return r.value || {}; }).filter(function (n) { return n && n.id; });
                            if (type && type !== 'all') {
                                list = list.filter(function (n) { return n.type === type; });
                            }
                            total = list.length;
                            start = (page - 1) * pageSize;
                            return [2 /*return*/, {
                                    list: list.slice(start, start + pageSize),
                                    total: total,
                                    page: page,
                                    pageSize: pageSize,
                                    hasMore: start + pageSize < total,
                                }];
                    }
                });
            });
        };
        PlatformService_1.prototype.notificationsReadAll = function (callerSub) {
            return __awaiter(this, void 0, void 0, function () {
                var rows, updated, _i, rows_1, r, cfg, readBy;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.systemConfig.findMany({
                                where: { key: { startsWith: 'notification:' } },
                                take: 500,
                            })];
                        case 1:
                            rows = _a.sent();
                            updated = 0;
                            _i = 0, rows_1 = rows;
                            _a.label = 2;
                        case 2:
                            if (!(_i < rows_1.length)) return [3 /*break*/, 5];
                            r = rows_1[_i];
                            cfg = r.value || {};
                            readBy = Array.isArray(cfg.readBy) ? cfg.readBy : [];
                            if (!(callerSub && !readBy.includes(callerSub))) return [3 /*break*/, 4];
                            readBy.push(callerSub);
                            return [4 /*yield*/, this.prisma.systemConfig
                                    .update({
                                    where: { key: r.key },
                                    data: { value: __assign(__assign({}, cfg), { readBy: readBy, unread: false }) },
                                })
                                    .catch(function () { })];
                        case 3:
                            _a.sent();
                            updated += 1;
                            _a.label = 4;
                        case 4:
                            _i++;
                            return [3 /*break*/, 2];
                        case 5: return [2 /*return*/, { ok: true, updated: updated }];
                    }
                });
            });
        };
        PlatformService_1.prototype.notificationRead = function (id, callerSub) {
            return __awaiter(this, void 0, void 0, function () {
                var row, cfg, readBy;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.systemConfig.findUnique({
                                where: { key: "notification:".concat(id) },
                            })];
                        case 1:
                            row = _a.sent();
                            if (!row)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '消息不存在');
                            cfg = row.value || {};
                            readBy = Array.isArray(cfg.readBy) ? cfg.readBy : [];
                            if (callerSub && !readBy.includes(callerSub)) {
                                readBy.push(callerSub);
                            }
                            return [4 /*yield*/, this.prisma.systemConfig.update({
                                    where: { key: "notification:".concat(id) },
                                    data: { value: __assign(__assign({}, cfg), { readBy: readBy, unread: false }) },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // ============ 反馈 (基于 SystemConfig 兜底) ============
        /**
         * 用户/管理员提交反馈
         * Body: {type:'suggestion'|'bug'|'experience'|'other', content, contact?, images?[]}
         */
        PlatformService_1.prototype.submitFeedback = function (dto, callerSub) {
            return __awaiter(this, void 0, void 0, function () {
                var content, validTypes, type, id, value;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!(dto === null || dto === void 0 ? void 0 : dto.content) || String(dto.content).trim().length < 10) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '反馈内容至少 10 字');
                            }
                            content = String(dto.content).trim().slice(0, 1000);
                            if (!this.contentSecurity && process.env.NODE_ENV === 'production') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '内容安全服务未初始化，暂时无法提交反馈');
                            }
                            return [4 /*yield*/, ((_a = this.contentSecurity) === null || _a === void 0 ? void 0 : _a.assertTextSafe(content, { scope: 'mall', scene: 2 }))];
                        case 1:
                            _b.sent();
                            validTypes = ['suggestion', 'bug', 'experience', 'other'];
                            type = validTypes.includes(dto === null || dto === void 0 ? void 0 : dto.type) ? dto.type : 'other';
                            id = "".concat(Date.now()).concat(Math.random().toString(36).slice(2, 6));
                            value = {
                                id: id,
                                type: type,
                                content: content,
                                contact: (dto === null || dto === void 0 ? void 0 : dto.contact) ? String(dto.contact).slice(0, 100) : '',
                                images: Array.isArray(dto === null || dto === void 0 ? void 0 : dto.images) ? dto.images.slice(0, 3) : [],
                                fromUserId: callerSub || null,
                                status: 'open',
                                createdAt: new Date().toISOString(),
                            };
                            return [4 /*yield*/, this.prisma.systemConfig.create({
                                    data: { key: "feedback:".concat(id), value: value },
                                })];
                        case 2:
                            _b.sent();
                            return [2 /*return*/, { ok: true, id: id }];
                    }
                });
            });
        };
        PlatformService_1.prototype.feedbackList = function () {
            return __awaiter(this, arguments, void 0, function (query) {
                var page, pageSize, type, status, rows, list, total, start;
                if (query === void 0) { query = {}; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            page = Math.max(1, Number(query === null || query === void 0 ? void 0 : query.page) || 1);
                            pageSize = Math.min(100, Math.max(1, Number(query === null || query === void 0 ? void 0 : query.pageSize) || 20));
                            type = (query === null || query === void 0 ? void 0 : query.type) || '';
                            status = (query === null || query === void 0 ? void 0 : query.status) || '';
                            return [4 /*yield*/, this.prisma.systemConfig.findMany({
                                    where: { key: { startsWith: 'feedback:' } },
                                    orderBy: { updatedAt: 'desc' },
                                    take: 500,
                                })];
                        case 1:
                            rows = _a.sent();
                            list = rows.map(function (r) { return r.value || {}; }).filter(function (f) { return f && f.id; });
                            if (type && type !== 'all')
                                list = list.filter(function (f) { return f.type === type; });
                            if (status && status !== 'all')
                                list = list.filter(function (f) { return f.status === status; });
                            total = list.length;
                            start = (page - 1) * pageSize;
                            return [2 /*return*/, {
                                    list: list.slice(start, start + pageSize),
                                    total: total,
                                    page: page,
                                    pageSize: pageSize,
                                    hasMore: start + pageSize < total,
                                }];
                    }
                });
            });
        };
        // ============ 售后/退款审核（平台层） ============
        /**
         * 平台审核 Refund 分页列表
         *
         * 业务背景：用户在 user-mp 发起售后会建一条 Refund(status=pending)，
         * 商家可以在 merchant-app 自审同意/驳回；但很多场景需要平台代审（商家长期不响应、
         * 商家被禁用、争议升级等），此前完全没有平台维度审核入口，前端 platform-app 的
         * `pages/refunds/index.vue` 一直显示空态。这里补齐 GET/agree/reject 三端点。
         *
         * 参数：status / keyword / merchantId / page / pageSize
         * 字段扁平化：userName / merchantName / orderNo 拼到行上，便于前端直接 row.* 渲染
         */
        PlatformService_1.prototype.listRefunds = function () {
            return __awaiter(this, arguments, void 0, function (q) {
                var _a, skip, take, page, pageSize, where, kw, _b, rows, total, list;
                if (q === void 0) { q = {}; }
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            where = {};
                            if ((q === null || q === void 0 ? void 0 : q.status) && q.status !== 'all')
                                where.status = q.status;
                            if (q === null || q === void 0 ? void 0 : q.merchantId)
                                where.merchantId = q.merchantId;
                            if (q === null || q === void 0 ? void 0 : q.keyword) {
                                kw = String(q.keyword).trim();
                                if (kw) {
                                    where.OR = [
                                        { no: { contains: kw, mode: 'insensitive' } },
                                        { reason: { contains: kw, mode: 'insensitive' } },
                                    ];
                                }
                            }
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.refund.findMany({
                                        where: where,
                                        skip: skip,
                                        take: take,
                                        orderBy: { createdAt: 'desc' },
                                        include: {
                                            order: { select: { id: true, no: true } },
                                            user: { select: { id: true, nickname: true, phone: true } },
                                            merchant: { select: { id: true, name: true } },
                                        },
                                    }),
                                    this.prisma.refund.count({ where: where }),
                                ])];
                        case 1:
                            _b = _c.sent(), rows = _b[0], total = _b[1];
                            list = rows.map(function (r) {
                                var _a, _b, _c, _d;
                                return (0, decimal_util_1.decimalToNumber)({
                                    id: r.id,
                                    no: r.no,
                                    orderId: r.orderId,
                                    orderNo: ((_a = r.order) === null || _a === void 0 ? void 0 : _a.no) || null,
                                    userId: r.userId,
                                    userName: ((_b = r.user) === null || _b === void 0 ? void 0 : _b.nickname) || ((_c = r.user) === null || _c === void 0 ? void 0 : _c.phone) || '',
                                    merchantId: r.merchantId,
                                    merchantName: ((_d = r.merchant) === null || _d === void 0 ? void 0 : _d.name) || '',
                                    type: r.type,
                                    reason: r.reason,
                                    description: r.description,
                                    evidence: r.evidence,
                                    applyAmount: Number(r.applyAmount),
                                    refundAmount: r.refundAmount != null ? Number(r.refundAmount) : null,
                                    status: r.status,
                                    merchantReply: r.merchantReply,
                                    completedAt: r.completedAt,
                                    createdAt: r.createdAt,
                                    updatedAt: r.updatedAt,
                                });
                            });
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list, total, page, pageSize)];
                    }
                });
            });
        };
        /**
         * 平台代审退款 → 同意（pending → completed）
         *
         * 资金安全 P0 流程（事务包裹真退款）：
         *   1. 校验存在 + 当前状态 pending（其他状态拒绝，避免重复退款）
         *   2. refundAmount 校验：未传则取 applyAmount；上限不能超过订单实付金额
         *   3. 找到该订单的成功支付记录（Payment.status='success'），缺失直接抛错
         *      —— 防止"订单未真实付款也走退款"的脏数据
         *   4. 事务包：
         *      - 调 wxpay.createRefund 真退款（refundId 持久化到 Payment.wxTransactionId/refundedAt）
         *      - Refund.update 设 status='completed', refundAmount, completedAt
         *      - Payment.update 设 status='refunded'（如全额退）, refundedAt, refundAmount
         *      - Order.update 设 status='refunded'
         *   5. wxpay 调用失败 → 整个事务回滚，Refund 仍是 pending 让运营重试
         *
         * 注：当前实现按"全额退一次"语义；多次部分退款需要补 partial-refund 流程，
         * 文档已挂 TODO（参考 wxpay.createRefund 的 out_refund_no 幂等）。
         */
        PlatformService_1.prototype.agreeRefund = function (id, refundAmount, callerSub) {
            return __awaiter(this, void 0, void 0, function () {
                var r, applyAmount, payAmount, targetAmount, paidPayment, refundResp, e_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.refund.findUnique({
                                where: { id: id },
                                include: { order: { include: { payments: true } } },
                            })];
                        case 1:
                            r = _a.sent();
                            if (!r)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '售后单不存在');
                            if (r.status !== 'pending') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, "\u5F53\u524D\u72B6\u6001 ".concat(r.status, " \u4E0D\u53EF\u5BA1\u6838\u901A\u8FC7"));
                            }
                            applyAmount = Number(r.applyAmount);
                            payAmount = Number(r.order.payAmount);
                            targetAmount = typeof refundAmount === 'number' && Number.isFinite(refundAmount)
                                ? Number(refundAmount)
                                : applyAmount;
                            if (!(targetAmount > 0)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '退款金额必须大于 0');
                            }
                            if (targetAmount > payAmount) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '退款金额不能超过订单实付金额');
                            }
                            paidPayment = r.order.payments.find(function (p) { return p.status === 'success'; });
                            if (!paidPayment) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '该订单暂无已成功的支付记录，无法发起真退款');
                            }
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.wxpay.createRefund({
                                    outTradeNo: r.order.no,
                                    outRefundNo: r.no,
                                    reason: r.reason || '平台代审通过',
                                    refundAmount: targetAmount,
                                    totalAmount: payAmount,
                                })];
                        case 3:
                            refundResp = _a.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            e_3 = _a.sent();
                            throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, "\u5FAE\u4FE1\u9000\u6B3E\u5931\u8D25\uFF1A".concat((e_3 === null || e_3 === void 0 ? void 0 : e_3.message) || e_3));
                        case 5: 
                        // 事务持久化 Refund / Payment / Order 的状态切换
                        return [4 /*yield*/, this.prisma.$transaction([
                                this.prisma.refund.update({
                                    where: { id: r.id },
                                    data: {
                                        status: 'completed',
                                        refundAmount: targetAmount,
                                        completedAt: new Date(),
                                        merchantReply: "\u5E73\u53F0\u4EE3\u5BA1\u901A\u8FC7 (auditor=".concat(callerSub || '-', ", wxRefundId=").concat(refundResp.refundId, ")"),
                                    },
                                }),
                                this.prisma.payment.update({
                                    where: { id: paidPayment.id },
                                    data: {
                                        status: targetAmount >= payAmount ? 'refunded' : paidPayment.status,
                                        refundedAt: new Date(),
                                        refundAmount: targetAmount,
                                    },
                                }),
                                this.prisma.order.update({
                                    where: { id: r.orderId },
                                    // 仅全额退款才把整单标记为 refunded；部分退款（targetAmount < payAmount）保留原状态，
                                    // 否则会把按行/单 SKU 的部分售后误判为整单已退，阻断其余商品的正常流转。
                                    data: { status: targetAmount >= payAmount ? 'refunded' : r.order.status },
                                }),
                                this.prisma.auditRecord.create({
                                    data: {
                                        type: 'refund',
                                        targetId: r.id,
                                        status: 'approved',
                                        reason: "\u5E73\u53F0\u4EE3\u5BA1\u901A\u8FC7\uFF0C\u91D1\u989D=".concat(targetAmount),
                                        auditorId: callerSub || null,
                                        reviewedAt: new Date(),
                                    },
                                }),
                            ])];
                        case 6:
                            // 事务持久化 Refund / Payment / Order 的状态切换
                            _a.sent();
                            return [2 /*return*/, {
                                    ok: true,
                                    refundId: r.id,
                                    wxRefundId: refundResp.refundId,
                                    wxRefundStatus: refundResp.status,
                                    refundAmount: targetAmount,
                                }];
                    }
                });
            });
        };
        /**
         * 平台代审退款 → 驳回（pending → rejected）
         *
         * reason 必填，原因同时写到 Refund.merchantReply（前端列表展示该字段）和 AuditRecord.reason。
         * 订单状态保持 after_sale，等用户改申请 / 关单 / 走商家再审。
         */
        PlatformService_1.prototype.rejectRefundPlat = function (id, reason, callerSub) {
            return __awaiter(this, void 0, void 0, function () {
                var r, trimReason;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!reason || !String(reason).trim()) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请填写驳回原因');
                            }
                            return [4 /*yield*/, this.prisma.refund.findUnique({ where: { id: id } })];
                        case 1:
                            r = _a.sent();
                            if (!r)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '售后单不存在');
                            if (r.status !== 'pending') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, "\u5F53\u524D\u72B6\u6001 ".concat(r.status, " \u4E0D\u53EF\u9A73\u56DE"));
                            }
                            trimReason = String(reason).trim();
                            return [4 /*yield*/, this.prisma.$transaction([
                                    this.prisma.refund.update({
                                        where: { id: r.id },
                                        data: {
                                            status: 'rejected',
                                            merchantReply: "\u5E73\u53F0\u4EE3\u5BA1\u9A73\u56DE\uFF1A".concat(trimReason),
                                        },
                                    }),
                                    this.prisma.auditRecord.create({
                                        data: {
                                            type: 'refund',
                                            targetId: r.id,
                                            status: 'rejected',
                                            reason: trimReason,
                                            auditorId: callerSub || null,
                                            reviewedAt: new Date(),
                                        },
                                    }),
                                ])];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        return PlatformService_1;
    }());
    __setFunctionName(_classThis, "PlatformService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PlatformService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PlatformService = _classThis;
}();
exports.PlatformService = PlatformService;
