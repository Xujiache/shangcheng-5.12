BEGIN;

ALTER TABLE "MemberPlan" ADD COLUMN IF NOT EXISTS "nameEn" TEXT;
ALTER TABLE "MemberPlan" ADD COLUMN IF NOT EXISTS "rightsEn" JSONB;

UPDATE "MemberPlan"
SET
  "nameEn" = CASE "code"
    WHEN 'basic_monthly' THEN 'Core Monthly Membership'
    WHEN 'basic_yearly' THEN 'Core Annual Membership'
    WHEN 'ad_basic' THEN 'Advertising Basic'
    WHEN 'ad_pro' THEN 'Advertising Pro'
    WHEN 'addon_quota_push_50' THEN '50 Featured Placements Add-on'
    WHEN 'addon_quota_banner_5' THEN '5 Banner Add-on'
    ELSE "nameEn"
  END,
  "rightsEn" = CASE "code"
    WHEN 'basic_monthly' THEN '["Store design","Core analytics","Customer support"]'::jsonb
    WHEN 'basic_yearly' THEN '["Store design","Core analytics","Customer support","Priority ad placement"]'::jsonb
    WHEN 'ad_basic' THEN '["3 home banners","10 featured placements"]'::jsonb
    WHEN 'ad_pro' THEN '["10 home banners","30 featured placements","Dedicated support"]'::jsonb
    WHEN 'addon_quota_push_50' THEN '["50 additional featured placements"]'::jsonb
    WHEN 'addon_quota_banner_5' THEN '["5 additional banners"]'::jsonb
    ELSE "rightsEn"
  END
WHERE "code" IN (
  'basic_monthly',
  'basic_yearly',
  'ad_basic',
  'ad_pro',
  'addon_quota_push_50',
  'addon_quota_banner_5'
);

COMMIT;

-- 上线前此查询必须返回 0 行；自定义启用套餐需由平台运营补充人工审核的英文文案。
SELECT "id", "code", "name"
FROM "MemberPlan"
WHERE "status" = 'active'
  AND (
    COALESCE(BTRIM("nameEn"), '') = ''
    OR "rightsEn" IS NULL
    OR jsonb_typeof("rightsEn") <> 'array'
    OR jsonb_array_length("rightsEn") = 0
  );
