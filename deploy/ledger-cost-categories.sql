-- ============================================================
-- 门窗利账·常用成本分类 · 一次性 / 幂等可重复执行
-- 用法：
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f deploy/ledger-cost-categories.sql
-- ============================================================

BEGIN;

ALTER TABLE "LedgerSetting"
  ADD COLUMN IF NOT EXISTS "costCategories" JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMIT;

SELECT count(*) AS has_cost_categories
FROM information_schema.columns
WHERE table_name = 'LedgerSetting' AND column_name = 'costCategories';
