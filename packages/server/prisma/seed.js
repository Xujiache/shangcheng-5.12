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
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 数据库种子脚本 · 强关联演示数据
 *
 * 3 个核心账号，互相之间有完整的业务关联：
 *
 *   customer@demo (phone=13800000000, 密码=<SEED_DEFAULT_PASSWORD env>)
 *     ├─ 在 merchant@demo 下 5 个订单（不同状态：待付/待发/已发/完成/售后）
 *     ├─ 收藏 merchant@demo 的 3 个商品
 *     ├─ 购物车有 1 个 merchant@demo 的 SKU
 *     ├─ 给 merchant@demo 发了 1 条客服消息
 *     └─ 申请了 1 个退款（针对已完成订单）
 *
 *   merchant@demo (factory 角色, 密码=<SEED_DEFAULT_PASSWORD env>)
 *     ├─ 6 商品 + 18 SKU
 *     ├─ 1 门店 + 2 员工
 *     ├─ 已订阅"广告专业"套餐 + 缴费记录
 *     ├─ 客服会话（含 customer@demo 的消息）
 *     ├─ 待处理售后单（来自 customer@demo）
 *     ├─ 装修配置 + 优惠券 + 佣金规则
 *     └─ 已被 admin@demo 审核通过（status=active）
 *
 *   admin@demo (platform 角色, 密码=<SEED_DEFAULT_PASSWORD env>)
 *     ├─ 审核记录：通过了 merchant@demo 入驻
 *     ├─ 审核记录：通过了 merchant@demo 的 1 个商品
 *     └─ 平台运营角色（platform_ops）
 *
 * 运行：
 *   SEED_DEFAULT_PASSWORD=<至少 8 位强密码> pnpm --filter @jiujiu/server prisma:seed
 *
 * 安全 P0：脚本不再硬编码 "123456" 之类的弱口令；
 * 必须从环境变量 SEED_DEFAULT_PASSWORD 读取，缺失或长度 < 8 直接拒绝运行。
 * 这样避免 seed 完不小心被对外暴露默认账号。
 */
