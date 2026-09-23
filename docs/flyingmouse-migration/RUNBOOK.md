# 格式转换迁移运行手册

## 当前状态

源码快照完整归档；格式矩阵列出 1174 个候选输入→输出组合及 CLI 可达/仅桌面可达的选项。`TXT→MD`、`SRT→VTT`、`PNG→JPG` 在临时 Linux Node 24 容器中观察到成功响应；之后通过 `scripts/flyingmouse-linux-smoke.cjs` 在 WSL Ubuntu 24.04 + Linux Node 24.9.0 对相同三组小样本确认产物可打开，且与 Windows 源码 CLI 输出逐字节 SHA-256 一致，证据见 `lightweight-smoke.json`。原版 CLI/文本/字幕/图片 37 项 Linux 源码测试通过。**以上不等于独立 worker 镜像、桌面 GUI 质量语料或小程序真机验收**；Docker daemon 在前次临时容器退出时出现只读文件系统错误，worker 镜像和端到端业务链路尚未验收。其他组合不得对用户开放。原版 PDF 拆分分组的 `splitMode/groupSize`、透明视频背景 `alphaBackground` 当前桌面接口有而 CLI 不支持；文档→Markdown 可能产生的 `.assets` 旁路目录当前 worker 也未收集，均属于迁移缺口。

## 上线前闸门

1. 运行 `node scripts/verify-flyingmouse-source.cjs` 重算归档的 298 个源文件 SHA-256；如需核对原目录，再运行 `node scripts/verify-flyingmouse-source.cjs "C:\Users\Administrator\Desktop\flyingmouse-format"`。只读归档不参与小程序打包。完成 `LICENSING.md` 的源码授权与第三方 SBOM 审核。
2. 备份目标 PostgreSQL；先在一次性测试库执行 `deploy/ledger-conversions-init.sql` 并验证 Prisma 查询，再按仓库 SQL 变更流程执行生产。不要用 `prisma migrate deploy` 假定存在迁移历史。
3. API 和 worker 均配置同一个 `CONVERSION_BUCKET=jiujiu-conversions`、`S3_ENDPOINT`、`S3_ACCESS_KEY`、`S3_SECRET_KEY`、`REDIS_URL`。转换 bucket 必须独立于公开下载的 `jiujiu-mall`，并确认匿名访问为 `none`；凭据还需有读取 bucket policy 的权限，服务启动会拒绝匿名 Allow 策略。worker 另需 `DATABASE_URL`，API 能力接口要求最近 30 秒内有 worker 心跳。
4. 默认运行上限为单文件 64 MiB、单批 256 MiB、100 个，且界面标明真机大文件未验。只有完成指定真机及服务器端到端压测后，才逐级设置 `CONVERSION_MAX_FILE_BYTES`、`CONVERSION_MAX_BATCH_BYTES`、`CONVERSION_MAX_FILES`；不得高于原版 16 GiB / 32 GiB / 1000 个。
5. 在资源足够的 Linux 节点构建 `packages/server/Dockerfile.conversion-worker`；可将 `deploy/docker-compose.conversion-worker.yml` 与生产 compose 叠加并显式启用 `conversion` profile。API 与 worker 均部署新代码且完成后续验收后，才将 API 的 `CONVERSION_FEATURE_ENABLED=true`；默认关闭。
6. 每个候选组合至少有 Linux 正常样本、损坏样本、结果可打开检查和与桌面版的质量对比；将通过项加入后端白名单。未通过项保留为未完成，不在能力接口返回。PDF 密码选项在实现安全的短期保管与日志脱敏前不得开放。

## 数据与回滚

- 未提交的分片上传在 24 小时后由 API 定时清理；已提交任务的原件、结果和记录从结束起保留 30 天，可提前手动删除。
- 当前账号注销是“提交管理员核实”的流程，没有自动硬删除接口。管理员处理注销时须先调用 `DELETE /api/v1/p/ledger/users/:id/conversions` 清除私有对象，再完成账号删除。即使数据库外键级联，**不能**只删账号而跳过对象清理。
- 停止 worker、隐藏小程序入口即可回滚新功能；不要删除已有转换表或私有 bucket，先导出并核对仍在 30 天保留期内的用户文件。
