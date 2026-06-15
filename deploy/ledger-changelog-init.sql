-- 门窗利账 · 版本更新日志表（v1.0.2）
-- 部署：生产库执行一次
CREATE TABLE IF NOT EXISTS "LedgerChangelog" (
  "id" TEXT PRIMARY KEY,
  "version" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "published" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "LedgerChangelog_published_version_idx" ON "LedgerChangelog" ("published","version");
