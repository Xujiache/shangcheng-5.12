-- Apply only after a verified backup. This version is additive and does not alter existing tool tables.
CREATE TABLE "LedgerToolEvent" (
  "id" UUID NOT NULL,
  "userId" TEXT NOT NULL,
  "tool" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerToolEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LedgerToolEvent_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "LedgerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LedgerToolEvent_tool_check" CHECK ("tool" IN
    ('triangle','arc','cut','work-log','format','rmb','retire','level','glass','luban')),
  CONSTRAINT "LedgerToolEvent_status_check" CHECK ("status" IN ('open','success','failure'))
);
CREATE INDEX "LedgerToolEvent_userId_occurredAt_idx"
  ON "LedgerToolEvent"("userId", "occurredAt");
CREATE INDEX "LedgerToolEvent_userId_tool_status_occurredAt_idx"
  ON "LedgerToolEvent"("userId", "tool", "status", "occurredAt");
