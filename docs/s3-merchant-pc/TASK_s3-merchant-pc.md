# TASK · S3 商家 PC 业务实施

> 9 原子任务 · 2 批顺序执行

## 依赖图

```
T0 api/merchant-business.ts
 │
 ├─[批 A]─→ T1 dashboard  → T2 product/list → T3 product/add → T4 product/category → T5 product/agency
 │
 └─[批 B]─→ T6 order/list → T7 order/aftersale → T8 customer → T9 marketing
                                                                                    │
                                                                                    ▼
                                                                              T10 联调验收
```

## 原子任务

| # | 屏 | 关键产物 | 估时 |
|---|---|---|---|
| T0 | api 层 | `api/merchant-business.ts`，9 个 mock 接口 | 5 min |
| T1 | dashboard | `views/merchant/dashboard/index.vue` + 4 modules | 10 min |
| T2 | product/list | `views/merchant/product/list/index.vue` + SearchBar | 12 min |
| T3 | product/add | `views/merchant/product/add/index.vue` + 5 modules | 18 min |
| T4 | product/category | `views/merchant/product/category/index.vue` + 2 modules | 10 min |
| T5 | product/agency | `views/merchant/product/agency/index.vue` | 8 min |
| T6 | order/list | `views/merchant/order/list/index.vue` + Drawer | 12 min |
| T7 | order/aftersale | `views/merchant/order/aftersale/index.vue` + Drawer | 10 min |
| T8 | customer | `views/merchant/customer/index.vue` + Drawer | 10 min |
| T9 | marketing | `views/merchant/marketing/index.vue` | 8 min |
| T10 | 联调 | smoke test + ACCEPTANCE/FINAL/TODO | 5 min |

合计 ≈ 110 min。

## 每屏退出条件

每屏必须：
1. 路由可访问，HTTP 200，无 console error
2. 至少 1 类真实交互（不是纯静态）
3. 视觉与其余 admin-pc 已有页面（403/login）同风格
