# 原版转换核心接入与验收

## 固定版本与边界

- 原版提交：`a7b9b15d32db80cecedae00e89289088656fb1ae`。`vendor/flyingmouse-format/upstream-a7b9b15/` 包含原仓库 307 个跟踪文件，保留原许可与署名；`node scripts/verify-flyingmouse-source.cjs` 逐文件校验 SHA-256。
- Mac 启动脚本及 Linux worker Dockerfile 均配置 `scripts/apply-flyingmouse-platform-fixes.cjs`，只在运行副本上应用可核对修复：静态图转视频把 FFmpeg 输入参数 `-loop 1` 改为 `-stream_loop -1`；RAW 解码同时接受 LibRaw 0.21.5 输出的 `input.arw.tiff` 等完整文件名；EPUB HTML→DOCX 为 macOS LibreOffice 明确选择 `Office Open XML Text` 导出滤镜。干净原版 AVIF→MP4 因 `Option loop not found` 失败；Mac 补丁副本的原版直调与本地后端均得到 3 秒、600×320 H.264 视频。干净原版 ARW→PNG 因找不到 TIFF 输出失败；补丁副本已进入原版资源检查，但当前 Mac 的高分辨率样本被原版像素预算拒绝，未验收通过。EPUB→DOCX 干净原版在 Mac 报 `no export filter`；补丁副本的原版直调及本地后端都保留了两章中文和数值。隔离运行目录的 `node_modules` 为实体副本；软链接会触发原版 PDF.js 根目录校验，导致 PDF→DOCX 等转换失败。OFD→PDF 在 Mac 默认缺中文字体；运行副本从 `FLYINGMOUSE_OFD_FONT_DIR` 提供 CJK 字体并关闭第三方库的标准输出横幅。PDF 表格线检测在 200 DPI 整页渲染时采用短表格阈值，小图保持原阈值；中文两列表格的列错位在原版直调与本地后端均已修复。演示文稿→HTML 逐页渲染成内嵌 PNG，同时保留可选中的幻灯片文字，以流方式写入文件；图文 DPT、DPS 已通过逐页检查。v12 运行副本限制 OCR 内部放大不超过原版像素预算，修正 OFD 依赖的前导 `/` 归档路径、十六进制颜色、中文字体子集缺字、文字基线及 `S` 路径指令，并统一损坏 RAW 的解码错误、清理失败临时目录。原版目录保持不变；运行副本记录前后 `image.js`、`office-convert.js`、`ofd-convert.js`、`pdf-table-runtime.js`、`pdf.js`、`ocr.js` 和 OFD 依赖的 SHA-256。Linux 镜像及转换链路尚未验收。
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
| LibRaw `dcraw_emu` | 0.21.5，Mac 使用 `-DUSE_X3FTOOLS` 编译；Linux Docker 同步该开关 | CRW/CR2/DNG/KDC/MRW/NEF/RW2/X3F 各 16 个非 OCR 目标已验收；其他输入待测 |
| PDF 结构引擎及模型 | 原版 Python 入口 + 原版 Windows 发行包中的 11 组通用模型，Mac 隔离 Python 环境 | 原版模型及依赖已安装，扫描 PDF 实际转换仍未通过内存准入验收 |

原版 macOS 引擎包 SHA-256：`ffb5ae5d4131afae557eafc0b1dd6d2406cbdc4fd513c905a345371805e8e8b2`。qpdf 包 SHA-256：`768994b33c7171a0dda82e976c670fdf91336ec8ed5fa6d46b74ad330b25c8d6`。LibRaw 源码 SHA-256：`a74a2e68303d3b9219f82318f935b28c5c4abd7f2c9f7dbf8faa4997c9038305`。

