-- Run after 20260930_002_glass_tools.sql.
-- Expands the usage-event whitelist for the video parser without changing event rows.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE "LedgerToolEvent" DROP CONSTRAINT "LedgerToolEvent_tool_check";
ALTER TABLE "LedgerToolEvent" ADD CONSTRAINT "LedgerToolEvent_tool_check"
  CHECK ("tool" IN ('triangle','arc','cut','work-log','format','rmb','retire','level','glass','glass-weight','luban','tide','video-parser')) NOT VALID;
ALTER TABLE "LedgerToolEvent" VALIDATE CONSTRAINT "LedgerToolEvent_tool_check";
COMMIT;
