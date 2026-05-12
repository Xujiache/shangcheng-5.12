# TODO · S5 平台 PC 业务实施

## ✅ 已完成（菜单分组）

S5 收尾后用户指示同时完成商家 + 平台菜单分组，已在 `router/modules/{merchant,platform}.ts` 实施：

**商家工作台（2 顶级 + 6 分组）**：
- 工作台首页 · 数据中心（顶级）
- 商品中心（5）· 订单管理（2）· 客户与客服（2）· 营销与店铺（2）· 门店与员工（2）· 财务与会员（3）

**平台工作台（2 顶级 + 5 分组）**：
- 驾驶舱 · 数据中心（顶级）
- 运营管理（2）· 审核中心（2）· 营销中心（2）· 会员与支付（2）· 系统配置（3）

URL 全部保持不变（通过 Vue Router 子路由绝对路径覆盖机制）。31 屏 smoke test 全 200。

---

## 🔧 接真后端时

13 个屏的 mock 接口都在 `api/platform-business.ts` 中。

| Mock 函数 | 真后端协议 |
|---|---|
| `fetchPlatformDashboard()` | GET `/api/v1/p/dashboard` |
| `fetchPlatformMerchants(p)` · `pause/resumeMerchant(id)` | GET/POST `/api/v1/p/merchants` |
| `fetchPlatformOrders()` | GET `/api/v1/p/orders` |
| `fetchPlatformStats(period)` | GET `/api/v1/p/stats?period=` |
| `fetchMerchantAudits` · `approveMerchant` · `rejectMerchant` | GET/POST `/api/v1/p/audit/merchants` |
| `fetchProductAudits` · `fetchProductAuditConfig` · `saveProductAuditConfig` · `approveProduct` · `rejectProduct` | GET/POST `/api/v1/p/audit/products(/config)` |
| `fetchAdSlots` · `fetchAdCreatives(slotId?)` | GET `/api/v1/p/ads/slots(creatives)` |
| `fetchPlatformPlaza(tab)` · `pushPlaza(payload)` | GET `/api/v1/p/plaza/*` · POST `/api/v1/p/plaza/pushes` |
| `fetchPlatformMemberPlans` · `savePlatformMemberPlan` | GET/POST `/api/v1/p/member-plans` |
| `fetchMemberPayOrders` | GET `/api/v1/p/member-pay-orders` |
| `fetchAdminRoles/Users` · `saveAdminRole/User` · `toggleAdminUser` · `removeAdminRole/User` | GET/POST/DELETE `/api/v1/p/roles · /admins` |
| `fetchSystemSettings` · `saveSystemSettings` | GET/POST `/api/v1/p/system/settings` |
| `fetchFeatureFlags` · `toggleFeatureFlag` · `fetchGrayscale` · `saveGrayscale` · `resetFeatureFlags` | GET/POST `/api/v1/p/feature-flags(/gray)` |

---

## 📋 下一阶段建议

| 任务 | 内容 |
|---|---|
| **S6 真后端（NestJS）** | server/ 模块逐个实现（auth + dashboard + merchant + order + audit + ad + plaza + member + permission + system + feature-flag） |
| 真聊天 WebSocket | merchant-pc 在线客服 + platform-pc 售后处理联动 |
| 真支付（Stripe / 微信） | member/plan 升级 + member/orders 退款 |
| Docker 部署 | deploy/ 模板与 admin-pc 构建产物对接 |
| 菜单分组（若选 TODO-1 方案 B） | router/modules/platform.ts 重构嵌套 |

---

## 🐞 已知小问题（不影响交付）

| # | 问题 | 优先级 | 处理建议 |
|---|---|---|---|
| K1 | merchant/list 与 audit/merchant 数据不联动 | 低 | 真后端时统一 Merchant 表 |
| K2 | order/list 详情仅 8 字段，没有商品明细 | 中 | 加 ElTable 嵌套 OrderItem |
| K3 | audit/product 商户信用等级未真实关联 | 低 | 真后端时通过 join 拉信用 |
| K4 | ad/data Tab 仅 ArtBarChart 一图 | 低 | 可加趋势叠图 |
| K5 | plaza 批量推送提交后只 toast，刷新后 records 增 1 但内容简化 | 中 | 真后端持久化 |
| K6 | member/plan 修改权益/限制按钮 toast，未实装编辑器 | 中 | 加二级 Drawer 编辑 |
| K7 | member/orders 退款审批仅前端状态变更 | 中 | 真后端走支付通道 |
| K8 | permission 重置密码仅 toast | 低 | 真后端生成随机 + 发邮件 |
| K9 | system IP 白名单未做格式校验 | 低 | 加 regex 校验 |
| K10 | feature-flag 灰度配置未真下发到 mock 拦截器 | 中 | 改 mock interceptor 读 grayscale 决定返回 |
| K11 | feature-flag 23 项保存仅 toast，未持久化 | 低 | 改 localStorage 持久 |

---

## 📁 文档

- ALIGNMENT_s5-platform-pc.md
- CONSENSUS_s5-platform-pc.md
- DESIGN_s5-platform-pc.md
- TASK_s5-platform-pc.md
- ACCEPTANCE_s5-platform-pc.md
- FINAL_s5-platform-pc.md
- TODO_s5-platform-pc.md（本文档）
