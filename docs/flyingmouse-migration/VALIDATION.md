# 格式转换迁移验收记录（2026-09-24）

2026-09-24 基线：当时最新 `origin/feat/ledger-mp` 的 `a5bf9a8a358ae4ddb3974af022bea21332a9772d`；独立分支 `codex/flyingmouse-mp`。下表记录当日状态；后续生产三组格式部署见文末 2026-09-26 记录。

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
- 同一镜像另以仅在隔离 API 进程内扩展的测试白名单验证 DOCX→Markdown：合成 DOCX 的标题、正文、表格、图片经上传、入队、转换后保存在可下载的 ZIP，Markdown 图片引用与 ZIP 附件路径一致；跨账号下载被拒绝，任务及资产可删除。损坏 DOCX 进入失败状态且没有生成资产。证据为同级 `conversion-e2e/docx-result-20260926.log`、`docx-service-20260926.cjs` 及生成的 ZIP；临时容器已清理。生产白名单未扩展，真实文档质量、桌面版对比及小程序真机仍未验收。

## 2026-09-26 生产三组格式部署

- 生产库原有四张转换表，启动前任务和 Redis 队列均为空。数据库完整备份 `/etc/jiujiu/backups/ledger-conversion-preenable-20260926.dump` 已经容器内 `pg_restore -l` 验证，SHA-256 为 `a580de599b67af9b7d576f45bd4f8d7ee2e6413f5f916640d9f4a75734bf96ec`。
- 专用 bucket `jiujiu-conversions` 已存在且无匿名访问策略。worker 使用 `8483737` 镜像接入生产 PostgreSQL、Redis、MinIO，容器 `jiujiu-conversion-worker-production` 已配置重启策略、只读根目录及资源上限；API 配置 `CONVERSION_BUCKET=jiujiu-conversions`、`CONVERSION_FEATURE_ENABLED=true` 后重启 PM2。配置文件保存在 `/etc/jiujiu/`，权限均为 600，不入库。
- 线上 `https://ewsn.top` 的鉴权能力接口仅返回 TXT→MD、SRT→VTT、PNG→JPG 三组；三组均经 HTTPS 上传、排队、转换、鉴权下载、跨账号拒绝和删除验证，产物分别为可读 Markdown、VTT 和 JPEG。证据为服务器 `production-conversion-three-20260926.log` 及同目录的测试脚本；测试后四张转换表、队列、测试账号和 bucket 对象数均为零。API 健康检查为 200，worker 持续心跳且无重启。
- 这是服务器侧小样本验证；其余格式仍不在生产白名单，小程序端、真实大文件及桌面质量对比未验收。源码授权凭证与第三方许可核对状态见 `LICENSING.md`。

## 2026-09-26 图片格式扩展

- 同一 `8483737` worker 镜像在隔离容器内完成 JPG→PNG、JPG→WebP、PNG→WebP、WebP→PNG 的 CLI 转换：产物可解码、尺寸为 64×48，透明输入在支持透明的输出中保留透明像素；损坏的 JPG 被拒绝。首次试跑的 128 MiB tmpfs 触发原有 1 GiB 磁盘余量保护，改用与生产一致的 3 GiB tmpfs 后通过。证据为服务器 `raster-candidates-20260926.cjs` 和同名日志。
- 后端提交 `c792363` 新增两项操作，覆盖上述四个输入→输出组合。隔离 PostgreSQL、Redis、MinIO、API 及原 worker 镜像的 HTTP 链路逐组通过上传、排队、转换、鉴权下载、跨账号拒绝及删除；临时服务已清理。证据为服务器 `conversion-e2e/http-raster-20260926.log`、同目录的测试脚本和部署脚本。
- 生产 API 更新后，新四组及原三组均通过 `https://ewsn.top` 完整 HTTP 测试。测试后四张转换表、Redis 队列、测试账号和私有 bucket 对象数均为零；worker 无重启，API 内部就绪检查与公网接口均为 200。证据为服务器 `production-raster-http-20260926.log`、`production-regression-http-20260926.log` 和对应脚本。
- 此次扩展后生产共开放七组；新增四组尚未与 Windows CLI 输出逐字节比较，也未完成桌面 GUI 质量对比、真实照片或小程序端验收。其余候选组合继续关闭。
- DOCX→PDF 的首次隔离 CLI 试验中，`conversion-e2e/sample-docx-20260926.docx` 的表格列宽仅为 100 twips，转换命令返回成功且 PDF 有图片，但渲染页和 `pdftotext` 均看不到表格文字。复查时，三份使用正常列宽（4500 twips）的 DOCX 均保留了中文、表格文字和图片；其中一份已渲染并目视核对。Pandoc 生成的另一份含表格、中文与图片的 DOCX 也完整保留这些内容。证据为服务器 `docx-pdf-cli-20260926.log`、`docx-pdf-page-20260926.png`、`docx-pdf-pandoc-20260926.log`、`docx-pdf-width-20260926.log` 和 `conversion-e2e/docx-width-fixed-page-20260926.png`。首次失败样本的异常列宽解释了该样本的现象，尚不能据此判断真实文档的兼容范围；DOCX→PDF 仍未开放，需用真实文档检查版面与内容。

