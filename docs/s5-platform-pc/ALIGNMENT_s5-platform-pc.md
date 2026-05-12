# ALIGNMENT · S5 平台 PC 业务实施

> 6A 阶段 1 · 把 admin-pc 平台工作台 11 屏 placeholder 全部换成完整业务，并补齐 platform-app 已有但 admin-pc 缺的 2 屏。

## 1. 原始需求

用户：「继续开发吧，你需要保证 app 有的功能管理后台都要有」

- 上下文：S3.5 已经把 merchant-app 的 22 屏功能补齐到 admin-pc 商家工作台 18 屏
- 平台侧：admin-pc 平台工作台 11 屏全部是 `WorkspacePlaceholder` 占位
- platform-app（移动版平台后台）已有 16 屏（业务 14 + 跳转 1 + 个人中心 1）业务实现
- 任务：把平台工作台 11 屏完整实现，并补齐 platform-app 已有但 admin-pc 缺的 2 屏

## 2. 项目上下文

| 项 | 值 |
|---|---|
| 工作目录 | `packages/admin-pc/src/views/platform/` |
| 技术栈 | Vue3 + Element Plus + Tailwind + Pinia + Vue Router |
| 风格基线 | 沿用 S3/S3.5 商家工作台（PageHeader + ElCard + Drawer 详情 + 主题橙 #FF4D2D） |
| Mock 源 | `@jiujiu/shared/mock/factory`（merchant / plaza / misc / order / product） |
| 类型源 | `@jiujiu/shared/types` |
| 当前服务 | dev server 已启动 `http://localhost:5173`，账号 `super@demo / 123456` 可走 super-admin 切换到 platform 工作台 |

## 3. 屏对照表（14 屏映射）

| platform-app 屏 | admin-pc 屏 | 路由 | 已存在? | 核心功能 |
|---|---|---|---|---|
| tabbar/home | dashboard | `/platform/dashboard` | 路由 ✓ 视图 placeholder | 4 KPI + 注册趋势 + 待办 + 快捷入口 |
| tabbar/merchant | merchant/list（**新增**） | `/platform/merchant/list` | ✗ | 商户列表 4 Tab + 详情/权限/停用 |
| tabbar/order | order/list（**新增**） | `/platform/order/list` | ✗ | 平台全部订单监控 6 Tab |
| tabbar/stats | data-center | `/platform/data-center` | 路由 ✓ 视图 placeholder | 4 周期 + 趋势 + 类目 + 导出 |
| tabbar/me | — | — | — | PC 已有用户菜单，不复制 |
| audit/merchant | audit/merchant | `/platform/audit/merchant` | 路由 ✓ 视图 placeholder | 入驻审核 3 Tab + 通过/驳回 |
| audit/product | audit/product | `/platform/audit/product` | 路由 ✓ 视图 placeholder | 商品审核 + 自动通过开关 + 抽检 |
| ad/index | ad | `/platform/ad` | 路由 ✓ 视图 placeholder | 广告位 + 创意 + 数据 3 Tab |
| plaza/index + plaza/push | plaza | `/platform/plaza` | 路由 ✓ 视图 placeholder | 平台推送广场 + 推送 Drawer |
| member/index | member/plan | `/platform/member/plan` | 路由 ✓ 视图 placeholder | 套餐 4 Tab + 编辑 + 试用期 |
| member/pay-orders | member/orders | `/platform/member/orders` | 路由 ✓ 视图 placeholder | 缴费订单 4 Tab + 退款 |
| permission | permission | `/platform/permission` | 路由 ✓ 视图 placeholder | 角色 + 管理员 2 Tab |
| system | system | `/platform/system` | 路由 ✓ 视图 placeholder | 站点/支付/物流/客服/安全 5 分组 |
| feature-flag | feature-flag | `/platform/feature-flag` | 路由 ✓ 视图 placeholder | 首页/角色/菜单开关 + 灰度 |

**合计：原 11 路由 + 新增 2 路由 = 13 平台屏**

## 4. 决策清单（默认值标 ★，需澄清的标 ?）

| # | 问题 | 默认 ★ | 备选 |
|---|---|---|---|
| D1 | 新增 2 路由放哪 | ★ `/platform/merchant/list`、`/platform/order/list`，meta.roles=['platform'] | 不加 |
| D2 | 菜单结构 | ★ 13 项扁平 | 分组（待办/审核/运营/财务/系统 5 组） |
| D3 | 13 屏 mock API 位置 | ★ 新建 `api/platform-business.ts` | 分多个文件 |
| D4 | 数据源 | ★ 复用 shared/mock/factory（genMerchants/genFeatureFlags/genMemberPlans/genAdSlot/genAdCreative/genPlatformDashboard），不足部分本文件自造 | 每屏独立 mock |
| D5 | 商户审核「通过/驳回」交互 | ★ Drawer 资质大图浏览 + 操作 | Dialog 内嵌 |
| D6 | 商品审核「自动通过」配置 | ★ 卡片顶部 + ElSwitch + 条件清单 + 抽检 % InputNumber | 抽屉表单 |
| D7 | 广告 3 Tab | ★ Tab：广告位 / 创意 / 数据 | 平铺 |
| D8 | 平台广场推送 | ★ 列表选商品 → 推送 Drawer（投放对象 + 时段 + 权重） | 直接推送 |
| D9 | 会员套餐 4 Tab | ★ 会员套餐 / 推广套餐 / 缴费订单跳转 / 增值包 | 单 Tab |
| D10 | 权限页 2 Tab | ★ 角色 Tab（创建/编辑/删除）+ 管理员 Tab（创建/重置密码/停用） | 单视图 |
| D11 | 系统设置布局 | ★ 5 ElCard 分组：站点 / 支付 / 物流 / 客服 / 安全 | 单表单 |
| D12 | feature-flag 三组 | ★ 首页快捷入口（10）+ 角色按钮（5）+ 侧边菜单（8）+ 灰度配置面板 | 全部混合 |
| D13 | dashboard 待办点击 | ★ 跳转对应屏（待审核商户→audit/merchant，待审核商品→audit/product，售后投诉→order/list，提现→（无）禁用） | toast |
| D14 | 导出按钮 | ★ data-center 显示「导出 Excel」按钮 → ElMessage.success 模拟 | 真导出 |
| D15 | 主题色 | ★ #FF4D2D 沿用 | 切换 |
| D16 | 翻译 | ★ 13 项 i18n key（zh/en），业务文案中文为主 | 全双语 |
| D17 | 分页 | ★ ElPagination 单页 20 条，前端切片 | 服务端分页 |
| D18 | 单元测试 | ★ 不写 | 写 |

