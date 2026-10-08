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
exports.OrderShareService = void 0;
/**
 * 订单分享服务（商家端 → 客户）
 *
 * 业务定位：
 *   家装 / 定制 / 工程类业务场景下,商家需要把订单详情(报价 / 设计 / 量房 / 合同)
 *   分享给客户在小程序或 H5 查看。客户不需要登录,凭 shareCode 直接看脱敏后的订单。
 *
 * 字段可见性控制：
 *   - basics  订单号 / 状态 / 日期 / 总金额
 *   - customer 客户信息(姓名 / 电话 / 地址)
 *   - pricing  价格明细(单价 / 优惠 / 运费 / 应付)
 *   - items    商品 / 服务清单
 *   - extra    附加信息(备注 / 物流 / 量房 / 合同等定制字段)
 *
 * 存储策略：
 *   正式表 OrderShare,shareCode 用 nanoid 12 位作主键(避免暴力枚举),
 *   公开访问通过 shareCode 直接 findUnique,O(1) 查询。
 *   列表 / 撤销按 orderId / merchantId 走索引,不再有截断问题。
 *
 *   注意表存储 expiresAt / createdAt 为 DateTime,对外契约统一转 ISO string,
 *   visibleFields 存为 String[],对外按 ShareField[] 使用。
 */