PDF 结构模型取自原版 `ci-engines-v1-win32-docstructure-1.0.1.tar.zst`，完整归档 SHA-256 为 `f159fd0b0698e5b5d81a47ca7a7d8fbc73775b4c2a13bcc916c0a3024e98dd35`；仅提取其 37 个模型文件（约 1.10 GB），没有在 Mac 上执行 Windows 程序。仓库外隔离环境安装原版锁定的 PaddlePaddle 3.2.2、PaddleOCR 3.7.0、PaddleX 3.7.2、img2table 2.0.0、Pillow 11.3.0 和 PyMuPDF 1.26.3。原版 Python 测试 **40/40 通过**，11 组模型经原版校验器核对；Mac 包装入口保持原版参数和退出码协议。原版 JS 要求启动 PDF 结构任务前 `os.freemem() ≥ 5 GiB`，当前 8 GiB Mac 仅测得约 0.12 GiB 空闲。真实图片层 PDF→DOCX 直调退出 1，命中原版内存规则，且明确排除了引擎或模型缺失；不得通过降低原版阈值冒充通过。

Mac 的 LibRaw 0.21.5 原构建没有开启 X3F 工具，真实 X3F 被 `dcraw_emu` 拒绝。用同一源码运行 `mkdir -p object lib bin && make -f Makefile.dist -j2 bin/dcraw_emu CFLAGS='-O2 -I. -w -DUSE_ZLIB -DUSE_X3FTOOLS'` 后，Mac 可解码 X3F；当前二进制 SHA-256 为 `052936c3d3207db481de3eb12e55c8754b7e820a1588d6d46c63a8718f025471`。Linux Docker 的 autotools 构建同步传入 `CXXFLAGS='-DUSE_X3FTOOLS'`，worker 通过 `FLYINGMOUSE_DCRAW_PATH` 选择该二进制；尚未进行 Linux 实测。

## 本地启动与验证

1. 本地 `packages/server/.env` 配置开发数据库、Redis、S3、JWT。为 PDF 密码另设随机 32 字节十六进制 `CONVERSION_PASSWORD_KEY`，文件权限 `0600`；API 和 worker 必须使用同一密钥。该值不得提交到 Git。
2. 执行 `packages/server/scripts/start-local-original-conversion.sh`。脚本先校验后端依赖地址均为本机，再校验源码，构建整个 Nest 后端并同时启动 API 和串行 worker。
3. 执行 `FLYINGMOUSE_TEST_SOURCE_DIR=$HOME/Library/Caches/ledger-flyingmouse-engines/runtime-a7b9b15-platform-v12 node --env-file=packages/server/.env packages/server/scripts/verify-local-original-conversion.cjs`，覆盖鉴权上传、排队、转换、下载、PDF 加解密、图片合成和清理，并与同一补丁副本的原版 CLI 直调比较。可通过 `CONVERSION_SAMPLE_DOCX=<真实文件路径>` 增加 DOCX 的六种输出检查，通过 `CONVERSION_IMAGE_INPUTS=png,jpg,svg,...`、`CONVERSION_AUDIO_INPUTS=wav,aac,...`、`CONVERSION_TEXT_INPUTS=txt,md,...`、`CONVERSION_SHEET_INPUTS=xlsx,ods,xls` 指定输入批次。额外矩阵由 `CONVERSION_VIDEO_INPUTS=mp4,mov,...`、`CONVERSION_SUBTITLE_INPUTS=srt,ass,ssa,vtt`、`CONVERSION_EPUB=1`、`CONVERSION_MOBI=1`、`CONVERSION_DOCUMENT_INPUTS=odt,rtf`、`CONVERSION_PDF_TEXT=1`、`CONVERSION_RAW_SAMPLE=<真实 RAW 文件>`、`CONVERSION_OPTIONS=1` 启用；只跑指定矩阵时可设 `CONVERSION_SKIP_BASELINE=1`。
4. 执行 `corepack pnpm --filter @jiujiu/server exec tsc --noEmit --pretty false`、`corepack pnpm --filter @jiujiu/ledger-mp typecheck`、相关 Jest 测试，以及原版测试。`CONVERSION_SKIP_BASELINE=1 CONVERSION_PDF_TABLE=1` 单独复测 PDF→XLSX 的英文及中文表格；当前运行副本两种表格均通过。
5. `node scripts/flyingmouse-acceptance.cjs --gate` 是发布闸门。只有全部 1174 组和所有全局闸门通过才返回成功；完整逐项记录见 `acceptance-a7b9b15.json`。

