-- 增量、可重复执行；先于包含 LedgerOrder 派生字段的新服务上线。
ALTER TABLE "LedgerOrder" ADD COLUMN IF NOT EXISTS "revenueAmount" BIGINT;
ALTER TABLE "LedgerOrder" ADD COLUMN IF NOT EXISTS "costAmount" BIGINT;
ALTER TABLE "LedgerOrder" ADD COLUMN IF NOT EXISTS "profitAmount" BIGINT;
