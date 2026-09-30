-- psql 单独执行，保持 autocommit；CREATE INDEX CONCURRENTLY 不得放进事务。
-- Prisma 5 不支持部分索引；该索引由本 SQL 管理，不属于全库 db push。
CREATE INDEX CONCURRENTLY IF NOT EXISTS "LedgerOrder_userId_amounts_missing_idx"
  ON "LedgerOrder" ("userId")
  WHERE "revenueAmount" IS NULL OR "costAmount" IS NULL OR "profitAmount" IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "LedgerCustomer_userId_name_idx"
  ON "LedgerCustomer" ("userId", "name");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "LedgerOrder_userId_customerName_date_idx"
  ON "LedgerOrder" ("userId", "customerName", "date");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "LedgerOrder_userId_customerId_date_idx"
  ON "LedgerOrder" ("userId", "customerId", "date");
