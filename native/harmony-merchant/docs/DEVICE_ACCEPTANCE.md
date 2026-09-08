# HarmonyOS NEXT 真机验收清单

本清单只记录真实设备结果。源码存在、HAP 编译成功或模拟数据截图都不能把项目标记为通过。

## 验收前置

- [ ] AppGallery Connect 中已创建 `top.ewsn.jingwei.merchant`，包名与工程完全一致。
- [ ] 已配置正式签名、App Signing、证书与 Profile，且签名材料未进入 Git。
- [ ] Push Kit、Map Kit、Site Kit、Location Kit、IAP 已在同一 AGC 应用开通。
- [ ] 服务端已配置 Push 服务账号、IAP 响应验签公钥、IAP Server API 应用 ID/Issuer ID/Key ID/ES256 私钥，以及套餐到华为商品的真实映射。
- [ ] AppGallery 已创建可访问的应用详情页；后台 `merchant-harmony` 发布记录指向其 HTTPS 地址。
- [ ] 至少准备一台 HarmonyOS NEXT 手机、一台大屏/折叠屏或平板，以及手势与三键导航场景；执行设备脚本时分别设置 `HARMONY_DEVICE_CLASS=phone|foldable|tablet`，禁止误标设备类型。
- [ ] 使用内部测试商家账号，所有支付、退款、发货和短信动作明确处于测试范围。

发布前先运行 `bash scripts/inspect-app-pack.sh <signed-release.app> --require-signed`，验证 App Pack 内部 HAP 的真实签名和元数据；`bash scripts/build-release.sh` 会把该次源码、SBOM、包体哈希和门禁状态写入 `artifacts/release/1.0.0/release-evidence.json`。连接设备后再运行 `HARMONY_DEVICE_CLASS=phone bash scripts/device-smoke.sh <signed-release.hap> <signed-ohos-test.hap>`，并在大屏设备上把类型改为 `foldable` 或 `tablet` 再执行一次。脚本会同时验证两个 HAP 的签名、元数据及签名证书链一致性，以覆盖安装方式保留现有应用数据，执行全部 Hypium 用例并拒绝数量不符、忽略、失败或错误结果，随后验证主应用启动和进程存活；生成的 `artifacts/device-smoke/` 目录包含设备、系统、包体哈希、签名指纹、原始测试输出与机器可读测试摘要，应随发布证据归档。该步骤仍不能替代下方 31 项人工业务验收。

同一发布候选还必须运行 `bash scripts/verify-backend-harmony.sh`。该脚本执行 12 组、至少 87 项 Harmony 专项
Jest、服务端类型检查、生产构建、`18195819181` 的 30 个只读生产接口以及 JSON WebSocket
鉴权/会话归属验证，并把服务端源码树哈希和结果写入 `artifacts/backend-verification/`；报告中不记录
数据库、JWT、Push 或 IAP 凭据值。

## 安装、启动与会话

- [ ] 正式签名 HAP 可安装，桌面名称、图标、包名和版本号正确。
- [ ] 首次启动立即出现原生首帧，不出现长时间白屏；未登录也能自动检查更新。
- [ ] 密码登录、短信登录、协议跳转、审核中/驳回/停用状态与服务端一致。
- [ ] 登录后强制结束进程、重启设备、断网启动，仍能恢复工作台；网络恢复后静默续签。
- [ ] 删除可选用户快照但保留 refresh token 后强制结束进程，仍能恢复商家会话并重新获取资料；不得误跳登录页。
- [ ] 模拟 Asset Store 服务不可用、访问拒绝或数据损坏时进入“会话恢复失败”安全页；点击重试后恢复，且故障期间不得删除或覆盖原凭据。只有官方 `NOT_FOUND` 才可判定本地无会话。
- [ ] access token 过期且 refresh token 有效时，Push 与 WebSocket 在刷新后重新接入。
- [ ] 主动退出、令牌吊销和账号停用会清除会话；普通网络错误不会清除会话。
- [ ] 主动退出时模拟 refresh token 删除失败，随后强制结束进程并重启，注销标记仍阻止旧会话恢复；恢复 Asset Store 后重新登录可正常清除标记并保持新会话。