## 2026-09-26 JPEG 扩展名接入

- `sample.jpeg` 使用与已验证 JPG 相同的实际 JPEG 文件内容。原 worker 镜像 CLI 成功生成可解码的 PNG 和 WebP；生产 API 提交 `34034ab` 将 `jpeg` 加入已有两项图片操作，并通过公网 HTTPS 的上传、转换、鉴权下载、跨账号拒绝和删除验证。证据为服务器 `jpeg-alias-cli-20260926.log`、`production-jpeg-http-20260926.log` 及测试脚本。
- 此次接入后生产开放九组输入→输出组合、五项操作；JPEG 扩展名两组使用已有转换链路，未新增 worker 依赖。小程序端及真实照片仍未验收，其他候选组合继续关闭。

## 2026-09-26 转换服务启动恢复

- 生产 PM2 的保存配置包含 API 可执行文件和工作目录，`pm2-root` 已启用；工作目录 `.env` 链接到权限为 600 的 `/etc/jiujiu/server.env`。Docker worker 使用 `unless-stopped`。旧实现只在 API 启动时连接转换存储一次，依赖晚启动可能导致 API 在线而转换持续不可用。
- 提交 `392bf86` 让转换服务每 30 秒重试失败的初始化，合并并发尝试，且在 bucket 隐私策略、Redis PING 均通过前保持不可用。针对初次存储失败、随后成功的后端测试通过。
- 两组隔离环境分别让 MinIO、Redis 晚于 API 启动；初始转换初始化失败，依赖就绪后均无需重启 API，鉴权能力接口及 TXT→MD 的上传、入队、转换、隔离下载和删除通过。证据为服务器 `conversion-e2e/api-startup-retry-20260926.log`、`http-startup-retry-20260926.log`、`api-redis-late-20260926.log`、`http-redis-late-20260926.log` 及同目录的重放脚本。临时容器与 API 已清理。
- 生产 API 更新后，TXT→MD、SRT→VTT、PNG→JPG 的公网 HTTPS 回归通过，worker 未重启，API 就绪与公网接口返回 200；证据为服务器 `production-startup-retry-http-20260926.log`。未对生产主机执行整机重启。

## 2026-09-26 运行中存储健康检查

- 旧能力接口只看 Redis worker 心跳：存储在启动后断开时仍返回 `available=true`。新增测试先复现该错误，再由提交 `b900a84` 在返回能力列表前检查私有转换 bucket；失败时返回 `available=false` 和空操作列表，恢复后重新返回五项操作。
- 隔离环境依次验证 MinIO 在线、停止、恢复三个状态；能力接口结果分别为可用、不可用、可用，恢复后 TXT→MD 的上传、排队、鉴权下载和删除通过。测试使用独立 PostgreSQL、Redis、MinIO 数据卷、API 与原 worker 镜像，全部已清理。证据为服务器 `conversion-e2e/storage-health-result-20260926.log` 和同目录的重放脚本。
- 生产 API 更新后，TXT→MD、SRT→VTT、PNG→JPG 的公网 HTTPS 回归通过；worker 无重启，API 就绪与公网接口为 200。证据为服务器 `production-storage-health-http-20260926.log`。未中断生产 MinIO 做故障演练。

## 2026-09-26 图片转 PDF