var common_1 = require("@nestjs/common");
var nanoid_1 = require("nanoid");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
var pagination_util_1 = require("../../common/utils/pagination.util");
var internal_test_merchant_util_1 = require("../../common/utils/internal-test-merchant.util");
var VALID_FIELDS = ['basics', 'customer', 'pricing', 'items', 'extra'];
var genShareCode = (0, nanoid_1.customAlphabet)('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 12);
var OrderShareService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var OrderShareService = _classThis = /** @class */ (function () {
        function OrderShareService_1(prisma) {
            this.prisma = prisma;
        }
        /**
         * 创建/更新分享(同一订单总是只有一份当前生效的分享,后建覆盖前面)
         */
        OrderShareService_1.prototype.createShare = function (params) {
            return __awaiter(this, void 0, void 0, function () {
                var order, visibleFields, intro, days, expiresAtDate, expiresAt, shareCode;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.order.findUnique({
                                where: { id: params.orderId },
                                select: { id: true, merchantId: true, no: true },
                            })];
                        case 1:
                            order = _a.sent();
                            if (!order)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '订单不存在');
                            if (order.merchantId !== params.merchantId) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '无权分享他人订单');
                            }
                            visibleFields = (params.visibleFields || []).filter(function (f) {
                                return VALID_FIELDS.includes(f);
                            });
                            if (visibleFields.length === 0) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '至少选择一项可见内容');
                            }
                            intro = (params.intro || '').trim().slice(0, 80);
                            days = Math.max(0, Math.min(365, Number(params.expiresInDays) || 0));
                            expiresAtDate = days > 0 ? new Date(Date.now() + days * 86400000) : null;
                            expiresAt = expiresAtDate ? expiresAtDate.toISOString() : null;
                            // 5. 撤销该订单已有的分享(同一订单同时只有一份生效)
                            return [4 /*yield*/, this.revokePreviousByOrder(params.orderId)
                                // 6. 生成新分享
                            ];
                        case 2:
                            // 5. 撤销该订单已有的分享(同一订单同时只有一份生效)
                            _a.sent();
                            shareCode = genShareCode();
                            return [4 /*yield*/, this.prisma.orderShare.create({
                                    data: {
                                        shareCode: shareCode,
                                        orderId: params.orderId,
                                        merchantId: params.merchantId,
                                        visibleFields: visibleFields,
                                        expiresAt: expiresAtDate,
                                        intro: intro || null,
                                        createdBy: params.callerSub,
                                    },
                                })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, {
                                    shareCode: shareCode,
                                    orderNo: order.no,
                                    expiresAt: expiresAt,
                                    visibleFields: visibleFields,
                                    intro: intro,
                                }];
                    }
                });
            });
        };
        /**
         * 商家查询该订单当前生效的分享(用于回显编辑表单)
         */
        OrderShareService_1.prototype.getCurrentByOrder = function (orderId, merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                var row;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.orderShare.findFirst({
                                where: { orderId: orderId, merchantId: merchantId, revoked: false },
                                orderBy: { updatedAt: 'desc' },
                            })];
                        case 1:
                            row = _a.sent();
                            if (!row)
                                return [2 /*return*/, null];
                            return [2 /*return*/, { shareCode: row.shareCode, config: this.toConfig(row) }];
                    }
                });
            });
        };
        /**
         * 商家撤销订单的当前分享(链接立即失效)
         */
        OrderShareService_1.prototype.revokeByOrder = function (orderId, merchantId) {
            return __awaiter(this, void 0, void 0, function () {
                var current;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getCurrentByOrder(orderId, merchantId)];
                        case 1:
                            current = _a.sent();
                            if (!current)
                                return [2 /*return*/, { ok: true, revoked: false }];
                            return [4 /*yield*/, this.prisma.orderShare.update({
                                    where: { shareCode: current.shareCode },
                                    data: { revoked: true },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { ok: true, revoked: true, shareCode: current.shareCode }];
                    }
                });
            });
        };
        /**
         * 内部:创建新分享前把同一订单已有分享标 revoked
         * 避免一个订单有多个并存的 shareCode 互相干扰
         */
        OrderShareService_1.prototype.revokePreviousByOrder = function (orderId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.orderShare.updateMany({
                                where: { orderId: orderId, revoked: false },
                                data: { revoked: true },
                            })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        /**
         * 把 OrderShare 行映射成对外的 OrderShareConfig 契约形状
         * （DateTime → ISO string，String[] → ShareField[]）
         */
        OrderShareService_1.prototype.toConfig = function (row) {
            return {
                orderId: row.orderId,
                merchantId: row.merchantId,
                visibleFields: (row.visibleFields || []),
                expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
                intro: row.intro || undefined,
                viewCount: row.viewCount || 0,
                revoked: !!row.revoked,
                createdAt: row.createdAt.toISOString(),
                createdBy: row.createdBy || undefined,
            };
        };
        /**
         * 公开访问:按 shareCode 拉脱敏后的订单
         *
         * 返回结构按 visibleFields 严格过滤,被隐藏的字段不在返回 JSON 中,
         * 避免客户端通过浏览器 devtools 反向取到敏感信息。
         *
         * 同时:
         *   - revoked → 抛 410 Gone
         *   - expiresAt 过期 → 抛 410 Gone
         *   - viewCount +1(异步,不阻塞响应)
         */
        OrderShareService_1.prototype.getPublicByCode = function (shareCode) {
            return __awaiter(this, void 0, void 0, function () {
                var row, cfg, orderRow, merchantRow, _a, order, visible, result, addr;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!shareCode || shareCode.length < 6) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '分享不存在');
                            }
                            return [4 /*yield*/, this.prisma.orderShare.findUnique({
                                    where: { shareCode: shareCode },
                                })];
                        case 1:
                            row = _b.sent();
                            if (!row)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '分享不存在或已撤销');
                            return [4 /*yield*/, (0, internal_test_merchant_util_1.isInternalTestMerchant)(this.prisma, row.merchantId)];
                        case 2:
                            if (_b.sent()) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '分享不存在或已撤销');
                            }
                            cfg = this.toConfig(row);
                            if (cfg.revoked)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '该分享已被商家撤销');
                            if (cfg.expiresAt && new Date(cfg.expiresAt).getTime() < Date.now()) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.FORBIDDEN, '该分享链接已过期');
                            }
                            return [4 /*yield*/, this.prisma.order.findUnique({
                                    where: { id: cfg.orderId },
                                    include: {
                                        items: true,
                                    },
                                })];
                        case 3:
                            orderRow = (_b.sent());
                            if (!orderRow)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '订单已不存在');
                            if (!orderRow.merchantId) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.prisma.merchant.findUnique({
                                    where: { id: orderRow.merchantId },
                                    select: { id: true, name: true, contactPhone: true },
                                })];
                        case 4:
                            _a = _b.sent();
                            return [3 /*break*/, 6];
                        case 5:
                            _a = null;
                            _b.label = 6;
                        case 6:
                            merchantRow = _a;
                            order = orderRow;
                            visible = new Set(cfg.visibleFields);
                            result = {
                                shareCode: shareCode,
                                intro: cfg.intro,
                                expiresAt: cfg.expiresAt,
                                merchant: merchantRow,
                            };
                            if (visible.has('basics')) {
                                result.basics = {
                                    no: order.no,
                                    status: order.status,
                                    totalAmount: order.totalAmount,
                                    payAmount: order.payAmount,
                                    createdAt: order.createdAt,
                                    paidAt: order.paidAt,
                                    shippedAt: order.shippedAt,
                                    completedAt: order.completedAt,
                                };
                            }
                            if (visible.has('customer')) {
                                addr = order.address || {};
                                result.customer = {
                                    name: addr.name || null,
                                    phone: addr.phone || null,
                                    region: addr.region || null,
                                    detail: addr.detail || null,
                                };
                            }
                            if (visible.has('pricing')) {
                                result.pricing = {
                                    totalAmount: order.totalAmount,
                                    discountAmount: order.discountAmount,
                                    shippingFee: order.shippingFee,
                                    couponDiscount: order.couponDiscount,
                                    payAmount: order.payAmount,
                                    paymentMethod: order.paymentMethod,
                                };
                            }
                            if (visible.has('items')) {
                                result.items = order.items.map(function (it) { return ({
                                    id: it.id,
                                    productName: it.productName,
                                    productImage: it.productImage,
                                    specsLabel: it.specsLabel,
                                    unitPrice: it.unitPrice,
                                    quantity: it.quantity,
                                }); });
                            }
                            if (visible.has('extra')) {
                                result.extra = {
                                    remark: order.remark,
                                    shippingMethod: order.shippingMethod,
                                    trackingCompany: order.trackingCompany,
                                    trackingNumber: order.trackingNumber,
                                };
                            }
                            // 异步累加浏览数,不阻塞响应
                            this.prisma.orderShare
                                .update({ where: { shareCode: shareCode }, data: { viewCount: { increment: 1 } } })
                                .catch(function () { });
                            return [2 /*return*/, result];
                    }
                });
            });
        };
        /**
         * 商家维度分享历史（merchant-app「我的分享」/ admin-pc 兜底用）
         *
         * 直接走 OrderShare 表索引（merchantId / revoked），真分页（skip / take）+ count，
         * 不再扫描内存切片。
         *
         * 过滤维度：
         *   - revoked: true/false（不传不过滤）
         *   - orderId: 精确匹配（按订单回查分享）
         *
         * 每条记录会拼接 orderNo 摘要，便于前端列表直接 row.orderNo 展示，
         * 避免 N 次详情查询。
         */
        OrderShareService_1.prototype.listByMerchant = function (merchantId_1) {
            return __awaiter(this, arguments, void 0, function (merchantId, query) {
                var _a, skip, take, page, pageSize, where, _b, rows, total, orderIds, orderMap, orders, _i, orders_1, o, now, list;
                if (query === void 0) { query = {}; }
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _a = (0, pagination_util_1.parsePage)(query), skip = _a.skip, take = _a.take, page = _a.page, pageSize = _a.pageSize;
                            where = { merchantId: merchantId };
                            if (query.revoked === true || query.revoked === 'true')
                                where.revoked = true;
                            else if (query.revoked === false || query.revoked === 'false')
                                where.revoked = false;
                            if (query.orderId)
                                where.orderId = query.orderId;
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.orderShare.findMany({
                                        where: where,
                                        orderBy: { updatedAt: 'desc' },
                                        skip: skip,
                                        take: take,
                                    }),
                                    this.prisma.orderShare.count({ where: where }),
                                ])
                                // 批量取订单号摘要
                            ];
                        case 1:
                            _b = _c.sent(), rows = _b[0], total = _b[1];
                            orderIds = Array.from(new Set(rows.map(function (r) { return r.orderId; })));
                            orderMap = new Map();
                            if (!orderIds.length) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.order.findMany({
                                    where: { id: { in: orderIds } },
                                    select: { id: true, no: true },
                                })];
                        case 2:
                            orders = _c.sent();
                            for (_i = 0, orders_1 = orders; _i < orders_1.length; _i++) {
                                o = orders_1[_i];
                                orderMap.set(o.id, o.no);
                            }
                            _c.label = 3;
                        case 3:
                            now = Date.now();
                            list = rows.map(function (r) { return ({
                                shareCode: r.shareCode,
                                orderId: r.orderId,
                                orderNo: orderMap.get(r.orderId) || null,
                                merchantId: r.merchantId,
                                visibleFields: r.visibleFields || [],
                                expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
                                intro: r.intro || '',
                                viewCount: r.viewCount || 0,
                                revoked: !!r.revoked,
                                expired: !!(r.expiresAt && r.expiresAt.getTime() < now),
                                createdAt: r.createdAt.toISOString(),
                            }); });
                            return [2 /*return*/, (0, pagination_util_1.buildPage)(list, total, page, pageSize)];
                    }
                });
            });
        };
        return OrderShareService_1;
    }());
    __setFunctionName(_classThis, "OrderShareService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        OrderShareService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return OrderShareService = _classThis;
}();
exports.OrderShareService = OrderShareService;
