# CONSENSUS · 门窗利账

> 6A 阶段 1 收尾。基于 [ALIGNMENT](./ALIGNMENT_门窗利账.md) 的需求与 D1–D4 决策，形成可执行共识。

## 1. 需求描述（精确版）

交付一个**原生微信小程序记账端** + 配套**后端 ledger 域** + **admin-pc 后台管理**，使得：

1. 门窗店主用手机号+密码登录小程序，录入订单（总价 + 5 类成本 + 其他开销），自动算利润，看月/季/年报表与客户档案。
2. 应用为**会员制**：账号是否可用取决于会员是否在有效期内；过期/未开通则进入会员闸门页、功能锁定。
3. **管理员（你）在 admin-pc**：创建/禁用记账账号、重置密码；为账号**增加会员时长**（叠加天数），查看到期状态。

## 2. 验收标准（可测试）

**核心闭环（最高优先，对应用户最在意的需求）**

- [ ] admin-pc 能新建一个记账账号（手机号 + 初始密码），列表可见。
- [ ] admin-pc 能给该账号「增加会员时长」：选套餐或填天数，到期日按 `max(今天,当前到期)+N` 叠加，列表显示新到期日与剩余天数。
- [ ] 小程序用该手机号+密码可登录。
- [ ] 未开通/已过期时，登录后进入「开通会员」闸门页，记账功能不可达；后台加够时长后，重登可正常进入首页。
- [ ] 剩余 ≤7 天时，登录弹出到期提示；个人中心与会员中心页正确显示套餐 + 到期日 + 剩余天数。

**记账功能**

- [ ] 订单增删改查；成本项可按需开启/移除；其他开销可增删；实时预计利润/利润率。
- [ ] 客户档案增删改 + 下单时选择/新增；订单详情可下钻客户。
- [ ] 首页看板（周期切换 + 核心指标 + 成本占比环形图 + 高利润排行 + 利润趋势）数据与订单实时联动。
- [ ] 报表（月度利润 / 月度人工）、成本分析、经营目标、消息中心、设置三级页全链路可达可回。

**质量/隔离**

- [ ] A 账号绝不能读到 B 账号的订单/客户（后端强制 scope，附测试）。
- [ ] 统一响应壳；ledger App 接口走独立鉴权；商城业务零改动、零回归。
- [ ] server `tsc` + admin-pc `vue-tsc` 干净；小程序在微信开发者工具可正常预览。

## 3. 技术方案（锁定）

- **小程序**：原生微信小程序（TypeScript），`packages/ledger-mp`，自带 `project.config.json` / `app.json` / 分包；主题 token 还原设计（teal `#0E7C66`、Noto Sans SC、浅色为主，深色后置）；图表用 canvas（`ec-canvas`/F2 或手写）。
- **后端**：`packages/server/src/modules/ledger/`，新增 Prisma `Ledger*` 模型（同库不同表），`ledger.controller.ts`（App，`/api/v1/l/*`，`LedgerJwtGuard`）+ `ledger-admin.controller.ts`（后台，`/api/v1/p/ledger/*`，复用全局 `JwtAuthGuard`+`RolesGuard('platform')`）。
- **admin-pc**：新增「门窗利账」菜单（账号管理 + 会员管理），复用现有 http 封装、表格/表单组件、MenuProcessor 角色过滤。
- **鉴权隔离**：ledger App 用户 JWT 带 `scope:'ledger'` + `sub=ledgerUserId`；全局 `JwtAuthGuard` 对 `scope:'ledger'` 放行交给 `LedgerJwtGuard`，或 ledger App 路由 `@Public` 跳过全局守卫后由 `LedgerJwtGuard` 接管（DESIGN 定细节）。

## 4. 集成约束

- 不改商城任何表/接口/前端；新模型一律 `Ledger` 前缀，避免命名碰撞。
- 复用：统一响应拦截器、异常过滤器、`JwtService`、限流、MinIO（头像上传，可选）。
- 路由前缀沿用风格：App `/l`、后台 `/p/ledger`。

## 5. 任务边界

- 一次性把**数据域 + 鉴权 + 后台管理 + 小程序闸门**打通（Phase 0–1）为第一交付里程碑；记账核心与报表外围（Phase 2–3）随后；打磨上架（Phase 4）最后。详见 [TASK](./TASK_门窗利账.md)。

---

**相关**：[ALIGNMENT](./ALIGNMENT_门窗利账.md) · [DESIGN](./DESIGN_门窗利账.md) · [TASK](./TASK_门窗利账.md)
