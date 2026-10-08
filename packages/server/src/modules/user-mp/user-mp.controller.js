"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserMpController = void 0;
var common_1 = require("@nestjs/common");
var swagger_1 = require("@nestjs/swagger");
var throttler_1 = require("@nestjs/throttler");
var public_decorator_1 = require("../../common/decorators/public.decorator");
var UserMpController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('用户端 user-mp'), (0, common_1.Controller)('u')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _getSharedOrder_decorators;
    var _listProducts_decorators;
    var _productDetail_decorators;
    var _categories_decorators;
    var _searchShops_decorators;
    var _listOrders_decorators;
    var _orderDetail_decorators;
    var _createOrder_decorators;
    var _pay_decorators;
    var _confirm_decorators;
    var _cancel_decorators;
    var _urge_decorators;
    var _refundOrder_decorators;
    var _banners_decorators;
    var _hotKeywords_decorators;
    var _addresses_decorators;
    var _defaultAddress_decorators;
    var _addAddress_decorators;
    var _updateAddress_decorators;
    var _removeAddress_decorators;
    var _favorites_decorators;
    var _addFavorite_decorators;
    var _removeFavorite_decorators;
    var _coupons_decorators;
    var _claimCoupon_decorators;
    var _myCoupons_decorators;
    var _booking_decorators;
    var _promoteSummary_decorators;
    var _promoteOrders_decorators;
    var _promoteShareLink_decorators;
    var _promoteRules_decorators;
    var _bindInviter_decorators;
    var _nearbyStores_decorators;
    var _shopPriceRule_decorators;
    var _myTier_decorators;
    var _profile_decorators;
    var _updateProfile_decorators;
    var _bindPhone_decorators;
    var _bindWechat_decorators;
    var _merchantApply_decorators;
    var _systemSettings_decorators;
    var _chatSessions_decorators;
    var _ensureChatSession_decorators;
    var _chatMessages_decorators;
    var _chatSend_decorators;
    var _chatRead_decorators;
    var _listCart_decorators;
    var _addCart_decorators;
    var _updateCart_decorators;
    var _removeCart_decorators;
    var UserMpController = _classThis = /** @class */ (function () {
        function UserMpController_1(svc, orderShare) {
            this.svc = (__runInitializers(this, _instanceExtraInitializers), svc);
            this.orderShare = orderShare;
        }
        // ============ 订单分享公开访问(无需登录) ============
        /**
         * 客户/任何持链接者按 shareCode 查看商家分享出来的订单详情
         * 严格按商家选择的 visibleFields 过滤返回字段;隐藏字段不在 JSON 中,
         * 防止前端 devtools 反向取到敏感信息(电话 / 价格 / 备注)。
         * 过期或撤销返回业务错误。
         */
        UserMpController_1.prototype.getSharedOrder = function (code) {
            return this.orderShare.getPublicByCode(code);
        };
        // 商品
        UserMpController_1.prototype.listProducts = function (q) {
            return this.svc.listProducts(q);
        };
        UserMpController_1.prototype.productDetail = function (id) {
            return this.svc.productDetail(id);
        };
        // 分类
        UserMpController_1.prototype.categories = function () {
            return this.svc.listCategories();
        };
        // 店铺搜索（首页/分类/搜索页用）
        UserMpController_1.prototype.searchShops = function (q) {
            return this.svc.searchShops(q);
        };
        // 订单
        UserMpController_1.prototype.listOrders = function (u, q) {
            return this.svc.listOrders(u.sub, q);
        };
        UserMpController_1.prototype.orderDetail = function (u, id) {
            return this.svc.orderDetail(u.sub, id);
        };
        UserMpController_1.prototype.createOrder = function (u, dto) {
            return this.svc.createOrder(u.sub, dto);
        };
        UserMpController_1.prototype.pay = function (u, id, method) {
            return this.svc.payOrder(u.sub, id, method || 'wechat');
        };
        UserMpController_1.prototype.confirm = function (u, id) {
            return this.svc.confirmOrder(u.sub, id);
        };
        UserMpController_1.prototype.cancel = function (u, id) {
            return this.svc.cancelOrder(u.sub, id);
        };
        UserMpController_1.prototype.urge = function (u, id) {
            return this.svc.urgeOrder(u.sub, id);
        };
        /**
         * 用户发起售后退款（功能残缺 P0-13 修复）
         *
         * body: { reason, amount?, orderItemId?, description?, evidence?, type? }
         * - reason: 必填,售后原因
         * - amount: 退款金额,默认订单实付金额
         * - orderItemId: 多 SKU 订单指定退某一行;省略默认订单首条
         * - type: 'refund_only' | 'refund_with_return',默认 refund_with_return
         * 响应: { ok, refundId, refundNo, status:'pending' }
         *
         * 服务端事务保证 Refund 创建 + Order.status='after_sale' 原子,
         * 失败任一回滚,绝不出现"订单变 after_sale 但 Refund 未创建"的脏数据。
         */
        UserMpController_1.prototype.refundOrder = function (u, id, dto) {
            return this.svc.refundOrder(u.sub, id, dto);
        };
        // Banner
        UserMpController_1.prototype.banners = function () {
            return this.svc.banners();
        };
        // 热搜词（搜索页用，可由平台管理员后台配置 SystemConfig.hot_keywords）
        UserMpController_1.prototype.hotKeywords = function () {
            return this.svc.hotKeywords();
        };
        // 地址
        UserMpController_1.prototype.addresses = function (u) {
            return this.svc.listAddresses(u.sub);
        };
        UserMpController_1.prototype.defaultAddress = function (u) {
            return this.svc.defaultAddress(u.sub);
        };
        UserMpController_1.prototype.addAddress = function (u, dto) {
            return this.svc.createAddress(u.sub, dto);
        };
        UserMpController_1.prototype.updateAddress = function (u, id, dto) {
            return this.svc.updateAddress(u.sub, id, dto);
        };
        UserMpController_1.prototype.removeAddress = function (u, id) {
            return this.svc.removeAddress(u.sub, id);
        };
        // 收藏
        UserMpController_1.prototype.favorites = function (u) {
            return this.svc.listFavorites(u.sub);
        };
        UserMpController_1.prototype.addFavorite = function (u, productId) {
            return this.svc.addFavorite(u.sub, productId);
        };
        UserMpController_1.prototype.removeFavorite = function (u, id) {
            return this.svc.removeFavorite(u.sub, id);
        };
        // 优惠券（所有商户已上线的有效券池，用户端可见可领可用）
        UserMpController_1.prototype.coupons = function () {
            return this.svc.listAvailableCoupons();
        };
        /**
         * 用户领取优惠券
         *
         * 必须登录（防止匿名薅羊毛 + 才能做"每用户限领数量"控制）。
         * 服务端做幂等 + 库存 + 个人限领数等三重校验。
         */
        UserMpController_1.prototype.claimCoupon = function (u, id) {
            return this.svc.claimCoupon(u.sub, id);
        };
        /**
         * 我的优惠券列表（已领，包含未用 / 已用 / 已过期）
         *
         * 必须登录（防匿名扫探 user-mp 端的 UserCoupon 持券数据）。
         * Query: status='unused' | 'used' | 'expired'（可选；缺省返回全部）
         * Response: MyCoupon[]（**数组** 不是分页对象，前端 couponService.my() 直接消费）
         */
        UserMpController_1.prototype.myCoupons = function (u, q) {
            var status = (q === null || q === void 0 ? void 0 : q.status) === 'unused' || (q === null || q === void 0 ? void 0 : q.status) === 'used' || (q === null || q === void 0 ? void 0 : q.status) === 'expired'
                ? q.status
                : undefined;
            return this.svc.myCoupons(u.sub, { status: status });
        };
        // 预约量尺 —— @Public 允许匿名提交（首屏量尺引流场景），
        // 因此必须严控写入频率防 DoS / 数据污染：默认 throttler 已限 60/min/IP，
        // 这里再叠加 3/min/IP 的硬约束（@nestjs/throttler v6 同名 throttler 用 'default' 键覆盖）
        UserMpController_1.prototype.booking = function (u, dto) {
            return this.svc.submitBooking((u === null || u === void 0 ? void 0 : u.sub) || null, dto);
        };
        // 推广
        UserMpController_1.prototype.promoteSummary = function (u) {
            return this.svc.promoteSummary(u.sub);
        };
        UserMpController_1.prototype.promoteOrders = function (u, q) {
            return this.svc.promoteOrders(u.sub, q);
        };
        /** 我的推广分享链接（用户点"分享海报/复制链接"时调用） */
        UserMpController_1.prototype.promoteShareLink = function (u) {
            return this.svc.promoteShareLink(u.sub);
        };
        /**
         * 推广分佣规则（前端 user-mp 推广页弹窗使用）
         *
         * 公开接口，未登录也可读。后端读 SystemConfig key='promote.rules'，
         * 未配置时返回 null，由前端展示"详情请咨询客服"兜底文案，
         * 严禁后端写死任何百分比（业务可能随时调整）。
         */
        UserMpController_1.prototype.promoteRules = function () {
            return this.svc.promoteRules();
        };
        /** 绑定邀请人（用户首次通过 ?ref=xxx 进入并登录后调用，幂等） */
        UserMpController_1.prototype.bindInviter = function (u, inviterId) {
            return this.svc.bindInviter(u.sub, inviterId);
        };
        // 门店地图（lat/lng 由小程序 uni.getLocation 真实定位上报；缺失则不计算距离）
        UserMpController_1.prototype.nearbyStores = function (q) {
            return this.svc.nearbyStores({ lat: q === null || q === void 0 ? void 0 : q.lat, lng: q === null || q === void 0 ? void 0 : q.lng });
        };
        // 店铺价格显示规则（user-mp 商品页用,无需登录）
        UserMpController_1.prototype.shopPriceRule = function (merchantId) {
            return this.svc.shopPriceRule(merchantId);
        };
        // 当前用户在某店铺的身份（需登录;商家在「客户管理」里设的 member/agency 分级）
        UserMpController_1.prototype.myTier = function (u, merchantId) {
            return this.svc.myTierInShop(u.sub, merchantId);
        };
        // 用户资料读写
        UserMpController_1.prototype.profile = function (u) {
            return this.svc.profile(u.sub);
        };
        UserMpController_1.prototype.updateProfile = function (u, dto) {
            return this.svc.updateProfile(u.sub, dto);
        };
        // 账号绑定
        UserMpController_1.prototype.bindPhone = function (u, dto) {
            return this.svc.bindPhone(u.sub, dto);
        };
        UserMpController_1.prototype.bindWechat = function (u, dto) {
            return this.svc.bindWechat(u.sub, dto);
        };
        // 入驻
        UserMpController_1.prototype.merchantApply = function (u, dto) {
            return this.svc.merchantApply(u || null, dto);
        };
        /**
         * 公开系统设置（客服联系方式 / 备案号等）
         *
         * 平台后台在 SystemConfig.key='system_settings' 写完整配置，
         * 这里只把"对用户公开"的几个字段读出来返给 user-mp，绝不返回 IP 白名单 / 密码策略等内部字段。
         * 字段未配置则返回 null，由前端展示"未提供"占位。
         * 调用方：promote 页面、me 页客服入口、底部备案号展示等。
         */
        UserMpController_1.prototype.systemSettings = function () {
            return this.svc.systemSettings();
        };
        // ============ 在线客服（用户端） ============
        /** 获取/创建当前用户与指定商户的会话 */
        UserMpController_1.prototype.chatSessions = function (u) {
            return this.svc.chatSessions(u.sub);
        };
        UserMpController_1.prototype.ensureChatSession = function (u, merchantId) {
            return this.svc.ensureChatSession(u.sub, merchantId);
        };
        UserMpController_1.prototype.chatMessages = function (u, id) {
            return this.svc.chatMessages(u.sub, id);
        };
        UserMpController_1.prototype.chatSend = function (u, id, dto) {
            return this.svc.chatSend(u.sub, id, dto.type || 'text', dto.content);
        };
        UserMpController_1.prototype.chatRead = function (u, id) {
            return this.svc.chatMarkRead(u.sub, id);
        };
        // ============ 购物车 ============
        UserMpController_1.prototype.listCart = function (u) {
            return this.svc.listCart(u.sub);
        };
        UserMpController_1.prototype.addCart = function (u, dto) {
            return this.svc.addCart(u.sub, dto);
        };
        UserMpController_1.prototype.updateCart = function (u, id, dto) {
            return this.svc.updateCart(u.sub, id, dto);
        };
        UserMpController_1.prototype.removeCart = function (u, id) {
            return this.svc.removeCart(u.sub, id);
        };
        return UserMpController_1;
    }());
    __setFunctionName(_classThis, "UserMpController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getSharedOrder_decorators = [(0, public_decorator_1.Public)(), (0, common_1.Get)('share/orders/:code')];
        _listProducts_decorators = [(0, public_decorator_1.Public)(), (0, common_1.Get)('products')];
        _productDetail_decorators = [(0, public_decorator_1.Public)(), (0, common_1.Get)('products/:id')];
        _categories_decorators = [(0, public_decorator_1.Public)(), (0, common_1.Get)('categories')];
        _searchShops_decorators = [(0, public_decorator_1.Public)(), (0, common_1.Get)('shops')];
        _listOrders_decorators = [(0, common_1.Get)('orders')];
        _orderDetail_decorators = [(0, common_1.Get)('orders/:id')];
        _createOrder_decorators = [(0, common_1.Post)('orders')];
        _pay_decorators = [(0, common_1.Post)('orders/:id/pay')];
        _confirm_decorators = [(0, common_1.Post)('orders/:id/confirm')];
        _cancel_decorators = [(0, common_1.Post)('orders/:id/cancel')];
        _urge_decorators = [(0, common_1.Post)('orders/:id/urge')];
        _refundOrder_decorators = [(0, common_1.Post)('orders/:id/refund')];
        _banners_decorators = [(0, public_decorator_1.Public)(), (0, common_1.Get)('banners')];
        _hotKeywords_decorators = [(0, public_decorator_1.Public)(), (0, common_1.Get)('hot-keywords')];
        _addresses_decorators = [(0, common_1.Get)('addresses')];
        _defaultAddress_decorators = [(0, common_1.Get)('addresses/default')];
        _addAddress_decorators = [(0, common_1.Post)('addresses')];
        _updateAddress_decorators = [(0, common_1.Put)('addresses/:id')];
        _removeAddress_decorators = [(0, common_1.Delete)('addresses/:id')];
        _favorites_decorators = [(0, common_1.Get)('favorites')];
        _addFavorite_decorators = [(0, common_1.Post)('favorites')];
        _removeFavorite_decorators = [(0, common_1.Delete)('favorites/:id')];
        _coupons_decorators = [(0, public_decorator_1.Public)(), (0, common_1.Get)('coupons')];
        _claimCoupon_decorators = [(0, common_1.Post)('coupons/:id/claim')];
        _myCoupons_decorators = [(0, common_1.Get)('my-coupons')];
        _booking_decorators = [(0, public_decorator_1.Public)(), (0, throttler_1.Throttle)({ default: { limit: 3, ttl: 60000 } }), (0, common_1.Post)('booking')];
        _promoteSummary_decorators = [(0, common_1.Get)('promote/summary')];
        _promoteOrders_decorators = [(0, common_1.Get)('promote/orders')];
        _promoteShareLink_decorators = [(0, common_1.Get)('promote/share-link')];
        _promoteRules_decorators = [(0, public_decorator_1.Public)(), (0, common_1.Get)('promote/rules')];
        _bindInviter_decorators = [(0, common_1.Post)('promote/bind-inviter')];
        _nearbyStores_decorators = [(0, public_decorator_1.Public)(), (0, common_1.Get)('stores/nearby')];
        _shopPriceRule_decorators = [(0, public_decorator_1.Public)(), (0, common_1.Get)('shops/:merchantId/price-rule')];
        _myTier_decorators = [(0, common_1.Get)('shops/:merchantId/my-tier')];
        _profile_decorators = [(0, common_1.Get)('profile')];
        _updateProfile_decorators = [(0, common_1.Patch)('profile')];
        _bindPhone_decorators = [(0, common_1.Post)('bind-phone')];
        _bindWechat_decorators = [(0, common_1.Post)('bind-wechat')];
        _merchantApply_decorators = [(0, common_1.Post)('merchant-apply')];
        _systemSettings_decorators = [(0, public_decorator_1.Public)(), (0, common_1.Get)('system/settings')];
        _chatSessions_decorators = [(0, common_1.Get)('chat/sessions')];
        _ensureChatSession_decorators = [(0, common_1.Post)('chat/sessions')];
        _chatMessages_decorators = [(0, common_1.Get)('chat/sessions/:id/messages')];
        _chatSend_decorators = [(0, common_1.Post)('chat/sessions/:id/messages')];
        _chatRead_decorators = [(0, common_1.Post)('chat/sessions/:id/read')];
        _listCart_decorators = [(0, common_1.Get)('cart')];
        _addCart_decorators = [(0, common_1.Post)('cart')];
        _updateCart_decorators = [(0, common_1.Patch)('cart/:id')];
        _removeCart_decorators = [(0, common_1.Delete)('cart/:id')];
        __esDecorate(_classThis, null, _getSharedOrder_decorators, { kind: "method", name: "getSharedOrder", static: false, private: false, access: { has: function (obj) { return "getSharedOrder" in obj; }, get: function (obj) { return obj.getSharedOrder; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listProducts_decorators, { kind: "method", name: "listProducts", static: false, private: false, access: { has: function (obj) { return "listProducts" in obj; }, get: function (obj) { return obj.listProducts; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _productDetail_decorators, { kind: "method", name: "productDetail", static: false, private: false, access: { has: function (obj) { return "productDetail" in obj; }, get: function (obj) { return obj.productDetail; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _categories_decorators, { kind: "method", name: "categories", static: false, private: false, access: { has: function (obj) { return "categories" in obj; }, get: function (obj) { return obj.categories; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _searchShops_decorators, { kind: "method", name: "searchShops", static: false, private: false, access: { has: function (obj) { return "searchShops" in obj; }, get: function (obj) { return obj.searchShops; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listOrders_decorators, { kind: "method", name: "listOrders", static: false, private: false, access: { has: function (obj) { return "listOrders" in obj; }, get: function (obj) { return obj.listOrders; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _orderDetail_decorators, { kind: "method", name: "orderDetail", static: false, private: false, access: { has: function (obj) { return "orderDetail" in obj; }, get: function (obj) { return obj.orderDetail; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createOrder_decorators, { kind: "method", name: "createOrder", static: false, private: false, access: { has: function (obj) { return "createOrder" in obj; }, get: function (obj) { return obj.createOrder; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _pay_decorators, { kind: "method", name: "pay", static: false, private: false, access: { has: function (obj) { return "pay" in obj; }, get: function (obj) { return obj.pay; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _confirm_decorators, { kind: "method", name: "confirm", static: false, private: false, access: { has: function (obj) { return "confirm" in obj; }, get: function (obj) { return obj.confirm; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _cancel_decorators, { kind: "method", name: "cancel", static: false, private: false, access: { has: function (obj) { return "cancel" in obj; }, get: function (obj) { return obj.cancel; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _urge_decorators, { kind: "method", name: "urge", static: false, private: false, access: { has: function (obj) { return "urge" in obj; }, get: function (obj) { return obj.urge; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _refundOrder_decorators, { kind: "method", name: "refundOrder", static: false, private: false, access: { has: function (obj) { return "refundOrder" in obj; }, get: function (obj) { return obj.refundOrder; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _banners_decorators, { kind: "method", name: "banners", static: false, private: false, access: { has: function (obj) { return "banners" in obj; }, get: function (obj) { return obj.banners; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _hotKeywords_decorators, { kind: "method", name: "hotKeywords", static: false, private: false, access: { has: function (obj) { return "hotKeywords" in obj; }, get: function (obj) { return obj.hotKeywords; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _addresses_decorators, { kind: "method", name: "addresses", static: false, private: false, access: { has: function (obj) { return "addresses" in obj; }, get: function (obj) { return obj.addresses; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _defaultAddress_decorators, { kind: "method", name: "defaultAddress", static: false, private: false, access: { has: function (obj) { return "defaultAddress" in obj; }, get: function (obj) { return obj.defaultAddress; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _addAddress_decorators, { kind: "method", name: "addAddress", static: false, private: false, access: { has: function (obj) { return "addAddress" in obj; }, get: function (obj) { return obj.addAddress; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateAddress_decorators, { kind: "method", name: "updateAddress", static: false, private: false, access: { has: function (obj) { return "updateAddress" in obj; }, get: function (obj) { return obj.updateAddress; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _removeAddress_decorators, { kind: "method", name: "removeAddress", static: false, private: false, access: { has: function (obj) { return "removeAddress" in obj; }, get: function (obj) { return obj.removeAddress; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _favorites_decorators, { kind: "method", name: "favorites", static: false, private: false, access: { has: function (obj) { return "favorites" in obj; }, get: function (obj) { return obj.favorites; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _addFavorite_decorators, { kind: "method", name: "addFavorite", static: false, private: false, access: { has: function (obj) { return "addFavorite" in obj; }, get: function (obj) { return obj.addFavorite; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _removeFavorite_decorators, { kind: "method", name: "removeFavorite", static: false, private: false, access: { has: function (obj) { return "removeFavorite" in obj; }, get: function (obj) { return obj.removeFavorite; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _coupons_decorators, { kind: "method", name: "coupons", static: false, private: false, access: { has: function (obj) { return "coupons" in obj; }, get: function (obj) { return obj.coupons; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _claimCoupon_decorators, { kind: "method", name: "claimCoupon", static: false, private: false, access: { has: function (obj) { return "claimCoupon" in obj; }, get: function (obj) { return obj.claimCoupon; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _myCoupons_decorators, { kind: "method", name: "myCoupons", static: false, private: false, access: { has: function (obj) { return "myCoupons" in obj; }, get: function (obj) { return obj.myCoupons; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _booking_decorators, { kind: "method", name: "booking", static: false, private: false, access: { has: function (obj) { return "booking" in obj; }, get: function (obj) { return obj.booking; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _promoteSummary_decorators, { kind: "method", name: "promoteSummary", static: false, private: false, access: { has: function (obj) { return "promoteSummary" in obj; }, get: function (obj) { return obj.promoteSummary; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _promoteOrders_decorators, { kind: "method", name: "promoteOrders", static: false, private: false, access: { has: function (obj) { return "promoteOrders" in obj; }, get: function (obj) { return obj.promoteOrders; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _promoteShareLink_decorators, { kind: "method", name: "promoteShareLink", static: false, private: false, access: { has: function (obj) { return "promoteShareLink" in obj; }, get: function (obj) { return obj.promoteShareLink; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _promoteRules_decorators, { kind: "method", name: "promoteRules", static: false, private: false, access: { has: function (obj) { return "promoteRules" in obj; }, get: function (obj) { return obj.promoteRules; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _bindInviter_decorators, { kind: "method", name: "bindInviter", static: false, private: false, access: { has: function (obj) { return "bindInviter" in obj; }, get: function (obj) { return obj.bindInviter; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _nearbyStores_decorators, { kind: "method", name: "nearbyStores", static: false, private: false, access: { has: function (obj) { return "nearbyStores" in obj; }, get: function (obj) { return obj.nearbyStores; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _shopPriceRule_decorators, { kind: "method", name: "shopPriceRule", static: false, private: false, access: { has: function (obj) { return "shopPriceRule" in obj; }, get: function (obj) { return obj.shopPriceRule; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _myTier_decorators, { kind: "method", name: "myTier", static: false, private: false, access: { has: function (obj) { return "myTier" in obj; }, get: function (obj) { return obj.myTier; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _profile_decorators, { kind: "method", name: "profile", static: false, private: false, access: { has: function (obj) { return "profile" in obj; }, get: function (obj) { return obj.profile; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateProfile_decorators, { kind: "method", name: "updateProfile", static: false, private: false, access: { has: function (obj) { return "updateProfile" in obj; }, get: function (obj) { return obj.updateProfile; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _bindPhone_decorators, { kind: "method", name: "bindPhone", static: false, private: false, access: { has: function (obj) { return "bindPhone" in obj; }, get: function (obj) { return obj.bindPhone; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _bindWechat_decorators, { kind: "method", name: "bindWechat", static: false, private: false, access: { has: function (obj) { return "bindWechat" in obj; }, get: function (obj) { return obj.bindWechat; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _merchantApply_decorators, { kind: "method", name: "merchantApply", static: false, private: false, access: { has: function (obj) { return "merchantApply" in obj; }, get: function (obj) { return obj.merchantApply; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _systemSettings_decorators, { kind: "method", name: "systemSettings", static: false, private: false, access: { has: function (obj) { return "systemSettings" in obj; }, get: function (obj) { return obj.systemSettings; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _chatSessions_decorators, { kind: "method", name: "chatSessions", static: false, private: false, access: { has: function (obj) { return "chatSessions" in obj; }, get: function (obj) { return obj.chatSessions; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _ensureChatSession_decorators, { kind: "method", name: "ensureChatSession", static: false, private: false, access: { has: function (obj) { return "ensureChatSession" in obj; }, get: function (obj) { return obj.ensureChatSession; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _chatMessages_decorators, { kind: "method", name: "chatMessages", static: false, private: false, access: { has: function (obj) { return "chatMessages" in obj; }, get: function (obj) { return obj.chatMessages; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _chatSend_decorators, { kind: "method", name: "chatSend", static: false, private: false, access: { has: function (obj) { return "chatSend" in obj; }, get: function (obj) { return obj.chatSend; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _chatRead_decorators, { kind: "method", name: "chatRead", static: false, private: false, access: { has: function (obj) { return "chatRead" in obj; }, get: function (obj) { return obj.chatRead; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listCart_decorators, { kind: "method", name: "listCart", static: false, private: false, access: { has: function (obj) { return "listCart" in obj; }, get: function (obj) { return obj.listCart; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _addCart_decorators, { kind: "method", name: "addCart", static: false, private: false, access: { has: function (obj) { return "addCart" in obj; }, get: function (obj) { return obj.addCart; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateCart_decorators, { kind: "method", name: "updateCart", static: false, private: false, access: { has: function (obj) { return "updateCart" in obj; }, get: function (obj) { return obj.updateCart; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _removeCart_decorators, { kind: "method", name: "removeCart", static: false, private: false, access: { has: function (obj) { return "removeCart" in obj; }, get: function (obj) { return obj.removeCart; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        UserMpController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return UserMpController = _classThis;
}();
exports.UserMpController = UserMpController;
