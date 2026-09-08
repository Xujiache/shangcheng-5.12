# 第三方软件声明

## IBest-UI

- 项目：https://github.com/ibestservices/ibest-ui
- 固定版本：`v2.2.7`（提交 `1444c0fb082c97dd7e767b633df0e058ea503c79`）
- 许可证：MIT
- 用途：HarmonyOS NEXT 通用 UI 组件

依赖以 Git 子模块固定到上述提交。工程在构建前应用
`patches/ibest-ui-api21-loading.patch`：只把加载指示器的 API 26 圆形绘制实现替换为
API 21 可用的原生 `LoadingProgress`，不改变组件 API 或业务行为。除此之外，业务迁移不得通过修改
第三方源码伪装完成；业务视觉与交互适配继续由本工程主题和组合组件承担。

## Hypium

- 项目：https://gitee.com/openharmony/testfwk_arkxtest
- 固定版本：`1.0.24`
- 许可证：Apache-2.0
- 用途：HarmonyOS 原生自动化测试（仅测试范围）

## Hamock

- 包：`@ohos/hamock`
- 固定版本：`1.0.0`
- 许可证：Apache-2.0
- 用途：HarmonyOS 原生测试 Mock 支持（仅测试范围）

机器可读依赖清单见 `docs/sbom.cdx.json`。
