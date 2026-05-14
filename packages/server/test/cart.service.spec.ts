import { describe, it } from '@jest/globals'

// ----------------------------------------------------------------------------
// Cart 业务 — 购物车增删查
//
// 实现位置（当前架构）：
//   packages/server/src/modules/user-mp/user-mp.service.ts  ← cart-* 系列方法
//   packages/server/src/modules/user-mp/user-mp.controller.ts
//   （未来如果拆出独立 CartService，此 spec 文件同时迁移到 modules/cart/）
//
// 关键点：
//   - list：只能看到自己 userId 的 CartItem，按 createdAt desc
//   - add：同 (userId + skuId) 已存在则累加 qty，不创建重复行（唯一约束防御）
//   - 越权：所有写操作必须按 userId 过滤；试图操作他人 cartItem.id 应返回 NOT_FOUND（不是 FORBIDDEN，避免泄露 id 存在）
//
// 占位骨架 — 等 Prisma mock + 当前 user 注入 helper 就绪后转正。
// ----------------------------------------------------------------------------
describe.skip('CartService.list', () => {
  it.todo("returns ONLY current user's CartItem rows (filtered by userId)")

  it.todo('orders by createdAt DESC (newest first)')

  it.todo('includes related Sku + Product snapshot fields needed by cart UI')

  it.todo('returns empty array (not null/undefined) when user has no cart items')
})

describe.skip('CartService.add', () => {
  it.todo('creates a new CartItem when (userId, skuId) does not exist')

  it.todo('increments qty when (userId, skuId) already exists — does NOT create duplicate row')

  it.todo('rejects when skuId does not exist (NOT_FOUND)')

  it.todo('rejects when qty <= 0 (BAD_REQUEST)')

  it.todo('rejects when sku stock < requested qty (BIZ_RULE)')
})

describe.skip('CartService — cross-user authorization', () => {
  it.todo("remove(otherUserItemId) returns NOT_FOUND (does NOT mutate other user's row)")

  it.todo('update(otherUserItemId, qty) returns NOT_FOUND')

  it.todo("list() never leaks another user's items even when given a forged userId in body")
})
