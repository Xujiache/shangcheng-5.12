# 原版转换核心接入与验收

## 固定版本与边界

- 原版提交：`a7b9b15d32db80cecedae00e89289088656fb1ae`。`vendor/flyingmouse-format/upstream-a7b9b15/` 包含原仓库 307 个跟踪文件，保留原许可与署名；`node scripts/verify-flyingmouse-source.cjs` 逐文件校验 SHA-256。
- `node scripts/generate-flyingmouse-operations.cjs --check` 校验由原版 `config.js`、`utils.js:targetsForExt` 生成的 1174 个输入→输出组合、46 项操作及选项适用输入。目录组合是候选，不等于已逐项通过。
- 小程序界面和业务数据未重建。开发版默认使用本机 `127.0.0.1:3001`；体验版、正式版仍指向生产地址。手机真机需配置开发版私网地址及微信网络许可后实测。
- 完整 Nest API、PostgreSQL、Redis、私有对象存储和串行 worker 在 Mac 上运行。每任务独立进程、目录，原版 HTTP 服务仅监听 `127.0.0.1` 随机端口。生产环境未切换。

## Mac 引擎

| 组件 | 本机版本或来源 | 状态 |
| --- | --- | --- |
| Node | 本机 Node 运行时 | 运行中 |
| FFmpeg | 原版 `ci-engines-v1` macOS arm64 包，9.0.1 | 已加载 |
| LibreOffice | 同包，26.2.5.2 | 已加载 |
| Poppler | 同包，26.07.0 | 已加载 |
| Tesseract 数据 | 同包，中文与英文 | 已加载 |
| Pandoc | 原版脚本固定，3.11 | 已加载 |
| qpdf | conda-forge macOS arm64，12.4.1 | 已加载；PDF 加解密本地通过 |
| LibRaw `dcraw_emu` | 原版 Linux Docker 所用 0.21.5 源码在 Mac 编译 | 已安装；真实 RAW 质量未验收 |
| PDF 结构引擎及模型 | 原版 Python 入口 + 原版 Windows 发行包中的 11 组通用模型，Mac 隔离 Python 环境 | 原版模型及依赖已安装，扫描 PDF 实际转换仍未通过内存准入验收 |

原版 macOS 引擎包 SHA-256：`ffb5ae5d4131afae557eafc0b1dd6d2406cbdc4fd513c905a345371805e8e8b2`。qpdf 包 SHA-256：`768994b33c7171a0dda82e976c670fdf91336ec8ed5fa6d46b74ad330b25c8d6`。LibRaw 源码 SHA-256：`a74a2e68303d3b9219f82318f935b28c5c4abd7f2c9f7dbf8faa4997c9038305`。

PDF 结构模型取自原版 `ci-engines-v1-win32-docstructure-1.0.1.tar.zst`，完整归档 SHA-256 为 `f159fd0b0698e5b5d81a47ca7a7d8fbc73775b4c2a13bcc916c0a3024e98dd35`；仅提取其 37 个模型文件（约 1.10 GB），没有在 Mac 上执行 Windows 程序。仓库外隔离环境安装原版锁定的 PaddlePaddle 3.2.2、PaddleOCR 3.7.0、PaddleX 3.7.2、img2table 2.0.0、Pillow 11.3.0 和 PyMuPDF 1.26.3。原版 Python 测试 **40/40 通过**，11 组模型经原版校验器核对；Mac 包装入口保持原版参数和退出码协议。原版 JS 要求启动 PDF 结构任务前 `os.freemem() ≥ 5 GiB`，当前 8 GiB Mac 仅测得约 0.12 GiB 空闲。真实图片层 PDF→DOCX 直调退出 1，命中原版内存规则，且明确排除了引擎或模型缺失；不得通过降低原版阈值冒充通过。

## 本地启动与验证

