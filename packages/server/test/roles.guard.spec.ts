import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { RolesGuard } from '../src/common/guards/roles.guard'

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
function makeContext(user: any): any {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }
}

describe('RolesGuard.canActivate', () => {
  let reflector: { getAllAndOverride: jest.Mock }
  let guard: RolesGuard

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() }
    guard = new RolesGuard(reflector as any)
  })

  describe('无 @Roles() 装饰器时放行', () => {
    it('required 为 undefined（未声明角色）时直接放行', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined)
      expect(guard.canActivate(makeContext(undefined))).toBe(true)
    })

    it('required 为空数组时直接放行', () => {
      reflector.getAllAndOverride.mockReturnValue([])
      expect(guard.canActivate(makeContext(undefined))).toBe(true)
    })
  })

  describe('未登录场景', () => {
    it('req.user 缺失时抛 UNAUTHORIZED(2001)', () => {
      reflector.getAllAndOverride.mockReturnValue(['merchant'])
      try {
        guard.canActivate(makeContext(undefined))
        throw new Error('should have thrown')
      } catch (e: any) {
        expect(e.getResponse().code).toBe(2001)
      }
    })
  })

  describe('super-admin 顶级别名展开', () => {
    it('super-admin 满足 @Roles("merchant")', () => {
      reflector.getAllAndOverride.mockReturnValue(['merchant'])
      expect(guard.canActivate(makeContext({ role: 'super-admin' }))).toBe(true)
    })

    it('super-admin 满足 @Roles("platform")', () => {
      reflector.getAllAndOverride.mockReturnValue(['platform'])
      expect(guard.canActivate(makeContext({ role: 'super-admin' }))).toBe(true)
    })

    it('super-admin 满足 @Roles("admin")', () => {
      reflector.getAllAndOverride.mockReturnValue(['admin'])
      expect(guard.canActivate(makeContext({ role: 'super-admin' }))).toBe(true)
    })

    it('super-admin 满足 @Roles("factory")', () => {
      reflector.getAllAndOverride.mockReturnValue(['factory'])
      expect(guard.canActivate(makeContext({ role: 'super-admin' }))).toBe(true)
    })

    it('super-admin 满足 @Roles("store")', () => {
      reflector.getAllAndOverride.mockReturnValue(['store'])
      expect(guard.canActivate(makeContext({ role: 'super-admin' }))).toBe(true)
    })
  })

  describe('子角色别名展开', () => {
    it('factory 满足 @Roles("merchant")（自动展开）', () => {
      reflector.getAllAndOverride.mockReturnValue(['merchant'])
      expect(guard.canActivate(makeContext({ role: 'factory' }))).toBe(true)
    })

    it('store 满足 @Roles("merchant")（自动展开）', () => {
      reflector.getAllAndOverride.mockReturnValue(['merchant'])
      expect(guard.canActivate(makeContext({ role: 'store' }))).toBe(true)
    })

    it('admin 满足 @Roles("platform")（自动展开）', () => {
      reflector.getAllAndOverride.mockReturnValue(['platform'])
      expect(guard.canActivate(makeContext({ role: 'admin' }))).toBe(true)
    })
  })

  describe('拒绝场景', () => {
    it('merchant 在要求 @Roles("platform") 时被拒（FORBIDDEN=2003）', () => {
      reflector.getAllAndOverride.mockReturnValue(['platform'])
      try {
        guard.canActivate(makeContext({ role: 'merchant' }))
        throw new Error('should have thrown')
      } catch (e: any) {
        expect(e.getResponse().code).toBe(2003)
      }
    })

    it('普通 customer 在要求 @Roles("admin") 时被拒（FORBIDDEN=2003）', () => {
      reflector.getAllAndOverride.mockReturnValue(['admin'])
      try {
        guard.canActivate(makeContext({ role: 'customer' }))
        throw new Error('should have thrown')
      } catch (e: any) {
        expect(e.getResponse().code).toBe(2003)
      }
    })

    it('factory 在要求 @Roles("admin") 时被拒（别名不跨域）', () => {
      reflector.getAllAndOverride.mockReturnValue(['admin'])
      try {
        guard.canActivate(makeContext({ role: 'factory' }))
        throw new Error('should have thrown')
      } catch (e: any) {
        expect(e.getResponse().code).toBe(2003)
      }
    })
  })
})
