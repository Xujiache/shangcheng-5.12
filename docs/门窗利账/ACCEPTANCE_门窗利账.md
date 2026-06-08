# ACCEPTANCE · 门窗利账

> 6A 阶段 5/6 Automate+Assess 验收记录。分支 `feat/ledger-mp`。

## 交付物总览

| 模块               | 内容                                                                                             | 状态 |
| ------------------ | ------------------------------------------------------------------------------------------------ | ---- |
| 后端 `ledger` 域   | Prisma 6 模型 + 迁移 SQL + 鉴权/会员算法 + App 接口(`/l/*`) + 后台接口(`/p/ledger/*`) + 演示种子 | ✅   |
| admin-pc 管理      | 「门窗利账」菜单：账号管理（建号/改密/启停）+ 会员管理（增加时长/变更记录）                      | ✅   |
| 小程序 `ledger-mp` | 原生微信小程序：25 页 + 6 组件 + 自定义 tabBar + 主题/请求/图表                                  | ✅   |
| 文档               | ALIGNMENT/CONSENSUS/DESIGN/TASK/ACCEPTANCE/TODO + ledger-mp README                               | ✅   |

## 验收标准核对（对照 CONSENSUS §2）

**核心闭环（你最在意的）**

- [x] admin-pc 新建记账账号（手机号 + 初始密码，可留空生成）
- [x] admin-pc「增加会员时长」：选套餐或填天数，叠加算到期（`max(今天,当前到期)+N`，封顶 10 年）
- [x] 小程序手机号+密码登录
- [x] 未开通/过期 → 登录后进「开通会员」闸门页、功能锁死；后台加时长后重登进首页
- [x] 剩 ≤7 天登录弹提示；个人中心 + 会员中心展示套餐/到期/剩余天数

**记账功能**

- [x] 订单增删改查 + 可选成本项 + 其他开销 + 实时预计利润/利润率
- [x] 客户档案增删改 + 下单选择/新增 + 订单详情下钻客户 + 再来一单
- [x] 首页看板（周期切换 + 核心指标 + 成本占比环图 + 高利润排行 + 利润趋势）
- [x] 报表（利润/人工月度）、成本分析、经营目标、消息中心、设置三级页全链路可达

**质量 / 隔离**

- [x] 数据按账号强隔离（对抗审查确认无 IDOR）
- [x] 统一响应壳；ledger App 走独立鉴权；商城零改动
- [x] server `tsc` + admin-pc `vue-tsc` + ledger-mp `tsc` 全部干净

## 多 Agent 交叉 / 对抗验证结果

| 维度                  | Agent 结论                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| 后端安全/隔离（对抗） | **零 P0 / 零 P1**。数据隔离严密、会员闸门无法绕过、跨域鉴权双向拒绝、时长算法正确。"隔离做得相当好" |
| 前后端契约一致性      | **mp↔后端、admin↔后端 完全一致**；仅 3 个无运行时影响的 TS 类型小注释                               |
| 小程序运行时/导航     | **可在微信开发者工具编译运行，无死链/空渲染崩溃**；导航/组件/图标/tab/鉴权闸门全 CLEAN              |

### 已根据审查修复的 P2 健壮性项

- 订单日期 `@IsDateString` + 服务端 `isNaN` 守卫（消除唯一的非法日期 → 500 崩溃点）
- `extras` 限 50 条 / 类型名 20 字；金额 `@Max(1万亿)`；备注/昵称/地址 `@MaxLength`（防自体 DoS / 行膨胀）
- 会员到期叠加封顶 now+10 年
- `getCustomer` 同名客户只兜底无 customerId 的历史订单，避免串档
- 小程序：`dnd` 孤立页已从「通知提醒」接入入口

## 编译验证命令（可复现）

```bash
pnpm --filter @jiujiu/server   typecheck    # 仅预存 jest 测试文件报 @jest/globals（与本任务无关）
pnpm --filter @jiujiu/admin-pc exec vue-tsc --noEmit   # exit 0
pnpm --filter @jiujiu/ledger-mp typecheck    # exit 0
```