当前 Mac 实测：真实 DOCX→HTML/MD/ODT/PDF/RTF/TXT 已与原版 CLI 直调对比解码后的正文，保留至少 70% 原文连续片段；PDF 额外核对页数。该 DOCX 没有内嵌图片，不能据此证明图片保真。由它生成的 ODT、RTF 各 6 组同样通过正文检查。有效两页 PDF→PDF 拆分的前后端页文字与原版直调一致；单栏文字 PDF→DOCX/HTML/MD/TXT，真实中文 PDF→JPG/PNG/WebP 均通过文字或解码像素检查。有效中文 TXT/MD/MARKDOWN/LOG/YAML/YML/XML/JSON/HTML/HTM/CSV/TSV 的目录目标、WAV/AAC/FLAC/M4A/MP3/OGG/OPUS/WMA 的全部原版音频目标，及 PNG/JPG/JPEG/JPE/JFIF/SVG/AVIF/BMP/GIF/ICO/JP2/J2K/JXL/PSD/PPM/QOI/TGA/TIF/TIFF/WebP/HEIC/HEIF 的图片相关目标，均完成上传、转换、下载、原版直调和按类型的质量检查。AVI/FLV/M4S/M4V/WMV/MKV/MOV/MP4/WebM 的 113 组视频输出用三秒动态画面和音轨逐项检查时长、编码、变化帧及非静音 PCM，全部通过；片段式 M4S 转 MKV 的容器时长为 3.208 秒，符合原版直调结果，测试允许 0.25 秒时间戳偏移。SRT/ASS/SSA/VTT 的 16 组核对两条中文字幕和时间轴。两章中文 EPUB 的 5 组以及有效未压缩 UTF-8 PalmDOC MOBI 的 3 组核对正文和章节；MOBI 还需补真实阅读器导出的样本。`packages/server/test/fixtures/conversion/sheet-formula.xlsx` 含两张中文工作表、数值及公式；XLSX/ODS/XLS 的 15 个目录组合核对了工作表、`12345`、公式 `B1*2` 和计算值 `24690`，PDF 另核对两页。带 VBA 的真实 XLSM 的 6 个目标也通过原版与后端逐项对比；导出结果保留中文、数值、公式，后端明确提示宏/VBA 可能丢失。原 XLSM 第一列较窄会导致 PDF 截字，PDF 验收使用保留 VBA 且扩宽第一列的派生样本。小程序页面控制器回归 **22/22 通过**；测试桩已与能力接口的 `optionInputExtensions` 字段对齐。两页中文 PPTX/ODP 的 10 组检查了页数、正文或解码像素；旧版 DOC 的 7 组核对了真实中文正文，图片 ZIP→PDF 的两页渲染与原版一致。平面 PSD 的 19 组通过；多图层 PSD 尚需单独样本。该阶段逐项报告为 **786/1174**。原版音频探测用无输出参数调用 FFmpeg，预期退出非零并打印 `[WARN] Command failed`，随后转换与解码检查通过；这条警告不是验收失败。JXL 有损样本曾把“量窗助手”OCR 识别成“星窗助手”；改用无损 JXL 样本后该组合通过，但原版的有损样本误识别仍需作为 OCR 局限继续测试。HEIC/HEIF/JXL 的原版结果带实验性输入提示，需要更多真实设备样本。双栏中文 PDF→DOCX/HTML 的原版输出会交错阅读顺序；虽然字符数未丢，连续正文仅约 65% 对齐，仍属未解决质量缺口。PDF→XLSX 的英文、中文有边框两列表格已逐格核对并计入通过；无边框工作表 PDF 仍只生成原始文字表，其他复杂版式需要更多样本。其他本地链路抽测通过，但尚未满足逐项质量与原版对比标准。微信开发者工具模拟器已用本地测试身份从页面选取该 DOCX、选择 PDF、上传、创建任务，最终显示 143 KB PDF 和“已完成”；后端数据库记录 `succeeded`，调试器 0 错误。同一 UI 任务经鉴权下载得到 145993 字节 PDF、1 页、1188 字文本。本轮重新用本地临时身份在模拟器选取同一 40 KB DOCX、转换为 PDF、下载并保存到小程序文件系统；界面显示“已完成”和 143 KB，保存文件可读取且实际为 145993 字节。测试任务、临时身份和模拟器保存文件已清理。`miniDevtools` 闸门记为通过；模拟器未显示 PDF 预览，手机真机仍未验收。测试仅修改被 Git 忽略的 `project.private.config.json`，关闭模拟器合法域名检查；这不代表真机网络许可已通过。原版测试串行结果 **1015 通过、1 失败、21 跳过**；失败为 60 张图片合并触发原版内存保护。8 GiB Mac 当前空闲内存较低，真实 RAW 大图和扫描 PDF 结构任务仍是完整验收阻塞项。现已补充公开的 1.9 MiB CRW 真片并完成其中 16 个非 OCR 目标；其他 RAW/AI 输入和扫描 PDF 仍阻塞完整验收。Linux 全矩阵及生产端到端未完成。

