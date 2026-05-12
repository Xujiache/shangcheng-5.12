# ACCEPTANCE · S5 平台 PC 业务实施

> 6A 阶段 5/6

## 1. 执行清单

| 任务 | 状态 | 产物 |
|---|---|---|
| T0 路由 + i18n + API 骨架 | ✅ | `router/modules/platform.ts` +2 路由 · `locales/langs/{zh,en}.json` +2 keys · `api/platform-business.ts` ≈ 30 函数 |
| T1 dashboard | ✅ | 4 KPI + 注册趋势 SVG + 5 待办 + 8 快捷入口 + 跳转路由 |
| T2 merchant/list（新增） | ✅ | 4 Tab + 4 统计 + ElTable + 详情 Drawer + 停用 |
| T3 order/list（新增） | ✅ | 6 Tab + 4 KPI + ElTable + 订单详情 Drawer |
| T4 data-center | ✅ | 4 周期 + 4 KPI + 趋势 + 类目柱状 + 套餐环图 + 商户类型环 |
| T5 audit/merchant | ✅ | 3 Tab + 资质图浏览 + 通过 / 驳回（prompt 填理由）|
| T6 audit/product | ✅ | 自动通过开关 + 免审条件 + 抽检 + 3 Tab + 表格 + Drawer |
| T7 ad | ✅ | 3 Tab + 4 KPI + 广告位卡（曝光/CTR/创意）+ 创意表 + 数据图 |
| T8 plaza | ✅ | 3 Tab + 3 KPI + 5 列网格 + 批量推送 + 推送 Drawer |
| T9 member/plan | ✅ | 4 Tab + 试用期 + 套餐卡（HOT + 编辑 dropdown） |
| T10 member/orders | ✅ | 4 Tab + 4 KPI + 订单表 + 退款审批 Drawer |
| T11 permission | ✅ | 2 Tab + 5 角色卡 + 管理员表 + 创建/编辑 Drawer |
| T12 system | ✅ | 5 ElCard 分组：站点 / 支付 / 物流 / 客服 / 安全 |
| T13 feature-flag | ✅ | 受众 + 灰度 + 3 列开关（10/5/8） + 重置 |
| T14 联调 + smoke | ✅ | 13 屏 HTTP 全 200，SFC 全编译通过 |

## 2. AC 13 条

| # | 验收 | 结果 |
|---|---|---|
| AC-01 | super@demo 登录 → 切换 platform 工作台 → 菜单显示 13 项 | ✅ |
| AC-02 | 13 屏路由全部 HTTP 200，vite 0 error | ✅ |
| AC-03 | dashboard 显示 4 KPI + 趋势 + 5 待办 + 8 快捷入口 | ✅ |
| AC-04 | audit/merchant 资质图浏览、通过/驳回二次确认 | ✅ |
| AC-05 | audit/product 自动通过开关、抽检调整、驳回 dropdown | ✅ |
| AC-06 | ad 3 Tab + 4 KPI + 广告位卡有曝光/CTR | ✅ |
| AC-07 | plaza 3 Tab + 搜索 + 推送 Drawer | ✅ |
| AC-08 | member/plan 4 Tab + 套餐卡 + 试用期 | ✅ |
| AC-09 | member/orders 4 Tab + 4 KPI + 退款审批 | ✅ |
| AC-10 | permission 2 Tab + 角色卡 + 管理员表 | ✅ |
| AC-11 | system 5 ElCard + 编辑保存 | ✅ |
| AC-12 | feature-flag 3 列开关 + 灰度配置 + 重置 | ✅ |
| AC-13 | dashboard 待办点击可跳转对应屏 | ✅ |

## 3. Smoke 测试日志

```
200 platform/dashboard
200 platform/merchant/list    [新]
200 platform/order/list       [新]
200 platform/data-center
200 platform/audit/merchant
200 platform/audit/product
200 platform/ad
200 platform/plaza
200 platform/member/plan
200 platform/member/orders
200 platform/permission
200 platform/system
200 platform/feature-flag
```

SFC `/src/views/platform/<screen>/index.vue` 全部 200（Vite SFC 编译通过）。

## 4. 质量评估

| 维度 | 评价 |
|---|---|
| 代码量 | 13 屏 + 1 api ≈ **4300 行** |
| 一致性 | 沿用 S3.5 风格：PageHeader + ElCard + Drawer + 主题橙 |
| 数据源 | shared/mock/factory（merchant/order/plaza/ad/member/feature-flag/stats）+ 本地 fallback |
| 桌面化 | 网格布局 / 抽屉详情 / 表格主操作 / ElTabs 切换 |
| 类型一致 | Order.totalAmount/shippingFee 修正、AuditProduct 与 PayOrderItem 本地接口 |

## 5. 风险闭环

| 风险（DESIGN §6） | 状态 |
|---|---|
| 13 屏代码量 | ✅ 平均 280-400 行 |
| 字段不齐 | ✅ AuditProduct / PayOrderItem / AdminUser / SystemSettings 本地接口 |
| 菜单从 0 变 13 项 | ⚠ 暂保留扁平（与 S3.5 一致，分组重构留 TODO） |
| Order 字段错位 | ✅ 修正 itemAmount → totalAmount、freight → shippingFee |
