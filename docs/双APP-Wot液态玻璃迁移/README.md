# 双 APP Wot Design Uni 与液态玻璃迁移

## ALIGNMENT

- 范围：商家 APP 31 页、平台 APP 29 页及隐藏入口。
- 主组件库：`wot-design-uni@1.14.0`；Sass 固定 `1.78.0`。
- 液态玻璃：`@aslanonur/liquid-glass-vue@1.1.3`，仅通过共享 `GlassSurface` 使用。
- 业务边界：不修改接口、路由、Token、Pinia、上传、支付、更新安装及权限契约。
- 交付版本：商家 `1.1.0/112`，平台 `1.1.0/106`。

## DESIGN

- `wd-config-provider` 驱动全部页面，主题支持 `system/light/dark` 并持久化。
- 共享 Token 定义经纬橙、间距、分级圆角、阴影、深浅背景、玻璃材质和动效。
- `GlassSurface` 提供液态折射、真实背景模糊、半透明材质、边缘高光和低性能降级；组件异常由错误边界捕获。
- Navbar/TabBar 使用轻量背景模糊，登录与更新等高价值卡片使用液态表面；普通列表不启用实时折射。
- 现有选图、压缩和鉴权上传由 `delegateWotUploadChoose` 接到 Wot Upload 外壳，上传业务契约不变。

## TASK

- [x] 双端依赖、Easycom、Design Token、主题状态和 GlassSurface。
- [x] 60 个页面接入 Wot Config Provider、Toast、MessageBox、ActionSheet。
- [x] Button/Input/Textarea/Switch/Picker/Upload/Navbar/TabBar/Tabs/Card/Tag/Empty/Popup 全量迁移。
- [x] 删除旧 Icon、Navbar、TabBar、Tabs、Empty、Section、Status、订单卡和商品卡。
- [x] 清除原生反馈 API、旧组件引用、手写遮罩弹层和重复 UI 依赖。
- [x] 建立 `pnpm audit:app-ui` 迁移门禁。
- [x] 双端类型检查、H5、App 资源构建。
- [x] 正式 APK 构建、签名校验、发布与公网校验。

## ACCEPTANCE

```bash
pnpm audit:app-ui
pnpm --filter @jiujiu/shared typecheck
pnpm --filter @jiujiu/merchant-app typecheck
pnpm --filter @jiujiu/platform-app typecheck
pnpm --filter @jiujiu/merchant-app build:h5
pnpm --filter @jiujiu/platform-app build:h5
pnpm --filter @jiujiu/merchant-app build:app
pnpm --filter @jiujiu/platform-app build:app
```

审计强制检查 31/29 页面数量、主题容器、版本锁定、旧组件、原生控件、旧反馈 API、手写弹层、Wot 覆盖量、Upload/Popup/GlassSurface 接入。

## FINAL

- 商家端：`top.ewsn.jingwei.merchant`，`1.1.0/112`，18,484,168 bytes  
  `https://ewsn.top/oss/jiujiu-mall/apk/2026/08/s0hk3zz2une3bzq4.apk`  
  SHA-256：`c7db763737d591fd47021ac0328bf72b96eba16f0d99c20efe3b0c28db96a67c`
- 平台端：`top.ewsn.jingwei.platform`，`1.1.0/106`，18,403,932 bytes  
  `https://ewsn.top/oss/jiujiu-mall/apk/2026/08/f3pksk4nvhk9qbzf.apk`  
  SHA-256：`b64fcdf58ab0425338697249509556dd0533a0e219ad159b123c74a60752cf67`
- 两个 APK 均通过 `apksigner` v1/v2/v3 校验，公网返回 HTTP 200 与 Android APK MIME，远端大小和哈希与本地产物一致。
- 发布记录均为非强制更新，线上 `latest` 已分别返回 versionCode 112 和 106。
