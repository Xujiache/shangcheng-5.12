# 格式转换迁移运行手册

## 当前状态

源码目录列出 1174 个输入→输出候选。生产提交 `9f21f0c` 的能力接口开放 46 项操作、455 个输入→输出条目；本分支候选开放 46 项操作、736 个条目，其中 731 个是目录中的不同组合。新增组合以真实文件在 Linux 隔离 worker 中核验，部署和公网复测状态见 `VALIDATION.md`。**这不等于 1174 组全部可用**：RAW、AI 等缺真实样本，扫描 PDF 的结构化引擎超过现有 4 GiB worker 限额，MOBI/TSV→CSV 等已发现错误；桌面 GUI 质量语料、小程序真机和整镜像许可验收仍未完成。PDF 加密选项仍关闭。文档→Markdown 的图片附件与主文件一起打包成 ZIP，并拒绝符号链接附件。

2026-09-26 初次生产部署开放十七组格式及一项图片合成操作；此后逐步扩展。PM2 API 读取 `/etc/jiujiu/server.env`，Docker 容器 `jiujiu-conversion-worker-production` 使用 `deploy_default` 网络和权限为 600 的 `/etc/jiujiu/conversion-worker.env`。worker 配置为 `unless-stopped`、只读根目录、3 GiB 临时目录、4 GiB 内存及 2 CPU 限额。生产数据库备份、线上 HTTPS 转换及清理证据见 `VALIDATION.md`。

PM2 的 `pm2-root` 服务已启用，生产工作目录的 `.env` 链接到 `/etc/jiujiu/server.env`。API 在转换存储或 Redis 尚未就绪时每 30 秒重试初始化；隔离环境已验证 MinIO 和 Redis 分别晚于 API 启动时可自动恢复，无需重启 API。该测试不代替真实整机重启验收。
能力接口还会实时检查私有转换 bucket：运行中存储中断时不再返回可用格式，存储恢复后重新开放。隔离环境已验证存储停止、恢复和随后实际转换；生产验证见 `VALIDATION.md`。

## 新环境部署及扩大格式范围前闸门

1. 运行 `node scripts/verify-flyingmouse-source.cjs` 重算归档的 298 个源文件 SHA-256；如需核对原目录，再运行 `node scripts/verify-flyingmouse-source.cjs "C:\Users\Administrator\Desktop\flyingmouse-format"`。只读归档不参与小程序打包。补齐 `LICENSING.md` 所列的源码授权存档与第三方 SBOM 审核。
2. 备份目标 PostgreSQL；先在一次性测试库执行 `deploy/ledger-conversions-init.sql` 并验证 Prisma 查询，再按仓库 SQL 变更流程执行生产。不要用 `prisma migrate deploy` 假定存在迁移历史。
3. API 和 worker 均配置同一个 `CONVERSION_BUCKET=jiujiu-conversions`、`S3_ENDPOINT`、`S3_ACCESS_KEY`、`S3_SECRET_KEY`，并连接同一 Redis；Compose 中通过 `CONVERSION_REDIS_URL` 为 worker 提供完整连接地址，须与实际 Redis 密码配置一致。转换 bucket 必须独立于公开下载的 `jiujiu-mall`，并确认匿名访问为 `none`；凭据还需有读取 bucket policy 的权限，服务启动会拒绝匿名 Allow 策略。worker 另需 `DATABASE_URL`，API 能力接口要求最近 30 秒内有 worker 心跳。
4. 应用代码默认上限为单文件 96,000,000 字节（文本类仍为 64 MiB）、单批 256 MiB、100 个；线上版本是否生效以运行中的能力接口为准。微信 `readFile` 标注单文件 100 MB 上限，`downloadFile` 单次 200 MB，用户文件存储 100 MB，故这只是待真机验证的单文件小幅提升，不代表原版 16 GiB / 32 GiB / 1000 个可在小程序使用。进一步调整 `CONVERSION_MAX_FILE_BYTES`、`CONVERSION_MAX_BATCH_BYTES`、`CONVERSION_MAX_FILES` 前须验证设备上传、服务器临时空间、转换结果和导出。
5. 在资源足够的 Linux 节点构建 `packages/server/Dockerfile.conversion-worker`；可将 `deploy/docker-compose.conversion-worker.yml` 与生产 compose 叠加并显式启用 `conversion` profile。worker 临时目录须保留超过源码内置的 1 GiB 磁盘余量；512 MiB tmpfs 已在端到端测试中触发 `UPLOAD_DISK_BUDGET_EXCEEDED`，1 GiB TXT 输入也无法在当前 3 GiB tmpfs 中完成。新环境默认关闭转换功能；生产 `CONVERSION_FEATURE_ENABLED=true` 时，以实时能力接口与对应 worker 镜像实际验证过的白名单为准。
6. 每个候选组合至少有 Linux 正常样本、损坏样本、结果可打开检查和与桌面版的质量对比；将通过项加入后端白名单。未通过项保留为未完成，不在能力接口返回。PDF 密码选项在实现安全的短期保管与日志脱敏前不得开放。

## 数据与回滚

- 未提交的分片上传在 24 小时后由 API 定时清理；已提交任务的原件、结果和记录从结束起保留 30 天，可提前手动删除。
- 当前账号注销是“提交管理员核实”的流程，没有自动硬删除接口。管理员处理注销时须先调用 `DELETE /api/v1/p/ledger/users/:id/conversions` 清除私有对象，再完成账号删除。即使数据库外键级联，**不能**只删账号而跳过对象清理。
- 停止 worker、隐藏小程序入口即可回滚新功能；不要删除已有转换表或私有 bucket，先导出并核对仍在 30 天保留期内的用户文件。
