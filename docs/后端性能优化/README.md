# 门窗利账后端性能优化

日期：2026-09-30

## 已实现

- 鉴权守卫只选择业务需要的用户和会员字段；`me`、会员状态和优化下料闸门复用同一请求中已完成的鉴权结果，减少重复查询。
- `LEDGER_FAST_READS=1` 时，派生金额空值检查按用户合并正在执行的并发请求；空值存在时继续走旧路径，金额口径不变。
- 订单列表继续使用数据库分页、排序和聚合；列表映射优先使用已核验的 `revenueAmount/costAmount/profitAmount`。
- 首页概览和序列在派生列完整时使用数据库分桶汇总；排行和成本分类只读取当前展示周期的明细 JSON。未完成回填的账号自动回退原实现。
- 客户聚合增加确定性排序；订单/客户常用归属、客户名和日期查询增加复合索引。
- 数据导入按 250 条分批写入，减少逐条数据库往返；记工快照使用 `RepeatableRead`，确保台账版本与操作回执处于同一快照，同步写入仍保持 `Serializable`。
- 就绪状态按账号短期缓存并合并并发检查；默认 60 秒，可用 `LEDGER_FAST_READS_READINESS_TTL_MS` 调整。缓存只影响性能路径，不跳过权限和旧数据回退。
- 格式转换上传、分片、任务历史和结果下载改为字段级查询；转换建任务增加账号/状态/任务归属/过期时间复合索引，孤儿上传清理保留账号归属。
- 转换 worker 的进度写入按任务合并为单写入器，去掉引擎期间重复心跳，只保留任务级租约心跳，降低高并发数据库写放大。

## 上线顺序

1. 先执行 `deploy/ledger-order-amounts.sql`。
2. 在无事务 autocommit 下执行 `deploy/ledger-order-amounts-index.sql`、`deploy/ledger-read-indexes.sql` 和 `deploy/ledger-conversion-read-indexes.sql`。
3. 保持 `LEDGER_FAST_READS=0` 部署双写版本，完成回填和逐单核对。
4. 回填 `--verify` 为 0 mismatch 后，再设置 `LEDGER_FAST_READS=1` 并重启服务。

## 验证边界

- 本轮源码、`tsc`、Nest build、ESLint、Prisma validate、全后端 Jest（60 suites / 536 tests）均通过；没有启动本地后端，没有修改生产数据库或生产环境。
- 仅对生产机做了只读核对：`https://ewsn.top/health` 返回 200；当前 Nginx 指向 `127.0.0.1:3003` 的 `jiujiu-server-metal-20260930`，线上提交仍不是本轮优化版本。
- 生产启用前仍需用真实存量库做回填、旧/新接口等价对比和 p95 压测；任何空派生值都必须保持旧路径。
