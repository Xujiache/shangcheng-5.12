-- ============================================================
-- 订单分享（OrderShare）生产库建表 + 回填脚本 · 一次性 / 幂等可重复执行
-- ------------------------------------------------------------
-- 用途：把原先塞在 SystemConfig（key=`order_share:<shareCode>`）里的订单分享数据，
--       迁移到独立的 "OrderShare" 正式表。建表 + 索引 + 从旧 SystemConfig 回填，
--       全部加 IF NOT EXISTS / ON CONFLICT DO NOTHING，可安全重复执行。
--
-- 为什么需要它：仓库 .gitignore 忽略了 prisma/migrations/，服务器 pull main 拿不到
--       迁移文件，无法 `prisma migrate deploy`；也不建议在生产盲跑 `prisma db push`
--       （会对齐 schema，若库有 drift 可能做意外改动）。本脚本纯新增一张表 + 一次回填，
--       对商城现有表零改动、零风险。
--
-- 字段映射（与 Prisma model OrderShare 一一对应）：
--   shareCode     text       主键 = 旧 key 去掉 'order_share:' 前缀（substring from 13）
--   orderId       text       value->>'orderId'
--   merchantId    text       value->>'merchantId'
--   visibleFields text[]     jsonb 数组 'visibleFields' 展开（默认空数组）
--   expiresAt     timestamp(3) null  (value->>'expiresAt')::timestamp(3)
--   intro         text null  value->>'intro'
--   viewCount     int        COALESCE((value->>'viewCount')::int, 0)
--   revoked       boolean    COALESCE((value->>'revoked')::boolean, false)
--   createdBy     text null  value->>'createdBy'
--   createdAt     timestamp(3) COALESCE((value->>'createdAt')::timestamp(3), now())
--   updatedAt     timestamp(3) now()
--
-- 用法：
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f deploy/order-share-init.sql
--   （或 docker exec -i <pg容器> psql -U <user> -d <db> < deploy/order-share-init.sql）
--
-- 跑完后务必：在后端目录执行 `prisma generate` 重新生成客户端，再 build + 重启。
-- 确认回填行数无误后，可选地清理旧 SystemConfig 行（见文件末尾被注释的 DELETE）。
-- ============================================================

BEGIN;

-- ── 建表（与 Prisma model OrderShare 对齐；TIMESTAMP(3) 对应 Prisma DateTime）──
CREATE TABLE IF NOT EXISTS "OrderShare" (
    "shareCode" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "visibleFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "expiresAt" TIMESTAMP(3),
    "intro" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderShare_pkey" PRIMARY KEY ("shareCode")
);

-- ── 索引（全部 IF NOT EXISTS）──────────────────────────────
CREATE INDEX IF NOT EXISTS "OrderShare_orderId_idx" ON "OrderShare"("orderId");
CREATE INDEX IF NOT EXISTS "OrderShare_merchantId_idx" ON "OrderShare"("merchantId");
CREATE INDEX IF NOT EXISTS "OrderShare_revoked_idx" ON "OrderShare"("revoked");

-- ── 回填：从旧 SystemConfig 行迁移到正式表（幂等：ON CONFLICT DO NOTHING）──
--   key 形如 'order_share:<shareCode>'；'order_share:' 共 12 个字符，
--   故 substring(key from 13) 取第 13 个字符起 = 冒号之后的 shareCode。
--   value 是 jsonb：标量用 ->> 取文本再 cast，数组用 jsonb_array_elements_text 展开。
INSERT INTO "OrderShare" (
    "shareCode",
    "orderId",
    "merchantId",
    "visibleFields",
    "expiresAt",
    "intro",
    "viewCount",
    "revoked",
    "createdBy",
    "createdAt",
    "updatedAt"
)
SELECT
    substring("key" from 13)                                              AS "shareCode",
    "value"->>'orderId'                                                   AS "orderId",
    "value"->>'merchantId'                                                AS "merchantId",
    COALESCE(
        ARRAY(SELECT jsonb_array_elements_text("value"->'visibleFields')),
        ARRAY[]::TEXT[]
    )                                                                     AS "visibleFields",
    ("value"->>'expiresAt')::timestamp(3)                                 AS "expiresAt",
    "value"->>'intro'                                                     AS "intro",
    COALESCE(("value"->>'viewCount')::int, 0)                             AS "viewCount",
    COALESCE(("value"->>'revoked')::boolean, false)                       AS "revoked",
    "value"->>'createdBy'                                                 AS "createdBy",
    COALESCE(("value"->>'createdAt')::timestamp(3), now())                AS "createdAt",
    now()                                                                 AS "updatedAt"
FROM "SystemConfig"
WHERE "key" LIKE 'order_share:%'
  AND "value"->>'orderId' IS NOT NULL
  AND "value"->>'merchantId' IS NOT NULL
ON CONFLICT ("shareCode") DO NOTHING;

COMMIT;

-- ── 最终校验：统计已落库的分享行数 ────────────────────────
SELECT count(*) AS order_share_rows FROM "OrderShare";

-- ============================================================
-- 可选清理：确认上方回填行数与旧数据一致后，再执行下面这条删除旧 SystemConfig 行。
-- 默认注释掉——务必先核对回填结果，避免误删未迁移成功的数据。
-- ------------------------------------------------------------
-- DELETE FROM "SystemConfig" WHERE "key" LIKE 'order_share:%';
-- ============================================================
