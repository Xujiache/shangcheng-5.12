-- 商家工作台按实付时间统计今日/昨日/七日成交数据。
-- CONCURRENTLY 避免生产 Order 表长时间写锁；本文件必须由 psql 单独执行，不能包在事务中。
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Order_merchantId_paidAt_idx"
  ON "Order" ("merchantId", "paidAt");
