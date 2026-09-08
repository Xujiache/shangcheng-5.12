# 数据升级、测试与部署手册

## 一次性本地测试

`scripts/db/test-postgres.ps1` 在 `.quality/pg-<随机编号>` 建独立 PostgreSQL 集群，只监听本机，检查 55448 端口未被占用；退出时只停止自己启动的集群，不删除数据或日志、不影响现有 PostgreSQL 服务。可用 `-PgBin` 指定已安装二进制；原生子进程输出单独落文件，并设置超时，避免 Windows 输出句柄导致等待。`test-local-dependencies.ps1` 另起独立 Redis，再执行完整集成测试；只停止自己创建的 Redis 进程。

完整集成测试必须显式设置 `ALLOW_DATABASE_TESTS=1`，数据库 host 为本机，库名为 test、qa 或 `_test` 结尾；Redis 必须使用本机独立逻辑库 1..15。`NODE_ENV=production` 一律拒绝。这个 guard 也在 `db:push:test` 和 Jest globalSetup 中运行，不能绕过根脚本直接误清库。

临时集群使用 trust 认证且仅绑定 loopback，只用于本机隔离测试，绝不能复用为生产服务。

## 记工版本 SQL

1. 冻结写入窗口并完成可恢复备份，记录备份编号；连接地址通过进程环境显式设置，不写进文档和 Git。
2. `pnpm db:upgrade` 默认仅查看结构、校验历史和输出计划，不建表、不写升级记录。
3. 确认备份后设置 `DB_UPGRADE_BACKUP_ID` 和 `DB_UPGRADE_CONFIRM=reviewed-backup`，执行 `pnpm db:upgrade --apply`。
4. 已有完整记工表时，先校验字段、非空、主外键和幂等/游标索引，再使用 `--apply --adopt-existing` 登记；部分结构必须人工修复或从备份恢复，不尝试猜测。
5. 再次运行应返回 already-applied；已执行 SQL 被改写或已登记结构发生漂移时应失败。
6. 业务数据、历史金额及 ID 不在结构升级中重算；后续回填另有 dry-run/备份/对账步骤。

执行器使用非阻塞 advisory lock 防止并发升级，遇到已有升级直接拒绝，DDL 与版本记录处于同一事务。当前仅覆盖记工试点，**不是全库空库初始化工具**。旧手工 SQL 不自动重放。新生产全库基线完成前仍不可宣布全库迁移方案交付。

## 失败与回退

事务失败后新表和版本记录一起回滚；验证现存数据数量和金额。应用回退优先保留兼容新增字段/表，不用 DROP TABLE 充当回退。不可逆变更必须在独立恢复库中验证备份，再按评审步骤切换；当前未执行真实容灾演练，不声称达到 RPO/RTO。

## 构建、就绪和日志

后端目标产物统一 `dist/main.js`。`/health` 保留原响应；`/health/live` 只说明进程存活；`/health/ready` 检查数据库，生产还要求 Redis，失败为 503。HTTP 200 不能替代支付或台账最终状态。

CI、构建和 Docker 固定 Node 24.19.0 / pnpm 9.0.0。Docker 非 root 运行，使用 workspace deploy 包和单独 Prisma 生成；必须在可用 Docker 环境实际验证，不以 Dockerfile 存在算通过。

`X-Trace-Id` 仅接受 1..64 位字母/数字/下划线/短横线；异常和正常响应共用同一 ID。未知内部错误不直接返回堆栈或数据库连接信息。完整指标、告警和日志脱敏审计仍待完成。

## 发布证据

`acceptance.json` 外部条目需填写 status、commit、fingerprint、finishedAt、artifact、sha256 及实际 reviewer/environment。artifact 必须为仓库内真实证据文件，不包含账号凭据。CI 日志证据随运行留存，引用具体 artifact 而非“见控制台”。

源码、依赖或配置变化后重跑对应验收。门禁会拒绝缺失、失败、过期源码指纹和被修改的证据。不得为了发布将 blocked 改成 passed；门禁自身不会执行正式发布。
