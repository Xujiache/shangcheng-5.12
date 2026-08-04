-- 门窗利账 · 新微信账号自动赠送 30 天会员。
--
-- 兼容当前后端“先建 LedgerUser，再嵌套创建 LedgerMembership”的登录流程：
-- 仅当会员档案属于刚创建的新账号、且没有显式会员期限时自动填充。
-- 已有账号、后台续费、永久会员以及已设置期限的档案均不会被改动。
--
-- 幂等：可重复执行，函数与触发器会原地更新。
BEGIN;

CREATE OR REPLACE FUNCTION "ledger_grant_welcome_membership_30d"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  user_created_at TIMESTAMP(3);
BEGIN
  -- to_jsonb 兼容尚未执行 perpetual 补列脚本的历史库。
  IF NEW."expiresAt" IS NOT NULL
     OR COALESCE((to_jsonb(NEW)->>'perpetual')::boolean, false) THEN
    RETURN NEW;
  END IF;

  SELECT "createdAt"
    INTO user_created_at
    FROM "LedgerUser"
   WHERE "id" = NEW."userId";

  IF user_created_at IS NOT NULL
     AND user_created_at >= CURRENT_TIMESTAMP - INTERVAL '10 minutes' THEN
    NEW."expiresAt" = CURRENT_TIMESTAMP + INTERVAL '30 days';
    NEW."lastPlanKey" = 'welcome-30d';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_ledger_welcome_membership_30d" ON "LedgerMembership";

CREATE TRIGGER "trg_ledger_welcome_membership_30d"
BEFORE INSERT ON "LedgerMembership"
FOR EACH ROW
EXECUTE FUNCTION "ledger_grant_welcome_membership_30d"();

COMMIT;