## 5. 必做边界

✅ **必做（13 屏）**：
1. dashboard - 数据驾驶舱（KPI + 注册趋势 + 5 待办 + 8 快捷入口）
2. merchant/list - 商户列表（4 Tab + 搜索 + 详情/权限/停用）
3. order/list - 订单监控（6 Tab + 搜索 + 详情 Drawer）
4. data-center - 数据中心（4 周期 + 趋势 + 类目柱图 + 套餐分布 + 导出）
5. audit/merchant - 商户审核（3 Tab + 资质图 + 通过/驳回）
6. audit/product - 商品审核（自动通过开关 + 条件 + 抽检 + 3 Tab + 商品卡）
7. ad - 广告管理（3 Tab + 顶部 4 统计 + 广告位卡 + 创意 + 数据）
8. plaza - 平台广场（3 Tab + 3 统计 + 搜索 + 商品卡 + 推送 Drawer）
9. member/plan - 会员套餐（4 Tab + 套餐卡 + 试用期 + 增值单项）
10. member/orders - 缴费订单（4 Tab + 4 统计 + 订单卡 + 详情）
11. permission - 权限管理（2 Tab + 角色卡 + 管理员卡）
12. system - 系统设置（5 ElCard 分组 + 编辑保存）
13. feature-flag - 功能开关（受众选择 + 3 列开关 + 灰度比例）

✅ **必做配套**：
- 新增 2 个路由（merchant/list、order/list）
- 13 个 i18n key（zh + en）
- 1 个 mock API 文件 `api/platform-business.ts`（覆盖 13 屏所有接口）
- 移除/重写 13 个 placeholder vue 文件
- smoke test 13 个 URL 全 200

❌ **不做**：
- 真后端接入（mock only）
- 真支付、真退款（toast 模拟）
- 真导出 Excel（toast 模拟）
- 真灰度命中（前端配置 only，不下发）
- 单元测试 / e2e 测试
- 业务文案的英文翻译（菜单 key 双语，业务文案保留中文）
- platform-app/tabbar/me 个人中心（PC 已有用户菜单）
- 商品审核的「修改类目/价格」二级编辑（仅通过/驳回/抽检）

## 6. 疑问澄清

无关键疑问。所有决策按 ★ 默认值进入 CONSENSUS。

## 7. 风险

| 风险 | 缓解 |
|---|---|
| 13 屏代码量 ≈ 3500-4500 行 | 每屏控制 250-400 行，沿用 S3.5 模板节奏 |
| 字段不齐（如商品审核 / 系统设置） | 在 `platform-business.ts` 内补本地 type 与 fallback mock |
| 菜单从 0 变 13 项过长 | 暂保留扁平，分组重构留 TODO |
| platform 工作台路由当前 11 项，要加 2 项 | 改 `router/modules/platform.ts`，与 S3.5 +9 路由同样轻量 |

## 8. 验收标准（AC）

| # | 标准 |
|---|---|
| AC-01 | super@demo 登录 → 切换 platform 工作台 → 菜单显示 13 项 |
| AC-02 | 13 屏路由全部 HTTP 200，vite 控制台 0 error |
| AC-03 | dashboard 显示 4 KPI + 注册趋势曲线 + 待办（5）+ 8 快捷入口 |
| AC-04 | audit/merchant 显示资质图、通过/驳回二次确认、Tab 计数实时刷新 |
| AC-05 | audit/product 自动通过开关切换、抽检 % 调整、商品卡通过/驳回 |
| AC-06 | ad 显示 3 Tab、顶部 4 统计、广告位卡有曝光/点击/CTR |
| AC-07 | plaza 显示 3 Tab、搜索、推送 Drawer（投放对象 + 时段 + 权重） |
| AC-08 | member/plan 4 Tab、套餐卡有价格/权益/编辑按钮、试用期配置 |
| AC-09 | member/orders 4 Tab、4 统计、订单卡显示支付方式 |
| AC-10 | permission 2 Tab、角色卡 + 管理员卡、编辑/删除/停用 |
| AC-11 | system 5 ElCard、编辑/保存、ICP/客服电话弹窗修改 |
| AC-12 | feature-flag 3 列开关（10/5/8）+ 灰度比例选择 + 重置按钮 |
| AC-13 | dashboard 待办点击可跳转对应屏 |

## 9. 质量门控

- ✅ 需求边界清晰：13 屏 + 2 路由 + 1 API 文件
- ✅ 技术方案对齐：完全沿用 S3.5 风格栈
- ✅ 验收 13 条具体可测
- ✅ 关键假设默认值已记录在 D1-D18
- ✅ 项目特性规范已对齐（中文主题，原型驱动）
