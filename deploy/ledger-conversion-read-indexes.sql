-- Conversion upload selection for job creation. Run outside a transaction.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "LedgerConversionUpload_userId_status_jobId_expiresAt_idx"
  ON "LedgerConversionUpload" ("userId", "status", "jobId", "expiresAt");
