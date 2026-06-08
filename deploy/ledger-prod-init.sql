-- ============================================================
-- 门窗利账（ledger）生产库建表脚本 · 一次性 / 幂等可重复执行
-- ------------------------------------------------------------
-- 用途：生产后端首次上线 main（含 ledger 域）前，在生产 PostgreSQL
--       建好全部 9 张 Ledger* 表。纯新增，对商城现有表零改动、零风险。
--
-- 为什么需要它：仓库 .gitignore 忽略了 prisma/migrations/，服务器 pull
--       main 拿不到迁移文件，无法 `prisma migrate deploy`；也不建议在生产
--       盲跑 `prisma db push`（会对齐 schema，若库有 drift 可能做意外改动）。
--       本脚本是 init(6 表) + notify/setting/feedback(3 表) 两个迁移的合并，
--       全部加了 IF NOT EXISTS / 外键存在性判断，可安全重复执行。
--
-- 用法：
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f deploy/ledger-prod-init.sql
--   （或 docker exec -i <pg容器> psql -U <user> -d <db> < deploy/ledger-prod-init.sql）
--
-- 跑完后务必：在后端目录执行 `prisma generate` 重新生成客户端，再 build + 重启。
-- ============================================================

BEGIN;

-- ── 6 张核心表（原 20260608030000_ledger_init）──────────────

CREATE TABLE IF NOT EXISTS "LedgerUser" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nickname" TEXT NOT NULL DEFAULT '门窗店主',
    "avatar" TEXT,
    "wxOpenid" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "mustReset" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LedgerUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LedgerMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "lastPlanKey" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LedgerMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LedgerMembershipLog" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "deltaDays" INTEGER NOT NULL,
    "planKey" TEXT,
    "beforeAt" TIMESTAMP(3),
    "afterAt" TIMESTAMP(3),
    "operatorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerMembershipLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LedgerCustomer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LedgerCustomer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LedgerOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "extraIncome" INTEGER NOT NULL DEFAULT 0,
    "costProfile" INTEGER NOT NULL DEFAULT 0,
    "costGlass" INTEGER NOT NULL DEFAULT 0,
    "costHardware" INTEGER NOT NULL DEFAULT 0,
    "costLabor" INTEGER NOT NULL DEFAULT 0,
    "costScreen" INTEGER NOT NULL DEFAULT 0,
    "extras" JSONB NOT NULL DEFAULT '[]',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LedgerOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LedgerGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthly" INTEGER NOT NULL DEFAULT 0,
    "yearly" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LedgerGoal_pkey" PRIMARY KEY ("id")
);

-- ── 3 张新增表（原 20260608120000_ledger_notify_setting_feedback）──

CREATE TABLE IF NOT EXISTS "LedgerNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'system',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LedgerFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'general',
    "content" TEXT NOT NULL,
    "contact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "reply" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LedgerFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LedgerSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notifyOrder" BOOLEAN NOT NULL DEFAULT true,
    "notifyReport" BOOLEAN NOT NULL DEFAULT true,
    "notifyGoal" BOOLEAN NOT NULL DEFAULT true,
    "notifySystem" BOOLEAN NOT NULL DEFAULT false,
    "dndEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dndStart" TEXT NOT NULL DEFAULT '22:00',
    "dndEnd" TEXT NOT NULL DEFAULT '08:00',
    "hideAmount" BOOLEAN NOT NULL DEFAULT false,
    "bioLock" BOOLEAN NOT NULL DEFAULT false,
    "encBackup" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LedgerSetting_pkey" PRIMARY KEY ("id")
);

-- ── 索引（全部 IF NOT EXISTS）────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "LedgerUser_phone_key" ON "LedgerUser"("phone");
CREATE INDEX IF NOT EXISTS "LedgerUser_status_idx" ON "LedgerUser"("status");
-- 老库补列：微信 openid（绑定后微信一键登录）
ALTER TABLE "LedgerUser" ADD COLUMN IF NOT EXISTS "wxOpenid" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "LedgerUser_wxOpenid_key" ON "LedgerUser"("wxOpenid");
-- 老库补列：订单额外收入
ALTER TABLE "LedgerOrder" ADD COLUMN IF NOT EXISTS "extraIncome" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS "LedgerMembership_userId_key" ON "LedgerMembership"("userId");
CREATE INDEX IF NOT EXISTS "LedgerMembershipLog_membershipId_idx" ON "LedgerMembershipLog"("membershipId");
CREATE INDEX IF NOT EXISTS "LedgerCustomer_userId_idx" ON "LedgerCustomer"("userId");
CREATE INDEX IF NOT EXISTS "LedgerOrder_userId_date_idx" ON "LedgerOrder"("userId", "date");
CREATE INDEX IF NOT EXISTS "LedgerOrder_customerId_idx" ON "LedgerOrder"("customerId");
CREATE UNIQUE INDEX IF NOT EXISTS "LedgerGoal_userId_key" ON "LedgerGoal"("userId");
CREATE INDEX IF NOT EXISTS "LedgerNotification_userId_read_idx" ON "LedgerNotification"("userId", "read");
CREATE INDEX IF NOT EXISTS "LedgerNotification_userId_createdAt_idx" ON "LedgerNotification"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "LedgerFeedback_userId_idx" ON "LedgerFeedback"("userId");
CREATE INDEX IF NOT EXISTS "LedgerFeedback_status_createdAt_idx" ON "LedgerFeedback"("status", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "LedgerSetting_userId_key" ON "LedgerSetting"("userId");

-- ── 外键（存在性判断后再加，幂等）───────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LedgerMembership_userId_fkey') THEN
    ALTER TABLE "LedgerMembership" ADD CONSTRAINT "LedgerMembership_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "LedgerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LedgerMembershipLog_membershipId_fkey') THEN
    ALTER TABLE "LedgerMembershipLog" ADD CONSTRAINT "LedgerMembershipLog_membershipId_fkey"
      FOREIGN KEY ("membershipId") REFERENCES "LedgerMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LedgerCustomer_userId_fkey') THEN
    ALTER TABLE "LedgerCustomer" ADD CONSTRAINT "LedgerCustomer_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "LedgerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LedgerOrder_userId_fkey') THEN
    ALTER TABLE "LedgerOrder" ADD CONSTRAINT "LedgerOrder_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "LedgerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LedgerOrder_customerId_fkey') THEN
    ALTER TABLE "LedgerOrder" ADD CONSTRAINT "LedgerOrder_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "LedgerCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LedgerGoal_userId_fkey') THEN
    ALTER TABLE "LedgerGoal" ADD CONSTRAINT "LedgerGoal_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "LedgerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LedgerNotification_userId_fkey') THEN
    ALTER TABLE "LedgerNotification" ADD CONSTRAINT "LedgerNotification_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "LedgerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LedgerFeedback_userId_fkey') THEN
    ALTER TABLE "LedgerFeedback" ADD CONSTRAINT "LedgerFeedback_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "LedgerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LedgerSetting_userId_fkey') THEN
    ALTER TABLE "LedgerSetting" ADD CONSTRAINT "LedgerSetting_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "LedgerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;

-- 校验：应返回 9
SELECT count(*) AS ledger_tables FROM information_schema.tables
 WHERE table_schema = 'public' AND table_name LIKE 'Ledger%';
