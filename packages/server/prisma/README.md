# Prisma Schema & 迁移策略

本目录承载经纬科技后端的 Prisma schema、本地开发种子脚本，以及（推荐）生产环境的迁移历史。

---

## 现状速览

- `schema.prisma` 是唯一真理来源（single source of truth），覆盖 41 个 model，下文有清单。
- `seed.ts` 是本地开发种子脚本（`pnpm prisma:seed`）。
- `migrations/` 目录 **当前被 `.gitignore` 排除**（仓库根 `.gitignore` 第 69 行：`packages/server/prisma/migrations/`），团队目前依赖：
  - **本地开发**：`pnpm --filter @jiujiu/server prisma db push`（直接把 schema 写入 DB，不生成迁移历史）
  - **本地预览数据**：`pnpm --filter @jiujiu/server prisma:seed`（写入演示数据）
- 这种模式优点是迭代快，缺点是 **生产环境没有可审计的 schema 变更历史**，schema 漂移风险高。

---

## 生产环境推荐路径

> 强烈建议在准备首次正式发版前完成一次"基线化"（baseline），把当前 schema 锁成第一个 migration。

### Step 1：移除 `.gitignore` 中的 `packages/server/prisma/migrations/` 行

让后续 migration 文件能被 git 跟踪。

### Step 2：生成 baseline migration（不实际执行）

```bash
pnpm prisma:migrate-init
# 等价于：pnpm --filter @jiujiu/server prisma migrate dev --name init --create-only
```

`--create-only` 表示**只生成 SQL 文件，不连数据库执行**。这样在没有真实 DB 连接的环境（如 CI 镜像构建）也能产出 migration 工件。

生成的文件位于：`packages/server/prisma/migrations/<timestamp>_init/migration.sql`，应该一起提交进 git。

### Step 3：生产首次部署

```bash
# 在已有数据但还未跟踪 migration 的现网库上，使用 baseline 标记
pnpm --filter @jiujiu/server prisma migrate resolve --applied <timestamp>_init

# 之后每次发版执行 deploy（不需要交互、不会因为 dev-only 行为破坏数据）
pnpm prisma:deploy
# 等价于：pnpm --filter @jiujiu/server prisma migrate deploy
```

### Step 4：后续 schema 修改的标准流程

```bash
# 1. 改 schema.prisma
# 2. 本地生成迁移 + 推到本地 DB
pnpm --filter @jiujiu/server prisma migrate dev --name <change_summary>
# 3. 提交 schema.prisma + 新的 migrations/<ts>_<name>/migration.sql
# 4. CI / 生产构建后调 `pnpm prisma:deploy` 在远程 DB 应用
```

---

## 快捷脚本（在仓库根 `package.json` 的 `scripts` 中暴露）

| 脚本                                           | 用途                                      | 何时使用            |
| ---------------------------------------------- | ----------------------------------------- | ------------------- |
| `pnpm prisma:migrate-init`                     | 生成首个 baseline 迁移（不执行 SQL）      | 仅一次性使用        |
| `pnpm prisma:deploy`                           | 在远程 / 生产 DB 顺序执行所有未应用的迁移 | 生产部署            |
| `pnpm --filter @jiujiu/server prisma:generate` | 重新生成 Prisma Client                    | schema 改了之后     |
| `pnpm --filter @jiujiu/server prisma:studio`   | 启动 Prisma Studio 可视化数据             | 本地排查            |
| `pnpm --filter @jiujiu/server prisma:seed`     | 写入本地演示数据                          | 本地起一个干净的 DB |

---

## 当前 schema 模型清单（41 个 model）

按业务域分组：

**用户 / 鉴权（3）**：`User`、`Address`、`SmsCode`

**商户体系（4）**：`Merchant`、`Store`、`Staff`、`ShopDecorate`

**商品 / 分类（4）**：`Category`、`Product`、`Sku`、`Favorite`

**购物车 / 订单（5）**：`CartItem`、`Order`、`OrderItem`、`Payment`、`Refund`

**佣金 / 提现（3）**：`CommissionRule`、`Commission`、`Withdraw`

**预约 / 营销（4）**：`Booking`、`Coupon`、`FlashSale`、`GroupBuy`

**在线客服（3）**：`ChatSession`、`ChatMessage`、`QuickReply`

**广场 / 入驻（2）**：`PlazaPush`、`AgencyApplication`

**广告位（2）**：`AdSlot`、`AdCreative`

**会员订阅（5）**：`MemberPlan`、`MerchantMembership`、`UsageQuota`、`PaymentRecord`、`FeatureFlag`

**功能开关 / 审计（3）**：`MerchantFeatureOverride`、`AuditRecord`、`AdminRole`

**系统配置 / 上传 / 发布（3）**：`SystemConfig`、`UploadedFile`、`AppRelease`

> 完整字段定义见 `schema.prisma`。

---

## 常见陷阱

1. **生产环境永远不要跑 `prisma migrate dev`** —— 它会 reset 数据库
2. **不要用 `prisma db push` 在生产环境改 schema** —— 没有迁移记录
3. **`baseline → deploy` 链路一旦走通，不要再混用 `db push`**，否则 migration history 会和实际 schema 漂移
4. 当 `.env` 里的 `DATABASE_URL` 指向非生产库时，所有命令才是安全的；务必在 CI/CD 里加 `NODE_ENV=production` 校验来防误操作
