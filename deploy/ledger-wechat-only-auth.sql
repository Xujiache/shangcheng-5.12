-- 门窗利账改为微信账号体系：首次微信登录自动建号，会员档案固定归属该微信账号。
-- 幂等执行；不会删除既有手机号、密码或业务数据。历史未绑定微信账号需在后续人工迁移后才可登录。
BEGIN;

ALTER TABLE IF EXISTS "LedgerUser" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE IF EXISTS "LedgerUser" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE IF EXISTS "LedgerUser" ADD COLUMN IF NOT EXISTS "wxOpenid" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "LedgerUser_wxOpenid_key" ON "LedgerUser"("wxOpenid");

-- 为历史微信账号补齐空会员档案。expiresAt=NULL 代表“尚未开通”，不会获得任何功能权限。
INSERT INTO "LedgerMembership" ("id", "userId", "updatedAt")
SELECT 'lmem_' || substr(md5("id"), 1, 20), "id", NOW()
FROM "LedgerUser"
WHERE "wxOpenid" IS NOT NULL
ON CONFLICT ("userId") DO NOTHING;

COMMIT;
