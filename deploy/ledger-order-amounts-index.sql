-- 必须由 psql 单独执行、保持 autocommit；不得包裹在 BEGIN/COMMIT 中。
CREATE INDEX CONCURRENTLY IF NOT EXISTS "LedgerOrder_userId_profitAmount_date_idx"
  ON "LedgerOrder" ("userId", "profitAmount", "date");
