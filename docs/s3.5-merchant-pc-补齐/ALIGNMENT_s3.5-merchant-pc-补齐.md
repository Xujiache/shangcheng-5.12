# ALIGNMENT · S3.5 商家 PC 补齐

> 6A 工作流 · 阶段 1：Align
> 任务名：`s3.5-merchant-pc-补齐`
> 时间：2026-05-12
> 上游：`docs/s3-merchant-pc/` 已完工的 9 屏

---

## 1. 项目上下文

### 1.1 现状

| 项 | 状态 |
|---|---|
| admin-pc 框架 | 已完工（智能登录 + 角色路由 + 超管切换） |
| **admin-pc 商家工作台已有 9 屏** | dashboard / product-list / product-add / product-category / product-agency / order-list / order-aftersale / customer / marketing |
| `packages/merchant-app` | 22 屏全量业务移动端（含 FX-1~6 改造）|
| `@jiujiu/shared/mock/factory` | 含 misc.ts 中的 `genWithdraw / genCommission / genPromoteSummary / genMerchantStats` 等工厂 |
| art-lnb 业务组件库 | ArtTimelineListCard / ArtProgressCard / ArtDataListCard / ArtBarChart 等可直接复用 |

### 1.2 用户原始反馈

> "你还需要保证 app 端有的功能管理后台也都要有"

对照 `packages/merchant-app/src/pages/` 22 屏 vs `admin-pc/views/merchant/*` 已有 9 屏，**缺失 9 个核心业务屏**。

### 1.3 缺失屏映射（merchant-app → admin-pc）

| # | merchant-app 移动端 | admin-pc 新路由 | 移动端行数 |
|---|---|---|---|
| 1 | `pages/tabbar/stats/index.vue` | `/merchant/stats`（数据中心） | 450 |
| 2 | `pages/plaza/index.vue` + `pages/plaza/factory.vue` | `/merchant/plaza`（选品广场 + 厂家详情 Drawer） | 465 + 629 = 1094 |
| 3 | `pages/store/index.vue` + `pages/store/auth.vue` | `/merchant/store`（门店列表 + 授权 Tab） | 339 + 403 = 742 |
| 4 | `pages/staff/index.vue` | `/merchant/staff`（员工管理） | 457 |
| 5 | `pages/shop/decorate.vue` | `/merchant/decorate`（店铺装修） | 484 |
| 6 | `pages/chat/index.vue` | `/merchant/chat`（在线客服） | 600 |
| 7 | `pages/commission/setting.vue` | `/merchant/commission`（佣金设置） | 402 |
| 8 | `pages/withdraw/index.vue` | `/merchant/withdraw`（提现处理） | 592 |
| 9 | `pages/member/index.vue` | `/merchant/member`（会员开通） | 462 |

移动端合计 **5283 行** 业务逻辑。

---

## 2. 任务边界

### ✅ 必做

- 9 个新 view 文件（`views/merchant/{stats,plaza,store,staff,decorate,chat,commission,withdraw,member}/index.vue`）
- 9 条新路由（`router/modules/merchant.ts` 追加）
- 9 个 i18n 菜单 key（`locales/langs/{zh,en}.json` 补 menus.merchant.* ）
- 侧边菜单**按业务分组**（避免 18 项平铺），分组结构见 §4.4
- API 层补齐对应 mock 接口（`api/merchant-business.ts` 追加 9~12 个）
- 桌面级 UI：plaza 用网格 + Drawer 详情；store/staff 用 ElTable；decorate 用左中右三栏；chat 用 IM 双栏；其余照 S3 套路
- 数据持久化：commission / decorate 配置走 localStorage，其余 session 级
- 所有屏 HTTP 200 smoke 通过

### ❌ 不做

- 真后端
- 真聊天（WebSocket）→ chat 只做 mock 消息往来
- 店铺装修的真实拖拽布局编辑器 → 用预设模板切换 + 顺序调整即可
- 提现的真支付通道
- 会员套餐的真支付
- 单元/E2E 测试
- 英文翻译菜单外的文案

---

## 3. 9 屏功能矩阵

| 屏 | 关键功能 | 桌面化关键差异 |
|---|---|---|
| **stats 数据中心** | 4 周期切换（今日/周/月/年）+ KPI + 销售趋势 + Top10 + 类目占比 + 客群新老 | 与 dashboard 不同：focused 单图全屏 + 时间维度切换 + 导出 |
| **plaza 选品广场** | 广场 Tab（推荐/分类/搜索）+ 商品卡网格 + 申请代理 + 厂家详情 Drawer | 网格布局：每排 4-5 个商品卡 + 右侧 480 抽屉显示厂家详情 |
| **store 门店** | 门店列表（在线/离线）+ 添加门店 + 编辑 + 授权状态 + Tab 切到"授权管理" | ElTable 列表 + 编辑 Dialog；授权管理 Tab：员工与门店关联 |
| **staff 员工** | 员工列表 + 添加 + 角色（店长/收银/导购）+ 状态 + 业绩 | ElTable + 添加 Drawer（账号 + 手机 + 角色 + 关联门店） |
| **decorate 店铺装修** | 模板选择 + 模块开关 + 排序 + 预览 | 左：模块树（拖拽）；中：实时手机预览；右：当前模块属性 |
| **chat 在线客服** | 会话列表 + 消息流 + 快捷回复 + 客户信息 | 三栏：左会话列表，中消息区，右客户档案 |
| **commission 佣金** | 佣金分级（一级/二级/三级）+ 比例 + 启用 + 适用范围 + 历史记录 | 卡片形式展示 3 级 + 历史明细表格 |
| **withdraw 提现** | 余额 + 申请提现表单 + 银行卡 + 历史 + 状态机 | 上方"余额+申请"卡 + 下方明细表格 + 详情 Drawer |
| **member 会员开通** | 套餐列表（基础 / 标准 / 旗舰）+ 试用 + 增值包 + 续费 | 3 套餐卡片对比 + 增值包列表 + 当前套餐进度条 |

