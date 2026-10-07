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
2. 使用 `project.config.json` 中已配置的小程序 AppID。
3. 装类型依赖（让 IDE / tsc 识别 `wx`）：仓库根 `pnpm install` 即可（已声明 `miniprogram-api-typings`）。
   - 首次导入或依赖变更后，在开发者工具选择「工具 → 构建 npm」，让外置 `package.json` 的运行时依赖进入小程序编译包。
4. **生产环境**：`config.ts` 的业务和格式转换地址均为 `https://ewsn.top`，`LOCAL_CONVERSION_TEST` 关闭，开发者工具校验合法域名。微信公众平台需将 `ewsn.top` 配置为合法的 request、uploadFile、downloadFile 域名。
   - 格式转换页复用 `/l/conversions` 接口。原版源码与后端适配器在独立分支 `codex/ledger-original-engine-rebuild` 验证中；全量验收前不要用该分支切换生产。
   - Mac 本地完整后端与原版 worker：`./packages/server/scripts/start-local-original-conversion.sh`。当前本机测试：在 `packages/server` 目录运行 `node --env-file=.env scripts/verify-local-original-conversion.cjs`。小程序连接本地 API 时还需微信开发者工具的本地网络配置。
5. 类型检查：`pnpm --filter @jiujiu/ledger-mp typecheck`。

## 登录 / 隐私配置

- 登录仅使用 `wx.login`：后端按微信 `openid` 自动识别账号，首次登录自动建立账号和空会员记录。
- 新微信账号会自动出现在 **admin-pc 后台**「门窗利账 → 账号管理」，运营按账号编号开通会员。
- 后端必须配置 `LEDGER_WX_APPID`、`LEDGER_WX_SECRET`，并与 `project.config.json` 的小程序 AppID 一致。
- 登录只调用 `wx.login`，后端以 openid 作为唯一身份，不接入其他身份认证组件。
- 微信公众平台隐私保护指引只保留小程序实际处理的信息类型，登录本身不新增额外个人信息类型。
- 会员到期/未开通 → 登录后进「开通会员」闸门页；在后台「会员管理」给账号**增加时长**后重登即可进入。

## 后端接口

- App 接口：`/api/v1/l/*`（`LedgerJwtGuard` + 会员闸门 `LedgerMembershipGuard`）
- 后台接口：`/api/v1/p/ledger/*`（平台/超管角色）
- 详见 `docs/门窗利账/DESIGN_门窗利账.md`。

## 已知事项

- 图表：成本占比用 canvas 环形（`lz-donut`），趋势/月度用 view 柱状（`lz-bars`，规避真机 canvas 兼容问题）。
- `lz-donut` 依赖 Canvas 2D（基础库 ≥ 2.9）。
- 报表「成本分析」中除人工/其他外，型材/玻璃/配件/纱窗暂无逐月明细（后端 `stats/monthly` 仅含 labor/otherCost），展示为年度合计 + 提示。
- 微信登录依赖后端正确配置与当前小程序一致的 AppID / AppSecret。
