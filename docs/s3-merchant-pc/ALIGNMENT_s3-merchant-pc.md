# ALIGNMENT · S3 商家 PC 业务实施

> 6A 工作流 · 阶段 1：Align（对齐阶段）
> 任务名：`s3-merchant-pc`
> 时间：2026-05-11
> 上游依赖：`docs/admin-pc-merge/` 已完工的 admin-pc 骨架

---

## 1. 项目上下文（基建已就位）

| 项 | 现状 |
|---|---|
| **应用框架** | `packages/admin-pc/` · Vue3 + Element Plus + Tailwind + Pinia + Vue Router |
| **9 屏路由** | 全部已注册（`router/modules/merchant.ts`，9 条），骨架页面均已可达 |
| **登录态** | 智能登录已通；`merchant@demo / 123456` 登录后直接落地 `/merchant/dashboard` |
| **权限隔离** | 路由守卫 + MenuProcessor 已生效，菜单仅显示商家 9 项 |
| **Mock 数据** | `@jiujiu/shared/mock/factory` 已有 product / order / merchant / category / user / plaza / misc 7 个生成器，含 FX-5 按尺寸定价、FX-6 SKU 等扩展字段 |
| **移动端业务参照** | `packages/merchant-app/src/pages/` 已完工，9 屏对应的业务逻辑在那里可直接对照搬过来 |
| **art-lnb 组件库** | `art-bar-chart` / `art-line-chart` / `art-stats-card` / `art-data-list-card` / `art-image-card` / `art-progress-card` 等 ~30+ 业务组件可直接复用 |

> **要点**：基础设施 100% 就绪，本期只剩"把 9 个 WorkspacePlaceholder 替换成完整桌面级业务页面"这一件事。

---

## 2. 原始需求（用户原话）

> "开始吧3"
>
> 上下文：上一轮回答列出"S3 商家 PC 业务实施 · 9 屏从骨架变完整业务（复用 merchant-app 逻辑做桌面级） · 1–2 天"，用户选 3。

---

## 3. 9 屏功能矩阵（移动端 → 桌面端对照）

| # | 路由 | 移动端参照 | 桌面级关键差异 |
|---|---|---|---|
| 1 | `/merchant/dashboard` | `tabbar/home/index.vue` | 多列 KPI + ECharts 折线/柱状/饼图 + 待办面板 + 8 入口 |
| 2 | `/merchant/product/list` | `tabbar/product/index.vue` | ElTable 多选 + 批量上下架/删除 + 工具栏（搜索/筛选/导出） + 状态 Tab |
| 3 | `/merchant/product/add` | `product/add.vue` | 三段式表单（基础/规格/价格库存） + 图片 CRUD + 按尺寸定价模块 + 自定义 SKU 矩阵表 |
| 4 | `/merchant/product/category` | `product/category.vue` | 左侧分类树（vue-draggable-plus 拖拽排序）+ 右侧详情/关联商品 |
| 5 | `/merchant/product/agency` | `product/agency-list.vue` | Tab + ElTable + 卡片混合：申请状态、加价率、操作（取消/调整/下架）|
| 6 | `/merchant/order/list` | `tabbar/order/index.vue` + `order/detail.vue` | ElTable + 详情 Drawer + 6 状态 Tab + 批量发货 + 物流跟踪 |
| 7 | `/merchant/order/aftersale` | `order/aftersale.vue` | 工单表格 + 详情 Drawer（退款/退货/换货）+ 时间轴 |
| 8 | `/merchant/customer` | `customer/index.vue` | ElTable + 分层 Tab（普通/会员/黑名单）+ 客户详情抽屉 + 标签 |
| 9 | `/merchant/marketing` | `marketing/index.vue` | 卡片网格（优惠券/满减/拼团/秒杀/分销）+ 各活动列表 |

---

## 4. 任务边界

### ✅ 必做

- 9 屏 WorkspacePlaceholder → 完整业务页面（**对照移动端逻辑桌面化**，不发明新功能）
- 复用 `@jiujiu/shared/mock` 数据，**不重写 mock 工厂**
- 复用 art-lnb 现有业务组件（ElTable / ElForm / ElDrawer / Art* 系列），**不引入新 UI 库**
- 桌面级交互：表格多选 / 批量操作 / 抽屉详情 / 弹窗表单 / 拖拽排序（仅分类管理）
- 字段口径与移动端 + shared types 严格一致（例如 `Product.pricingMode` / `SKU.specs` 等）

### ❌ 不做

- 真后端接口（继续 mock，但通过 axios + mock 拦截更接近真实路径）
- 复杂权限（按钮级 RBAC）
- 单元测试 / E2E 测试（只做 smoke 200）
- 富文本商品详情编辑器深度配置（用 wangEditor 默认配置即可）
- WebSocket 实时刷新（订单状态轮询用前端定时器伪装即可，本期不接）
- 多门店 / 多租户切换
- 国际化英文翻译（仅做中文 i18n key）

---

## 5. 智能决策（D1–D12）

