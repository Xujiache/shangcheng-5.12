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
exports.MerchantService = void 0;
exports.isEnglishLocale = isEnglishLocale;
exports.localizeMemberPlan = localizeMemberPlan;
var common_1 = require("@nestjs/common");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
var pagination_util_1 = require("../../common/utils/pagination.util");
var decimal_util_1 = require("../../common/utils/decimal.util");
var id_util_1 = require("../../common/utils/id.util");
var dayjs_1 = require("dayjs");
var utc_1 = require("dayjs/plugin/utc");
var timezone_1 = require("dayjs/plugin/timezone");
var internal_test_merchant_util_1 = require("../../common/utils/internal-test-merchant.util");
dayjs_1.default.extend(utc_1.default);
dayjs_1.default.extend(timezone_1.default);
var BUSINESS_TIMEZONE = 'Asia/Shanghai';
var image_thumbnail_util_1 = require("../files/image-thumbnail.util");
var plaza_filter_options_util_1 = require("./plaza-filter-options.util");
var QUOTA_KEYS = ['pushSlots', 'banner', 'impression'];
function isEnglishLocale(language) {
    return String(language || '')
        .toLowerCase()
        .startsWith('en');
}
function localizeMemberPlan(plan, language) {
    if (!isEnglishLocale(language))
        return plan;
    var nameEn = String(plan.nameEn || '').trim();
    var rightsEn = Array.isArray(plan.rightsEn)
        ? plan.rightsEn.filter(function (item) { return typeof item === 'string' && item.trim().length > 0; })
        : [];
    return __assign(__assign({}, plan), { name: nameEn || plan.name, rights: rightsEn.length > 0 ? rightsEn : plan.rights });
}
/**
 * Product 表第一类字段白名单 —— 防止前端误传 schema 不认的字段（如 freeShipping）
 * 触发 PrismaClientValidationError。所有 by-size 字段都是首类列，已纳入白名单，
 * 不需要 extraConfig 兜底。
 */
var PRODUCT_WRITABLE_FIELDS = [
    'name',
    'description',
    'images',
    'detailImages',
    'detailHtml',
    'tags',
    'categoryId',
    'merchantCategoryId',
    'priceRetailMin',
    'priceRetailMax',
    'priceWholesaleMin',
    'priceWholesaleMax',
    'priceMemberMin',
    'priceMemberMax',
    'pricingMode',
    'pricePerSqm',
    'baseFee',
    'sizeUnit',
    'minLength',
    'minWidth',
    'maxLength',
    'maxWidth',
    'totalStock',
    'shipping',
    'priceDisplayRules',
    'status',
    'rejectReason',
];
function pickProductFields(dto) {
    if (!dto || typeof dto !== 'object')
        return {};
    var out = {};
    for (var _i = 0, PRODUCT_WRITABLE_FIELDS_1 = PRODUCT_WRITABLE_FIELDS; _i < PRODUCT_WRITABLE_FIELDS_1.length; _i++) {
        var k = PRODUCT_WRITABLE_FIELDS_1[_i];
        if (k in dto && dto[k] !== undefined)
            out[k] = dto[k];
    }
    return out;
}
/**
 * 从 SKU 数组计算 Product 的价格 min/max 聚合。
 *
 * 为什么必须由后端算：
 *   - 前端各端实现散乱，user-mp / merchant-app / admin-pc / platform-app 都可能
 *     创建/编辑商品，谁也别指望都正确填 priceRetailMin/Max
 *   - 早期实现直接 `dto.priceRetailMin ?? 0`，前端不传就落库 0，造成用户填了 ¥999
 *     的 SKU 价、平台审核页和小程序展示都是 0 的诡异现象
 *
 * SKU 全空时（pricingMode=customSize 之类的特殊商品）回落到 dto.priceRetailMin。
 */
