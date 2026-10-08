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
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var client_1 = require("@prisma/client");
var internal_test_merchant_util_1 = require("../src/common/utils/internal-test-merchant.util");
var prisma = new client_1.PrismaClient();
var ALLOWED_PHONE = '18195819181';
var PREFIX = 'qa1819';
var BACKUP_PATH = '/root/secure/jiujiu-test-account-18195819181-before.json';
function parseArgs(argv) {
    var args = argv.filter(function (arg) { return arg !== '--'; });
    var phoneEq = args.find(function (arg) { return arg.startsWith('--phone='); });
    var phoneIndex = args.indexOf('--phone');
    var phone = (phoneEq === null || phoneEq === void 0 ? void 0 : phoneEq.slice('--phone='.length)) || (phoneIndex >= 0 ? args[phoneIndex + 1] : '');
    return {
        phone: phone,
        reset: args.includes('--reset'),
        confirmProduction: args.includes('--confirm-production'),
    };
}
function daysAgo(days, hours) {
    if (hours === void 0) { hours = 0; }
    return new Date(Date.now() - (days * 24 + hours) * 60 * 60000);
}
function safeBackup(payload) {
    if ((0, node_fs_1.existsSync)(BACKUP_PATH))
        return false;
    (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(BACKUP_PATH), { recursive: true, mode: 448 });
    (0, node_fs_1.writeFileSync)(BACKUP_PATH, "".concat(JSON.stringify(payload, null, 2), "\n"), {
        encoding: 'utf8',
        mode: 384,
        flag: 'wx',
    });
    return true;
}
function clearTestMerchantData(tx, merchantId) {
    return __awaiter(this, void 0, void 0, function () {
        var productRows, productIds, orderRows, orderIds, orderItemRows, orderItemIds, couponRows, couponIds, sessionRows, sessionIds, syntheticUserIds;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, tx.product.findMany({
                        where: { merchantId: merchantId },
                        select: { id: true },
                    })];
                case 1:
                    productRows = _a.sent();
                    productIds = productRows.map(function (row) { return row.id; });
                    return [4 /*yield*/, tx.order.findMany({ where: { merchantId: merchantId }, select: { id: true } })];
                case 2:
                    orderRows = _a.sent();
                    orderIds = orderRows.map(function (row) { return row.id; });
                    return [4 /*yield*/, tx.orderItem.findMany({
                            where: { orderId: { in: orderIds } },
                            select: { id: true },
                        })];
                case 3:
                    orderItemRows = _a.sent();
                    orderItemIds = orderItemRows.map(function (row) { return row.id; });
                    return [4 /*yield*/, tx.coupon.findMany({ where: { merchantId: merchantId }, select: { id: true } })];
                case 4:
                    couponRows = _a.sent();
                    couponIds = couponRows.map(function (row) { return row.id; });
                    return [4 /*yield*/, tx.chatSession.findMany({
                            where: { merchantId: merchantId },
                            select: { id: true },
                        })];
                case 5:
                    sessionRows = _a.sent();
                    sessionIds = sessionRows.map(function (row) { return row.id; });
                    syntheticUserIds = Array.from({ length: 3 }, function (_, i) { return "".concat(PREFIX, "_customer_").concat(i + 1); });
                    return [4 /*yield*/, tx.orderShare.deleteMany({ where: { merchantId: merchantId } })];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, tx.refund.deleteMany({
                            where: {
                                OR: [
                                    { merchantId: merchantId },
                                    { orderId: { in: orderIds } },
                                    { orderItemId: { in: orderItemIds } },
                                    { userId: { in: syntheticUserIds } },
                                ],
                            },
                        })];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, tx.payment.deleteMany({ where: { orderId: { in: orderIds } } })];
                case 8:
                    _a.sent();
                    return [4 /*yield*/, tx.commission.deleteMany({
                            where: { OR: [{ orderId: { in: orderIds } }, { userId: { in: syntheticUserIds } }] },
                        })];
                case 9:
                    _a.sent();
                    return [4 /*yield*/, tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } })];
                case 10:
                    _a.sent();
                    return [4 /*yield*/, tx.order.deleteMany({
                            where: { OR: [{ merchantId: merchantId }, { userId: { in: syntheticUserIds } }] },
                        })];
                case 11:
                    _a.sent();
                    return [4 /*yield*/, tx.userCoupon.deleteMany({
                            where: { OR: [{ couponId: { in: couponIds } }, { userId: { in: syntheticUserIds } }] },
                        })];
                case 12:
                    _a.sent();
                    return [4 /*yield*/, tx.favorite.deleteMany({
                            where: { OR: [{ productId: { in: productIds } }, { userId: { in: syntheticUserIds } }] },
                        })];
                case 13:
                    _a.sent();
                    return [4 /*yield*/, tx.cartItem.deleteMany({
                            where: { OR: [{ productId: { in: productIds } }, { userId: { in: syntheticUserIds } }] },
                        })];
                case 14:
                    _a.sent();
                    return [4 /*yield*/, tx.chatMessage.deleteMany({ where: { sessionId: { in: sessionIds } } })];
                case 15:
                    _a.sent();
                    return [4 /*yield*/, tx.chatSession.deleteMany({
                            where: { OR: [{ merchantId: merchantId }, { userId: { in: syntheticUserIds } }] },
                        })];
                case 16:
                    _a.sent();
                    return [4 /*yield*/, tx.quickReply.deleteMany({ where: { merchantId: merchantId } })];
                case 17:
                    _a.sent();
                    return [4 /*yield*/, tx.agencyApplication.deleteMany({
                            where: { OR: [{ merchantId: merchantId }, { factoryMerchantId: merchantId }] },
                        })];
                case 18:
                    _a.sent();
                    return [4 /*yield*/, tx.flashSale.deleteMany({ where: { merchantId: merchantId } })];
                case 19:
                    _a.sent();
                    return [4 /*yield*/, tx.groupBuy.deleteMany({ where: { merchantId: merchantId } })];
                case 20:
                    _a.sent();
                    return [4 /*yield*/, tx.commissionRule.deleteMany({ where: { merchantId: merchantId } })];
                case 21:
                    _a.sent();
                    return [4 /*yield*/, tx.coupon.deleteMany({ where: { merchantId: merchantId } })];
                case 22:
                    _a.sent();
                    return [4 /*yield*/, tx.sku.deleteMany({ where: { productId: { in: productIds } } })];
                case 23:
                    _a.sent();
                    return [4 /*yield*/, tx.auditRecord.deleteMany({
                            where: { OR: [{ targetId: merchantId }, { targetId: { in: productIds } }] },
                        })];
                case 24:
                    _a.sent();
                    return [4 /*yield*/, tx.product.deleteMany({ where: { merchantId: merchantId } })];
                case 25:
                    _a.sent();
                    return [4 /*yield*/, tx.withdraw.deleteMany({
                            where: { OR: [{ merchantId: merchantId }, { userId: { in: syntheticUserIds } }] },
                        })];
                case 26:
                    _a.sent();
                    return [4 /*yield*/, tx.booking.deleteMany({
                            where: { OR: [{ merchantId: merchantId }, { userId: { in: syntheticUserIds } }] },
                        })];
                case 27:
                    _a.sent();
                    return [4 /*yield*/, tx.store.deleteMany({ where: { merchantId: merchantId } })];
                case 28:
                    _a.sent();
                    return [4 /*yield*/, tx.staff.deleteMany({ where: { merchantId: merchantId } })];
                case 29:
                    _a.sent();
                    return [4 /*yield*/, tx.shopDecorate.deleteMany({ where: { merchantId: merchantId } })];
                case 30:
                    _a.sent();
                    return [4 /*yield*/, tx.merchantFeatureOverride.deleteMany({ where: { merchantId: merchantId } })];
                case 31:
                    _a.sent();
                    return [4 /*yield*/, tx.paymentRecord.deleteMany({ where: { merchantId: merchantId } })];
                case 32:
                    _a.sent();
                    return [4 /*yield*/, tx.usageQuota.deleteMany({ where: { merchantId: merchantId } })];
                case 33:
                    _a.sent();
                    return [4 /*yield*/, tx.merchantMembership.deleteMany({ where: { merchantId: merchantId } })];
                case 34:
                    _a.sent();
                    return [4 /*yield*/, tx.adCreative.deleteMany({ where: { merchantId: merchantId } })];
                case 35:
                    _a.sent();
                    return [4 /*yield*/, tx.address.deleteMany({ where: { userId: { in: syntheticUserIds } } })];
                case 36:
                    _a.sent();
                    return [4 /*yield*/, tx.user.deleteMany({ where: { id: { in: syntheticUserIds } } })];
                case 37:
                    _a.sent();
                    return [4 /*yield*/, tx.systemConfig.deleteMany({
                            where: {
                                OR: [
                                    { key: { startsWith: "shop:".concat(merchantId, ":") } },
                                    { key: { startsWith: "cust_tier_".concat(merchantId, "_") } },
                                    { key: { startsWith: "cust_auth_".concat(merchantId, "_") } },
                                    { key: { startsWith: "merchant:".concat(merchantId, ":blacklist:") } },
                                    { key: { startsWith: "".concat(PREFIX, ":").concat(merchantId, ":") } },
                                ],
                            },
                        })];
                case 38:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function provision() {
    return __awaiter(this, void 0, void 0, function () {
        var options, user, merchant, backupCreated, originalPasswordHash, category, adProPlan, externalFactories, _a, after, summary, products, skus, orders, refunds, stores, staffs, coupons, chats, agencies, memberships;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    options = parseArgs(process.argv.slice(2));
                    if (options.phone !== ALLOWED_PHONE) {
                        throw new Error("\u5B89\u5168\u95E8\u7981\uFF1A\u8BE5\u547D\u4EE4\u53EA\u5141\u8BB8\u624B\u673A\u53F7 ".concat(ALLOWED_PHONE));
                    }
                    if (!options.reset || !options.confirmProduction) {
                        throw new Error('安全门禁：必须同时提供 --reset 与 --confirm-production');
                    }
                    if (!process.env.DATABASE_URL)
                        throw new Error('DATABASE_URL 未加载');
                    return [4 /*yield*/, prisma.user.findUnique({ where: { phone: ALLOWED_PHONE } })];
                case 1:
                    user = _b.sent();
                    if (!user)
                        throw new Error("\u624B\u673A\u53F7 ".concat(ALLOWED_PHONE, " \u4E0D\u5B58\u5728\uFF0C\u62D2\u7EDD\u81EA\u52A8\u521B\u5EFA\u751F\u4EA7\u7528\u6237"));
                    if (!user.passwordHash)
                        throw new Error('目标账号尚未设置密码，拒绝继续');
                    return [4 /*yield*/, prisma.merchant.findUnique({ where: { userId: user.id } })];
                case 2:
                    merchant = _b.sent();
                    if (!merchant)
                        throw new Error('目标账号没有既有 Merchant，拒绝自动新建或绑定其他商户');
                    backupCreated = safeBackup({
                        backedUpAt: new Date().toISOString(),
                        purpose: '18195819181 内部测试账号配置前快照',
                        user: user,
                        merchant: merchant,
                    });
                    originalPasswordHash = user.passwordHash;
                    return [4 /*yield*/, prisma.category.findFirst({
                            where: { type: 'platform' },
                            orderBy: [{ parentId: 'asc' }, { sort: 'asc' }],
                        })];
                case 3:
                    category = _b.sent();
                    if (!category)
                        throw new Error('生产库没有平台分类，无法安全创建商品');
                    return [4 /*yield*/, prisma.memberPlan.findFirst({
                            where: { code: 'ad_pro', status: 'active' },
                        })];
                case 4:
                    adProPlan = _b.sent();
                    if (!adProPlan)
                        throw new Error('生产库缺少启用中的 ad_pro 套餐');
                    return [4 /*yield*/, prisma.merchant.findMany({
                            where: { id: { not: merchant.id }, status: 'active' },
                            select: { id: true },
                            take: 3,
                            orderBy: { createdAt: 'asc' },
                        })];
                case 5:
                    externalFactories = _b.sent();
                    return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                            var marker, markerIds, nextMarkerIds, customerRows, skuCounts, productNames, statuses, productIds, skuIds, i, productId, bySize, base, j, skuId, orderStatuses, orderItems, i, orderId, itemId, userId, productIndex, skuId, amount, status_1, createdAt, isPaid, isShipped, refundStatuses, refundOrderIndexes, i, order, commissionStatuses, i, withdrawalStatuses, i, couponStatuses, i, i, sessionId, factoryFallbacks, agencyStatuses, i, startAt, endAt, periodStart, periodEnd, memberPaymentStatuses, i, systemConfigs, i, _i, systemConfigs_1, config;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, clearTestMerchantData(tx, merchant.id)];
                                    case 1:
                                        _a.sent();
                                        return [4 /*yield*/, tx.systemConfig.findUnique({
                                                where: { key: internal_test_merchant_util_1.INTERNAL_TEST_MERCHANTS_KEY },
                                            })];
                                    case 2:
                                        marker = _a.sent();
                                        markerIds = (0, internal_test_merchant_util_1.parseInternalTestMerchantIds)(marker === null || marker === void 0 ? void 0 : marker.value);
                                        nextMarkerIds = Array.from(new Set(__spreadArray(__spreadArray([], markerIds, true), [merchant.id], false)));
                                        return [4 /*yield*/, tx.systemConfig.upsert({
                                                where: { key: internal_test_merchant_util_1.INTERNAL_TEST_MERCHANTS_KEY },
                                                update: { value: nextMarkerIds },
                                                create: { key: internal_test_merchant_util_1.INTERNAL_TEST_MERCHANTS_KEY, value: nextMarkerIds },
                                            })];
                                    case 3:
                                        _a.sent();
                                        return [4 /*yield*/, tx.user.update({
                                                where: { id: user.id },
                                                data: { role: 'super-admin', merchantId: merchant.id, status: 'active' },
                                            })];
                                    case 4:
                                        _a.sent();
                                        return [4 /*yield*/, tx.merchant.update({
                                                where: { id: merchant.id },
                                                data: {
                                                    type: 'factory',
                                                    name: '【内部测试】全功能门窗厂',
                                                    legalName: '经纬内部测试门窗制造有限公司',
                                                    creditCode: 'QA1819000000000001',
                                                    legalRep: '内部测试员',
                                                    contact: '全功能测试负责人',
                                                    contactPhone: ALLOWED_PHONE,
                                                    region: '宁夏回族自治区银川市',
                                                    address: '金凤区内部测试路 1819 号（非真实地址）',
                                                    businessLicense: 'https://picsum.photos/seed/qa1819-license/900/1200',
                                                    qualifications: [
                                                        'https://picsum.photos/seed/qa1819-cert-1/900/1200',
                                                        'https://picsum.photos/seed/qa1819-cert-2/900/1200',
                                                    ],
                                                    categories: ['系统门窗', '断桥铝门窗', '阳光房', '入户门'],
                                                    status: 'active',
                                                    level: 'A',
                                                    credit: 'A',
                                                    rejectRate: 1.5,
                                                    totalGmv: 368520.88,
                                                    rejectReason: null,
                                                    trialEndAt: new Date(Date.now() + 365 * 86400000),
                                                },
                                            })];
                                    case 5:
                                        _a.sent();
                                        customerRows = [
                                            { id: "".concat(PREFIX, "_customer_1"), nickname: '【测试客户】高意向业主', role: 'customer' },
                                            { id: "".concat(PREFIX, "_customer_2"), nickname: '【测试客户】渠道代理', role: 'promoter' },
                                            { id: "".concat(PREFIX, "_customer_3"), nickname: '【测试客户】黑名单客户', role: 'customer' },
                                        ];
                                        return [4 /*yield*/, tx.user.createMany({
                                                data: customerRows.map(function (row, i) { return (__assign(__assign({}, row), { avatar: "https://picsum.photos/seed/qa1819-customer-".concat(i + 1, "/200/200"), gender: i === 1 ? 2 : 1, status: 'active' })); }),
                                            })];
                                    case 6:
                                        _a.sent();
                                        return [4 /*yield*/, tx.address.createMany({
                                                data: customerRows.map(function (row, i) { return ({
                                                    id: "".concat(PREFIX, "_address_").concat(i + 1),
                                                    userId: row.id,
                                                    name: row.nickname.replace('【测试客户】', ''),
                                                    phone: "1810000181".concat(i),
                                                    region: '宁夏回族自治区 银川市 金凤区',
                                                    detail: "\u5185\u90E8\u6D4B\u8BD5\u5C0F\u533A ".concat(i + 1, " \u680B 1819 \u5BA4\uFF08\u975E\u771F\u5B9E\u5730\u5740\uFF09"),
                                                    longitude: 106.2309 + i * 0.01,
                                                    latitude: 38.4872 + i * 0.01,
                                                    isDefault: true,
                                                }); }),
                                            })];
                                    case 7:
                                        _a.sent();
                                        skuCounts = [3, 3, 3, 3, 3, 2, 2, 2, 2, 2];
                                        productNames = [
                                            '断桥铝 80 系列系统窗',
                                            '极窄边框推拉门',
                                            '铝包木静音窗',
                                            '全景阳光房顶窗',
                                            '智能提升推拉门',
                                            '防火入户门',
                                            '内开内倒纱窗一体窗',
                                            '庭院电动平移门',
                                            '圆弧异形景观窗',
                                            '工程款节能窗',
                                        ];
                                        statuses = [
                                            'active',
                                            'active',
                                            'active',
                                            'active',
                                            'offline',
                                            'draft',
                                            'auditing',
                                            'rejected',
                                            'active',
                                            'offline',
                                        ];
                                        productIds = [];
                                        skuIds = [];
                                        i = 0;
                                        _a.label = 8;
                                    case 8:
                                        if (!(i < productNames.length)) return [3 /*break*/, 14];
                                        productId = "".concat(PREFIX, "_product_").concat(String(i + 1).padStart(2, '0'));
                                        bySize = [0, 3, 8].includes(i);
                                        base = 680 + i * 115;
                                        return [4 /*yield*/, tx.product.create({
                                                data: {
                                                    id: productId,
                                                    merchantId: merchant.id,
                                                    categoryId: category.id,
                                                    name: "\u3010\u6D4B\u8BD5\u3011".concat(productNames[i]),
                                                    description: "qa1819 \u5168\u529F\u80FD\u6D4B\u8BD5\u5546\u54C1 ".concat(i + 1, "\uFF0C\u4EC5\u5728\u5185\u90E8\u5546\u5BB6\u540E\u53F0\u5C55\u793A\u3002"),
                                                    images: ["https://picsum.photos/seed/qa1819-product-".concat(i + 1, "/900/900")],
                                                    detailImages: [
                                                        "https://picsum.photos/seed/qa1819-detail-".concat(i + 1, "-1/900/1200"),
                                                        "https://picsum.photos/seed/qa1819-detail-".concat(i + 1, "-2/900/1200"),
                                                    ],
                                                    tags: ['内部测试', bySize ? '按尺寸计价' : '标准规格', i % 2 ? '热销' : '新品'],
                                                    priceRetailMin: base,
                                                    priceRetailMax: base + 360,
                                                    priceWholesaleMin: base * 0.78,
                                                    priceWholesaleMax: (base + 360) * 0.78,
                                                    priceMemberMin: base * 0.9,
                                                    priceMemberMax: (base + 360) * 0.9,
                                                    pricingMode: bySize ? 'by-size' : 'standard',
                                                    pricePerSqm: bySize ? base : null,
                                                    minLength: bySize ? 0.5 : null,
                                                    minWidth: bySize ? 0.5 : null,
                                                    maxLength: bySize ? 6 : null,
                                                    maxWidth: bySize ? 4 : null,
                                                    baseFee: bySize ? 300 : null,
                                                    sizeUnit: bySize ? 'm' : null,
                                                    status: statuses[i],
                                                    totalStock: 120 + i * 15,
                                                    sales: i * 17 + 8,
                                                    commentCount: i * 3,
                                                    shipping: ['factory', 'local', 'pickup'],
                                                    priceDisplayRules: {
                                                        guestVisible: false,
                                                        customerTier: 'retail',
                                                        agencyTier: 'wholesale',
                                                        memberTier: 'member',
                                                    },
                                                    rejectReason: statuses[i] === 'rejected' ? '【测试】详情参数不完整' : null,
                                                    autoApproved: false,
                                                    createdAt: daysAgo(29 - i * 2),
                                                },
                                            })];
                                    case 9:
                                        _a.sent();
                                        productIds.push(productId);
                                        j = 0;
                                        _a.label = 10;
                                    case 10:
                                        if (!(j < skuCounts[i])) return [3 /*break*/, 13];
                                        skuId = "".concat(PREFIX, "_sku_").concat(String(i + 1).padStart(2, '0'), "_").concat(j + 1);
                                        return [4 /*yield*/, tx.sku.create({
                                                data: {
                                                    id: skuId,
                                                    productId: productId,
                                                    specs: bySize
                                                        ? { color: ['砂灰', '曜石黑', '香槟金'][j], glass: '双层中空 Low-E' }
                                                        : { color: ['砂灰', '曜石黑', '香槟金'][j], size: "".concat(120 + j * 30, "cm") },
                                                    specsLabel: "".concat(['砂灰', '曜石黑', '香槟金'][j], " / ").concat(bySize ? '双层中空玻璃' : "".concat(120 + j * 30, "cm")),
                                                    image: "https://picsum.photos/seed/qa1819-sku-".concat(i + 1, "-").concat(j + 1, "/500/500"),
                                                    priceWholesale: (base + j * 120) * 0.78,
                                                    priceRetail: base + j * 120,
                                                    priceMember: (base + j * 120) * 0.9,
                                                    stock: 30 + i * 3 + j * 8,
                                                    active: !(statuses[i] === 'offline' && j === 0),
                                                },
                                            })];
                                    case 11:
                                        _a.sent();
                                        skuIds.push(skuId);
                                        _a.label = 12;
                                    case 12:
                                        j += 1;
                                        return [3 /*break*/, 10];
                                    case 13:
                                        i += 1;
                                        return [3 /*break*/, 8];
                                    case 14:
                                        orderStatuses = [
                                            'pending_payment',
                                            'pending_payment',
                                            'pending_shipment',
                                            'pending_shipment',
                                            'shipped',
                                            'shipped',
                                            'completed',
                                            'completed',
                                            'cancelled',
                                            'after_sale',
                                            'after_sale',
                                            'after_sale',
                                        ];
                                        orderItems = [];
                                        i = 0;
                                        _a.label = 15;
                                    case 15:
                                        if (!(i < orderStatuses.length)) return [3 /*break*/, 20];
                                        orderId = "".concat(PREFIX, "_order_").concat(String(i + 1).padStart(2, '0'));
                                        itemId = "".concat(PREFIX, "_order_item_").concat(String(i + 1).padStart(2, '0'));
                                        userId = customerRows[i % customerRows.length].id;
                                        productIndex = i % productIds.length;
                                        skuId = "".concat(PREFIX, "_sku_").concat(String(productIndex + 1).padStart(2, '0'), "_1");
                                        amount = 980 + i * 215;
                                        status_1 = orderStatuses[i];
                                        createdAt = daysAgo(29 - i * 2, i % 5);
                                        isPaid = !['pending_payment', 'cancelled'].includes(status_1);
                                        isShipped = ['shipped', 'completed', 'after_sale'].includes(status_1);
                                        return [4 /*yield*/, tx.order.create({
                                                data: {
                                                    id: orderId,
                                                    no: "".concat(PREFIX, "_order_no_").concat(String(i + 1).padStart(3, '0')),
                                                    userId: userId,
                                                    merchantId: merchant.id,
                                                    status: status_1,
                                                    totalAmount: amount,
                                                    discountAmount: i % 3 === 0 ? 80 : 0,
                                                    shippingFee: i % 2 === 0 ? 0 : 35,
                                                    payAmount: amount - (i % 3 === 0 ? 80 : 0) + (i % 2 === 0 ? 0 : 35),
                                                    paymentMethod: isPaid ? 'wechat' : null,
                                                    shippingMethod: i % 3 === 0 ? 'pickup' : 'factory',
                                                    address: {
                                                        name: customerRows[i % customerRows.length].nickname,
                                                        phone: "1810000181".concat(i % 3),
                                                        region: '宁夏回族自治区 银川市 金凤区',
                                                        detail: "\u5185\u90E8\u6D4B\u8BD5\u5730\u5740 ".concat(i + 1, " \u53F7"),
                                                    },
                                                    remark: "qa1819 \u6D4B\u8BD5\u8BA2\u5355 ".concat(i + 1, "\uFF0C\u7981\u6B62\u771F\u5B9E\u53D1\u8D27"),
                                                    trackingNumber: isShipped ? "".concat(PREFIX, "_tracking_").concat(i + 1) : null,
                                                    trackingCompany: isShipped ? '内部测试物流' : null,
                                                    paidAt: isPaid ? new Date(createdAt.getTime() + 60 * 60000) : null,
                                                    shippedAt: isShipped ? new Date(createdAt.getTime() + 24 * 60 * 60000) : null,
                                                    completedAt: status_1 === 'completed' ? new Date(createdAt.getTime() + 7 * 86400000) : null,
                                                    cancelledAt: status_1 === 'cancelled' ? new Date(createdAt.getTime() + 2 * 3600000) : null,
                                                    expiresAt: status_1 === 'pending_payment' ? new Date(Date.now() + 30 * 60000) : null,
                                                    createdAt: createdAt,
                                                },
                                            })];
                                    case 16:
                                        _a.sent();
                                        return [4 /*yield*/, tx.orderItem.create({
                                                data: {
                                                    id: itemId,
                                                    orderId: orderId,
                                                    productId: productIds[productIndex],
                                                    skuId: skuId,
                                                    productName: "\u3010\u6D4B\u8BD5\u3011".concat(productNames[productIndex]),
                                                    productImage: "https://picsum.photos/seed/qa1819-order-".concat(i + 1, "/600/600"),
                                                    specsLabel: '砂灰 / 标准测试规格',
                                                    unitPrice: amount,
                                                    quantity: 1,
                                                },
                                            })];
                                    case 17:
                                        _a.sent();
                                        return [4 /*yield*/, tx.payment.create({
                                                data: {
                                                    id: "".concat(PREFIX, "_payment_").concat(String(i + 1).padStart(2, '0')),
                                                    orderId: orderId,
                                                    method: 'wechat',
                                                    amount: amount,
                                                    status: isPaid ? 'success' : status_1 === 'cancelled' ? 'failed' : 'pending',
                                                    wxTransactionId: isPaid ? "".concat(PREFIX, "_fake_wx_").concat(i + 1) : null,
                                                    paidAt: isPaid ? new Date(createdAt.getTime() + 60 * 60000) : null,
                                                },
                                            })];
                                    case 18:
                                        _a.sent();
                                        orderItems.push({ orderId: orderId, itemId: itemId, userId: userId });
                                        _a.label = 19;
                                    case 19:
                                        i += 1;
                                        return [3 /*break*/, 15];
                                    case 20:
                                        refundStatuses = ['pending', 'agreed', 'rejected', 'completed'];
                                        refundOrderIndexes = [9, 10, 7, 11];
                                        i = 0;
                                        _a.label = 21;
                                    case 21:
                                        if (!(i < refundStatuses.length)) return [3 /*break*/, 24];
                                        order = orderItems[refundOrderIndexes[i]];
                                        return [4 /*yield*/, tx.refund.create({
                                                data: {
                                                    id: "".concat(PREFIX, "_refund_").concat(i + 1),
                                                    no: "".concat(PREFIX, "_refund_no_").concat(i + 1),
                                                    orderId: order.orderId,
                                                    orderItemId: order.itemId,
                                                    userId: order.userId,
                                                    merchantId: merchant.id,
                                                    type: i % 2 === 0 ? 'refund_only' : 'refund_with_return',
                                                    reason: ['尺寸不合适', '运输破损', '客户撤销申请', '质量问题已处理'][i],
                                                    description: "qa1819 ".concat(refundStatuses[i], " \u552E\u540E\u6D4B\u8BD5\u8BB0\u5F55"),
                                                    evidence: ["https://picsum.photos/seed/qa1819-refund-".concat(i + 1, "/700/700")],
                                                    applyAmount: 300 + i * 180,
                                                    refundAmount: ['agreed', 'completed'].includes(refundStatuses[i])
                                                        ? 300 + i * 180
                                                        : null,
                                                    status: refundStatuses[i],
                                                    merchantReply: i === 2 ? '【测试】资料不足，已拒绝' : '【测试】内部流程处理意见',
                                                    returnAddress: i === 1 ? { name: '内部测试仓', phone: ALLOWED_PHONE, address: '非真实地址' } : null,
                                                    completedAt: refundStatuses[i] === 'completed' ? daysAgo(1) : null,
                                                    createdAt: daysAgo(8 - i),
                                                },
                                            })];
                                    case 22:
                                        _a.sent();
                                        _a.label = 23;
                                    case 23:
                                        i += 1;
                                        return [3 /*break*/, 21];
                                    case 24:
                                        commissionStatuses = [
                                            'pending',
                                            'settled',
                                            'cancelled',
                                            'pending',
                                            'settled',
                                            'pending',
                                        ];
                                        i = 0;
                                        _a.label = 25;
                                    case 25:
                                        if (!(i < commissionStatuses.length)) return [3 /*break*/, 28];
                                        return [4 /*yield*/, tx.commission.create({
                                                data: {
                                                    id: "".concat(PREFIX, "_commission_").concat(i + 1),
                                                    orderId: orderItems[i + 2].orderId,
                                                    userId: customerRows[1].id,
                                                    level: i % 2 === 0 ? 1 : 2,
                                                    amount: 68 + i * 21,
                                                    status: commissionStatuses[i],
                                                    settledAt: commissionStatuses[i] === 'settled' ? daysAgo(2) : null,
                                                    createdAt: daysAgo(12 - i),
                                                },
                                            })];
                                    case 26:
                                        _a.sent();
                                        _a.label = 27;
                                    case 27:
                                        i += 1;
                                        return [3 /*break*/, 25];
                                    case 28:
                                        withdrawalStatuses = ['pending', 'paid', 'rejected'];
                                        i = 0;
                                        _a.label = 29;
                                    case 29:
                                        if (!(i < withdrawalStatuses.length)) return [3 /*break*/, 32];
                                        return [4 /*yield*/, tx.withdraw.create({
                                                data: {
                                                    id: "".concat(PREFIX, "_withdraw_").concat(i + 1),
                                                    no: "".concat(PREFIX, "_withdraw_no_").concat(i + 1),
                                                    userId: user.id,
                                                    merchantId: merchant.id,
                                                    applyAmount: 500 + i * 300,
                                                    actualAmount: withdrawalStatuses[i] === 'paid' ? 800 : 0,
                                                    remark: "qa1819 ".concat(withdrawalStatuses[i], " \u63D0\u73B0\u6D4B\u8BD5\uFF0C\u7981\u6B62\u771F\u5B9E\u4ED8\u6B3E"),
                                                    remarkTags: ['内部测试', '禁止付款'],
                                                    method: i === 1 ? 'bank' : 'wechat',
                                                    account: 'qa1819_mock_account',
                                                    status: withdrawalStatuses[i],
                                                    reviewedBy: withdrawalStatuses[i] === 'pending' ? null : user.id,
                                                    reviewedAt: withdrawalStatuses[i] === 'pending' ? null : daysAgo(2),
                                                    paidAt: withdrawalStatuses[i] === 'paid' ? daysAgo(1) : null,
                                                },
                                            })];
                                    case 30:
                                        _a.sent();
                                        _a.label = 31;
                                    case 31:
                                        i += 1;
                                        return [3 /*break*/, 29];
                                    case 32: return [4 /*yield*/, tx.store.createMany({
                                            data: [
                                                {
                                                    id: "".concat(PREFIX, "_store_1"),
                                                    merchantId: merchant.id,
                                                    name: '【测试】银川旗舰体验店',
                                                    contact: '测试店长甲',
                                                    phone: '18100001810',
                                                    region: '宁夏回族自治区银川市金凤区',
                                                    address: '内部测试路 1 号',
                                                    longitude: 106.2309,
                                                    latitude: 38.4872,
                                                    level: 'A',
                                                    status: 'active',
                                                    authValidFrom: daysAgo(30),
                                                    authValidTo: new Date(Date.now() + 335 * 86400000),
                                                    authConfig: { priceVisible: true, categories: ['系统门窗'], markupRatio: 18 },
                                                },
                                                {
                                                    id: "".concat(PREFIX, "_store_2"),
                                                    merchantId: merchant.id,
                                                    name: '【测试】吴忠待审核门店',
                                                    contact: '测试店长乙',
                                                    phone: '18100001811',
                                                    region: '宁夏回族自治区吴忠市',
                                                    address: '内部测试路 2 号',
                                                    longitude: 106.198,
                                                    latitude: 37.997,
                                                    level: 'B',
                                                    status: 'pending',
                                                    authConfig: { priceVisible: false, categories: ['入户门'], markupRatio: 22 },
                                                },
                                                {
                                                    id: "".concat(PREFIX, "_store_3"),
                                                    merchantId: merchant.id,
                                                    name: '【测试】已取消授权门店',
                                                    contact: '测试店长丙',
                                                    phone: '18100001812',
                                                    region: '宁夏回族自治区中卫市',
                                                    address: '内部测试路 3 号',
                                                    level: 'C',
                                                    status: 'cancelled',
                                                    authValidFrom: daysAgo(365),
                                                    authValidTo: daysAgo(30),
                                                    authConfig: { priceVisible: false, categories: [], markupRatio: 0 },
                                                },
                                            ],
                                        })];
                                    case 33:
                                        _a.sent();
                                        return [4 /*yield*/, tx.staff.createMany({
                                                data: [
                                                    ['1', '内部测试总经理', 'manager', 'active', 88600, ['*']],
                                                    ['2', '内部测试销售', 'sales', 'active', 32800, ['product.read', 'order.read']],
                                                    ['3', '内部测试客服', 'cs', 'active', 0, ['chat.*', 'refund.read']],
                                                    ['4', '内部测试离职员工', 'sales', 'left', 9800, []],
                                                ].map(function (_a) {
                                                    var suffix = _a[0], name = _a[1], role = _a[2], status = _a[3], performance = _a[4], permissions = _a[5];
                                                    return ({
                                                        id: "".concat(PREFIX, "_staff_").concat(suffix),
                                                        merchantId: merchant.id,
                                                        name: "\u3010\u6D4B\u8BD5\u3011".concat(name),
                                                        phone: "1810000190".concat(suffix),
                                                        role: String(role),
                                                        status: String(status),
                                                        monthlyPerformance: Number(performance),
                                                        permissions: permissions,
                                                    });
                                                }),
                                            })];
                                    case 34:
                                        _a.sent();
                                        return [4 /*yield*/, tx.shopDecorate.create({
                                                data: {
                                                    id: "".concat(PREFIX, "_shop_decorate"),
                                                    merchantId: merchant.id,
                                                    themeColor: '#176B87',
                                                    fontStyle: 'modern',
                                                    productLayout: 'twoColumn',
                                                    cornerStyle: 'soft',
                                                    banners: [
                                                        {
                                                            id: "".concat(PREFIX, "_banner_1"),
                                                            image: 'https://picsum.photos/seed/qa1819-banner-1/1200/480',
                                                        },
                                                        {
                                                            id: "".concat(PREFIX, "_banner_2"),
                                                            image: 'https://picsum.photos/seed/qa1819-banner-2/1200/480',
                                                        },
                                                    ],
                                                    modules: [
                                                        { id: "".concat(PREFIX, "_module_1"), type: 'banner', sort: 1 },
                                                        { id: "".concat(PREFIX, "_module_2"), type: 'category', sort: 2 },
                                                        { id: "".concat(PREFIX, "_module_3"), type: 'product-list', sort: 3 },
                                                    ],
                                                },
                                            })];
                                    case 35:
                                        _a.sent();
                                        couponStatuses = ['active', 'paused', 'ended', 'pending'];
                                        i = 0;
                                        _a.label = 36;
                                    case 36:
                                        if (!(i < couponStatuses.length)) return [3 /*break*/, 39];
                                        return [4 /*yield*/, tx.coupon.create({
                                                data: {
                                                    id: "".concat(PREFIX, "_coupon_").concat(i + 1),
                                                    merchantId: merchant.id,
                                                    name: "\u3010\u6D4B\u8BD5\u3011".concat(['满千减百', '会员九折', '新品直减', '待发布券'][i]),
                                                    type: i === 1 ? 'discount' : i === 2 ? 'fixed' : 'fullReduce',
                                                    amount: i === 1 ? null : 100 + i * 20,
                                                    discountPercent: i === 1 ? 0.9 : null,
                                                    threshold: i === 1 ? 0 : 1000,
                                                    stock: 100 + i * 50,
                                                    received: 20 + i * 5,
                                                    used: 8 + i,
                                                    validFrom: i === 2 ? daysAgo(60) : daysAgo(5),
                                                    validTo: i === 2 ? daysAgo(1) : new Date(Date.now() + 30 * 86400000),
                                                    perUserLimit: 2,
                                                    scope: i === 3 ? 'product' : 'all',
                                                    scopeIds: i === 3 ? [productIds[0], productIds[1]] : [],
                                                    status: couponStatuses[i],
                                                },
                                            })];
                                    case 37:
                                        _a.sent();
                                        _a.label = 38;
                                    case 38:
                                        i += 1;
                                        return [3 /*break*/, 36];
                                    case 39: return [4 /*yield*/, tx.flashSale.createMany({
                                            data: ['active', 'pending', 'ended'].map(function (status, i) { return ({
                                                id: "".concat(PREFIX, "_flash_").concat(i + 1),
                                                merchantId: merchant.id,
                                                productId: productIds[i],
                                                skuId: skuIds[i],
                                                price: 699 + i * 120,
                                                stock: 50,
                                                sold: i * 11,
                                                startAt: status === 'ended' ? daysAgo(10) : daysAgo(1),
                                                endAt: status === 'ended' ? daysAgo(3) : new Date(Date.now() + 7 * 86400000),
                                                status: status,
                                            }); }),
                                        })];
                                    case 40:
                                        _a.sent();
                                        return [4 /*yield*/, tx.groupBuy.createMany({
                                                data: ['active', 'pending', 'ended'].map(function (status, i) { return ({
                                                    id: "".concat(PREFIX, "_group_").concat(i + 1),
                                                    merchantId: merchant.id,
                                                    productId: productIds[i + 3],
                                                    skuId: skuIds[i + 3],
                                                    groupSize: 3 + i * 2,
                                                    price: 899 + i * 150,
                                                    validHours: 24 + i * 12,
                                                    status: status,
                                                }); }),
                                            })];
                                    case 41:
                                        _a.sent();
                                        return [4 /*yield*/, tx.commissionRule.create({
                                                data: {
                                                    id: "".concat(PREFIX, "_commission_rule_global"),
                                                    merchantId: merchant.id,
                                                    productId: null,
                                                    level1Percent: 8,
                                                    level2Percent: 3,
                                                    visibleToPromoter: true,
                                                    allowOffline: false,
                                                    enabled: true,
                                                },
                                            })];
                                    case 42:
                                        _a.sent();
                                        return [4 /*yield*/, tx.commissionRule.create({
                                                data: {
                                                    id: "".concat(PREFIX, "_commission_rule_product"),
                                                    merchantId: merchant.id,
                                                    productId: productIds[0],
                                                    level1Percent: 12,
                                                    level2Percent: 5,
                                                    visibleToPromoter: true,
                                                    allowOffline: true,
                                                    enabled: true,
                                                },
                                            })];
                                    case 43:
                                        _a.sent();
                                        return [4 /*yield*/, tx.quickReply.createMany({
                                                data: [
                                                    ['欢迎语', '您好，这里是内部测试门窗厂，请问需要测试哪个功能？'],
                                                    ['量尺预约', '已为您记录测试量尺需求，不会产生真实上门任务。'],
                                                    ['售后说明', '这是内部测试售后回复，不会触发真实退款或物流。'],
                                                ].map(function (_a, i) {
                                                    var label = _a[0], content = _a[1];
                                                    return ({
                                                        id: "".concat(PREFIX, "_quick_reply_").concat(i + 1),
                                                        merchantId: merchant.id,
                                                        label: "\u3010\u6D4B\u8BD5\u3011".concat(label),
                                                        content: content,
                                                        sort: i + 1,
                                                    });
                                                }),
                                            })];
                                    case 44:
                                        _a.sent();
                                        i = 0;
                                        _a.label = 45;
                                    case 45:
                                        if (!(i < customerRows.length)) return [3 /*break*/, 49];
                                        sessionId = "".concat(PREFIX, "_chat_session_").concat(i + 1);
                                        return [4 /*yield*/, tx.chatSession.create({
                                                data: {
                                                    id: sessionId,
                                                    userId: customerRows[i].id,
                                                    merchantId: merchant.id,
                                                    lastMessageAt: daysAgo(0, i),
                                                    unreadCount: i === 0 ? 2 : i,
                                                    status: i === 2 ? 'closed' : 'open',
                                                },
                                            })];
                                    case 46:
                                        _a.sent();
                                        return [4 /*yield*/, tx.chatMessage.createMany({
                                                data: [
                                                    {
                                                        id: "".concat(PREFIX, "_chat_message_").concat(i + 1, "_1"),
                                                        sessionId: sessionId,
                                                        sender: 'user',
                                                        type: 'text',
                                                        content: "qa1819 \u5BA2\u6237 ".concat(i + 1, "\uFF1A\u54A8\u8BE2\u95E8\u7A97\u5C3A\u5BF8\u4E0E\u62A5\u4EF7"),
                                                        read: i !== 0,
                                                        createdAt: daysAgo(0, i + 2),
                                                    },
                                                    {
                                                        id: "".concat(PREFIX, "_chat_message_").concat(i + 1, "_2"),
                                                        sessionId: sessionId,
                                                        sender: 'merchant',
                                                        type: 'quick',
                                                        content: '【测试回复】已收到，仅用于内部验收。',
                                                        read: true,
                                                        createdAt: daysAgo(0, i + 1),
                                                    },
                                                    {
                                                        id: "".concat(PREFIX, "_chat_message_").concat(i + 1, "_3"),
                                                        sessionId: sessionId,
                                                        sender: 'user',
                                                        type: 'image',
                                                        content: "https://picsum.photos/seed/qa1819-chat-".concat(i + 1, "/600/600"),
                                                        read: i === 2,
                                                        createdAt: daysAgo(0, i),
                                                    },
                                                ],
                                            })];
                                    case 47:
                                        _a.sent();
                                        _a.label = 48;
                                    case 48:
                                        i += 1;
                                        return [3 /*break*/, 45];
                                    case 49:
                                        factoryFallbacks = externalFactories.length
                                            ? externalFactories.map(function (row) { return row.id; })
                                            : ["".concat(PREFIX, "_external_factory_placeholder")];
                                        agencyStatuses = ['pending', 'approved', 'rejected', 'offline'];
                                        i = 0;
                                        _a.label = 50;
                                    case 50:
                                        if (!(i < agencyStatuses.length)) return [3 /*break*/, 53];
                                        return [4 /*yield*/, tx.agencyApplication.create({
                                                data: {
                                                    id: "".concat(PREFIX, "_agency_").concat(i + 1),
                                                    merchantId: merchant.id,
                                                    factoryMerchantId: factoryFallbacks[i % factoryFallbacks.length],
                                                    productIds: [productIds[i], productIds[(i + 1) % productIds.length]],
                                                    markupPercent: 18 + i * 5,
                                                    autoSyncPrice: i % 2 === 0,
                                                    message: "qa1819 ".concat(agencyStatuses[i], " \u4EE3\u7406\u6D4B\u8BD5\u7533\u8BF7"),
                                                    status: agencyStatuses[i],
                                                },
                                            })];
                                    case 51:
                                        _a.sent();
                                        _a.label = 52;
                                    case 52:
                                        i += 1;
                                        return [3 /*break*/, 50];
                                    case 53:
                                        startAt = daysAgo(8);
                                        endAt = new Date(Date.now() + 22 * 86400000);
                                        return [4 /*yield*/, tx.merchantMembership.create({
                                                data: {
                                                    id: "".concat(PREFIX, "_membership_ad_pro"),
                                                    merchantId: merchant.id,
                                                    planId: adProPlan.id,
                                                    planCode: adProPlan.code,
                                                    startAt: startAt,
                                                    endAt: endAt,
                                                    status: 'active',
                                                    autoRenew: false,
                                                },
                                            })];
                                    case 54:
                                        _a.sent();
                                        periodStart = new Date();
                                        periodStart.setDate(1);
                                        periodStart.setHours(0, 0, 0, 0);
                                        periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0, 23, 59, 59);
                                        return [4 /*yield*/, tx.usageQuota.create({
                                                data: {
                                                    id: "".concat(PREFIX, "_usage_quota"),
                                                    merchantId: merchant.id,
                                                    planId: adProPlan.id,
                                                    periodStart: periodStart,
                                                    periodEnd: periodEnd,
                                                    data: { fixture: PREFIX, pushSlots: 30, bannerLimit: 10, impressionLimit: 50000 },
                                                    pushSlotsUsed: 12,
                                                    pushSlotsLimit: 30,
                                                    bannerUsed: 4,
                                                    bannerLimit: 10,
                                                    impressionUsed: 18619,
                                                    impressionLimit: 50000,
                                                },
                                            })];
                                    case 55:
                                        _a.sent();
                                        memberPaymentStatuses = ['paid', 'failed', 'refunded'];
                                        i = 0;
                                        _a.label = 56;
                                    case 56:
                                        if (!(i < memberPaymentStatuses.length)) return [3 /*break*/, 59];
                                        return [4 /*yield*/, tx.paymentRecord.create({
                                                data: {
                                                    id: "".concat(PREFIX, "_member_payment_").concat(i + 1),
                                                    no: "".concat(PREFIX, "_member_payment_no_").concat(i + 1),
                                                    merchantId: merchant.id,
                                                    planId: adProPlan.id,
                                                    planName: adProPlan.name,
                                                    planType: adProPlan.type,
                                                    amount: adProPlan.price,
                                                    paymentMethod: 'wechat',
                                                    status: memberPaymentStatuses[i],
                                                    paidAt: memberPaymentStatuses[i] === 'paid' ? startAt : null,
                                                    refundReason: memberPaymentStatuses[i] === 'refunded' ? 'qa1819 内部退款测试' : null,
                                                    createdAt: daysAgo(12 - i * 3),
                                                },
                                            })];
                                    case 57:
                                        _a.sent();
                                        _a.label = 58;
                                    case 58:
                                        i += 1;
                                        return [3 /*break*/, 56];
                                    case 59:
                                        systemConfigs = [
                                            {
                                                key: "shop:".concat(merchant.id, ":priceRule"),
                                                value: {
                                                    fixture: PREFIX,
                                                    guestAllow: false,
                                                    customerPrice: 'retail',
                                                    agencyPrice: 'wholesale',
                                                    memberPrice: 'member',
                                                },
                                            },
                                            {
                                                key: "shop:".concat(merchant.id, ":profile-extras"),
                                                value: {
                                                    fixture: PREFIX,
                                                    description: '仅用于内部全功能验收，不对顾客端开放。',
                                                    avatar: 'https://picsum.photos/seed/qa1819-avatar/400/400',
                                                    rating: 4.8,
                                                    ratingCount: 1819,
                                                    plazaVisibility: 'stores',
                                                },
                                            },
                                            {
                                                key: "".concat(PREFIX, ":").concat(merchant.id, ":analytics"),
                                                value: {
                                                    fixture: PREFIX,
                                                    trend30d: [18, 22, 31, 29, 45, 52, 61, 58, 72, 84, 91, 103],
                                                    conversionRate: 18.19,
                                                    repeatPurchaseRate: 26.8,
                                                },
                                            },
                                        ];
                                        for (i = 0; i < customerRows.length; i += 1) {
                                            systemConfigs.push({
                                                key: "cust_tier_".concat(merchant.id, "_").concat(customerRows[i].id),
                                                value: { fixture: PREFIX, priceTier: ['member', 'agency', 'retail'][i] },
                                            }, {
                                                key: "cust_auth_".concat(merchant.id, "_").concat(customerRows[i].id),
                                                value: {
                                                    fixture: PREFIX,
                                                    authorized: i !== 2,
                                                    authorizedAt: daysAgo(10).toISOString(),
                                                },
                                            }, {
                                                key: "merchant:".concat(merchant.id, ":blacklist:").concat(customerRows[i].id),
                                                value: {
                                                    fixture: PREFIX,
                                                    blocked: i === 2,
                                                    reason: i === 2 ? 'qa1819 黑名单测试' : '',
                                                },
                                            });
                                        }
                                        _i = 0, systemConfigs_1 = systemConfigs;
                                        _a.label = 60;
                                    case 60:
                                        if (!(_i < systemConfigs_1.length)) return [3 /*break*/, 63];
                                        config = systemConfigs_1[_i];
                                        return [4 /*yield*/, tx.systemConfig.create({ data: config })];
                                    case 61:
                                        _a.sent();
                                        _a.label = 62;
                                    case 62:
                                        _i++;
                                        return [3 /*break*/, 60];
                                    case 63: return [4 /*yield*/, tx.auditRecord.createMany({
                                            data: [
                                                {
                                                    id: "".concat(PREFIX, "_audit_merchant"),
                                                    type: 'merchant',
                                                    targetId: merchant.id,
                                                    status: 'approved',
                                                    auditorId: user.id,
                                                    reason: 'qa1819 内部测试商户',
                                                    reviewedAt: daysAgo(30),
                                                },
                                                {
                                                    id: "".concat(PREFIX, "_audit_product_1"),
                                                    type: 'product',
                                                    targetId: productIds[6],
                                                    status: 'pending',
                                                    reason: 'qa1819 待审核商品',
                                                },
                                                {
                                                    id: "".concat(PREFIX, "_audit_product_2"),
                                                    type: 'product',
                                                    targetId: productIds[7],
                                                    status: 'rejected',
                                                    auditorId: user.id,
                                                    reason: 'qa1819 模拟驳回',
                                                    reviewedAt: daysAgo(2),
                                                },
                                            ],
                                        })];
                                    case 64:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); }, { maxWait: 10000, timeout: 120000 })];
                case 6:
                    _b.sent();
                    return [4 /*yield*/, Promise.all([
                            prisma.user.findUnique({ where: { id: user.id } }),
                            Promise.all([
                                prisma.product.count({ where: { merchantId: merchant.id } }),
                                prisma.sku.count({ where: { product: { merchantId: merchant.id } } }),
                                prisma.order.count({ where: { merchantId: merchant.id } }),
                                prisma.refund.count({ where: { merchantId: merchant.id } }),
                                prisma.store.count({ where: { merchantId: merchant.id } }),
                                prisma.staff.count({ where: { merchantId: merchant.id } }),
                                prisma.coupon.count({ where: { merchantId: merchant.id } }),
                                prisma.chatSession.count({ where: { merchantId: merchant.id } }),
                                prisma.agencyApplication.count({ where: { merchantId: merchant.id } }),
                                prisma.merchantMembership.count({ where: { merchantId: merchant.id, status: 'active' } }),
                            ]),
                        ])];
                case 7:
                    _a = _b.sent(), after = _a[0], summary = _a[1];
                    if (!after || after.passwordHash !== originalPasswordHash) {
                        throw new Error('严重错误：密码哈希未保持不变');
                    }
                    products = summary[0], skus = summary[1], orders = summary[2], refunds = summary[3], stores = summary[4], staffs = summary[5], coupons = summary[6], chats = summary[7], agencies = summary[8], memberships = summary[9];
                    if (products !== 10 || skus !== 25 || orders !== 12 || refunds !== 4) {
                        throw new Error("\u914D\u7F6E\u540E\u6570\u91CF\u6821\u9A8C\u5931\u8D25\uFF1Aproducts=".concat(products, ", skus=").concat(skus, ", orders=").concat(orders, ", refunds=").concat(refunds));
                    }
                    console.log(JSON.stringify({
                        ok: true,
                        phone: ALLOWED_PHONE,
                        userId: user.id,
                        merchantId: merchant.id,
                        role: after.role,
                        passwordHashPreserved: true,
                        backupCreated: backupCreated,
                        backupPath: BACKUP_PATH,
                        counts: {
                            products: products,
                            skus: skus,
                            orders: orders,
                            refunds: refunds,
                            stores: stores,
                            staffs: staffs,
                            coupons: coupons,
                            chats: chats,
                            agencies: agencies,
                            memberships: memberships,
                        },
                    }, null, 2));
                    return [2 /*return*/];
            }
        });
    });
}
provision()
    .catch(function (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
