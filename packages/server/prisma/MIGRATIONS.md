# Prisma Migrations 策略（速查）

> 详细背景与 41 个 model 清单见同目录 `README.md`。本文件是日常操作的精简速查卡。

---

## 1. 现状（schema-only 同步）

- `schema.prisma` 是唯一真理来源（single source of truth）。
- 当前 `migrations/` 目录 **未纳入 git**（仓库根 `.gitignore` 排除 `packages/server/prisma/migrations/`）。
- 日常本地开发用 `prisma db push`：直接把 schema 推进 DB，**不产生迁移历史文件**。
- 结果：迭代快，但**生产环境无可审计的 schema 变更记录**，schema 漂移风险高。

| 当前命令                | 是否产 migration | 是否安全用在生产   |
| ----------------------- | ---------------- | ------------------ |
| `prisma db push`        | ❌               | ❌ 严禁            |
| `prisma migrate dev`    | ✅               | ❌ 会 reset 数据库 |
| `prisma migrate deploy` | —                | ✅ 推荐            |

---

## 2. 首次基线化（baseline，仅一次性）

> 强烈建议**正式发版前**完成一次 baseline，把当前 schema 锁成第一个 migration。

```bash
# Step 1：解除 .gitignore 对 migrations/ 的排除
#   修改仓库根 .gitignore，删除：packages/server/prisma/migrations/

# Step 2：在本地生成 baseline SQL（不连库执行）
pnpm prisma:migrate-init
#   等价于：pnpm --filter @jiujiu/server prisma migrate dev --name init --create-only

# Step 3：提交生成的 migration
git add packages/server/prisma/migrations/<timestamp>_init/
git commit -m "chore(prisma): baseline migration"

# Step 4：在现网库标记 baseline 已应用（不再实际跑 SQL）
pnpm --filter @jiujiu/server prisma migrate resolve --applied <timestamp>_init
```

---

## 3. 后续迭代命令（日常 schema 改动）

```bash
# 1. 改 packages/server/prisma/schema.prisma
# 2. 本地生成 migration + 推到本地 DB
pnpm --filter @jiujiu/server prisma migrate dev --name <change_summary>
#    例：pnpm --filter @jiujiu/server prisma migrate dev --name add_user_locale

# 3. 提交 schema.prisma + migrations/<ts>_<name>/migration.sql
git add packages/server/prisma/schema.prisma packages/server/prisma/migrations/
git commit -m "feat(db): add user.locale field"
```

---

## 4. 生产部署命令

```bash
# CI / 服务器发版阶段执行（不交互、不会 reset 数据）
pnpm prisma:deploy
#   等价于：pnpm --filter @jiujiu/server prisma migrate deploy
```

部署链路建议：

```
镜像构建 → prisma generate（编译期）
       ↓
容器启动前置 init container 跑 prisma migrate deploy
       ↓
应用启动
```

---

## 5. 备份建议

| 时机                              | 操作                                                                                    | 备注                              |
| --------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------- |
| **每次 prisma migrate deploy 前** | `mysqldump --single-transaction --routines --triggers -u xxx -p <db> > backup-<ts>.sql` | InnoDB 一致性快照，对线上无锁影响 |
| **每日定时**                      | logical dump → 异地 OSS / S3，保留 14 天                                                | RPO ≤ 24h                         |
| **重大 schema 变更前**            | 物理快照 / 云厂商 RDS 手动备份                                                          | 出问题可秒级回滚                  |
| **不可重跑的破坏性迁移**          | 先在 staging 库回放完整 migration，验证幂等                                             | 例如 DROP COLUMN / 数据类型变更   |

---

## 6. 常见陷阱

1. ❌ **生产环境跑 `prisma migrate dev`** — 它会 reset 数据库
2. ❌ **生产环境用 `prisma db push` 改 schema** — 没有迁移记录，无法回滚审计
3. ❌ **baseline → deploy 链路走通后又混用 `db push`** — migration history 会与实际 schema 漂移
4. ✅ **CI/CD 强制校验**：在生产 deploy 之前加 `NODE_ENV=production` 防误操作
5. ✅ **migration 命名要语义化**：`add_user_locale` 远比 `update_schema_v2` 易追溯
