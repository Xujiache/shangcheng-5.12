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
exports.AuthController = void 0;
var common_1 = require("@nestjs/common");
var swagger_1 = require("@nestjs/swagger");
var throttler_1 = require("@nestjs/throttler");
var public_decorator_1 = require("../../common/decorators/public.decorator");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
/**
 * 注销请求体：可选 refreshToken。
 * - 若客户端持有未过期的 refreshToken，强烈建议带上以触发真正的吊销。
 * - 未带 refreshToken 时仍允许调用（兼容旧客户端），但只能清服务器内 user 缓存，
 *   旧 refreshToken 在过期前仍可用（前端务必清掉本地存储）。
 */
var LogoutDto = /** @class */ (function () {
    function LogoutDto() {
    }
    return LogoutDto;
}());
var AuthController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('认证'), (0, common_1.Controller)('auth')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _wechatLogin_decorators;
    var _phoneLogin_decorators;
    var _merchantPasswordLogin_decorators;
    var _merchantSmsLogin_decorators;
    var _sendSmsCode_decorators;
    var _adminLogin_decorators;
    var _refresh_decorators;
    var _logout_decorators;
    var _userInfo_decorators;
    var _changePassword_decorators;
    var _changePhone_decorators;
    var _menus_decorators;
    var AuthController = _classThis = /** @class */ (function () {
        function AuthController_1(authService) {
            this.authService = (__runInitializers(this, _instanceExtraInitializers), authService);
        }
        // wechat-login 走宽松桶（60/min/IP）：wx.login 的 code 是微信下发的一次性凭证，
        // 服务端拿它去微信换 openid，攻击者无法靠枚举伪造（没有「字典/爆破价值」）；
        // 且小程序冷启动会自动登录，属高频正常流量，60/min 是有意为之，不能收紧到 10。
        AuthController_1.prototype.wechatLogin = function (dto) {
            return this.authService.wechatLogin(dto);
        };
        // P1-25：手机号+短信验证码登录走 'auth' 桶（10/min/IP），收窄短信验证码爆破面
        AuthController_1.prototype.phoneLogin = function (dto) {
            return this.authService.phoneLogin(dto);
        };
        /** 商家 APP 专用：只接受手机号 + 密码，不接受用户名或邮箱。 */
        AuthController_1.prototype.merchantPasswordLogin = function (dto) {
            return this.authService.merchantPasswordLogin(dto);
        };
        /** 商家 APP 专用：短信只登录已有用户，绝不静默创建账号。 */
        AuthController_1.prototype.merchantSmsLogin = function (dto) {
            return this.authService.merchantSmsLogin(dto);
        };
        // P1-25：发短信验证码走 'sms' 桶（3/min/IP），防短信轰炸
        AuthController_1.prototype.sendSmsCode = function (dto) {
            return this.authService.sendSmsCode(dto);
        };
        // P1-25：后台登录走 'auth' 桶（10/min/IP），防密码字典爆破（必须收紧）
        AuthController_1.prototype.adminLogin = function (dto) {
            return this.authService.adminLogin(dto);
        };
        // refresh 走宽松桶（60/min/IP）：必须携带有效 refreshToken 才能换发 access token，
        // 没有合法 refreshToken 一律拒绝，因此不存在「字典/爆破价值」，无需收紧到 10。
        AuthController_1.prototype.refresh = function (dto) {
            return this.authService.refresh(dto);
        };
        /**
         * 注销登录
         *
         * 真正的吊销逻辑（修复前是空 stub，token 仍可用，存在重大安全风险）：
         *   1. 若 body.refreshToken 解析出 jti → 加入 refresh-token-blacklist，
         *      剩余 TTL = refresh token 距离过期还有多少秒
         *   2. 清掉 JwtGuard 内的 user LRU 缓存，让该用户的 access token 下次访问立即重查 DB
         *      （如果管理员同时把用户禁用，能即时拦截）
         *
         * 注意 access token 本身无法主动作废（JWT 无状态），客户端必须在收到 {ok:true}
         * 后立刻删除本地 access token / refresh token。
         */
        // logout / user-info 不是爆破目标，跳过严格桶（auth/sms/payment-notify），只走 default(60/60s)
        // 否则 admin-pc 启动时并发拉 user-info > 3 次就被 sms 桶误杀
        // @Public：登出必须在 access token 已过期时也能成功（否则 guard 先抛 TOKEN_EXPIRED，
        // refresh token 永远无法被吊销）。callerSub 由 service 从 refreshToken 解析兜底。
        AuthController_1.prototype.logout = function (dto, user) {
            return this.authService.logout(dto === null || dto === void 0 ? void 0 : dto.refreshToken, user === null || user === void 0 ? void 0 : user.sub);
        };
        AuthController_1.prototype.userInfo = function (user) {
            return this.authService.userInfo(user.sub);
        };
        /**
         * 修改密码（任意已登录用户调）
         * body: { oldPassword, newPassword }
         * 新密码 ≥ 6 位；旧密码必须正确（未设过密码的纯微信用户可省略 oldPassword）
         */
        AuthController_1.prototype.changePassword = function (user, dto) {
            return this.authService.changePassword(user.sub, dto, user.amr, user.amrAt);
        };
        /**
         * 修改手机号（双码：原手机 + 新手机，分别发 /auth/sms-code 拿到）
         * body: { oldSmsCode?, newPhone, newSmsCode }
         * 当前账号没有手机号时（如微信登录用户首次绑），可省 oldSmsCode
         */
        AuthController_1.prototype.changePhone = function (user, dto) {
            return this.authService.changePhone(user.sub, dto);
        };
        /**
         * 动态菜单接口（修复 P1-23）
         *
         * 当前架构说明（重要！）：
         *   - admin-pc 客户端走「前端静态路由 + MenuProcessor 按角色过滤」的方案
         *     （`packages/admin-pc/src/router/modules/*.ts` + 前端 menu 模块）；
         *   - 后端没有 RoleMenu 模型，也没有 SystemConfig.menus 存储；
         *   - 因此当前不存在「后端可下发的动态菜单源」。
         *
         * 之前实现返回 `[]` 装作正常，会让前端误以为"配置成功只是没数据"，
         * 难以发现"后端根本没实现菜单"的真实情况（审查中被列为 P1-23）。
         *
         * 修复策略：
         *   1. 显式抛 501 Not Implemented + BizCode.BUSINESS_ERROR；
         *   2. 前端拦截器需识别 501 并 fallback 到静态路由（admin-pc 已有 MenuProcessor）；
         *   3. 后续若上线后端动态菜单：
         *      - 新增 Menu 模型 / SystemConfig 'menus' 配置；
         *      - 在 service 按 callerRole 过滤可见树；
         *      - 返回 [{ path, name, icon, children: [...] }] 结构。
         */
        AuthController_1.prototype.menus = function () {
            throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '动态菜单接口未实现：当前 admin-pc 走前端静态路由 + 角色过滤方案', common_1.HttpStatus.NOT_IMPLEMENTED);
        };
        return AuthController_1;
    }());
    __setFunctionName(_classThis, "AuthController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _wechatLogin_decorators = [(0, public_decorator_1.Public)(), (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60000 } }), (0, common_1.Post)('wechat-login')];
        _phoneLogin_decorators = [(0, public_decorator_1.Public)(), (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }), (0, common_1.Post)('phone-login')];
        _merchantPasswordLogin_decorators = [(0, public_decorator_1.Public)(), (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }), (0, common_1.Post)('merchant-password-login')];
        _merchantSmsLogin_decorators = [(0, public_decorator_1.Public)(), (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }), (0, common_1.Post)('merchant-sms-login')];
        _sendSmsCode_decorators = [(0, public_decorator_1.Public)(), (0, throttler_1.Throttle)({ default: { limit: 3, ttl: 60000 } }), (0, common_1.Post)('sms-code')];
        _adminLogin_decorators = [(0, public_decorator_1.Public)(), (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }), (0, common_1.Post)('admin-login')];
        _refresh_decorators = [(0, public_decorator_1.Public)(), (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60000 } }), (0, common_1.Post)('refresh')];
        _logout_decorators = [(0, public_decorator_1.Public)(), (0, common_1.Post)('logout')];
        _userInfo_decorators = [(0, common_1.Get)('user-info')];
        _changePassword_decorators = [(0, common_1.Post)('change-password')];
        _changePhone_decorators = [(0, common_1.Post)('change-phone')];
        _menus_decorators = [(0, common_1.Get)('menus')];
        __esDecorate(_classThis, null, _wechatLogin_decorators, { kind: "method", name: "wechatLogin", static: false, private: false, access: { has: function (obj) { return "wechatLogin" in obj; }, get: function (obj) { return obj.wechatLogin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _phoneLogin_decorators, { kind: "method", name: "phoneLogin", static: false, private: false, access: { has: function (obj) { return "phoneLogin" in obj; }, get: function (obj) { return obj.phoneLogin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _merchantPasswordLogin_decorators, { kind: "method", name: "merchantPasswordLogin", static: false, private: false, access: { has: function (obj) { return "merchantPasswordLogin" in obj; }, get: function (obj) { return obj.merchantPasswordLogin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _merchantSmsLogin_decorators, { kind: "method", name: "merchantSmsLogin", static: false, private: false, access: { has: function (obj) { return "merchantSmsLogin" in obj; }, get: function (obj) { return obj.merchantSmsLogin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _sendSmsCode_decorators, { kind: "method", name: "sendSmsCode", static: false, private: false, access: { has: function (obj) { return "sendSmsCode" in obj; }, get: function (obj) { return obj.sendSmsCode; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _adminLogin_decorators, { kind: "method", name: "adminLogin", static: false, private: false, access: { has: function (obj) { return "adminLogin" in obj; }, get: function (obj) { return obj.adminLogin; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _refresh_decorators, { kind: "method", name: "refresh", static: false, private: false, access: { has: function (obj) { return "refresh" in obj; }, get: function (obj) { return obj.refresh; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _logout_decorators, { kind: "method", name: "logout", static: false, private: false, access: { has: function (obj) { return "logout" in obj; }, get: function (obj) { return obj.logout; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _userInfo_decorators, { kind: "method", name: "userInfo", static: false, private: false, access: { has: function (obj) { return "userInfo" in obj; }, get: function (obj) { return obj.userInfo; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _changePassword_decorators, { kind: "method", name: "changePassword", static: false, private: false, access: { has: function (obj) { return "changePassword" in obj; }, get: function (obj) { return obj.changePassword; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _changePhone_decorators, { kind: "method", name: "changePhone", static: false, private: false, access: { has: function (obj) { return "changePhone" in obj; }, get: function (obj) { return obj.changePhone; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _menus_decorators, { kind: "method", name: "menus", static: false, private: false, access: { has: function (obj) { return "menus" in obj; }, get: function (obj) { return obj.menus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AuthController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AuthController = _classThis;
}();
exports.AuthController = AuthController;
