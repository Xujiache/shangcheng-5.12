-- Run after 20260928_001_ledger_tool_events.sql. Expands the tool keys without changing any event rows.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';
ALTER TABLE "LedgerToolEvent" DROP CONSTRAINT "LedgerToolEvent_tool_check";
ALTER TABLE "LedgerToolEvent" ADD CONSTRAINT "LedgerToolEvent_tool_check"
  CHECK ("tool" IN ('triangle','arc','cut','work-log','format','rmb','retire','level','glass','glass-weight','luban','tide')) NOT VALID;
ALTER TABLE "LedgerToolEvent" VALIDATE CONSTRAINT "LedgerToolEvent_tool_check";
COMMIT;
