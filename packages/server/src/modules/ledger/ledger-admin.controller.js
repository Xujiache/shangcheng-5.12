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
exports.LedgerAdminController = void 0;
var common_1 = require("@nestjs/common");
var swagger_1 = require("@nestjs/swagger");
var roles_decorator_1 = require("../../common/decorators/roles.decorator");
var roles_guard_1 = require("../../common/guards/roles.guard");
/**
 * 门窗利账 · 后台管理（/api/v1/p/ledger/*）。
 * 走商城全局 JwtAuthGuard + RolesGuard，仅 platform/super-admin 可访问。
 * 管理记账账号与会员时长（你在 admin-pc 后台用）。
 */
var LedgerAdminController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('门窗利账-后台'), (0, common_1.UseGuards)(roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)('platform', 'super-admin'), (0, common_1.Controller)('p/ledger')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _listUsers_decorators;
    var _updateUser_decorators;
    var _grant_decorators;
    var _logs_decorators;
    var _notify_decorators;
    var _listFeedback_decorators;
    var _updateFeedback_decorators;
    var _listAds_decorators;
    var _createAd_decorators;
    var _updateAd_decorators;
    var _deleteAd_decorators;
    var _getConfig_decorators;
    var _updateConfig_decorators;
    var _inviteStats_decorators;
    var _genAiImage_decorators;
    var _aiImageStatus_decorators;
    var _adoptAiImage_decorators;
    var _changelogs_decorators;
    var _createChangelog_decorators;
    var _updateChangelog_decorators;
    var _removeChangelog_decorators;
    var LedgerAdminController = _classThis = /** @class */ (function () {
        function LedgerAdminController_1(admin, ai, extra) {
            this.admin = (__runInitializers(this, _instanceExtraInitializers), admin);
            this.ai = ai;
            this.extra = extra;
        }
        LedgerAdminController_1.prototype.listUsers = function (q) {
            return this.admin.listUsers(q);
        };
        LedgerAdminController_1.prototype.updateUser = function (id, dto) {
            return this.admin.updateUser(id, dto);
        };
        LedgerAdminController_1.prototype.grant = function (id, dto, op) {
            return this.admin.grantMembership(id, dto, op === null || op === void 0 ? void 0 : op.sub);
        };
        LedgerAdminController_1.prototype.logs = function (id) {
            return this.admin.membershipLogs(id);
        };
        // ── 推送通知 ──
        LedgerAdminController_1.prototype.notify = function (id, dto) {
            return this.admin.pushNotification(id, dto);
        };
        // ── 意见反馈 ──
        LedgerAdminController_1.prototype.listFeedback = function (q) {
            return this.admin.listFeedback(q);
        };
        LedgerAdminController_1.prototype.updateFeedback = function (id, dto) {
            return this.admin.updateFeedback(id, dto);
        };
        // ── 首页广告（#2）──
        LedgerAdminController_1.prototype.listAds = function () {
            return this.admin.listAds();
        };
        LedgerAdminController_1.prototype.createAd = function (dto) {
            return this.admin.createAd(dto);
        };
        LedgerAdminController_1.prototype.updateAd = function (id, dto) {
            return this.admin.updateAd(id, dto);
        };
        LedgerAdminController_1.prototype.deleteAd = function (id) {
            return this.admin.deleteAd(id);
        };
        // ── 功能配置（#9 优化下料 / #10 邀请）──
        LedgerAdminController_1.prototype.getConfig = function () {
            return this.admin.getConfig();
        };
        LedgerAdminController_1.prototype.updateConfig = function (dto) {
            return this.admin.updateConfig(dto);
        };
        // ── 邀请统计（#10）──
        LedgerAdminController_1.prototype.inviteStats = function () {
            return this.admin.inviteStats();
        };
        // ── AI 生图（#7：后台生成广告图）──
        LedgerAdminController_1.prototype.genAiImage = function (dto) {
            return this.ai.generate(dto);
        };
        LedgerAdminController_1.prototype.aiImageStatus = function (taskId) {
            return this.ai.status(taskId);
        };
        LedgerAdminController_1.prototype.adoptAiImage = function (u, dto) {
            return this.ai.adopt(dto.url, u === null || u === void 0 ? void 0 : u.sub);
        };
        // ── 更新日志管理 ──
        LedgerAdminController_1.prototype.changelogs = function () {
            return this.extra.changelogAll();
        };
        LedgerAdminController_1.prototype.createChangelog = function (dto) {
            return this.extra.changelogCreate(dto);
        };
        LedgerAdminController_1.prototype.updateChangelog = function (id, dto) {
            return this.extra.changelogUpdate(id, dto);
        };
        LedgerAdminController_1.prototype.removeChangelog = function (id) {
            return this.extra.changelogRemove(id);
        };
        return LedgerAdminController_1;
    }());
    __setFunctionName(_classThis, "LedgerAdminController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _listUsers_decorators = [(0, common_1.Get)('users')];
        _updateUser_decorators = [(0, common_1.Patch)('users/:id')];
        _grant_decorators = [(0, common_1.Post)('users/:id/membership/grant')];
        _logs_decorators = [(0, common_1.Get)('users/:id/membership/logs')];
        _notify_decorators = [(0, common_1.Post)('users/:id/notify')];
        _listFeedback_decorators = [(0, common_1.Get)('feedback')];
        _updateFeedback_decorators = [(0, common_1.Patch)('feedback/:id')];
        _listAds_decorators = [(0, common_1.Get)('ads')];
        _createAd_decorators = [(0, common_1.Post)('ads')];
        _updateAd_decorators = [(0, common_1.Patch)('ads/:id')];
        _deleteAd_decorators = [(0, common_1.Delete)('ads/:id')];
        _getConfig_decorators = [(0, common_1.Get)('config')];
        _updateConfig_decorators = [(0, common_1.Put)('config')];
        _inviteStats_decorators = [(0, common_1.Get)('invite-stats')];
        _genAiImage_decorators = [(0, common_1.Post)('ai/image')];
        _aiImageStatus_decorators = [(0, common_1.Get)('ai/image/status')];
        _adoptAiImage_decorators = [(0, common_1.Post)('ai/image/adopt')];
        _changelogs_decorators = [(0, common_1.Get)('changelogs')];
        _createChangelog_decorators = [(0, common_1.Post)('changelogs')];
        _updateChangelog_decorators = [(0, common_1.Patch)('changelogs/:id')];
        _removeChangelog_decorators = [(0, common_1.Delete)('changelogs/:id')];
        __esDecorate(_classThis, null, _listUsers_decorators, { kind: "method", name: "listUsers", static: false, private: false, access: { has: function (obj) { return "listUsers" in obj; }, get: function (obj) { return obj.listUsers; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateUser_decorators, { kind: "method", name: "updateUser", static: false, private: false, access: { has: function (obj) { return "updateUser" in obj; }, get: function (obj) { return obj.updateUser; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _grant_decorators, { kind: "method", name: "grant", static: false, private: false, access: { has: function (obj) { return "grant" in obj; }, get: function (obj) { return obj.grant; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _logs_decorators, { kind: "method", name: "logs", static: false, private: false, access: { has: function (obj) { return "logs" in obj; }, get: function (obj) { return obj.logs; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _notify_decorators, { kind: "method", name: "notify", static: false, private: false, access: { has: function (obj) { return "notify" in obj; }, get: function (obj) { return obj.notify; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listFeedback_decorators, { kind: "method", name: "listFeedback", static: false, private: false, access: { has: function (obj) { return "listFeedback" in obj; }, get: function (obj) { return obj.listFeedback; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateFeedback_decorators, { kind: "method", name: "updateFeedback", static: false, private: false, access: { has: function (obj) { return "updateFeedback" in obj; }, get: function (obj) { return obj.updateFeedback; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listAds_decorators, { kind: "method", name: "listAds", static: false, private: false, access: { has: function (obj) { return "listAds" in obj; }, get: function (obj) { return obj.listAds; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createAd_decorators, { kind: "method", name: "createAd", static: false, private: false, access: { has: function (obj) { return "createAd" in obj; }, get: function (obj) { return obj.createAd; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateAd_decorators, { kind: "method", name: "updateAd", static: false, private: false, access: { has: function (obj) { return "updateAd" in obj; }, get: function (obj) { return obj.updateAd; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteAd_decorators, { kind: "method", name: "deleteAd", static: false, private: false, access: { has: function (obj) { return "deleteAd" in obj; }, get: function (obj) { return obj.deleteAd; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getConfig_decorators, { kind: "method", name: "getConfig", static: false, private: false, access: { has: function (obj) { return "getConfig" in obj; }, get: function (obj) { return obj.getConfig; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateConfig_decorators, { kind: "method", name: "updateConfig", static: false, private: false, access: { has: function (obj) { return "updateConfig" in obj; }, get: function (obj) { return obj.updateConfig; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _inviteStats_decorators, { kind: "method", name: "inviteStats", static: false, private: false, access: { has: function (obj) { return "inviteStats" in obj; }, get: function (obj) { return obj.inviteStats; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _genAiImage_decorators, { kind: "method", name: "genAiImage", static: false, private: false, access: { has: function (obj) { return "genAiImage" in obj; }, get: function (obj) { return obj.genAiImage; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _aiImageStatus_decorators, { kind: "method", name: "aiImageStatus", static: false, private: false, access: { has: function (obj) { return "aiImageStatus" in obj; }, get: function (obj) { return obj.aiImageStatus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _adoptAiImage_decorators, { kind: "method", name: "adoptAiImage", static: false, private: false, access: { has: function (obj) { return "adoptAiImage" in obj; }, get: function (obj) { return obj.adoptAiImage; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _changelogs_decorators, { kind: "method", name: "changelogs", static: false, private: false, access: { has: function (obj) { return "changelogs" in obj; }, get: function (obj) { return obj.changelogs; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createChangelog_decorators, { kind: "method", name: "createChangelog", static: false, private: false, access: { has: function (obj) { return "createChangelog" in obj; }, get: function (obj) { return obj.createChangelog; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateChangelog_decorators, { kind: "method", name: "updateChangelog", static: false, private: false, access: { has: function (obj) { return "updateChangelog" in obj; }, get: function (obj) { return obj.updateChangelog; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _removeChangelog_decorators, { kind: "method", name: "removeChangelog", static: false, private: false, access: { has: function (obj) { return "removeChangelog" in obj; }, get: function (obj) { return obj.removeChangelog; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LedgerAdminController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LedgerAdminController = _classThis;
}();
exports.LedgerAdminController = LedgerAdminController;
