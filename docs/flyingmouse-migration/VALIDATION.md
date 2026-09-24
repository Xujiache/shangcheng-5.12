# 格式转换迁移验收记录（2026-09-24）

基线：最新 `origin/feat/ledger-mp` 的 `a5bf9a8a358ae4ddb3974af022bea21332a9772d`；独立分支 `codex/flyingmouse-mp`。当前属于受功能开关保护的迁移基础设施，**尚未完成非桌面能力迁移，也未上线**。

| 检查 | 结果 | 证据/约束 |
| --- | --- | --- |
| 本地源码归档 | 通过 | 298 文件、6,510,073 字节；`node scripts/verify-flyingmouse-source.cjs` 对归档及原目录均通过 |
| 候选格式矩阵 | 已建立 | 1174 个输入→输出候选；仅 3 组有小样本 Linux 源码结果，其余未验证 |
| Linux 源码轻量测试 | 通过 | WSL Ubuntu 24.04 / Node 24.9.0：CLI、文本、字幕、图片 37/37 |
| 三组轻量样本 | 通过（有限范围） | TXT→MD、SRT→VTT、PNG→JPG：Linux 结果可读/可解码，与 Windows 源码 CLI 对相同样本输出 SHA-256 完全相同；见 `lightweight-smoke.json` |
| Prisma schema | 通过 | `prisma validate`、`prisma generate`；尚未对真实测试库执行 SQL |
| NestJS 测试 | 通过 | 35/35 套、394/394 项；含鉴权隔离、续传分片、取消、重试、删除与到期清理的新增测试 |
| 全仓 TypeScript / lint | 通过 | `pnpm typecheck`、`pnpm lint`；admin-pc lint 前需先由 Vite 生成被忽略的 `.auto-import.json` |
| worker Compose 声明 | 通过（静态） | `docker compose ... config --quiet` |
| Linux worker 镜像 / DB+Redis+MinIO 端到端 | **未验** | Docker daemon 在临时容器退出时报告 `containerd ... meta.db: read-only file system`；未对现有环境做破坏性修复 |
| 微信开发者工具 / 指定真机 | **未验** | CLI 服务端口关闭；真机未指定 |
| Office/PDF/OCR、音视频、特殊格式 | **未验** | 未列入公开能力；PDF `splitMode/groupSize`、视频 `alphaBackground` 仍是 CLI 适配缺口 |
| 许可与 SBOM | **待审** | 见 `LICENSING.md`；生产 worker 不可启用 |

## 重放命令

```powershell
node scripts/verify-flyingmouse-source.cjs
node scripts/verify-flyingmouse-source.cjs "C:\Users\Administrator\Desktop\flyingmouse-format"
# 重建矩阵前，先在归档副本安装源项目运行依赖，再通过 FLYINGMOUSE_SOURCE_DIR 指向该副本
$env:DATABASE_URL = 'postgresql://test:test@127.0.0.1:5432/test' # 仅 schema 校验占位，不连接此地址
pnpm --filter @jiujiu/server exec prisma validate
pnpm --filter @jiujiu/server prisma:generate
pnpm typecheck
pnpm lint
pnpm test:server
```

Linux 源码轻量测试需在 Linux 下对**归档副本**执行 `npm ci --omit=dev`，再运行：

```bash
node --test tests/cli.test.js tests/text-conversion.test.js tests/subtitles.test.js tests/image-conversion.test.js
node /path/to/scripts/flyingmouse-linux-smoke.cjs /path/to/source-copy /path/to/output-parent
FLYINGMOUSE_SOURCE_DIR=/path/to/source-copy node /path/to/scripts/build-flyingmouse-matrix.cjs
```

本机样本产物保存在 `D:\codex-temp-flyingmouse\flyingmouse-smoke-qzAkWT`，含 Linux/Windows 结果和 `evidence.json`。这是小样本源码验证，不代表独立 worker、真实上传/下载、桌面 GUI 批量质量或真机验收。Docker 恢复后先在一次性测试库执行 `deploy/ledger-conversions-init.sql`，再验证上传→入队→转换→鉴权下载→取消/重试/删除→30 天清理；通过之前保持 `CONVERSION_FEATURE_ENABLED` 关闭。
