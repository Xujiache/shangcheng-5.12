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
exports.AppReleaseController = void 0;
var common_1 = require("@nestjs/common");
var platform_express_1 = require("@nestjs/platform-express");
var swagger_1 = require("@nestjs/swagger");
var roles_decorator_1 = require("../../common/decorators/roles.decorator");
var roles_guard_1 = require("../../common/guards/roles.guard");
var public_decorator_1 = require("../../common/decorators/public.decorator");
var AppReleaseController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('APP 发布'), (0, common_1.Controller)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _create_decorators;
    var _list_decorators;
    var _remove_decorators;
    var _merchantLatest_decorators;
    var AppReleaseController = _classThis = /** @class */ (function () {
        function AppReleaseController_1(svc) {
            this.svc = (__runInitializers(this, _instanceExtraInitializers), svc);
        }
        // ===== 平台管理（仅 super-admin / admin / platform）=====
        AppReleaseController_1.prototype.create = function (file, body, user) {
            return this.svc.create(file, {
                platform: body.platform,
                version: body.version,
                versionCode: Number(body.versionCode),
                changelog: body.changelog,
                force: body.force === true || body.force === 'true',
                storeUrl: body.storeUrl,
            }, user === null || user === void 0 ? void 0 : user.sub);
        };
        AppReleaseController_1.prototype.list = function (platform) {
            return this.svc.list(platform);
        };
        AppReleaseController_1.prototype.remove = function (id, user) {
            return this.svc.remove(id, user ? { userId: user.sub, role: user.role } : null);
        };
        // ===== 端上公开（启动时检查更新）=====
        AppReleaseController_1.prototype.merchantLatest = function (platform) {
            return this.svc.latest(platform || 'merchant');
        };
        return AppReleaseController_1;
    }());
    __setFunctionName(_classThis, "AppReleaseController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _create_decorators = [(0, common_1.UseGuards)(roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)('admin', 'platform', 'super-admin'), (0, common_1.Post)('p/app-releases'), (0, swagger_1.ApiConsumes)('multipart/form-data'), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file'))];
        _list_decorators = [(0, common_1.UseGuards)(roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)('admin', 'platform', 'super-admin'), (0, common_1.Get)('p/app-releases')];
        _remove_decorators = [(0, common_1.UseGuards)(roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)('admin', 'platform', 'super-admin'), (0, common_1.Delete)('p/app-releases/:id')];
        _merchantLatest_decorators = [(0, public_decorator_1.Public)(), (0, common_1.Get)('m/app/latest'), (0, common_1.Header)('Cache-Control', 'no-store, no-cache, must-revalidate')];
        __esDecorate(_classThis, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: function (obj) { return "create" in obj; }, get: function (obj) { return obj.create; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _list_decorators, { kind: "method", name: "list", static: false, private: false, access: { has: function (obj) { return "list" in obj; }, get: function (obj) { return obj.list; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _remove_decorators, { kind: "method", name: "remove", static: false, private: false, access: { has: function (obj) { return "remove" in obj; }, get: function (obj) { return obj.remove; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _merchantLatest_decorators, { kind: "method", name: "merchantLatest", static: false, private: false, access: { has: function (obj) { return "merchantLatest" in obj; }, get: function (obj) { return obj.merchantLatest; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AppReleaseController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AppReleaseController = _classThis;
}();
exports.AppReleaseController = AppReleaseController;
