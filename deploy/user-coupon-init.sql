-- ============================================================
-- 用户持券（UserCoupon）生产库建表 + 回填脚本 · 一次性 / 幂等可重复执行
-- ------------------------------------------------------------
-- 用途：把原先塞在 SystemConfig 的用户持券数据迁到独立的 "UserCoupon" 正式表：
--   - 领取记录 key=`user_coupon:<userId>:<couponId>` → value: { count, ids: [], claimedAt }
--     （ids[] 里每个元素是一张券的唯一编号 no，一行 JSON 展开成多行 UserCoupon）
--   - 核销流水 key=`user_coupon_used:<userId>:<no>`  → value: { usedAt, orderId, orderNo }
-- 建表 + 索引 + 从旧 SystemConfig 回填，全部加 IF NOT EXISTS / ON CONFLICT DO NOTHING，
-- 可安全重复执行。
--
-- 为什么需要它：仓库 .gitignore 忽略了 prisma/migrations/，服务器 pull main 拿不到
--       迁移文件，无法 `prisma migrate deploy`；也不建议在生产盲跑 `prisma db push`
--       （会对齐 schema，若库有 drift 可能做意外改动）。本脚本纯新增一张表 + 一次回填，
--       对商城现有表零改动、零风险。
--
-- 字段映射（与 Prisma model UserCoupon 一一对应）：
--   no        text         主键 = 领取记录 value->'ids' 数组展开出的每个编号（UCxxx）
--   userId    text         split_part(key, ':', 2)
--   couponId  text         split_part(key, ':', 3)
--   status    text         有对应核销流水 → 'used'，否则 'unused'
--   usedAt    timestamp(3) null  核销流水 value->>'usedAt'
--   orderId   text null    核销流水 value->>'orderId'
--   orderNo   text null    核销流水 value->>'orderNo'
--   claimedAt timestamp(3) COALESCE((领取记录 value->>'claimedAt')::timestamp(3), now())
--
-- 注意：旧实现里"ids 缺失但 count>0"的行会在前端兜底成 LEGACY_ 占位编号，
--       这类行没有真实 no 可迁，回填时自然跳过（ids 为空 → 展不出行），符合预期。
--
-- 用法：
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f deploy/user-coupon-init.sql
--   （或 docker exec -i <pg容器> psql -U <user> -d <db> < deploy/user-coupon-init.sql）
--
-- 跑完后务必：在后端目录执行 `prisma generate` 重新生成客户端，再 build + 重启。
-- 确认回填行数无误后，可选地清理旧 SystemConfig 行（见文件末尾被注释的 DELETE）。
-- ============================================================

BEGIN;

-- ── 建表（与 Prisma model UserCoupon 对齐；TIMESTAMP(3) 对应 Prisma DateTime）──
CREATE TABLE IF NOT EXISTS "UserCoupon" (
    "no" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unused',
    "usedAt" TIMESTAMP(3),
    "orderId" TEXT,
    "orderNo" TEXT,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserCoupon_pkey" PRIMARY KEY ("no")
);

-- ── 索引（全部 IF NOT EXISTS）──────────────────────────────
CREATE INDEX IF NOT EXISTS "UserCoupon_userId_couponId_idx" ON "UserCoupon"("userId", "couponId");
CREATE INDEX IF NOT EXISTS "UserCoupon_userId_status_idx" ON "UserCoupon"("userId", "status");

-- ── 回填：从旧 SystemConfig 行迁移到正式表（幂等：ON CONFLICT DO NOTHING）──
--   领取记录 key 形如 'user_coupon:<userId>:<couponId>'。
--   LIKE 'user_coupon:%' 不会误命中核销流水 'user_coupon_used:%'：
--   模式第 12 个字符是字面量 ':'，而 'user_coupon_used:...' 第 12 个字符是 '_'，
--   前缀在第一个冒号前就已不同，故不匹配（已验证）。下面仍叠加 NOT LIKE 双保险，
--   防未来出现 'user_coupon?used:' 之类单字符差异 key 被 LIKE 的 '_' 通配命中。
--   value->'ids' 用 jsonb_array_elements_text 横向展开，一个编号一行；
--   核销流水按 'user_coupon_used:<userId>:<no>' LEFT JOIN，命中即 status='used'。
INSERT INTO "UserCoupon" (
    "no",
    "userId",
    "couponId",
    "status",
    "usedAt",
    "orderId",
    "orderNo",
    "claimedAt"
)
SELECT
    t.no                                                                  AS "no",
    split_part(s."key", ':', 2)                                           AS "userId",
    split_part(s."key", ':', 3)                                           AS "couponId",
    CASE WHEN u."key" IS NOT NULL THEN 'used' ELSE 'unused' END           AS "status",
    (u."value"->>'usedAt')::timestamp(3)                                  AS "usedAt",
    u."value"->>'orderId'                                                 AS "orderId",
    u."value"->>'orderNo'                                                 AS "orderNo",
    COALESCE((s."value"->>'claimedAt')::timestamp(3), now())              AS "claimedAt"
FROM "SystemConfig" s
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(s."value"->'ids', '[]'::jsonb)) AS t(no)
LEFT JOIN "SystemConfig" u
    ON u."key" = 'user_coupon_used:' || split_part(s."key", ':', 2) || ':' || t.no
WHERE s."key" LIKE 'user_coupon:%'
  AND s."key" NOT LIKE 'user_coupon_used:%'
ON CONFLICT ("no") DO NOTHING;

COMMIT;

-- ── 最终校验：统计已落库的持券行数（按状态分组）──────────
SELECT "status", count(*) AS user_coupon_rows FROM "UserCoupon" GROUP BY "status";

-- ============================================================
-- 可选清理：确认上方回填行数与旧数据一致后，再执行下面两条删除旧 SystemConfig 行。
-- 默认注释掉——务必先核对回填结果，避免误删未迁移成功的数据。
-- ------------------------------------------------------------
-- DELETE FROM "SystemConfig" WHERE "key" LIKE 'user_coupon:%' AND "key" NOT LIKE 'user_coupon_used:%';
-- DELETE FROM "SystemConfig" WHERE "key" LIKE 'user_coupon_used:%';
-- ============================================================