- 原 `8483737` worker 镜像隔离 CLI 验证 PNG、JPG、JPEG、WebP 各自转单页 PDF，以及 JPG 与 WebP 按顺序合成双页 PDF：`qpdf --check` 通过，`pdfinfo` 页数和页面渲染颜色符合输入；损坏 PNG 被拒绝。证据为服务器 `image-pdf-cli-20260926.log` 和 `jpeg-pdf-cli-20260926.log`。透明 PNG 在 PDF 中按原引擎规则与白底合成。
- 后端提交 `bcbaee9` 开放四组图片→PDF 格式和 `images-to-pdf` 批量合成操作，仍使用同一 worker 镜像。隔离 PostgreSQL、Redis、MinIO、API 的 HTTP 链路验证单张 PNG 转 PDF 与 JPG、WebP 合成双页 PDF；均通过上传、排队、鉴权下载、跨账号拒绝、PDF 结构与页面顺序检查和删除。证据为服务器 `conversion-e2e/http-image-pdf-20260926.log` 及同目录脚本；隔离服务已清理。
- 生产公网 HTTPS 重放上述两项操作通过，原有 TXT→MD、SRT→VTT、PNG→JPG 回归也通过；worker 无重启。证据为服务器 `production-image-pdf-http-20260926.log`、`production-image-pdf-regression-20260926.log`。当前共十三组输入→输出格式、七项操作；真实照片、大批量及小程序端仍未验收。

## 2026-09-26 DOCX 与大小上限复核

- 用户提供的 40 KiB DOCX 在本地和生产 worker 镜像中转成 Markdown，结果 SHA-256 一致。提交 `87e2143` 将 DOCX 加入 `convert:md` 白名单；生产 API 构建、18 项后端测试及公网 HTTPS 上传→转换→鉴权下载→结果哈希校验→删除均通过。测试原件及临时产物已从服务器删除。
- 同一 DOCX 的 PDF 在 Linux worker 上可读且中文完整；macOS 本地渲染缺中文字。另一份含表格的合成 DOCX 在 Linux 上转 PDF 时曾丢失表格文字，因此 DOCX→PDF 仍不在生产白名单。
- 本地测试适配器原标示单文件 1 GiB、单批 2 GiB，生产为 64 MiB、256 MiB。隔离 worker 使用原 3 GiB tmpfs 转 1 GiB TXT→MD 报 `UPLOAD_DISK_BUDGET_EXCEEDED`；改用磁盘临时目录后报 `Invalid string length`。同镜像 128 MiB 和 256 MiB 文本样本转 Markdown 成功，但未覆盖其他格式及公网大文件链路。现将本地适配器的显示与接收上限统一为生产已开放的 64 MiB、256 MiB、100 个；本地能力接口返回值已核对。不得仅修改能力接口数值来宣称 1 GiB/2 GiB 可用。

## 2026-09-26 PDF 转 PNG

- 原 `8483737` worker 镜像在隔离 CLI 中将单页 PDF 转为 2481×3508 PNG，目视检查中文、表格及图片均可见；双页样本分别包含文档页和蓝色图片页，输出 ZIP 按顺序保存 2481×3508 与 267×200 两张 PNG，第二页已目视核对为蓝色；损坏 PDF 被拒绝。证据为服务器 `conversion-e2e/pdf-png-20260926/`、`conversion-e2e/pdf-png-distinct-20260926/` 和 `pdf-png-corrupt-20260926.log`。
- 后端白名单将 PDF 加入 `convert:png`，不改 worker 镜像。Node 24 环境下 18 项转换后端测试及 API 构建通过；隔离 PostgreSQL、Redis、MinIO、API 和生产同款 worker 的单页、双页 HTTP 转换均通过上传、排队、鉴权下载、跨账号拒绝、结果检查和删除。证据为服务器 `conversion-e2e/http-pdf-png-20260926.log` 及同目录脚本。
- 生产 HTTPS 重放单页和双页转换均通过，TXT→MD、SRT→VTT、PNG→JPG 回归通过；四张转换表、测试账号、Redis 队列和私有 bucket 对象数均为零，worker 心跳正常且无重启。证据为服务器 `production-pdf-png-http-20260926.log`、`production-pdf-png-regression-20260926.log` 和 `check-pdf-png-production-20260926.log`。至此生产开放十五组输入→输出组合、七项操作；真实多页文件和大文件质量仍待验证。

## 2026-09-26 PDF 转 JPG 与 WebP

