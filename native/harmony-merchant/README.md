# 经纬科技商家端 · HarmonyOS NEXT

主仓库 `native/harmony-merchant` 下的 ArkTS/ArkUI Stage 工程，Bundle Name 为 `top.ewsn.jingwei.merchant`。App 源码由主仓库直接管理，不再需要单独克隆鸿蒙 App 仓库。使用 DevEco Studio 打开本目录。本工程不包含也不依赖旧 UniApp 商家端源码。

迁入来源：`jingwei-merchant-harmony` 的 `a7cbbcb` 源码快照；第三方 IBest-UI 保留为子模块并固定在 `a8ca200ed7bfbf362d12b00ed5578125bf5252bc`。签名材料、AGC 私有配置和构建缓存不随源码迁入。完整提交历史仍保留在原仓库。

从主仓库根目录执行 `cd native/harmony-merchant` 后运行下列命令。后端校验默认指向同仓库 `packages/server`。

## 构建

```bash
git submodule update --init --recursive
bash scripts/build.sh
```

构建脚本会幂等应用 `patches/ibest-ui-api21-loading.patch`，确保常用按钮加载状态使用
API 21 可用的原生 `LoadingProgress`，不调用 API 26 才提供的圆形绘制接口。

正式优化模式使用 `bash scripts/build-release.sh`。正式构建会把原生 HTTP 契约与同级后端仓库的真实 Nest Controller 逐项核对；后端位于其他路径时通过 `BACKEND_SOURCE_ROOT=/absolute/server/src` 指定。当前没有该应用自己的 AGC 签名配置，因此两条命令输出的仍是 `entry-default-unsigned.hap`；它不能作为 AppGallery 正式交付物。

`build-release.sh` 会先编译 Hypium 测试 HAP，再生成正式优化 HAP 和 AppGallery 提交所需的 App Pack，核对 release/debug 标志、Bundle Name、版本、API 范围和设备类型，并输出文件大小及 SHA-256。它会拒绝自有源码新增的 ArkTS 编译告警；唯一白名单是已经在运行时检查 API 版本的 `AdaptiveMaterialSurface` API 26 静态兼容提示，第三方告警单独计数且不得伪装成自有代码零告警。签名门禁调用鸿蒙官方签名工具验证包体，不依赖文件名。流水线还会生成 `artifacts/release/1.0.0/release-evidence.json`，记录该次构建的源码摘要、SBOM、测试包“已编译/未执行”状态、正式包摘要、自动门禁和仍待完成的外部门禁。取得正式签名产物后运行 `bash scripts/inspect-hap.sh <signed.hap> --require-signed` 和 `bash scripts/inspect-app-pack.sh <signed.app> --require-signed` 执行发布硬门禁。

默认使用 `/opt/harmony-command-line-tools-api26`，可通过 `HARMONY_COMMAND_LINE_HOME` 指定其他 API 26 命令行工具目录。

当前 HAP 位于 `entry/build/default/outputs/default/`，App Pack 位于 `build/outputs/default/`。正式上架前需在 `build-profile.json5` 注入 AppGallery Connect 签名配置，签名材料不得提交 Git。

正式 EC 密钥和 CSR 由 `bash scripts/bootstrap-release-signing.sh` 在 `/root/secure/` 生成；AGC
签发证书/Profile 后使用 `scripts/import-agc-release-materials.sh` 校验并导入，再通过
`scripts/build-signed-release.sh` 临时注入配置并生成签名候选。完整交接步骤见
[`docs/SIGNING_AND_AGC.md`](docs/SIGNING_AND_AGC.md)。

取得正式签名 HAP 并连接 HarmonyOS NEXT 设备后，使用 `HARMONY_DEVICE_CLASS=phone|foldable|tablet bash scripts/device-smoke.sh <signed-release.hap>` 执行安装、冷启动和进程存活硬门禁。脚本拒绝未签名包、未声明设备类型、无设备和多设备未指定目标等情况，并将构建哈希、设备、安装、启动及 Bundle 证据写入 `artifacts/device-smoke/`。

## 测试与审计

```bash
bash scripts/audit-clean-room.sh
node scripts/audit-secret-boundary.mjs
node scripts/audit-feature-surface.mjs
node scripts/audit-source-similarity.mjs
node scripts/audit-i18n.mjs --strict
node scripts/audit-routes.mjs
node scripts/audit-theme.mjs
node scripts/audit-home-icons.mjs
node scripts/audit-adaptive-performance.mjs
node scripts/audit-native-capabilities.mjs
node scripts/audit-appgallery-compliance.mjs
node scripts/audit-interactions.mjs
node scripts/audit-api-contracts.mjs
node scripts/audit-repository-reachability.mjs
node scripts/audit-mutation-safety.mjs
node scripts/audit-test-coverage.mjs
node scripts/audit-sbom.mjs
bash scripts/audit-vendored-dependency.sh
bash scripts/audit-packaged-runtime.sh entry/build/default/outputs/default/app/entry-default.hap
bash scripts/lint.sh
bash scripts/test.sh
```

