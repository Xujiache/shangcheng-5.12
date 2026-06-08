# TODO · 门窗利账（落地待办 + 缺少的配置）

> 代码已全部写完并通过三端类型检查 + 三路对抗审查。以下是**让它真正跑起来 / 上线**还需你做的事，按优先级。
>
> **2026-06-08 增量：全量接入真实后端，已无任何假数据/本地占位。** 消息中心、通知/免打扰/隐私偏好、意见反馈、首页未读红点、头像色、注销申请均改为真实后端（新增 `LedgerNotification`/`LedgerFeedback`/`LedgerSetting` 三表 + `/l/notifications|settings|feedback` 接口 + 后台「意见反馈」管理页与「发送通知」入口）。检查更新改用微信 `UpdateManager`。详见 ACCEPTANCE「2026-06-08 增量」。

## P0 · 让后端能跑（需要数据库）

> ✅ **2026-06-08 已在本机起库 + 建表 + seed + 启动后端，并跑通 26/26 端到端冒烟**（登录 / 通知列表·未读·已读 / 设置读写+校验 / 反馈入库 / 录单自动通知 / 利润计算 / 后台推送 / 反馈处理 / 跨域 token 拦截 全绿）。下面是部署到其它机器的复现步骤。

1. **起依赖 + 建表 + seed**：

   ```bash
   docker compose -f deploy/docker-compose.dev.yml up -d      # postgres(宿主 5433) + redis(6379) + minio
   pnpm --filter @jiujiu/server exec prisma db push           # 按 schema.prisma 建/同步全部表（含 ledger 3 新表）
   SEED_DEFAULT_PASSWORD='你的强密码(≥8位)' pnpm --filter @jiujiu/server prisma:seed
   pnpm dev:server                                            # 监听 .env 的 SERVER_PORT（默认 3001）
   ```

   - **迁移说明**：本仓库 `.gitignore` 忽略 `prisma/migrations/`，**`schema.prisma` 是唯一 SSOT**。新环境直接 `prisma db push`（按 schema 同步，无需迁移历史）即可；本机若保留了迁移文件，`prisma migrate deploy` 亦可（已验证两条 ledger 迁移可正常应用）。
   - **演示密码**：seed 强制要求环境变量 `SEED_DEFAULT_PASSWORD`(≥8 位)，所有演示账号（含门窗利账 `13800138000`）共用该密码。

2. **冒烟自测**（Swagger `http://localhost:3001/api/docs` 或 curl，端口以 .env `SERVER_PORT` 为准）：
   - `POST /api/v1/l/auth/login` 用 `13800138000` / 你设的 SEED 密码 → 返回 token + 月卡会员
   - `POST /api/v1/p/ledger/users`（需平台/超管 token）建号 → `POST .../membership/grant` 加时长

## P1 · 小程序跑起来（需要微信开发者工具）

3. **微信开发者工具**导入 `packages/ledger-mp`，根目录 `pnpm install` 让 IDE 识别 `wx` 类型。
4. **替换 AppID**：`project.config.json` 的 `"appid": "touristappid"` → 你的小程序 AppID（**需要你提供**）。
5. **后端基址**：`miniprogram/config.ts` 的 `API_BASE`
   - 连本地后端：改 `http://localhost:3000` + 工具勾「不校验合法域名」
   - 连线上：把 ledger 后端部署到 `https://ewsn.top` 后保持默认
6. 用演示账号或后台新建账号登录，走一遍：登录 → 闸门/首页 → 记一笔 → 报表 → 客户。

## P2 · 上线前

7. **后端部署**：把含 ledger 模块的后端发布到 `ewsn.top`（或你的生产域名），跑 `migrate deploy`。
8. **小程序合法域名**：微信公众平台后台把后端域名加入 request 合法域名白名单（生产必须 https）。
9. **小程序上架**：补齐隐私协议（`pages/doc` 占位文案需替换为正式条款）、提交审核、发体验版。

## 已落地（2026-06-08 全量接后端）

- ✅ 消息中心：`LedgerNotification` 表 + `/l/notifications`，由下单 / 后台开会员 / 后台手动推送真实产生；首页未读红点走 `/l/notifications/unread-count` 真实未读数。
- ✅ 通知开关 / 免打扰 / 隐私偏好：`LedgerSetting` 表 + `/l/settings` 持久化（换机不丢）。
- ✅ 意见反馈 + 注销申请：`LedgerFeedback` 表 + `/l/feedback`，后台「门窗利账 · 意见反馈」页可查看 / 处理 / 回复。
- ✅ 数据导出：拉真实订单 + 客户复制到剪贴板；清缓存读真实本地存储占用。
- ✅ 头像色：持久化到 `avatar` 字段。检查更新：改用微信 `UpdateManager` 真实机制。

## 可选增强（非阻塞，已知小限制）

- 报表「成本分析」逐月明细：后端 `stats/monthly` 目前只给 `labor`/`otherCost`，型材/玻璃/配件/纱窗仅年度合计。如需逐月分类趋势，给 `monthlySeries` 补每类逐月字段即可（前端已预留降级展示）。
- 短信验证码登录：`SMS_PROVIDER` 生产需配真实网关（复用商城同款 `SmsService`）；当前 dev 码进 SmsCode 表。
- 微信一键登录：当前为占位（按需求以手机号+密码为主）；如需可接 `wx.login` + 后端绑定 openid。
- 推送通知触达：`LedgerSetting` 的通知开关已持久化，但「真实微信订阅消息推送」尚未接入（消息中心内已全量记录）；如需端外推送，可接 `subscribeMessage` + 按 `notify*` 开关过滤。

## 需要你提供 / 决策的输入

- [ ] **小程序 AppID**（填入 `project.config.json`）
- [ ] **生产后端域名**（确认是否仍用 `ewsn.top`）
- [ ] 正式《用户协议》《隐私政策》文案（替换 `pages/doc` 占位）
