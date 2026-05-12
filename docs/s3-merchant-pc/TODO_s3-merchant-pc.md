# TODO · S3 商家 PC 业务实施

> 本期 9 屏 100% 在 CONSENSUS 范围内完成。本文是接续工作清单。

---

## ⚠ 待你确认的事

无。本期范围内的事全部已完成。

---

## 🔧 接真后端时的对照表

每个 `api/merchant-business.ts` 中的函数都是这种结构：

```ts
export function fetchXxx(params): Promise<XxxType> {
  return delay(genXxx(...))   // 改这里
}
```

接真后端：

```ts
import request from '@/utils/http'
export function fetchXxx(params) {
  return request.get<XxxType>({ url: '/api/merchant/xxx', params })
}
```

| 当前 mock | 真后端协议 |
|---|---|
| `fetchMerchantDashboard(period)` | GET `/api/merchant/dashboard?period=week` |
| `fetchMerchantProducts(params)` | GET `/api/merchant/products?status=&keyword=&categoryId=` |
| `updateProductStatus(ids, status)` | POST `/api/merchant/products/batch-status` body `{ ids, status }` |
| `removeProducts(ids)` | DELETE `/api/merchant/products` body `{ ids }` |
| `fetchMerchantCategories()` | GET `/api/merchant/categories` |
| `saveMerchantCategories(list)` | PUT `/api/merchant/categories` |
| `fetchAgencyApplications()` | GET `/api/merchant/agency-applications` |
| `fetchMerchantOrders(params)` | GET `/api/merchant/orders` |
| `shipOrders(ids)` | POST `/api/merchant/orders/batch-ship` |
| `fetchAftersaleList()` | GET `/api/merchant/aftersales` |
| `reviewRefund(id, action, remark)` | POST `/api/merchant/aftersales/{id}/review` |
| `fetchCustomers(tier)` | GET `/api/merchant/customers?tier=` |
| `fetchMarketingActivities()` | GET `/api/merchant/marketing` |

---

## 📋 下一阶段建议

| 任务 | 内容 |
|---|---|
| **S5 平台 PC 业务实施** | admin-pc 的 11 屏平台 placeholder → 完整业务 |
| **接真后端** | NestJS server 已有空壳 `packages/server`，可开始填业务模块 |
| **Docker 部署** | `deploy/docker-compose.yml` 接 admin-pc 构建产物 |

---

## 🐞 已知小问题（不影响交付）

| # | 问题 | 优先级 | 处理建议 |
|---|---|---|---|
| K1 | product/add 提交后只 toast 不真存，刷新后又是默认 mock 数据 | 中 | 接真后端后自然解决 |
| K2 | product/list 的"导出"按钮目前只 toast 提示，没真生成 CSV | 低 | xlsx 库已在依赖中，需要时直接用 |
| K3 | order/list 物流按钮点了只弹个 toast | 低 | 真后端要接物流商查询 API |
| K4 | customer 的 VIP/消费统计是 id 哈希派生，不是真业务字段 | 中 | shared User 类型加 `memberLevel` 字段后从 mock 工厂派生 |
| K5 | category 拖拽虽然 UI 实现，但移动逻辑未真改 parentId（仅触发 dirty） | 中 | ElTree node-drop 事件里同步树结构后再 save |
| K6 | marketing 的"数据"按钮只 toast | 低 | 真后端接活动详情数据看板 |

---

## 📁 文档

- `ALIGNMENT_s3-merchant-pc.md` · 需求对齐
- `CONSENSUS_s3-merchant-pc.md` · 技术共识
- `DESIGN_s3-merchant-pc.md` · 架构设计
- `TASK_s3-merchant-pc.md` · 任务拆分
- `ACCEPTANCE_s3-merchant-pc.md` · 实施 + 验收
- `FINAL_s3-merchant-pc.md` · 总结交付
- `TODO_s3-merchant-pc.md` · 本文档
