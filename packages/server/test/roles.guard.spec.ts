import { describe, it } from '@jest/globals'

// ----------------------------------------------------------------------------
// RolesGuard — 角色权限拦截器
//
// 实现位置：packages/server/src/common/guards/roles.guard.ts
//
// 关键点（与现有 expandRole() 实现对齐）：
//   - 'super-admin' 是顶级别名，自动展开为 [merchant, platform, admin, factory, store]
//   - 'factory' / 'store' 自动展开为 [merchant]
//   - 'admin' 自动展开为 [platform]
//   - 无角色 / role 不在 required 列表 → 抛 BizException(FORBIDDEN)
//   - req.user 缺失 → 抛 BizException(UNAUTHORIZED)
//
// 占位骨架 — 等 Reflector + ExecutionContext mock helper 就绪后转正。
// ----------------------------------------------------------------------------
describe.skip('RolesGuard.canActivate', () => {
  it.todo('passes when no @Roles() decorator present (required is empty)')

  it.todo('throws UNAUTHORIZED when req.user is missing')
})

describe.skip('RolesGuard — super-admin alias expansion', () => {
  it.todo('super-admin satisfies @Roles("merchant")')

  it.todo('super-admin satisfies @Roles("platform")')

  it.todo('super-admin satisfies @Roles("admin")')

  it.todo('super-admin satisfies @Roles("factory") / @Roles("store")')
})

describe.skip('RolesGuard — sub-role alias expansion', () => {
  it.todo('factory satisfies @Roles("merchant") (auto-expansion)')

  it.todo('store satisfies @Roles("merchant") (auto-expansion)')

  it.todo('admin satisfies @Roles("platform") (auto-expansion)')
})

describe.skip('RolesGuard — denial cases', () => {
  it.todo('merchant role denied when @Roles("platform") required')

  it.todo('plain user role denied when @Roles("admin") required')

  it.todo('factory role denied when @Roles("admin") required (alias does NOT cross domains)')
})
