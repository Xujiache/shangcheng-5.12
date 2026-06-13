-- ============================================================
-- 门窗利账·优化下料「云端历史方案」建表 · 一次性 / 幂等可重复执行
-- ------------------------------------------------------------
-- 用途：新建 "LedgerCutPlan" 表（含 userId→LedgerUser 级联外键 + (userId,updatedAt) 索引），
--       支撑优化下料方案的云端保存 / 列表 / 继续编辑 / 删除。
--       material ∈ profile|glass|board；input/summary 为 JSONB（service 侧做体积上限保护）。
--
-- 为什么需要它：仓库 .gitignore 忽略了 prisma/migrations/，服务器 pull main
--       拿不到迁移文件；本脚本纯新增一张表 + 索引，带 IF NOT EXISTS，
--       对现有表零改动、零风险，可安全重复执行。
--
-- 用法：
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f deploy/ledger-cutplan-init.sql
--
-- 跑完后：在后端目录执行 `prisma generate` 重新生成客户端，再 build + 重启。
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS "LedgerCutPlan" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "material"  TEXT NOT NULL,
  "input"     JSONB NOT NULL,
  "summary"   JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LedgerCutPlan_pkey" PRIMARY KEY ("id")
);

-- (userId, updatedAt) 复合索引：列表按用户隔离 + updatedAt 倒序取最新
CREATE INDEX IF NOT EXISTS "LedgerCutPlan_userId_updatedAt_idx"
  ON "LedgerCutPlan" ("userId", "updatedAt");

-- userId 外键：账号删除时级联清理其全部方案（与 Prisma onDelete: Cascade 一致）
-- 幂等：约束已存在则跳过（pg 无 ADD CONSTRAINT IF NOT EXISTS，用 DO 块兜底）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'LedgerCutPlan_userId_fkey'
      AND table_name = 'LedgerCutPlan'
  ) THEN
    ALTER TABLE "LedgerCutPlan"
      ADD CONSTRAINT "LedgerCutPlan_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "LedgerUser"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;

-- ── 校验：确认表与索引已存在 ──────────────────────────────
SELECT
  to_regclass('"LedgerCutPlan"')                        AS table_exists,
  to_regclass('"LedgerCutPlan_userId_updatedAt_idx"')   AS index_exists;
