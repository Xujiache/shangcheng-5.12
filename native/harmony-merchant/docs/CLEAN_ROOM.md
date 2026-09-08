# 原生净室边界

本仓库是独立的 HarmonyOS NEXT ArkTS 工程。旧商家端仅用于确认用户可见行为和服务端契约。

允许使用：

- 生产 REST/WebSocket 契约及数据库业务规则；
- 商标、应用名称、图标和用户可见文案；
- HarmonyOS 官方 SDK 与固定版本的第三方开源库。

禁止进入本仓库：

- 旧商家端的 Vue、TypeScript、CSS、组件和状态管理源码；
- UniApp、DCloud、HBuilder、`uni.*`、`plus.*` 和 WebView 兼容层；
- 指向旧前端目录的软链接、构建输入或运行时依赖。

`scripts/audit-clean-room.sh` 是提交和发布前硬门禁。第三方源码只位于 `third_party/`，来源和许可证记录在 `THIRD_PARTY_NOTICES.md`。

