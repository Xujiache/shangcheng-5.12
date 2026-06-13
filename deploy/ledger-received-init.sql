-- ============================================================
-- 门窗利账订单「收款」字段建列 · 一次性 / 幂等可重复执行
-- ------------------------------------------------------------
-- 用途：给 "LedgerOrder" 增加 received（收款）列，支撑新的收付模型：
--       未收 = 总价(total) − 定金(deposit) − 收款(received)。
--       收款属收付跟踪，不计入利润/营收。
--
-- 为什么需要它：仓库 .gitignore 忽略了 prisma/migrations/，服务器 pull main
--       拿不到迁移文件；本脚本纯新增一列、带 IF NOT EXISTS，对现有表零改动、
--       零风险，可安全重复执行。
--
-- 旧 extraIncome（额外收入）列：本次改造已不再读写，保留该列以免历史数据丢失。
--       新代码不再把它计入利润/营收；如需彻底清理可在确认后手动 DROP（见文件末）。
--
-- 用法：
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f deploy/ledger-received-init.sql
--
-- 跑完后：在后端目录执行 `prisma generate` 重新生成客户端，再 build + 重启。
-- ============================================================

BEGIN;

ALTER TABLE "LedgerOrder"
  ADD COLUMN IF NOT EXISTS "received" INTEGER NOT NULL DEFAULT 0;

COMMIT;

-- ── 校验：确认列已存在 ────────────────────────────────────
SELECT count(*) AS has_received
FROM information_schema.columns
WHERE table_name = 'LedgerOrder' AND column_name = 'received';

-- ============================================================
-- 可选清理：确认新模型稳定、且不再需要历史额外收入数据后，再执行。
-- 默认注释掉——DROP 会永久丢失旧 extraIncome 金额。
-- ------------------------------------------------------------
-- ALTER TABLE "LedgerOrder" DROP COLUMN IF EXISTS "extraIncome";
-- ============================================================
