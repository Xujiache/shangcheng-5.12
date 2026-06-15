-- 门窗利账 · 意见反馈附图（v1.0.2）
-- 部署：在生产库执行一次
ALTER TABLE "LedgerFeedback" ADD COLUMN IF NOT EXISTS "images" JSONB;