## 资源与数据

PDF→XLSX 的有边框英文、中文两列表格均通过原版直调与本地后端逐格核对。中文样本由真实 XLSX 经原版转成 PDF，源表 `项目|金额 / 门窗|315.5`；运行副本修复 200 DPI 整页表格线阈值后，金额保留在第二列，未出现多出的第三列。相关原版测试 81 项通过、1 项因缺少原生 qpdf 跳过；此前原版测试 1015 项通过、1 项因本机内存预算失败、21 项跳过。当前 v12 按 `package.json` 原版测试清单串行重跑：892 项通过、1 项因 60 张图片合并命中内存保护而失败、10 项跳过。此修复尚未在 Linux 验证。原版 PDF→XLSX 把识别内容写为文本，以保留 `00123` 等字面值；数值类型推断不在当前原版合同中。

运行副本 v8 的原版 `office-quality.test.js` 与 `conversion.test.js` 在配置 Mac 引擎后 **71/72 通过**；唯一失败仍是 60 张图片合并命中原版内存预算（HTTP 413）。未配置引擎的测试运行会因 FFmpeg/LibreOffice 缺失产生额外失败，不能用作转换质量结论。后端与小程序 TypeScript 检查通过，小程序格式转换控制器 **22/22 通过**。

旧版 PPT 输入从两页中文 PPTX 经独立 LibreOffice profile 导出，确认 OLE 文件头后，HTML/JPG/ODP/PDF/PNG/PPTX 六组均通过原版直调、本地鉴权链路和页文字或像素对比。逐项报告现为 **954/1174 通过、0 组失败、220 组未验收**。

