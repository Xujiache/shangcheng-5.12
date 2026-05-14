import { describe, it } from '@jest/globals'

// ----------------------------------------------------------------------------
// PaymentController.notify — 微信支付回调入口
//
// 实现位置：packages/server/src/modules/payment/payment.controller.ts
// 关键点：
//   - 必须在 verify 失败时返回顶层 {code:'FAIL'}（不能包 success: false 在 200 里）
//   - 必须对同一 transactionId 幂等：第二次回调不再二次入账 / 二次发券
//   - handler 内部抛异常时，外层 try/catch 也要返回 {code:'FAIL'}，否则微信会一直重推
//
// 这里只放占位骨架，等 fake-wxpay signer + Prisma mock 就绪后转正。
// ----------------------------------------------------------------------------
describe.skip('PaymentController.notify (wechat callback)', () => {
  it.todo('returns {code:"SUCCESS"} on valid signature + valid resource')

  it.todo('returns {code:"FAIL"} on invalid signature (wxpay verify rejects)')

  it.todo(
    'is idempotent for same transactionId — second call must NOT credit twice (no duplicate Payment row, no duplicate order state transition)',
  )

  it.todo(
    'returns top-level {code:"FAIL"} when handler throws (NOT wrapped in {code:"SUCCESS", data:{error:...}}) — otherwise wxpay stops retrying',
  )
})
