# @jiujiu/server — 经纬科技 5.0 后端

NestJS 10 + Prisma + PostgreSQL + Redis + MinIO + socket.io。是整个 monorepo 的**唯一后端**，四端前端与门窗利账小程序都连它。

## 路由域（按前缀划分命名空间）

| 前缀                               | 模块         | 面向                                                                    |
| ---------------------------------- | ------------ | ----------------------------------------------------------------------- |
| `/api/v1/u/*`                      | user-mp      | 用户端：商品/购物车/下单支付/优惠券/推广                                |
| `/api/v1/m/*`                      | merchant     | 商家端：dashboard/商品/订单/售后/佣金/提现/会员                         |
| `/api/v1/p/*`                      | platform     | 平台端：审核/广告/会员套餐/功能开关/退款提现                            |
| `/api/v1/l/*`                      | ledger       | 门窗利账独立域（LedgerUser 与 User 零耦合、独立 JWT secret + 会员闸门） |
| `/api/v1/auth/*` `/api/v1/files/*` | auth / files | 共享：登录刷新 / MinIO 上传                                             |

11 个业务模块：auth · files · user-mp · merchant · platform · chat（WS 客服）· sms · payment（微信支付 v3）· legal · app-release · ledger。

## 全局基建（src/common, src/main.ts, app.module.ts）

- 统一响应壳 `{ code, data, message, msg, traceId, timestamp }`（`response.interceptor`）
- JWT 双 token（access 2h / refresh 7d，refresh 打 `_r` 标记拒用于业务）+ 60s 用户状态 LRU 缓存（`jwt.guard`）
- 角色别名 `expandRole`（`roles.guard`）；BizCode 业务码（`biz.exception`，与 shared `ErrorCode` 对齐）
- 限流单桶 + 端点级 `@Throttle`；CORS 生产必配否则 exit、Swagger 生产关、helmet 可选

## 命令

```bash
pnpm --filter @jiujiu/server start:dev      # 本机开发（默认 3001）
pnpm --filter @jiujiu/server typecheck      # tsc --noEmit
pnpm --filter @jiujiu/server test           # jest 单测（CI 硬门禁）
pnpm --filter @jiujiu/server test:integration  # 连真实 PG+Redis 的集成测试
pnpm --filter @jiujiu/server exec prisma db push   # 按 schema 建表（migrations 已 gitignore）
pnpm --filter @jiujiu/server prisma:seed    # 种子数据（需先设 SEED_DEFAULT_PASSWORD ≥8 位）
pnpm --filter @jiujiu/server prisma:studio  # 数据浏览
```

## 数据与配置

- 数据模型唯一 SSOT：`prisma/schema.prisma`（40+ 模型，含 13 张 `Ledger*` 表）。
- **`prisma/migrations` 被 .gitignore**：生产/新库建表用 `prisma db push` + `deploy/*.sql` 补丁（顺序见 [`deploy/README.md`](../../deploy/README.md)）。
- 环境变量：根 [`.env.example`](../../.env.example) 为模板（DB/Redis/JWT/微信支付/短信/MinIO/ledger/AI 生图/分享）。敏感值放 `.env`，不入库。
- Swagger（仅非生产）：`/api/docs`。
