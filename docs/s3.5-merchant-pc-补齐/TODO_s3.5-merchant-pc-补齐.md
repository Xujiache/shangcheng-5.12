# TODO · S3.5 商家 PC 补齐

## ✅ 已完成（菜单分组）

S5 收尾时用户指示同步完成菜单分组重构，已落地：**2 顶级 + 6 分组**

- 工作台首页 · 数据中心（顶级）
- 商品中心（5 屏）· 订单管理（2 屏）· 客户与客服（2 屏）· 营销与店铺（2 屏）· 门店与员工（2 屏）· 财务与会员（3 屏）

URL 全部保持原值（通过 Vue Router 子路由绝对路径覆盖机制）。18 屏 smoke test 全 200。

---

## 🔧 接真后端时

新增 9 个屏的 mock 接口都在 `api/merchant-business.ts` 中，结构和 S3 一致：

| Mock 函数 | 真后端协议 |
|---|---|
| `fetchPlazaCards()` | GET `/api/plaza/cards` |
| `fetchFactoryDetail(id)` | GET `/api/plaza/factory/{id}` |
| `fetchStores / saveStore / removeStore` | GET/POST/DELETE `/api/merchant/stores` |
| `fetchStaff / saveStaff / removeStaff` | GET/POST/DELETE `/api/merchant/staff` |
| `fetchDecorate / saveDecorate` | GET/PUT `/api/merchant/shop/decorate` |
| `fetchChatSessions / fetchChatMessages / sendChatMessage` | GET `/api/chat/sessions` / `/api/chat/messages` · POST `/api/chat/messages`（→ 真实需 WebSocket） |
| `fetchCommissionConfig / saveCommissionConfig` | GET/PUT `/api/merchant/commission-rule` |
| `fetchCommissionHistory` | GET `/api/merchant/commissions` |
| `fetchPromoteSummary` | GET `/api/merchant/promote-summary` |
| `fetchBalance / fetchWithdraws / applyWithdraw` | GET `/api/merchant/balance` · GET/POST `/api/merchant/withdraws` |
| `fetchMemberPlans / fetchCurrentMembership` | GET `/api/member/plans` · `/api/merchant/membership` |

---

## 📋 下一阶段建议

| 任务 | 内容 |
|---|---|
| **S5 平台 PC 业务实施** | admin-pc 平台 11 屏 placeholder → 完整业务（用 platform-app 当对照） |
| 菜单分组（若选 TODO-1 方案 B） | router/modules/merchant.ts 重构嵌套 |
| 接真后端 | server/ 模块逐个实现 |

---

## 🐞 已知小问题（不影响交付）

| # | 问题 | 优先级 | 处理建议 |
|---|---|---|---|
| K1 | stats 与 dashboard 数据重复 | 低 | 真后端时 stats 走更细的 `/api/merchant/stats?dimension=` |
| K2 | plaza "申请代理" 仅本地 Set 标记，刷新即丢 | 中 | 写 localStorage 或接 agency-applications 列表 |
| K3 | decorate 模块顺序未真上传到 user-mp 首页 | 中 | 真后端联动 user-mp 拉同一份配置 |
| K4 | chat 消息只支持纯文本，没有图片/订单卡片 | 中 | shared ChatMessage 已有 type: image/order/product，未渲染 |
| K5 | withdraw 申请成功后 Hero 余额是前端假减，刷新会回滚 | 中 | 真后端持久化 |
| K6 | member "升级"按钮只 toast，未走真支付 | 中 | 接微信/支付宝 |
| K7 | staff 关联门店没有限制（一员工可绑多店）| 低 | 业务规则待定 |

---

## 📁 文档

- ALIGNMENT_s3.5-merchant-pc-补齐.md
- CONSENSUS_s3.5-merchant-pc-补齐.md
- DESIGN_s3.5-merchant-pc-补齐.md
- TASK_s3.5-merchant-pc-补齐.md
- ACCEPTANCE_s3.5-merchant-pc-补齐.md
- FINAL_s3.5-merchant-pc-补齐.md
- TODO_s3.5-merchant-pc-补齐.md（本文档）
