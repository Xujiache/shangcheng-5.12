# Windows 0.7.10 / Linux 对齐状态

2026-09-29。验收未完成，生产环境尚未切换。用户确认的对照版本为 Windows 0.7.10；源版本固定为 `a7b9b15`。1174 组是格式声明数量，不是通过数量。

## 已完成的候选修复

| 项目 | 实际变化 | 验证范围 |
| --- | --- | --- |
| 原版源码 | 保留并逐个核对 307 个原文件，仅修补独立运行副本；当前修订 r17 | 镜像内源码及补丁哈希检查 |
| PDF 版式引擎 | 恢复 Windows 包中的原入口、55 个 pdf2docx 与 20 个 Camelot 模块，使用 Python 3.12 | 真实 PDF 转 DOCX/XLSX 已运行；双栏分页仍失败 |
| 扫描 PDF | 补齐 docstructure 1.0.1、对应 Python 环境与 37 个校验过的模型文件 | 单页扫描、多页混合样本可提取可编辑表格和文字；无 Windows 结果对照 |
| 原生引擎 | FFmpeg 8.1.1、LibreOffice 26.2.1.2、Poppler 26.05.0、qpdf 12.4.0、Pandoc 3.11 | 启动及多类真实转换；不能由版本相同推断输出相同 |
| OCR 模型 | 使用原 Windows 包的 eng / chi_sim 模型原字节 | 仍有已复现的错字，不以任务成功代替 OCR 质量通过 |
| PDF 行尾缺字 | 依据可见内容边界修正错误的页面边距裁剪 | 中文长行 150 字完整保留；原生样本和空白页 XML 不变 |
| PDF OCR 路由 | r17 将版式分类限定在 DOCX 接受检查，恢复原文本 OCR 判定 | 两项原版混合页面文字识别回归已消除 |
| AVS2/AVS3 | 补齐 davs2 / uavs3d，含 AVS3 8/10 位 | 三份真实流完整解码出首帧；鉴权上传、转换、下载批次另记 |
| SVG | FFmpeg 增加 librsvg 解码器 | 候选真实解出 600×320 图；全部 SVG 目标链路正在复测 |

当前隔离镜像：`jiujiu-conversion-worker:linux-parity-48d7c15`，ID `sha256:bb3f522645b46be47f3026bac98df750089602ec36992bbd43093d6c44618873`。它由已验证的 `dbc7eac` 候选叠加新版 FFmpeg 和 r17 原版运行副本构建；不是声称重新执行了整个 Dockerfile。构建记录在服务器 `build/runtime-r17-48d7c15/`，父级为 `/root/deployment-verification/linux-windows-parity/`。

## 当前实测

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 后端转换单元测试 | 4 套，31 通过 | 本机 `.quality/linux-windows-parity/backend-unit-latest.log` |
| 精确输入重放检查 | 7 通过 | 本机 `job-reference-tests-latest.log` |
| PDF 质量门禁检查 | 7 通过，包含缺字与多页退化的失败测试 | 本机 `pdf-quality-tests-latest.log` |
| 原仓库完整 99 个测试文件 | 1037 项：1014 通过、8 失败、15 跳过 | [完整记录与失败原因](original-suite-r17.md) |
| 图片完整批次（r16） | 380 组：325 通过、55 失败；380 个后台任务中 373 成功、7 失败 | `e2e/artifacts/run-20260929T032709Z-1012571/` |
| PDF 原生 / 扫描 / 混合（r17） | 6 组：5 通过、1 失败；6 个后台任务都生成了文件 | `e2e/artifacts/run-20260929T035726Z-1152010/` |
| 大文件 | 100.9 MiB WAV 真实上传、MP3 转换、下载、600 秒时长与音频采样、清理通过 | `e2e/artifacts/run-20260928T213157Z-574016/` |

本机日志默认位于 `.quality/linux-windows-parity/`；服务器证据路径相对于 `/root/deployment-verification/linux-windows-parity/`。不同修订、不同测试范围的结果分别保存，不能把历史 Mac 的 954/1174 或旧 PDF 检查结果加入当前通过数。其他已执行的文档、表格、演示、文本、音视频、压缩、PSD 和选项批次原始日志保存在 `e2e/artifacts/`；完整矩阵仍需汇总逐项质量及 Windows 对照。

## 尚未通过的事项

- 原生双栏 PDF：1 页变为 3 页。原版直接调用与后端的 DOCX XML 一致。[双单元格试验](pdf-column-diagnostic.md)会损坏长双栏页面，因此未合入。
- 图片 OCR：16 种输入各有 DOCX/MD/TXT 共 48 组错字；已查明测试图“量窗助手”被识别成“星窗助手”。[纠偏试验](ocr-deskew-diagnostic.md)会在倾斜发票上产生其他错字，未合入。
- r16 中 7 个 SVG 目标缺解码器；r17 已补引擎，尚需完整链路复测结果。
- 媒体内部编码：Windows FFmpeg 有而 Linux 候选没有 EVC 解码器；正在核对支持容器中的真实样本。文件扩展名齐全不代表内部编码齐全。
- RAW / AI / 旧 Office / OFD 的 51 份外部样本尚待完整串行执行；MRW 和 IIQ 尚缺含可读文字的 OCR 样本。已有失败样本继续保留。
- Windows 执行基线仍缺。GitHub Windows 任务因账号计费限制未分配 runner；2026-09-29 复核仍为 `runner_name:""`、`steps:[]`。Mac 锁屏也阻止 WPS 渲染检查。未获得用户同一文件的 Windows 输出。
- 原版完整套件剩余 8 个桌面入口测试失败，15 个跳过。失败不能从完整套件结果中抹掉；详见原版测试报告。

## 运行边界

隔离 API 仅为本机 3013，数据库、队列、文件桶与生产独立。worker 8 GiB、2 CPU、串行；每批检查至少 3 GiB 磁盘余量。本次 PDF worker 峰值 4,665,884,672 字节，现有生产 4 GiB 限额不够覆盖该样本。

现有生产 worker 仍为 `jiujiu-conversion-worker:9fbe0b9`，生产 API 3003 健康检查通过。上述候选修复与测试没有替换生产。失败或未测项目解决之前不发布“全部对齐”。

## 复现入口

- [引擎基线审计](engine-audit.md)、[质量缺口](quality-gaps.md)
- [隔离后端运行](e2e-runbook.md)、[worker 资源与镜像](e2e-worker-runbook.md)、[批次参数](RUNNER.md)
- [真实 AVS 样本](avs-codec-gap.md)、[RAW 样本来源](ocr-fixture-provenance.md)
- [精确输入重放脚本](../../scripts/flyingmouse-job-reference.cjs)、[Linux 鉴权验收脚本](../../scripts/flyingmouse-linux-parity.cjs)
