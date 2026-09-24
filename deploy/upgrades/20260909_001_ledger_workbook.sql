-- CreateTable
CREATE TABLE "LedgerWorkbook" (
    "userId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerWorkbook_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "LedgerWorkbookOperation" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "digest" TEXT NOT NULL,
    "operation" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerWorkbookOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerWorkbookAttachment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "digest" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerWorkbookAttachment_pkey" PRIMARY KEY ("userId","id")
);

-- CreateIndex
CREATE INDEX "LedgerWorkbookOperation_userId_revision_idx" ON "LedgerWorkbookOperation"("userId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerWorkbookOperation_userId_operationId_key" ON "LedgerWorkbookOperation"("userId", "operationId");

-- AddForeignKey
ALTER TABLE "LedgerWorkbook" ADD CONSTRAINT "LedgerWorkbook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LedgerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerWorkbookOperation" ADD CONSTRAINT "LedgerWorkbookOperation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LedgerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerWorkbookAttachment" ADD CONSTRAINT "LedgerWorkbookAttachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "LedgerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
