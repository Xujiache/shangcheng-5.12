# TODO · 门窗利账（落地待办 + 缺少的配置）

> 代码已全部写完并通过三端类型检查 + 三路对抗审查。以下是**让它真正跑起来 / 上线**还需你做的事，按优先级。

## P0 · 让后端能跑（需要数据库）

1. **起数据库并应用迁移**（本机 docker 未启动，我无法代跑）：

   ```bash
   docker compose -f deploy/docker-compose.yml up -d        # postgres + redis + minio
   pnpm --filter @jiujiu/server exec prisma migrate deploy   # 应用 ledger_init 迁移（已生成）
   pnpm --filter @jiujiu/server exec prisma db seed          # 写入演示账号（含门窗利账 13800138000）
   pnpm dev:server
   ```

   - 迁移文件：`packages/server/prisma/migrations/20260608030000_ledger_init/migration.sql`
   - 若想用 `migrate dev` 自动建迁移亦可（schema 已是最终态）。

2. **冒烟自测**（Swagger `http://localhost:3000/api/docs` 或 curl）：
   - `POST /api/v1/p/ledger/users`（需超管 token）建号 → `POST .../membership/grant` 加时长
   - `POST /api/v1/l/auth/login` 用 `13800138000` / 默认密码 → 应返回 token + 月卡会员

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

## 可选增强（非阻塞，已知小限制）

- 报表「成本分析」逐月明细：后端 `stats/monthly` 目前只给 `labor`/`otherCost`，型材/玻璃/配件/纱窗仅年度合计。如需逐月分类趋势，给 `monthlySeries` 补每类逐月字段即可（前端已预留降级展示）。
- 短信验证码登录：`SMS_PROVIDER` 生产需配真实网关（复用商城同款 `SmsService`）；当前 dev 码进 SmsCode 表。
- 微信一键登录：当前为占位（按需求以手机号+密码为主）；如需可接 `wx.login` + 后端绑定 openid。
- 消息中心/通知/隐私开关：现为本地态（管理员制模型下合理），如需服务端化可加 `LedgerNotification` 表。
- 首页消息红点 `unread` 暂为常显（无通知后端），接通后改为真实未读数。

## 需要你提供 / 决策的输入

- [ ] **小程序 AppID**（填入 `project.config.json`）
- [ ] **生产后端域名**（确认是否仍用 `ewsn.top`）
- [ ] 正式《用户协议》《隐私政策》文案（替换 `pages/doc` 占位）
