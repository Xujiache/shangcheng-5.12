-- 先在备份后的目标库执行；仅新增格式转换表，不修改既有业务数据。
CREATE TABLE IF NOT EXISTS "LedgerConversionJob" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "LedgerUser"("id") ON DELETE CASCADE,
  "operationId" TEXT NOT NULL,
  "uploadOrder" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "options" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "heartbeatAt" TIMESTAMP(3),
  "leaseId" TEXT,
  "finishedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "LedgerConversionJob_userId_createdAt_idx" ON "LedgerConversionJob"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "LedgerConversionJob_status_createdAt_idx" ON "LedgerConversionJob"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "LedgerConversionJob_expiresAt_idx" ON "LedgerConversionJob"("expiresAt");

CREATE TABLE IF NOT EXISTS "LedgerConversionUpload" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "LedgerUser"("id") ON DELETE CASCADE,
  "jobId" TEXT REFERENCES "LedgerConversionJob"("id") ON DELETE SET NULL,
  "fileName" TEXT NOT NULL,
  "extension" TEXT NOT NULL,
  "totalBytes" BIGINT NOT NULL,
  "chunkSize" INTEGER NOT NULL,
  "chunkCount" INTEGER NOT NULL,
  "receivedBytes" BIGINT NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'uploading',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "LedgerConversionUpload_userId_status_idx" ON "LedgerConversionUpload"("userId", "status");
CREATE INDEX IF NOT EXISTS "LedgerConversionUpload_jobId_idx" ON "LedgerConversionUpload"("jobId");
CREATE INDEX IF NOT EXISTS "LedgerConversionUpload_expiresAt_idx" ON "LedgerConversionUpload"("expiresAt");

CREATE TABLE IF NOT EXISTS "LedgerConversionChunk" (
  "uploadId" TEXT NOT NULL REFERENCES "LedgerConversionUpload"("id") ON DELETE CASCADE,
  "index" INTEGER NOT NULL,
  "objectKey" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("uploadId", "index")
);

CREATE TABLE IF NOT EXISTS "LedgerConversionAsset" (
  "id" TEXT PRIMARY KEY,
  "jobId" TEXT NOT NULL REFERENCES "LedgerConversionJob"("id") ON DELETE CASCADE,
  "objectKey" TEXT NOT NULL UNIQUE,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "LedgerConversionAsset_jobId_idx" ON "LedgerConversionAsset"("jobId");
