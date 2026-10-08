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
exports.AdminPcCompatController = void 0;
var common_1 = require("@nestjs/common");
var swagger_1 = require("@nestjs/swagger");
var public_decorator_1 = require("../../common/decorators/public.decorator");
var roles_decorator_1 = require("../../common/decorators/roles.decorator");
var roles_guard_1 = require("../../common/guards/roles.guard");
/**
 * admin-pc 旧路径兼容层（不含 /api/v1 前缀的全局映射在 main.ts 里做）
 * 这里挂在 /api/v1 下，但 admin-pc 的 service 中部分还在用旧路径。
 * 为保证零改前端：
 *   - /api/auth/login → /api/v1/admin-pc/login（实际路径，main 里加路由别名）
 *   - /api/user/info → /api/v1/admin-pc/user-info
 *   - /api/user/list → /api/v1/admin-pc/users
 *   - /api/role/list → /api/v1/admin-pc/roles
 *   - /api/v3/system/menus → /api/v1/admin-pc/menus
 * main.ts 中再 setGlobalPrefix 例外，让旧路径无 prefix 也能命中
 *
 * 权限：类级别挂 RolesGuard；@Roles 在方法级精细控制
 *   - login 用 @Public 跳过 JWT
 *   - user-info / menus 不限角色（任意已登录账号都能取自己的信息 / 菜单）
 *   - users / roles 列表必须是 platform / super-admin（与 PlatformController 一致），
 *     避免普通商家拿到全部管理员清单
 */
var AdminPcCompatController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('admin-pc 兼容'), (0, common_1.UseGuards)(roles_guard_1.RolesGuard), (0, common_1.Controller)('admin-pc')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _login_decorators;
    var _userInfo_decorators;
    var _users_decorators;
    var _roles_decorators;
    var _menus_decorators;
    var AdminPcCompatController = _classThis = /** @class */ (function () {
        function AdminPcCompatController_1(authService, platformService) {
            this.authService = (__runInitializers(this, _instanceExtraInitializers), authService);
            this.platformService = platformService;
        }
        AdminPcCompatController_1.prototype.login = function (dto) {
            return this.authService.adminLogin(dto);
        };
        // 兼容路径上的 user-info：admin-pc 启动并发查会撞 sms 桶；跳过严桶仅走 default
        AdminPcCompatController_1.prototype.userInfo = function (user) {
            return this.authService.userInfo(user.sub);
        };
        /**
         * admin-pc 旧版用户列表（路径：/api/admin-pc/users）
         *
         * 委托 PlatformService.admins 完成查询和分页，避免该 controller 直连 Prisma 散漏鉴权
         * 与分页规则；输出再适配 admin-pc 旧字段名 records / current / size / userId / userName。
         */
        AdminPcCompatController_1.prototype.users = function () {
            return __awaiter(this, arguments, void 0, function (current, size, keyword) {
                var page, pageSize, data;
                if (current === void 0) { current = '1'; }
                if (size === void 0) { size = '20'; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            page = Math.max(1, Number(current) || 1);
                            pageSize = Math.min(100, Math.max(1, Number(size) || 20));
                            return [4 /*yield*/, this.platformService.admins({ page: page, pageSize: pageSize, keyword: keyword })];
                        case 1:
                            data = _a.sent();
                            return [2 /*return*/, {
                                    records: data.list.map(function (u) { return ({
                                        userId: u.id,
                                        userName: u.username,
                                        nickName: u.nickname,
                                        email: u.email,
                                        avatar: u.avatar,
                                        status: u.status,
                                        roles: [u.role],
                                        roleName: u.roleName,
                                        lastLoginAt: u.lastLoginAt,
                                    }); }),
                                    total: data.total,
                                    current: data.page,
                                    size: data.pageSize,
                                }];
                    }
                });
            });
        };
        /**
         * admin-pc 旧版角色列表（路径：/api/admin-pc/roles）
         *
         * 委托 PlatformService.roles 拉数据，对外仍返回 admin-pc 旧字段（roleId/roleCode/roleName...）。
         */
        AdminPcCompatController_1.prototype.roles = function () {
            return __awaiter(this, arguments, void 0, function (current, size, keyword) {
                var page, pageSize, data;
                if (current === void 0) { current = '1'; }
                if (size === void 0) { size = '50'; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            page = Math.max(1, Number(current) || 1);
                            pageSize = Math.min(100, Math.max(1, Number(size) || 50));
                            return [4 /*yield*/, this.platformService.roles({ page: page, pageSize: pageSize, keyword: keyword })];
                        case 1:
                            data = _a.sent();
                            return [2 /*return*/, {
                                    records: data.list.map(function (r) { return ({
                                        roleId: r.id,
                                        roleCode: r.code,
                                        roleName: r.name,
                                        description: r.description,
                                        permissions: r.permissions,
                                        isSystem: r.isSystem,
                                        memberCount: r.memberCount,
                                    }); }),
                                    total: data.total,
                                    current: data.page,
                                    size: data.pageSize,
                                }];
                    }
                });
            });
        };
        AdminPcCompatController_1.prototype.menus = function (user) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    // 这是给 admin-pc 的动态菜单接口。考虑到 admin-pc 当前 router/modules 已经定义了完整菜单
                    // 这里返回空数组，让前端走静态菜单 + MenuProcessor 角色过滤
                    // 真正的角色权限菜单未来按需扩展
                    return [2 /*return*/, []];
                });
            });
        };
        return AdminPcCompatController_1;
    }());
    __setFunctionName(_classThis, "AdminPcCompatController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _login_decorators = [(0, public_decorator_1.Public)(), (0, common_1.Post)('login')];
        _userInfo_decorators = [(0, common_1.Get)('user-info')];
        _users_decorators = [(0, roles_decorator_1.Roles)('platform', 'super-admin'), (0, common_1.Get)('users')];
        _roles_decorators = [(0, roles_decorator_1.Roles)('platform', 'super-admin'), (0, common_1.Get)('roles')];
        _menus_decorators = [(0, common_1.Get)('menus')];
        __esDecorate(_classThis, null, _login_decorators, { kind: "method", name: "login", static: false, private: false, access: { has: function (obj) { return "login" in obj; }, get: function (obj) { return obj.login; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _userInfo_decorators, { kind: "method", name: "userInfo", static: false, private: false, access: { has: function (obj) { return "userInfo" in obj; }, get: function (obj) { return obj.userInfo; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _users_decorators, { kind: "method", name: "users", static: false, private: false, access: { has: function (obj) { return "users" in obj; }, get: function (obj) { return obj.users; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _roles_decorators, { kind: "method", name: "roles", static: false, private: false, access: { has: function (obj) { return "roles" in obj; }, get: function (obj) { return obj.roles; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _menus_decorators, { kind: "method", name: "menus", static: false, private: false, access: { has: function (obj) { return "menus" in obj; }, get: function (obj) { return obj.menus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AdminPcCompatController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AdminPcCompatController = _classThis;
}();
exports.AdminPcCompatController = AdminPcCompatController;