1. 本地 `packages/server/.env` 配置开发数据库、Redis、S3、JWT。为 PDF 密码另设随机 32 字节十六进制 `CONVERSION_PASSWORD_KEY`，文件权限 `0600`；API 和 worker 必须使用同一密钥。该值不得提交到 Git。
2. 执行 `packages/server/scripts/start-local-original-conversion.sh`。脚本先校验后端依赖地址均为本机，再校验源码，构建整个 Nest 后端并同时启动 API 和串行 worker。
3. 执行 `node --env-file=packages/server/.env packages/server/scripts/verify-local-original-conversion.cjs`，覆盖鉴权上传、排队、转换、下载、PDF 加解密、图片合成和清理。可通过 `CONVERSION_SAMPLE_DOCX=<真实文件路径>` 增加 DOCX→PDF 与原版 CLI 的页数、文本对比。
4. 执行 `corepack pnpm --filter @jiujiu/server exec tsc --noEmit --pretty false`、`corepack pnpm --filter @jiujiu/ledger-mp typecheck`、相关 Jest 测试，以及原版测试。
5. `node scripts/flyingmouse-acceptance.cjs --gate` 是发布闸门。只有全部 1174 组和所有全局闸门通过才返回成功；完整逐项记录见 `acceptance-a7b9b15.json`。

当前 Mac 实测：DOCX→PDF 的真实样本已和原版 CLI 直调对比，1 页、提取文本一致且原文大部分保留；有效两页 PDF→PDF 拆分的前后端页文字与原版直调一致；有效中文 TXT→CSV/DOCX/EPUB/HTML/JSON/MD/PDF 完成上传、转换、下载、解码和原版直调内容对比；有效中文 PNG→18 种输出完成同样链路，并按输出检查 OCR 文字、文档结构、PDF 页面、像素或视频时长。因此逐项报告为 **27/1174**。其他四条本地链路抽测通过，但尚未满足逐项质量与原版对比标准。微信开发者工具模拟器已用本地测试身份从页面选取该 DOCX、选择 PDF、上传、创建任务，最终显示 143 KB PDF 和“已完成”；后端数据库记录 `succeeded`，调试器 0 错误。同一 UI 任务经鉴权下载得到 145993 字节 PDF、1 页、1188 字文本。模拟器中的导出保存及手机真机仍未验收，故 `miniDevtools` 闸门保持未完成。测试仅修改被 Git 忽略的 `project.private.config.json`，关闭模拟器合法域名检查；这不代表真机网络许可已通过。原版测试串行结果 **1015 通过、1 失败、21 跳过**；失败为 60 张图片合并触发原版内存保护。8 GiB Mac 当前空闲内存较低，真实 RAW 大图和扫描 PDF 结构任务仍是完整验收阻塞项。Linux 全矩阵及生产端到端未完成。

## 资源与数据

- 单任务从串行执行开始；worker 心跳按临时盘剩余空间动态给出输入上限，要求输入三倍空间再加 1 GiB 预留，并受原版单文件 16 GiB、单批 32 GiB、1000 文件硬上限约束。实际可用上限随磁盘变化，微信端传输与保存上限仍需真机测定。
- 分片上传、对象存储下载、引擎输入与输出使用流式文件；分片 SHA-256 和总长度逐项校验。结果限定在任务输出目录内，任务失败、取消或结束后回收独立临时目录。
- PDF 密码使用 AES-256-GCM 加密后写入任务记录。API 不返回密码；worker 解密后传给原版，完成后保持加密状态，失败日志对密码脱敏。密钥轮换需先处理尚可重试的旧任务。
- 用户订单、客户、账本和原有小程序素材不在转换迁移范围内。

## 生产闸门与回滚

Mac 全量验收及真机完成后，在隔离 Linux 环境构建同一源码及引擎，逐项重跑并压力测试，记录峰值内存、盘占用和并发。保留生产数据库、镜像、源代码和配置备份；按旧版运行手册的版本回滚。只有闸门全通过才切换生产并复核真实上传、转换、下载、清理。目前不得发布新版本或把候选格式称作已全部支持。
