# 门窗利账 · 原生微信小程序（记账新端）

门窗加工/安装店主的**订单利润记账**工具。录入每单收款 + 成本，自动算利润，看月/季/年报表与客户档案。**会员制**：会员由 admin-pc 后台开通，过期即进入闸门页锁定功能。

> 技术栈：原生微信小程序（TypeScript，IDE 内置 TS 编译）+ canvas/view 图表。与商城其它 uni-app 端**不共用构建**。

## 目录结构

```
packages/ledger-mp/
├── project.config.json        # 微信开发者工具工程配置（appid 待替换）
├── tsconfig.json              # types: miniprogram-api-typings
├── package.json               # devDep: miniprogram-api-typings
└── miniprogram/
    ├── app.{ts,json,wxss}     # 全局：token、自定义 tabBar、主题
    ├── config.ts              # ★ API_BASE 后端基址
    ├── styles/                # tokens(浅色/teal) + animations + components(lz-* 类)
    ├── utils/                 # request / store / format / calc / icons
    ├── api/index.ts           # 所有后端接口封装
    ├── components/            # lz-icon / lz-header / lz-segmented / lz-bars / lz-donut
    ├── custom-tab-bar/        # 悬浮玻璃底栏 + 中间 FAB
    └── pages/                 # 25 个页面（登录 / 会员 / 首页 / 订单 / 报表 / 客户 / 设置…）
```

## 跑起来

1. **微信开发者工具** → 导入项目 → 目录选 `packages/ledger-mp`。
2. 替换 `project.config.json` 的 `appid`（当前占位 `touristappid`，仅可用于无 AppID 预览）。
3. 装类型依赖（让 IDE / tsc 识别 `wx`）：仓库根 `pnpm install` 即可（已声明 `miniprogram-api-typings`）。
4. **后端基址**：`miniprogram/config.ts` 的 `API_BASE`
   - 默认 `https://ewsn.top`（ledger 接口需先部署到该后端）。
   - 本地调试：改成 `http://localhost:3000` 并在工具里勾选「不校验合法域名」（`project.config` 已设 `urlCheck:false`）。
5. 类型检查：`pnpm --filter @jiujiu/ledger-mp typecheck`。

## 登录 / 隐私配置

- 账号由 **admin-pc 后台**「门窗利账 → 账号管理」创建，无小程序自助注册。
- 登录以微信手机号快捷登录为主：手机号匹配后台账号后自动绑定当前微信；后续可直接使用微信登录。
- 后端必须配置 `LEDGER_WX_APPID`、`LEDGER_WX_SECRET`，并与 `project.config.json` 的小程序 AppID 一致。
- 微信公众平台必须进入「设置 → 服务内容声明 → 用户隐私保护指引」，声明处理“手机号”，用途建议填写：`用于识别后台已开通账号、完成登录及账号安全校验，不用于公开展示或营销推广。`
- 提审时在「用户隐私保护设置」选择“采集用户隐私”。隐私类型更新约 5 分钟后生效；未声明会触发 `errno:112`。
- 登录按钮使用微信官方组合组件 `getPhoneNumber|agreePrivacyAuthorization`，同时适配手机号授权与隐私保护指引授权。
- 后端 `prisma:seed` 内置演示账号：**手机号 `13800138000` / 安全密码 = `SEED_DEFAULT_PASSWORD`**，已带月卡会员 + 3 客户 + 5 订单。该密码无默认值，须在跑 seed 前显式设置（至少 8 位强密码），否则 seed 拒绝运行。
- 会员到期/未开通 → 登录后进「开通会员」闸门页；在后台「会员管理」给账号**增加时长**后重登即可进入。

## 后端接口

- App 接口：`/api/v1/l/*`（`LedgerJwtGuard` + 会员闸门 `LedgerMembershipGuard`）
- 后台接口：`/api/v1/p/ledger/*`（平台/超管角色）
- 详见 `docs/门窗利账/DESIGN_门窗利账.md`。

## 已知事项

- 图表：成本占比用 canvas 环形（`lz-donut`），趋势/月度用 view 柱状（`lz-bars`，规避真机 canvas 兼容问题）。
- `lz-donut` 依赖 Canvas 2D（基础库 ≥ 2.9）。
- 报表「成本分析」中除人工/其他外，型材/玻璃/配件/纱窗暂无逐月明细（后端 `stats/monthly` 仅含 labor/otherCost），展示为年度合计 + 提示。
- 微信手机号快捷登录依赖公众平台已开通对应组件用量并完成隐私类型声明。