## 未做端到端运行验证的说明（环境受限）

> ⚠️ 本节为**首版交付时**的状态。**2026-06-08 增量已补做真实端到端冒烟（26/26 通过，见上「2026-06-08 增量 · 验证」）**，后端不再是"未运行验证"。仅小程序 UI 仍需微信开发者工具人工走查。

- **本地无 PostgreSQL**（docker 未启动）→ 未实跑 `migrate deploy` / `seed` / 接口冒烟。迁移 SQL 已生成归档，DB 起来即可应用。
- **小程序无法在此环境渲染**（需微信开发者工具）→ 以 `tsc` + 结构完整性 + 三路对抗审查替代运行验证。
- 详见 [TODO](./TODO_门窗利账.md) 的落地步骤。

---

## 2026-06-08 增量 · 全量接入真实后端（消除所有假数据 / 本地占位）

**目标**：小程序内所有"假数据 / 本地态"页面全部接入真实后端，零虚假数据。

### 新增后端（与商城仍零耦合）

- **3 张 Prisma 表**：`LedgerNotification`（消息中心）、`LedgerFeedback`（反馈 / 注销 / 换号申请）、`LedgerSetting`（通知 / 免打扰 / 隐私偏好，每账号一行）。
- **迁移**：`prisma/migrations/20260608120000_ledger_notify_setting_feedback/migration.sql`（人工归档，与 init 同风格）。
- **App 接口（`/l/*`，仅登录，不需会员）**：`GET notifications`、`GET notifications/unread-count`、`POST notifications/:id/read`、`POST notifications/read-all`、`GET/PUT settings`、`POST feedback`。
- **后台接口（`/p/ledger/*`，平台/超管）**：`POST users/:id/notify`（推送通知）、`GET feedback`（列表）、`PATCH feedback/:id`（处理/回复）。
- **真实事件驱动**：录单成功 → 自动写"订单已保存"通知；后台开通/续费会员 → 自动写会员通知。`seed` 为演示账号写入 4 条真实通知 + 默认设置。

### 小程序改造（8 处占位 → 真后端）

消息中心（SEED→真实列表+已读同步）、通知开关 / 免打扰 / 隐私偏好（→`/l/settings` 持久化）、意见反馈（→真入库）、首页未读红点（→真实未读数）、数据导出（→拉真实订单+客户到剪贴板）、清缓存（→读真实本地存储）、注销（→真实提交申请）、检查更新（→微信 `UpdateManager`）、头像色（→持久化 `avatar`）。

### admin-pc 闭环

新增「门窗利账 · 意见反馈」管理页（查看/筛选/处理/回复，路由 `PlatformLedgerFeedback` + zh/en i18n）；账号页加「发送通知」入口与弹窗。

### 验证

- 三端类型检查全绿：`server tsc`（src 干净）/ `admin-pc vue-tsc` exit 0 / `ledger-mp tsc` exit 0。
- Prisma client 已 `prisma generate` 重新生成（含 3 新模型）。
- 三路对抗审查：后端（路由无碰撞、隔离无 IDOR、迁移与 schema 一致、seed 合法）**clean**；小程序↔后端契约**clean**；admin-pc 发现并修复 1 个 P3（反馈「仅保存备注」误改状态 → 改为不传 status）。
- **真实端到端冒烟（live，PostgreSQL）：26/26 全通过**。覆盖：登录+会员、通知列表/未读数/标记已读/全部已读、设置默认+更新+持久化+非法值校验拒绝(400)、头像持久化、反馈入库+空内容拒绝、录单自动生成「订单已保存」通知、利润计算(30000−18500=11500)、IDOR(乱 id 不崩)、后台 admin 推送通知→用户侧可见、后台反馈列表+标记已处理、跨域 mall token 访问 ledger App 被拒(2001)。
  - 复现：起 `docker-compose.dev.yml` → `prisma db push` → `SEED_DEFAULT_PASSWORD=... prisma:seed` → `npm run start`（:3001）→ 对 `/api/v1/l/*` 与 `/api/v1/p/ledger/*` 跑接口断言。
