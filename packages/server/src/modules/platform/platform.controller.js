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
exports.PlatformController = void 0;
var common_1 = require("@nestjs/common");
var swagger_1 = require("@nestjs/swagger");
var roles_decorator_1 = require("../../common/decorators/roles.decorator");
var roles_guard_1 = require("../../common/guards/roles.guard");
var PlatformController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('平台端'), (0, common_1.UseGuards)(roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)('admin', 'platform', 'super-admin'), (0, common_1.Controller)('p')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _dashboard_decorators;
    var _stats_decorators;
    var _merchants_decorators;
    var _auditMerchants_decorators;
    var _approveMerchant_decorators;
    var _rejectMerchant_decorators;
    var _pauseMerchant_decorators;
    var _resumeMerchant_decorators;
    var _orders_decorators;
    var _auditProducts_decorators;
    var _getAuditConfig_decorators;
    var _saveAuditConfig_decorators;
    var _approveProduct_decorators;
    var _rejectProduct_decorators;
    var _sampleCheckProduct_decorators;
    var _setPlazaProductOnline_decorators;
    var _adSlots_decorators;
    var _createAdSlot_decorators;
    var _updateAdSlot_decorators;
    var _deleteAdSlot_decorators;
    var _adCreatives_decorators;
    var _createAdCreative_decorators;
    var _updateAdCreative_decorators;
    var _deleteAdCreative_decorators;
    var _approveAdCreative_decorators;
    var _rejectAdCreative_decorators;
    var _plazaPushes_decorators;
    var _createPlazaPush_decorators;
    var _plazaProducts_decorators;
    var _plazaFactories_decorators;
    var _plazaRecords_decorators;
    var _memberTrialDays_decorators;
    var _saveMemberTrialDays_decorators;
    var _memberPlans_decorators;
    var _saveMemberPlan_decorators;
    var _deleteMemberPlan_decorators;
    var _planSubscriptions_decorators;
    var _withdraws_decorators;
    var _approveWithdraw_decorators;
    var _rejectWithdrawPlat_decorators;
    var _markWithdrawPaid_decorators;
    var _memberPayOrders_decorators;
    var _updatePayStatus_decorators;
    var _approveRefund_decorators;
    var _rejectRefund_decorators;
    var _featureFlags_decorators;
    var _createFeatureFlag_decorators;
    var _deleteFeatureFlag_decorators;
    var _toggleFeatureFlag_decorators;
    var _featureFlagGray_decorators;
    var _setFeatureFlagGray_decorators;
    var _resetFeatureFlags_decorators;
    var _admins_decorators;
    var _createAdmin_decorators;
    var _updateAdmin_decorators;
    var _deleteAdmin_decorators;
    var _toggleAdmin_decorators;
    var _resetAdminPwd_decorators;
    var _roles_decorators;
    var _saveRole_decorators;
    var _updateRole_decorators;
    var _deleteRole_decorators;
    var _auditRecords_decorators;
    var _orderSharesStats_decorators;
    var _orderShares_decorators;
    var _systemSettings_decorators;
    var _saveSystemSettings_decorators;
    var _handledTicketCount_decorators;
    var _pendingTicketCount_decorators;
    var _tickets_decorators;
    var _createTicket_decorators;
    var _handleTicket_decorators;
    var _notifications_decorators;
    var _notificationsReadAll_decorators;
    var _notificationRead_decorators;
    var _submitFeedback_decorators;
    var _feedbackList_decorators;
    var _refunds_decorators;
    var _agreeRefund_decorators;
    var _rejectRefundPlat_decorators;
    var PlatformController = _classThis = /** @class */ (function () {
        function PlatformController_1(svc) {
            this.svc = (__runInitializers(this, _instanceExtraInitializers), svc);
        }
        // Dashboard
        PlatformController_1.prototype.dashboard = function () {
            return this.svc.dashboard();
        };
        PlatformController_1.prototype.stats = function (q) {
            return this.svc.stats(q);
        };
        // Merchants
        PlatformController_1.prototype.merchants = function (q) {
            return this.svc.merchants(q);
        };
        PlatformController_1.prototype.auditMerchants = function (q) {
            return this.svc.auditMerchants(q);
        };
        PlatformController_1.prototype.approveMerchant = function (id) {
            return this.svc.approveMerchant(id);
        };
        PlatformController_1.prototype.rejectMerchant = function (id, reason) {
            return this.svc.rejectMerchant(id, reason);
        };
        PlatformController_1.prototype.pauseMerchant = function (id) {
            return this.svc.pauseMerchant(id);
        };
        PlatformController_1.prototype.resumeMerchant = function (id) {
            return this.svc.resumeMerchant(id);
        };
        // Orders
        PlatformController_1.prototype.orders = function (q) {
            return this.svc.orders(q);
        };
        // Product Audit
        PlatformController_1.prototype.auditProducts = function (q) {
            return this.svc.auditProducts(q);
        };
        PlatformController_1.prototype.getAuditConfig = function () {
            return this.svc.getAuditConfig();
        };
        PlatformController_1.prototype.saveAuditConfig = function (dto) {
            return this.svc.saveAuditConfig(dto);
        };
        PlatformController_1.prototype.approveProduct = function (id) {
            return this.svc.approveProduct(id);
        };
        PlatformController_1.prototype.rejectProduct = function (id, reason) {
            return this.svc.rejectProduct(id, reason);
        };
        // 抽检：把自动审通过的商品"加入抽检队列"（记录一条 sample_check 审计，商品维持上架）。
        // 通过/驳回的最终裁决走 approve / reject 两个接口，这里不改 product.status。
        PlatformController_1.prototype.sampleCheckProduct = function (id, u) {
            return this.svc.sampleCheckProduct(id, u === null || u === void 0 ? void 0 : u.sub);
        };
        // 平台维度控制商品在选品广场是否展示(不动 product.status,用 SystemConfig 覆盖)
        PlatformController_1.prototype.setPlazaProductOnline = function (id, online) {
            return this.svc.setPlazaProductOnline(id, !!online);
        };
        // Ads
        PlatformController_1.prototype.adSlots = function () {
            return this.svc.adSlots();
        };
        PlatformController_1.prototype.createAdSlot = function (dto) {
            return this.svc.createAdSlot(dto);
        };
        PlatformController_1.prototype.updateAdSlot = function (id, dto) {
            return this.svc.updateAdSlot(id, dto);
        };
        PlatformController_1.prototype.deleteAdSlot = function (id) {
            return this.svc.deleteAdSlot(id);
        };
        PlatformController_1.prototype.adCreatives = function (q) {
            return this.svc.adCreatives(q);
        };
        PlatformController_1.prototype.createAdCreative = function (dto) {
            return this.svc.createAdCreative(dto);
        };
        PlatformController_1.prototype.updateAdCreative = function (id, dto) {
            return this.svc.updateAdCreative(id, dto);
        };
        PlatformController_1.prototype.deleteAdCreative = function (id) {
            return this.svc.deleteAdCreative(id);
        };
        // 广告创意审核（pending → active / rejected） + 写 AuditRecord，复用 approveProduct / rejectProduct 套路
        PlatformController_1.prototype.approveAdCreative = function (id, u) {
            return this.svc.approveAdCreative(id, u === null || u === void 0 ? void 0 : u.sub);
        };
        PlatformController_1.prototype.rejectAdCreative = function (id, reason, u) {
            return this.svc.rejectAdCreative(id, reason, u === null || u === void 0 ? void 0 : u.sub);
        };
        // Plaza
        PlatformController_1.prototype.plazaPushes = function (q) {
            return this.svc.plazaPushes(q);
        };
        PlatformController_1.prototype.createPlazaPush = function (dto) {
            return this.svc.createPlazaPush(dto);
        };
        PlatformController_1.prototype.plazaProducts = function (q) {
            return this.svc.plazaProductsAll(q);
        };
        PlatformController_1.prototype.plazaFactories = function () {
            return this.svc.plazaFactoriesAll();
        };
        PlatformController_1.prototype.plazaRecords = function (q) {
            return this.svc.plazaRecords(q);
        };
        // Member Plans
        // 注意: 路由顺序 — `trial-days` 必须放在 `:id` 系列之前,避免被当成 planId 匹配
        PlatformController_1.prototype.memberTrialDays = function () {
            return this.svc.getMemberTrialDays();
        };
        PlatformController_1.prototype.saveMemberTrialDays = function (days) {
            return this.svc.setMemberTrialDays(days);
        };
        PlatformController_1.prototype.memberPlans = function () {
            return this.svc.memberPlans();
        };
        PlatformController_1.prototype.saveMemberPlan = function (dto) {
            return this.svc.saveMemberPlan(dto);
        };
        PlatformController_1.prototype.deleteMemberPlan = function (id) {
            return this.svc.deleteMemberPlan(id);
        };
        PlatformController_1.prototype.planSubscriptions = function (id) {
            return this.svc.planSubscriptions(id);
        };
        // ============ 提现审核（平台层） ============
        // 之前提现审核接口挂在 /m/withdraws/:id/review（商家自审），产品语义错误：
        //   - 商家本应"提交"提现申请，由平台审核后才能放款
        //   - 商家自审等于无审核，存在资金风险
        // 这里在 /p/withdraws 下重新定义平台审核入口，配合 admin-pc 平台后台「提现审核」页使用；
        // /m/withdraws/:id/review 已标 @deprecated 并保留以兼容老调用，后续逐步下线。
        PlatformController_1.prototype.withdraws = function (q) {
            return this.svc.withdrawsList(q);
        };
        PlatformController_1.prototype.approveWithdraw = function (id, remark, u) {
            return this.svc.approveWithdraw(id, remark, u === null || u === void 0 ? void 0 : u.sub);
        };
        PlatformController_1.prototype.rejectWithdrawPlat = function (id, reason, u) {
            return this.svc.rejectWithdrawPlat(id, reason, u === null || u === void 0 ? void 0 : u.sub);
        };
        PlatformController_1.prototype.markWithdrawPaid = function (id, body, u) {
            return this.svc.markWithdrawPaid(id, body || {}, u === null || u === void 0 ? void 0 : u.sub);
        };
        // Member Pay Orders
        PlatformController_1.prototype.memberPayOrders = function (q) {
            return this.svc.memberPayOrders(q);
        };
        PlatformController_1.prototype.updatePayStatus = function (id, status) {
            return this.svc.updatePayStatus(id, status);
        };
        PlatformController_1.prototype.approveRefund = function (id) {
            return this.svc.approveRefund(id);
        };
        PlatformController_1.prototype.rejectRefund = function (id, reason) {
            return this.svc.rejectRefund(id, reason);
        };
        // Feature Flags
        PlatformController_1.prototype.featureFlags = function () {
            return this.svc.featureFlags();
        };
        PlatformController_1.prototype.createFeatureFlag = function (dto) {
            return this.svc.createFeatureFlag(dto);
        };
        PlatformController_1.prototype.deleteFeatureFlag = function (id) {
            return this.svc.deleteFeatureFlag(id);
        };
        PlatformController_1.prototype.toggleFeatureFlag = function (id, enabled) {
            return this.svc.toggleFeatureFlag(id, enabled);
        };
        PlatformController_1.prototype.featureFlagGray = function () {
            return this.svc.featureFlagGray();
        };
        PlatformController_1.prototype.setFeatureFlagGray = function (dto) {
            return this.svc.setFeatureFlagGray(dto);
        };
        PlatformController_1.prototype.resetFeatureFlags = function () {
            return this.svc.resetFeatureFlags();
        };
        // Admins / Roles
        PlatformController_1.prototype.admins = function (q) {
            return this.svc.admins(q);
        };
        PlatformController_1.prototype.createAdmin = function (dto, u) {
            return this.svc.createAdmin(dto, u === null || u === void 0 ? void 0 : u.role);
        };
        PlatformController_1.prototype.updateAdmin = function (id, dto, u) {
            return this.svc.updateAdmin(id, dto, u === null || u === void 0 ? void 0 : u.role, u === null || u === void 0 ? void 0 : u.sub);
        };
        PlatformController_1.prototype.deleteAdmin = function (id, u) {
            return this.svc.deleteAdmin(id, u === null || u === void 0 ? void 0 : u.sub, u === null || u === void 0 ? void 0 : u.role);
        };
        PlatformController_1.prototype.toggleAdmin = function (id, u) {
            return this.svc.toggleAdmin(id, u === null || u === void 0 ? void 0 : u.sub, u === null || u === void 0 ? void 0 : u.role);
        };
        // 超管重置管理员密码:仅 super-admin 可调,不允许重置自己/其他 super-admin/普通用户
        PlatformController_1.prototype.resetAdminPwd = function (id, password, u) {
            return this.svc.resetAdminPassword(id, password, u === null || u === void 0 ? void 0 : u.sub, u === null || u === void 0 ? void 0 : u.role);
        };
        PlatformController_1.prototype.roles = function (q) {
            return this.svc.roles(q);
        };
        PlatformController_1.prototype.saveRole = function (dto) {
            return this.svc.saveRole(dto);
        };
        PlatformController_1.prototype.updateRole = function (id, dto) {
            return this.svc.updateRole(id, dto);
        };
        PlatformController_1.prototype.deleteRole = function (id) {
            return this.svc.deleteRole(id);
        };
        // Audit Records
        // 查询所有审核日志（商家/商品审核流转），支持 type/status/targetId 过滤 + 分页
        PlatformController_1.prototype.auditRecords = function (q) {
            return this.svc.auditRecords(q);
        };
        // ============ 订单分享数据看板（管理后台） ============
        // 注意路由顺序：`stats` 必须放在 `:id` 系列之前，否则会被误判为 shareCode。
        // 当前没有按 shareCode 单查的路由，但为后续扩展留好声明顺序。
        PlatformController_1.prototype.orderSharesStats = function () {
            return this.svc.orderSharesStats();
        };
        PlatformController_1.prototype.orderShares = function (q) {
            return this.svc.orderShares(q);
        };
        // System
        PlatformController_1.prototype.systemSettings = function () {
            return this.svc.systemSettings();
        };
        PlatformController_1.prototype.saveSystemSettings = function (dto) {
            return this.svc.saveSystemSettings(dto);
        };
        // ============ 工单系统 ============
        // 工单基于 SystemConfig key='ticket:<id>' 兜底存储,详见 svc.tickets() 注释
        // 路由顺序:`handled-count` / `pending-count` 必须在 `:id` 系列之前
        PlatformController_1.prototype.handledTicketCount = function () {
            return this.svc.handledTicketCount();
        };
        PlatformController_1.prototype.pendingTicketCount = function () {
            return this.svc.pendingTicketCount();
        };
        PlatformController_1.prototype.tickets = function (q) {
            return this.svc.tickets(q);
        };
        PlatformController_1.prototype.createTicket = function (dto, u) {
            return this.svc.createTicket({
                title: dto === null || dto === void 0 ? void 0 : dto.title,
                content: dto === null || dto === void 0 ? void 0 : dto.content,
                fromUserId: (dto === null || dto === void 0 ? void 0 : dto.fromUserId) || (u === null || u === void 0 ? void 0 : u.sub),
                fromUserName: dto === null || dto === void 0 ? void 0 : dto.fromUserName,
                priority: dto === null || dto === void 0 ? void 0 : dto.priority,
            });
        };
        PlatformController_1.prototype.handleTicket = function (id, dto, u) {
            return this.svc.handleTicket(id, dto, u === null || u === void 0 ? void 0 : u.sub);
        };
        // ============ 消息中心 ============
        // 同样基于 SystemConfig key='notification:<id>' 兜底存储;
        // 平台运营人员看到的系统通知/待办提醒/业务提示三类。
        PlatformController_1.prototype.notifications = function (q) {
            return this.svc.notifications(q);
        };
        PlatformController_1.prototype.notificationsReadAll = function (u) {
            return this.svc.notificationsReadAll(u === null || u === void 0 ? void 0 : u.sub);
        };
        PlatformController_1.prototype.notificationRead = function (id, u) {
            return this.svc.notificationRead(id, u === null || u === void 0 ? void 0 : u.sub);
        };
        // ============ 反馈 ============
        // 反馈记录基于 SystemConfig key='feedback:<id>' 兜底存储,
        // 平台运营人员可在 admin-pc / platform-app 查看 / 处理。
        PlatformController_1.prototype.submitFeedback = function (dto, u) {
            return this.svc.submitFeedback(dto, u === null || u === void 0 ? void 0 : u.sub);
        };
        PlatformController_1.prototype.feedbackList = function (q) {
            return this.svc.feedbackList(q);
        };
        // ============ 售后/退款审核（平台层） ============
        // 注意：前端 platform-app refundService 用的是 `agree` 不是 `approve`，
        // 这里端点名称必须严格匹配前端调用（POST /p/refunds/:id/agree）。
        PlatformController_1.prototype.refunds = function (q) {
            return this.svc.listRefunds(q);
        };
        PlatformController_1.prototype.agreeRefund = function (id, refundAmount, u) {
            return this.svc.agreeRefund(id, refundAmount, u === null || u === void 0 ? void 0 : u.sub);
        };
        PlatformController_1.prototype.rejectRefundPlat = function (id, reason, u) {
            return this.svc.rejectRefundPlat(id, reason, u === null || u === void 0 ? void 0 : u.sub);
        };
        return PlatformController_1;
    }());
    __setFunctionName(_classThis, "PlatformController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _dashboard_decorators = [(0, common_1.Get)('dashboard')];
        _stats_decorators = [(0, common_1.Get)('stats')];
        _merchants_decorators = [(0, common_1.Get)('merchants')];
        _auditMerchants_decorators = [(0, common_1.Get)('audit/merchants')];
        _approveMerchant_decorators = [(0, common_1.Post)('merchants/:id/approve')];
        _rejectMerchant_decorators = [(0, common_1.Post)('merchants/:id/reject')];
        _pauseMerchant_decorators = [(0, common_1.Post)('merchants/:id/pause')];
        _resumeMerchant_decorators = [(0, common_1.Post)('merchants/:id/resume')];
        _orders_decorators = [(0, common_1.Get)('orders')];
        _auditProducts_decorators = [(0, common_1.Get)('audit/products')];
        _getAuditConfig_decorators = [(0, common_1.Get)('audit/products/config')];
        _saveAuditConfig_decorators = [(0, common_1.Post)('audit/products/config')];
        _approveProduct_decorators = [(0, common_1.Post)('products/:id/approve')];
        _rejectProduct_decorators = [(0, common_1.Post)('products/:id/reject')];
        _sampleCheckProduct_decorators = [(0, common_1.Post)('audit/products/:id/sample-check')];
        _setPlazaProductOnline_decorators = [(0, common_1.Patch)('plaza/products/:id/online')];
        _adSlots_decorators = [(0, common_1.Get)('ads/slots')];
        _createAdSlot_decorators = [(0, common_1.Post)('ads/slots')];
        _updateAdSlot_decorators = [(0, common_1.Put)('ads/slots/:id')];
        _deleteAdSlot_decorators = [(0, common_1.Delete)('ads/slots/:id')];
        _adCreatives_decorators = [(0, common_1.Get)('ads/creatives')];
        _createAdCreative_decorators = [(0, common_1.Post)('ads/creatives')];
        _updateAdCreative_decorators = [(0, common_1.Put)('ads/creatives/:id')];
        _deleteAdCreative_decorators = [(0, common_1.Delete)('ads/creatives/:id')];
        _approveAdCreative_decorators = [(0, common_1.Post)('ads/creatives/:id/approve')];
        _rejectAdCreative_decorators = [(0, common_1.Post)('ads/creatives/:id/reject')];
        _plazaPushes_decorators = [(0, common_1.Get)('plaza/pushes')];
        _createPlazaPush_decorators = [(0, common_1.Post)('plaza/pushes')];
        _plazaProducts_decorators = [(0, common_1.Get)('plaza/products')];
        _plazaFactories_decorators = [(0, common_1.Get)('plaza/factories')];
        _plazaRecords_decorators = [(0, common_1.Get)('plaza/records')];
        _memberTrialDays_decorators = [(0, common_1.Get)('member-plans/trial-days')];
        _saveMemberTrialDays_decorators = [(0, common_1.Put)('member-plans/trial-days')];
        _memberPlans_decorators = [(0, common_1.Get)('member-plans')];
        _saveMemberPlan_decorators = [(0, common_1.Post)('member-plans')];
        _deleteMemberPlan_decorators = [(0, common_1.Delete)('member-plans/:id')];
        _planSubscriptions_decorators = [(0, common_1.Get)('member-plans/:id/subscriptions')];
        _withdraws_decorators = [(0, common_1.Get)('withdraws')];
        _approveWithdraw_decorators = [(0, common_1.Post)('withdraws/:id/approve')];
        _rejectWithdrawPlat_decorators = [(0, common_1.Post)('withdraws/:id/reject')];
        _markWithdrawPaid_decorators = [(0, common_1.Post)('withdraws/:id/mark-paid')];
        _memberPayOrders_decorators = [(0, common_1.Get)('member-pay-orders')];
        _updatePayStatus_decorators = [(0, common_1.Patch)('member-pay-orders/:id/status')];
        _approveRefund_decorators = [(0, common_1.Post)('member-pay-orders/:id/approve-refund')];
        _rejectRefund_decorators = [(0, common_1.Post)('member-pay-orders/:id/reject-refund')];
        _featureFlags_decorators = [(0, common_1.Get)('feature-flags')];
        _createFeatureFlag_decorators = [(0, common_1.Post)('feature-flags')];
        _deleteFeatureFlag_decorators = [(0, common_1.Delete)('feature-flags/:id')];
        _toggleFeatureFlag_decorators = [(0, common_1.Post)('feature-flags/:id/toggle')];
        _featureFlagGray_decorators = [(0, common_1.Get)('feature-flags/gray')];
        _setFeatureFlagGray_decorators = [(0, common_1.Post)('feature-flags/gray')];
        _resetFeatureFlags_decorators = [(0, common_1.Post)('feature-flags/reset')];
        _admins_decorators = [(0, common_1.Get)('admins')];
        _createAdmin_decorators = [(0, common_1.Post)('admins')];
        _updateAdmin_decorators = [(0, common_1.Put)('admins/:id')];
        _deleteAdmin_decorators = [(0, common_1.Delete)('admins/:id')];
        _toggleAdmin_decorators = [(0, common_1.Post)('admins/:id/toggle')];
        _resetAdminPwd_decorators = [(0, common_1.Post)('admins/:id/reset-password')];
        _roles_decorators = [(0, common_1.Get)('roles')];
        _saveRole_decorators = [(0, common_1.Post)('roles')];
        _updateRole_decorators = [(0, common_1.Put)('roles/:id')];
        _deleteRole_decorators = [(0, common_1.Delete)('roles/:id')];
        _auditRecords_decorators = [(0, common_1.Get)('audit/records')];
        _orderSharesStats_decorators = [(0, common_1.Get)('order-shares/stats')];
        _orderShares_decorators = [(0, common_1.Get)('order-shares')];
        _systemSettings_decorators = [(0, common_1.Get)('system/settings')];
        _saveSystemSettings_decorators = [(0, common_1.Post)('system/settings')];
        _handledTicketCount_decorators = [(0, common_1.Get)('tickets/handled-count')];
        _pendingTicketCount_decorators = [(0, common_1.Get)('tickets/pending-count')];
        _tickets_decorators = [(0, common_1.Get)('tickets')];
        _createTicket_decorators = [(0, common_1.Post)('tickets')];
        _handleTicket_decorators = [(0, common_1.Post)('tickets/:id/handle')];
        _notifications_decorators = [(0, common_1.Get)('notifications')];
        _notificationsReadAll_decorators = [(0, common_1.Post)('notifications/read-all')];
        _notificationRead_decorators = [(0, common_1.Post)('notifications/:id/read')];
        _submitFeedback_decorators = [(0, common_1.Post)('feedback')];
        _feedbackList_decorators = [(0, common_1.Get)('feedback')];
        _refunds_decorators = [(0, common_1.Get)('refunds')];
        _agreeRefund_decorators = [(0, common_1.Post)('refunds/:id/agree')];
        _rejectRefundPlat_decorators = [(0, common_1.Post)('refunds/:id/reject')];
        __esDecorate(_classThis, null, _dashboard_decorators, { kind: "method", name: "dashboard", static: false, private: false, access: { has: function (obj) { return "dashboard" in obj; }, get: function (obj) { return obj.dashboard; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _stats_decorators, { kind: "method", name: "stats", static: false, private: false, access: { has: function (obj) { return "stats" in obj; }, get: function (obj) { return obj.stats; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _merchants_decorators, { kind: "method", name: "merchants", static: false, private: false, access: { has: function (obj) { return "merchants" in obj; }, get: function (obj) { return obj.merchants; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _auditMerchants_decorators, { kind: "method", name: "auditMerchants", static: false, private: false, access: { has: function (obj) { return "auditMerchants" in obj; }, get: function (obj) { return obj.auditMerchants; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _approveMerchant_decorators, { kind: "method", name: "approveMerchant", static: false, private: false, access: { has: function (obj) { return "approveMerchant" in obj; }, get: function (obj) { return obj.approveMerchant; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _rejectMerchant_decorators, { kind: "method", name: "rejectMerchant", static: false, private: false, access: { has: function (obj) { return "rejectMerchant" in obj; }, get: function (obj) { return obj.rejectMerchant; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _pauseMerchant_decorators, { kind: "method", name: "pauseMerchant", static: false, private: false, access: { has: function (obj) { return "pauseMerchant" in obj; }, get: function (obj) { return obj.pauseMerchant; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _resumeMerchant_decorators, { kind: "method", name: "resumeMerchant", static: false, private: false, access: { has: function (obj) { return "resumeMerchant" in obj; }, get: function (obj) { return obj.resumeMerchant; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _orders_decorators, { kind: "method", name: "orders", static: false, private: false, access: { has: function (obj) { return "orders" in obj; }, get: function (obj) { return obj.orders; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _auditProducts_decorators, { kind: "method", name: "auditProducts", static: false, private: false, access: { has: function (obj) { return "auditProducts" in obj; }, get: function (obj) { return obj.auditProducts; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getAuditConfig_decorators, { kind: "method", name: "getAuditConfig", static: false, private: false, access: { has: function (obj) { return "getAuditConfig" in obj; }, get: function (obj) { return obj.getAuditConfig; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _saveAuditConfig_decorators, { kind: "method", name: "saveAuditConfig", static: false, private: false, access: { has: function (obj) { return "saveAuditConfig" in obj; }, get: function (obj) { return obj.saveAuditConfig; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _approveProduct_decorators, { kind: "method", name: "approveProduct", static: false, private: false, access: { has: function (obj) { return "approveProduct" in obj; }, get: function (obj) { return obj.approveProduct; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _rejectProduct_decorators, { kind: "method", name: "rejectProduct", static: false, private: false, access: { has: function (obj) { return "rejectProduct" in obj; }, get: function (obj) { return obj.rejectProduct; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _sampleCheckProduct_decorators, { kind: "method", name: "sampleCheckProduct", static: false, private: false, access: { has: function (obj) { return "sampleCheckProduct" in obj; }, get: function (obj) { return obj.sampleCheckProduct; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _setPlazaProductOnline_decorators, { kind: "method", name: "setPlazaProductOnline", static: false, private: false, access: { has: function (obj) { return "setPlazaProductOnline" in obj; }, get: function (obj) { return obj.setPlazaProductOnline; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _adSlots_decorators, { kind: "method", name: "adSlots", static: false, private: false, access: { has: function (obj) { return "adSlots" in obj; }, get: function (obj) { return obj.adSlots; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createAdSlot_decorators, { kind: "method", name: "createAdSlot", static: false, private: false, access: { has: function (obj) { return "createAdSlot" in obj; }, get: function (obj) { return obj.createAdSlot; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateAdSlot_decorators, { kind: "method", name: "updateAdSlot", static: false, private: false, access: { has: function (obj) { return "updateAdSlot" in obj; }, get: function (obj) { return obj.updateAdSlot; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteAdSlot_decorators, { kind: "method", name: "deleteAdSlot", static: false, private: false, access: { has: function (obj) { return "deleteAdSlot" in obj; }, get: function (obj) { return obj.deleteAdSlot; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _adCreatives_decorators, { kind: "method", name: "adCreatives", static: false, private: false, access: { has: function (obj) { return "adCreatives" in obj; }, get: function (obj) { return obj.adCreatives; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createAdCreative_decorators, { kind: "method", name: "createAdCreative", static: false, private: false, access: { has: function (obj) { return "createAdCreative" in obj; }, get: function (obj) { return obj.createAdCreative; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateAdCreative_decorators, { kind: "method", name: "updateAdCreative", static: false, private: false, access: { has: function (obj) { return "updateAdCreative" in obj; }, get: function (obj) { return obj.updateAdCreative; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteAdCreative_decorators, { kind: "method", name: "deleteAdCreative", static: false, private: false, access: { has: function (obj) { return "deleteAdCreative" in obj; }, get: function (obj) { return obj.deleteAdCreative; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _approveAdCreative_decorators, { kind: "method", name: "approveAdCreative", static: false, private: false, access: { has: function (obj) { return "approveAdCreative" in obj; }, get: function (obj) { return obj.approveAdCreative; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _rejectAdCreative_decorators, { kind: "method", name: "rejectAdCreative", static: false, private: false, access: { has: function (obj) { return "rejectAdCreative" in obj; }, get: function (obj) { return obj.rejectAdCreative; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _plazaPushes_decorators, { kind: "method", name: "plazaPushes", static: false, private: false, access: { has: function (obj) { return "plazaPushes" in obj; }, get: function (obj) { return obj.plazaPushes; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createPlazaPush_decorators, { kind: "method", name: "createPlazaPush", static: false, private: false, access: { has: function (obj) { return "createPlazaPush" in obj; }, get: function (obj) { return obj.createPlazaPush; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _plazaProducts_decorators, { kind: "method", name: "plazaProducts", static: false, private: false, access: { has: function (obj) { return "plazaProducts" in obj; }, get: function (obj) { return obj.plazaProducts; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _plazaFactories_decorators, { kind: "method", name: "plazaFactories", static: false, private: false, access: { has: function (obj) { return "plazaFactories" in obj; }, get: function (obj) { return obj.plazaFactories; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _plazaRecords_decorators, { kind: "method", name: "plazaRecords", static: false, private: false, access: { has: function (obj) { return "plazaRecords" in obj; }, get: function (obj) { return obj.plazaRecords; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _memberTrialDays_decorators, { kind: "method", name: "memberTrialDays", static: false, private: false, access: { has: function (obj) { return "memberTrialDays" in obj; }, get: function (obj) { return obj.memberTrialDays; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _saveMemberTrialDays_decorators, { kind: "method", name: "saveMemberTrialDays", static: false, private: false, access: { has: function (obj) { return "saveMemberTrialDays" in obj; }, get: function (obj) { return obj.saveMemberTrialDays; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _memberPlans_decorators, { kind: "method", name: "memberPlans", static: false, private: false, access: { has: function (obj) { return "memberPlans" in obj; }, get: function (obj) { return obj.memberPlans; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _saveMemberPlan_decorators, { kind: "method", name: "saveMemberPlan", static: false, private: false, access: { has: function (obj) { return "saveMemberPlan" in obj; }, get: function (obj) { return obj.saveMemberPlan; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteMemberPlan_decorators, { kind: "method", name: "deleteMemberPlan", static: false, private: false, access: { has: function (obj) { return "deleteMemberPlan" in obj; }, get: function (obj) { return obj.deleteMemberPlan; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _planSubscriptions_decorators, { kind: "method", name: "planSubscriptions", static: false, private: false, access: { has: function (obj) { return "planSubscriptions" in obj; }, get: function (obj) { return obj.planSubscriptions; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _withdraws_decorators, { kind: "method", name: "withdraws", static: false, private: false, access: { has: function (obj) { return "withdraws" in obj; }, get: function (obj) { return obj.withdraws; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _approveWithdraw_decorators, { kind: "method", name: "approveWithdraw", static: false, private: false, access: { has: function (obj) { return "approveWithdraw" in obj; }, get: function (obj) { return obj.approveWithdraw; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _rejectWithdrawPlat_decorators, { kind: "method", name: "rejectWithdrawPlat", static: false, private: false, access: { has: function (obj) { return "rejectWithdrawPlat" in obj; }, get: function (obj) { return obj.rejectWithdrawPlat; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _markWithdrawPaid_decorators, { kind: "method", name: "markWithdrawPaid", static: false, private: false, access: { has: function (obj) { return "markWithdrawPaid" in obj; }, get: function (obj) { return obj.markWithdrawPaid; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _memberPayOrders_decorators, { kind: "method", name: "memberPayOrders", static: false, private: false, access: { has: function (obj) { return "memberPayOrders" in obj; }, get: function (obj) { return obj.memberPayOrders; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updatePayStatus_decorators, { kind: "method", name: "updatePayStatus", static: false, private: false, access: { has: function (obj) { return "updatePayStatus" in obj; }, get: function (obj) { return obj.updatePayStatus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _approveRefund_decorators, { kind: "method", name: "approveRefund", static: false, private: false, access: { has: function (obj) { return "approveRefund" in obj; }, get: function (obj) { return obj.approveRefund; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _rejectRefund_decorators, { kind: "method", name: "rejectRefund", static: false, private: false, access: { has: function (obj) { return "rejectRefund" in obj; }, get: function (obj) { return obj.rejectRefund; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _featureFlags_decorators, { kind: "method", name: "featureFlags", static: false, private: false, access: { has: function (obj) { return "featureFlags" in obj; }, get: function (obj) { return obj.featureFlags; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createFeatureFlag_decorators, { kind: "method", name: "createFeatureFlag", static: false, private: false, access: { has: function (obj) { return "createFeatureFlag" in obj; }, get: function (obj) { return obj.createFeatureFlag; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteFeatureFlag_decorators, { kind: "method", name: "deleteFeatureFlag", static: false, private: false, access: { has: function (obj) { return "deleteFeatureFlag" in obj; }, get: function (obj) { return obj.deleteFeatureFlag; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _toggleFeatureFlag_decorators, { kind: "method", name: "toggleFeatureFlag", static: false, private: false, access: { has: function (obj) { return "toggleFeatureFlag" in obj; }, get: function (obj) { return obj.toggleFeatureFlag; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _featureFlagGray_decorators, { kind: "method", name: "featureFlagGray", static: false, private: false, access: { has: function (obj) { return "featureFlagGray" in obj; }, get: function (obj) { return obj.featureFlagGray; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _setFeatureFlagGray_decorators, { kind: "method", name: "setFeatureFlagGray", static: false, private: false, access: { has: function (obj) { return "setFeatureFlagGray" in obj; }, get: function (obj) { return obj.setFeatureFlagGray; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _resetFeatureFlags_decorators, { kind: "method", name: "resetFeatureFlags", static: false, private: false, access: { has: function (obj) { return "resetFeatureFlags" in obj; }, get: function (obj) { return obj.resetFeatureFlags; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _admins_decorators, { kind: "method", name: "admins", static: false, private: false, access: { has: function (obj) { return "admins" in obj; }, get: function (obj) { return obj.admins; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createAdmin_decorators, { kind: "method", name: "createAdmin", static: false, private: false, access: { has: function (obj) { return "createAdmin" in obj; }, get: function (obj) { return obj.createAdmin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateAdmin_decorators, { kind: "method", name: "updateAdmin", static: false, private: false, access: { has: function (obj) { return "updateAdmin" in obj; }, get: function (obj) { return obj.updateAdmin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteAdmin_decorators, { kind: "method", name: "deleteAdmin", static: false, private: false, access: { has: function (obj) { return "deleteAdmin" in obj; }, get: function (obj) { return obj.deleteAdmin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _toggleAdmin_decorators, { kind: "method", name: "toggleAdmin", static: false, private: false, access: { has: function (obj) { return "toggleAdmin" in obj; }, get: function (obj) { return obj.toggleAdmin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _resetAdminPwd_decorators, { kind: "method", name: "resetAdminPwd", static: false, private: false, access: { has: function (obj) { return "resetAdminPwd" in obj; }, get: function (obj) { return obj.resetAdminPwd; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _roles_decorators, { kind: "method", name: "roles", static: false, private: false, access: { has: function (obj) { return "roles" in obj; }, get: function (obj) { return obj.roles; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _saveRole_decorators, { kind: "method", name: "saveRole", static: false, private: false, access: { has: function (obj) { return "saveRole" in obj; }, get: function (obj) { return obj.saveRole; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateRole_decorators, { kind: "method", name: "updateRole", static: false, private: false, access: { has: function (obj) { return "updateRole" in obj; }, get: function (obj) { return obj.updateRole; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteRole_decorators, { kind: "method", name: "deleteRole", static: false, private: false, access: { has: function (obj) { return "deleteRole" in obj; }, get: function (obj) { return obj.deleteRole; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _auditRecords_decorators, { kind: "method", name: "auditRecords", static: false, private: false, access: { has: function (obj) { return "auditRecords" in obj; }, get: function (obj) { return obj.auditRecords; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _orderSharesStats_decorators, { kind: "method", name: "orderSharesStats", static: false, private: false, access: { has: function (obj) { return "orderSharesStats" in obj; }, get: function (obj) { return obj.orderSharesStats; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _orderShares_decorators, { kind: "method", name: "orderShares", static: false, private: false, access: { has: function (obj) { return "orderShares" in obj; }, get: function (obj) { return obj.orderShares; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _systemSettings_decorators, { kind: "method", name: "systemSettings", static: false, private: false, access: { has: function (obj) { return "systemSettings" in obj; }, get: function (obj) { return obj.systemSettings; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _saveSystemSettings_decorators, { kind: "method", name: "saveSystemSettings", static: false, private: false, access: { has: function (obj) { return "saveSystemSettings" in obj; }, get: function (obj) { return obj.saveSystemSettings; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _handledTicketCount_decorators, { kind: "method", name: "handledTicketCount", static: false, private: false, access: { has: function (obj) { return "handledTicketCount" in obj; }, get: function (obj) { return obj.handledTicketCount; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _pendingTicketCount_decorators, { kind: "method", name: "pendingTicketCount", static: false, private: false, access: { has: function (obj) { return "pendingTicketCount" in obj; }, get: function (obj) { return obj.pendingTicketCount; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _tickets_decorators, { kind: "method", name: "tickets", static: false, private: false, access: { has: function (obj) { return "tickets" in obj; }, get: function (obj) { return obj.tickets; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createTicket_decorators, { kind: "method", name: "createTicket", static: false, private: false, access: { has: function (obj) { return "createTicket" in obj; }, get: function (obj) { return obj.createTicket; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _handleTicket_decorators, { kind: "method", name: "handleTicket", static: false, private: false, access: { has: function (obj) { return "handleTicket" in obj; }, get: function (obj) { return obj.handleTicket; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _notifications_decorators, { kind: "method", name: "notifications", static: false, private: false, access: { has: function (obj) { return "notifications" in obj; }, get: function (obj) { return obj.notifications; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _notificationsReadAll_decorators, { kind: "method", name: "notificationsReadAll", static: false, private: false, access: { has: function (obj) { return "notificationsReadAll" in obj; }, get: function (obj) { return obj.notificationsReadAll; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _notificationRead_decorators, { kind: "method", name: "notificationRead", static: false, private: false, access: { has: function (obj) { return "notificationRead" in obj; }, get: function (obj) { return obj.notificationRead; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _submitFeedback_decorators, { kind: "method", name: "submitFeedback", static: false, private: false, access: { has: function (obj) { return "submitFeedback" in obj; }, get: function (obj) { return obj.submitFeedback; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _feedbackList_decorators, { kind: "method", name: "feedbackList", static: false, private: false, access: { has: function (obj) { return "feedbackList" in obj; }, get: function (obj) { return obj.feedbackList; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _refunds_decorators, { kind: "method", name: "refunds", static: false, private: false, access: { has: function (obj) { return "refunds" in obj; }, get: function (obj) { return obj.refunds; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _agreeRefund_decorators, { kind: "method", name: "agreeRefund", static: false, private: false, access: { has: function (obj) { return "agreeRefund" in obj; }, get: function (obj) { return obj.agreeRefund; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _rejectRefundPlat_decorators, { kind: "method", name: "rejectRefundPlat", static: false, private: false, access: { has: function (obj) { return "rejectRefundPlat" in obj; }, get: function (obj) { return obj.rejectRefundPlat; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PlatformController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PlatformController = _classThis;
}();
exports.PlatformController = PlatformController;
