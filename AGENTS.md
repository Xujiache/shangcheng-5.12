# AGENTS.md — 经纬科技 5.0 工程协作指南

> 给在本仓库工作的 AI/工程师的速查。本项目是 **NestJS + Prisma + TypeScript 的 pnpm monorepo**。
> ⚠️ 本仓库与「O2O 外卖跑腿平台」无关：**不要套用任何 Java / Spring / BizCode-Java / Maven 假设**。

## 仓库结构（7 个 workspace 包）

| 包                     | 角色                                                  | 技术                                                        |
| ---------------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| `@jiujiu/shared`       | 全栈唯一契约源：TS 类型 / design tokens / mock / 工具 | TS + tsup                                                   |
| `@jiujiu/server`       | 唯一后端，4 路由域 + 11 模块                          | NestJS 10 + Prisma + PostgreSQL + Redis + MinIO + socket.io |
| `@jiujiu/user-mp`      | 用户端（微信小程序/H5/App）                           | uni-app + Vue3 + Pinia                                      |
| `@jiujiu/merchant-app` | 商家 App（Android/iOS/H5）                            | uni-app + Vue3 + Pinia                                      |
| `@jiujiu/platform-app` | 平台运营 App                                          | uni-app + Vue3 + Pinia                                      |
| `@jiujiu/admin-pc`     | 一体化 PC 管理后台（三合一智能登录）                  | Vue3 + Element Plus + Tailwind + Vite                       |
| `@jiujiu/ledger-mp`    | 门窗利账·**原生**微信小程序（不依赖 shared）          | 原生小程序 TS + Canvas                                      |

后端路由域按前缀划分命名空间：`/api/v1/u/*`（用户）、`/m/*`（商家）、`/p/*`（平台）、`/l/*`（门窗利账，独立域）、`/auth/*` `/files/*`（共享）。四端前端默认连 `https://ewsn.top`。

## 关键约定（动代码前必读）

- **统一响应壳**：成功一律 HTTP 200，`{ code:0, data, message, msg, traceId, timestamp }`（`message`/`msg` 双字段冗余）。契约源在 `@jiujiu/shared` 的 `ApiResult` / `ErrorCode`，后端 `response.interceptor` / `biz.exception` 与之对齐。
- **JWT 双 token**：accessToken 2h + refreshToken 7d；refresh 打 `_r` 标记，禁止用于业务接口（`jwt.guard.ts`）。
- **角色别名** `expandRole`：`factory/store→merchant`、`admin→platform`、`super-admin→全部`；`RolesGuard` 仅在 `@Roles()` 路由生效。
- **限流单桶**：`ThrottlerModule` 只注册 default 桶，端点级用 `@Throttle` 覆盖。**绝不注册多桶**（v6 多桶会被最严桶卡死全站）。
- **微信支付回调**：`@Public + @SkipResponseWrap + rawBody 验签 + outTradeNo 幂等 + ±5min 防重放`，缺一不可；密钥缺失必须 fail，绝不 mock 放行金额。
- **金额**：服务端按 tier/SKU 重算，绝不信前端传值；下单库存扣减用事务内原子 `updateMany(where stock>=qty)`。
- **Prisma migrations 被 .gitignore**：生产建表用 `prisma db push` + `deploy/*.sql` 补丁（见 `deploy/README.md`），不要依赖 `migrate deploy` 跑迁移历史。
- **敏感信息放 `.env`，不提交 git**（`.env.example` 仅占位）。

## 常用命令

```bash
pnpm install
pnpm build:shared          # 其它包依赖 shared，先构建
pnpm typecheck             # pnpm -r typecheck（CI 硬门禁）
pnpm lint                  # pnpm -r lint（CI 硬门禁；admin-pc 真 eslint，server 为 prettier --check）
pnpm test:server           # 后端 jest（CI 硬门禁）
pnpm dev:server            # 本机 3001
pnpm dev:admin-pc          # 5173
```

ledger-mp 是原生小程序，用微信开发者工具导入 `packages/ledger-mp`，不走 `pnpm dev`；仅 `pnpm --filter @jiujiu/ledger-mp typecheck` 纳入校验。

## 工作流与提交

- 遵循 6A 流程，产物放 `docs/任务名/`（见根 `CLAUDE.md` 与 `docs/README.md`）。
- commit 用 conventional 风格，结尾带 `Co-Authored-By`。husky pre-commit 跑 lint-staged（admin-pc 文件会跑 eslint --fix + stylelint）。
- `feat/ledger-mp` 分支的 ledger 改动可直接推该分支；**不主动合并 main**。