---

## 4. 智能决策（D1–D14）

| # | 决策 | 默认 | 理由 |
|---|---|---|---|
| D1 | 命名 | `s3.5-merchant-pc-补齐` | 0.5 表示是 S3 续作；中文易识别 |
| D2 | 路由前缀 | 沿用 `/merchant/*` | 不动菜单根结构 |
| D3 | 是否拆 modules | **不拆**，每屏单 .vue（除 plaza/chat 拆 Drawer 子组件） | 与 S3 风格一致 |
| D4 | 菜单分组方式 | **路由 children 嵌套** + meta.title 作组名 | art-lnb 原生支持 |
| D5 | API 复用 | **追加到 `api/merchant-business.ts`** | 单文件管理所有 merchant mock |
| D6 | 真后端协议 | TODO 文档列对照（同 S3） | 接真后端时一处改 |
| D7 | 主题 | 全部沿用 #FF4D2D + art-lnb 灰阶 | 视觉一致 |
| D8 | 持久化 | commission/decorate/member 当前态写 localStorage；其它 session 级 | 演示效果连续 |
| D9 | plaza 厂家详情 | **ElDrawer 右抽屉**，不开新页 | 桌面更自然 |
| D10 | chat 布局 | **三栏 360+1fr+320**，移动端是单栏滑动 | 桌面式 IM 标准 |
| D11 | decorate 编辑器 | **左模块树（不真拖）+ 中预览 + 右属性**，模块顺序用上下箭头 | 真拖拽留二期 |
| D12 | withdraw 银行卡 | 单卡录入，不做卡片管理 | 简化 |
| D13 | member 套餐 | **3 卡对比**，当前活跃套餐高亮 + 进度条 | 标准 SaaS 套餐对比模式 |
| D14 | 实施批次 | 一批做完 9 屏（每屏体量小） | 避免拆批文档膨胀 |

### 4.4 菜单分组结构（重组后）

```
商家工作台
├── 数据
│   ├── 数据概览 dashboard
│   └── 数据中心 stats           [新]
├── 商品
│   ├── 在售商品 product/list
│   ├── 添加商品 product/add
│   ├── 分类管理 product/category
│   ├── 代理商品 product/agency
│   └── 选品广场 plaza            [新]
├── 订单
│   ├── 订单管理 order/list
│   └── 售后处理 order/aftersale
├── 客户
│   ├── 客户管理 customer
│   └── 在线客服 chat             [新]
├── 营销
│   └── 营销中心 marketing
├── 运营
│   ├── 门店管理 store            [新]
│   ├── 员工管理 staff            [新]
│   └── 店铺装修 decorate         [新]
└── 财务
    ├── 佣金设置 commission       [新]
    ├── 提现处理 withdraw         [新]
    └── 会员开通 member           [新]
```

侧边菜单从 9 项平铺 → 7 个分组共 18 项。

---

## 5. 验收标准草案

| # | 验收 | 判定 |
|---|---|---|
| AC-01 | 9 屏路由可访问，HTTP 200 | curl |
| AC-02 | 侧边菜单按 §4.4 7 个分组显示，共 18 项 | 视觉 |
| AC-03 | stats 4 周期切换正确显示数据 | 手测 |
| AC-04 | plaza 网格 + 厂家 Drawer 可开关 | 手测 |
| AC-05 | store 列表 + 添加/编辑 + 授权 Tab | 手测 |
| AC-06 | staff 添加 Drawer + 角色筛选 | 手测 |
| AC-07 | decorate 模块开关 + 顺序调整 + 实时预览 | 手测 |
| AC-08 | chat 三栏布局 + 发送消息 + 快捷回复 | 手测 |
| AC-09 | commission 3 级配置 + 历史明细 | 视觉 |
| AC-10 | withdraw 申请表单 + 提交后流入明细 | 操作 |
| AC-11 | member 3 套餐对比 + 当前套餐高亮 | 视觉 |
| AC-12 | 总计 18 屏 smoke 200 + 0 console error | 自动检查 |

---

## 6. 风险

| 风险 | 缓解 |
|---|---|
| 9 屏一次性做完代码量大（5000+ 行） | 每屏控制在 250-450 行；模块拆分仅 plaza/chat |
| 菜单分组结构改动会触发路由 children 层级变化 | merchant.ts 改为多层嵌套，每组用占位父节点 |
| chat 三栏要求 540px+ 中栏，1024 屏挤压 | 1100 以下双栏（隐藏右侧客户档案） |
| decorate 装修模块需 SVG 手机壳预览，工作量大 | 用 CSS 模拟手机壳 + iframe 风格预览，不用真渲染 |
| commission 三级佣金涉及数学计算 | 仅作配置 UI，不做实际订单分账 |

---

## 7. 待你确认（Q1–Q5）

| # | 问题 | 默认 |
|---|---|---|
| Q1 | 一批做完 9 屏（不拆批）？ | 是 |
| Q2 | 菜单分组按 §4.4 结构 7 组 18 项？ | 是 |
| Q3 | chat 双栏布局兜底（1100 以下隐藏客户档案）？ | 是 |
| Q4 | decorate 不做真拖拽，只做开关 + 上下排序 + 模板切换？ | 是 |
| Q5 | 9 屏全做 mock，不接真后端？ | 是 |

---

## 8. 下一步

→ 用户答 Q1–Q5（或一句"开始吧"通过默认）→ CONSENSUS/DESIGN/TASK → 实施 9 屏 → 联调