var client_1 = require("@prisma/client");
var argon2 = require("argon2");
var prisma = new client_1.PrismaClient();
function clearAll() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🗑  清空所有业务表...');
                    // 按外键依赖顺序逆向清空（子表 → 父表）
                    return [4 /*yield*/, prisma.chatMessage.deleteMany()];
                case 1:
                    // 按外键依赖顺序逆向清空（子表 → 父表）
                    _a.sent();
                    return [4 /*yield*/, prisma.chatSession.deleteMany()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, prisma.quickReply.deleteMany()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, prisma.refund.deleteMany()];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, prisma.payment.deleteMany()];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, prisma.orderItem.deleteMany()];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, prisma.commission.deleteMany()];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, prisma.order.deleteMany()];
                case 8:
                    _a.sent();
                    return [4 /*yield*/, prisma.cartItem.deleteMany()];
                case 9:
                    _a.sent();
                    return [4 /*yield*/, prisma.favorite.deleteMany()];
                case 10:
                    _a.sent();
                    return [4 /*yield*/, prisma.sku.deleteMany()];
                case 11:
                    _a.sent();
                    return [4 /*yield*/, prisma.product.deleteMany()];
                case 12:
                    _a.sent();
                    return [4 /*yield*/, prisma.commissionRule.deleteMany()];
                case 13:
                    _a.sent();
                    return [4 /*yield*/, prisma.withdraw.deleteMany()];
                case 14:
                    _a.sent();
                    return [4 /*yield*/, prisma.booking.deleteMany()];
                case 15:
                    _a.sent();
                    return [4 /*yield*/, prisma.coupon.deleteMany()];
                case 16:
                    _a.sent();
                    return [4 /*yield*/, prisma.flashSale.deleteMany()];
                case 17:
                    _a.sent();
                    return [4 /*yield*/, prisma.groupBuy.deleteMany()];
                case 18:
                    _a.sent();
                    return [4 /*yield*/, prisma.agencyApplication.deleteMany()];
                case 19:
                    _a.sent();
                    return [4 /*yield*/, prisma.paymentRecord.deleteMany()];
                case 20:
                    _a.sent();
                    return [4 /*yield*/, prisma.usageQuota.deleteMany()];
                case 21:
                    _a.sent();
                    return [4 /*yield*/, prisma.merchantMembership.deleteMany()];
                case 22:
                    _a.sent();
                    return [4 /*yield*/, prisma.shopDecorate.deleteMany()];
                case 23:
                    _a.sent();
                    return [4 /*yield*/, prisma.staff.deleteMany()];
                case 24:
                    _a.sent();
                    return [4 /*yield*/, prisma.store.deleteMany()];
                case 25:
                    _a.sent();
                    return [4 /*yield*/, prisma.merchantFeatureOverride.deleteMany()];
                case 26:
                    _a.sent();
                    return [4 /*yield*/, prisma.merchant.deleteMany()];
                case 27:
                    _a.sent();
                    return [4 /*yield*/, prisma.address.deleteMany()];
                case 28:
                    _a.sent();
                    return [4 /*yield*/, prisma.smsCode.deleteMany()];
                case 29:
                    _a.sent();
                    return [4 /*yield*/, prisma.user.deleteMany()];
                case 30:
                    _a.sent();
                    return [4 /*yield*/, prisma.category.deleteMany()];
                case 31:
                    _a.sent();
                    return [4 /*yield*/, prisma.adCreative.deleteMany()];
                case 32:
                    _a.sent();
                    return [4 /*yield*/, prisma.adSlot.deleteMany()];
                case 33:
                    _a.sent();
                    return [4 /*yield*/, prisma.plazaPush.deleteMany()];
                case 34:
                    _a.sent();
                    return [4 /*yield*/, prisma.memberPlan.deleteMany()];
                case 35:
                    _a.sent();
                    return [4 /*yield*/, prisma.featureFlag.deleteMany()];
                case 36:
                    _a.sent();
                    return [4 /*yield*/, prisma.auditRecord.deleteMany()];
                case 37:
                    _a.sent();
                    return [4 /*yield*/, prisma.adminRole.deleteMany()];
                case 38:
                    _a.sent();
                    return [4 /*yield*/, prisma.uploadedFile.deleteMany()];
                case 39:
                    _a.sent();
                    return [4 /*yield*/, prisma.systemConfig.deleteMany()];
                case 40:
                    _a.sent();
                    console.log('   ✓ 所有表已清空');
                    return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var seedPass, passHash, rolePlatform, cats, _i, cats_1, c, i, adminUser, merchantUser, merchantBiz, customerUser, otherFactoriesSeed, f, of, ghostUser, ghostMerchant, pi, pp, newProd, colors, _a, colors_1, c, addr1, productsSeed, productIds, i, ps, product, colors, j, plans, _b, plans_1, p, adProPlan, startAt, endAt, periodStart, periodEnd, skuList, orderSeeds, orderIds, i, os, sku, createdAt, itemAmount, shippingFee, payAmount, order, orderItem, afterSaleOrder, i, session, slots, _c, slots_1, s, flags, _d, flags_1, f, ledgerPhone, ledgerUser, lc, mkLedgerOrder, day;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    console.log('🌱 开始 seed...\n');
                    seedPass = process.env.SEED_DEFAULT_PASSWORD || '';
                    if (!seedPass || seedPass.length < 8) {
                        throw new Error([
                            '[seed] 拒绝运行：SEED_DEFAULT_PASSWORD 未设置或长度 < 8',
                            '请在执行前设置该环境变量，例如：',
                            '  SEED_DEFAULT_PASSWORD=<强密码> pnpm --filter @jiujiu/server prisma:seed',
                        ].join('\n'));
                    }
                    return [4 /*yield*/, clearAll()];
                case 1:
                    _e.sent();
                    return [4 /*yield*/, argon2.hash(seedPass)
                        // ============ 1. 系统配置 ============
                    ];
                case 2:
                    passHash = _e.sent();
                    // ============ 1. 系统配置 ============
                    return [4 /*yield*/, prisma.systemConfig.create({
                            data: {
                                key: 'platform',
                                value: {
                                    name: '经纬科技',
                                    servicePhone: '400-888-8888',
                                    merchantLimit: 500,
                                    trialDays: 30,
                                    commissionPercent: 2,
                                },
                            },
                        })];
                case 3:
                    // ============ 1. 系统配置 ============
                    _e.sent();
                    return [4 /*yield*/, prisma.systemConfig.create({
                            data: {
                                key: 'banners',
                                value: [
                                    {
                                        id: 'b1',
                                        image: 'https://picsum.photos/seed/jjbanner1/1200/500',
                                        title: '新春全场满 999-100',
                                        link: '',
                                    },
                                    {
                                        id: 'b2',
                                        image: 'https://picsum.photos/seed/jjbanner2/1200/500',
                                        title: '定制家具特惠 7 折起',
                                        link: '',
                                    },
                                    {
                                        id: 'b3',
                                        image: 'https://picsum.photos/seed/jjbanner3/1200/500',
                                        title: '会员日 · 享专属价',
                                        link: '',
                                    },
                                ],
                            },
                        })];
                case 4:
                    _e.sent();
                    return [4 /*yield*/, prisma.systemConfig.create({
                            data: {
                                key: 'system_settings',
                                value: {
                                    site: { name: '经纬科技', logo: '', icp: '沪ICP备20260000号' },
                                    payment: {
                                        wechat: { enabled: true },
                                        alipay: { enabled: false },
                                        balance: { enabled: true },
                                    },
                                    logistics: { providers: ['顺丰', '京东', '中通', '圆通', '韵达'], defaultFreight: 10 },
                                    service: { phone: '400-888-8888', email: 'support@jiujiu.com', workTime: '9:00-18:00' },
                                    security: { passwordPolicy: { minLength: 8, requireUppercase: false }, ipWhitelist: [] },
                                },
                            },
                        })
                        // ============ 2. 角色 ============
                    ];
                case 5:
                    _e.sent();
                    return [4 /*yield*/, prisma.adminRole.create({
                            data: {
                                code: 'platform_ops',
                                name: '平台运营',
                                description: '运营平台业务',
                                permissions: ['merchant.*', 'product.audit.*', 'ad.*', 'plaza.*', 'member.*'],
                                isSystem: true,
                            },
                        })];
                case 6:
                    rolePlatform = _e.sent();
                    return [4 /*yield*/, prisma.adminRole.create({
                            data: {
                                code: 'super',
                                name: '超级管理员',
                                description: '拥有全部权限',
                                permissions: ['*'],
                                isSystem: true,
                            },
                        })];
                case 7:
                    _e.sent();
                    return [4 /*yield*/, prisma.adminRole.createMany({
                            data: [
                                {
                                    code: 'auditor',
                                    name: '审核员',
                                    description: '审核商户和商品',
                                    permissions: ['audit.merchant', 'audit.product'],
                                    isSystem: false,
                                },
                                {
                                    code: 'cs',
                                    name: '客服',
                                    description: '处理订单和投诉',
                                    permissions: ['order.read', 'complaint.*'],
                                    isSystem: false,
                                },
                                {
                                    code: 'finance',
                                    name: '财务',
                                    description: '支付和佣金',
                                    permissions: ['pay.*', 'commission.*'],
                                    isSystem: false,
                                },
                            ],
                        })
                        // ============ 3. 平台 4 大分类 + 19 子分类 ============
                    ];
                case 8:
                    _e.sent();
                    cats = [
                        {
                            id: 'cat-furniture',
                            name: '家具',
                            icon: '🛋️',
                            sort: 1,
                            children: ['沙发', '床垫', '餐桌椅', '书桌', '衣柜'],
                        },
                        {
                            id: 'cat-curtain',
                            name: '窗帘布艺',
                            icon: '🪟',
                            sort: 2,
                            children: ['窗帘', '抱枕', '地毯', '桌布'],
                        },
                        {
                            id: 'cat-lighting',
                            name: '灯具',
                            icon: '💡',
                            sort: 3,
                            children: ['吊灯', '台灯', '射灯', '落地灯'],
                        },
                        {
                            id: 'cat-deco',
                            name: '装饰',
                            icon: '🖼️',
                            sort: 4,
                            children: ['挂画', '花瓶', '香薰', '摆件', '壁纸', '镜子'],
                        },
                    ];
                    _i = 0, cats_1 = cats;
                    _e.label = 9;
                case 9:
                    if (!(_i < cats_1.length)) return [3 /*break*/, 15];
                    c = cats_1[_i];
                    return [4 /*yield*/, prisma.category.create({
                            data: { id: c.id, name: c.name, icon: c.icon, sort: c.sort, type: 'platform' },
                        })];
                case 10:
                    _e.sent();
                    i = 0;
                    _e.label = 11;
                case 11:
                    if (!(i < c.children.length)) return [3 /*break*/, 14];
                    return [4 /*yield*/, prisma.category.create({
                            data: {
                                id: "".concat(c.id, "-").concat(i),
                                name: c.children[i],
                                parentId: c.id,
                                sort: i,
                                type: 'platform',
                            },
                        })];
                case 12:
                    _e.sent();
                    _e.label = 13;
                case 13:
                    i++;
                    return [3 /*break*/, 11];
                case 14:
                    _i++;
                    return [3 /*break*/, 9];
                case 15:
                    console.log('  ✓ 4 平台分类 + 19 子分类');
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                username: 'admin@demo',
                                email: 'admin@demo',
                                nickname: '平台运营',
                                passwordHash: passHash,
                                role: 'platform',
                                adminRoleId: rolePlatform.id,
                                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
                                lastLoginAt: new Date(),
                            },
                        })
                        // 4.2 merchant@demo (厂家) + 关联 Merchant
                    ];
                case 16:
                    adminUser = _e.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                username: 'merchant@demo',
                                email: 'merchant@demo',
                                nickname: '经纬科技',
                                passwordHash: passHash,
                                role: 'factory',
                                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=merchant',
                                lastLoginAt: new Date(),
                            },
                        })];
                case 17:
                    merchantUser = _e.sent();
                    return [4 /*yield*/, prisma.merchant.create({
                            data: {
                                userId: merchantUser.id,
                                type: 'factory',
                                name: '经纬科技',
                                legalName: '上海经纬科技有限公司',
                                creditCode: '91310000MA1FL00012',
                                legalRep: '张明华',
                                contact: '李经理',
                                contactPhone: '13912340001',
                                region: '上海市浦东新区',
                                address: '上海市浦东新区张江高科技园区博云路 12 号',
                                businessLicense: 'https://picsum.photos/seed/license/600/400',
                                qualifications: [
                                    'https://picsum.photos/seed/qual1/600/400',
                                    'https://picsum.photos/seed/qual2/600/400',
                                ],
                                categories: ['cat-furniture', 'cat-curtain', 'cat-lighting'],
                                status: 'active',
                                level: 'A',
                                credit: 'A',
                                totalGmv: 528000,
                            },
                        })
                        // 4.3 customer@demo (顾客)
                    ];
                case 18:
                    merchantBiz = _e.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                phone: '13800000000',
                                nickname: '小九',
                                passwordHash: passHash,
                                role: 'customer',
                                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=customer',
                                lastLoginAt: new Date(),
                            },
                        })];
                case 19:
                    customerUser = _e.sent();
                    console.log('  ✓ 3 核心账号 (admin@demo / merchant@demo / 13800000000)');
                    otherFactoriesSeed = [
                        {
                            name: '舒馨家具厂',
                            region: '广东省佛山市',
                            cats: ['cat-furniture'],
                            gmv: 380000,
                            level: 'A',
                            credit: 'A',
                            logo: 'https://picsum.photos/seed/factory_shuxin/200/200',
                            tags: ['工厂直供', '新品'],
                            products: [
                                { name: '北欧布艺懒人沙发', cat: 'cat-furniture', retail: 1888, wholesale: 1188 },
                                { name: '原木双人床架', cat: 'cat-furniture', retail: 2299, wholesale: 1499 },
                                { name: '人体工学办公椅', cat: 'cat-furniture', retail: 999, wholesale: 599 },
                            ],
                        },
                        {
                            name: '云朵窗帘厂',
                            region: '浙江省杭州市',
                            cats: ['cat-curtain'],
                            gmv: 220000,
                            level: 'B',
                            credit: 'A',
                            logo: 'https://picsum.photos/seed/factory_yunduo/200/200',
                            tags: ['爆款', '限时'],
                            products: [
                                { name: '高遮光卧室窗帘', cat: 'cat-curtain', retail: 459, wholesale: 269 },
                                { name: '法式重工提花窗帘', cat: 'cat-curtain', retail: 899, wholesale: 569 },
                                { name: '北欧棉麻抱枕套', cat: 'cat-curtain', retail: 89, wholesale: 49 },
                            ],
                        },
                        {
                            name: '智享灯具厂',
                            region: '广东省中山市',
                            cats: ['cat-lighting'],
                            gmv: 156000,
                            level: 'B',
                            credit: 'B',
                            logo: 'https://picsum.photos/seed/factory_zhixiang/200/200',
                            tags: ['高佣金'],
                            products: [
                                { name: '智能感应客厅吸顶灯', cat: 'cat-lighting', retail: 1299, wholesale: 799 },
                                { name: 'LED 落地阅读灯', cat: 'cat-lighting', retail: 599, wholesale: 379 },
                            ],
                        },
                    ];
                    f = 0;
                    _e.label = 20;
                case 20:
                    if (!(f < otherFactoriesSeed.length)) return [3 /*break*/, 30];
                    of = otherFactoriesSeed[f];
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                username: "factory_".concat(f, "@platform"),
                                nickname: of.name + '管理员',
                                passwordHash: passHash,
                                role: 'factory',
                                avatar: of.logo,
                            },
                        })];
                case 21:
                    ghostUser = _e.sent();
                    return [4 /*yield*/, prisma.merchant.create({
                            data: {
                                userId: ghostUser.id,
                                type: 'factory',
                                name: of.name,
                                legalName: of.name + '有限公司',
                                creditCode: "9133".concat(String(Date.now()).slice(-12)).concat(f),
                                legalRep: '法人代表',
                                contact: '联系人',
                                contactPhone: "13900100".concat(String(f + 1).padStart(2, '0')),
                                region: of.region,
                                address: of.region + '工业园区',
                                businessLicense: of.logo,
                                qualifications: [of.logo],
                                categories: of.cats,
                                status: 'active',
                                level: of.level,
                                credit: of.credit,
                                totalGmv: of.gmv,
                            },
                        })
                        // 给每个厂家创建商品
                    ];
                case 22:
                    ghostMerchant = _e.sent();
                    pi = 0;
                    _e.label = 23;
                case 23:
                    if (!(pi < of.products.length)) return [3 /*break*/, 29];
                    pp = of.products[pi];
                    return [4 /*yield*/, prisma.product.create({
                            data: {
                                merchantId: ghostMerchant.id,
                                categoryId: pp.cat,
                                name: pp.name,
                                description: "".concat(of.name, " \u00B7 ").concat(pp.name),
                                images: [
                                    "https://picsum.photos/seed/f".concat(f, "_p").concat(pi, "_a/800/800"),
                                    "https://picsum.photos/seed/f".concat(f, "_p").concat(pi, "_b/800/800"),
                                ],
                                tags: of.tags,
                                priceRetailMin: pp.retail,
                                priceRetailMax: pp.retail + 500,
                                priceWholesaleMin: pp.wholesale,
                                priceWholesaleMax: pp.wholesale + 300,
                                priceMemberMin: Math.round(pp.retail * 0.85),
                                priceMemberMax: Math.round(pp.retail * 0.85) + 400,
                                shipping: ['factory'],
                                status: 'active',
                                totalStock: 150,
                                sales: 30 + pi * 15,
                                commentCount: 12 + pi * 5,
                                priceDisplayRules: {
                                    guestVisible: true,
                                    customerTier: 'retail',
                                    storeTier: 'wholesale',
                                    memberTier: 'member',
                                },
                            },
                        })];
                case 24:
                    newProd = _e.sent();
                    colors = ['原木色', '深胡桃'];
                    _a = 0, colors_1 = colors;
                    _e.label = 25;
                case 25:
                    if (!(_a < colors_1.length)) return [3 /*break*/, 28];
                    c = colors_1[_a];
                    return [4 /*yield*/, prisma.sku.create({
                            data: {
                                productId: newProd.id,
                                specs: { color: c },
                                specsLabel: c,
                                priceWholesale: pp.wholesale,
                                priceRetail: pp.retail,
                                priceMember: Math.round(pp.retail * 0.85),
                                stock: 50,
                            },
                        })];
                case 26:
                    _e.sent();
                    _e.label = 27;
                case 27:
                    _a++;
                    return [3 /*break*/, 25];
                case 28:
                    pi++;
                    return [3 /*break*/, 23];
                case 29:
                    f++;
                    return [3 /*break*/, 20];
                case 30:
                    console.log("  \u2713 ".concat(otherFactoriesSeed.length, " \u9009\u54C1\u5E7F\u573A\u793A\u610F\u5382\u5BB6\uFF08\u5171 ").concat(otherFactoriesSeed.reduce(function (s, f) { return s + f.products.length; }, 0), " \u5546\u54C1\uFF09"));
                    return [4 /*yield*/, prisma.address.create({
                            data: {
                                userId: customerUser.id,
                                name: '小九',
                                phone: '13800000000',
                                region: '上海市浦东新区',
                                detail: '世纪大道 1000 号嘉里中心 A 座 1801',
                                isDefault: true,
                            },
                        })];
                case 31:
                    addr1 = _e.sent();
                    return [4 /*yield*/, prisma.address.create({
                            data: {
                                userId: customerUser.id,
                                name: '小九（公司）',
                                phone: '13800000000',
                                region: '上海市黄浦区',
                                detail: '南京西路 1118 号梅龙镇广场 8 楼',
                                isDefault: false,
                            },
                        })
                        // ============ 5. merchant@demo 拥有的商品 ============
                    ];
                case 32:
                    _e.sent();
                    productsSeed = [
                        {
                            name: '北欧三人布艺沙发',
                            cat: 'cat-furniture',
                            baseRetail: 2999,
                            baseWholesale: 2199,
                            baseMember: 2599,
                            sales: 128,
                            comments: 56,
                        },
                        {
                            name: '实木餐桌椅四件套',
                            cat: 'cat-furniture',
                            baseRetail: 1599,
                            baseWholesale: 1099,
                            baseMember: 1299,
                            sales: 89,
                            comments: 38,
                        },
                        {
                            name: '现代简约客厅地毯',
                            cat: 'cat-curtain',
                            baseRetail: 599,
                            baseWholesale: 399,
                            baseMember: 499,
                            sales: 234,
                            comments: 102,
                        },
                        {
                            name: '北欧风遮光窗帘',
                            cat: 'cat-curtain',
                            baseRetail: 399,
                            baseWholesale: 259,
                            baseMember: 329,
                            sales: 178,
                            comments: 81,
                        },
                        {
                            name: 'LED 北欧吊灯',
                            cat: 'cat-lighting',
                            baseRetail: 899,
                            baseWholesale: 599,
                            baseMember: 749,
                            sales: 67,
                            comments: 28,
                        },
                        {
                            name: '可调光床头台灯',
                            cat: 'cat-lighting',
                            baseRetail: 199,
                            baseWholesale: 129,
                            baseMember: 169,
                            sales: 312,
                            comments: 145,
                        },
                    ];
                    productIds = [];
                    i = 0;
                    _e.label = 33;
                case 33:
                    if (!(i < productsSeed.length)) return [3 /*break*/, 39];
                    ps = productsSeed[i];
                    return [4 /*yield*/, prisma.product.create({
                            data: {
                                merchantId: merchantBiz.id,
                                categoryId: ps.cat,
                                name: ps.name,
                                description: "".concat(ps.name, " \u00B7 \u7ECF\u7EAC\u79D1\u6280\u7CBE\u9009\u54C1\u8D28"),
                                images: [
                                    "https://picsum.photos/seed/jjp".concat(i, "_a/800/800"),
                                    "https://picsum.photos/seed/jjp".concat(i, "_b/800/800"),
                                    "https://picsum.photos/seed/jjp".concat(i, "_c/800/800"),
                                ],
                                tags: i % 2 === 0 ? ['新品', '热销'] : ['推荐'],
                                priceRetailMin: ps.baseRetail,
                                priceRetailMax: ps.baseRetail + 1000,
                                priceWholesaleMin: ps.baseWholesale,
                                priceWholesaleMax: ps.baseWholesale + 700,
                                priceMemberMin: ps.baseMember,
                                priceMemberMax: ps.baseMember + 800,
                                shipping: ['factory', 'local'],
                                status: 'active',
                                totalStock: 200,
                                sales: ps.sales,
                                commentCount: ps.comments,
                                priceDisplayRules: {
                                    guestVisible: true,
                                    customerTier: 'retail',
                                    storeTier: 'wholesale',
                                    memberTier: 'member',
                                },
                            },
                        })];
                case 34:
                    product = _e.sent();
                    productIds.push(product.id);
                    colors = ['原木色', '深胡桃', '北欧白'];
                    j = 0;
                    _e.label = 35;
                case 35:
                    if (!(j < colors.length)) return [3 /*break*/, 38];
                    return [4 /*yield*/, prisma.sku.create({
                            data: {
                                productId: product.id,
                                specs: { color: colors[j] },
                                specsLabel: colors[j],
                                priceWholesale: ps.baseWholesale + j * 100,
                                priceRetail: ps.baseRetail + j * 200,
                                priceMember: ps.baseMember + j * 150,
                                stock: 50 + j * 20,
                            },
                        })];
                case 36:
                    _e.sent();
                    _e.label = 37;
                case 37:
                    j++;
                    return [3 /*break*/, 35];
                case 38:
                    i++;
                    return [3 /*break*/, 33];
                case 39:
                    console.log("  \u2713 ".concat(productsSeed.length, " \u5546\u54C1 + ").concat(productsSeed.length * 3, " SKU\uFF08merchant@demo \u6301\u6709\uFF09"));
                    // ============ 6. merchant 周边业务数据 ============
                    // 6.1 1 个门店
                    return [4 /*yield*/, prisma.store.create({
                            data: {
                                merchantId: merchantBiz.id,
                                name: '经纬科技 · 浦东体验店',
                                contact: '张店长',
                                phone: '13912340002',
                                region: '上海市浦东新区',
                                address: '世纪大道 88 号震旦国际大厦 1 楼',
                                longitude: 121.5054,
                                latitude: 31.2363,
                                level: 'A',
                                status: 'active',
                                authValidFrom: new Date(),
                                authValidTo: new Date(Date.now() + 365 * 86400000),
                                authConfig: {
                                    visiblePriceTiers: ['retail', 'wholesale', 'member'],
                                    categories: ['cat-furniture', 'cat-curtain'],
                                    markupRatio: 10,
                                },
                            },
                        })
                        // 6.2 2 个员工
                    ];
                case 40:
                    // ============ 6. merchant 周边业务数据 ============
                    // 6.1 1 个门店
                    _e.sent();
                    // 6.2 2 个员工
                    return [4 /*yield*/, prisma.staff.createMany({
                            data: [
                                {
                                    merchantId: merchantBiz.id,
                                    name: '王晓琳',
                                    phone: '13900100001',
                                    role: 'sales',
                                    status: 'active',
                                    monthlyPerformance: 12800,
                                },
                                {
                                    merchantId: merchantBiz.id,
                                    name: '陈志强',
                                    phone: '13900100002',
                                    role: 'cs',
                                    status: 'active',
                                    monthlyPerformance: 0,
                                },
                            ],
                        })
                        // 6.3 装修
                    ];
                case 41:
                    // 6.2 2 个员工
                    _e.sent();
                    // 6.3 装修
                    return [4 /*yield*/, prisma.shopDecorate.create({
                            data: {
                                merchantId: merchantBiz.id,
                                themeColor: '#FF4D2D',
                                fontStyle: 'modern',
                                productLayout: 'twoColumn',
                                cornerStyle: 'soft',
                                banners: [
                                    { id: 'b1', image: 'https://picsum.photos/seed/decob1/750/300', link: '' },
                                    { id: 'b2', image: 'https://picsum.photos/seed/decob2/750/300', link: '' },
                                ],
                                modules: [
                                    { id: 'm1', type: 'banner', sort: 1 },
                                    { id: 'm2', type: 'category', sort: 2 },
                                    { id: 'm3', type: 'product-list', sort: 3 },
                                ],
                            },
                        })
                        // 6.4 优惠券
                    ];
                case 42:
                    // 6.3 装修
                    _e.sent();
                    // 6.4 优惠券
                    return [4 /*yield*/, prisma.coupon.create({
                            data: {
                                merchantId: merchantBiz.id,
                                name: '满 999 减 100',
                                type: 'fullReduce',
                                amount: 100,
                                threshold: 999,
                                stock: 500,
                                received: 128,
                                used: 67,
                                validFrom: new Date(Date.now() - 7 * 86400000),
                                validTo: new Date(Date.now() + 30 * 86400000),
                                perUserLimit: 1,
                                scope: 'all',
                                status: 'active',
                            },
                        })
                        // 6.5 佣金规则
                    ];
                case 43:
                    // 6.4 优惠券
                    _e.sent();
                    // 6.5 佣金规则
                    return [4 /*yield*/, prisma.commissionRule.create({
                            data: {
                                merchantId: merchantBiz.id,
                                productId: null,
                                level1Percent: 8,
                                level2Percent: 2,
                                visibleToPromoter: true,
                                allowOffline: false,
                                enabled: true,
                            },
                        })
                        // 6.6 快捷回复
                    ];
                case 44:
                    // 6.5 佣金规则
                    _e.sent();
                    // 6.6 快捷回复
                    return [4 /*yield*/, prisma.quickReply.createMany({
                            data: [
                                {
                                    merchantId: merchantBiz.id,
                                    label: '欢迎语',
                                    content: '您好，欢迎光临经纬科技，请问需要什么帮助？',
                                    sort: 1,
                                },
                                {
                                    merchantId: merchantBiz.id,
                                    label: '尺寸咨询',
                                    content: '我们可以根据您家空间定制尺寸，请告知长×宽×高（cm）',
                                    sort: 2,
                                },
                                {
                                    merchantId: merchantBiz.id,
                                    label: '物流时效',
                                    content: '现货 24h 内发货，定制款 7-15 天交付',
                                    sort: 3,
                                },
                            ],
                        })
                        // ============ 7. 会员套餐 + merchant@demo 订阅 ============
                    ];
                case 45:
                    // 6.6 快捷回复
                    _e.sent();
                    plans = [
                        {
                            type: 'basic',
                            code: 'basic_monthly',
                            name: '基础月会员',
                            nameEn: 'Core Monthly Membership',
                            price: 99,
                            originalPrice: 199,
                            period: 'monthly',
                            periodCount: 1,
                            hot: false,
                            rights: ['店铺装修', '基础数据', '客服'],
                            rightsEn: ['Store design', 'Core analytics', 'Customer support'],
                            constraints: { pushSlots: 5, bannerLimit: 2, impressionLimit: 5000 },
                            sort: 1,
                        },
                        {
                            type: 'basic',
                            code: 'basic_yearly',
                            name: '基础年会员',
                            nameEn: 'Core Annual Membership',
                            price: 999,
                            originalPrice: 2388,
                            period: 'yearly',
                            periodCount: 1,
                            hot: true,
                            rights: ['店铺装修', '基础数据', '客服', '广告投放优先级'],
                            rightsEn: ['Store design', 'Core analytics', 'Customer support', 'Priority ad placement'],
                            constraints: { pushSlots: 60, bannerLimit: 24, impressionLimit: 60000 },
                            sort: 2,
                        },
                        {
                            type: 'ad',
                            code: 'ad_basic',
                            name: '广告基础',
                            nameEn: 'Advertising Basic',
                            price: 299,
                            originalPrice: 599,
                            period: 'monthly',
                            periodCount: 1,
                            hot: false,
                            rights: ['首页 Banner ×3', '推送 ×10'],
                            rightsEn: ['3 home banners', '10 featured placements'],
                            constraints: { pushSlots: 10, bannerLimit: 3, impressionLimit: 10000 },
                            sort: 3,
                        },
                        {
                            type: 'ad',
                            code: 'ad_pro',
                            name: '广告专业',
                            nameEn: 'Advertising Pro',
                            price: 999,
                            originalPrice: 1999,
                            period: 'monthly',
                            periodCount: 1,
                            hot: true,
                            rights: ['首页 Banner ×10', '推送 ×30', '专属客服'],
                            rightsEn: ['10 home banners', '30 featured placements', 'Dedicated support'],
                            constraints: { pushSlots: 30, bannerLimit: 10, impressionLimit: 50000 },
                            sort: 4,
                        },
                        {
                            type: 'addon',
                            code: 'addon_quota_push_50',
                            name: '推送加包 50 次',
                            nameEn: '50 Featured Placements Add-on',
                            price: 99,
                            period: 'oneoff',
                            periodCount: 1,
                            rights: ['+50 次推送'],
                            rightsEn: ['50 additional featured placements'],
                            constraints: { pushSlots: 50 },
                            sort: 5,
                        },
                        {
                            type: 'addon',
                            code: 'addon_quota_banner_5',
                            name: 'Banner 加包 5 次',
                            nameEn: '5 Banner Add-on',
                            price: 79,
                            period: 'oneoff',
                            periodCount: 1,
                            rights: ['+5 次 Banner'],
                            rightsEn: ['5 additional banners'],
                            constraints: { bannerLimit: 5 },
                            sort: 6,
                        },
                    ];
                    _b = 0, plans_1 = plans;
                    _e.label = 46;
                case 46:
                    if (!(_b < plans_1.length)) return [3 /*break*/, 49];
                    p = plans_1[_b];
                    return [4 /*yield*/, prisma.memberPlan.create({
                            data: __assign(__assign({}, p), { rights: p.rights, rightsEn: p.rightsEn, constraints: p.constraints }),
                        })];
                case 47:
                    _e.sent();
                    _e.label = 48;
                case 48:
                    _b++;
                    return [3 /*break*/, 46];
                case 49: return [4 /*yield*/, prisma.memberPlan.findUnique({ where: { code: 'ad_pro' } })];
                case 50:
                    adProPlan = _e.sent();
                    if (!adProPlan) return [3 /*break*/, 54];
                    startAt = new Date(Date.now() - 7 * 86400000);
                    endAt = new Date(startAt.getTime() + 30 * 86400000);
                    return [4 /*yield*/, prisma.merchantMembership.create({
                            data: {
                                merchantId: merchantBiz.id,
                                planId: adProPlan.id,
                                planCode: adProPlan.code,
                                startAt: startAt,
                                endAt: endAt,
                                status: 'active',
                                autoRenew: true,
                            },
                        })];
                case 51:
                    _e.sent();
                    return [4 /*yield*/, prisma.paymentRecord.create({
                            data: {
                                no: "MP".concat(Date.now(), "001"),
                                merchantId: merchantBiz.id,
                                planId: adProPlan.id,
                                planName: adProPlan.name,
                                planType: adProPlan.type,
                                amount: adProPlan.price,
                                paymentMethod: 'wechat',
                                status: 'paid',
                                paidAt: startAt,
                            },
                        })
                        // 使用配额
                    ];
                case 52:
                    _e.sent();
                    periodStart = new Date();
                    periodStart.setDate(1);
                    periodStart.setHours(0, 0, 0, 0);
                    periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);
                    return [4 /*yield*/, prisma.usageQuota.create({
                            data: {
                                merchantId: merchantBiz.id,
                                planId: adProPlan.id,
                                periodStart: periodStart,
                                periodEnd: periodEnd,
                                data: { pushSlots: 30, bannerLimit: 10, impressionLimit: 50000 },
                                pushSlotsLimit: 30,
                                pushSlotsUsed: 8,
                                bannerLimit: 10,
                                bannerUsed: 3,
                                impressionLimit: 50000,
                                impressionUsed: 12450,
                            },
                        })];
                case 53:
                    _e.sent();
                    _e.label = 54;
                case 54:
                    console.log('  ✓ 6 会员套餐 + merchant@demo 已订阅广告专业 + 使用配额');
                    return [4 /*yield*/, prisma.sku.findMany({
                            where: { product: { merchantId: merchantBiz.id } },
                            include: { product: true },
                        })];
                case 55:
                    skuList = _e.sent();
                    orderSeeds = [
                        {
                            status: 'pending_payment',
                            skuIdx: 0,
                            qty: 1,
                            daysAgo: 0,
                            hoursAgo: 0.5,
                            expires: 30 * 60000,
                            label: '刚下单待付款',
                        },
                        {
                            status: 'pending_shipment',
                            skuIdx: 2,
                            qty: 2,
                            daysAgo: 0,
                            hoursAgo: 4,
                            paid: true,
                            label: '已付款待发货',
                        },
                        {
                            status: 'shipped',
                            skuIdx: 5,
                            qty: 1,
                            daysAgo: 2,
                            hoursAgo: 0,
                            paid: true,
                            shipped: true,
                            label: '已发货',
                        },
                        {
                            status: 'completed',
                            skuIdx: 8,
                            qty: 1,
                            daysAgo: 14,
                            hoursAgo: 0,
                            paid: true,
                            shipped: true,
                            completed: true,
                            label: '已完成',
                        },
                        {
                            status: 'after_sale',
                            skuIdx: 11,
                            qty: 1,
                            daysAgo: 9,
                            hoursAgo: 0,
                            paid: true,
                            shipped: true,
                            completed: true,
                            label: '售后中',
                        },
                    ];
                    orderIds = [];
                    i = 0;
                    _e.label = 56;
                case 56:
                    if (!(i < orderSeeds.length)) return [3 /*break*/, 62];
                    os = orderSeeds[i];
                    sku = skuList[os.skuIdx];
                    if (!sku)
                        return [3 /*break*/, 61];
                    createdAt = new Date(Date.now() - os.daysAgo * 86400000 - (os.hoursAgo || 0) * 3600000);
                    itemAmount = Number(sku.priceRetail) * os.qty;
                    shippingFee = 10;
                    payAmount = itemAmount + shippingFee;
                    return [4 /*yield*/, prisma.order.create({
                            data: {
                                no: "ORD".concat(createdAt.getFullYear()).concat(String(createdAt.getMonth() + 1).padStart(2, '0')).concat(String(createdAt.getDate()).padStart(2, '0')).concat(String(i + 100).padStart(4, '0')),
                                userId: customerUser.id,
                                merchantId: merchantBiz.id,
                                status: os.status,
                                totalAmount: itemAmount,
                                shippingFee: shippingFee,
                                payAmount: payAmount,
                                shippingMethod: 'factory',
                                paymentMethod: os.paid ? 'wechat' : null,
                                address: {
                                    name: addr1.name,
                                    phone: addr1.phone,
                                    region: addr1.region,
                                    detail: addr1.detail,
                                },
                                remark: i === 0 ? '请尽快发货，谢谢' : undefined,
                                expiresAt: os.expires ? new Date(createdAt.getTime() + os.expires) : null,
                                paidAt: os.paid ? new Date(createdAt.getTime() + 60000) : null,
                                shippedAt: os.shipped ? new Date(createdAt.getTime() + 4 * 3600000) : null,
                                completedAt: os.completed ? new Date(createdAt.getTime() + 7 * 86400000) : null,
                                trackingCompany: os.shipped ? '顺丰' : null,
                                trackingNumber: os.shipped ? "SF".concat(1000000000 + i) : null,
                                createdAt: createdAt,
                            },
                        })];
                case 57:
                    order = _e.sent();
                    return [4 /*yield*/, prisma.orderItem.create({
                            data: {
                                orderId: order.id,
                                productId: sku.productId,
                                skuId: sku.id,
                                productName: sku.product.name,
                                productImage: sku.product.images[0] || '',
                                specsLabel: sku.specsLabel,
                                unitPrice: sku.priceRetail,
                                quantity: os.qty,
                            },
                        })];
                case 58:
                    orderItem = _e.sent();
                    if (!os.paid) return [3 /*break*/, 60];
                    return [4 /*yield*/, prisma.payment.create({
                            data: {
                                orderId: order.id,
                                method: 'wechat',
                                amount: payAmount,
                                status: 'success',
                                wxTransactionId: "wx".concat(createdAt.getTime()),
                                paidAt: new Date(createdAt.getTime() + 60000),
                            },
                        })];
                case 59:
                    _e.sent();
                    _e.label = 60;
                case 60:
                    orderIds.push({ id: order.id, status: os.status, itemId: orderItem.id });
                    _e.label = 61;
                case 61:
                    i++;
                    return [3 /*break*/, 56];
                case 62:
                    console.log("  \u2713 ".concat(orderIds.length, " \u8BA2\u5355\uFF08customer@demo \u5728 merchant@demo \u5904\u7684\u5168\u72B6\u6001\u8BA2\u5355\uFF09"));
                    afterSaleOrder = orderIds.find(function (o) { return o.status === 'after_sale'; });
                    if (!afterSaleOrder) return [3 /*break*/, 64];
                    return [4 /*yield*/, prisma.refund.create({
                            data: {
                                no: "R".concat(Date.now(), "01"),
                                orderId: afterSaleOrder.id,
                                orderItemId: afterSaleOrder.itemId,
                                userId: customerUser.id,
                                merchantId: merchantBiz.id,
                                type: 'refund_with_return',
                                reason: '商品有瑕疵',
                                description: '收到时发现台灯灯罩有轻微划痕，且开关接触不良，希望退货退款',
                                evidence: [
                                    'https://picsum.photos/seed/refund1/600/600',
                                    'https://picsum.photos/seed/refund2/600/600',
                                ],
                                applyAmount: 209,
                                status: 'pending',
                            },
                        })];
                case 63:
                    _e.sent();
                    console.log('  ✓ 1 售后申请（pending，待 merchant@demo 处理）');
                    _e.label = 64;
                case 64:
                    i = 0;
                    _e.label = 65;
                case 65:
                    if (!(i < 3)) return [3 /*break*/, 68];
                    return [4 /*yield*/, prisma.favorite.create({
                            data: { userId: customerUser.id, productId: productIds[i] },
                        })];
                case 66:
                    _e.sent();
                    _e.label = 67;
                case 67:
                    i++;
                    return [3 /*break*/, 65];
                case 68:
                    if (!skuList[1]) return [3 /*break*/, 70];
                    return [4 /*yield*/, prisma.cartItem.create({
                            data: {
                                userId: customerUser.id,
                                productId: skuList[1].productId,
                                skuId: skuList[1].id,
                                quantity: 2,
                            },
                        })];
                case 69:
                    _e.sent();
                    _e.label = 70;
                case 70:
                    console.log('  ✓ customer@demo 收藏 3 个商品 + 购物车 1 个 SKU');
                    return [4 /*yield*/, prisma.chatSession.create({
                            data: {
                                userId: customerUser.id,
                                merchantId: merchantBiz.id,
                                lastMessageAt: new Date(),
                                unreadCount: 1,
                                status: 'open',
                            },
                        })];
                case 71:
                    session = _e.sent();
                    return [4 /*yield*/, prisma.chatMessage.createMany({
                            data: [
                                {
                                    sessionId: session.id,
                                    sender: 'user',
                                    type: 'text',
                                    content: '您好，请问北欧三人布艺沙发可以定制尺寸吗？',
                                    read: true,
                                    createdAt: new Date(Date.now() - 2 * 3600000),
                                },
                                {
                                    sessionId: session.id,
                                    sender: 'merchant',
                                    type: 'quick',
                                    content: '我们可以根据您家空间定制尺寸，请告知长×宽×高（cm）',
                                    read: true,
                                    createdAt: new Date(Date.now() - 2 * 3600000 + 30000),
                                },
                                {
                                    sessionId: session.id,
                                    sender: 'user',
                                    type: 'text',
                                    content: '我的客厅是 320×220 cm，能做吗？',
                                    read: true,
                                    createdAt: new Date(Date.now() - 1.5 * 3600000),
                                },
                                {
                                    sessionId: session.id,
                                    sender: 'merchant',
                                    type: 'text',
                                    content: '可以的！标准款最大 320cm。我帮您留意一下材质和颜色偏好？',
                                    read: true,
                                    createdAt: new Date(Date.now() - 1.5 * 3600000 + 60000),
                                },
                                {
                                    sessionId: session.id,
                                    sender: 'user',
                                    type: 'text',
                                    content: '想要原木色，但听说现货只有北欧白？',
                                    read: false,
                                    createdAt: new Date(Date.now() - 10 * 60000),
                                },
                            ],
                        })];
                case 72:
                    _e.sent();
                    console.log('  ✓ 1 客服会话 + 5 条消息（customer ↔ merchant，未读 1 条）');
                    // ============ 12. 审核记录（admin@demo 审过 merchant 入驻 + 1 商品）============
                    return [4 /*yield*/, prisma.auditRecord.create({
                            data: {
                                type: 'merchant',
                                targetId: merchantBiz.id,
                                status: 'approved',
                                auditorId: adminUser.id,
                                reviewedAt: new Date(Date.now() - 30 * 86400000),
                            },
                        })];
                case 73:
                    // ============ 12. 审核记录（admin@demo 审过 merchant 入驻 + 1 商品）============
                    _e.sent();
                    return [4 /*yield*/, prisma.auditRecord.create({
                            data: {
                                type: 'product',
                                targetId: productIds[0],
                                status: 'approved',
                                auditorId: adminUser.id,
                                reviewedAt: new Date(Date.now() - 25 * 86400000),
                            },
                        })];
                case 74:
                    _e.sent();
                    console.log('  ✓ admin@demo 审核记录：1 商户入驻 + 1 商品上架');
                    slots = [
                        {
                            code: 'mp_home_banner',
                            name: '小程序首页轮播',
                            scene: '用户端首页',
                            target: 'customer',
                            position: 'top',
                            size: '750x300',
                            sort: 1,
                        },
                        {
                            code: 'merchant_home_card',
                            name: '商家 APP 首页广告卡',
                            scene: '商家端首页',
                            target: 'factory',
                            sort: 2,
                        },
                        {
                            code: 'mp_detail_top',
                            name: '商品详情顶部',
                            scene: '用户端详情',
                            target: 'customer',
                            sort: 3,
                        },
                        { code: 'mp_splash', name: '开屏广告', scene: '用户端启动', target: 'all', sort: 4 },
                        { code: 'wheel_reward', name: '推广转盘', scene: '推广中心', target: 'customer', sort: 5 },
                    ];
                    _c = 0, slots_1 = slots;
                    _e.label = 75;
                case 75:
                    if (!(_c < slots_1.length)) return [3 /*break*/, 78];
                    s = slots_1[_c];
                    return [4 /*yield*/, prisma.adSlot.create({ data: __assign(__assign({}, s), { enabled: true, status: 'active' }) })];
                case 76:
                    _e.sent();
                    _e.label = 77;
                case 77:
                    _c++;
                    return [3 /*break*/, 75];
                case 78:
                    flags = [
                        {
                            key: 'home.entry.orderManagement',
                            label: '订单管理入口',
                            group: 'home_entry',
                            defaultEnabled: true,
                            sort: 1,
                        },
                        {
                            key: 'home.entry.productManagement',
                            label: '商品管理入口',
                            group: 'home_entry',
                            defaultEnabled: true,
                            sort: 2,
                        },
                        {
                            key: 'home.entry.marketing',
                            label: '营销入口',
                            group: 'home_entry',
                            defaultEnabled: true,
                            sort: 3,
                        },
                        {
                            key: 'home.entry.plaza',
                            label: '选品广场入口',
                            group: 'home_entry',
                            defaultEnabled: true,
                            sort: 4,
                        },
                        {
                            key: 'role.button.exportData',
                            label: '数据导出',
                            group: 'role_button',
                            defaultEnabled: true,
                            sort: 1,
                        },
                        {
                            key: 'role.button.bulkAction',
                            label: '批量操作',
                            group: 'role_button',
                            defaultEnabled: true,
                            sort: 2,
                        },
                        {
                            key: 'side.menu.commission',
                            label: '佣金菜单',
                            group: 'side_menu',
                            defaultEnabled: true,
                            sort: 1,
                        },
                        {
                            key: 'side.menu.decorate',
                            label: '装修菜单',
                            group: 'side_menu',
                            defaultEnabled: true,
                            sort: 2,
                        },
                    ];
                    _d = 0, flags_1 = flags;
                    _e.label = 79;
                case 79:
                    if (!(_d < flags_1.length)) return [3 /*break*/, 82];
                    f = flags_1[_d];
                    return [4 /*yield*/, prisma.featureFlag.create({ data: f })];
                case 80:
                    _e.sent();
                    _e.label = 81;
                case 81:
                    _d++;
                    return [3 /*break*/, 79];
                case 82:
                    ledgerPhone = '13800138000';
                    return [4 /*yield*/, prisma.ledgerUser.deleteMany({ where: { phone: ledgerPhone } })];
                case 83:
                    _e.sent();
                    return [4 /*yield*/, prisma.ledgerUser.create({
                            data: {
                                phone: ledgerPhone,
                                passwordHash: passHash,
                                nickname: '门窗张师傅',
                                // 月卡会员（30 天有效），登录后可直接进首页
                                membership: {
                                    create: { expiresAt: new Date(Date.now() + 30 * 86400000), lastPlanKey: 'month' },
                                },
                                goal: { create: { monthly: 45000, yearly: 480000 } },
                            },
                        })];
                case 84:
                    ledgerUser = _e.sent();
                    return [4 /*yield*/, Promise.all([
                            {
                                name: '赵强',
                                phone: '13860218830',
                                address: '朝阳区 · 望京西园 4 区',
                                note: '老客户，常介绍新单',
                            },
                            {
                                name: '王芳',
                                phone: '13911082245',
                                address: '海淀区 · 中关村南大街 18 号',
                                note: '注重密封性能',
                            },
                            { name: '李娜', phone: '13700135582', address: '西城区 · 月坛北街', note: '' },
                        ].map(function (c) { return prisma.ledgerCustomer.create({ data: __assign({ userId: ledgerUser.id }, c) }); }))];
                case 85:
                    lc = _e.sent();
                    mkLedgerOrder = function (customerName, customerId, date, total, costs, extras, note) {
                        return prisma.ledgerOrder.create({
                            data: {
                                userId: ledgerUser.id,
                                customerId: customerId,
                                customerName: customerName,
                                date: new Date(date),
                                total: total,
                                costProfile: costs[0],
                                costGlass: costs[1],
                                costHardware: costs[2],
                                costLabor: costs[3],
                                costScreen: costs[4],
                                extras: extras,
                                note: note,
                            },
                        });
                    };
                    return [4 /*yield*/, mkLedgerOrder('赵强', lc[0].id, '2026-06-05', 58200, [16800, 9200, 4100, 6800, 1900], [
                            { type: '上门安装费', amount: 2200 },
                            { type: '运费', amount: 600 },
                        ], '阳台断桥铝推拉门 + 封窗')];
                case 86:
                    _e.sent();
                    return [4 /*yield*/, mkLedgerOrder('王芳', lc[1].id, '2026-05-28', 41800, [12200, 6800, 3000, 4400, 1500], [{ type: '上门安装费', amount: 1600 }], '客厅落地窗')];
                case 87:
                    _e.sent();
                    return [4 /*yield*/, mkLedgerOrder('李娜', lc[2].id, '2026-05-06', 18700, [5400, 2900, 1300, 2400, 700], [{ type: '油费', amount: 160 }], '飘窗封窗')];
                case 88:
                    _e.sent();
                    return [4 /*yield*/, mkLedgerOrder('赵强', lc[0].id, '2026-04-19', 53100, [15400, 8400, 3800, 5800, 1800], [{ type: '上门安装费', amount: 2000 }], '别墅一层门窗')];
                case 89:
                    _e.sent();
                    return [4 /*yield*/, mkLedgerOrder('王芳', lc[1].id, '2026-03-24', 44900, [13100, 7100, 3200, 4700, 1600], [{ type: '上门安装费', amount: 1700 }], '客餐厅整面窗')
                        // 偏好设置（默认值，换机不丢）+ 应用内消息（真实事件，非前端硬编码）
                    ];
                case 90:
                    _e.sent();
                    // 偏好设置（默认值，换机不丢）+ 应用内消息（真实事件，非前端硬编码）
                    return [4 /*yield*/, prisma.ledgerSetting.create({ data: { userId: ledgerUser.id } })];
                case 91:
                    // 偏好设置（默认值，换机不丢）+ 应用内消息（真实事件，非前端硬编码）
                    _e.sent();
                    day = 86400000;
                    return [4 /*yield*/, prisma.ledgerNotification.createMany({
                            data: [
                                {
                                    userId: ledgerUser.id,
                                    type: 'welcome',
                                    title: '欢迎使用门窗利账',
                                    body: '感谢使用门窗利账，祝您生意兴隆，利润长虹。',
                                    read: true,
                                    createdAt: new Date(Date.now() - 7 * day),
                                },
                                {
                                    userId: ledgerUser.id,
                                    type: 'member',
                                    title: '会员已开通',
                                    body: '已为您开通月卡会员（30 天），可使用全部记账与报表功能。',
                                    read: true,
                                    createdAt: new Date(Date.now() - 7 * day + 60000),
                                },
                                {
                                    userId: ledgerUser.id,
                                    type: 'order',
                                    title: '订单已保存',
                                    body: '客户「赵强」的订单已录入，利润 ¥18,600。',
                                    read: false,
                                    createdAt: new Date(Date.now() - 2 * day),
                                },
                                {
                                    userId: ledgerUser.id,
                                    type: 'goal',
                                    title: '本月目标进度',
                                    body: '本月利润已完成目标的 68%，继续加油。',
                                    read: false,
                                    createdAt: new Date(Date.now() - 3600000),
                                },
                            ],
                        })];
                case 92:
                    _e.sent();
                    console.log('\n✅ Seed 完成。关联关系总览：');
                    console.log('   admin@demo  → 审核了 merchant@demo 入驻 + 1 件商品');
                    console.log('   merchant@demo → 6 商品 / 18 SKU / 1 门店 / 2 员工 / 装修 / 优惠券 / 佣金规则 / 广告专业套餐');
                    console.log('   customer@demo (13800000000) → 在 merchant@demo 下 5 单（待付/待发/已发/完成/售后）');
                    console.log('                              → 收藏 3 商品 + 购物车 1 SKU + 客服 1 会话(5 消息)');
                    console.log('   门窗利账 13800138000 / <默认密码> → 月卡会员(30天) + 3 客户 + 5 订单（记账小程序登录用）');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
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
