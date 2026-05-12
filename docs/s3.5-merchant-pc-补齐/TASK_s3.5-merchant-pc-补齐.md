# TASK · S3.5 商家 PC 补齐

## 依赖图

```
T0 api 层追加 → T1 路由 + i18n → [T2 stats, T3 plaza, T4 store, T5 staff, T6 decorate, T7 chat, T8 commission, T9 withdraw, T10 member] → T11 联调验收
```

T2-T10 之间无相互依赖，理论可并行。

## 原子任务

| # | 屏 | 文件 | 估时 |
|---|---|---|---|
| T0 | api 追加 | `api/merchant-business.ts` 加 ~12 个接口 | 8 min |
| T1 | 路由 + i18n | `router/modules/merchant.ts` 加 9 条；zh/en.json 加 18 key | 5 min |
| T2 | stats 数据中心 | `views/merchant/stats/index.vue` | 10 min |
| T3 | plaza 选品广场 | `views/merchant/plaza/index.vue`（含 FactoryDrawer 内联） | 14 min |
| T4 | store 门店 | `views/merchant/store/index.vue` | 10 min |
| T5 | staff 员工 | `views/merchant/staff/index.vue` | 10 min |
| T6 | decorate 店铺装修 | `views/merchant/decorate/index.vue` | 14 min |
| T7 | chat 在线客服 | `views/merchant/chat/index.vue` | 14 min |
| T8 | commission 佣金 | `views/merchant/commission/index.vue` | 8 min |
| T9 | withdraw 提现 | `views/merchant/withdraw/index.vue` | 10 min |
| T10 | member 会员开通 | `views/merchant/member/index.vue` | 10 min |
| T11 | 联调 | smoke test + ACCEPTANCE/FINAL/TODO | 5 min |

合计 ≈ 108 min。
