-- HarmonyOS NEXT 商家端增量生产建表脚本。
--
-- 仅增加 Harmony Push/IAP 所需表、字段和索引，不删除或重写现有数据。
-- 可重复执行；请先在同一版本的服务端候选上完成 smoke:prod，再在维护窗口执行。

BEGIN;

ALTER TABLE "MemberPlan"
  ADD COLUMN IF NOT EXISTS "huaweiProductId" TEXT,
  ADD COLUMN IF NOT EXISTS "huaweiProductType" TEXT;

ALTER TABLE "MerchantMembership"
  ADD COLUMN IF NOT EXISTS "provider" TEXT,
  ADD COLUMN IF NOT EXISTS "providerSubscriptionId" TEXT;

ALTER TABLE "PaymentRecord"
  ADD COLUMN IF NOT EXISTS "providerOrderId" TEXT,
  ADD COLUMN IF NOT EXISTS "purchaseToken" TEXT;

CREATE TABLE IF NOT EXISTS "HarmonyPushDevice" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "deviceId" TEXT,
  "locale" TEXT DEFAULT 'zh-CN',
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HarmonyPushDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "HarmonyPushPreference" (
  "merchantId" TEXT NOT NULL,
  "orders" BOOLEAN NOT NULL DEFAULT TRUE,
  "refunds" BOOLEAN NOT NULL DEFAULT TRUE,
  "chat" BOOLEAN NOT NULL DEFAULT TRUE,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HarmonyPushPreference_pkey" PRIMARY KEY ("merchantId")
);

CREATE TABLE IF NOT EXISTS "HarmonyIapOrder" (
  "id" TEXT NOT NULL,
  "orderNo" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productType" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'CNY',
  "status" TEXT NOT NULL DEFAULT 'prepared',
  "purchaseToken" TEXT,
  "providerOrderId" TEXT,
  "purchaseData" JSONB,
  "verifiedAt" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HarmonyIapOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HarmonyPushDevice_token_key"
  ON "HarmonyPushDevice"("token");
CREATE INDEX IF NOT EXISTS "HarmonyPushDevice_merchantId_enabled_idx"
  ON "HarmonyPushDevice"("merchantId", "enabled");
CREATE INDEX IF NOT EXISTS "HarmonyPushDevice_userId_idx"
  ON "HarmonyPushDevice"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "HarmonyIapOrder_orderNo_key"
  ON "HarmonyIapOrder"("orderNo");
CREATE UNIQUE INDEX IF NOT EXISTS "HarmonyIapOrder_purchaseToken_key"
  ON "HarmonyIapOrder"("purchaseToken");
CREATE UNIQUE INDEX IF NOT EXISTS "HarmonyIapOrder_providerOrderId_key"
  ON "HarmonyIapOrder"("providerOrderId");
CREATE INDEX IF NOT EXISTS "HarmonyIapOrder_merchantId_status_idx"
  ON "HarmonyIapOrder"("merchantId", "status");
CREATE INDEX IF NOT EXISTS "HarmonyIapOrder_userId_idx"
  ON "HarmonyIapOrder"("userId");
CREATE INDEX IF NOT EXISTS "HarmonyIapOrder_planId_idx"
  ON "HarmonyIapOrder"("planId");

CREATE UNIQUE INDEX IF NOT EXISTS "MemberPlan_huaweiProductId_key"
  ON "MemberPlan"("huaweiProductId");
CREATE UNIQUE INDEX IF NOT EXISTS "MerchantMembership_providerSubscriptionId_key"
  ON "MerchantMembership"("providerSubscriptionId");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentRecord_providerOrderId_key"
  ON "PaymentRecord"("providerOrderId");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentRecord_purchaseToken_key"
  ON "PaymentRecord"("purchaseToken");

CREATE TABLE IF NOT EXISTS "HarmonyIapNotification" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "notificationType" TEXT NOT NULL,
  "notificationSubtype" TEXT,
  "environment" TEXT NOT NULL,
  "purchaseToken" TEXT,
  "providerOrderId" TEXT,
  "orderId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'processing',
  "payload" JSONB NOT NULL,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HarmonyIapNotification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "HarmonyIapNotification_requestId_key"
  ON "HarmonyIapNotification"("requestId");
CREATE INDEX IF NOT EXISTS "HarmonyIapNotification_status_createdAt_idx"
  ON "HarmonyIapNotification"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "HarmonyIapNotification_purchaseToken_idx"
  ON "HarmonyIapNotification"("purchaseToken");
CREATE INDEX IF NOT EXISTS "HarmonyIapNotification_providerOrderId_idx"
  ON "HarmonyIapNotification"("providerOrderId");

COMMIT;
