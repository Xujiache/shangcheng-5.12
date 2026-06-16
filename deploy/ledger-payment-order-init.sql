-- 门窗利账 · 会员在线支付订单表（v1.0.3：用户直接付款 → 微信回调自动开通会员）
-- 部署：生产库执行一次
CREATE TABLE IF NOT EXISTS "LedgerPaymentOrder" (
  "id" TEXT PRIMARY KEY,
  "outTradeNo" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  "planKey" TEXT NOT NULL,
  "days" INTEGER NOT NULL,
  "amountFen" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "transactionId" TEXT,
  "paidAt" TIMESTAMP(3),
  "grantedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "LedgerPaymentOrder_userId_idx" ON "LedgerPaymentOrder" ("userId");
CREATE INDEX IF NOT EXISTS "LedgerPaymentOrder_status_idx" ON "LedgerPaymentOrder" ("status");
-- 外键（与 prisma 模型一致；用户删除时级联清理支付订单）
DO $$ BEGIN
  ALTER TABLE "LedgerPaymentOrder"
    ADD CONSTRAINT "LedgerPaymentOrder_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "LedgerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