function aggregateSkuPrices(skus, dto) {
    var _a, _b, _c, _d, _e, _f;
    if (skus.length === 0) {
        // 无 SKU 的兜底：用 dto 显式传的（如按平米定价的商品）
        var r = Number((_a = dto === null || dto === void 0 ? void 0 : dto.priceRetailMin) !== null && _a !== void 0 ? _a : 0);
        var w = Number((_b = dto === null || dto === void 0 ? void 0 : dto.priceWholesaleMin) !== null && _b !== void 0 ? _b : r);
        var m = Number((_c = dto === null || dto === void 0 ? void 0 : dto.priceMemberMin) !== null && _c !== void 0 ? _c : r);
        return {
            priceRetailMin: r,
            priceRetailMax: Number((_d = dto === null || dto === void 0 ? void 0 : dto.priceRetailMax) !== null && _d !== void 0 ? _d : r),
            priceWholesaleMin: w,
            priceWholesaleMax: Number((_e = dto === null || dto === void 0 ? void 0 : dto.priceWholesaleMax) !== null && _e !== void 0 ? _e : w),
            priceMemberMin: m,
            priceMemberMax: Number((_f = dto === null || dto === void 0 ? void 0 : dto.priceMemberMax) !== null && _f !== void 0 ? _f : m),
        };
    }
    var retails = skus.map(function (s) { return s.priceRetail || 0; });
    var wholesales = skus.map(function (s) { return s.priceWholesale || 0; });
    var members = skus.map(function (s) { return s.priceMember || 0; });
    return {
        priceRetailMin: Math.min.apply(Math, retails),
        priceRetailMax: Math.max.apply(Math, retails),
        priceWholesaleMin: Math.min.apply(Math, wholesales),
        priceWholesaleMax: Math.max.apply(Math, wholesales),
        priceMemberMin: Math.min.apply(Math, members),
        priceMemberMax: Math.max.apply(Math, members),
    };
}
var MerchantService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var MerchantService = _classThis = /** @class */ (function () {
        function MerchantService_1(prisma, wxpay, chat, contentSecurity) {
            this.prisma = prisma;
            this.wxpay = wxpay;
            this.chat = chat;
            this.contentSecurity = contentSecurity;
        }
        /**
         * 商品富文本可能远长于单次微信检测限制，按 500 字符分段全部检测；任一段失败即不落库。
         */
        MerchantService_1.prototype.assertMerchantTextSafe = function (value) {
            return __awaiter(this, void 0, void 0, function () {
                var text, offset;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            text = String(value || '')
                                .replace(/<[^>]*>/g, ' ')
                                .trim();
                            if (!text)
                                return [2 /*return*/];
                            if (!this.contentSecurity && process.env.NODE_ENV === 'production') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '内容安全服务未初始化，暂时无法提交内容');
                            }
                            offset = 0;
                            _b.label = 1;
                        case 1:
                            if (!(offset < text.length)) return [3 /*break*/, 4];
                            return [4 /*yield*/, ((_a = this.contentSecurity) === null || _a === void 0 ? void 0 : _a.assertTextSafe(text.slice(offset, offset + 500), {
                                    scope: 'mall',
                                    scene: 2,
                                }))];
                        case 2:
                            _b.sent();
                            _b.label = 3;
                        case 3:
                            offset += 500;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * 获取商家 merchantId（user 必须为 factory/store/super-admin）
         *
         * super-admin 跨工作台访问：
         *   - 非生产环境：可以回退到 seed 的 merchant@demo 演示商户，便于本地联调
         *   - 生产环境：禁止任何"演示商户"兜底；super-admin 想操作商户功能必须显式绑定，
         *     否则一律抛 FORBIDDEN，避免误把平台管理员的操作写到第一个真实商户上。
         */
        MerchantService_1.prototype.ensureMerchantId = function (user) {
            return __awaiter(this, void 0, void 0, function () {
                var m, demo, mer, first;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (user.merchantId)
                                return [2 /*return*/, user.merchantId];
                            return [4 /*yield*/, this.prisma.merchant.findUnique({ where: { userId: user.sub } })];
                        case 1:
                            m = _a.sent();
                            if (m)
                                return [2 /*return*/, m.id];
                            if (!(user.role === 'super-admin' && process.env.NODE_ENV !== 'production')) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.prisma.user.findUnique({
                                    where: { username: 'merchant@demo' },
                                })];
                        case 2:
                            demo = _a.sent();
                            if (!demo) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.prisma.merchant.findUnique({ where: { userId: demo.id } })];
                        case 3:
                            mer = _a.sent();
                            if (mer)
                                return [2 /*return*/, mer.id];
                            _a.label = 4;
                        case 4: return [4 /*yield*/, this.prisma.merchant.findFirst({ orderBy: { createdAt: 'asc' } })];
                        case 5:
                            first = _a.sent();
                            if (first)
                                return [2 /*return*/, first.id];
                            _a.label = 6;
                        case 6: throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '当前账号未关联商家');
                    }
                });
            });
        };
        // ========== Dashboard / Stats ==========
        /**
         * 商家首页 Dashboard
         *
         * 经营口径统一按 paidAt 统计，避免把待付款/已取消订单计入成交额。
         * 北京时间日界线在服务端显式换算，不依赖宿主机时区。
         * legacy 字段继续返回，供已发布 APP 向后兼容；新版使用 workbench。
         */
        MerchantService_1.prototype.dashboard = function (merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                var now, todayStart, tomorrowStart, yesterdayStart, trendStart, _a, paidTodayAgg, paidYesterdayAgg, paidTrendOrders, paidTodayCustomers, paidYesterdayCustomers, pendingShipment, pendingRefund, pendingStoreAuth, unreadMessagesAgg, rejectedProducts, auditingProducts, paidAmount, yesterdayPaidAmount, paidOrders, yesterdayPaidOrders, paidCustomers, yesterdayPaidCustomers, unreadMessages, percentChange, trend7d, plazaHighlights, plazaPage, _b;
                var _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
                return __generator(this, function (_o) {
                    switch (_o.label) {
                        case 0:
                            now = (0, dayjs_1.default)().tz(BUSINESS_TIMEZONE);
                            todayStart = now.startOf('day');
                            tomorrowStart = todayStart.add(1, 'day');
                            yesterdayStart = todayStart.subtract(1, 'day');
                            trendStart = todayStart.subtract(6, 'day');
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.order.aggregate({
                                        where: {
                                            merchantId: merchantId,
                                            paidAt: { gte: todayStart.toDate(), lt: tomorrowStart.toDate() },
                                        },
                                        _count: { _all: true },
                                        _sum: { payAmount: true },
                                    }),
                                    this.prisma.order.aggregate({
                                        where: {
                                            merchantId: merchantId,
                                            paidAt: { gte: yesterdayStart.toDate(), lt: todayStart.toDate() },
                                        },
                                        _count: { _all: true },
                                        _sum: { payAmount: true },
                                    }),
                                    this.prisma.order.findMany({
                                        where: {
                                            merchantId: merchantId,
                                            paidAt: { gte: trendStart.toDate(), lt: tomorrowStart.toDate() },
                                        },
                                        select: { paidAt: true, payAmount: true },
                                    }),
                                    this.prisma.order.groupBy({
                                        by: ['userId'],
                                        where: {
                                            merchantId: merchantId,
                                            paidAt: { gte: todayStart.toDate(), lt: tomorrowStart.toDate() },
                                        },
                                    }),
                                    this.prisma.order.groupBy({
                                        by: ['userId'],
                                        where: {
                                            merchantId: merchantId,
                                            paidAt: { gte: yesterdayStart.toDate(), lt: todayStart.toDate() },
                                        },
                                    }),
                                    this.prisma.order.count({ where: { merchantId: merchantId, status: 'pending_shipment' } }),
                                    this.prisma.refund.count({ where: { merchantId: merchantId, status: 'pending' } }),
                                    this.prisma.store.count({ where: { merchantId: merchantId, status: 'pending' } }),
                                    this.prisma.chatSession.aggregate({
                                        where: { merchantId: merchantId },
                                        _sum: { unreadCount: true },
                                    }),
                                    this.prisma.product.count({ where: { merchantId: merchantId, status: 'rejected' } }),
                                    this.prisma.product.count({ where: { merchantId: merchantId, status: 'auditing' } }),
                                ])];
                        case 1:
                            _a = _o.sent(), paidTodayAgg = _a[0], paidYesterdayAgg = _a[1], paidTrendOrders = _a[2], paidTodayCustomers = _a[3], paidYesterdayCustomers = _a[4], pendingShipment = _a[5], pendingRefund = _a[6], pendingStoreAuth = _a[7], unreadMessagesAgg = _a[8], rejectedProducts = _a[9], auditingProducts = _a[10];
                            paidAmount = Math.round(Number((_d = (_c = paidTodayAgg._sum) === null || _c === void 0 ? void 0 : _c.payAmount) !== null && _d !== void 0 ? _d : 0) * 100) / 100;
                            yesterdayPaidAmount = Math.round(Number((_f = (_e = paidYesterdayAgg._sum) === null || _e === void 0 ? void 0 : _e.payAmount) !== null && _f !== void 0 ? _f : 0) * 100) / 100;
                            paidOrders = (_h = (_g = paidTodayAgg._count) === null || _g === void 0 ? void 0 : _g._all) !== null && _h !== void 0 ? _h : 0;
                            yesterdayPaidOrders = (_k = (_j = paidYesterdayAgg._count) === null || _j === void 0 ? void 0 : _j._all) !== null && _k !== void 0 ? _k : 0;
                            paidCustomers = paidTodayCustomers.length;
                            yesterdayPaidCustomers = paidYesterdayCustomers.length;
                            unreadMessages = (_m = (_l = unreadMessagesAgg._sum) === null || _l === void 0 ? void 0 : _l.unreadCount) !== null && _m !== void 0 ? _m : 0;
                            percentChange = function (current, previous) {
                                if (previous === 0)
                                    return null;
                                return Math.round(((current - previous) / previous) * 1000) / 10;
                            };
                            trend7d = Array.from({ length: 7 }).map(function (_, index) {
                                var date = trendStart.add(index, 'day').format('YYYY-MM-DD');
                                var amount = paidTrendOrders
                                    .filter(function (order) {
                                    return order.paidAt && (0, dayjs_1.default)(order.paidAt).tz(BUSINESS_TIMEZONE).format('YYYY-MM-DD') === date;
                                })
                                    .reduce(function (sum, order) { return sum + Number(order.payAmount); }, 0);
                                return { date: date, paidAmount: Math.round(amount * 100) / 100 };
                            });
                            plazaHighlights = [];
                            _o.label = 2;
                        case 2:
                            _o.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.plazaProducts(merchantId, { page: 1, pageSize: 3 })];
                        case 3:
                            plazaPage = _o.sent();
                            plazaHighlights = plazaPage.list.map(function (product) { return ({
                                productId: product.productId,
                                productImage: product.productImage,
                                price: Number(product.startPrice),
                            }); });
                            return [3 /*break*/, 5];
                        case 4:
                            _b = _o.sent();
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/, {
                                today: {
                                    orders: paidOrders,
                                    ordersDelta: paidOrders - yesterdayPaidOrders,
                                    newCustomers: paidCustomers,
                                    newCustomersDelta: paidCustomers - yesterdayPaidCustomers,
                                    sales: paidAmount,
                                    salesDelta: Math.round((paidAmount - yesterdayPaidAmount) * 100) / 100,
                                },
                                weekSales: trend7d.map(function (item) { return item.paidAmount; }),
                                todos: {
                                    pendingShipment: pendingShipment,
                                    pendingRefund: pendingRefund,
                                    pendingStoreAuth: pendingStoreAuth,
                                },
                                plazaHighlights: plazaHighlights,
                                workbench: {
                                    updatedAt: now.toISOString(),
                                    overview: {
                                        paidAmount: paidAmount,
                                        paidOrders: paidOrders,
                                        paidCustomers: paidCustomers,
                                        versusYesterday: {
                                            paidAmountPct: percentChange(paidAmount, yesterdayPaidAmount),
                                            paidOrdersPct: percentChange(paidOrders, yesterdayPaidOrders),
                                            paidCustomersPct: percentChange(paidCustomers, yesterdayPaidCustomers),
                                        },
                                    },
                                    trend7d: trend7d,
                                    actions: {
                                        pendingShipment: pendingShipment,
                                        pendingRefund: pendingRefund,
                                        unreadMessages: unreadMessages,
                                        rejectedProducts: rejectedProducts,
                                        auditingProducts: auditingProducts,
                                        pendingStoreAuth: pendingStoreAuth,
                                    },
                                },
                            }];
                    }
                });
            });
        };
        MerchantService_1.prototype.stats = function (merchantId, q) {
            return __awaiter(this, void 0, void 0, function () {
                var period, days, anchor, since, until, orders, bucketSize, buckets, segments, _loop_1, i, prodSalesMap, _i, orders_1, o, _a, _b, it_1, cur, topProducts, customerCount, _c, orders_2, o, newCust, oldCust, totalCust, catMap, _d, orders_3, o, _e, _f, it_2, cName, categoryBars, orderCount, totalSales, avgOrderValue;
                var _g, _h;
                return __generator(this, function (_j) {
                    switch (_j.label) {
                        case 0:
                            period = q.period || 'today';
                            days = period === 'year' ? 365 : period === 'month' ? 30 : period === 'week' ? 7 : 1;
                            anchor = q.date ? new Date(String(q.date)) : new Date();
                            if (Number.isNaN(anchor.getTime())) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, 'date 格式错误');
                            }
                            since = new Date(anchor.getTime() - days * 86400000);
                            until = new Date(anchor.getTime());
                            return [4 /*yield*/, this.prisma.order.findMany({
                                    where: { merchantId: merchantId, createdAt: { gte: since, lte: until } },
                                    include: { items: { include: { product: { include: { category: true } } } } },
                                })
                                // 销售趋势：按日聚合（锚点决定每个 bucket 的时间基准，确保历史查询也能正确分桶）
                            ];
                        case 1:
                            orders = _j.sent();
                            bucketSize = days <= 1 ? 1 : days <= 7 ? 1 : days <= 30 ? 1 : 30;
                            buckets = [];
                            segments = period === 'year' ? 12 : period === 'month' ? 30 : period === 'week' ? 7 : 24;
                            _loop_1 = function (i) {
                                var span = period === 'today' ? 3600000 : 86400000;
                                var segStart = new Date(anchor.getTime() - i * span);
                                if (period !== 'today')
                                    segStart.setHours(0, 0, 0, 0);
                                var segEnd = new Date(segStart.getTime() + span);
                                var sum = orders
                                    .filter(function (o) { return o.createdAt >= segStart && o.createdAt < segEnd; })
                                    .reduce(function (s, o) { return s + Number(o.payAmount); }, 0);
                                var label = period === 'today'
                                    ? "".concat(String(segStart.getHours()).padStart(2, '0'), ":00")
                                    : period === 'year'
                                        ? "".concat(segStart.getMonth() + 1, "\u6708")
                                        : "".concat(segStart.getMonth() + 1, "/").concat(segStart.getDate());
                                buckets.push({ date: label, value: Math.round(sum) });
                            };
                            for (i = segments - 1; i >= 0; i--) {
                                _loop_1(i);
                            }
                            prodSalesMap = new Map();
                            for (_i = 0, orders_1 = orders; _i < orders_1.length; _i++) {
                                o = orders_1[_i];
                                for (_a = 0, _b = o.items; _a < _b.length; _a++) {
                                    it_1 = _b[_a];
                                    cur = prodSalesMap.get(it_1.productId) || { name: it_1.productName, sales: 0 };
                                    cur.sales += it_1.quantity;
                                    prodSalesMap.set(it_1.productId, cur);
                                }
                            }
                            topProducts = Array.from(prodSalesMap.entries())
                                .map(function (_a) {
                                var productId = _a[0], v = _a[1];
                                return ({ productId: productId, name: v.name, sales: v.sales });
                            })
                                .sort(function (a, b) { return b.sales - a.sales; })
                                .slice(0, 10);
                            customerCount = new Map();
                            for (_c = 0, orders_2 = orders; _c < orders_2.length; _c++) {
                                o = orders_2[_c];
                                customerCount.set(o.userId, (customerCount.get(o.userId) || 0) + 1);
                            }
                            newCust = Array.from(customerCount.values()).filter(function (c) { return c === 1; }).length;
                            oldCust = Array.from(customerCount.values()).filter(function (c) { return c > 1; }).length;
                            totalCust = newCust + oldCust || 1;
                            catMap = new Map();
                            for (_d = 0, orders_3 = orders; _d < orders_3.length; _d++) {
                                o = orders_3[_d];
                                for (_e = 0, _f = o.items; _e < _f.length; _e++) {
                                    it_2 = _f[_e];
                                    cName = ((_h = (_g = it_2.product) === null || _g === void 0 ? void 0 : _g.category) === null || _h === void 0 ? void 0 : _h.name) || '未分类';
                                    catMap.set(cName, (catMap.get(cName) || 0) + it_2.quantity);
                                }
                            }
                            categoryBars = Array.from(catMap.entries()).map(function (_a) {
                                var category = _a[0], sales = _a[1];
                                return ({
                                    category: category,
                                    sales: sales,
                                });
                            });
                            orderCount = orders.length;
                            totalSales = Math.round(orders.reduce(function (s, o) { return s + Number(o.payAmount); }, 0));
                            avgOrderValue = orderCount > 0 ? Math.round(totalSales / orderCount) : 0;
                            return [2 /*return*/, {
                                    period: period,
                                    orderCount: orderCount,
                                    totalSales: totalSales,
                                    avgOrderValue: avgOrderValue,
                                    salesTrend: buckets,
                                    topProducts: topProducts,
                                    customerAnalysis: {
                                        newRatio: newCust / totalCust,
                                        oldRatio: oldCust / totalCust,
                                    },
                                    categoryBars: categoryBars,
                                }];
                    }
                });
            });
        };
        // ========== 商品 ==========
        MerchantService_1.prototype.listProducts = function (merchantId, q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, where, _b, list, total;
                var _this = this;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            where = { merchantId: merchantId };
                            if (q.status && q.status !== 'all')
                                where.status = q.status;
                            if (q.keyword)
                                where.name = { contains: q.keyword, mode: 'insensitive' };
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.product.findMany({ where: where, skip: skip, take: take, orderBy: { createdAt: 'desc' } }),
                                    this.prisma.product.count({ where: where }),
                                ])];
                        case 1:
                            _b = _c.sent(), list = _b[0], total = _b[1];
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list.map(function (item) { return (__assign(__assign({}, (0, decimal_util_1.decimalToNumber)(item)), { imageThumbnailUrl: _this.imageThumb(Array.isArray(item.images) ? String(item.images[0] || '') : '') })); }), total, page, pageSize)];
                    }
                });
            });
        };
        MerchantService_1.prototype.productDetail = function (merchantId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var p;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.product.findFirst({
                                where: { id: id, merchantId: merchantId },
                                include: { skus: true },
                            })];
                        case 1:
                            p = _a.sent();
                            if (!p)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '商品不存在');
                            return [2 /*return*/, (0, decimal_util_1.decimalToNumber)(p)];
                    }
                });
            });
        };
        /**
         * 商家添加商品
         *
         * 字段白名单：admin-pc 表单透传 freeShipping 等 schema 不认的字段，直接展开会
         * 触发 PrismaClientValidationError → 整条商品落不下来。这里只挑 Product 模型
         * 真实声明的列（含 pricingMode/pricePerSqm/baseFee/sizeUnit/minLength 等 by-size
         * 第一类列），其余忽略。
         *
         * skus 单独从 dto 抽出，走嵌套 create；规格行字段（specs/specsLabel/priceRetail/
         * priceWholesale/priceMember/stock/active）由 Prisma Sku 模型自行校验，无需在此白名单。
         */
        MerchantService_1.prototype.createProduct = function (merchantId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var rawSkus, skus, data, agg, initialStatus, _a, created;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.assertMerchantTextSafe(dto === null || dto === void 0 ? void 0 : dto.name)];
                        case 1:
                            _b.sent();
                            return [4 /*yield*/, this.assertMerchantTextSafe(dto === null || dto === void 0 ? void 0 : dto.description)];
                        case 2:
                            _b.sent();
                            return [4 /*yield*/, this.assertMerchantTextSafe(dto === null || dto === void 0 ? void 0 : dto.detailHtml)];
                        case 3:
                            _b.sent();
                            rawSkus = Array.isArray(dto === null || dto === void 0 ? void 0 : dto.skus) ? dto.skus : [];
                            skus = rawSkus.map(function (s) {
                                var _a, _b, _c, _d, _e, _f, _g;
                                return ({
                                    specs: (_a = s.specs) !== null && _a !== void 0 ? _a : {},
                                    specsLabel: (_b = s.specsLabel) !== null && _b !== void 0 ? _b : '',
                                    image: (_c = s.image) !== null && _c !== void 0 ? _c : null,
                                    priceWholesale: Number((_d = s.priceWholesale) !== null && _d !== void 0 ? _d : 0),
                                    priceRetail: Number((_e = s.priceRetail) !== null && _e !== void 0 ? _e : 0),
                                    priceMember: Number((_f = s.priceMember) !== null && _f !== void 0 ? _f : 0),
                                    stock: Number((_g = s.stock) !== null && _g !== void 0 ? _g : 0),
                                    active: s.active !== false,
                                });
                            });
                            data = pickProductFields(dto);
                            agg = aggregateSkuPrices(skus, dto);
                            _a = dto.status;
                            if (_a) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.decideAuditStatus(merchantId, dto)];
                        case 4:
                            _a = (_b.sent());
                            _b.label = 5;
                        case 5:
                            initialStatus = _a;
                            return [4 /*yield*/, this.prisma.product.create({
                                    data: __assign(__assign({}, data), { merchantId: merchantId, priceRetailMin: agg.priceRetailMin, priceRetailMax: agg.priceRetailMax, priceWholesaleMin: agg.priceWholesaleMin, priceWholesaleMax: agg.priceWholesaleMax, priceMemberMin: agg.priceMemberMin, priceMemberMax: agg.priceMemberMax, status: initialStatus, skus: { create: skus } }),
                                    include: { skus: true },
                                })
                                // 自动通过的商品也写一条 AuditRecord，方便审核日志页能查到
                            ];
                        case 6:
                            created = _b.sent();
                            if (!(initialStatus === 'auto_approved' || initialStatus === 'active')) return [3 /*break*/, 8];
                            return [4 /*yield*/, this.prisma.auditRecord
                                    .create({
                                    data: {
                                        type: 'product',
                                        targetId: created.id,
                                        status: 'approved',
                                        remark: initialStatus === 'auto_approved' ? '自动通过（满足审核免检条件）' : null,
                                    },
                                })
                                    .catch(function () { })];
                        case 7:
                            _b.sent();
                            _b.label = 8;
                        case 8: return [2 /*return*/, (0, decimal_util_1.decimalToNumber)(created)];
                    }
                });
            });
        };
        /**
         * 按平台审核配置 + 商家信用，决定新商品落库时的 status
         *
         * 规则：
         *   - autoApprove=false：一律走人工审核（'auditing'）
         *   - autoApprove=true 但有任一勾上的条件不满足：'auditing'
         *   - 所有勾上的条件都满足：'auto_approved'（可立即上架）
         *
         * 条件实现（与 platform service 默认 conditions 对齐）：
         *   - vip       商家 level=A/B（暂以 level 表示 VIP 等级）
         *   - credit    商家 credit=A/B
         *   - rejectRate 商家 rejectRate < 5%
         *   - category  暂未实现具体分类白名单（默认满足）
         */
        MerchantService_1.prototype.decideAuditStatus = function (merchantId, _dto) {
            return __awaiter(this, void 0, void 0, function () {
                var cfgRow, cfg, m, enabled, _i, enabled_1, c;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.systemConfig.findUnique({
                                where: { key: 'audit_product_config' },
                            })];
                        case 1:
                            cfgRow = _b.sent();
                            cfg = (cfgRow === null || cfgRow === void 0 ? void 0 : cfgRow.value) || {};
                            if (!cfg.autoApprove)
                                return [2 /*return*/, 'auditing'];
                            return [4 /*yield*/, this.prisma.merchant.findUnique({ where: { id: merchantId } })];
                        case 2:
                            m = _b.sent();
                            if (!m)
                                return [2 /*return*/, 'auditing'];
                            enabled = (Array.isArray(cfg.conditions) ? cfg.conditions : []).filter(function (c) { return c === null || c === void 0 ? void 0 : c.enabled; });
                            for (_i = 0, enabled_1 = enabled; _i < enabled_1.length; _i++) {
                                c = enabled_1[_i];
                                if (c.key === 'vip') {
                                    // VIP 暂以 level=A/B 判定（schema 没有专门 vip 字段）
                                    if (m.level !== 'A' && m.level !== 'B')
                                        return [2 /*return*/, 'auditing'];
                                }
                                else if (c.key === 'credit') {
                                    if (m.credit !== 'A' && m.credit !== 'B')
                                        return [2 /*return*/, 'auditing'];
                                }
                                else if (c.key === 'rejectRate') {
                                    if (((_a = m.rejectRate) !== null && _a !== void 0 ? _a : 0) >= 0.05)
                                        return [2 /*return*/, 'auditing'];
                                }
                                // category 条件未实现具体白名单 → 视为满足
                            }
                            return [2 /*return*/, 'auto_approved'];
                    }
                });
            });
        };
        /**
         * 商家更新商品
         *
         * 1. Product 本体字段:走 pickProductFields 白名单过滤后 update
         * 2. SKU 数据:智能同步,保护 CartItem/OrderItem 外键(绝不 deleteMany)
         *    - dto.skus 里带 id 且 DB 存在 → update(改价/库存/图)
         *    - dto.skus 里无 id 或 id 不存在 → create 新行
         *    - DB 里有但 dto 不再提交的 SKU → 软下架(active=false),保留外键有效
         *
         * 为什么不能 deleteMany:CartItem.skuId / OrderItem.skuId 是外键引用 Sku.id。
         * 直接删除会让用户购物车/历史订单的 SKU 引用变成悬空 → 列表渲染崩溃。
         * 软下架方案:历史订单仍能反查到 SKU 详情,但商家想"删"的 SKU 不再上架销售。
         */
        MerchantService_1.prototype.updateProduct = function (merchantId, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var p, data, inputSkus, existingSkuIds, activeSkus, agg, refreshed;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.product.findFirst({
                                where: { id: id, merchantId: merchantId },
                                include: { skus: { select: { id: true } } },
                            })];
                        case 1:
                            p = _a.sent();
                            if (!p)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '商品不存在');
                            return [4 /*yield*/, this.assertMerchantTextSafe(dto === null || dto === void 0 ? void 0 : dto.name)];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, this.assertMerchantTextSafe(dto === null || dto === void 0 ? void 0 : dto.description)];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, this.assertMerchantTextSafe(dto === null || dto === void 0 ? void 0 : dto.detailHtml)];
                        case 4:
                            _a.sent();
                            data = pickProductFields(dto);
                            inputSkus = Array.isArray(dto === null || dto === void 0 ? void 0 : dto.skus) ? dto.skus : [];
                            existingSkuIds = new Set(p.skus.map(function (s) { return s.id; }));
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var submittedIds, _i, inputSkus_1, sku, skuData, toDeactivate;
                                    var _a, _b, _c, _d, _e;
                                    return __generator(this, function (_f) {
                                        switch (_f.label) {
                                            case 0: 
                                            // 1. Product 本体字段
                                            return [4 /*yield*/, tx.product.update({ where: { id: id }, data: data })
                                                // 2. SKU 智能同步(只在 dto 显式带 skus 时执行,否则不动 SKU)
                                            ];
                                            case 1:
                                                // 1. Product 本体字段
                                                _f.sent();
                                                // 2. SKU 智能同步(只在 dto 显式带 skus 时执行,否则不动 SKU)
                                                if (!Array.isArray(dto === null || dto === void 0 ? void 0 : dto.skus))
                                                    return [2 /*return*/];
                                                submittedIds = new Set();
                                                _i = 0, inputSkus_1 = inputSkus;
                                                _f.label = 2;
                                            case 2:
                                                if (!(_i < inputSkus_1.length)) return [3 /*break*/, 7];
                                                sku = inputSkus_1[_i];
                                                skuData = {
                                                    specs: sku.specs,
                                                    specsLabel: sku.specsLabel,
                                                    image: (_a = sku.image) !== null && _a !== void 0 ? _a : null,
                                                    priceWholesale: Number((_b = sku.priceWholesale) !== null && _b !== void 0 ? _b : 0),
                                                    priceRetail: Number((_c = sku.priceRetail) !== null && _c !== void 0 ? _c : 0),
                                                    priceMember: Number((_d = sku.priceMember) !== null && _d !== void 0 ? _d : 0),
                                                    stock: Number((_e = sku.stock) !== null && _e !== void 0 ? _e : 0),
                                                    active: sku.active !== false,
                                                };
                                                if (!(sku.id && existingSkuIds.has(String(sku.id)))) return [3 /*break*/, 4];
                                                // 更新现有 SKU(保留 id,外键引用不变)
                                                return [4 /*yield*/, tx.sku.update({ where: { id: String(sku.id) }, data: skuData })];
                                            case 3:
                                                // 更新现有 SKU(保留 id,外键引用不变)
                                                _f.sent();
                                                submittedIds.add(String(sku.id));
                                                return [3 /*break*/, 6];
                                            case 4: 
                                            // 新增 SKU
                                            return [4 /*yield*/, tx.sku.create({ data: __assign(__assign({}, skuData), { productId: id }) })];
                                            case 5:
                                                // 新增 SKU
                                                _f.sent();
                                                _f.label = 6;
                                            case 6:
                                                _i++;
                                                return [3 /*break*/, 2];
                                            case 7:
                                                toDeactivate = __spreadArray([], existingSkuIds, true).filter(function (sid) { return !submittedIds.has(sid); });
                                                if (!(toDeactivate.length > 0)) return [3 /*break*/, 9];
                                                return [4 /*yield*/, tx.sku.updateMany({
                                                        where: { id: { in: toDeactivate } },
                                                        data: { active: false },
                                                    })];
                                            case 8:
                                                _f.sent();
                                                _f.label = 9;
                                            case 9: return [2 /*return*/];
                                        }
                                    });
                                }); })
                                // 更新完 SKU 后，重新聚合 Product 价格 min/max（dto 不传聚合字段时也能保持一致）
                                // 只在本次确实改了 SKU 才重算；纯字段更新跳过避免无谓查询
                            ];
                        case 5:
                            _a.sent();
                            if (!Array.isArray(dto === null || dto === void 0 ? void 0 : dto.skus)) return [3 /*break*/, 8];
                            return [4 /*yield*/, this.prisma.sku.findMany({
                                    where: { productId: id, active: true },
                                    select: { priceRetail: true, priceWholesale: true, priceMember: true },
                                })];
                        case 6:
                            activeSkus = _a.sent();
                            agg = aggregateSkuPrices(activeSkus.map(function (s) { return ({
                                priceRetail: Number(s.priceRetail),
                                priceWholesale: Number(s.priceWholesale),
                                priceMember: Number(s.priceMember),
                            }); }), dto);
                            return [4 /*yield*/, this.prisma.product.update({
                                    where: { id: id },
                                    data: {
                                        priceRetailMin: agg.priceRetailMin,
                                        priceRetailMax: agg.priceRetailMax,
                                        priceWholesaleMin: agg.priceWholesaleMin,
                                        priceWholesaleMax: agg.priceWholesaleMax,
                                        priceMemberMin: agg.priceMemberMin,
                                        priceMemberMax: agg.priceMemberMax,
                                    },
                                })];
                        case 7:
                            _a.sent();
                            _a.label = 8;
                        case 8: return [4 /*yield*/, this.prisma.product.findUnique({
                                where: { id: id },
                                include: { skus: true },
                            })];
                        case 9:
                            refreshed = _a.sent();
                            return [2 /*return*/, (0, decimal_util_1.decimalToNumber)(refreshed)];
                    }
                });
            });
        };
        MerchantService_1.prototype.batchStatus = function (merchantId, ids, status) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.product.updateMany({
                                where: { id: { in: ids }, merchantId: merchantId },
                                data: { status: status },
                            })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { ok: true, affected: ids.length }];
                    }
                });
            });
        };
        MerchantService_1.prototype.batchDelete = function (merchantId, ids) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.product.deleteMany({ where: { id: { in: ids }, merchantId: merchantId } })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { ok: true, affected: ids.length }];
                    }
                });
            });
        };
        // ========== 分类 ==========
        MerchantService_1.prototype.listCategories = function (merchantId_1) {
            return __awaiter(this, arguments, void 0, function (merchantId, type) {
                if (type === void 0) { type = 'merchant'; }
                return __generator(this, function (_a) {
                    if (type === 'platform') {
                        return [2 /*return*/, this.prisma.category.findMany({
                                where: { type: 'platform' },
                                orderBy: { sort: 'asc' },
                            })];
                    }
                    return [2 /*return*/, this.prisma.category.findMany({
                            where: { type: 'merchant', merchantId: merchantId },
                            orderBy: { sort: 'asc' },
                        })];
                });
            });
        };
        MerchantService_1.prototype.createCategory = function (merchantId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, name, icon, sort, parentId;
                return __generator(this, function (_b) {
                    _a = dto || {}, name = _a.name, icon = _a.icon, sort = _a.sort, parentId = _a.parentId;
                    return [2 /*return*/, this.prisma.category.create({
                            data: {
                                name: name,
                                icon: icon || null,
                                sort: typeof sort === 'number' ? sort : 0,
                                parentId: parentId || null,
                                type: 'merchant',
                                merchantId: merchantId,
                            },
                        })];
                });
            });
        };
        MerchantService_1.prototype.updateCategory = function (merchantId, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var exist, data;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.category.findFirst({
                                where: { id: id, merchantId: merchantId, type: 'merchant' },
                                select: { id: true },
                            })];
                        case 1:
                            exist = _a.sent();
                            if (!exist)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '分类不存在或无权限');
                            data = {};
                            if (typeof (dto === null || dto === void 0 ? void 0 : dto.name) === 'string')
                                data.name = dto.name;
                            if (typeof (dto === null || dto === void 0 ? void 0 : dto.icon) === 'string')
                                data.icon = dto.icon;
                            if (typeof (dto === null || dto === void 0 ? void 0 : dto.sort) === 'number')
                                data.sort = dto.sort;
                            if (dto && 'parentId' in dto) {
                                data.parent =
                                    dto.parentId === null || dto.parentId === undefined || dto.parentId === ''
                                        ? { disconnect: true }
                                        : { connect: { id: dto.parentId } };
                            }
                            return [2 /*return*/, this.prisma.category.update({ where: { id: id }, data: data })];
                    }
                });
            });
        };
        MerchantService_1.prototype.deleteCategory = function (merchantId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var exist;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.category.findFirst({
                                where: { id: id, merchantId: merchantId, type: 'merchant' },
                                select: { id: true },
                            })];
                        case 1:
                            exist = _a.sent();
                            if (!exist)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '分类不存在或无权限');
                            return [4 /*yield*/, this.prisma.category.delete({ where: { id: id } })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        MerchantService_1.prototype.sortCategories = function (merchantId, ids) {
            return __awaiter(this, void 0, void 0, function () {
                var owned, ownedSet, i;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.category.findMany({
                                where: { id: { in: ids }, merchantId: merchantId, type: 'merchant' },
                                select: { id: true },
                            })];
                        case 1:
                            owned = _a.sent();
                            ownedSet = new Set(owned.map(function (c) { return c.id; }));
                            i = 0;
                            _a.label = 2;
                        case 2:
                            if (!(i < ids.length)) return [3 /*break*/, 5];
                            if (!ownedSet.has(ids[i]))
                                return [3 /*break*/, 4];
                            return [4 /*yield*/, this.prisma.category.update({ where: { id: ids[i] }, data: { sort: i } })];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4:
                            i++;
                            return [3 /*break*/, 2];
                        case 5: return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // ========== 订单 ==========
        MerchantService_1.prototype.listOrders = function (merchantId, q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, where, _b, list, total;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            where = { merchantId: merchantId };
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
                                        include: {
                                            items: true,
                                            // 仅返回展示所需字段，绝不把 passwordHash/openid/unionid 等凭证/PII 带给商家端
                                            user: { select: { id: true, nickname: true, avatar: true, phone: true } },
                                        },
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
        MerchantService_1.prototype.orderDetail = function (merchantId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var o;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.order.findFirst({
                                where: { id: id, merchantId: merchantId },
                                include: { items: true, payments: true },
                            })];
                        case 1:
                            o = _a.sent();
                            if (!o)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '订单不存在');
                            return [2 /*return*/, (0, decimal_util_1.decimalToNumber)(o)];
                    }
                });
            });
        };
        MerchantService_1.prototype.ship = function (merchantId, id, company, trackingNumber) {
            return __awaiter(this, void 0, void 0, function () {
                var o, shippedAt;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.order.findFirst({ where: { id: id, merchantId: merchantId } })];
                        case 1:
                            o = _a.sent();
                            if (!o)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '订单不存在');
                            if (o.status !== 'pending_shipment')
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.ORDER_STATUS_INVALID, '订单状态不允许发货');
                            shippedAt = new Date();
                            return [4 /*yield*/, this.prisma.order.update({
                                    where: { id: id },
                                    data: { status: 'shipped', trackingCompany: company, trackingNumber: trackingNumber, shippedAt: shippedAt },
                                })
                                // 发货事件推给商家自己的 merchant 房间（列表/统计实时刷）；用户端将来若加 user 房间，可类似 broadcastUserUpdate 推 'order:update' 到 user:<userId>
                            ];
                        case 2:
                            _a.sent();
                            // 发货事件推给商家自己的 merchant 房间（列表/统计实时刷）；用户端将来若加 user 房间，可类似 broadcastUserUpdate 推 'order:update' 到 user:<userId>
                            try {
                                this.chat.emitOrderUpdate(merchantId, {
                                    orderId: o.id,
                                    no: o.no,
                                    status: 'shipped',
                                    trackingCompany: company,
                                    trackingNumber: trackingNumber,
                                    updatedAt: shippedAt,
                                });
                            }
                            catch (_b) { }
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        MerchantService_1.prototype.batchShip = function (merchantId, items) {
            return __awaiter(this, void 0, void 0, function () {
                var _i, items_1, it_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _i = 0, items_1 = items;
                            _a.label = 1;
                        case 1:
                            if (!(_i < items_1.length)) return [3 /*break*/, 4];
                            it_3 = items_1[_i];
                            return [4 /*yield*/, this.ship(merchantId, it_3.id, it_3.company, it_3.trackingNumber)];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/, { ok: true, count: items.length }];
                    }
                });
            });
        };
        MerchantService_1.prototype.parseAddress = function (text) {
            var _a;
            // 简单解析：找电话、省市、剩余作为详细地址
            var phone = (_a = text.match(/1[3-9]\d{9}/)) === null || _a === void 0 ? void 0 : _a[0];
            var phoneless = phone ? text.replace(phone, '') : text;
            return {
                name: (phoneless.match(/^([一-龥]{2,4})/) || [])[1] || '',
                phone: phone || '',
                region: '',
                detail: phoneless.trim(),
            };
        };
        // ========== 售后 ==========
        MerchantService_1.prototype.listRefunds = function (merchantId, q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, where, _b, list, total;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            where = { merchantId: merchantId };
                            if (q.status)
                                where.status = q.status;
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.refund.findMany({
                                        where: where,
                                        skip: skip,
                                        take: take,
                                        orderBy: { createdAt: 'desc' },
                                        include: { order: true, orderItem: true },
                                    }),
                                    this.prisma.refund.count({ where: where }),
                                ])];
                        case 1:
                            _b = _c.sent(), list = _b[0], total = _b[1];
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list.map(decimal_util_1.decimalToNumber), total, page, pageSize)];
                    }
                });
            });
        };
        MerchantService_1.prototype.refundDetail = function (merchantId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var item;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.refund.findFirst({
                                where: { id: id, merchantId: merchantId },
                                include: { order: true, orderItem: true },
                            })];
                        case 1:
                            item = _a.sent();
                            if (!item)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '售后单不存在');
                            return [2 /*return*/, (0, decimal_util_1.decimalToNumber)(item)];
                    }
                });
            });
        };
        /**
         * 商家同意退款
         *
         * 修复 P1-21：之前先调 wxpay 发起退款，然后单独 prisma.refund.update 写状态，
         * 中间任何失败（DB 抖动 / 程序崩溃）都会出现"钱已经发起退了但 DB 没改 agreed"
         * 的不一致 → 用户和客服都搞不清楚。
         *
         * 修复策略：
         *   1. 先校验业务规则（状态、金额、归属）
         *   2. 在 prisma.$transaction 里：调 wxpay.createRefund + 更新 Refund 状态
         *      - wxpay 异步调用放在事务回调里：如果 wxpay 抛错，事务自动回滚 DB 改动
         *      - 注意：$transaction 不能跨网络回滚 wxpay 已经发出的请求，
         *        所以这里仍只能保证"DB 反映了 wxpay 的状态"，做不到"撤回已发出的微信退款"。
         *        但能避免"DB 状态和 wxpay 真实状态长期不一致"这种最常见的脏数据。
         *   3. 事务外推 WS 通知（非业务关键路径）
         *
         * 注：当前 Refund 模型没有 wxRefundId 字段（不能在不动 schema 的前提下保存），
         *   这里把 wxRefundId 拼到 merchantReply 末尾以保留可追溯线索，后续若加列再迁移。
         */
        MerchantService_1.prototype.agreeRefund = function (merchantId, id, refundAmount) {
            return __awaiter(this, void 0, void 0, function () {
                var r, apply, finalAmount, orderPay, updatedAt, wxRefundId, e_1;
                var _this = this;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.refund.findFirst({
                                where: { id: id, merchantId: merchantId },
                                include: { order: { select: { id: true, no: true, payAmount: true, paymentMethod: true } } },
                            })];
                        case 1:
                            r = _b.sent();
                            if (!r)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '售后单不存在');
                            if (r.status !== 'pending') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, "\u5F53\u524D\u552E\u540E\u72B6\u6001 ".concat(r.status, " \u4E0D\u53EF\u540C\u610F"));
                            }
                            apply = Number(r.applyAmount);
                            finalAmount = Number(refundAmount !== null && refundAmount !== void 0 ? refundAmount : apply);
                            if (!(finalAmount > 0)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '退款金额必须大于 0');
                            }
                            if (finalAmount > apply) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '退款金额不能超过申请金额');
                            }
                            orderPay = Number(((_a = r.order) === null || _a === void 0 ? void 0 : _a.payAmount) || 0);
                            if (orderPay <= 0) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '关联订单金额异常,无法退款');
                            }
                            updatedAt = new Date();
                            wxRefundId = null;
                            _b.label = 2;
                        case 2:
                            _b.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var wx, tailReply;
                                    var _a;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0:
                                                if (!((((_a = r.order) === null || _a === void 0 ? void 0 : _a.paymentMethod) || '').toLowerCase() === 'wechat')) return [3 /*break*/, 2];
                                                return [4 /*yield*/, this.wxpay.createRefund({
                                                        outTradeNo: r.order.no,
                                                        outRefundNo: r.no,
                                                        reason: r.reason || '商家同意退款',
                                                        refundAmount: finalAmount,
                                                        totalAmount: orderPay,
                                                    })];
                                            case 1:
                                                wx = _b.sent();
                                                wxRefundId = wx.refundId;
                                                _b.label = 2;
                                            case 2:
                                                tailReply = wxRefundId ? " [wxRefundId=".concat(wxRefundId, "]") : '';
                                                return [4 /*yield*/, tx.refund.update({
                                                        where: { id: id },
                                                        data: {
                                                            status: 'agreed',
                                                            refundAmount: finalAmount,
                                                            merchantReply: ((r.merchantReply || '') + tailReply).trim() || null,
                                                        },
                                                    })];
                                            case 3:
                                                _b.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 3:
                            _b.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            e_1 = _b.sent();
                            if (e_1 instanceof biz_exception_1.BizException)
                                throw e_1;
                            throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, "\u540C\u610F\u9000\u6B3E\u5931\u8D25\uFF1A".concat((e_1 === null || e_1 === void 0 ? void 0 : e_1.message) || e_1));
                        case 5:
                            // 售后单状态变更复用 refund:new 事件流（商家端可在 useMerchantNotifyStream 里
                            // 一并处理"售后有新动态"通知，避免再开新事件名增加协议成本）
                            try {
                                this.chat.emitRefundNew(merchantId, {
                                    refundId: r.id,
                                    no: r.no,
                                    orderId: r.orderId,
                                    status: 'agreed',
                                    refundAmount: finalAmount,
                                    wxRefundId: wxRefundId,
                                    updatedAt: updatedAt,
                                });
                            }
                            catch (_c) { }
                            return [2 /*return*/, { ok: true, wxRefundId: wxRefundId }];
                    }
                });
            });
        };
        MerchantService_1.prototype.rejectRefund = function (merchantId, id, reason) {
            return __awaiter(this, void 0, void 0, function () {
                var r, updatedAt;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.refund.findFirst({ where: { id: id, merchantId: merchantId } })];
                        case 1:
                            r = _a.sent();
                            if (!r)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '售后单不存在');
                            updatedAt = new Date();
                            return [4 /*yield*/, this.prisma.refund.updateMany({
                                    where: { id: id, merchantId: merchantId },
                                    data: { status: 'rejected', merchantReply: reason },
                                })];
                        case 2:
                            _a.sent();
                            try {
                                this.chat.emitRefundNew(merchantId, {
                                    refundId: r.id,
                                    no: r.no,
                                    orderId: r.orderId,
                                    status: 'rejected',
                                    reason: reason,
                                    updatedAt: updatedAt,
                                });
                            }
                            catch (_b) { }
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // ========== 客户 ==========
        /**
         * 商家客户列表
         *
         * 修复（P0-17/18）:
         *   - 之前 listCustomers 只返 8 个基础字段，前端商家想看"该客户在本店下了多少单 / 累计消费 / 上次下单时间 / 是否启用佣金"全都不知道
         *   - q.kind 过滤之前只是字段 echo，根本不影响查询条件 → 现在按 kind ∈ {all, promoter, member, normal, blacklist} 真正过滤
         *   - tier=blacklist 之前误用 status='disabled'(全局禁用)做过滤，导致永远空 → 现在用 SystemConfig blacklist 真正过滤
         *
         * 字段补齐：
         *   - orderCount / totalSpent / lastOrderAt：按 (merchantId, userId) 聚合订单
         *   - commissionEnabled：默认按"商户存在 enabled CommissionRule"判定
         */
        MerchantService_1.prototype.listCustomers = function (merchantId, q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, kind, orderUsers, candidateIds, cfgs_4, blockedSet_1, prefix, _i, cfgs_1, c, where, cfgs_5, memberSet_1, prefix, _b, cfgs_2, c, tier, _c, users, total, visibleIds, cfgKeys, cfgs, _d, tierMap, authMap, blockedMap, tierPrefix, authPrefix, blockedPrefix, _e, cfgs_3, c, aggregates, aggMap, _f, aggregates_1, a, commissionRule, commissionEnabled;
                var _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
                return __generator(this, function (_v) {
                    switch (_v.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            kind = String((q === null || q === void 0 ? void 0 : q.kind) || 'all').toLowerCase();
                            return [4 /*yield*/, this.prisma.order.findMany({
                                    where: { merchantId: merchantId },
                                    distinct: ['userId'],
                                    select: { userId: true },
                                })];
                        case 1:
                            orderUsers = _v.sent();
                            candidateIds = orderUsers.map(function (o) { return o.userId; });
                            if (!(kind === 'blacklist')) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.systemConfig.findMany({
                                    where: {
                                        key: {
                                            in: candidateIds.map(function (id) { return "merchant:".concat(merchantId, ":blacklist:").concat(id); }),
                                        },
                                    },
                                    select: { key: true, value: true },
                                })];
                        case 2:
                            cfgs_4 = _v.sent();
                            blockedSet_1 = new Set();
                            prefix = "merchant:".concat(merchantId, ":blacklist:");
                            for (_i = 0, cfgs_1 = cfgs_4; _i < cfgs_1.length; _i++) {
                                c = cfgs_1[_i];
                                if (!!((_g = c.value) === null || _g === void 0 ? void 0 : _g.blocked))
                                    blockedSet_1.add(c.key.slice(prefix.length));
                            }
                            candidateIds = candidateIds.filter(function (uid) { return blockedSet_1.has(uid); });
                            _v.label = 3;
                        case 3:
                            where = { id: { in: candidateIds } };
                            if (q.keyword)
                                where.OR = [{ nickname: { contains: q.keyword } }, { phone: { contains: q.keyword } }];
                            if (!(kind === 'promoter')) return [3 /*break*/, 4];
                            where.role = 'promoter';
                            return [3 /*break*/, 7];
                        case 4:
                            if (!(kind === 'member')) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.prisma.systemConfig.findMany({
                                    where: { key: { in: candidateIds.map(function (id) { return "cust_tier_".concat(merchantId, "_").concat(id); }) } },
                                    select: { key: true, value: true },
                                })];
                        case 5:
                            cfgs_5 = _v.sent();
                            memberSet_1 = new Set();
                            prefix = "cust_tier_".concat(merchantId, "_");
                            for (_b = 0, cfgs_2 = cfgs_5; _b < cfgs_2.length; _b++) {
                                c = cfgs_2[_b];
                                tier = String((_j = (_h = c.value) === null || _h === void 0 ? void 0 : _h.priceTier) !== null && _j !== void 0 ? _j : '').toLowerCase();
                                if (tier === 'member' || tier === 'vip') {
                                    memberSet_1.add(c.key.slice(prefix.length));
                                }
                            }
                            where.id = { in: candidateIds.filter(function (id) { return memberSet_1.has(id); }) };
                            return [3 /*break*/, 7];
                        case 6:
                            if (kind === 'normal') {
                                where.role = { notIn: ['promoter'] };
                            }
                            _v.label = 7;
                        case 7: return [4 /*yield*/, Promise.all([
                                this.prisma.user.findMany({ where: where, skip: skip, take: take, orderBy: { createdAt: 'desc' } }),
                                this.prisma.user.count({ where: where }),
                            ])];
                        case 8:
                            _c = _v.sent(), users = _c[0], total = _c[1];
                            if (users.length === 0)
                                return [2 /*return*/, (0, pagination_util_1.buildPage)([], total, page, pageSize)];
                            visibleIds = users.map(function (u) { return u.id; });
                            cfgKeys = visibleIds.flatMap(function (id) { return [
                                "cust_tier_".concat(merchantId, "_").concat(id),
                                "cust_auth_".concat(merchantId, "_").concat(id),
                                "merchant:".concat(merchantId, ":blacklist:").concat(id),
                            ]; });
                            if (!cfgKeys.length) return [3 /*break*/, 10];
                            return [4 /*yield*/, this.prisma.systemConfig.findMany({ where: { key: { in: cfgKeys } } })];
                        case 9:
                            _d = _v.sent();
                            return [3 /*break*/, 11];
                        case 10:
                            _d = [];
                            _v.label = 11;
                        case 11:
                            cfgs = _d;
                            tierMap = new Map();
                            authMap = new Map();
                            blockedMap = new Map();
                            tierPrefix = "cust_tier_".concat(merchantId, "_");
                            authPrefix = "cust_auth_".concat(merchantId, "_");
                            blockedPrefix = "merchant:".concat(merchantId, ":blacklist:");
                            for (_e = 0, cfgs_3 = cfgs; _e < cfgs_3.length; _e++) {
                                c = cfgs_3[_e];
                                if (c.key.startsWith(tierPrefix)) {
                                    tierMap.set(c.key.slice(tierPrefix.length), (_l = (_k = c.value) === null || _k === void 0 ? void 0 : _k.priceTier) !== null && _l !== void 0 ? _l : 'retail');
                                }
                                else if (c.key.startsWith(authPrefix)) {
                                    authMap.set(c.key.slice(authPrefix.length), !!((_m = c.value) === null || _m === void 0 ? void 0 : _m.authorized));
                                }
                                else if (c.key.startsWith(blockedPrefix)) {
                                    blockedMap.set(c.key.slice(blockedPrefix.length), !!((_o = c.value) === null || _o === void 0 ? void 0 : _o.blocked));
                                }
                            }
                            return [4 /*yield*/, this.prisma.order.groupBy({
                                    by: ['userId'],
                                    where: { merchantId: merchantId, userId: { in: visibleIds }, status: { not: 'cancelled' } },
                                    _count: { _all: true },
                                    _sum: { payAmount: true },
                                    _max: { createdAt: true },
                                })];
                        case 12:
                            aggregates = _v.sent();
                            aggMap = new Map();
                            for (_f = 0, aggregates_1 = aggregates; _f < aggregates_1.length; _f++) {
                                a = aggregates_1[_f];
                                aggMap.set(a.userId, {
                                    orderCount: (_q = (_p = a._count) === null || _p === void 0 ? void 0 : _p._all) !== null && _q !== void 0 ? _q : 0,
                                    totalSpent: Number((_s = (_r = a._sum) === null || _r === void 0 ? void 0 : _r.payAmount) !== null && _s !== void 0 ? _s : 0),
                                    lastOrderAt: (_u = (_t = a._max) === null || _t === void 0 ? void 0 : _t.createdAt) !== null && _u !== void 0 ? _u : null,
                                });
                            }
                            return [4 /*yield*/, this.prisma.commissionRule.findFirst({
                                    where: { merchantId: merchantId, productId: null, enabled: true },
                                    select: { id: true },
                                })];
                        case 13:
                            commissionRule = _v.sent();
                            commissionEnabled = !!commissionRule;
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(users.map(function (u) {
                                    var _a, _b, _c;
                                    var agg = aggMap.get(u.id) || { orderCount: 0, totalSpent: 0, lastOrderAt: null };
                                    var tier = (_a = tierMap.get(u.id)) !== null && _a !== void 0 ? _a : 'retail';
                                    return {
                                        id: u.id,
                                        avatar: u.avatar,
                                        nickname: u.nickname,
                                        phone: u.phone,
                                        kind: u.role === 'promoter'
                                            ? 'promoter'
                                            : tier === 'member' || tier === 'vip'
                                                ? 'member'
                                                : 'normal',
                                        priceTier: tier,
                                        priceAuthorized: (_b = authMap.get(u.id)) !== null && _b !== void 0 ? _b : false,
                                        blocked: (_c = blockedMap.get(u.id)) !== null && _c !== void 0 ? _c : false,
                                        orderCount: agg.orderCount,
                                        totalSpent: Math.round(agg.totalSpent * 100) / 100,
                                        lastOrderAt: agg.lastOrderAt,
                                        commissionEnabled: commissionEnabled,
                                    };
                                }), total, page, pageSize)];
                    }
                });
            });
        };
        MerchantService_1.prototype.setCustomerPriceTier = function (merchantId, userId, priceTier) {
            return __awaiter(this, void 0, void 0, function () {
                var key;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            key = "cust_tier_".concat(merchantId, "_").concat(userId);
                            return [4 /*yield*/, this.prisma.systemConfig.upsert({
                                    where: { key: key },
                                    update: { value: { priceTier: priceTier } },
                                    create: { key: key, value: { priceTier: priceTier } },
                                })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        MerchantService_1.prototype.authorizeCustomer = function (merchantId, userId, on) {
            return __awaiter(this, void 0, void 0, function () {
                var key;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            key = "cust_auth_".concat(merchantId, "_").concat(userId);
                            return [4 /*yield*/, this.prisma.systemConfig.upsert({
                                    where: { key: key },
                                    update: { value: { authorized: on } },
                                    create: { key: key, value: { authorized: on } },
                                })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        /**
         * 设置/取消客户黑名单（仅在当前商家维度生效）
         *
         * 不直接改 User.status 的设计理由：
         *   - User.status='disabled' 是全局禁用，会让该用户在其他所有商家也无法下单 / 登录
         *   - 同一个 user 在 A 商家被拉黑、在 B 商家完全正常是常见场景
         *   - 因此采用 SystemConfig key=`merchant:<mid>:blacklist:<userId>` 的局部状态
         *   - value 形如 { blocked: true/false, at: ISO }，方便审计何时拉/解黑
         *
         * 后续若需求要"商家拉黑后该客户在本店无法下单"，可在 createOrder 处 IN 查这些 key 拦截；
         * 当前接口先把状态接通让前端能持久化操作，业务拦截看后续需求再加。
         */
        MerchantService_1.prototype.setCustomerBlacklist = function (merchantId, userId, on) {
            return __awaiter(this, void 0, void 0, function () {
                var key, value;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!userId)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '客户 ID 不能为空');
                            key = "merchant:".concat(merchantId, ":blacklist:").concat(userId);
                            value = { blocked: !!on, at: new Date().toISOString() };
                            return [4 /*yield*/, this.prisma.systemConfig.upsert({
                                    where: { key: key },
                                    update: { value: value },
                                    create: { key: key, value: value },
                                })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { ok: true, blocked: !!on }];
                    }
                });
            });
        };
        // ========== 佣金 ==========
        /**
         * 商家佣金规则
         *
         * 修复 P0-19：之前 productRules 仅返回 productId/level1Percent/level2Percent，
         * 前端必须再发 N 次商品详情接口才能渲染出商品名 + 首图，体验差还容易 N+1。
         * 这里一次性 join Product 表把商品名和首图带回来。
         */
        MerchantService_1.prototype.commissionRules = function (merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                var rules, defaultRule, productRules;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.commissionRule.findMany({
                                where: { merchantId: merchantId },
                                include: {
                                    product: { select: { id: true, name: true, images: true } },
                                },
                            })];
                        case 1:
                            rules = _a.sent();
                            defaultRule = rules.find(function (r) { return !r.productId; }) || null;
                            productRules = rules.filter(function (r) { return r.productId; });
                            return [2 /*return*/, {
                                    default: defaultRule
                                        ? {
                                            level1Percent: defaultRule.level1Percent,
                                            level2Percent: defaultRule.level2Percent,
                                            visibleToPromoter: defaultRule.visibleToPromoter,
                                            allowOffline: defaultRule.allowOffline,
                                            enabled: defaultRule.enabled,
                                        }
                                        : {
                                            level1Percent: 5,
                                            level2Percent: 2,
                                            visibleToPromoter: true,
                                            allowOffline: false,
                                            enabled: true,
                                        },
                                    productRules: productRules.map(function (r) {
                                        var _a, _b, _c, _d, _e;
                                        return ({
                                            productId: r.productId,
                                            productName: (_b = (_a = r.product) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : '',
                                            productImage: (_e = (_d = (_c = r.product) === null || _c === void 0 ? void 0 : _c.images) === null || _d === void 0 ? void 0 : _d[0]) !== null && _e !== void 0 ? _e : '',
                                            level1Percent: r.level1Percent,
                                            level2Percent: r.level2Percent,
                                        });
                                    }),
                                }];
                    }
                });
            });
        };
        MerchantService_1.prototype.saveCommissionRules = function (merchantId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var productIds, owned, d, exist, _i, _a, r, data, exist;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!Array.isArray(dto.productRules)) return [3 /*break*/, 5];
                            productIds = Array.from(new Set(dto.productRules
                                .map(function (rule) { return (typeof (rule === null || rule === void 0 ? void 0 : rule.productId) === 'string' ? rule.productId : ''); })
                                .filter(Boolean)));
                            if (!productIds.length) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.product.count({
                                    where: { id: { in: productIds }, merchantId: merchantId },
                                })];
                        case 1:
                            owned = _c.sent();
                            if (owned !== productIds.length) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '佣金规则包含无权管理的商品');
                            }
                            return [4 /*yield*/, this.prisma.commissionRule.deleteMany({
                                    where: { merchantId: merchantId, productId: { not: null, notIn: productIds } },
                                })];
                        case 2:
                            _c.sent();
                            return [3 /*break*/, 5];
                        case 3: return [4 /*yield*/, this.prisma.commissionRule.deleteMany({
                                where: { merchantId: merchantId, productId: { not: null } },
                            })];
                        case 4:
                            _c.sent();
                            _c.label = 5;
                        case 5:
                            if (!dto.default) return [3 /*break*/, 10];
                            d = {
                                level1Percent: Number(dto.default.level1Percent) || 0,
                                level2Percent: Number(dto.default.level2Percent) || 0,
                            };
                            if (dto.default.visibleToPromoter !== undefined)
                                d.visibleToPromoter = !!dto.default.visibleToPromoter;
                            if (dto.default.allowOffline !== undefined)
                                d.allowOffline = !!dto.default.allowOffline;
                            if (dto.default.enabled !== undefined)
                                d.enabled = !!dto.default.enabled;
                            return [4 /*yield*/, this.prisma.commissionRule.findFirst({
                                    where: { merchantId: merchantId, productId: null },
                                })];
                        case 6:
                            exist = _c.sent();
                            if (!exist) return [3 /*break*/, 8];
                            return [4 /*yield*/, this.prisma.commissionRule.update({ where: { id: exist.id }, data: d })];
                        case 7:
                            _c.sent();
                            return [3 /*break*/, 10];
                        case 8: return [4 /*yield*/, this.prisma.commissionRule.create({ data: __assign({ merchantId: merchantId, productId: null }, d) })];
                        case 9:
                            _c.sent();
                            _c.label = 10;
                        case 10:
                            if (!((_b = dto.productRules) === null || _b === void 0 ? void 0 : _b.length)) return [3 /*break*/, 17];
                            _i = 0, _a = dto.productRules;
                            _c.label = 11;
                        case 11:
                            if (!(_i < _a.length)) return [3 /*break*/, 17];
                            r = _a[_i];
                            if (!(r === null || r === void 0 ? void 0 : r.productId))
                                return [3 /*break*/, 16];
                            data = {
                                level1Percent: Number(r.level1Percent) || 0,
                                level2Percent: Number(r.level2Percent) || 0,
                            };
                            if (r.visibleToPromoter !== undefined)
                                data.visibleToPromoter = !!r.visibleToPromoter;
                            if (r.allowOffline !== undefined)
                                data.allowOffline = !!r.allowOffline;
                            if (r.enabled !== undefined)
                                data.enabled = !!r.enabled;
                            return [4 /*yield*/, this.prisma.commissionRule.findFirst({
                                    where: { merchantId: merchantId, productId: r.productId },
                                })];
                        case 12:
                            exist = _c.sent();
                            if (!exist) return [3 /*break*/, 14];
                            return [4 /*yield*/, this.prisma.commissionRule.update({ where: { id: exist.id }, data: data })];
                        case 13:
                            _c.sent();
                            return [3 /*break*/, 16];
                        case 14: return [4 /*yield*/, this.prisma.commissionRule.create({
                                data: __assign({ merchantId: merchantId, productId: r.productId }, data),
                            })];
                        case 15:
                            _c.sent();
                            _c.label = 16;
                        case 16:
                            _i++;
                            return [3 /*break*/, 11];
                        case 17: return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        /**
         * 商家维度推广概览（merchant-app 首页 / 推广中心 用）
         *
         * Commission 表无 merchantId 字段，按所属订单的 merchantId 关联过滤。
         *
         * - totalCommission：商家所有商品被推广产生的累积佣金（已结算 + 待结算，排除已取消）
         * - monthCommission：本月已结算 / 待结算佣金
         * - promotedOrders：去重订单数（佣金维度）
         * - promotedUsers：去重推广人（user）数量
         *
         * 全部走 Commission 表实时聚合，零 mock。
         */
        MerchantService_1.prototype.promoteSummary = function (merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                var now, monthStart, all, totalCommission, monthCommission, promotedOrders, promotedUsers;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            now = new Date();
                            monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                            return [4 /*yield*/, this.prisma.commission.findMany({
                                    where: {
                                        status: { not: 'cancelled' },
                                        order: { merchantId: merchantId },
                                    },
                                    select: { amount: true, orderId: true, userId: true, createdAt: true },
                                })];
                        case 1:
                            all = _a.sent();
                            totalCommission = all.reduce(function (s, c) { return s + Number(c.amount || 0); }, 0);
                            monthCommission = all
                                .filter(function (c) { return c.createdAt >= monthStart; })
                                .reduce(function (s, c) { return s + Number(c.amount || 0); }, 0);
                            promotedOrders = new Set(all.map(function (c) { return c.orderId; })).size;
                            promotedUsers = new Set(all.map(function (c) { return c.userId; })).size;
                            return [2 /*return*/, {
                                    totalCommission: Math.round(totalCommission * 100) / 100,
                                    monthCommission: Math.round(monthCommission * 100) / 100,
                                    promotedOrders: promotedOrders,
                                    promotedUsers: promotedUsers,
                                }];
                    }
                });
            });
        };
        /**
         * 商家维度 · 佣金明细分页
         *
         * 列出所有"成交订单 → 给推广人结算"的 Commission 记录，关联订单元信息。
         * 用于 merchant-app 推广中心「我家店铺给推广人发了多少佣金」明细查询。
         *
         * Commission 表本身没有 merchantId 字段，按所属 Order.merchantId 关联过滤。
         */
        MerchantService_1.prototype.commissionHistory = function (merchantId, q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, where, _b, list, total;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            where = { order: { merchantId: merchantId } };
                            if (q.status && q.status !== 'all')
                                where.status = q.status;
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.commission.findMany({
                                        where: where,
                                        skip: skip,
                                        take: take,
                                        orderBy: { createdAt: 'desc' },
                                        include: {
                                            order: { select: { id: true, no: true, payAmount: true, status: true, createdAt: true } },
                                            user: { select: { id: true, nickname: true, avatar: true, phone: true } },
                                        },
                                    }),
                                    this.prisma.commission.count({ where: where }),
                                ])];
                        case 1:
                            _b = _c.sent(), list = _b[0], total = _b[1];
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list.map(function (c) {
                                    var _a, _b, _c, _d, _e, _f;
                                    return ({
                                        id: c.id,
                                        orderId: c.orderId,
                                        orderNo: ((_a = c.order) === null || _a === void 0 ? void 0 : _a.no) || '',
                                        orderAmount: Number(((_b = c.order) === null || _b === void 0 ? void 0 : _b.payAmount) || 0),
                                        orderStatus: ((_c = c.order) === null || _c === void 0 ? void 0 : _c.status) || '',
                                        promoterId: c.userId,
                                        promoterName: ((_d = c.user) === null || _d === void 0 ? void 0 : _d.nickname) || '',
                                        promoterAvatar: ((_e = c.user) === null || _e === void 0 ? void 0 : _e.avatar) || '',
                                        promoterPhone: ((_f = c.user) === null || _f === void 0 ? void 0 : _f.phone) || '',
                                        level: c.level,
                                        amount: Number(c.amount),
                                        status: c.status,
                                        settledAt: c.settledAt,
                                        createdAt: c.createdAt,
                                    });
                                }), total, page, pageSize)];
                    }
                });
            });
        };
        /**
         * 商家维度 · 营销活动统一列表
         *
         * 合并 Coupon + FlashSale + GroupBuy 三种营销活动到一个分页结构，
         * 给 merchant-app「营销中心」一站式展示用。
         *
         * - kind 字段：coupon / flashSale / groupBuy 区分类型
         * - status 透传；其他维度字段按各自模型映射到统一 shape
         * - 排序按 createdAt 倒序；分页在合并后再 slice，避免三次跨表 join 复杂度
         *
         * 由于三类活动数据量都不大（单商户量级 < 1k），合并→切片是足够稳妥的做法；
         * 若后续单类型超过 10k 条，再下沉到 SQL UNION。
         */
        MerchantService_1.prototype.marketingActivities = function (merchantId, q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, kindFilter, statusFilter, _b, coupons, flashSales, groupBuys, productIds, productMap, products, _i, products_1, p, unified, _c, coupons_1, c, _d, flashSales_1, f, prod, _e, groupBuys_1, g, prod, total, sliced;
                var _f, _g;
                return __generator(this, function (_h) {
                    switch (_h.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            kindFilter = typeof (q === null || q === void 0 ? void 0 : q.kind) === 'string' ? q.kind : null;
                            statusFilter = (q === null || q === void 0 ? void 0 : q.status) && q.status !== 'all' ? q.status : null;
                            return [4 /*yield*/, Promise.all([
                                    kindFilter && kindFilter !== 'coupon'
                                        ? Promise.resolve([])
                                        : this.prisma.coupon.findMany({
                                            where: __assign({ merchantId: merchantId }, (statusFilter ? { status: statusFilter } : {})),
                                            orderBy: { createdAt: 'desc' },
                                            take: 500,
                                        }),
                                    kindFilter && kindFilter !== 'flashSale'
                                        ? Promise.resolve([])
                                        : this.prisma.flashSale.findMany({
                                            where: __assign({ merchantId: merchantId }, (statusFilter ? { status: statusFilter } : {})),
                                            orderBy: { createdAt: 'desc' },
                                            take: 500,
                                        }),
                                    kindFilter && kindFilter !== 'groupBuy'
                                        ? Promise.resolve([])
                                        : this.prisma.groupBuy.findMany({
                                            where: __assign({ merchantId: merchantId }, (statusFilter ? { status: statusFilter } : {})),
                                            orderBy: { createdAt: 'desc' },
                                            take: 500,
                                        }),
                                ])
                                // FlashSale / GroupBuy 模型在 Prisma 中只有 productId 字段（没有 product 关系），
                                // 一次性把所有用到的 product 查回来做内存 join，避免 N+1
                            ];
                        case 1:
                            _b = _h.sent(), coupons = _b[0], flashSales = _b[1], groupBuys = _b[2];
                            productIds = Array.from(new Set([]
                                .concat(flashSales.map(function (f) { return f.productId; }).filter(Boolean))
                                .concat(groupBuys.map(function (g) { return g.productId; }).filter(Boolean))));
                            productMap = new Map();
                            if (!productIds.length) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.product.findMany({
                                    where: { id: { in: productIds } },
                                    select: { id: true, name: true, images: true },
                                })];
                        case 2:
                            products = _h.sent();
                            for (_i = 0, products_1 = products; _i < products_1.length; _i++) {
                                p = products_1[_i];
                                productMap.set(p.id, p);
                            }
                            _h.label = 3;
                        case 3:
                            unified = [];
                            for (_c = 0, coupons_1 = coupons; _c < coupons_1.length; _c++) {
                                c = coupons_1[_c];
                                unified.push({
                                    id: c.id,
                                    kind: 'coupon',
                                    name: c.name,
                                    status: c.status,
                                    amount: c.amount ? Number(c.amount) : null,
                                    discountPercent: c.discountPercent,
                                    threshold: c.threshold ? Number(c.threshold) : null,
                                    stock: c.stock,
                                    received: c.received,
                                    used: c.used,
                                    validFrom: c.validFrom,
                                    validTo: c.validTo,
                                    scope: c.scope,
                                    createdAt: c.createdAt,
                                });
                            }
                            for (_d = 0, flashSales_1 = flashSales; _d < flashSales_1.length; _d++) {
                                f = flashSales_1[_d];
                                prod = productMap.get(f.productId);
                                unified.push({
                                    id: f.id,
                                    kind: 'flashSale',
                                    name: "\u9650\u65F6\u79D2\u6740\uFF1A".concat((prod === null || prod === void 0 ? void 0 : prod.name) || ''),
                                    status: f.status,
                                    productId: f.productId,
                                    productImage: ((_f = prod === null || prod === void 0 ? void 0 : prod.images) === null || _f === void 0 ? void 0 : _f[0]) || '',
                                    price: Number(f.price),
                                    stock: f.stock,
                                    sold: f.sold,
                                    validFrom: f.startAt,
                                    validTo: f.endAt,
                                    createdAt: f.createdAt,
                                });
                            }
                            for (_e = 0, groupBuys_1 = groupBuys; _e < groupBuys_1.length; _e++) {
                                g = groupBuys_1[_e];
                                prod = productMap.get(g.productId);
                                unified.push({
                                    id: g.id,
                                    kind: 'groupBuy',
                                    name: "\u62FC\u56E2\uFF1A".concat((prod === null || prod === void 0 ? void 0 : prod.name) || ''),
                                    status: g.status,
                                    productId: g.productId,
                                    productImage: ((_g = prod === null || prod === void 0 ? void 0 : prod.images) === null || _g === void 0 ? void 0 : _g[0]) || '',
                                    price: Number(g.price),
                                    groupSize: g.groupSize,
                                    validHours: g.validHours,
                                    createdAt: g.createdAt,
                                });
                            }
                            unified.sort(function (a, b) { return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); });
                            total = unified.length;
                            sliced = unified.slice(skip, skip + take);
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(sliced, total, page, pageSize)];
                    }
                });
            });
        };
        // ========== 提现 ==========
        MerchantService_1.prototype.listWithdraws = function (merchantId, q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, where, _b, list, total;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            where = { merchantId: merchantId };
                            if (q.status)
                                where.status = q.status;
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.withdraw.findMany({
                                        where: where,
                                        skip: skip,
                                        take: take,
                                        orderBy: { createdAt: 'desc' },
                                        // 仅返回展示所需字段，绝不把 passwordHash/openid/unionid 等凭证/PII 带给商家端
                                        include: { user: { select: { id: true, nickname: true, avatar: true, phone: true } } },
                                    }),
                                    this.prisma.withdraw.count({ where: where }),
                                ])];
                        case 1:
                            _b = _c.sent(), list = _b[0], total = _b[1];
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list.map(decimal_util_1.decimalToNumber), total, page, pageSize)];
                    }
                });
            });
        };
        MerchantService_1.prototype.createWithdraw = function (userId, merchantId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var w;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.withdraw.create({
                                data: {
                                    no: (0, id_util_1.withdrawNo)(),
                                    userId: userId,
                                    merchantId: merchantId,
                                    applyAmount: dto.amount,
                                    method: dto.method || 'wechat',
                                    account: dto.account,
                                    status: 'pending',
                                },
                            })];
                        case 1:
                            w = _a.sent();
                            return [2 /*return*/, (0, decimal_util_1.decimalToNumber)(w)];
                    }
                });
            });
        };
        /**
         * @deprecated 商家自审产品语义错误,正确入口是平台审核 /p/withdraws/:id/approve|reject|mark-paid。
         *   保留本接口仅为兼容老 admin-pc / merchant-app 调用,后续版本会下线。
         *
         * P1-3 修复:之前 updateMany 无 affected rows 检查,id 不存在或越权时静默返回 ok=true,
         *   现在校验 r.count===0 即抛 NOT_FOUND,让前端能看到失败原因。
         */
        MerchantService_1.prototype.reviewWithdraw = function (merchantId, id, actualAmount, remark, remarkTags) {
            return __awaiter(this, void 0, void 0, function () {
                var r;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.withdraw.updateMany({
                                where: { id: id, merchantId: merchantId },
                                data: {
                                    status: 'approved',
                                    actualAmount: actualAmount,
                                    remark: remark,
                                    remarkTags: remarkTags || [],
                                    reviewedAt: new Date(),
                                },
                            })];
                        case 1:
                            r = _a.sent();
                            if (r.count === 0) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '提现单不存在或无权限');
                            }
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        /**
         * @deprecated 商家自审 - 同上,等价语义已由 /p/withdraws/:id/reject 接管
         */
        MerchantService_1.prototype.rejectWithdraw = function (merchantId, id, reason) {
            return __awaiter(this, void 0, void 0, function () {
                var r;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.withdraw.updateMany({
                                where: { id: id, merchantId: merchantId },
                                data: { status: 'rejected', remark: reason },
                            })];
                        case 1:
                            r = _a.sent();
                            if (r.count === 0) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '提现单不存在或无权限');
                            }
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        MerchantService_1.prototype.balance = function (merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                var completed, withdrawn, total, out;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.order.aggregate({
                                where: { merchantId: merchantId, status: 'completed' },
                                _sum: { payAmount: true },
                            })];
                        case 1:
                            completed = _a.sent();
                            return [4 /*yield*/, this.prisma.withdraw.aggregate({
                                    where: { merchantId: merchantId, status: 'paid' },
                                    _sum: { actualAmount: true },
                                })];
                        case 2:
                            withdrawn = _a.sent();
                            total = Number(completed._sum.payAmount || 0);
                            out = Number(withdrawn._sum.actualAmount || 0);
                            return [2 /*return*/, { total: total, available: total - out, frozen: 0, withdrawn: out }];
                    }
                });
            });
        };
        // ========== 门店 ==========
        MerchantService_1.prototype.listStores = function (merchantId, q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, where, _b, list, total;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            where = { merchantId: merchantId };
                            if (q.keyword)
                                where.name = { contains: q.keyword };
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.store.findMany({ where: where, skip: skip, take: take, orderBy: { createdAt: 'desc' } }),
                                    this.prisma.store.count({ where: where }),
                                ])];
                        case 1:
                            _b = _c.sent(), list = _b[0], total = _b[1];
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list, total, page, pageSize)];
                    }
                });
            });
        };
        MerchantService_1.prototype.createStore = function (merchantId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.store.create({ data: __assign(__assign({}, dto), { merchantId: merchantId }) })];
                });
            });
        };
        MerchantService_1.prototype.getStore = function (merchantId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var store;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.store.findFirst({ where: { id: id, merchantId: merchantId } })];
                        case 1:
                            store = _a.sent();
                            if (!store)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '门店不存在或无权限');
                            return [2 /*return*/, store];
                    }
                });
            });
        };
        /**
         * 更新门店信息（admin-pc / merchant-app 编辑场景）
         *
         * 越权防护：必须先校验门店属于当前商家，否则 A 商家可改 B 商家门店。
         * 字段白名单：显式剔除 id / merchantId / createdAt / updatedAt，
         * 避免 dto 携带这些字段改门店归属或绕过审计字段。
         */
        MerchantService_1.prototype.updateStore = function (merchantId, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var exist, _a, _ignoreId, _ignoreMid, _ignoreCreatedAt, _ignoreUpdatedAt, data;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.store.findFirst({
                                where: { id: id, merchantId: merchantId },
                                select: { id: true },
                            })];
                        case 1:
                            exist = _b.sent();
                            if (!exist)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '门店不存在或无权限');
                            _a = dto || {}, _ignoreId = _a.id, _ignoreMid = _a.merchantId, _ignoreCreatedAt = _a.createdAt, _ignoreUpdatedAt = _a.updatedAt, data = __rest(_a, ["id", "merchantId", "createdAt", "updatedAt"]);
                            return [2 /*return*/, this.prisma.store.update({ where: { id: id }, data: data })];
                    }
                });
            });
        };
        MerchantService_1.prototype.removeStore = function (merchantId, id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.store.deleteMany({ where: { id: id, merchantId: merchantId } })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        MerchantService_1.prototype.getStoreAuth = function (merchantId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var s;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.store.findFirst({ where: { id: id, merchantId: merchantId } })];
                        case 1:
                            s = _a.sent();
                            if (!s)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '门店不存在');
                            return [2 /*return*/, __assign({ storeId: s.id, level: s.level, visiblePriceTiers: ['retail', 'wholesale'], productPolicies: [], authValidFrom: s.authValidFrom, authValidTo: s.authValidTo }, (s.authConfig || {}))];
                    }
                });
            });
        };
        MerchantService_1.prototype.saveStoreAuth = function (merchantId, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var store, level, tierWhitelist, visiblePriceTiers, authValidFrom, authValidTo, productPolicies, authConfig;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.store.findFirst({
                                where: { id: id, merchantId: merchantId },
                                select: { id: true },
                            })];
                        case 1:
                            store = _a.sent();
                            if (!store)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '门店不存在或无权限');
                            level = ['A', 'B', 'C'].includes(dto === null || dto === void 0 ? void 0 : dto.level) ? dto.level : 'C';
                            tierWhitelist = ['retail', 'wholesale', 'member'];
                            visiblePriceTiers = Array.isArray(dto === null || dto === void 0 ? void 0 : dto.visiblePriceTiers)
                                ? __spreadArray([], new Set(dto.visiblePriceTiers.filter(function (tier) {
                                    return typeof tier === 'string' && tierWhitelist.includes(tier);
                                })), true) : [];
                            if (visiblePriceTiers.length === 0) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请至少选择一种可见价格');
                            }
                            authValidFrom = (dto === null || dto === void 0 ? void 0 : dto.authValidFrom) ? new Date(dto.authValidFrom) : null;
                            authValidTo = (dto === null || dto === void 0 ? void 0 : dto.authValidTo) ? new Date(dto.authValidTo) : null;
                            if (!authValidFrom ||
                                !authValidTo ||
                                Number.isNaN(authValidFrom.getTime()) ||
                                Number.isNaN(authValidTo.getTime()) ||
                                authValidTo < authValidFrom) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '授权有效期不正确');
                            }
                            productPolicies = Array.isArray(dto === null || dto === void 0 ? void 0 : dto.productPolicies)
                                ? dto.productPolicies
                                    .map(function (policy) { return ({
                                    categoryId: String((policy === null || policy === void 0 ? void 0 : policy.categoryId) || ''),
                                    categoryName: typeof (policy === null || policy === void 0 ? void 0 : policy.categoryName) === 'string' ? policy.categoryName : '',
                                    enabled: (policy === null || policy === void 0 ? void 0 : policy.enabled) === true,
                                    markupPercent: Math.max(0, Math.min(100, Number(policy === null || policy === void 0 ? void 0 : policy.markupPercent) || 0)),
                                }); })
                                    .filter(function (policy) { return policy.categoryId; })
                                : [];
                            authConfig = {
                                level: level,
                                visiblePriceTiers: visiblePriceTiers,
                                productPolicies: productPolicies,
                                authValidFrom: dto.authValidFrom,
                                authValidTo: dto.authValidTo,
                            };
                            return [4 /*yield*/, this.prisma.store.update({
                                    where: { id: id },
                                    data: {
                                        level: level,
                                        status: 'active',
                                        authValidFrom: authValidFrom,
                                        authValidTo: authValidTo,
                                        authConfig: authConfig,
                                    },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // ========== 员工 ==========
        MerchantService_1.prototype.listStaffs = function (merchantId, q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, where, _b, list, total;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            where = { merchantId: merchantId };
                            if (q.keyword)
                                where.name = { contains: q.keyword };
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.staff.findMany({ where: where, skip: skip, take: take, orderBy: { createdAt: 'desc' } }),
                                    this.prisma.staff.count({ where: where }),
                                ])];
                        case 1:
                            _b = _c.sent(), list = _b[0], total = _b[1];
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list.map(decimal_util_1.decimalToNumber), total, page, pageSize)];
                    }
                });
            });
        };
        MerchantService_1.prototype.createStaff = function (merchantId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.staff.create({ data: __assign(__assign({}, dto), { merchantId: merchantId }) })];
                });
            });
        };
        MerchantService_1.prototype.updateStaff = function (merchantId, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var exist, _a, _ignoreId, _ignoreMid, data;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.staff.findFirst({
                                where: { id: id, merchantId: merchantId },
                                select: { id: true },
                            })];
                        case 1:
                            exist = _b.sent();
                            if (!exist)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '员工不存在或无权限');
                            _a = dto || {}, _ignoreId = _a.id, _ignoreMid = _a.merchantId, data = __rest(_a, ["id", "merchantId"]);
                            return [2 /*return*/, this.prisma.staff.update({ where: { id: id }, data: data })];
                    }
                });
            });
        };
        MerchantService_1.prototype.removeStaff = function (merchantId, id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.staff.deleteMany({ where: { id: id, merchantId: merchantId } })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // ========== 装修 ==========
        MerchantService_1.prototype.getDecorate = function (merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                var d;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.shopDecorate.findUnique({ where: { merchantId: merchantId } })];
                        case 1:
                            d = _a.sent();
                            if (!!d) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.shopDecorate.create({ data: { merchantId: merchantId } })];
                        case 2:
                            d = _a.sent();
                            _a.label = 3;
                        case 3: return [2 /*return*/, d];
                    }
                });
            });
        };
        MerchantService_1.prototype.saveDecorate = function (merchantId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, _ignoreId, _ignoreMid, data;
                return __generator(this, function (_b) {
                    _a = dto || {}, _ignoreId = _a.id, _ignoreMid = _a.merchantId, data = __rest(_a, ["id", "merchantId"]);
                    return [2 /*return*/, this.prisma.shopDecorate.upsert({
                            where: { merchantId: merchantId },
                            update: data,
                            create: __assign(__assign({}, data), { merchantId: merchantId }),
                        })];
                });
            });
        };
        // ========== 营销 ==========
        /**
         * 商家营销总览
         *
         * 修复 P0-20：之前返回扁平 `flashSales: <count>`，前端拿不到细分维度（活跃/计划/已售）。
         * 现在统一嵌套结构，coupons/flashSales/groupBuys 三个子对象都暴露相同 shape 字段，
         * 即使当前是 0 也保留字段，前端无须做"字段是否存在"的兼容判断。
         *
         * 字段说明：
         *   - coupons.total       全量优惠券
         *   - coupons.active      在售（status=active）
         *   - coupons.totalReceived 累计被领取数
         *   - coupons.totalUsed   累计被核销数
         *   - flashSales.active   当前活跃秒杀
         *   - flashSales.planned  待开始（status=pending）
         *   - flashSales.sold     全平台秒杀累计已售
         *   - groupBuys.active    当前活跃拼团
         *   - groupBuys.planned   待开始
         *   - groupBuys.sold      暂无 sold 字段(schema 无)，固定 0
         */
        MerchantService_1.prototype.marketingOverview = function (merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, coupons, flashSales, groupBuys, couponTotal, couponActive, couponReceived, couponUsed, flashActive, flashPlanned, flashSold, groupActive, groupPlanned;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, Promise.all([
                                this.prisma.coupon.findMany({
                                    where: { merchantId: merchantId },
                                    select: { status: true, received: true, used: true },
                                }),
                                this.prisma.flashSale.findMany({
                                    where: { merchantId: merchantId },
                                    select: { status: true, sold: true },
                                }),
                                this.prisma.groupBuy.findMany({
                                    where: { merchantId: merchantId },
                                    select: { status: true },
                                }),
                            ])];
                        case 1:
                            _a = _b.sent(), coupons = _a[0], flashSales = _a[1], groupBuys = _a[2];
                            couponTotal = coupons.length;
                            couponActive = coupons.filter(function (c) { return c.status === 'active'; }).length;
                            couponReceived = coupons.reduce(function (s, c) { return s + (c.received || 0); }, 0);
                            couponUsed = coupons.reduce(function (s, c) { return s + (c.used || 0); }, 0);
                            flashActive = flashSales.filter(function (f) { return f.status === 'active'; }).length;
                            flashPlanned = flashSales.filter(function (f) { return f.status === 'pending'; }).length;
                            flashSold = flashSales.reduce(function (s, f) { return s + (f.sold || 0); }, 0);
                            groupActive = groupBuys.filter(function (g) { return g.status === 'active'; }).length;
                            groupPlanned = groupBuys.filter(function (g) { return g.status === 'pending'; }).length;
                            return [2 /*return*/, {
                                    coupons: {
                                        total: couponTotal,
                                        active: couponActive,
                                        totalReceived: couponReceived,
                                        totalUsed: couponUsed,
                                    },
                                    flashSales: {
                                        total: flashSales.length,
                                        active: flashActive,
                                        planned: flashPlanned,
                                        sold: flashSold,
                                    },
                                    groupBuys: {
                                        total: groupBuys.length,
                                        active: groupActive,
                                        planned: groupPlanned,
                                        // schema 无 GroupBuy.sold 字段，前端按未来加列预留位
                                        sold: 0,
                                    },
                                }];
                    }
                });
            });
        };
        MerchantService_1.prototype.marketingCoupons = function (merchantId, q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, where, _b, list, total;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            where = { merchantId: merchantId };
                            if (q.status)
                                where.status = q.status;
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.coupon.findMany({ where: where, skip: skip, take: take, orderBy: { createdAt: 'desc' } }),
                                    this.prisma.coupon.count({ where: where }),
                                ])];
                        case 1:
                            _b = _c.sent(), list = _b[0], total = _b[1];
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list.map(decimal_util_1.decimalToNumber), total, page, pageSize)];
                    }
                });
            });
        };
        /**
         * 创建优惠券
         *
         * 设计要点：
         *   - schema 用的是 status enum: pending / active / paused / ended（没有独立 active 布尔字段）
         *     这里 dto 入参约定如下："是否上架"由 status 字段决定，默认 'pending'，
         *     由商家通过 toggleCoupon 切到 'active' / 'paused'
         *   - 必填校验：name / type / validFrom / validTo / threshold（满减/折扣的门槛）
         *   - 金额、折扣按 type 分支校验：
         *       · type='fullReduce' → amount 必填且 >0；discountPercent 可空
         *       · type='discount'   → discountPercent 必填且 ∈ (0, 100)；amount 可空
         *       · type='fixed'      → amount 必填（无门槛 / 满任意减额）
         *   - validFrom < validTo 强校验，避免下发"永远不可用"的券
         *   - stock=0 视为不限量；perUserLimit 默认 1（与 schema 一致）
         *   - merchantId 由 ensureMerchantId 注入，永远不接 dto.merchantId（防越权改归属）
         */
        MerchantService_1.prototype.createCoupon = function (merchantId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var name, type, validFrom, validTo, amount, discountPercent, status, created;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!dto || typeof dto !== 'object') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '参数不合法');
                            }
                            name = String(dto.name || '').trim();
                            type = String(dto.type || '').trim();
                            if (!name)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请填写优惠券名称');
                            if (!['fullReduce', 'discount', 'fixed'].includes(type)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, 'type 必须是 fullReduce / discount / fixed');
                            }
                            validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
                            validTo = dto.validTo ? new Date(dto.validTo) : null;
                            if (!validFrom ||
                                !validTo ||
                                Number.isNaN(validFrom.getTime()) ||
                                Number.isNaN(validTo.getTime())) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请填写有效期 validFrom / validTo');
                            }
                            if (validFrom >= validTo) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '有效期开始时间必须早于结束时间');
                            }
                            amount = dto.amount != null ? Number(dto.amount) : null;
                            discountPercent = dto.discountPercent != null ? Number(dto.discountPercent) : null;
                            if (type === 'fullReduce' && !(amount > 0)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '满减券必须填写减免金额');
                            }
                            if (type === 'discount' && !(discountPercent > 0 && discountPercent < 100)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '折扣券折扣百分比必须在 (0, 100) 区间');
                            }
                            if (type === 'fixed' && !(amount > 0)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '固定金额券必须填写金额');
                            }
                            status = ['pending', 'active', 'paused', 'ended'].includes(dto.status)
                                ? dto.status
                                : 'pending';
                            return [4 /*yield*/, this.prisma.coupon.create({
                                    data: {
                                        merchantId: merchantId,
                                        name: name,
                                        type: type,
                                        amount: amount != null ? amount : undefined,
                                        discountPercent: discountPercent != null ? discountPercent : undefined,
                                        threshold: dto.threshold != null ? Number(dto.threshold) : undefined,
                                        stock: Math.max(0, Math.floor(Number(dto.stock || 0))),
                                        validFrom: validFrom,
                                        validTo: validTo,
                                        perUserLimit: Math.max(0, Math.floor(Number(dto.perUserLimit || 1))),
                                        scope: ['all', 'category', 'product'].includes(dto.scope) ? dto.scope : 'all',
                                        scopeIds: Array.isArray(dto.scopeIds)
                                            ? dto.scopeIds.filter(function (x) { return typeof x === 'string'; })
                                            : [],
                                        status: status,
                                    },
                                })];
                        case 1:
                            created = _a.sent();
                            return [2 /*return*/, (0, decimal_util_1.decimalToNumber)(created)];
                    }
                });
            });
        };
        /**
         * 更新优惠券
         *
         * 重要约束：
         *   - 越权校验：必须先查到 (id, merchantId) 才能改，否则 NOT_FOUND
         *   - 不允许通过本接口改 `used` / `received` / `merchantId` / `id`（这些是运行期统计或归属字段）
         *   - status 改成 'ended' 视作下架（与 toggleCoupon 解耦：后者是 active/paused 切换）
         *   - 修改后端默认时刻校验 validFrom < validTo
         */
        MerchantService_1.prototype.updateCoupon = function (merchantId, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var exist, data, upd;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!dto || typeof dto !== 'object') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '参数不合法');
                            }
                            return [4 /*yield*/, this.prisma.coupon.findFirst({
                                    where: { id: id, merchantId: merchantId },
                                    select: { id: true },
                                })];
                        case 1:
                            exist = _a.sent();
                            if (!exist)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '优惠券不存在或无权限');
                            data = {};
                            if (typeof dto.name === 'string' && dto.name.trim())
                                data.name = dto.name.trim();
                            if (['fullReduce', 'discount', 'fixed'].includes(dto.type))
                                data.type = dto.type;
                            if (dto.amount != null)
                                data.amount = Number(dto.amount);
                            if (dto.discountPercent != null)
                                data.discountPercent = Number(dto.discountPercent);
                            if (dto.threshold != null)
                                data.threshold = Number(dto.threshold);
                            if (dto.stock != null)
                                data.stock = Math.max(0, Math.floor(Number(dto.stock)));
                            if (dto.validFrom)
                                data.validFrom = new Date(dto.validFrom);
                            if (dto.validTo)
                                data.validTo = new Date(dto.validTo);
                            if (dto.perUserLimit != null)
                                data.perUserLimit = Math.max(0, Math.floor(Number(dto.perUserLimit)));
                            if (['all', 'category', 'product'].includes(dto.scope))
                                data.scope = dto.scope;
                            if (Array.isArray(dto.scopeIds)) {
                                data.scopeIds = dto.scopeIds.filter(function (x) { return typeof x === 'string'; });
                            }
                            if (['pending', 'active', 'paused', 'ended'].includes(dto.status))
                                data.status = dto.status;
                            if (data.validFrom && data.validTo && data.validFrom >= data.validTo) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '有效期开始时间必须早于结束时间');
                            }
                            if (Object.keys(data).length === 0)
                                return [2 /*return*/, { ok: true, updated: false }];
                            return [4 /*yield*/, this.prisma.coupon.update({ where: { id: id }, data: data })];
                        case 2:
                            upd = _a.sent();
                            return [2 /*return*/, (0, decimal_util_1.decimalToNumber)(upd)];
                    }
                });
            });
        };
        /**
         * 删除优惠券（软删 - 当前 schema 无 deletedAt/active 布尔，用 status='ended' 当软删）
         *
         * 选 status='ended' 而非物理删除的原因：
         *   - 历史订单的 couponId 仍指向本券，物理删会破坏外键完整性
         *   - 商家「营销 - 已结束」分页仍要能查到已结束券统计
         * 越权校验同 update。
         */
        MerchantService_1.prototype.deleteCoupon = function (merchantId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var exist;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.coupon.findFirst({
                                where: { id: id, merchantId: merchantId },
                                select: { id: true },
                            })];
                        case 1:
                            exist = _a.sent();
                            if (!exist)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '优惠券不存在或无权限');
                            return [4 /*yield*/, this.prisma.coupon.update({ where: { id: id }, data: { status: 'ended' } })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        /**
         * 上下架开关（active <-> paused）
         *
         * - active=true → status='active'（用户端可见可领）
         * - active=false → status='paused'（暂停；不影响已领券用户使用）
         * 与 deleteCoupon 区分：删除是 ended（不可恢复），暂停是 paused（可再启）
         */
        MerchantService_1.prototype.toggleCoupon = function (merchantId, id, active) {
            return __awaiter(this, void 0, void 0, function () {
                var exist;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.coupon.findFirst({
                                where: { id: id, merchantId: merchantId },
                                select: { id: true, status: true },
                            })];
                        case 1:
                            exist = _a.sent();
                            if (!exist)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '优惠券不存在或无权限');
                            if (exist.status === 'ended') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '已结束的优惠券不可再上下架');
                            }
                            return [4 /*yield*/, this.prisma.coupon.update({
                                    where: { id: id },
                                    data: { status: active ? 'active' : 'paused' },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true, status: active ? 'active' : 'paused' }];
                    }
                });
            });
        };
        // ========== 聊天 ==========
        /**
         * 商家端会话列表
         *
         * 修复 P0-16：之前没返最后一条消息内容和对方在线状态，
         * 商家端列表只看见昵称 + 未读数，不知道对方"刚才说了什么"。
         *
         * - lastMessage：最近一条 ChatMessage 内容 + sender + createdAt（O(N) findFirst 单批次）
         * - online：从 ChatGateway 房间快照里查"对方 user 是否有 socket 还在线"
         */
        MerchantService_1.prototype.chatSessions = function (merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                var sessions, sessionIds, recentMsgs, lastBySession, _i, recentMsgs_1, m, onlineMap, _a, sessions_1, s;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.chatSession.findMany({
                                where: { merchantId: merchantId },
                                orderBy: { lastMessageAt: 'desc' },
                                take: 100,
                                include: { user: true },
                            })];
                        case 1:
                            sessions = _b.sent();
                            if (sessions.length === 0)
                                return [2 /*return*/, []];
                            sessionIds = sessions.map(function (s) { return s.id; });
                            return [4 /*yield*/, this.prisma.chatMessage.findMany({
                                    where: { sessionId: { in: sessionIds } },
                                    orderBy: [{ sessionId: 'asc' }, { createdAt: 'desc' }],
                                    distinct: ['sessionId'],
                                })];
                        case 2:
                            recentMsgs = _b.sent();
                            lastBySession = new Map();
                            for (_i = 0, recentMsgs_1 = recentMsgs; _i < recentMsgs_1.length; _i++) {
                                m = recentMsgs_1[_i];
                                lastBySession.set(m.sessionId, m);
                            }
                            onlineMap = new Map();
                            for (_a = 0, sessions_1 = sessions; _a < sessions_1.length; _a++) {
                                s = sessions_1[_a];
                                onlineMap.set(s.userId, this.chat.isUserOnline(s.userId));
                            }
                            return [2 /*return*/, sessions.map(function (s) {
                                    var _a;
                                    var last = lastBySession.get(s.id);
                                    return {
                                        id: s.id,
                                        userId: s.userId,
                                        userName: s.user.nickname,
                                        userAvatar: s.user.avatar,
                                        lastMessageAt: s.lastMessageAt,
                                        unreadCount: s.unreadCount,
                                        status: s.status,
                                        // 修复 P0-16 新增字段
                                        lastMessage: last
                                            ? {
                                                content: last.content,
                                                type: last.type,
                                                sender: last.sender,
                                                createdAt: last.createdAt,
                                            }
                                            : null,
                                        online: (_a = onlineMap.get(s.userId)) !== null && _a !== void 0 ? _a : false,
                                    };
                                })];
                    }
                });
            });
        };
        MerchantService_1.prototype.chatSession = function (merchantId, sessionId) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.chatSession.findFirst({
                                where: { id: sessionId, merchantId: merchantId },
                                include: { user: true },
                            })];
                        case 1:
                            session = _a.sent();
                            if (!session)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '会话不存在');
                            return [2 /*return*/, {
                                    id: session.id,
                                    userId: session.userId,
                                    userName: session.user.nickname,
                                    userAvatar: session.user.avatar,
                                    lastMessageAt: session.lastMessageAt,
                                    unreadCount: session.unreadCount,
                                    status: session.status,
                                    online: this.chat.isUserOnline(session.userId),
                                }];
                    }
                });
            });
        };
        MerchantService_1.prototype.chatMessages = function (merchantId_1, sessionId_1) {
            return __awaiter(this, arguments, void 0, function (merchantId, sessionId, query) {
                var session, requestedSize, pageSize, cursor, cursorRow, rows;
                if (query === void 0) { query = {}; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.chatSession.findFirst({
                                where: { id: sessionId, merchantId: merchantId },
                                select: { id: true },
                            })];
                        case 1:
                            session = _a.sent();
                            if (!session)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '会话不存在');
                            requestedSize = Number(query.pageSize);
                            pageSize = Number.isInteger(requestedSize)
                                ? Math.min(200, Math.max(1, requestedSize))
                                : 200;
                            cursor = String(query.cursor || '').trim();
                            if (!cursor) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.chatMessage.findFirst({
                                    where: { id: cursor, sessionId: sessionId },
                                    select: { id: true },
                                })];
                        case 2:
                            cursorRow = _a.sent();
                            if (!cursorRow)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '消息游标无效');
                            _a.label = 3;
                        case 3: return [4 /*yield*/, this.prisma.chatMessage.findMany(__assign({ where: { sessionId: sessionId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: pageSize }, (cursor ? { cursor: { id: cursor }, skip: 1 } : {})))];
                        case 4:
                            rows = _a.sent();
                            return [2 /*return*/, rows.reverse()];
                    }
                });
            });
        };
        MerchantService_1.prototype.chatSend = function (merchantId, sessionId, type, content) {
            return __awaiter(this, void 0, void 0, function () {
                var s, normalizedType, normalizedContent, m;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.chatSession.findFirst({ where: { id: sessionId, merchantId: merchantId } })];
                        case 1:
                            s = _a.sent();
                            if (!s)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '会话不存在');
                            normalizedType = String(type || 'text').toLowerCase();
                            normalizedContent = String(content || '').trim();
                            if (!['text', 'image', 'quick', 'product', 'order'].includes(normalizedType)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '不支持的消息类型');
                            }
                            if (!normalizedContent)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '消息内容不能为空');
                            if (normalizedContent.length > 1000) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '消息不能超过1000个字符');
                            }
                            if (!(normalizedType === 'text' || normalizedType === 'quick')) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.assertMerchantTextSafe(normalizedContent)];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3: return [4 /*yield*/, this.prisma.chatMessage.create({
                                data: {
                                    sessionId: sessionId,
                                    sender: 'merchant',
                                    type: normalizedType,
                                    content: normalizedContent,
                                    read: false,
                                },
                            })];
                        case 4:
                            m = _a.sent();
                            return [4 /*yield*/, this.prisma.chatSession.update({
                                    where: { id: sessionId },
                                    data: { lastMessageAt: m.createdAt },
                                })
                                // 同步推送给房间(用户端 + 商家其他在线设备);HTTP 链路之前只写 DB,用户要等下次轮询才看得到 → P1 体验断点
                            ];
                        case 5:
                            _a.sent();
                            // 同步推送给房间(用户端 + 商家其他在线设备);HTTP 链路之前只写 DB,用户要等下次轮询才看得到 → P1 体验断点
                            try {
                                this.chat.emitChatMessage(sessionId, m, s);
                            }
                            catch (_b) { }
                            return [2 /*return*/, m];
                    }
                });
            });
        };
        MerchantService_1.prototype.chatRead = function (merchantId, sessionId) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.chatSession.findFirst({
                                where: { id: sessionId, merchantId: merchantId },
                                select: { id: true },
                            })];
                        case 1:
                            session = _a.sent();
                            if (!session)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '会话不存在');
                            return [4 /*yield*/, this.prisma.$transaction([
                                    this.prisma.chatMessage.updateMany({
                                        where: { sessionId: sessionId, sender: 'user', read: false },
                                        data: { read: true },
                                    }),
                                    this.prisma.chatSession.update({
                                        where: { id: sessionId },
                                        data: { unreadCount: 0 },
                                    }),
                                ])];
                        case 2:
                            _a.sent();
                            this.chat.emitReadReceipt(sessionId, 'merchant');
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        MerchantService_1.prototype.quickReplies = function (merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.quickReply.findMany({ where: { merchantId: merchantId }, orderBy: { sort: 'asc' } })];
                });
            });
        };
        // ========== 选品广场 ==========
        MerchantService_1.prototype.internalTestMerchantIds = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, (0, internal_test_merchant_util_1.getInternalTestMerchantIds)(this.prisma)];
                });
            });
        };
        MerchantService_1.prototype.imageThumb = function (url) {
            return (0, image_thumbnail_util_1.thumbnailUrlFor)(url, process.env.S3_PUBLIC_URL || 'http://localhost:9000/jiujiu-mall');
        };
        /**
         * 选品广场商品列表
         *
         * 真实指标修复（之前 agencyCount=0 / isPlatformPushed=false 都是占位）：
         *   - agencyCount：approved 状态的 AgencyApplication 中 productIds 包含当前商品的去重商家数
         *     —— 用 IN + JSON 谓词不优雅且数据库可移植性差，这里取最稳的"内存批量计算"
         *     （选品广场单页 ≤ 20 行，O(N×M) 完全可接受；后续若广场推送规模上来再下沉到 SQL）
         *   - isPlatformPushed：PlazaPush 中 status='active' 且 productIds 包含该商品
         *   - 平台广场上下架（P1-5 引入的 SystemConfig `plaza:product:<id>` 覆盖）也在这里生效：
         *     online=false 的商品视为下架，从结果中过滤掉
         */
        MerchantService_1.prototype.plazaProducts = function (merchantId, q) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, skip, take, page, pageSize, internalIds, where, _b, list, total, productIds, apps, agencySetByProduct, _i, apps_1, a, _c, _d, pid, s, pushes, pushedSet, _e, pushes_1, pp, _f, _g, pid, onlineCfgs, offlineSet, _h, onlineCfgs_1, c, online, mapped;
                var _this = this;
                var _j;
                return __generator(this, function (_k) {
                    switch (_k.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(q), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            return [4 /*yield*/, this.internalTestMerchantIds()];
                        case 1:
                            internalIds = _k.sent();
                            where = { status: 'active' };
                            if (q.factoryId) {
                                if (internalIds.includes(String(q.factoryId)))
                                    return [2 /*return*/, (0, pagination_util_1.buildPage)([], 0, page, pageSize)];
                                where.merchantId = q.factoryId;
                            }
                            else {
                                where.merchantId = { notIn: (0, plaza_filter_options_util_1.excludedPlazaMerchantIds)(merchantId, internalIds) };
                            }
                            if (q.keyword)
                                where.name = { contains: q.keyword, mode: 'insensitive' };
                            if (q.tags)
                                where.tags = { has: String(q.tags) };
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.product.findMany({
                                        where: where,
                                        skip: skip,
                                        take: take,
                                        include: { merchant: true },
                                        orderBy: { sales: 'desc' },
                                    }),
                                    this.prisma.product.count({ where: where }),
                                ])];
                        case 2:
                            _b = _k.sent(), list = _b[0], total = _b[1];
                            if (list.length === 0) {
                                return [2 /*return*/, (0, pagination_util_1.buildPage)([], total, page, pageSize)];
                            }
                            productIds = list.map(function (p) { return p.id; });
                            return [4 /*yield*/, this.prisma.agencyApplication.findMany({
                                    where: { status: 'approved', productIds: { hasSome: productIds } },
                                    select: { merchantId: true, productIds: true },
                                })];
                        case 3:
                            apps = _k.sent();
                            agencySetByProduct = new Map();
                            for (_i = 0, apps_1 = apps; _i < apps_1.length; _i++) {
                                a = apps_1[_i];
                                for (_c = 0, _d = a.productIds; _c < _d.length; _c++) {
                                    pid = _d[_c];
                                    if (!productIds.includes(pid))
                                        continue;
                                    s = agencySetByProduct.get(pid);
                                    if (!s) {
                                        s = new Set();
                                        agencySetByProduct.set(pid, s);
                                    }
                                    s.add(a.merchantId);
                                }
                            }
                            return [4 /*yield*/, this.prisma.plazaPush.findMany({
                                    where: { status: 'active', productIds: { hasSome: productIds } },
                                    select: { productIds: true },
                                })];
                        case 4:
                            pushes = _k.sent();
                            pushedSet = new Set();
                            for (_e = 0, pushes_1 = pushes; _e < pushes_1.length; _e++) {
                                pp = pushes_1[_e];
                                for (_f = 0, _g = pp.productIds; _f < _g.length; _f++) {
                                    pid = _g[_f];
                                    if (productIds.includes(pid))
                                        pushedSet.add(pid);
                                }
                            }
                            return [4 /*yield*/, this.prisma.systemConfig.findMany({
                                    where: { key: { in: productIds.map(function (id) { return "plaza:product:".concat(id); }) } },
                                })];
                        case 5:
                            onlineCfgs = _k.sent();
                            offlineSet = new Set();
                            for (_h = 0, onlineCfgs_1 = onlineCfgs; _h < onlineCfgs_1.length; _h++) {
                                c = onlineCfgs_1[_h];
                                online = !!((_j = c.value) === null || _j === void 0 ? void 0 : _j.online);
                                if (!online)
                                    offlineSet.add(c.key.replace('plaza:product:', ''));
                            }
                            mapped = list
                                .filter(function (p) { return !offlineSet.has(p.id); })
                                .map(function (p) {
                                var _a;
                                return ({
                                    productId: p.id,
                                    productName: p.name,
                                    productImage: p.images[0] || '',
                                    productImageThumb: _this.imageThumb(p.images[0] || ''),
                                    factoryName: p.merchant.name,
                                    factoryId: p.merchantId,
                                    startPrice: Number(p.priceWholesaleMin || p.priceRetailMin),
                                    agencyCount: ((_a = agencySetByProduct.get(p.id)) === null || _a === void 0 ? void 0 : _a.size) || 0,
                                    tags: p.tags,
                                    isPlatformPushed: pushedSet.has(p.id),
                                    suggestMarkupMin: 20,
                                    suggestMarkupMax: 40,
                                    suggestCommission: 5,
                                });
                            });
                            // total 不变（offlineSet 仅小幅过滤当前页；保持原 total 对前端体验更稳）；
                            // 若严格要求 total 一致，可在外层再补一道 count 排除 offline 商品，但 SQL 复杂度上升明显。
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(mapped, total, page, pageSize)];
                    }
                });
            });
        };
        /**
         * 选品广场 · 厂家列表（支持地区 / 品类 / 最低评分筛选）
         *
         * region 例：'辽宁' / '辽宁省' → 模糊匹配 region 字段
         * category 例：'家具' → 命中 categories 数组任意元素
         * minRating: 0~5
         */
        MerchantService_1.prototype.plazaFactories = function (merchantId_1) {
            return __awaiter(this, arguments, void 0, function (merchantId, q) {
                var internalIds, where, factories, agencyRows, _a, agencies, _i, agencyRows_1, row, set, extrasMap, keys, cfgs, _b, cfgs_6, c, mid, followConfig, _c, followedIds, minRating, result;
                var _this = this;
                var _d;
                if (q === void 0) { q = {}; }
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0: return [4 /*yield*/, this.internalTestMerchantIds()];
                        case 1:
                            internalIds = _e.sent();
                            where = {
                                type: 'factory',
                                status: 'active',
                                id: { notIn: (0, plaza_filter_options_util_1.excludedPlazaMerchantIds)(merchantId, internalIds) },
                            };
                            if (q.region)
                                where.region = { contains: q.region, mode: 'insensitive' };
                            if (q.category)
                                where.categories = { has: q.category };
                            if (q.keyword)
                                where.name = { contains: q.keyword, mode: 'insensitive' };
                            return [4 /*yield*/, this.prisma.merchant.findMany({
                                    where: where,
                                    take: 100,
                                    include: { _count: { select: { products: { where: { status: 'active' } } } } },
                                })];
                        case 2:
                            factories = _e.sent();
                            if (!factories.length) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.prisma.agencyApplication.findMany({
                                    where: {
                                        factoryMerchantId: { in: factories.map(function (factory) { return factory.id; }) },
                                        status: 'approved',
                                    },
                                    select: { factoryMerchantId: true, merchantId: true },
                                })];
                        case 3:
                            _a = _e.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            _a = [];
                            _e.label = 5;
                        case 5:
                            agencyRows = _a;
                            agencies = new Map();
                            for (_i = 0, agencyRows_1 = agencyRows; _i < agencyRows_1.length; _i++) {
                                row = agencyRows_1[_i];
                                set = agencies.get(row.factoryMerchantId) || new Set();
                                set.add(row.merchantId);
                                agencies.set(row.factoryMerchantId, set);
                            }
                            extrasMap = new Map();
                            if (!factories.length) return [3 /*break*/, 7];
                            keys = factories.map(function (f) { return "shop:".concat(f.id, ":profile-extras"); });
                            return [4 /*yield*/, this.prisma.systemConfig.findMany({ where: { key: { in: keys } } })];
                        case 6:
                            cfgs = _e.sent();
                            for (_b = 0, cfgs_6 = cfgs; _b < cfgs_6.length; _b++) {
                                c = cfgs_6[_b];
                                mid = c.key.replace(/^shop:|:profile-extras$/g, '');
                                extrasMap.set(mid, c.value || {});
                            }
                            _e.label = 7;
                        case 7:
                            if (!merchantId) return [3 /*break*/, 9];
                            return [4 /*yield*/, this.prisma.systemConfig.findUnique({ where: { key: "shop:".concat(merchantId, ":follow") } })];
                        case 8:
                            _c = _e.sent();
                            return [3 /*break*/, 10];
                        case 9:
                            _c = null;
                            _e.label = 10;
                        case 10:
                            followConfig = _c;
                            followedIds = new Set(Array.isArray((_d = followConfig === null || followConfig === void 0 ? void 0 : followConfig.value) === null || _d === void 0 ? void 0 : _d.followed)
                                ? (followConfig === null || followConfig === void 0 ? void 0 : followConfig.value).followed.filter(function (id) { return typeof id === 'string'; })
                                : []);
                            minRating = typeof q.minRating === 'number' ? q.minRating : 0;
                            result = factories
                                .map(function (f) {
                                var _a;
                                var ex = extrasMap.get(f.id) || {};
                                return {
                                    id: f.id,
                                    name: f.name,
                                    logo: ex.avatar || '',
                                    logoThumb: _this.imageThumb(ex.avatar || ''),
                                    region: f.region,
                                    categories: f.categories,
                                    gmv: Number(f.totalGmv || 0),
                                    rating: typeof ex.rating === 'number' ? ex.rating : 5,
                                    ratingCount: typeof ex.ratingCount === 'number' ? ex.ratingCount : 0,
                                    years: Math.max(1, new Date().getFullYear() - f.createdAt.getFullYear() + 1),
                                    productCount: f._count.products,
                                    agencyCount: ((_a = agencies.get(f.id)) === null || _a === void 0 ? void 0 : _a.size) || 0,
                                    followed: followedIds.has(f.id),
                                    tags: [],
                                };
                            })
                                .filter(function (x) { return x.rating >= minRating; });
                            return [2 /*return*/, result];
                    }
                });
            });
        };
        MerchantService_1.prototype.plazaFilterOptions = function (merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                var internalIds, excludedIds, _a, products, factories, onlineCfgs, _b, offlineIds, productTags, regions, categories;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.internalTestMerchantIds()];
                        case 1:
                            internalIds = _c.sent();
                            excludedIds = (0, plaza_filter_options_util_1.excludedPlazaMerchantIds)(merchantId, internalIds);
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.product.findMany({
                                        where: {
                                            status: 'active',
                                            merchantId: { notIn: excludedIds },
                                            merchant: { is: { type: 'factory', status: 'active' } },
                                        },
                                        select: { id: true, tags: true },
                                        take: 1000,
                                    }),
                                    this.prisma.merchant.findMany({
                                        where: { type: 'factory', status: 'active', id: { notIn: excludedIds } },
                                        select: { region: true, categories: true },
                                        take: 1000,
                                    }),
                                ])];
                        case 2:
                            _a = _c.sent(), products = _a[0], factories = _a[1];
                            if (!products.length) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.prisma.systemConfig.findMany({
                                    where: { key: { in: products.map(function (product) { return "plaza:product:".concat(product.id); }) } },
                                })];
                        case 3:
                            _b = _c.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            _b = [];
                            _c.label = 5;
                        case 5:
                            onlineCfgs = _b;
                            offlineIds = new Set(onlineCfgs
                                .filter(function (cfg) { var _a; return !((_a = cfg.value) === null || _a === void 0 ? void 0 : _a.online); })
                                .map(function (cfg) { return cfg.key.replace('plaza:product:', ''); }));
                            productTags = Array.from(new Set(products
                                .filter(function (product) { return !offlineIds.has(product.id); })
                                .flatMap(function (product) { return product.tags; }))).filter(Boolean);
                            regions = Array.from(new Set(factories.map(function (factory) { return factory.region; }).filter(Boolean)));
                            categories = Array.from(new Set(factories.flatMap(function (factory) { return factory.categories; }))).filter(Boolean);
                            return [2 /*return*/, {
                                    productTags: (0, plaza_filter_options_util_1.filterOptionValues)(productTags),
                                    regions: (0, plaza_filter_options_util_1.filterOptionValues)(regions),
                                    categories: (0, plaza_filter_options_util_1.filterOptionValues)(categories),
                                    ratingOptions: [
                                        { value: '0', label: '不限' },
                                        { value: '3', label: '3分及以上' },
                                        { value: '4', label: '4分及以上' },
                                        { value: '5', label: '5分' },
                                    ],
                                }];
                    }
                });
            });
        };
        MerchantService_1.prototype.plazaFactory = function (merchantId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, f, ex, _b, productCount, agencyCount, followConfig, followed;
                var _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _a = id !== merchantId;
                            if (!_a) return [3 /*break*/, 2];
                            return [4 /*yield*/, (0, internal_test_merchant_util_1.isInternalTestMerchant)(this.prisma, id)];
                        case 1:
                            _a = (_d.sent());
                            _d.label = 2;
                        case 2:
                            if (_a) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '工厂不存在');
                            }
                            return [4 /*yield*/, this.prisma.merchant.findUnique({ where: { id: id } })];
                        case 3:
                            f = _d.sent();
                            if (!f)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '工厂不存在');
                            return [4 /*yield*/, this.getProfileExtras(id)];
                        case 4:
                            ex = _d.sent();
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.product.count({ where: { merchantId: id, status: 'active' } }),
                                    this.prisma.agencyApplication.count({
                                        where: { factoryMerchantId: id, status: 'approved' },
                                    }),
                                    merchantId
                                        ? this.prisma.systemConfig.findUnique({ where: { key: "shop:".concat(merchantId, ":follow") } })
                                        : Promise.resolve(null),
                                ])];
                        case 5:
                            _b = _d.sent(), productCount = _b[0], agencyCount = _b[1], followConfig = _b[2];
                            followed = Array.isArray((_c = followConfig === null || followConfig === void 0 ? void 0 : followConfig.value) === null || _c === void 0 ? void 0 : _c.followed)
                                ? (followConfig === null || followConfig === void 0 ? void 0 : followConfig.value).followed.includes(id)
                                : false;
                            return [2 /*return*/, {
                                    id: f.id,
                                    name: f.name,
                                    logo: ex.avatar || '',
                                    logoThumb: this.imageThumb(ex.avatar || ''),
                                    banner: ex.avatar || '',
                                    region: f.region,
                                    address: f.address,
                                    contact: {
                                        contactName: f.contact,
                                        phone: f.contactPhone,
                                        wechat: '',
                                        email: ex.email || '',
                                        address: f.address,
                                        workTime: '9:00-18:00',
                                    },
                                    contactName: f.contact,
                                    contactPhone: f.contactPhone,
                                    desc: ex.description || '',
                                    categories: f.categories,
                                    qualifications: f.qualifications.map(function (q, i) { return ({ id: String(i), name: '资质', image: q }); }),
                                    tags: [],
                                    gmv: Number(f.totalGmv || 0),
                                    rating: typeof ex.rating === 'number' ? ex.rating : 5,
                                    ratingCount: typeof ex.ratingCount === 'number' ? ex.ratingCount : 0,
                                    years: Math.max(1, new Date().getFullYear() - f.createdAt.getFullYear() + 1),
                                    productCount: productCount,
                                    agencyCount: agencyCount,
                                    monthGmv: Number(f.totalGmv || 0),
                                    followed: followed,
                                }];
                    }
                });
            });
        };
        /** 厂家产品在选品广场的可见性：'stores' 仅门店可看 / 'public' 所有人可看 */
        MerchantService_1.prototype.getPlazaVisibility = function (merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                var ex, scope;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getProfileExtras(merchantId)];
                        case 1:
                            ex = _a.sent();
                            scope = ex.plazaVisibility === 'public' ? 'public' : 'stores';
                            return [2 /*return*/, { scope: scope }];
                    }
                });
            });
        };
        MerchantService_1.prototype.setPlazaVisibility = function (merchantId, scope) {
            return __awaiter(this, void 0, void 0, function () {
                var key, prior, merged;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (scope !== 'stores' && scope !== 'public') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, 'scope 只接受 stores | public');
                            }
                            key = "shop:".concat(merchantId, ":profile-extras");
                            return [4 /*yield*/, this.prisma.systemConfig.findUnique({ where: { key: key } })];
                        case 1:
                            prior = _a.sent();
                            merged = __assign(__assign({}, ((prior === null || prior === void 0 ? void 0 : prior.value) || {})), { plazaVisibility: scope });
                            return [4 /*yield*/, this.prisma.systemConfig.upsert({
                                    where: { key: key },
                                    update: { value: merged },
                                    create: { key: key, value: merged },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true, scope: scope }];
                    }
                });
            });
        };
        /** 用户评价厂家（1-5 分）。简化版：取累积平均，不存逐条评分明细。 */
        MerchantService_1.prototype.rateMerchant = function (targetMerchantId, _raterMerchantId, score) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, key, prior, cur, curRating, curCount, nextCount, nextRating, merged;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = targetMerchantId !== _raterMerchantId;
                            if (!_a) return [3 /*break*/, 2];
                            return [4 /*yield*/, (0, internal_test_merchant_util_1.isInternalTestMerchant)(this.prisma, targetMerchantId)];
                        case 1:
                            _a = (_b.sent());
                            _b.label = 2;
                        case 2:
                            if (_a) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '工厂不存在');
                            }
                            if (!Number.isFinite(score) || score < 1 || score > 5) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '评分必须在 1-5 之间');
                            }
                            key = "shop:".concat(targetMerchantId, ":profile-extras");
                            return [4 /*yield*/, this.prisma.systemConfig.findUnique({ where: { key: key } })];
                        case 3:
                            prior = _b.sent();
                            cur = (prior === null || prior === void 0 ? void 0 : prior.value) || {};
                            curRating = typeof cur.rating === 'number' ? cur.rating : 5;
                            curCount = typeof cur.ratingCount === 'number' ? cur.ratingCount : 0;
                            nextCount = curCount + 1;
                            nextRating = (curRating * curCount + score) / nextCount;
                            merged = __assign(__assign({}, cur), { rating: Math.round(nextRating * 10) / 10, ratingCount: nextCount });
                            return [4 /*yield*/, this.prisma.systemConfig.upsert({
                                    where: { key: key },
                                    update: { value: merged },
                                    create: { key: key, value: merged },
                                })];
                        case 4:
                            _b.sent();
                            return [2 /*return*/, { ok: true, rating: merged.rating, ratingCount: merged.ratingCount }];
                    }
                });
            });
        };
        /**
         * 商家关注/取消关注厂家
         *
         * 真实持久化到 SystemConfig（key=shop:<merchantId>:follow），存放厂家 ID 数组。
         * 与现有 profile-extras / priceRule 等 shop:<id>:* 模式保持一致，避免单独建表。
         *
         * - on=true：加入 followed 列表（去重）
         * - on=false：从 followed 列表移除
         * - 自动忽略对自身的关注请求，防止 GMV 自循环
         */
        MerchantService_1.prototype.followFactory = function (merchantId, id, on) {
            return __awaiter(this, void 0, void 0, function () {
                var key, cfg, cur, list, set, merged;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!merchantId)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '当前账号未关联商家');
                            if (!id)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '缺少厂家 ID');
                            if (id === merchantId) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '不能关注自己');
                            }
                            return [4 /*yield*/, (0, internal_test_merchant_util_1.isInternalTestMerchant)(this.prisma, id)];
                        case 1:
                            if (_a.sent()) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '工厂不存在');
                            }
                            key = "shop:".concat(merchantId, ":follow");
                            return [4 /*yield*/, this.prisma.systemConfig.findUnique({ where: { key: key } })];
                        case 2:
                            cfg = _a.sent();
                            cur = (cfg === null || cfg === void 0 ? void 0 : cfg.value) || {};
                            list = Array.isArray(cur.followed)
                                ? cur.followed.filter(function (x) { return typeof x === 'string'; })
                                : [];
                            set = new Set(list);
                            if (on)
                                set.add(id);
                            else
                                set.delete(id);
                            merged = __assign(__assign({}, cur), { followed: Array.from(set) });
                            return [4 /*yield*/, this.prisma.systemConfig.upsert({
                                    where: { key: key },
                                    update: { value: merged },
                                    create: { key: key, value: merged },
                                })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, { ok: true, followed: on, total: merged.followed.length }];
                    }
                });
            });
        };
        /** 当前商家关注的厂家 ID 列表（merchant-app 关注页用） */
        MerchantService_1.prototype.listFollowedFactories = function (merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                var key, cfg, followed, internalMerchantIds, factories;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!merchantId)
                                return [2 /*return*/, { list: [], total: 0 }];
                            key = "shop:".concat(merchantId, ":follow");
                            return [4 /*yield*/, this.prisma.systemConfig.findUnique({ where: { key: key } })];
                        case 1:
                            cfg = _b.sent();
                            followed = Array.isArray((_a = cfg === null || cfg === void 0 ? void 0 : cfg.value) === null || _a === void 0 ? void 0 : _a.followed)
                                ? (cfg === null || cfg === void 0 ? void 0 : cfg.value).followed.filter(function (x) { return typeof x === 'string'; })
                                : [];
                            if (followed.length === 0)
                                return [2 /*return*/, { list: [], total: 0 }];
                            return [4 /*yield*/, (0, internal_test_merchant_util_1.getInternalTestMerchantIds)(this.prisma)];
                        case 2:
                            internalMerchantIds = _b.sent();
                            return [4 /*yield*/, this.prisma.merchant.findMany({
                                    where: {
                                        id: __assign({ in: followed }, (internalMerchantIds.length ? { notIn: internalMerchantIds } : {})),
                                        status: 'active',
                                    },
                                })];
                        case 3:
                            factories = _b.sent();
                            return [2 /*return*/, {
                                    list: factories.map(function (f) { return ({
                                        id: f.id,
                                        name: f.name,
                                        region: f.region,
                                        categories: f.categories,
                                        gmv: Number(f.totalGmv || 0),
                                    }); }),
                                    total: factories.length,
                                }];
                    }
                });
            });
        };
        MerchantService_1.prototype.applyAgency = function (merchantId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, app;
                var _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _a = dto.factoryId !== merchantId;
                            if (!_a) return [3 /*break*/, 2];
                            return [4 /*yield*/, (0, internal_test_merchant_util_1.isInternalTestMerchant)(this.prisma, dto.factoryId)];
                        case 1:
                            _a = (_d.sent());
                            _d.label = 2;
                        case 2:
                            if (_a) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '工厂不存在');
                            }
                            return [4 /*yield*/, this.prisma.agencyApplication.create({
                                    data: {
                                        merchantId: merchantId,
                                        factoryMerchantId: dto.factoryId,
                                        productIds: dto.productIds || [],
                                        markupPercent: (_b = dto.markupPercent) !== null && _b !== void 0 ? _b : 30,
                                        autoSyncPrice: (_c = dto.autoSyncPrice) !== null && _c !== void 0 ? _c : true,
                                        message: dto.message,
                                        status: 'pending',
                                    },
                                })];
                        case 3:
                            app = _d.sent();
                            return [2 /*return*/, { ok: true, status: app.status, id: app.id }];
                    }
                });
            });
        };
        /** 我的代理申请列表（按 status 过滤可选） */
        MerchantService_1.prototype.myAgencyApplications = function (merchantId_1) {
            return __awaiter(this, arguments, void 0, function (merchantId, q) {
                var where, apps, result, _i, apps_2, a, factory, products, _a, _b, products_2, p, factoryPrice, myRetailPrice;
                var _c, _d, _e, _f, _g, _h;
                if (q === void 0) { q = {}; }
                return __generator(this, function (_j) {
                    switch (_j.label) {
                        case 0:
                            where = { merchantId: merchantId };
                            if (q.status && q.status !== 'all')
                                where.status = q.status;
                            return [4 /*yield*/, this.prisma.agencyApplication.findMany({
                                    where: where,
                                    orderBy: { createdAt: 'desc' },
                                })
                                // 展开成「每个商品一条」结构，方便前端按商品维度展示
                            ];
                        case 1:
                            apps = _j.sent();
                            result = [];
                            _i = 0, apps_2 = apps;
                            _j.label = 2;
                        case 2:
                            if (!(_i < apps_2.length)) return [3 /*break*/, 8];
                            a = apps_2[_i];
                            return [4 /*yield*/, this.prisma.merchant.findUnique({ where: { id: a.factoryMerchantId } })];
                        case 3:
                            factory = _j.sent();
                            if (!a.productIds.length) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.prisma.product.findMany({
                                    where: { id: { in: a.productIds } },
                                    select: {
                                        id: true,
                                        name: true,
                                        images: true,
                                        priceWholesaleMin: true,
                                        priceRetailMin: true,
                                    },
                                })];
                        case 4:
                            _a = _j.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            _a = [];
                            _j.label = 6;
                        case 6:
                            products = _a;
                            for (_b = 0, products_2 = products; _b < products_2.length; _b++) {
                                p = products_2[_b];
                                factoryPrice = Number((_d = (_c = p.priceWholesaleMin) !== null && _c !== void 0 ? _c : p.priceRetailMin) !== null && _d !== void 0 ? _d : 0);
                                myRetailPrice = Math.round(factoryPrice * (1 + a.markupPercent / 100));
                                result.push({
                                    id: "".concat(a.id, ":").concat(p.id),
                                    applicationId: a.id,
                                    productId: p.id,
                                    productName: p.name,
                                    productImage: (_f = (_e = p.images) === null || _e === void 0 ? void 0 : _e[0]) !== null && _f !== void 0 ? _f : '',
                                    factoryId: a.factoryMerchantId,
                                    factoryName: (_g = factory === null || factory === void 0 ? void 0 : factory.name) !== null && _g !== void 0 ? _g : '',
                                    factoryPrice: factoryPrice,
                                    myRetailPrice: myRetailPrice,
                                    markupRatio: a.markupPercent,
                                    syncStatus: a.autoSyncPrice ? 'synced' : 'pending',
                                    status: a.status,
                                    appliedAt: a.createdAt.toISOString(),
                                });
                            }
                            // 兼容空 productIds：仍然返回一条占位
                            if (!products.length) {
                                result.push({
                                    id: a.id,
                                    applicationId: a.id,
                                    productId: '',
                                    productName: '(代理申请整体)',
                                    productImage: '',
                                    factoryId: a.factoryMerchantId,
                                    factoryName: (_h = factory === null || factory === void 0 ? void 0 : factory.name) !== null && _h !== void 0 ? _h : '',
                                    factoryPrice: 0,
                                    myRetailPrice: 0,
                                    markupRatio: a.markupPercent,
                                    syncStatus: a.autoSyncPrice ? 'synced' : 'pending',
                                    status: a.status,
                                    appliedAt: a.createdAt.toISOString(),
                                });
                            }
                            _j.label = 7;
                        case 7:
                            _i++;
                            return [3 /*break*/, 2];
                        case 8: return [2 /*return*/, result];
                    }
                });
            });
        };
        MerchantService_1.prototype.updateAgencyApplication = function (merchantId, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, appId, _b, productId, app, data, next;
                var _this = this;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = id.split(':', 2), appId = _a[0], _b = _a[1], productId = _b === void 0 ? '' : _b;
                            return [4 /*yield*/, this.prisma.agencyApplication.findFirst({ where: { id: appId, merchantId: merchantId } })];
                        case 1:
                            app = _c.sent();
                            if (!app)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '代理申请不存在');
                            if (productId && !app.productIds.includes(productId)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '代理商品不存在');
                            }
                            data = {};
                            if (typeof dto.markupRatio === 'number')
                                data.markupPercent = dto.markupRatio;
                            if (dto.status && ['pending', 'approved', 'rejected', 'offline'].includes(dto.status)) {
                                data.status = dto.status;
                            }
                            if (!Object.keys(data).length)
                                return [2 /*return*/, { ok: true }];
                            if (!(productId && app.productIds.length > 1)) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, tx.agencyApplication.update({
                                                    where: { id: appId },
                                                    data: { productIds: app.productIds.filter(function (candidate) { return candidate !== productId; }) },
                                                })];
                                            case 1:
                                                _a.sent();
                                                return [2 /*return*/, tx.agencyApplication.create({
                                                        data: __assign({ merchantId: app.merchantId, factoryMerchantId: app.factoryMerchantId, productIds: [productId], markupPercent: app.markupPercent, autoSyncPrice: app.autoSyncPrice, message: app.message, status: app.status }, data),
                                                    })];
                                        }
                                    });
                                }); })];
                        case 2:
                            next = _c.sent();
                            return [2 /*return*/, { ok: true, id: "".concat(next.id, ":").concat(productId) }];
                        case 3: return [4 /*yield*/, this.prisma.agencyApplication.update({ where: { id: appId }, data: data })];
                        case 4:
                            _c.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        MerchantService_1.prototype.cancelAgencyApplication = function (merchantId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, appId, _b, productId, app;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = id.split(':', 2), appId = _a[0], _b = _a[1], productId = _b === void 0 ? '' : _b;
                            return [4 /*yield*/, this.prisma.agencyApplication.findFirst({ where: { id: appId, merchantId: merchantId } })];
                        case 1:
                            app = _c.sent();
                            if (!app)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '代理申请不存在');
                            if (productId && !app.productIds.includes(productId)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '代理商品不存在');
                            }
                            if (!(productId && app.productIds.length > 1)) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.agencyApplication.update({
                                    where: { id: appId },
                                    data: { productIds: app.productIds.filter(function (candidate) { return candidate !== productId; }) },
                                })];
                        case 2:
                            _c.sent();
                            return [3 /*break*/, 5];
                        case 3: return [4 /*yield*/, this.prisma.agencyApplication.delete({ where: { id: appId } })];
                        case 4:
                            _c.sent();
                            _c.label = 5;
                        case 5: return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        // ========== 商户资料 ==========
        MerchantService_1.prototype.getProfile = function (merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                var m, extras;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.merchant.findUnique({ where: { id: merchantId } })];
                        case 1:
                            m = _a.sent();
                            if (!m)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '商户不存在');
                            return [4 /*yield*/, this.getProfileExtras(merchantId)];
                        case 2:
                            extras = _a.sent();
                            return [2 /*return*/, {
                                    shopName: m.name,
                                    merchantNo: m.id.slice(-6).toUpperCase(),
                                    contactName: m.contact,
                                    contactPhone: m.contactPhone,
                                    address: m.address,
                                    categories: m.categories,
                                    legalName: m.legalName,
                                    creditCode: m.creditCode,
                                    region: m.region,
                                    level: m.level,
                                    credit: m.credit,
                                    status: m.status,
                                    type: m.type,
                                    // 来自 SystemConfig 扩展（schema 中无字段）
                                    email: extras.email || '',
                                    description: extras.description || '',
                                    avatar: extras.avatar || '',
                                    rating: typeof extras.rating === 'number' ? extras.rating : 5,
                                    ratingCount: typeof extras.ratingCount === 'number' ? extras.ratingCount : 0,
                                    latitude: typeof extras.latitude === 'number' ? extras.latitude : null,
                                    longitude: typeof extras.longitude === 'number' ? extras.longitude : null,
                                }];
                    }
                });
            });
        };
        MerchantService_1.prototype.getProfileExtras = function (merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                var cfg;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.systemConfig.findUnique({
                                where: { key: "shop:".concat(merchantId, ":profile-extras") },
                            })];
                        case 1:
                            cfg = _a.sent();
                            return [2 /*return*/, (cfg === null || cfg === void 0 ? void 0 : cfg.value) || {}];
                    }
                });
            });
        };
        MerchantService_1.prototype.updateProfile = function (merchantId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var data, extras, key, prior, merged;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.assertMerchantTextSafe(dto === null || dto === void 0 ? void 0 : dto.shopName)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.assertMerchantTextSafe(dto === null || dto === void 0 ? void 0 : dto.contactName)];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, this.assertMerchantTextSafe(dto === null || dto === void 0 ? void 0 : dto.description)];
                        case 3:
                            _a.sent();
                            data = {};
                            if (typeof dto.shopName === 'string')
                                data.name = dto.shopName;
                            if (typeof dto.contactName === 'string')
                                data.contact = dto.contactName;
                            if (typeof dto.contactPhone === 'string')
                                data.contactPhone = dto.contactPhone;
                            if (typeof dto.address === 'string')
                                data.address = dto.address;
                            if (typeof dto.region === 'string')
                                data.region = dto.region;
                            if (Array.isArray(dto.categories))
                                data.categories = dto.categories;
                            if (!Object.keys(data).length) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.prisma.merchant.update({ where: { id: merchantId }, data: data })];
                        case 4:
                            _a.sent();
                            _a.label = 5;
                        case 5:
                            extras = {};
                            if (typeof dto.email === 'string')
                                extras.email = dto.email;
                            if (typeof dto.description === 'string')
                                extras.description = dto.description;
                            if (typeof dto.avatar === 'string')
                                extras.avatar = dto.avatar;
                            if (typeof dto.latitude === 'number' && Number.isFinite(dto.latitude))
                                extras.latitude = dto.latitude;
                            if (typeof dto.longitude === 'number' && Number.isFinite(dto.longitude))
                                extras.longitude = dto.longitude;
                            if (!Object.keys(extras).length) return [3 /*break*/, 8];
                            key = "shop:".concat(merchantId, ":profile-extras");
                            return [4 /*yield*/, this.prisma.systemConfig.findUnique({ where: { key: key } })];
                        case 6:
                            prior = _a.sent();
                            merged = __assign(__assign({}, ((prior === null || prior === void 0 ? void 0 : prior.value) || {})), extras);
                            return [4 /*yield*/, this.prisma.systemConfig.upsert({
                                    where: { key: key },
                                    update: { value: merged },
                                    create: { key: key, value: merged },
                                })];
                        case 7:
                            _a.sent();
                            _a.label = 8;
                        case 8: return [2 /*return*/, this.getProfile(merchantId)];
                    }
                });
            });
        };
        // ========== 店铺级价格显示规则 ==========
        MerchantService_1.prototype.getShopPriceRule = function (merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                var cfg, DEFAULT;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.systemConfig.findUnique({
                                where: { key: "shop:".concat(merchantId, ":priceRule") },
                            })];
                        case 1:
                            cfg = _a.sent();
                            DEFAULT = {
                                guestAllow: false,
                                customerPrice: 'retail',
                                agencyPrice: 'wholesale',
                                memberPrice: 'member',
                            };
                            return [2 /*return*/, __assign(__assign({}, DEFAULT), ((cfg === null || cfg === void 0 ? void 0 : cfg.value) || {}))];
                    }
                });
            });
        };
        MerchantService_1.prototype.setShopPriceRule = function (merchantId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var key, prior, merged;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            key = "shop:".concat(merchantId, ":priceRule");
                            return [4 /*yield*/, this.prisma.systemConfig.findUnique({ where: { key: key } })];
                        case 1:
                            prior = _a.sent();
                            merged = __assign(__assign({}, ((prior === null || prior === void 0 ? void 0 : prior.value) || {})), dto);
                            return [4 /*yield*/, this.prisma.systemConfig.upsert({
                                    where: { key: key },
                                    update: { value: merged },
                                    create: { key: key, value: merged },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, merged];
                    }
                });
            });
        };
        // ========== 功能开关 ==========
        MerchantService_1.prototype.resolveFeatureFlags = function (merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                var flags, overrides, overrideMap, merchant, result, _i, flags_1, f, enabled, hash, groupKey, shortKey;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.featureFlag.findMany()];
                        case 1:
                            flags = _a.sent();
                            return [4 /*yield*/, this.prisma.merchantFeatureOverride.findMany({ where: { merchantId: merchantId } })];
                        case 2:
                            overrides = _a.sent();
                            overrideMap = new Map(overrides.map(function (o) { return [o.flagKey, o.enabled]; }));
                            return [4 /*yield*/, this.prisma.merchant.findUnique({ where: { id: merchantId } })];
                        case 3:
                            merchant = _a.sent();
                            result = { homeEntry: {}, roleButton: {}, sideMenu: {} };
                            for (_i = 0, flags_1 = flags; _i < flags_1.length; _i++) {
                                f = flags_1[_i];
                                enabled = f.defaultEnabled;
                                if (overrideMap.has(f.key)) {
                                    enabled = overrideMap.get(f.key);
                                }
                                else {
                                    // 受众过滤
                                    if (f.audience === 'factory' && (merchant === null || merchant === void 0 ? void 0 : merchant.type) !== 'factory')
                                        enabled = false;
                                    if (f.audience === 'store' && (merchant === null || merchant === void 0 ? void 0 : merchant.type) !== 'store')
                                        enabled = false;
                                    if (f.audience === 'specific' && !f.specificMerchantIds.includes(merchantId))
                                        enabled = false;
                                    // 灰度比例
                                    if (enabled && f.grayPercent < 100) {
                                        if (!f.grayWhitelist.includes(merchantId)) {
                                            hash = merchantId.split('').reduce(function (a, c) { return a + c.charCodeAt(0); }, 0) % 100;
                                            if (hash >= f.grayPercent)
                                                enabled = false;
                                        }
                                    }
                                }
                                groupKey = f.group === 'home_entry'
                                    ? 'homeEntry'
                                    : f.group === 'role_button'
                                        ? 'roleButton'
                                        : 'sideMenu';
                                shortKey = f.key.split('.').slice(-1)[0];
                                result[groupKey][shortKey] = enabled;
                            }
                            return [2 /*return*/, result];
                    }
                });
            });
        };
        // ========== 会员 ==========
        MerchantService_1.prototype.memberPlans = function (language) {
            return __awaiter(this, void 0, void 0, function () {
                var plans;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.memberPlan.findMany({
                                where: { status: 'active' },
                                orderBy: { sort: 'asc' },
                            })];
                        case 1:
                            plans = _a.sent();
                            return [2 /*return*/, (0, decimal_util_1.decimalToNumber)(plans.map(function (plan) { return localizeMemberPlan(plan, language); }))];
                    }
                });
            });
        };
        /**
         * 当前订阅;同时给出嵌套和扁平字段,兼容多端:
         *   - merchant-app 用 m.plan.* (嵌套)
         *   - admin-pc/PC 视图用 planName/planType/price/merchantName/totalDays/subscribedAt (扁平)
         */
        MerchantService_1.prototype.myMembership = function (merchantId, language) {
            return __awaiter(this, void 0, void 0, function () {
                var m, totalDays, plan;
                var _a, _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0: return [4 /*yield*/, this.prisma.merchantMembership.findFirst({
                                where: { merchantId: merchantId, status: { in: ['trial', 'active'] } },
                                orderBy: { createdAt: 'desc' },
                                include: { plan: true, merchant: true },
                            })];
                        case 1:
                            m = _e.sent();
                            if (!m)
                                return [2 /*return*/, null];
                            totalDays = Math.max(1, Math.ceil((m.endAt.getTime() - m.startAt.getTime()) / 86400000));
                            plan = m.plan ? localizeMemberPlan(m.plan, language) : null;
                            return [2 /*return*/, (0, decimal_util_1.decimalToNumber)(__assign(__assign({}, m), { plan: plan, planName: (_a = plan === null || plan === void 0 ? void 0 : plan.name) !== null && _a !== void 0 ? _a : '', planType: (_b = plan === null || plan === void 0 ? void 0 : plan.type) !== null && _b !== void 0 ? _b : '', price: plan ? Number(plan.price) : 0, merchantName: (_d = (_c = m.merchant) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : '', totalDays: totalDays, subscribedAt: m.createdAt }))];
                    }
                });
            });
        };
        /**
         * 月度配额:同时返回扁平 (pushSlotsLimit/Used 等) 和嵌套 (limits/used) 两种 shape,
         * 让 merchant-app 和 admin-pc 都能直接用,无须额外适配。
         */
        MerchantService_1.prototype.quota = function (merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                var now, periodStart, periodEnd, q, m, limits, dataObj;
                var _a, _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            now = new Date();
                            periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
                            periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                            return [4 /*yield*/, this.prisma.usageQuota.findFirst({
                                    where: { merchantId: merchantId, periodStart: { lte: now }, periodEnd: { gte: now } },
                                })];
                        case 1:
                            q = _f.sent();
                            if (!!q) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.myMembership(merchantId)];
                        case 2:
                            m = _f.sent();
                            limits = ((_a = m === null || m === void 0 ? void 0 : m.plan) === null || _a === void 0 ? void 0 : _a.constraints) || {
                                pushSlots: 10,
                                bannerLimit: 3,
                                impressionLimit: 10000,
                            };
                            return [4 /*yield*/, this.prisma.usageQuota.create({
                                    data: {
                                        merchantId: merchantId,
                                        periodStart: periodStart,
                                        periodEnd: periodEnd,
                                        pushSlotsLimit: (_b = limits.pushSlots) !== null && _b !== void 0 ? _b : 0,
                                        bannerLimit: (_c = limits.bannerLimit) !== null && _c !== void 0 ? _c : 0,
                                        impressionLimit: (_d = limits.impressionLimit) !== null && _d !== void 0 ? _d : 0,
                                        data: limits,
                                    },
                                })];
                        case 3:
                            q = _f.sent();
                            _f.label = 4;
                        case 4:
                            dataObj = q.data || {};
                            return [2 /*return*/, __assign(__assign({}, q), { monthStart: q.periodStart, limits: {
                                        pushSlots: q.pushSlotsLimit,
                                        bannerLimit: q.bannerLimit,
                                        impressionLimit: q.impressionLimit,
                                        weightLimit: Number((_e = dataObj.weightLimit) !== null && _e !== void 0 ? _e : 0),
                                    }, used: {
                                        pushSlots: q.pushSlotsUsed,
                                        bannerLimit: q.bannerUsed,
                                        impressionLimit: q.impressionUsed,
                                    } })];
                    }
                });
            });
        };
        /** 缴费记录;加 payMethod 别名兼容 admin-pc 视图 */
        MerchantService_1.prototype.myPayments = function (merchantId, language) {
            return __awaiter(this, void 0, void 0, function () {
                var list;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.paymentRecord.findMany({
                                where: { merchantId: merchantId },
                                include: { plan: true },
                                orderBy: { createdAt: 'desc' },
                                take: 100,
                            })];
                        case 1:
                            list = _a.sent();
                            return [2 /*return*/, list.map(function (record) {
                                    var plan = record.plan, payment = __rest(record, ["plan"]);
                                    var localizedPlan = plan ? localizeMemberPlan(plan, language) : null;
                                    return (0, decimal_util_1.decimalToNumber)(__assign(__assign({}, payment), { planName: (localizedPlan === null || localizedPlan === void 0 ? void 0 : localizedPlan.name) || payment.planName, payMethod: payment.paymentMethod }));
                                })];
                    }
                });
            });
        };
        MerchantService_1.prototype.membershipNotices = function (merchantId, language) {
            return __awaiter(this, void 0, void 0, function () {
                var q, english, notices;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.quota(merchantId)];
                        case 1:
                            q = _a.sent();
                            english = isEnglishLocale(language);
                            notices = [];
                            if (q.pushSlotsLimit > 0 && q.pushSlotsUsed >= q.pushSlotsLimit * 0.8) {
                                notices.push({
                                    type: 'warn',
                                    text: english
                                        ? "Featured plaza slots used: ".concat(q.pushSlotsUsed, "/").concat(q.pushSlotsLimit)
                                        : "\u5E7F\u573A\u63A8\u8350\u6B21\u6570\u5DF2\u7528 ".concat(q.pushSlotsUsed, "/").concat(q.pushSlotsLimit),
                                    link: '/merchant/member',
                                });
                            }
                            if (q.bannerLimit > 0 && q.bannerUsed >= q.bannerLimit) {
                                notices.push({
                                    type: 'error',
                                    text: english ? 'Banner quota has been fully used' : 'Banner 配额已用尽',
                                    link: '/merchant/member',
                                });
                            }
                            return [2 /*return*/, notices];
                    }
                });
            });
        };
        /**
         * 商户开通 / 续费 / 升级会员套餐 —— 真实下单接入微信支付。
         *
         * 严格安全策略（资金 P0）：
         *   - 不分环境：未配置 wxpay → BizException 拒绝（不再有"非生产自动激活"的 bypass）
         *   - 真实流程：创建 PaymentRecord(pending) → 调 wxpay JSAPI 拿 miniPay 参数返回前端
         *     → 用户在微信付完款 → /payments/wechat/notify 回调 → activateMembership(recordId) 真正激活
         *
         * 返回字段：
         *   { ok, paymentNo, recordId, miniPay }
         *   前端用 uni.requestPayment(miniPay) 调起支付，并轮询 /membership/payments/:no/status
         *   直到 status='paid' 才显示激活成功。
         */
        MerchantService_1.prototype.subscribe = function (merchantId, userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var plan, merchant, user, openid, paymentNo, record, miniPay, e_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (dto.clientPlatform && !['mp-weixin', 'android'].includes(dto.clientPlatform)) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '不支持的支付客户端');
                            }
                            // 首版 Android 正式包暂不接微信 App 支付。必须在创建 PaymentRecord 之前拒绝，
                            // 避免客户端误用小程序 JSAPI 参数并留下永远 pending 的资金记录。
                            if (dto.clientPlatform === 'android') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, 'Android 支付即将开放');
                            }
                            return [4 /*yield*/, this.prisma.memberPlan.findUnique({ where: { id: dto.planId } })];
                        case 1:
                            plan = _a.sent();
                            if (!plan)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '套餐不存在');
                            if (plan.status !== 'active') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '套餐已下架');
                            }
                            return [4 /*yield*/, this.prisma.merchant.findUnique({ where: { id: merchantId } })];
                        case 2:
                            merchant = _a.sent();
                            if (!merchant)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '商户不存在');
                            if (merchant.status !== 'active') {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '当前商户状态不允许开通会员');
                            }
                            // 资金 P0：不分环境强制要求支付通道已配置；否则不创建记录直接拒绝
                            if (!this.wxpay.isReady()) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '未配置支付通道，请联系运维配置微信支付');
                            }
                            return [4 /*yield*/, this.prisma.user.findUnique({ where: { id: userId } })];
                        case 3:
                            user = _a.sent();
                            openid = (user === null || user === void 0 ? void 0 : user.openid) || '';
                            if (!openid) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '当前账号未绑定微信，请先在「我的-账号绑定」中绑定微信后再开通会员');
                            }
                            paymentNo = (0, id_util_1.membershipNo)();
                            return [4 /*yield*/, this.prisma.paymentRecord.create({
                                    data: {
                                        no: paymentNo,
                                        merchantId: merchantId,
                                        planId: plan.id,
                                        planName: plan.name,
                                        planType: plan.type,
                                        amount: plan.price,
                                        paymentMethod: dto.payMethod || 'wechat',
                                        status: 'pending',
                                    },
                                })];
                        case 4:
                            record = _a.sent();
                            _a.label = 5;
                        case 5:
                            _a.trys.push([5, 7, , 9]);
                            return [4 /*yield*/, this.wxpay.createMiniPay({
                                    outTradeNo: paymentNo,
                                    description: "\u5F00\u901A".concat(plan.name),
                                    totalFen: Math.round(Number(plan.price) * 100),
                                    openid: openid,
                                    attach: "membership:".concat(record.id),
                                })];
                        case 6:
                            miniPay = _a.sent();
                            return [3 /*break*/, 9];
                        case 7:
                            e_2 = _a.sent();
                            // wxpay 调用失败 → 清理 pending 记录，避免堆积无效订单
                            return [4 /*yield*/, this.prisma.paymentRecord.delete({ where: { id: record.id } }).catch(function () { })];
                        case 8:
                            // wxpay 调用失败 → 清理 pending 记录，避免堆积无效订单
                            _a.sent();
                            throw new biz_exception_1.BizException(biz_exception_1.BizCode.PAY_FAILED, "\u5F00\u901A\u4F1A\u5458\u5931\u8D25\uFF1A".concat((e_2 === null || e_2 === void 0 ? void 0 : e_2.message) || e_2));
                        case 9: return [2 /*return*/, {
                                ok: true,
                                paymentNo: paymentNo,
                                recordId: record.id,
                                paymentMode: 'miniapp',
                                miniPay: miniPay,
                            }];
                    }
                });
            });
        };
        /**
         * 真正"激活会员"的入口；只能被以下两个地方调用：
         *   - 微信支付回调（payment.controller.ts wechatNotify）成功后
         *   - 非生产兜底（subscribe 内部）
         *
         * 幂等：重复调用同一 recordId 不会重复扣账或重复创建订阅。
         *
         * 续费规则：如果当前已有同套餐 active 订阅 → 在 endAt 基础上叠加；
         *           不同套餐 → 把旧的标 expired，新建一条 active。
         */
        MerchantService_1.prototype.activateMembership = function (recordId) {
            return __awaiter(this, void 0, void 0, function () {
                var record, latest, plan, merchantId, sub;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.paymentRecord.findUnique({
                                where: { id: recordId },
                                include: { plan: true },
                            })];
                        case 1:
                            record = _a.sent();
                            if (!record)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '支付记录不存在');
                            if (!(record.status === 'paid')) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.merchantMembership.findFirst({
                                    where: { merchantId: record.merchantId, planId: record.planId || undefined },
                                    orderBy: { createdAt: 'desc' },
                                })];
                        case 2:
                            latest = _a.sent();
                            return [2 /*return*/, { ok: true, subscription: latest ? (0, decimal_util_1.decimalToNumber)(latest) : null, alreadyPaid: true }];
                        case 3:
                            if (!record.plan) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '套餐已被删除，无法激活');
                            }
                            plan = record.plan;
                            merchantId = record.merchantId;
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var existing, startAt, endAt;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: 
                                            // 1. 标支付记录为已付
                                            return [4 /*yield*/, tx.paymentRecord.update({
                                                    where: { id: recordId },
                                                    data: { status: 'paid', paidAt: new Date() },
                                                })
                                                // 2. 查同套餐已存在的 active 订阅 → 续费叠加
                                            ];
                                            case 1:
                                                // 1. 标支付记录为已付
                                                _a.sent();
                                                return [4 /*yield*/, tx.merchantMembership.findFirst({
                                                        where: {
                                                            merchantId: merchantId,
                                                            planId: plan.id,
                                                            status: { in: ['trial', 'active'] },
                                                        },
                                                        orderBy: { endAt: 'desc' },
                                                    })];
                                            case 2:
                                                existing = _a.sent();
                                                startAt = existing && existing.endAt > new Date() ? existing.endAt : new Date();
                                                endAt = new Date(startAt);
                                                if (plan.period === 'monthly')
                                                    endAt.setMonth(endAt.getMonth() + plan.periodCount);
                                                else if (plan.period === 'yearly')
                                                    endAt.setFullYear(endAt.getFullYear() + plan.periodCount);
                                                else if (plan.period === 'weekly')
                                                    endAt.setDate(endAt.getDate() + 7 * plan.periodCount);
                                                else if (plan.period === 'daily')
                                                    endAt.setDate(endAt.getDate() + plan.periodCount);
                                                else
                                                    endAt.setFullYear(endAt.getFullYear() + 100);
                                                if (existing) {
                                                    return [2 /*return*/, tx.merchantMembership.update({
                                                            where: { id: existing.id },
                                                            data: { endAt: endAt, status: 'active' },
                                                        })];
                                                }
                                                // 3. 不同套餐 / 没有订阅 → 先把其他 active 订阅置 expired，再新建
                                                return [4 /*yield*/, tx.merchantMembership.updateMany({
                                                        where: {
                                                            merchantId: merchantId,
                                                            status: { in: ['trial', 'active'] },
                                                            NOT: { planId: plan.id },
                                                        },
                                                        data: { status: 'expired' },
                                                    })];
                                            case 3:
                                                // 3. 不同套餐 / 没有订阅 → 先把其他 active 订阅置 expired，再新建
                                                _a.sent();
                                                return [2 /*return*/, tx.merchantMembership.create({
                                                        data: {
                                                            merchantId: merchantId,
                                                            planId: plan.id,
                                                            planCode: plan.code,
                                                            startAt: startAt,
                                                            endAt: endAt,
                                                            status: 'active',
                                                        },
                                                    })];
                                        }
                                    });
                                }); })];
                        case 4:
                            sub = _a.sent();
                            return [2 /*return*/, { ok: true, subscription: (0, decimal_util_1.decimalToNumber)(sub) }];
                    }
                });
            });
        };
        /**
         * 前端轮询支付状态：merchant-app 拉起 wxpay 成功后，调这个接口确认
         * PaymentRecord 是否已被回调激活。
         */
        MerchantService_1.prototype.getMembershipPaymentStatus = function (merchantId, no) {
            return __awaiter(this, void 0, void 0, function () {
                var record;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.paymentRecord.findFirst({
                                where: { no: no, merchantId: merchantId },
                                select: {
                                    id: true,
                                    no: true,
                                    planName: true,
                                    amount: true,
                                    status: true,
                                    paidAt: true,
                                    createdAt: true,
                                },
                            })];
                        case 1:
                            record = _a.sent();
                            if (!record)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '支付记录不存在');
                            return [2 /*return*/, (0, decimal_util_1.decimalToNumber)(record)];
                    }
                });
            });
        };
        MerchantService_1.prototype.cancelSub = function (merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.merchantMembership.updateMany({
                                where: { merchantId: merchantId, status: { in: ['trial', 'active'] } },
                                data: { status: 'expired' },
                            })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        MerchantService_1.prototype.setAutoRenew = function (merchantId, autoRenew) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.merchantMembership.updateMany({
                                where: { merchantId: merchantId, status: { in: ['trial', 'active'] } },
                                data: { autoRenew: autoRenew },
                            })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        MerchantService_1.prototype.useQuota = function (merchantId_1, key_1) {
            return __awaiter(this, arguments, void 0, function (merchantId, key, count) {
                var q, map, m, used, limit, refreshed;
                var _a;
                if (count === void 0) { count = 1; }
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.quota(merchantId)];
                        case 1:
                            q = _b.sent();
                            map = {
                                pushSlots: { used: 'pushSlotsUsed', limit: 'pushSlotsLimit' },
                                banner: { used: 'bannerUsed', limit: 'bannerLimit' },
                                bannerLimit: { used: 'bannerUsed', limit: 'bannerLimit' },
                                impression: { used: 'impressionUsed', limit: 'impressionLimit' },
                                impressionLimit: { used: 'impressionUsed', limit: 'impressionLimit' },
                            };
                            m = map[key];
                            if (!m)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, "\u672A\u77E5\u914D\u989D key: ".concat(key));
                            used = q[m.used];
                            limit = q[m.limit];
                            if (limit > 0 && used + count > limit) {
                                return [2 /*return*/, { ok: false, reason: '配额不足', quota: q }];
                            }
                            return [4 /*yield*/, this.prisma.usageQuota.update({
                                    where: { id: q.id },
                                    data: (_a = {}, _a[m.used] = { increment: count }, _a),
                                })];
                        case 2:
                            _b.sent();
                            return [4 /*yield*/, this.quota(merchantId)];
                        case 3:
                            refreshed = _b.sent();
                            return [2 /*return*/, { ok: true, quota: refreshed }];
                    }
                });
            });
        };
        MerchantService_1.prototype.releaseQuota = function (merchantId_1, key_1) {
            return __awaiter(this, arguments, void 0, function (merchantId, key, count) {
                var q, map, field;
                var _a, _b;
                if (count === void 0) { count = 1; }
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.quota(merchantId)];
                        case 1:
                            q = _c.sent();
                            map = {
                                pushSlots: 'pushSlotsUsed',
                                banner: 'bannerUsed',
                                bannerLimit: 'bannerUsed',
                                impression: 'impressionUsed',
                                impressionLimit: 'impressionUsed',
                            };
                            field = map[key];
                            if (!field)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, "\u672A\u77E5\u914D\u989D key: ".concat(key));
                            return [4 /*yield*/, this.prisma.usageQuota.update({
                                    where: { id: q.id },
                                    data: (_a = {}, _a[field] = { decrement: count }, _a),
                                })];
                        case 2:
                            _c.sent();
                            _b = { ok: true };
                            return [4 /*yield*/, this.quota(merchantId)];
                        case 3: return [2 /*return*/, (_b.quota = _c.sent(), _b)];
                    }
                });
            });
        };
        return MerchantService_1;
    }());
    __setFunctionName(_classThis, "MerchantService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MerchantService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MerchantService = _classThis;
}();
exports.MerchantService = MerchantService;
