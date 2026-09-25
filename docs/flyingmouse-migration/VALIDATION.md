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
| Office/PDF/OCR、音视频、特殊格式 | **未验** | 未列入公开能力；当日 PDF `splitMode/groupSize`、视频 `alphaBackground` 仍是 CLI 适配缺口，后续修复见下文 |
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

## 2026-09-26 服务器隔离验收补充

- 目标提交 `f39ea43`；源码清单更新后，298 个文件 SHA-256 校验通过。worker 镜像使用 pnpm 9.0.0 构建，启动文件为 `dist/workers/conversion.worker.js`。
- 在一次性 PostgreSQL、Redis、MinIO 容器中执行转换建表 SQL、同步 Prisma 测试库，再启动隔离 API 和 worker。TXT→MD、SRT→VTT、PNG→JPG 均通过服务层上传、入队、转换、鉴权下载和删除；TXT→MD 另通过 HTTP 分片上传、跨账号下载拒绝及删除。
- 隔离环境通过取消、失败重试和过期上传清理。512 MiB tmpfs 会触发源码内置的 1 GiB 磁盘余量限制；改用 3 GiB tmpfs 后上述测试通过。测试容器已清理，生产服务健康检查返回 200。
- 证据留在服务器 `/root/deployment-verification/jiujiu-f39ea43-20260925/conversion-e2e/`；镜像 SPDX 2.3 清单和依赖清单分别留在同级 `conversion-worker.spdx.json`、`conversion-worker-package-inventory.json`。这些测试未覆盖小程序真机、大文件、桌面 GUI 质量对比和生产许可审查。生产 worker 未启动，API 转换开关仍关闭。
- `453ae71` 候选 worker 镜像 `sha256:9827fbefd20be50df63160b5093811798642780ad9ae96b72d90b208f8bf4ffa` 构建成功。在无网络、只读文件系统、一次性容器中，编译后的参数适配器向引擎 CLI 传递 PDF 分组和透明背景参数；带内嵌 PNG 的合成 DOCX 经真实 CLI 转成 Markdown 后，附件目录和 Markdown 一起生成可读取的 ZIP。对应镜像清单见同级 `conversion-worker-453ae71.spdx.json`。这未代替上传/入队的完整服务链路、真实文档质量和小程序真机验收。
- 同一镜像随后在重新创建的一次性 PostgreSQL、Redis、MinIO 和 API 环境中完成完整服务链路复测：TXT→MD、SRT→VTT、PNG→JPG 的上传、排队、转换、鉴权下载及删除均通过；HTTP 分片上传、跨账号下载拒绝、取消、失败重试和过期上传清理也通过。证据为同级 `conversion-e2e/*-453ae71.log`；临时容器、网络和 API 已清理，生产转换开关保持关闭。该复测仍未覆盖带附件 DOCX 的服务层任务，因为该组合尚未列入白名单。
- `8483737` 修复 ZIP 源文件读取失败时任务等待不结束的问题；后端 Jest 51 套、471 项及类型、lint、格式检查通过。新镜像 `sha256:a03ddd54614eb296d5863e4aff4f926496c0697c2bc05007d1d088acc4d3a7b1` 在同样的一次性环境重放以上三组转换、鉴权下载、删除、取消、失败重试和过期清理，全部通过。证据为同级 `conversion-e2e/*-8483737.log`；临时容器已清理，生产转换开关保持关闭。
