# 格式转换迁移运行手册

## 当前状态

源码快照完整归档；格式矩阵列出 1174 个候选输入→输出组合及 CLI 可达/仅桌面可达的选项。已明确开放的九组文本、字幕、图片互转、四组图片→PDF 及 DOCX→Markdown，共十四组在 Linux worker 镜像和生产 HTTPS 接口完成小样本验收；另开放图片合成 PDF 操作，见 `VALIDATION.md`。**桌面 GUI 质量语料、小程序真机及生产许可验收仍未完成**；其他组合不得对用户开放。PDF 拆分分组的 `splitMode/groupSize`、透明视频背景 `alphaBackground` 已完成 CLI 参数解析和 worker 参数传递，仍需真实样本质量验收。文档→Markdown 的图片附件现与主文件一起打包成 ZIP，并拒绝符号链接附件；含内嵌 PNG 的合成 DOCX 已在镜像内及隔离服务链路跑通，生产仅开放 DOCX→Markdown。

2026-09-26 服务器已按用户指示开启上述十四组格式及一项图片合成操作：PM2 API 读取 `/etc/jiujiu/server.env`，Docker 容器 `jiujiu-conversion-worker-production` 使用镜像 `jiujiu-conversion-worker:8483737`、`deploy_default` 网络和权限为 600 的 `/etc/jiujiu/conversion-worker.env`。worker 配置为 `unless-stopped`、只读根目录、3 GiB 临时目录、4 GiB 内存及 2 CPU 限额。生产数据库备份、线上 HTTPS 转换及清理证据见 `VALIDATION.md`。这不代表其余候选格式或小程序端已验收。

PM2 的 `pm2-root` 服务已启用，生产工作目录的 `.env` 链接到 `/etc/jiujiu/server.env`。API 在转换存储或 Redis 尚未就绪时每 30 秒重试初始化；隔离环境已验证 MinIO 和 Redis 分别晚于 API 启动时可自动恢复，无需重启 API。该测试不代替真实整机重启验收。
能力接口还会实时检查私有转换 bucket：运行中存储中断时不再返回可用格式，存储恢复后重新开放。隔离环境已验证存储停止、恢复和随后实际转换；生产验证见 `VALIDATION.md`。

## 新环境部署及扩大格式范围前闸门

1. 运行 `node scripts/verify-flyingmouse-source.cjs` 重算归档的 298 个源文件 SHA-256；如需核对原目录，再运行 `node scripts/verify-flyingmouse-source.cjs "C:\Users\Administrator\Desktop\flyingmouse-format"`。只读归档不参与小程序打包。补齐 `LICENSING.md` 所列的源码授权存档与第三方 SBOM 审核。
2. 备份目标 PostgreSQL；先在一次性测试库执行 `deploy/ledger-conversions-init.sql` 并验证 Prisma 查询，再按仓库 SQL 变更流程执行生产。不要用 `prisma migrate deploy` 假定存在迁移历史。
3. API 和 worker 均配置同一个 `CONVERSION_BUCKET=jiujiu-conversions`、`S3_ENDPOINT`、`S3_ACCESS_KEY`、`S3_SECRET_KEY`，并连接同一 Redis；Compose 中通过 `CONVERSION_REDIS_URL` 为 worker 提供完整连接地址，须与实际 Redis 密码配置一致。转换 bucket 必须独立于公开下载的 `jiujiu-mall`，并确认匿名访问为 `none`；凭据还需有读取 bucket policy 的权限，服务启动会拒绝匿名 Allow 策略。worker 另需 `DATABASE_URL`，API 能力接口要求最近 30 秒内有 worker 心跳。
4. 默认运行上限为单文件 64 MiB、单批 256 MiB、100 个，且界面标明真机大文件未验。只有完成指定真机及服务器端到端压测后，才逐级设置 `CONVERSION_MAX_FILE_BYTES`、`CONVERSION_MAX_BATCH_BYTES`、`CONVERSION_MAX_FILES`；不得高于原版 16 GiB / 32 GiB / 1000 个。
5. 在资源足够的 Linux 节点构建 `packages/server/Dockerfile.conversion-worker`；可将 `deploy/docker-compose.conversion-worker.yml` 与生产 compose 叠加并显式启用 `conversion` profile。worker 临时目录须保留超过源码内置的 1 GiB 磁盘余量；512 MiB tmpfs 已在端到端测试中触发 `UPLOAD_DISK_BUDGET_EXCEEDED`，1 GiB TXT 输入也无法在当前 3 GiB tmpfs 中完成。新环境默认关闭转换功能；当前生产的 `CONVERSION_FEATURE_ENABLED=true` 仅配合十四组格式、一项图片合成操作及已验证的 worker 使用。
6. 每个候选组合至少有 Linux 正常样本、损坏样本、结果可打开检查和与桌面版的质量对比；将通过项加入后端白名单。未通过项保留为未完成，不在能力接口返回。PDF 密码选项在实现安全的短期保管与日志脱敏前不得开放。

## 数据与回滚

- 未提交的分片上传在 24 小时后由 API 定时清理；已提交任务的原件、结果和记录从结束起保留 30 天，可提前手动删除。
- 当前账号注销是“提交管理员核实”的流程，没有自动硬删除接口。管理员处理注销时须先调用 `DELETE /api/v1/p/ledger/users/:id/conversions` 清除私有对象，再完成账号删除。即使数据库外键级联，**不能**只删账号而跳过对象清理。
- 停止 worker、隐藏小程序入口即可回滚新功能；不要删除已有转换表或私有 bucket，先导出并核对仍在 30 天保留期内的用户文件。
