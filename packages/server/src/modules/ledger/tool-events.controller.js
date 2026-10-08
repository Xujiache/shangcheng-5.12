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
exports.LedgerToolAdminController = exports.ToolEventsController = void 0;
var common_1 = require("@nestjs/common");
var swagger_1 = require("@nestjs/swagger");
var throttler_1 = require("@nestjs/throttler");
var public_decorator_1 = require("../../common/decorators/public.decorator");
var roles_decorator_1 = require("../../common/decorators/roles.decorator");
var roles_guard_1 = require("../../common/guards/roles.guard");
var ledger_jwt_guard_1 = require("./guards/ledger-jwt.guard");
var ToolEventsController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('门窗利账-工具使用'), (0, public_decorator_1.Public)(), (0, common_1.UseGuards)(ledger_jwt_guard_1.LedgerJwtGuard), (0, common_1.Controller)('l/tools')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _submit_decorators;
    var ToolEventsController = _classThis = /** @class */ (function () {
        function ToolEventsController_1(events) {
            this.events = (__runInitializers(this, _instanceExtraInitializers), events);
        }
        ToolEventsController_1.prototype.submit = function (user, body) {
            return this.events.submit(user.id, body);
        };
        return ToolEventsController_1;
    }());
    __setFunctionName(_classThis, "ToolEventsController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _submit_decorators = [(0, common_1.Post)('events'), (0, common_1.HttpCode)(200), (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60000 } })];
        __esDecorate(_classThis, null, _submit_decorators, { kind: "method", name: "submit", static: false, private: false, access: { has: function (obj) { return "submit" in obj; }, get: function (obj) { return obj.submit; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ToolEventsController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ToolEventsController = _classThis;
}();
exports.ToolEventsController = ToolEventsController;
var LedgerToolAdminController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('门窗利账-后台'), (0, common_1.UseGuards)(roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)('platform', 'super-admin'), (0, common_1.Controller)('p/ledger/users/:id/tools')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _summary_decorators;
    var _timeline_decorators;
    var LedgerToolAdminController = _classThis = /** @class */ (function () {
        function LedgerToolAdminController_1(events) {
            this.events = (__runInitializers(this, _instanceExtraInitializers), events);
        }
        LedgerToolAdminController_1.prototype.summary = function (id) {
            return this.events.summary(id);
        };
        LedgerToolAdminController_1.prototype.timeline = function (id, query) {
            return this.events.timeline(id, query);
        };
        return LedgerToolAdminController_1;
    }());
    __setFunctionName(_classThis, "LedgerToolAdminController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _summary_decorators = [(0, common_1.Get)('summary')];
        _timeline_decorators = [(0, common_1.Get)('events')];
        __esDecorate(_classThis, null, _summary_decorators, { kind: "method", name: "summary", static: false, private: false, access: { has: function (obj) { return "summary" in obj; }, get: function (obj) { return obj.summary; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _timeline_decorators, { kind: "method", name: "timeline", static: false, private: false, access: { has: function (obj) { return "timeline" in obj; }, get: function (obj) { return obj.timeline; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LedgerToolAdminController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LedgerToolAdminController = _classThis;
}();
exports.LedgerToolAdminController = LedgerToolAdminController;
