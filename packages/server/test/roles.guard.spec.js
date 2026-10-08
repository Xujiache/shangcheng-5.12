"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var globals_1 = require("@jest/globals");
var roles_guard_1 = require("../src/common/guards/roles.guard");
// ----------------------------------------------------------------------------
// RolesGuard — 角色权限拦截器
//
// 实现位置：packages/server/src/common/guards/roles.guard.ts
//
// 关键点（与现有 expandRole() 实现对齐）：
//   - 'super-admin' 是顶级别名，自动展开为 [merchant, platform, admin, factory, store]
//   - 'factory' / 'store' 自动展开为 [merchant]
//   - 'admin' 自动展开为 [platform]
//   - role 不在 required 列表 → 抛 BizException(FORBIDDEN=2003)
//   - req.user 缺失 → 抛 BizException(UNAUTHORIZED=2001)
// ----------------------------------------------------------------------------
/** 构造 ExecutionContext mock：注入指定 user（可为 undefined） */
function makeContext(user) {
    return {
        getHandler: function () { return ({}); },
        getClass: function () { return ({}); },
        switchToHttp: function () { return ({ getRequest: function () { return ({ user: user }); } }); },
    };
}
(0, globals_1.describe)('RolesGuard.canActivate', function () {
    var reflector;
    var guard;
    (0, globals_1.beforeEach)(function () {
        reflector = { getAllAndOverride: globals_1.jest.fn() };
        guard = new roles_guard_1.RolesGuard(reflector);
    });
    (0, globals_1.describe)('无 @Roles() 装饰器时放行', function () {
        (0, globals_1.it)('required 为 undefined（未声明角色）时直接放行', function () {
            reflector.getAllAndOverride.mockReturnValue(undefined);
            (0, globals_1.expect)(guard.canActivate(makeContext(undefined))).toBe(true);
        });
        (0, globals_1.it)('required 为空数组时直接放行', function () {
            reflector.getAllAndOverride.mockReturnValue([]);
            (0, globals_1.expect)(guard.canActivate(makeContext(undefined))).toBe(true);
        });
    });
    (0, globals_1.describe)('未登录场景', function () {
        (0, globals_1.it)('req.user 缺失时抛 UNAUTHORIZED(2001)', function () {
            reflector.getAllAndOverride.mockReturnValue(['merchant']);
            try {
                guard.canActivate(makeContext(undefined));
                throw new Error('should have thrown');
            }
            catch (e) {
                (0, globals_1.expect)(e.getResponse().code).toBe(2001);
            }
        });
    });
    (0, globals_1.describe)('super-admin 顶级别名展开', function () {
        (0, globals_1.it)('super-admin 满足 @Roles("merchant")', function () {
            reflector.getAllAndOverride.mockReturnValue(['merchant']);
            (0, globals_1.expect)(guard.canActivate(makeContext({ role: 'super-admin' }))).toBe(true);
        });
        (0, globals_1.it)('super-admin 满足 @Roles("platform")', function () {
            reflector.getAllAndOverride.mockReturnValue(['platform']);
            (0, globals_1.expect)(guard.canActivate(makeContext({ role: 'super-admin' }))).toBe(true);
        });
        (0, globals_1.it)('super-admin 满足 @Roles("admin")', function () {
            reflector.getAllAndOverride.mockReturnValue(['admin']);
            (0, globals_1.expect)(guard.canActivate(makeContext({ role: 'super-admin' }))).toBe(true);
        });
        (0, globals_1.it)('super-admin 满足 @Roles("factory")', function () {
            reflector.getAllAndOverride.mockReturnValue(['factory']);
            (0, globals_1.expect)(guard.canActivate(makeContext({ role: 'super-admin' }))).toBe(true);
        });
        (0, globals_1.it)('super-admin 满足 @Roles("store")', function () {
            reflector.getAllAndOverride.mockReturnValue(['store']);
            (0, globals_1.expect)(guard.canActivate(makeContext({ role: 'super-admin' }))).toBe(true);
        });
    });
    (0, globals_1.describe)('子角色别名展开', function () {
        (0, globals_1.it)('factory 满足 @Roles("merchant")（自动展开）', function () {
            reflector.getAllAndOverride.mockReturnValue(['merchant']);
            (0, globals_1.expect)(guard.canActivate(makeContext({ role: 'factory' }))).toBe(true);
        });
        (0, globals_1.it)('store 满足 @Roles("merchant")（自动展开）', function () {
            reflector.getAllAndOverride.mockReturnValue(['merchant']);
            (0, globals_1.expect)(guard.canActivate(makeContext({ role: 'store' }))).toBe(true);
        });
        (0, globals_1.it)('admin 满足 @Roles("platform")（自动展开）', function () {
            reflector.getAllAndOverride.mockReturnValue(['platform']);
            (0, globals_1.expect)(guard.canActivate(makeContext({ role: 'admin' }))).toBe(true);
        });
    });
    (0, globals_1.describe)('拒绝场景', function () {
        (0, globals_1.it)('merchant 在要求 @Roles("platform") 时被拒（FORBIDDEN=2003）', function () {
            reflector.getAllAndOverride.mockReturnValue(['platform']);
            try {
                guard.canActivate(makeContext({ role: 'merchant' }));
                throw new Error('should have thrown');
            }
            catch (e) {
                (0, globals_1.expect)(e.getResponse().code).toBe(2003);
            }
        });
        (0, globals_1.it)('普通 customer 在要求 @Roles("admin") 时被拒（FORBIDDEN=2003）', function () {
            reflector.getAllAndOverride.mockReturnValue(['admin']);
            try {
                guard.canActivate(makeContext({ role: 'customer' }));
                throw new Error('should have thrown');
            }
            catch (e) {
                (0, globals_1.expect)(e.getResponse().code).toBe(2003);
            }
        });
        (0, globals_1.it)('factory 在要求 @Roles("admin") 时被拒（别名不跨域）', function () {
            reflector.getAllAndOverride.mockReturnValue(['admin']);
            try {
                guard.canActivate(makeContext({ role: 'factory' }));
                throw new Error('should have thrown');
            }
            catch (e) {
                (0, globals_1.expect)(e.getResponse().code).toBe(2003);
            }
        });
    });
});
