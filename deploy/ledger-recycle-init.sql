-- 门窗利账：LedgerOrder 增加「回收」列（拆旧窗折抵，从总价再减）。幂等，可重复执行。
ALTER TABLE "LedgerOrder" ADD COLUMN IF NOT EXISTS "recycle" INTEGER NOT NULL DEFAULT 0;