| # | 决策点 | 默认答案 | 理由 |
|---|---|---|---|
| D1 | mock 调用方式 | **保留 `api/mock-accounts.ts` 模式**，9 屏新增 mock 直接走 `api/*.ts` 内 Promise 实现 | 与登录 mock 风格一致，0 学习成本 |
| D2 | 是否引入 axios mock-adapter | 否 | 多一层抽象不值得；mock 阶段直接 Promise 更直白 |
| D3 | 共享 shared mock 工厂 | **直接 import `@jiujiu/shared/mock/factory`** 在 api/ 层调用 | 与移动端三端共用一套数据 |
| D4 | 表格组件 | 默认 ElTable + 自研轻包装（pagination + selection），**不引** vxe-table | ElTable 够用，减少依赖 |
| D5 | 详情交互 | ElDrawer 右侧抽屉 | 比 dialog 更适合桌面、不打断列表上下文 |
| D6 | 表单 | ElForm + ElFormItem，按钮在底部 sticky | 桌面常规模式 |
| D7 | 分类树 | ElTree + vue-draggable-plus（art-lnb 已带）| 拖拽排序原生支持 |
| D8 | 图表 | ECharts 6（art-lnb 已带 art-line/bar/donut 等卡片组件直接用）| 不挑选 chart.js / antv，避免重复造轮 |
| D9 | 图片上传 | mock 阶段：本地 File → URL.createObjectURL；保留上传 hook 留真后端时改 | 演示能放图，无需真 OSS |
| D10 | 单页路由 vs 拆子路由 | **每个屏都是单独的 .vue（含 modules/ 子组件）**，对应 router 一条路径 | 与 art-lnb 风格一致 |
| D11 | 表单校验 | ElForm rules + async-validator（Element Plus 内置）| 0 新依赖 |
| D12 | 9 屏顺序 | **先 dashboard + 4 个 product → 再 2 个 order + customer + marketing** | dashboard 立刻有视觉成就感；product 是商家最常用 |

---

## 6. 验收标准草案

| # | 验收项 | 判定 |
|---|---|---|
| AC-01 | `pnpm dev:admin-pc` 用 `merchant@demo` 登录 → 9 屏路由都不再显示 Placeholder，全部是真业务 UI | 手动点 9 个菜单 |
| AC-02 | dashboard 至少 4 个 KPI + 3 个图表 + 5 项待办 + 6 个快捷入口 | 视觉 |
| AC-03 | product/list 表格支持：选择/批量上下架/状态 Tab/关键字搜索/导出 | 操作 |
| AC-04 | product/add 表单 3 段式（基础信息/规格 SKU/价格库存），含图片 CRUD + 按尺寸定价 + 自定义 SKU 矩阵 | 完整提交一次跳回 list |
| AC-05 | product/category 拖拽排序生效（刷新仍保留） | 拖一下 |
| AC-06 | product/agency 4 状态 Tab + 取消/调整/下架/重新上架/编辑商品 5 个操作 | 视觉 + 点击 |
| AC-07 | order/list 6 状态 Tab + 抽屉详情 + 至少 1 个批量操作 | 操作 |
| AC-08 | order/aftersale 工单列表 + 详情抽屉 + 处理流程时间轴 | 视觉 |
| AC-09 | customer 表格 + 分层 Tab + 详情抽屉 + 标签管理 | 操作 |
| AC-10 | marketing 5 类活动卡片 + 任一类的活动列表 | 视觉 |
| AC-11 | 9 屏 HTTP smoke 200 | curl |
| AC-12 | 桌面分辨率（1440×900）下无横向滚动条；1024 下仍可用 | DevTools 自适应 |

---

## 7. 风险与依赖

| 风险 | 缓解 |
|---|---|
| 9 屏一次全做完代码量大 | 拆批：第一批 dashboard+product 5 屏；第二批 order+customer+marketing 4 屏 |
| 移动端逻辑直接搬到桌面布局会丢上下文 | 每屏在 ALIGNMENT/CONSENSUS/TASK 中标注移动端参照行号 |
| Element Plus 默认主题与品牌橙不完全统一 | 已在 admin-pc-merge 阶段把 `#FF4D2D` 放进 `systemMainColor[0]`，settingStore 会自动应用；不再额外覆盖 SCSS |
| art-lnb 自带的 dashboard/console 旧样板可能被误引用 | 已在 admin-pc 阶段确认无 import 引用；保留作样板 |

---

## 8. 待你确认（Q1–Q6）

每条都有默认答案，全 OK 就说"开始吧"。

| # | 问题 | 默认 |
|---|---|---|
| Q1 | 任务名 `s3-merchant-pc`，文档目录 `docs/s3-merchant-pc/`？ | 是 |
| Q2 | 9 屏按 dashboard → 4 个 product → 2 个 order → customer → marketing 顺序做，分 2 批提交？ | 是 |
| Q3 | 详情统一用 ElDrawer 右侧抽屉（而不是 ElDialog 或单独路由页）？ | 是 |
| Q4 | 表格用 ElTable + 自研薄包装（含分页、选择、空态），不引 vxe-table？ | 是 |
| Q5 | 本期只做中文，不做英文 i18n？（菜单已有中英，业务页内文案中文写死即可） | 是 |
| Q6 | 9 屏数据全部走 mock（与移动端共用 `@jiujiu/shared` 工厂），不接真后端？ | 是 |

---

## 9. 下一步

→ 用户答 Q1–Q6（或一句"开始吧"过默认） → 进 CONSENSUS / DESIGN / TASK 三件套 → 实施第一批 5 屏 → 第二批 4 屏 → 验收
