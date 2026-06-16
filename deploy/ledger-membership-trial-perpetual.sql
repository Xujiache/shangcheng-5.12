-- 门窗利账 · 会员：永久会员 + 体验卡一次性。幂等，生产库执行一次。
ALTER TABLE "LedgerMembership" ADD COLUMN IF NOT EXISTS "perpetual" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LedgerMembership" ADD COLUMN IF NOT EXISTS "trialClaimedAt" TIMESTAMP(3);
