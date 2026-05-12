# CONSENSUS · S5 平台 PC 业务实施

> 6A 阶段 1 共识 · 所有决策按 ALIGNMENT 默认值落定。

## 范围

**13 屏** = 11 原占位重写 + 2 新增（merchant/list、order/list）。

| # | 屏 | 路由 | 主要 Element Plus 组件 |
|---|---|---|---|
| 1 | 数据驾驶舱 | `/platform/dashboard` | ElCard / ElTimeline / 自绘 SVG 趋势 |
| 2 | 商户列表 | `/platform/merchant/list` | ElTabs / ElTable / ElDrawer |
| 3 | 平台订单 | `/platform/order/list` | ElTabs / ElTable / ElDrawer |
| 4 | 数据中心 | `/platform/data-center` | ElRadioGroup / ElCard / ElProgress + 自绘 |
| 5 | 商户审核 | `/platform/audit/merchant` | ElTabs / 卡列表 / ElDrawer 资质图 |
| 6 | 商品审核 | `/platform/audit/product` | ElSwitch / ElInputNumber / ElTable |
| 7 | 广告管理 | `/platform/ad` | ElTabs / ElTable / ElForm |
| 8 | 选品广场 | `/platform/plaza` | ElTabs / ElTable / ElDrawer |
| 9 | 会员套餐 | `/platform/member/plan` | ElTabs / ElCard 套餐卡 / ElDrawer |
| 10 | 缴费订单 | `/platform/member/orders` | ElTabs / ElTable |
| 11 | 权限管理 | `/platform/permission` | ElTabs / ElTable / ElDrawer |
| 12 | 系统设置 | `/platform/system` | ElCard × 5 / ElForm / ElSwitch |
| 13 | 功能开关 | `/platform/feature-flag` | ElRadioGroup / ElSwitch × 23 / ElInputNumber |

## 技术契约

| 维度 | 约束 |
|---|---|
| 主题色 | `#FF4D2D`，与 S3.5 一致 |
| 通用文件 | `views/platform/<screen>/index.vue`（`<script setup lang="ts">`） |
| 接口聚合 | `api/platform-business.ts`（参考 `api/merchant-business.ts` 风格） |
| 数据源 | shared/mock/factory + 单文件 fallback |
| i18n | `menus.platform.<key>`（13 项 zh + en） |
| 路由 | `router/modules/platform.ts`（11 → 13 项，meta.roles=['platform']） |
| 不做 | 真后端、真支付、真导出、真灰度、单元测试 |

## 验收

13 条 AC（见 ALIGNMENT §8）全部满足。