未验收的 220 组均为 RAW/AI 输入：10 种尚无完整验收样本的格式各 19 组，10 种已测 RAW/AI 格式各有 3 组 OCR 目标待验证。公开 WordPerfect 6.x 文件 `wp6.wpd` 和约 1 MiB 的 `corel_wp6.wpd` 均对 7 个目标 DOCX/HTML/MD/ODT/PDF/RTF/TXT 完成原版直调、本地鉴权链路及已知正文检查；来源与许可记录见 [xberg-io/test_documents](https://github.com/xberg-io/test_documents/blob/main/wordperfect/PROVENANCE.md)，当前逐项报告使用长文档 SHA-256 `3417815c24d7227a1dd3fc5b95cb3e84f895a1e608a58432cb5ffcaebb4cae90`。原版生成的长文档 RTF 被 Pandoc 严格解析器拒绝，但 macOS `textutil` 能正常解码且与后端相同；PDF 为 7 页，DOCX 含 2 个 EMF 媒体文件。公开 Canon PowerShot Pro70 真片 CRW（1552×1024，SHA-256 `3e583286dd5e63b03aca3de6671b7921fc9fd814a7f4cbed50a20c028728c802`）完成 16 个目标的原版直调、后端下载和解码像素对比；其 DOCX/MD/TXT OCR 目标因该照片没有文字而触发 `OCR_LOW_CONFIDENCE`，不能记为通过。此前 5 MP Olympus ORF 被原版内存预算拒绝；后续 3.8 MP Olympus E-10 真片（SHA-256 `2bfdade72439017a60a47aad1e5bbcb1aca36f2be7a21e94a4257a678fb6f4da`）在可用内存较多时完成 16 个非 OCR 目标。内存再次降低后同一真片被拒绝，资源波动需如实呈现。OFD→PDF 已在 v11 使用四份公开样本完成直调、后端、文字、像素和目视复核。Mac 完整验收未达成，不进入 Linux 部署及生产切换。

新增 [raw.pixls.us](https://raw.pixls.us/) 的真实 DNG、KDC、NEF、RW2、CR2、MRW（均为 CC0 小像素样本）和 X3F（署名-非商业性使用-相同方式共享 4.0，Polaroid x530）样本，仅存仓库外 `/tmp/ledger-raw-fixtures/`。七种格式各完成 16 个非 OCR 目标：原版 CLI 直调、鉴权上传、任务、下载、解码像素/页数/视频时长比较，输出 PNG 另做目视抽查。样本 SHA-256 均记录在逐项验收 JSON。X3F 旧二进制报 `Unsupported file format or not RAW file`，开启原版 LibRaw 的 `USE_X3FTOOLS` 后才通过；OCR 的 DOCX/MD/TXT 需另找含清晰文字的 RAW 实样验证。另使用 MIT 许可的 [Meetup Illustrator 图标网格](https://github.com/meetuparchive/swarm-icons) 真正 PDF 兼容 `.ai` 文件（24×24 pt，第 1 页 100×100 像素）完成 16 个非 OCR 目标。其余 10 种 RAW 输入尚未验收。

按用户授权下载的候选真片仍只保存在 `/tmp/ledger-raw-fixtures/`：3FR Hasselblad CFV 4096×4096（SHA-256 `f7c0f941bd542ec638073bfa9febdc4efa01f4a4855d73c5d9218b975d1de91a`，CC BY-NC-SA 4.0）、FFF Hasselblad H5D-40 7327×5502（`209d464e13702de5f4fdb830ac26ac140c98a8d0dc3e81c5ba61d93677330832`，CC0）、IIQ Phase One P20+ 4093×4096（`912401b21d9c0fd5fb1fa4ff824c16ed789b49d6915c08c09ccde6a4e60a41a6`，CC0）、MEF Mamiya ZD 5344×4016（`bcd63507c3c4cc3ea1bad2945e3f88cb4677a1a3c762e1acc38df4445714eb7c`，CC BY-NC-SA 4.0）和 SRW Samsung EX1 3682×2760（`a084890fd9d7995ceb746c18ecf5be48c95baf14286d5c0c480cc3daa25f3e37`，CC0）。哈希均与公开索引一致，LibRaw 0.21.5 均可解码；这只证明候选输入可读，不等于后端转换通过。SRW→PNG 原版直调在当前 Mac 被 4.7 百万像素内存预算拒绝，未计入通过。现有 KDC 招牌照片的 TXT OCR 返回 `OCR_NO_TEXT`，CR2 分辨率板返回 `OCR_LOW_CONFIDENCE`，对应 OCR 组合也保持未验收。

v12 在 LibRaw 报 `Input/output error` 时返回明确的 RAW 解码失败提示并删除该任务的临时目录；原版 RAW 专项测试 7/7 通过。重启后的本地后端用真实 KDC→PNG 再次完成鉴权上传、转换、下载及与 v12 原版直调的像素比较；损坏 CR2 也经过鉴权上传和任务执行，用户可见错误为明确的 RAW 解码失败提示。完整原版测试仍有上述内存保护失败，因此 `macOriginalSuite` 保持未完成。

OFD 依赖原先使用字体子集时会随机缺字，且把 OFD 文字基线向下错移一字高、把 `S` 起始路径误判为闭合路径。v11 在固定原版的运行副本中禁用有缺陷的字体子集，按 OFD 基线和路径语义渲染。Mac 使用 [Noto Sans CJK SC](https://github.com/notofonts/noto-cjk) 官方可变 TTF 固定在 400 字重的静态 TrueType，源文件 SHA-256 `990c807e79c25662a5a9ecf7f971baeb2bf2eab9a559e5ecf15cdfdb8561d21f`，生成文件 SHA-256 `9ac21a28f6859a89c26f2ff9dd377eb6c9a47800ad02db339738eb2f2154213f`；字体及 SIL OFL 1.1 许可保存在仓库外引擎缓存。四份公开 OFD（发票三份、中文公文一份）均通过原版直调、本地鉴权后端、页数、提取文字和首页逐像素对比；首页目视无缺字或明显错位，故当前样本的 OFD→PDF 记为通过。完整 PDF 嵌入字体导致约 11 MiB 输出，其他复杂 OFD 仍需扩样。复测用 `CONVERSION_SKIP_BASELINE=1 CONVERSION_OFD_SAMPLE=<OFD 路径> CONVERSION_OFD_EXPECT=<应保留的中文>`。Linux 同样检查仍是发布闸门。

公开 [ofdjs 测试文件](https://github.com/isee15/ofdjs/tree/master/test/fixtures) 的 `n.ofd` 含以 `/` 开头的 `DocRoot`、十六进制颜色及 `S` 路径指令。干净原版无法打开；v10 虽能输出，仍缺字、错位并报 PDF 路径语法错误；v11 两页 PDF 可读且 Poppler 渲染无语法错误。`test.ofd`、`999.ofd` 和 [ofdrw 发票样本](https://github.com/ofdrw/ofdrw) 同样通过后端与直调检查。v11 用公开 `n.ofd` 临时补足原版测试 fixture 后，OFD/OCR/资源专项测试 26 通过、3 跳过、0 失败；3 项跳过为需特定 OCR 真实样本的测试。PDF `groupSize=2` 的三页分组、GB18030/UTF-16LE/UTF-16BE 文本→EPUB、H.264/H.265/AV1 视频编码，以及透明 MOV 合成蓝底，均通过原版直调与后端结果对比；其他复杂输入仍需扩样。

WPS、WPT 各 7 个目标使用本地旧式 OLE 文件完成鉴权上传、转换、下载、原版直调及已知正文检查；WPS 样本还检查“请输入电话号码”中文，PDF 目视为两页可读内容。ET、ETT 各 6 个目标使用本地 WPS 表格文件完成同一链路；工作簿输出逐格与原版直调比较，ETT 样本要求 3 张工作表和至少 30 个公式，CSV/HTML/PDF 检查已知标题和数值。样本没有加入仓库，其他真实文件的格式兼容性仍需扩展。对应复测环境变量为 `CONVERSION_LEGACY_DOCUMENT_SAMPLE` / `CONVERSION_LEGACY_EXPECT` 与 `CONVERSION_LEGACY_SHEET_SAMPLE` / `CONVERSION_LEGACY_SHEET_EXPECT`，ETT 另设置 `CONVERSION_LEGACY_SHEET_MIN_SHEETS=3` 和 `CONVERSION_LEGACY_SHEET_MIN_FORMULAS=30`。

DPT 使用本地 12 页图文演示模板实测：HTML/JPG/ODP/PDF/PNG/PPTX 六组通过原版与后端逐页文字、媒体或解码像素比较。干净原版的 HTML 曾丢失幻灯片照片和背景；运行副本逐页嵌入 4001×2250 PNG，12 页图片均可解码，第一页目视保留照片、版式和中文文字。该自包含 HTML 约 14.5 MB，仍需更多模板样本检查。另把一份 PPTX 中 175 处幻灯片文字清空并保留图片后，以运行副本 v8 的原版直调与本地鉴权后端完成 PPTX→HTML：12 页均有可解码的 4001×2250 图片，纯图片演示稿不再因缺少可提取文字而失败。DPT 模板来自本机 WPS 应用；在 WPS 中另存为原生 DPS 后，12 页的 HTML/JPG/ODP/PDF/PNG/PPTX 六组也通过相同检查。DPS 样本为本机用户桌面的 `ledger-acceptance.dps`，SHA-256 为 `73c9d630f024886c427cde7fbf6026df5dfdb86e518a594d114ec0c46367095b`；WPS 提示旧效果的可编辑性可能受影响，不能据此证明其他 DPS 文件全部兼容。复测使用 `CONVERSION_LEGACY_PRESENTATION_SAMPLE`、`CONVERSION_LEGACY_PRESENTATION_EXPECT`、`CONVERSION_LEGACY_PRESENTATION_PAGES=12`、`CONVERSION_LEGACY_PRESENTATION_REQUIRE_IMAGES=1`。

- 单任务从串行执行开始；worker 心跳按临时盘剩余空间动态给出输入上限，要求输入三倍空间再加 1 GiB 预留，并受原版单文件 16 GiB、单批 32 GiB、1000 文件硬上限约束。实际可用上限随磁盘变化，微信端传输与保存上限仍需真机测定。
- Mac 本地使用 100.9 MiB WAV 完成分片上传、WAV→MP3、鉴权下载和删除清理；原版 CLI 与后端生成的 MP3 时长均约 600 秒，开头、中段、末尾各两秒 PCM 一致。这证明本地链路已越过旧 96 MiB 固定限制，但不能替代微信真机或更大文件上限测试。损坏 PDF→TXT 的首次失败与重试均实际执行；排队及运行中的视频转换取消后，worker 成功处理后续任务。上述控制流程可用 `CONVERSION_SKIP_BASELINE=1 CONVERSION_CONTROL_FLOW=1` 或 `CONVERSION_LARGE_FILE=1` 重跑。
- 本地连续验收中曾发生 `POST /uploads` 的 `ECONNRESET`。测试客户端禁用连接复用后完整通过；Nest HTTP 服务将 Node 默认 5 秒 keep-alive 延长至 30 秒，恢复复用后也完成一轮长链路回归。根因仍需通过更长时间及真机压力测试确认。
- 分片上传、对象存储下载、引擎输入与输出使用流式文件；分片 SHA-256 和总长度逐项校验。结果限定在任务输出目录内，任务失败、取消或结束后回收独立临时目录。
- PDF 密码使用 AES-256-GCM 加密后写入任务记录。API 不返回密码；worker 解密后传给原版，完成后保持加密状态，失败日志对密码脱敏。密钥轮换需先处理尚可重试的旧任务。
- 用户订单、客户、账本和原有小程序素材不在转换迁移范围内。

## 生产闸门与回滚

Mac 全量验收及真机完成后，在隔离 Linux 环境构建同一源码及引擎，逐项重跑并压力测试，记录峰值内存、盘占用和并发。保留生产数据库、镜像、源代码和配置备份；按旧版运行手册的版本回滚。只有闸门全通过才切换生产并复核真实上传、转换、下载、清理。目前不得发布新版本或把候选格式称作已全部支持。