- 原 `8483737` worker 镜像在隔离 CLI 中将单页 PDF 分别转成可读取的 JPG、WebP；中文、表格、图片目视完整。由文档页和蓝色图片页组成的双页 PDF 分别生成两张按页命名图片的 ZIP，第二页在两种格式中均目视为蓝色；损坏 PDF 在两种目标格式下均被拒绝。证据为服务器 `conversion-e2e/pdf-jpg-*`、`conversion-e2e/pdf-webp-*`、`check-pdf-image-cli-20260926.py` 和 `pdf-{jpg,webp}-corrupt-20260926.log`。
- 后端提交 `7269f26` 将 PDF 加入已有 `convert:jpg` 和 `convert:webp` 白名单，不改 worker 镜像。Node 24 环境下 18 项转换后端测试及 API 构建通过。隔离 PostgreSQL、Redis、MinIO、API 和原 worker 镜像的四条单页/双页 HTTP 路径均通过上传、排队、鉴权下载、跨账号拒绝、结果检查和删除；证据为服务器 `conversion-e2e/http-pdf-images-20260926.log` 及同目录脚本。
- 生产公网 HTTPS 重放四条路径通过，PDF→PNG 和 TXT→MD、SRT→VTT、PNG→JPG 回归通过；四张转换表、测试账号、Redis 队列和私有 bucket 对象数均为零，worker 心跳正常且无重启。证据为服务器 `production-pdf-jpg-webp-http-20260926.log`、`production-pdf-images-{png,base}-regression-20260926.log` 和 `check-pdf-images-production-20260926.log`。至此生产开放十七组输入→输出组合、七项操作；真实多页文件和大文件质量仍待验证。

## 2026-09-26 生产客户端与静态站核查

- Nginx 中带 `MicroMessenger` 用户代理的请求完成两次上传、分片提交和任务创建，相关接口均返回 201；生产数据库保留的 DOCX→Markdown 和 PDF→PNG 任务均为 `succeeded`、各有一个结果，三个结果下载请求返回 200。检查只统计请求类型、状态、格式和产物数，不读取用户文件或身份。曾有一次任务列表 GET 返回 502（19:18 UTC），其后同接口持续返回 200。证据为服务器 `real-conversion-server-check-20260926.log`；这些 HTTP 记录不证明客户端预览或保存体验。
- `012307a` 构建后四个网页包的源码未再改动。线上 `/admin/`、`/merchant/`、`/platform/`、`/user/` 均返回 200，线上目录包含对应构建目录的全部文件且内容一致；多出的 91、90、73、50 个文件均是旧版静态资源，保留以免影响缓存中的旧页面。Nginx、Docker、PM2 启用且运行中，PostgreSQL、Redis、MinIO 健康，worker 无重启；证书有效期至 2026-12-17 UTC。

## 2026-09-26 格式矩阵与 96 MB 上限部署

- 生产 worker 镜像 `jiujiu-conversion-worker:b1c5cd2`（`sha256:2f6b96c49ff8a9b86f2aeb951ef67a37a1ab226c3ac9099d7edc04e418e62f37`）已替换旧镜像；旧容器保留为 `jiujiu-conversion-worker-before-b1c5cd2-20260926`，更新前 API 构建备份在服务器 `server-dist-before-b1c5cd2.tgz`。PM2 API 已从同一提交重建并重启，公网 `/health` 返回 200，worker 运行 5 分钟后重启数为 0。没有数据库迁移，原有三条成功任务仍保留。
- 新镜像在无网络、只读根目录、4 GiB 内存限制的一次性容器中验证 HEIC→PNG、PSD→PDF、SVG→MP4、数字 PDF 表格→XLSX、PDF→DOCX；产物签名、XLSX 中文和数值、DOCX 中文正文均已核对。镜像包含 libheif 与专用 Camelot 表格引擎，不包含扫描 PDF 结构化大模型。
- 公网鉴权能力接口返回 46 项操作、736 个展示条目（去重后 731 组），单文件 96,000,000 字节、单批 268,435,456 字节、最多 100 个文件。公网 HTTPS 共完成 46 次抽样转换：8 组新增格式、8 组文本、7 组 Office/PDF/ZIP、22 组图片/OCR/音视频/字幕回归及 1 个 96,000,000 字节 MP4→WebM。每次均检查下载产物、跨账号下载拒绝并删除测试任务；额外核验 Range 206/416，以及 96,000,001 字节上传请求返回 400。测试脚本留在服务器 `engine-unlock-test/b1-production-http.cjs`。
- 上述抽样不证明 731 组逐一通过，更不代表原版 1174 个目录候选全部可用。差集仍有 443 组，主要是 RAW/AI 及缺真实样本的旧式文档；MOBI、TSV→CSV、OFD 中文和 EPUB3 等路径已发现具体失败。原版 16 GiB/32 GiB/1000 的理论上限受微信文件接口与现有 worker 资源限制，未对小程序开放。小程序真机与桌面 GUI 质量对比尚未完成。