`test.sh` 会编译 Hypium `ohosTest` HAP，其中覆盖并发 refresh 单飞、鉴权失败策略、划掉进程后的会话恢复、Asset Store 真实写入/更新/删除、Preferences 偏好持久化、加密 RDB 快照读写删除、公开客服号码校验、受保护注销标记优先级、Asset Store 缺失/重复/真实故障区分、实时重连与事件去重、Push 深链白名单和点击事件去重、IAP 验证/完成、强制更新优先级、SKU 矩阵、售后金额、上传定位，以及客服 HTTP/WebSocket 双回推与历史分页去重。`audit-test-coverage.mjs` 会阻止关键用例或生产调用链被移除。构建还会拒绝 TODO/占位文案、空点击回调、未绑定处理器的自有按钮，并对登录、交易、上传、审核、配置、IAP 等高风险写操作执行单次提交契约审计。正式 HAP 还会执行包内反证，要求存在 ArkTS 字节码，且归档路径和二进制字符串中不得出现 Vue、DCloud、UniApp、HTML5+ 或 WebView 运行时。没有连接 HarmonyOS NEXT 测试设备时，这一步只证明测试代码可编译，不能代替真机执行；连接设备后运行 `HARMONY_DEVICE_CLASS=phone bash scripts/device-smoke.sh <signed-release.hap> <signed-ohos-test.hap>`，脚本会执行全部测试、校验零失败并归档原始输出。逐页字段/按钮/结果规格见 `docs/BEHAVIOR_INVENTORY.md`，功能证据见 `docs/FUNCTION_PARITY.md`，设备验收步骤见 `docs/DEVICE_ACCEPTANCE.md`。

## 上架前外部配置

AppGallery 中英文介绍、隐私标签、公开法律链接和人工上架清单位于
[`appgallery/`](appgallery/README.md)。`audit-appgallery-compliance.mjs` 会将这些资料与
`app.json5`、`module.json5`、权限理由、原生协议入口和服务端鸿蒙专用法律文本交叉核对；
签名设备截图、版权资质、内容分级和后台提交仍必须在真实账号中完成。

生产签名、AGC 应用与 App Signing、Push Kit 服务账号、IAP 响应验签公钥与 Server API ES256 密钥、商品映射、Map/Location Kit、AppGallery 商品详情页均不得用占位配置代替。缺少其中任何一项时可以继续生成未签名内部 HAP，但不得宣称可公开发布。

运行 `node scripts/check-external-readiness.mjs` 可检查本机签名、AGC 客户端配置、HDC 设备、当前进程内的 Push/IAP 服务端变量，以及生产环境是否真正部署了 Harmony 更新、Push 和 IAP 路由；脚本只输出“存在/缺失”和 HTTP 状态，不会打印密钥或响应正文。AGC 能力开通、IAP 商品映射与 AppGallery 页面需在真实生产账号中人工确认，再分别以 `HUAWEI_AGC_KITS_VERIFIED=1`、`HUAWEI_IAP_PRODUCT_MAPPING_VERIFIED=1`、`HUAWEI_APPGALLERY_LISTING_VERIFIED=1` 记录本次发布会话的确认结果。未全部就绪时脚本以状态码 2 退出，这是预期的发布阻断结果。生产探测中，公开更新接口必须返回有效 `merchant-harmony` 信封，受保护的 Push/IAP 接口必须在无凭据探测时返回 401；400 或 404 会阻止发布，避免只凭本地源码存在就误判服务端已经上线。

后端改动不能只运行 TypeScript 构建。每次部署候选还要在主仓库执行 `pnpm --filter @jiujiu/server smoke:prod`；它会用真实 `AppModule` 启动一个随机本地端口，验证健康检查、Harmony 更新接口、Push/IAP 鉴权边界及纯 JSON WebSocket 首帧，然后自动结束临时进程。该检查可以发现 Nest 模块图等只有在真实引导时才暴露的问题。

## 工程原则

- ArkTS 严格类型、ArkUI 原生组件、Stage 模型；
- IBest-UI 固定为 2.2.7；
- API 26 材质统一经过运行时降级，兼容 API 21 的页面不调用 IBest 高版本绘制组件；
- access token、refresh token、最小用户会话快照与注销标记存储于 Asset Store；注销标记优先于任何残留令牌；
- 最近一次工作台真实快照进入加密 RDB，只在弱网时作为明确标注的离线回退；
- REST 基地址为 `https://ewsn.top`，成功响应码为 `code: 0`；
- 断网或服务异常不清理会话，仅明确吊销/失效才退出；
- 订单/售后实时事件由应用根层持续接收，二级页面打开期间也不会停止；
- 图片入口使用系统相册选择器与 Camera Kit，相机权限只在用户选择拍照时申请；
- 地址使用 Map Kit、Location Kit 与关键词 POI 搜索，不嵌入网页地图；
- 浅色、深色与跟随系统由原生配置和动态 Design Token 共同驱动；
- 每次构建前运行净室审计。
