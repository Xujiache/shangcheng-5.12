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
exports.LedgerBizController = void 0;
var common_1 = require("@nestjs/common");
var swagger_1 = require("@nestjs/swagger");
var public_decorator_1 = require("../../common/decorators/public.decorator");
var ledger_jwt_guard_1 = require("./guards/ledger-jwt.guard");
var ledger_membership_guard_1 = require("./guards/ledger-membership.guard");
/**
 * 门窗利账 App · 业务（/api/v1/l/*，需登录 + 会员有效）。
 * 会员闸门由 LedgerMembershipGuard 统一拦截：过期/未开通 → MEMBER_EXPIRED(6001)。
 */
var LedgerBizController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('门窗利账-业务'), (0, public_decorator_1.Public)(), (0, common_1.UseGuards)(ledger_jwt_guard_1.LedgerJwtGuard, ledger_membership_guard_1.LedgerMembershipGuard), (0, common_1.Controller)('l')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _listOrders_decorators;
    var _createOrder_decorators;
    var _getOrder_decorators;
    var _updateOrder_decorators;
    var _deleteOrder_decorators;
    var _listCustomers_decorators;
    var _createCustomer_decorators;
    var _ensureCustomer_decorators;
    var _getCustomer_decorators;
    var _updateCustomer_decorators;
    var _deleteCustomer_decorators;
    var _listWorkLogs_decorators;
    var _createWorkLog_decorators;
    var _updateWorkLog_decorators;
    var _deleteWorkLog_decorators;
    var _overview_decorators;
    var _monthly_decorators;
    var _series_decorators;
    var _getGoal_decorators;
    var _setGoal_decorators;
    var _listCutPlans_decorators;
    var _createCutPlan_decorators;
    var _updateCutPlan_decorators;
    var _deleteCutPlan_decorators;
    var LedgerBizController = _classThis = /** @class */ (function () {
        function LedgerBizController_1(svc, workbook) {
            this.svc = (__runInitializers(this, _instanceExtraInitializers), svc);
            this.workbook = workbook;
        }
        // ── 订单 ──
        LedgerBizController_1.prototype.listOrders = function (u, q) {
            return this.svc.listOrders(u.id, q);
        };
        LedgerBizController_1.prototype.createOrder = function (u, dto) {
            return this.svc.createOrder(u.id, dto);
        };
        LedgerBizController_1.prototype.getOrder = function (u, id) {
            return this.svc.getOrder(u.id, id);
        };
        LedgerBizController_1.prototype.updateOrder = function (u, id, dto) {
            return this.svc.updateOrder(u.id, id, dto);
        };
        LedgerBizController_1.prototype.deleteOrder = function (u, id) {
            return this.svc.deleteOrder(u.id, id);
        };
        // ── 客户 ──
        LedgerBizController_1.prototype.listCustomers = function (u) {
            return this.svc.listCustomers(u.id);
        };
        LedgerBizController_1.prototype.createCustomer = function (u, dto) {
            return this.svc.createCustomer(u.id, dto);
        };
        // 无档客户（订单自动生成）点击进入时：按姓名幂等建档 + 关联同名历史订单
        LedgerBizController_1.prototype.ensureCustomer = function (u, dto) {
            return this.svc.ensureCustomerByName(u.id, dto.name);
        };
        LedgerBizController_1.prototype.getCustomer = function (u, id) {
            return this.svc.getCustomer(u.id, id);
        };
        LedgerBizController_1.prototype.updateCustomer = function (u, id, dto) {
            return this.svc.updateCustomer(u.id, id, dto);
        };
        LedgerBizController_1.prototype.deleteCustomer = function (u, id) {
            return this.svc.deleteCustomer(u.id, id);
        };
        // ── 记工（独立日工台账）──
        LedgerBizController_1.prototype.listWorkLogs = function (u, q) {
            return this.workbook.legacyList(u.id, q.month);
        };
        LedgerBizController_1.prototype.createWorkLog = function (u, dto) {
            return this.workbook.legacyWrite(u.id, undefined, dto);
        };
        LedgerBizController_1.prototype.updateWorkLog = function (u, id, dto) {
            return this.workbook.legacyWrite(u.id, id, dto);
        };
        LedgerBizController_1.prototype.deleteWorkLog = function (u, id) {
            return this.workbook.legacyWrite(u.id, id, {}, true);
        };
        // ── 统计 ──
        LedgerBizController_1.prototype.overview = function (u, period) {
            return this.svc.overview(u.id, period || 'month');
        };
        LedgerBizController_1.prototype.monthly = function (u, year) {
            return this.svc.monthlySeries(u.id, year ? Number(year) : undefined);
        };
        LedgerBizController_1.prototype.series = function (u, granularity) {
            return this.svc.series(u.id, granularity || 'month');
        };
        // ── 经营目标 ──
        LedgerBizController_1.prototype.getGoal = function (u) {
            return this.svc.getGoal(u.id);
        };
        LedgerBizController_1.prototype.setGoal = function (u, dto) {
            return this.svc.setGoal(u.id, dto);
        };
        // ── 优化下料·云端历史方案（按 userId 隔离）──
        LedgerBizController_1.prototype.listCutPlans = function (u) {
            return this.svc.listCutPlans(u.id);
        };
        LedgerBizController_1.prototype.createCutPlan = function (u, dto) {
            return this.svc.createCutPlan(u.id, dto);
        };
        LedgerBizController_1.prototype.updateCutPlan = function (u, id, dto) {
            return this.svc.updateCutPlan(u.id, id, dto);
        };
        LedgerBizController_1.prototype.deleteCutPlan = function (u, id) {
            return this.svc.deleteCutPlan(u.id, id);
        };
        return LedgerBizController_1;
    }());
    __setFunctionName(_classThis, "LedgerBizController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _listOrders_decorators = [(0, common_1.Get)('orders')];
        _createOrder_decorators = [(0, common_1.Post)('orders')];
        _getOrder_decorators = [(0, common_1.Get)('orders/:id')];
        _updateOrder_decorators = [(0, common_1.Patch)('orders/:id')];
        _deleteOrder_decorators = [(0, common_1.Delete)('orders/:id')];
        _listCustomers_decorators = [(0, common_1.Get)('customers')];
        _createCustomer_decorators = [(0, common_1.Post)('customers')];
        _ensureCustomer_decorators = [(0, common_1.Post)('customers/ensure')];
        _getCustomer_decorators = [(0, common_1.Get)('customers/:id')];
        _updateCustomer_decorators = [(0, common_1.Patch)('customers/:id')];
        _deleteCustomer_decorators = [(0, common_1.Delete)('customers/:id')];
        _listWorkLogs_decorators = [(0, common_1.Get)('work-logs')];
        _createWorkLog_decorators = [(0, common_1.Post)('work-logs')];
        _updateWorkLog_decorators = [(0, common_1.Patch)('work-logs/:id')];
        _deleteWorkLog_decorators = [(0, common_1.Delete)('work-logs/:id')];
        _overview_decorators = [(0, common_1.Get)('stats/overview')];
        _monthly_decorators = [(0, common_1.Get)('stats/monthly')];
        _series_decorators = [(0, common_1.Get)('stats/series')];
        _getGoal_decorators = [(0, common_1.Get)('goal')];
        _setGoal_decorators = [(0, common_1.Put)('goal')];
        _listCutPlans_decorators = [(0, common_1.Get)('cut/plans')];
        _createCutPlan_decorators = [(0, common_1.Post)('cut/plans')];
        _updateCutPlan_decorators = [(0, common_1.Put)('cut/plans/:id')];
        _deleteCutPlan_decorators = [(0, common_1.Delete)('cut/plans/:id')];
        __esDecorate(_classThis, null, _listOrders_decorators, { kind: "method", name: "listOrders", static: false, private: false, access: { has: function (obj) { return "listOrders" in obj; }, get: function (obj) { return obj.listOrders; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createOrder_decorators, { kind: "method", name: "createOrder", static: false, private: false, access: { has: function (obj) { return "createOrder" in obj; }, get: function (obj) { return obj.createOrder; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getOrder_decorators, { kind: "method", name: "getOrder", static: false, private: false, access: { has: function (obj) { return "getOrder" in obj; }, get: function (obj) { return obj.getOrder; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateOrder_decorators, { kind: "method", name: "updateOrder", static: false, private: false, access: { has: function (obj) { return "updateOrder" in obj; }, get: function (obj) { return obj.updateOrder; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteOrder_decorators, { kind: "method", name: "deleteOrder", static: false, private: false, access: { has: function (obj) { return "deleteOrder" in obj; }, get: function (obj) { return obj.deleteOrder; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listCustomers_decorators, { kind: "method", name: "listCustomers", static: false, private: false, access: { has: function (obj) { return "listCustomers" in obj; }, get: function (obj) { return obj.listCustomers; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createCustomer_decorators, { kind: "method", name: "createCustomer", static: false, private: false, access: { has: function (obj) { return "createCustomer" in obj; }, get: function (obj) { return obj.createCustomer; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _ensureCustomer_decorators, { kind: "method", name: "ensureCustomer", static: false, private: false, access: { has: function (obj) { return "ensureCustomer" in obj; }, get: function (obj) { return obj.ensureCustomer; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getCustomer_decorators, { kind: "method", name: "getCustomer", static: false, private: false, access: { has: function (obj) { return "getCustomer" in obj; }, get: function (obj) { return obj.getCustomer; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateCustomer_decorators, { kind: "method", name: "updateCustomer", static: false, private: false, access: { has: function (obj) { return "updateCustomer" in obj; }, get: function (obj) { return obj.updateCustomer; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteCustomer_decorators, { kind: "method", name: "deleteCustomer", static: false, private: false, access: { has: function (obj) { return "deleteCustomer" in obj; }, get: function (obj) { return obj.deleteCustomer; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listWorkLogs_decorators, { kind: "method", name: "listWorkLogs", static: false, private: false, access: { has: function (obj) { return "listWorkLogs" in obj; }, get: function (obj) { return obj.listWorkLogs; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createWorkLog_decorators, { kind: "method", name: "createWorkLog", static: false, private: false, access: { has: function (obj) { return "createWorkLog" in obj; }, get: function (obj) { return obj.createWorkLog; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateWorkLog_decorators, { kind: "method", name: "updateWorkLog", static: false, private: false, access: { has: function (obj) { return "updateWorkLog" in obj; }, get: function (obj) { return obj.updateWorkLog; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteWorkLog_decorators, { kind: "method", name: "deleteWorkLog", static: false, private: false, access: { has: function (obj) { return "deleteWorkLog" in obj; }, get: function (obj) { return obj.deleteWorkLog; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _overview_decorators, { kind: "method", name: "overview", static: false, private: false, access: { has: function (obj) { return "overview" in obj; }, get: function (obj) { return obj.overview; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _monthly_decorators, { kind: "method", name: "monthly", static: false, private: false, access: { has: function (obj) { return "monthly" in obj; }, get: function (obj) { return obj.monthly; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _series_decorators, { kind: "method", name: "series", static: false, private: false, access: { has: function (obj) { return "series" in obj; }, get: function (obj) { return obj.series; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getGoal_decorators, { kind: "method", name: "getGoal", static: false, private: false, access: { has: function (obj) { return "getGoal" in obj; }, get: function (obj) { return obj.getGoal; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _setGoal_decorators, { kind: "method", name: "setGoal", static: false, private: false, access: { has: function (obj) { return "setGoal" in obj; }, get: function (obj) { return obj.setGoal; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listCutPlans_decorators, { kind: "method", name: "listCutPlans", static: false, private: false, access: { has: function (obj) { return "listCutPlans" in obj; }, get: function (obj) { return obj.listCutPlans; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createCutPlan_decorators, { kind: "method", name: "createCutPlan", static: false, private: false, access: { has: function (obj) { return "createCutPlan" in obj; }, get: function (obj) { return obj.createCutPlan; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateCutPlan_decorators, { kind: "method", name: "updateCutPlan", static: false, private: false, access: { has: function (obj) { return "updateCutPlan" in obj; }, get: function (obj) { return obj.updateCutPlan; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteCutPlan_decorators, { kind: "method", name: "deleteCutPlan", static: false, private: false, access: { has: function (obj) { return "deleteCutPlan" in obj; }, get: function (obj) { return obj.deleteCutPlan; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LedgerBizController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LedgerBizController = _classThis;
}();
exports.LedgerBizController = LedgerBizController;
