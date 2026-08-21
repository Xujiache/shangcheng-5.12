-- 门窗利账 · 日工明细表（可重复执行）
-- 独立台账，不关联订单成本；按 userId 隔离，账号删除时级联清理。
CREATE TABLE IF NOT EXISTS "LedgerWorkLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "workDate" TIMESTAMP(3) NOT NULL,
  "workerName" TEXT NOT NULL,
  "jobType" TEXT,
  "unit" TEXT NOT NULL,
  "quantity" DECIMAL(8,2) NOT NULL,
  "unitPrice" INTEGER NOT NULL,
  "amount" INTEGER NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "LedgerWorkLog_userId_workDate_idx"
  ON "LedgerWorkLog" ("userId", "workDate");

DO $$ BEGIN
  ALTER TABLE "LedgerWorkLog"
    ADD CONSTRAINT "LedgerWorkLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "LedgerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

SELECT
  to_regclass('"LedgerWorkLog"') AS table_exists,
  to_regclass('"LedgerWorkLog_userId_workDate_idx"') AS index_exists;
