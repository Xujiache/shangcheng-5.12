-- 金属报价单。需先创建 LedgerUser；重复执行安全。
CREATE TABLE IF NOT EXISTS "LedgerMetalQuote" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "customerId" TEXT,
  "items" JSONB NOT NULL,
  "totalWeightKg" DOUBLE PRECISION NOT NULL,
  "totalAmountFen" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "LedgerMetalQuote_userId_createdAt_idx"
  ON "LedgerMetalQuote" ("userId", "createdAt");
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LedgerMetalQuote_userId_fkey'
  ) THEN
    ALTER TABLE "LedgerMetalQuote"
      ADD CONSTRAINT "LedgerMetalQuote_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "LedgerUser"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
