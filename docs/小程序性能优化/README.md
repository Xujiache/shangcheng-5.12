# 小程序启动与页面性能优化

日期：2026-09-30

## 范围

目标源码：`packages/ledger-mp/miniprogram`。本次只改小程序加载、路由和非关键请求调度；生产接口仍为 `https://ewsn.top`，没有启动本地后端，也没有打开微信开发者工具预览。

## 已完成

- 保留 `lazyCodeLoading: "requiredComponents"`，移除 `lz-route-feedback`、`lz-skeleton` 的全局注册，改为仅在实际使用页面注册，避免启动时注入所有页面都不需要的组件。
- 首页进入后预下载工具、格式转换、更多工具和记工分包；只在 Wi-Fi 下触发，符合微信每个触发页 2 MB 的预下载额度。
- 将记工总览实现移入 `subpackages/workbook/overview`；旧 `/pages/work-log/index` 保留为兼容壳。首页、记工导航直接进入真实分包页。
- 订单详情、订单编辑、订单明细、成本分类、设置、三角计算、圆弧计算、优化下料等入口直接进入真实分包页，跳过旧兼容壳的二次跳转。
- 埋点队列延后并合并发送，避免首屏脚本执行和网络请求竞争；登录、网络恢复仍会触发补发。
- 删除仅用于已关闭本地测试分支的 6 张首页静态广告图。生产广告继续由 `/l/ads` 返回；接口失败时保持空态，不影响核心页面。

## 包体测量

以下是工程目录文件的未压缩字节数，不等同于微信最终 ZSTD 包体；最终压缩包仍应在开发者工具的代码包分析中确认。

| 包                       | 优化前（本次改动前） |        当前 |                 变化 |
| ------------------------ | -------------------: | ----------: | -------------------: |
| 主包                     |          2,203,135 B | 1,434,402 B | -768,733 B（-34.9%） |
| `subpackages/orders`     |             95,742 B |    95,807 B |                +65 B |
| `subpackages/tools`      |            141,807 B |   141,807 B |                  0 B |
| `subpackages/format`     |             65,229 B |    65,229 B |                  0 B |
| `subpackages/metal`      |            322,839 B |   322,839 B |                  0 B |
| `subpackages/more-tools` |            597,384 B |   597,384 B |                  0 B |
| `subpackages/workbook`   |            186,707 B |   186,710 B |                 +3 B |
| `subpackages/settings`   |            378,481 B |   378,565 B |                +84 B |

主包减少量主要来自删除 6 张不再被生产代码引用的静态广告图；页面实现没有用低质量占位图替换。

## 验证

- `tsc --noEmit -p packages/ledger-mp/tsconfig.json`：通过。
- 官方微信 `wcc`/`wcsc`：67 个注册页面、80 个 WXML、89 个 WXSS，通过。
- 路由校验：67 页面、12 个兼容壳、4 个 Tab，通过。
- 页面过渡回归：12 项，通过。
- 请求缓存、记工、格式转换、工具、潮汐、金属、玻璃工具专项测试：通过。
- ESLint：通过。

未执行真机和微信开发者工具预览，因此冷启动毫秒数、弱网分包下载时间和不同机型内存峰值仍需在用户设备上测量。

## 参考

- [微信官方：代码包体积优化](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/tips/start_optimizeA.html)
- [微信官方：分包预下载](https://developers.weixin.qq.com/miniprogram/dev/framework/subpackages/preload.html)
