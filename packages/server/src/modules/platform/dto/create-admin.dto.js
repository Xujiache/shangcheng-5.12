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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAdminDto = void 0;
var class_validator_1 = require("class-validator");
/**
 * 平台管理员创建 DTO —— 字段白名单
 *
 * 背景：全局 ValidationPipe 配置为 `{ whitelist: true, transform: true }`，
 * 任何「未在 DTO 上声明的字段」都会被静默剥离（forbidNonWhitelisted:false，不报 400）。
 * 因此本 DTO 必须显式声明 service.createAdmin() 按名读取的每一个字段，
 * 否则该字段会被剥离成 undefined，造成静默数据丢失。
 *
 * service.createAdmin() 按名读取：
 *   dto.password / dto.username / dto.email / dto.nickname / dto.role / dto.roleId / dto.avatar
 * （无 spread，逐字段读取 —— 适合上白名单 DTO）
 *
 * 安全约束：
 *   - password 必填且 ≥ 8 位（service 同样会校验并抛错，这里做入口防御）
 *   - username 必填（service 会抛错）
 *   - role 仅允许 admin / platform / super-admin（super-admin 的越权校验在 service 内基于 callerRole）
 */
var CreateAdminDto = function () {
    var _a;
    var _username_decorators;
    var _username_initializers = [];
    var _username_extraInitializers = [];
    var _password_decorators;
    var _password_initializers = [];
    var _password_extraInitializers = [];
    var _email_decorators;
    var _email_initializers = [];
    var _email_extraInitializers = [];
    var _nickname_decorators;
    var _nickname_initializers = [];
    var _nickname_extraInitializers = [];
    var _role_decorators;
    var _role_initializers = [];
    var _role_extraInitializers = [];
    var _roleId_decorators;
    var _roleId_initializers = [];
    var _roleId_extraInitializers = [];
    var _avatar_decorators;
    var _avatar_initializers = [];
    var _avatar_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateAdminDto() {
                this.username = __runInitializers(this, _username_initializers, void 0);
                // service 要求 password.trim() 非空且长度 ≥ 8，这里同步约束
                this.password = (__runInitializers(this, _username_extraInitializers), __runInitializers(this, _password_initializers, void 0));
                this.email = (__runInitializers(this, _password_extraInitializers), __runInitializers(this, _email_initializers, void 0));
                this.nickname = (__runInitializers(this, _email_extraInitializers), __runInitializers(this, _nickname_initializers, void 0));
                // 注意：不能用 @IsIn(['admin','platform','super-admin']) 强枚举 ——
                // admin-pc 权限页（views/platform/permission/index.vue）历史上把 /p/roles 的
                // 角色「显示名」（客服/审核员/财务/平台运营/超级管理员）直接当 role 发上来。
                // service.createAdmin() 自己会把不在 ALLOWED_NORMAL_ROLES 的值兜底成 'platform'，
                // 且 super-admin 提权有 callerRole 守卫，这里强枚举只会把原本可用的创建流程打成 400。
                this.role = (__runInitializers(this, _nickname_extraInitializers), __runInitializers(this, _role_initializers, void 0));
                // 关联 adminRoleId（service: data.adminRoleId = dto.roleId）
                this.roleId = (__runInitializers(this, _role_extraInitializers), __runInitializers(this, _roleId_initializers, void 0));
                this.avatar = (__runInitializers(this, _roleId_extraInitializers), __runInitializers(this, _avatar_initializers, void 0));
                __runInitializers(this, _avatar_extraInitializers);
            }
            return CreateAdminDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _username_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(64)];
            _password_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MinLength)(8), (0, class_validator_1.MaxLength)(128)];
            _email_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(128)];
            _nickname_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(64)];
            _role_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(64)];
            _roleId_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(64)];
            _avatar_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(512)];
            __esDecorate(null, null, _username_decorators, { kind: "field", name: "username", static: false, private: false, access: { has: function (obj) { return "username" in obj; }, get: function (obj) { return obj.username; }, set: function (obj, value) { obj.username = value; } }, metadata: _metadata }, _username_initializers, _username_extraInitializers);
            __esDecorate(null, null, _password_decorators, { kind: "field", name: "password", static: false, private: false, access: { has: function (obj) { return "password" in obj; }, get: function (obj) { return obj.password; }, set: function (obj, value) { obj.password = value; } }, metadata: _metadata }, _password_initializers, _password_extraInitializers);
            __esDecorate(null, null, _email_decorators, { kind: "field", name: "email", static: false, private: false, access: { has: function (obj) { return "email" in obj; }, get: function (obj) { return obj.email; }, set: function (obj, value) { obj.email = value; } }, metadata: _metadata }, _email_initializers, _email_extraInitializers);
            __esDecorate(null, null, _nickname_decorators, { kind: "field", name: "nickname", static: false, private: false, access: { has: function (obj) { return "nickname" in obj; }, get: function (obj) { return obj.nickname; }, set: function (obj, value) { obj.nickname = value; } }, metadata: _metadata }, _nickname_initializers, _nickname_extraInitializers);
            __esDecorate(null, null, _role_decorators, { kind: "field", name: "role", static: false, private: false, access: { has: function (obj) { return "role" in obj; }, get: function (obj) { return obj.role; }, set: function (obj, value) { obj.role = value; } }, metadata: _metadata }, _role_initializers, _role_extraInitializers);
            __esDecorate(null, null, _roleId_decorators, { kind: "field", name: "roleId", static: false, private: false, access: { has: function (obj) { return "roleId" in obj; }, get: function (obj) { return obj.roleId; }, set: function (obj, value) { obj.roleId = value; } }, metadata: _metadata }, _roleId_initializers, _roleId_extraInitializers);
            __esDecorate(null, null, _avatar_decorators, { kind: "field", name: "avatar", static: false, private: false, access: { has: function (obj) { return "avatar" in obj; }, get: function (obj) { return obj.avatar; }, set: function (obj, value) { obj.avatar = value; } }, metadata: _metadata }, _avatar_initializers, _avatar_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateAdminDto = CreateAdminDto;