## 31 个业务面

- [ ] 1–5：启动恢复、登录、入驻、密码、工作台全部走通。
- [ ] 6–10：商品列表、订单列表、经营数据、我的、商品编辑全部走通。
- [ ] 11–15：分类、代理商品、订单详情、售后、客户全部走通。
- [ ] 16–20：佣金、门店、门店授权、员工、店铺装修全部走通。
- [ ] 21–25：营销、客服会话、客服详情、更新中心、选品广场全部走通。
- [ ] 26–31：厂家详情、会员、个人资料、设置、分享、价格规则全部走通。
- [ ] 每一项均按 `BEHAVIOR_INVENTORY.md` 核对输入、按钮、服务端结果、失败提示与权限边界。

## 原生系统能力

- [ ] 相册、相机、定位、通知权限分别覆盖“允许、仅本次、拒绝、稍后在设置中恢复”。
- [ ] Map/Site 搜索、当前位置、地图选点与地址/经纬度保存一致。
- [ ] 拨号、系统分享、复制、二维码保存都由系统能力完成，无 WebView 或旧跨端桥。
- [ ] 新订单、售后和客户消息覆盖前台 WebSocket、后台 Push、点击通知深链和偏好关闭。
- [ ] 客服覆盖文字、快捷回复、横竖图片、历史分页、断线恢复、失败重试、已读与去重。
- [ ] IAP 覆盖订阅、增值包、取消支付、恢复购买、自动续费取消、退款和到期回调；同一 v3 请求号重放不重复发权益，伪造退款事件不能越过华为权威状态回查。
- [ ] 更新覆盖普通/强制版本、未登录提示、AppGallery 跳转、无网络重试和覆盖升级会话保留。

## 适配、性能与发布证据

- [ ] 浅色、深色、跟随系统切换后所有页面、弹窗和系统栏可读。
- [ ] 系统字体分别设为 1.0×、1.3×、2.0×；标题、表单、金额、徽标和按钮不截断，长文可滚动，且应用内没有二次缩放。
- [ ] 键盘、手势区、三键导航、横竖屏均无遮挡和错误点击层。
- [ ] 折叠/展开及平板窗口宽度跨过 720vp 时，底部导航切为左侧主导航，右侧详情保持当前业务面、筛选和滚动状态。
- [ ] 商品、订单、客服等长列表连续滚动无明显卡顿；冷启动、首屏和内存数据已记录。
- [ ] 使用 DevEco Profiler 在完成一次预热后记录基线，连续执行“首页→商品→订单→数据→我的→首页”10 轮（共 50 次一级导航），再次触发 GC 并记录 ArkTS Heap、Native Heap 与 PSS；内存曲线无持续单调增长，稳定值相对基线增量不超过 10% 或 20 MiB（取较大者）。
- [ ] 上述 50 次导航中没有白屏、点击失效、重复请求风暴或页面状态串扰；前后两次 Profiler 截图、时间线和异常日志已归档到同一构建 SHA。
- [ ] `ohosTest` 已在设备执行，不只是编译；测试报告已归档。
- [ ] 31 项结果、设备型号、系统版本、构建 SHA、截图/录屏、失败单与复测结果已归档。
- [ ] AppGallery 提交包、签名指纹、SBOM/第三方许可证和服务端版本已形成同一发布清单。

只有以上项目全部通过，才能把 `FUNCTION_PARITY.md` 的真机列从 `PENDING` 改为已验收。

逐项验收时复制 `docs/release-acceptance.template.json` 到安全目录
`/root/secure/jingwei-harmony-signing/release-acceptance.json`，填写当前 Git SHA、App Pack SHA、31 项
证据、六类系统能力证据、首帧/50 次导航/内存数据及验收人。最后运行
`node scripts/release-gate.mjs`；脚本会联合检查三层签名、后端证据、AGC/Push/IAP/AppGallery、
手机与大屏设备 Hypium 证据和人工验收，任一项缺失都会保持 `NOT READY`。
