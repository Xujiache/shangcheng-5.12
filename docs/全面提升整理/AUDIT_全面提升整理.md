> 商城5.0（NestJS + Prisma / pnpm 7 包 monorepo）全面提升与整理清单
> 数据来源：8 维度实跑核验。被证伪项已剔除（refutedTitles 为空）。仅 P1 起列入待办；P3「已修复/阴性结论」类不重复列为待办，仅在路线图脚注备案。
> 标记：【修复】= 行为缺陷/回归风险；【整理】= 文档/结构/死代码/CI/契约源治理。

---

## 本轮执行进度（2026-06-17 · feat/ledger-mp · 阶段 0+1+3+5）

已落地 9 个提交，最终 `pnpm lint` / `pnpm typecheck` 退出 0、server 280 测试全过：

| 阶段       | 内容                                                                                                | 清单项                                                   | 提交      |
| ---------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------- |
| 0 解封 CI  | admin-pc 325 lint error 清零 + `^_` 约定 + 删 6 处死代码                                            | #1 #2                                                    | `7e34c22` |
| 0 解封 CI  | server lint 改 prettier --check + lint-staged 接 admin-pc eslint + husky v10                        | #40（+发现并修 server lint 一直缺 eslint 依赖/配置而红） | `51f3027` |
| 1 行为修复 | merchant/platform-app vue-tsc 假绿灯（删失效插件 + CI 守卫）                                        | #4                                                       | `9b2a565` |
| 1 行为修复 | ledger 前端清洗上限对齐后端 + 澄清 DND 设计边界                                                     | #22 #5（重判：非缺陷，DND 仅约束未来推送渠道）           | `fa4813a` |
| 1 行为修复 | user-mp 订单列表补「已退款」标签                                                                    | #23                                                      | `caaa555` |
| 3 契约治理 | shared ApiResult 补 msg/timestamp + admin-pc BaseResponse 对齐                                      | #6                                                       | `a1b8d9b` |
| 3 契约治理 | BizCode 复用约束说明（不做运行时 re-export，详见提交） + v-roles 示例改真实角色                     | #26（重判：re-export 不安全，改注释） #27                | `15d4ecc` |
| 5 文档整理 | README 7 包/建表步骤/链接 + AGENTS 重写 + .env 补全 + deploy/docs/server README + api-coverage 注记 | #14 #15 #16 #17 #31 #32 #33(server) #34 #35 #36          | `ab8b7f4` |
| 5 文档整理 | ledger 协议页示例条款字样 + platform-app refund 过期注释                                            | #28 #29                                                  | `0491ea2` |

未落地（留作后续，按原范围未选 / 风险或工作量另议）：

- 阶段 2 测试补强：#3（订单状态机单测）#11 #12（前端/ledger 纯函数测试）#9 #10 #13（前端真实 lint / admin-pc typecheck 脚本 / ledger-mp 入 CI）
- 阶段 4 死代码与悬空接口清理：#7 #8 #19 #20 #21 #24 #25 #37 #38 #39
- 阶段 5 余项：#33 的 3 个 uni-app 端 README、#31 的 ledger 接口完整补录、#30 上线前替换 project.config.json appid
- 阶段 6 上线/运维：#18（轮换 LK_IMAGE_API_KEY + 生产 .env 权限）、生产装 helmet、生产 JWT_SECRET 强随机

---

## 🔴 P0（无）

本轮所有维度实跑后**无 P0**。安全六维（库存超卖 / 微信回调 / JWT / WS / 限流 / CORS-helmet-Swagger）逐项核验均为「已修复」，下单原子扣减、支付回调五要素、JWT `_r` 闭环、WS 越权校验全部成立。最接近的资金/状态机风险（订单生命周期零测试）因系统已有 CI 硬门禁，属回归风险而非现网在炸，归 P1。

---

## 🟠 P1

### 修复类

- [ ] **1. 【修复】admin-pc 已提交代码 325 个 eslint error，CI `pnpm lint` 硬门禁当前红灯，阻断任何 PR**
  - 位置：`packages/admin-pc`（41 个文件）；`.github/workflows/ci.yml:91-92`；`packages/admin-pc/package.json:14`（lint 脚本为裸 `eslint` 无 `--fix`）
  - 证据：`pnpm exec eslint .` → `325 problems (325 errors, 0 warnings)`，其中 prettier/prettier 312 + `@typescript-eslint/no-unused-vars` 12 + `vue/no-unused-vars` 1；退出码 1；HEAD=e1eb06c 工作树干净（已落库代码）
  - 修复：①在 `packages/admin-pc` 跑 `pnpm exec eslint . --fix` 一次性消化 312 个格式 error（已验证 prettier 与 eslint 目标格式一致，不横跳）；②人工处理剩余 13 个未用变量（见第 2 项的根因治理）；③提交前在仓库根跑 `pnpm lint` 确认退出码 0 再开 PR
  - 关联：根因之一是根 `package.json:43-50` 的 lint-staged 对 `*.vue/*.ts` 只配 `prettier --write` 不跑 eslint，导致这批文件绕过门禁落库（见第 15 项）

- [ ] **2. 【修复】admin-pc eslint 缺 `^_` 忽略约定，13 处未用变量报 error（含真实死代码）**
  - 位置：`packages/admin-pc/eslint.config.mjs:53-61`（`no-unused-vars` 无 `argsIgnorePattern`/`varsIgnorePattern`）；下划线占位：`src/api/member-service.ts:123,215,232,243,256`（`_merchantId`）、`src/views/merchant/commission/index.vue:302`、`src/views/merchant/store/index.vue:352`（`_idx`）；真实死代码：`src/views/merchant/store/index.vue:444`（`roleLabelOf`）、`src/views/platform/app-release/index.vue:131`（`ElMessageBox`）、`src/views/platform/legal/index.vue:105,217`（`computed`/`lastWasRow`）、`components/.../WorkspaceSwitcher.vue:52`（`menuStore`）、`src/views/merchant/product/category/index.vue:53`（模板 `node`）
  - 修复：在 `eslint.config.mjs` rules 加 `'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }]` 并关掉冲突的 base `no-unused-vars`；剩余 6 处真实未用（`ElMessageBox`/`computed`/`roleLabelOf`/`menuStore`/`lastWasRow`/`node`）直接删除导入/变量；顺带清掉 `merchant-business.ts:306`、`useSettingsConfig.ts:231` 两处为同类问题打的内联 `eslint-disable`
  - 说明：与第 1 项同一根因链，应在同一 PR 内完成，否则 `--fix` 后仍残留 13 个 error

### 整理类

- [ ] **3. 【整理/修复】商家·平台订单生命周期核心逻辑零单元测试（资金 + 状态机关键路径）**
  - 位置：`packages/server/src/modules/merchant/merchant.service.ts`（2764 行，主体无 spec）；`packages/server/src/modules/platform/platform.service.ts`（2216 行，零 spec）；漏测的取消/确认实际在 `packages/server/src/modules/user-mp/user-mp.service.ts:733`（`confirmOrder`）、`:874`（`cancelOrder`）
  - 证据：`test/`、`test-integration/` 仅 `payment.controller.spec.ts` 一行注释提及，非真实引用；`usermp-order.spec.ts` 只覆盖 `createOrder`/`payOrder`，未覆盖后续流转
  - 修复（mock PrismaService，参照 `usermp-order.spec.ts`/`order-share.service.spec.ts`，纳入 jest 随 CI 硬门禁执行）：
    - `merchant.service.ts`：`ship(677)` 非 `pending_shipment` 拒绝；`agreeRefund(755)` 的 `finalAmount>applyAmount` 拒绝、`<=0` 拒绝、非 pending 拒绝、wechat 渠道事务内调 wxpay 成功/抛错回滚两条路径；`rejectRefund(822)`
    - `platform.service.ts`：提现状态机 `approveWithdraw`/`rejectWithdrawPlat`（空 reason 拒绝）/`markWithdrawPaid`（拒绝 pending 直接跳步打款）；`approveRefund(844)` 状态前置校验 + wxpay 失败抛 `PAY_FAILED` 不改状态
    - `user-mp.service.ts`：`cancelOrder(874)` 的 `$transaction` 库存回滚（取消后每 item `stock increment`、非 `pending_payment`/`pending_shipment` 拒绝取消——防刷库存关键分支）；`confirmOrder(733)` 置 completed

---

## 🟡 P2

### 修复类

- [ ] **4. 【修复】merchant-app / platform-app 的 vue-tsc typecheck 静默失效——插件路径不存在仍 exit 0，给虚假绿灯**
  - 位置：`packages/merchant-app/tsconfig.json`、`packages/platform-app/tsconfig.json` 的 `vueCompilerOptions.plugins`
  - 证据：`@dcloudio/uni-cli-shared@3.0.0-alpha-5000820260508001` 的 `lib/` 已无 `plugin/vue-tsc-plugin`（`require.resolve` 报 Cannot find module，`lib/` 仅剩 `nvue.css`/`crypto.js`）；vue-tsc 打印 `Load plugin failed ... plugin is not a function` 后仍 exit 0；对照 user-mp 无此配置故 typecheck 干净
  - 修复：从两包 tsconfig 删除整块 `vueCompilerOptions.plugins`（与 user-mp 看齐）；并在 CI Typecheck 步骤 grep `Load plugin failed` 视为失败，防 typecheck 再次静默降级

- [ ] **5. 【修复】免打扰 DND 设置为纯空操作——客户端可设可存，但后端推送从不按时段过滤**
  - 位置：`packages/ledger-mp/miniprogram/pages/dnd/index.ts:18-47`；`packages/server/src/modules/ledger/ledger.service.ts:929-937`（`pushNotification`）；`packages/server/src/modules/ledger/dto/misc.dto.ts:36-38`
  - 问题：`pushNotification` 只检查 `notifyOrder/notifyReport/notifyGoal/notifySystem`，无任何 `dndEnabled/dndStart/dndEnd` 时间窗判断，用户设的免打扰时段对实际行为零影响
  - 修复（二选一）：①在 `pushNotification` 写 `ledgerNotification` 前读 `dndEnabled/dndStart/dndEnd`，落在 `[dndStart,dndEnd]`（跨午夜特殊处理）则跳过/延迟；②若产品不做 DND，删除 dnd 页面 + DTO 字段 + `notifications/index.ts:87` 的 `toDnd` 入口

### 整理类

- [ ] **6. 【整理】shared `ApiResult` 缺 `msg`、`timestamp` 标可选，与后端拦截器实际返回漂移（契约源不完整）**
  - 位置：`packages/shared/src/types/common.ts:6-12`（已核实：仅 `message`、`timestamp?`，无 `msg`）；`packages/server/src/common/interceptors/response.interceptor.ts:8-15`（实返 `code/data/message/msg/traceId/timestamp`）；`packages/admin-pc/src/types/common/response.ts:23`（本地 `BaseResponse` 只有 `code/msg/data`）
  - 修复：在 shared `ApiResult` 增 `msg: string` 并把 `timestamp` 改必填 `timestamp: number`，与拦截器对齐；让 admin-pc `BaseResponse` 复用/对齐 shared（补 `traceId`/`message`），消除双轨成功语义

- [ ] **7. 【整理】后端已实现但前端零调用的接口（聚合分享 / 广场卡片）——消除悬空接口或补页面**
  - 位置：`packages/server/src/modules/merchant/merchant.controller.ts:151`（`merchantOrderShares` → `orderShare.listByMerchant`，GET `/m/orders/shares`）、`:536`（`plazaCards`，GET `/m/plaza/cards`）
  - 证据：四端 grep 均 NONE；merchant-app 只接单订单维度分享与 `plaza/products`
  - 修复（每条二选一）：`/m/orders/shares` → merchant-app 补「我的订单分享」列表页 或 controller 加 `@deprecated` 规划下线；`/m/plaza/cards` → 先与产品确认是否被 `plaza/products` 取代，取代则删 `plazaCards` 方法+service，否则补广场页调用

- [ ] **8. 【整理】死字段 `encBackup`：持久化 + 下发客户端，但全仓零消费方（无客户端读取、无备份任务）**
  - 位置：`packages/server/prisma/schema.prisma:1141`；`ledger.service.ts:991,1003,1027`；`dto/misc.dto.ts:41`；`deploy/ledger-prod-init.sql:142`
  - 修复（二选一）：①不做端到端加密备份则从 DTO/getSetting/updateSetting 白名单/schema 列移除（schema 列可保留并加 `[废弃]` 注释，参照 `extraIncome` 处理避免历史数据丢失）；②要做则补真实备份任务并在隐私页暴露开关。至少先在 schema 注释标 `[未实现]`

- [ ] **9. 【整理/CI】前端 4 端 + shared 的 lint 脚本全是 echo 占位，CI Lint 对它们假绿**
  - 位置：`packages/shared/package.json`、`packages/user-mp/package.json`、`packages/merchant-app/package.json`、`packages/platform-app/package.json`（lint/test 均 `echo '...'` 恒 exit 0）
  - 修复：shared 配真实 `eslint "src/**/*.ts"`；4 个 uni-app 端接入 `eslint + eslint-plugin-vue` 真实 lint 脚本。test 占位可暂留（前端无测试是已知 P2），但 lint 占位会掩盖真实违规，优先替换

- [ ] **10. 【整理/CI】admin-pc 无 typecheck 脚本，`pnpm -r typecheck` 静默跳过——PC 后台从不做类型检查**
  - 位置：`packages/admin-pc/package.json` scripts（无 `typecheck`、无 `test`）
  - 修复：加 `"typecheck": "vue-tsc --noEmit"`，使 `pnpm -r typecheck` 覆盖它（vite/esbuild 不做完整类型检查，当前 admin-pc 类型安全在 CI 全盲）

- [ ] **11. 【整理/测试】前端 4 端 + ledger-mp 零真实自动化测试（优先补 ledger 纯计算）**
  - 位置：`packages/{user-mp,merchant-app,platform-app,admin-pc,ledger-mp}`（Glob `*.{spec,test}` 命中 0）
  - 修复：优先给 ledger-mp 下料 `utils/cutting.ts`(FFD)、排料 `utils/nesting.ts`(guillotine)、计价 `utils/calc.ts` 纯函数补 vitest 单测（可脱离小程序运行时）；端到端测试成本高可延后

- [ ] **12. 【整理/测试】ledger-ai.service 与 ledger-extra.service 无专门单测**
  - 位置：`packages/server/src/modules/ledger/ledger-ai.service.ts`、`ledger-extra.service.ts`（spec 仅覆盖 ledger.service/auth/pay/admin）
  - 修复：先确认两文件职责；含纯计算（AI 解析/金额）则补单测，仅薄封装可降级 P3

- [ ] **13. 【整理/CI】ledger-mp typecheck 未显式纳入 CI，且无 lint/test**
  - 位置：`packages/ledger-mp/package.json:6-8`（仅 `typecheck: tsc --noEmit`）；`.github/workflows/ci.yml:91-95`；`build.yml`（无 ledger-mp job）
  - 修复：在 ci.yml Typecheck 后加显式 `pnpm --filter @jiujiu/ledger-mp typecheck` 防 `pnpm -r` 因无 build 链路漏跑；补 eslint 脚本（原生 mp 构建仍走 HBuilderX/微信开发者工具，留在 CI 外）

- [ ] **14. 【整理/文档】README 项目结构过时：写 6 包实际 7 包，完全没有 ledger-mp / 门窗利账**
  - 位置：`README.md:8-24,26-35,43-52,73-91`（对 ledger/门窗/利账 命中 0）
  - 修复：项目结构树补 `ledger-mp/ # 门窗利账·原生微信小程序`；技术栈表加一行；文档目录表加 `docs/门窗利账/` 链接；说明 ledger-mp 用微信开发者工具导入、不走 `pnpm dev`

- [ ] **15. 【整理/文档】AGENTS.md 全文是 claude-mem context 污染，无任何 agent 指令**
  - 位置：`AGENTS.md:1-83`（整文件被 `<claude-mem-context>` 块占据，日期停在 5-14）
  - 修复：用真正 agent 指令重写（7 包说明、路由域 `/api/v1/{u,m,p,l}/*`、禁 Java/Spring 假设、6A 流程、构建/typecheck/test 命令、密钥放 `.env`），或直接删除并入 `.gitignore`

- [ ] **16. 【整理/文档】`.env.example` 缺大量后端在用的环境变量（ledger/AI/分享/退款链路）**
  - 位置：`.env.example:1-77` 对照 `ledger-pay.service.ts:34-37`、`ledger-ai.service.ts:38-39`、`ledger-extra.service.ts:9`、`ledger-auth.service.ts:46,339-340`、`user-mp.service.ts:1369`、`platform.service.ts:1562-1563`、`wxpay.service.ts:267`
  - 缺失：`LEDGER_WX_APPID`/`LEDGER_WX_SECRET`/`LEDGER_PAY_NOTIFY_URL`/`JWT_LEDGER_TOKEN_TTL`/`LEDGER_EXPORT_SECRET`/`LK_IMAGE_BASE_URL`/`LK_IMAGE_API_KEY`/`PROMOTE_LANDING_URL`/`SHARE_BASE_URL`/`PUBLIC_SHARE_BASE_URL`/`WX_PAY_REFUND_NOTIFY_URL`
  - 修复：按「门窗利账 / AI 生图 / 分享推广 / 退款回调」分组补全，敏感值（`LK_IMAGE_API_KEY`/`LEDGER_EXPORT_SECRET`）只放占位

- [ ] **17. 【整理/文档】`deploy/` 缺 README：10 个 \*.sql 无执行顺序/适用环境说明**
  - 位置：`deploy/`（整目录，10 个 \*.sql + 3 个 docker-compose 仅文件头注释）
  - 修复：新增 `deploy/README.md`：①三个 compose 区别（dev=仅依赖 / 默认=本地全栈 / preview=服务器预览，端口偏移）②按依赖排序的 \*.sql 清单（标注一次性补表 vs 每次新库必跑、init 与 seed 先后，如 changelog-init 先于 changelog-seed）③说明这些 sql 是 prisma migrations 被 gitignore 后的手工建表补丁

- [ ] **18. 【整理/密钥卫生】`packages/server/.env` 含真实可用密钥（已 gitignore 未入库，属本地密钥卫生）**
  - 位置：`packages/server/.env:27`（`LK_IMAGE_API_KEY=sk-5d6d...`，活跃可计费 AI 生图 key）、`:30`（`LEDGER_EXPORT_SECRET`）、`:34`（`LEDGER_WX_APPID`）
  - 证据：`git check-ignore`/`git ls-files`/`git log --all` 确认从未入库（非仓库泄露，故非 P0）
  - 修复：①该 key 已出现在审查上下文，按已暴露处理——立即在 LK888 控制台轮换 `LK_IMAGE_API_KEY`；②生产机 `.env` 设 `chmod 600` 且不随构建产物外发；③长期把真实密钥迁到运维注入的环境变量，仓库内只留占位

---

## 🟢 P3

### 修复 / 死代码清理

- [ ] **19. 【整理】platform-app 广告创意 approve/reject 的 catch fallback 已成死代码（后端路由已实现）**
  - 位置：`packages/platform-app/src/services/index.ts:377-411`；后端 `platform.controller.ts:126/132` + `platform.service.ts:604/635` 已含 AuditRecord + pending 校验
  - 问题：降级路径绕过后端 pending 校验与审计，后端临时 5xx 会静默走低保真
  - 修复：删两方法 try/catch fallback，直接 `return http.post(.../approve)` / `(.../reject,{reason})`；同步清理 `pages/ad/index.vue:465` 残留的「未实现时降级 updateCreative」注释

- [ ] **20. 【整理】商家自审提现废弃接口 `/m/withdraws/:id/review`、`:id/reject` 真实调用方为零（含 mock 死路由）**
  - 位置：`packages/server/src/modules/merchant/merchant.controller.ts:354-374`（`reviewWithdraw`/`rejectWithdraw`，已 `@deprecated`）；`merchant.service.ts:1376-1417`；`packages/shared/src/mock/routes.ts:280-290`（两个死 mock）
  - 证据：审核已上收 `/p/withdraws/*`，`merchant-app/src/services/customer.ts:4-6` 已移除入口，四端 + admin-pc/api grep 均 NONE
  - 修复：删前再 grep `withdraws/.*review` 二次确认后，删除两 controller handler + service 方法 + mock 路由；若担心老版本缓存仍调，可保 controller 仅删 mock

- [ ] **21. 【整理】死开关 SystemConfig 兜底技术债：广告位 preview/startAt/endAt 借 `adSlotMeta` KV「读改写整块」存储**
  - 位置：`packages/platform-app/src/services/index.ts:232-260`
  - 问题：AdSlot 主表无三列，前端挂在 `system_settings.business.adSlotMeta`，并发写有覆盖风险（明确 TODO 待迁主表列）
  - 修复（短期不阻塞）：后端 prisma AdSlot 加 `preview/startAt/endAt` 三列 + `PATCH /p/ads/slots/:id` 单字段更新；前端删 `loadSlotMetaMap/saveSlotMetaMap` 改直连 PATCH

- [ ] **22. 【整理】ledger 前端 `sanitizeExtras/sanitizeCustomCosts` 缺后端的条数/长度上限（预估≠落库）**
  - 位置：`packages/ledger-mp/miniprogram/utils/calc.ts:15-44` vs `packages/server/src/modules/ledger/ledger.constants.ts:187-223` + `dto/order.dto.ts:36-37`
  - 问题：后端有 `.slice(0,50)`/`.slice(0,20)` + `type/name ≤20 字` + `@ArrayMaxSize` 超限 400；前端无截断，导致超量项被算进预估利润后提交 400 或被静默丢弃
  - 修复：`calc.ts` 的 `sanitizeExtras` 加 `.slice(0,50)` 且 `type.slice(0,20)`、`sanitizeCustomCosts` 加 `.slice(0,20)` 且 `name.slice(0,20)`；`order-edit` 加项按钮对 50/20 条做禁用提示（extras 需补，customCosts 已在 `order-edit/index.ts:320` 有拦截）

- [ ] **23. 【整理】user-mp 订单列表缺 `refunded` 标签，与后端会回写 `Order.status='refunded'` 已不一致**
  - 位置：`packages/user-mp/src/pages/order/list.vue:36-49`；后端 `platform.service.ts:869,878,2084,2138` 确会回写 refunded
  - 问题：旧注释假设「后端不回写 refunded」已过期，真退款后列表 fallback 显示英文 `refunded`（line 234），merchant-app/admin-pc 均已含映射，仅 user-mp 缺
  - 修复：`STATUS_META` 补 `refunded: { label: '已退款', tint: '#86909C' }`，并删除 36-41 行过期注释

- [ ] **24. 【整理】admin-pc 提现别名/纯兼容别名接口无前端调用方（路由表噪音）**
  - 位置：`merchant.controller.ts:303/306,312,325,337,358,367,516/523,555`（`commission-rule`/`commissions`/`marketing`/`staff`/`reviewWithdraw`/`rejectWithdraw`/`chat/messages` 别名/`plaza/factory/:id` 单数）
  - 证据：三端 grep 均 NONE（正式路径 `commission/rules`/`marketing/overview`/`staffs`/`chat/sessions/:id/messages`/`plaza/factories/:id` 才有调用）
  - 修复：确认无外部老客户端依赖后删除这些纯别名方法，或统一加 `@deprecated` 集中管理；放后续清理批次

- [ ] **25. 【整理】admin-pc `saveAgencyApplications` no-op 兼容桩有静默数据丢失误用风险**
  - 位置：`packages/admin-pc/src/api/merchant-business.ts:304-309`
  - 修复：全仓 grep `saveAgencyApplications` 确认无调用点后删除；若保留则加 JSDoc `@deprecated` + 函数体 `console.warn`/抛错，避免被误当持久化入口

### 契约源治理

- [ ] **26. 【整理】后端 `BizCode` 是手抄副本，与 shared `ErrorCode` 数值虽逐项一致但无编译期绑定，易漂移**
  - 位置：`packages/shared/src/types/common.ts:47-74` vs `packages/server/src/common/exceptions/biz.exception.ts:4-18`
  - 修复：`biz.exception.ts` 直接 `import { ErrorCode } from '@jiujiu/shared'` 并 `export const BizCode = ErrorCode`（或 type alias），删手抄枚举，使数值唯一来源（后端已依赖 shared，零成本）

- [ ] **27. 【整理/文档】admin-pc `v-roles` 指令注释示例用不存在的 `R_SUPER/R_ADMIN/R_USER`，照写永不匹配致元素消失**
  - 位置：`packages/admin-pc/src/directives/core/roles.ts:19-26`（运行期角色契约本身一致，仅注释误导）
  - 修复：示例改成真实取值，如 `v-roles="'super-admin'"` / `v-roles="['platform','super-admin']"`，与 `store/modules/user.ts:91-106` 派生取值对齐

### 文档残留 / 过时

- [ ] **28. 【整理/文档】platform-app `refundService` 头注释与 `ad/index.vue` 称「后端未实现」，与已落地路由矛盾**
  - 位置：`packages/platform-app/src/services/index.ts:1083-1092`（`/p/refunds` 已由 `platform.controller.ts:379/382/389` + service `listRefunds`/`agreeRefund(2090)`/`rejectRefundPlat(2185)` 真实现）
  - 修复：更新注释为「后端已实现 `/p/refunds` 系列」，删除「未完整实现」「由 Agent E 补」等过期措辞（与第 19 项 ad 注释清理同源，可同批处理）

- [ ] **29. 【整理/文档】ledger-mp 协议页 footer 仍硬编码「本文档为示例条款」，与上方正式条款自相矛盾（阻小程序审核）**
  - 位置：`packages/ledger-mp/miniprogram/pages/doc/index.wxml:13`（`index.ts:11-93` 已是完整正式条款）
  - 修复：删除/改写 footer 的「示例条款」字样为「最终解释权归门窗利账运营方所有」；核实运营主体名称已据实填写

- [ ] **30. 【整理/文档】上线前替换 `project.config.json` 占位 appid `touristappid`**
  - 位置：`packages/ledger-mp/README.md:28,52`（微信一键登录占位经核实是产品决策，非缺陷；appid 占位是真实上线 TODO）
  - 修复：上线前将 appid 由 `touristappid` 替换为门窗利账正式 AppID（若为独立小程序用其自己的 appid）

- [ ] **31. 【整理/文档】`docs/backend-api-coverage.md` 过时：缺整个 ledger `/l/` 域、端口口径不一、Auth 标 ⏳**
  - 位置：`docs/backend-api-coverage.md:20-22,34-44,289`（`/api/v1/l/` 命中 0，5 个 ledger controller 一条未收录）
  - 修复：补「Ledger 门窗利账（`/l/*` 与 `/p/ledger/*`）」一节、Auth 的 ⏳ 改 ✅、统一端口口径（dev=3001 / 生产=3400 / compose 内部=3000）；或文件头加醒目「未覆盖 ledger 域，仅供商城主体参考」

- [ ] **32. 【整理/文档】`SERVER_PORT` 在四处口径不一（3000/3001/3400），无统一约定**
  - 位置：`.env.example:6,74`（3400/注释覆盖 3001）、`packages/server/.env:4`（3001）、`deploy/docker-compose.yml:88`（容器内 3000）、`ledger-mp/README.md:32` 与 `backend-api-coverage.md:20-21`（3000）
  - 修复：在根 README 或 `deploy/README` 用一张表固化：dev 本机=3001 / 生产 PM2=3400 / compose 容器内=3000，各 .env/README 注释引用同一约定

### 仓库结构整理

- [ ] **33. 【整理/文档】4 个核心包缺 README（server / merchant-app / platform-app / user-mp）**
  - 位置：`packages/server/`、`packages/merchant-app/`、`packages/platform-app/`、`packages/user-mp/`
  - 修复：优先给 server 补（模块清单、启动/typecheck/test、env 指引、`prisma db push`/seed、Swagger 入口）和 user-mp 补（uni-app 编译 mp-weixin、AppID、域名白名单、build 输出）；merchant-app/platform-app 可共用一份 uni-app 端通用 README

- [ ] **34. 【整理/文档】`prisma/migrations` 被 gitignore 但 README/部署文档未说明如何建表**
  - 位置：`.gitignore:68-69`；`README.md:56-71`（本地全栈段无建表步骤）
  - 修复：README「本地全栈」段补一步——`pnpm --filter @jiujiu/server prisma db push`（或指向 `deploy/README` 的 sql 顺序）再 `prisma:seed`（需先设 `SEED_DEFAULT_PASSWORD`），并点明 migrations 被 gitignore 的原因（与第 17、34 项联动）

- [ ] **35. 【整理/文档】`docs/` 历史一次性产物未归档、命名两套风格混用、主任务缺 FINAL/TODO**
  - 位置：`docs/商城5.0还原/`（缺 FINAL/TODO）、`docs/backend/`（裸 `DESIGN.md`/`FINAL.md` 无任务名后缀）、`docs/app-pc-audit/`、`docs/小程序发布/`、`docs/软件自更新/`、`docs/s3*/`、`docs/s5*/`
  - 修复：新增 `docs/README.md` 索引（每目录用途/是否 archived/对应包分支）；为 `docs/商城5.0还原/` 补 FINAL+TODO（或注明以 ACCEPTANCE 收尾）；`docs/backend/` 文件重命名带任务名后缀；纯历史产物移入 `docs/archive/`、操作手册移入 `docs/ops/`

- [ ] **36. 【整理/文档】README 第 4 行原型图链接失效（`经纬科技原型.html` 不存在），品牌名「经纬科技」vs「九九」不一致**
  - 位置：`README.md:4`；`原型图/`（实际为 `九九多端商城原型.html` 等）
  - 修复：链接改指真实文件 `原型图/九九多端商城原型.html` 或统一命名；README/目录加一行说明该目录为还原基线（只读参考）；顺带核对全仓品牌命名是否统一

### 死代码（保留型，低收益清理）

- [ ] **37. 【整理】admin-pc `src/views/_examples` 整目录（66 文件 / ~11778 LOC）为模板示例，生产零引用**
  - 位置：`packages/admin-pc/src/views/_examples/`；`router/core/ComponentLoader.ts:17`（仅排除 glob 命中）
  - 修复：已正确从 bundle 排除（`DESIGN_admin-pc-merge.md:252` 认可全量删除），无需紧急处理。瘦身仓库可整目录删除依赖 git 找回；保留则加目录 README 注明「仅参考、不打包」

- [ ] **38. 【整理】admin-pc `@deprecated batchUpdateColumns` 生产无消费，仅 `_examples` 演示页使用**
  - 位置：`useTableColumns.ts:112-117,270-272`；`useTable.ts:720`（re-export）；`_examples/.../tables/index.vue:216,1271`
  - 修复：低优先级，可保留（属第三方模板公共 hook，删了无收益且有回归风险）；彻底清理则连同 `_examples` 一起删

- [ ] **39. 【整理/CI】admin-pc 子包内嵌重复的 `commitlint.config.cjs` 与 prepare/commit 脚本（模板残留，monorepo 不触发）**
  - 位置：`packages/admin-pc/commitlint.config.cjs`、`package.json` 的 `prepare`/`commit`/`lint:lint-staged`（git 钩子只认根 `.husky`）
  - 修复：删除子包 `commitlint.config.cjs` 与模板残留脚本，统一走根配置，消除歧义

- [ ] **40. 【整理/CI】根 lint-staged 仅 `prettier --write` 不跑 `eslint --fix`，提交期零 lint 拦截（第 1 项根因）**
  - 位置：`package.json:43-50`
  - 修复：根 lint-staged 增对 `*.ts` 的 `eslint --fix`（至少覆盖 server/shared），并在补齐前端真实 lint 脚本（第 9 项）后扩到 `*.vue`，让本地提交即拦明显 lint 问题；确认 husky pre-commit 在各开发机生效

- [ ] **41. 【整理/CI】`build.yml` 仅 push main 触发，PR 不构建——admin-pc/前端构建错误进 main 才暴露**
  - 位置：`.github/workflows/build.yml:20-23`（无 `pull_request`）
  - 修复：补齐 admin-pc typecheck（第 10 项）后风险大幅下降；若要前移可在 PR CI 加 `pnpm --filter @jiujiu/admin-pc build` 或至少 typecheck

---

## 改进与整理路线图

| 阶段                                        | 主题                           | 工作量      | 内容（清单编号）                                                                                                                                                                                                                        |
| ------------------------------------------- | ------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **阶段 0 · 解封 CI（先做，1 天内）**        | 让 main 的 PR 能过 Lint 硬门禁 | S（0.5 天） | #1 `eslint --fix` 消化 312 格式 error + #2 加 `^_` 忽略并删 6 处真实死变量（同一 PR）；#40 根 lint-staged 补 `eslint --fix` 堵根因                                                                                                      |
| **阶段 1 · 行为缺陷修复（1 周）**           | 消除虚假绿灯与空操作开关       | M（2-3 天） | #4 删 vue-tsc 失效插件配置 + CI grep 守卫；#5 DND 后端时间窗过滤（或删入口）；#22 ledger 前端清洗上限对齐；#23 user-mp refunded 标签                                                                                                    |
| **阶段 2 · 测试补强（1-2 周）**             | 资金/状态机回归护栏            | L（5-8 天） | #3 merchant/platform/user-mp 订单状态机单测（资金 + 非法跳转 + 库存回滚）；#11 ledger-mp 下料/排料/计价 vitest；#12 ledger-ai/extra 单测；#10 admin-pc typecheck 脚本；#13 ledger-mp typecheck 入 CI；#9 前端真实 lint                  |
| **阶段 3 · 契约源治理（3-4 天）**           | 消除契约漂移与双轨             | M           | #6 shared ApiResult 补 msg/timestamp + admin-pc BaseResponse 对齐；#26 BizCode 复用 shared ErrorCode；#27 v-roles 注释修正                                                                                                              |
| **阶段 4 · 死代码与悬空接口清理（3-5 天）** | 收敛路由表与设置项噪音         | M           | #7 悬空聚合/卡片接口；#8 encBackup 死字段；#19 广告 fallback 死代码；#20 废弃提现接口+mock；#24 admin-pc 别名接口；#25 no-op 兼容桩；#21 adSlotMeta 迁主表（可延后）；#37/#38/#39 模板残留                                              |
| **阶段 5 · 文档与仓库整理（持续，3-4 天）** | 让新人/部署可自助              | M           | #14 README 7 包；#15 AGENTS.md 重写；#16 .env.example 补全；#17 deploy/README；#33 四包 README；#34 建表指引；#31 backend-api-coverage 更新；#32 端口口径表；#35 docs 归档与命名；#36 原型图链接/品牌名；#28/#29/#30 文档残留与上线占位 |
| **阶段 6 · 密钥卫生与上线前(运维)**         | 上线前必办                     | S           | #18 轮换 LK_IMAGE_API_KEY + 生产 .env chmod 600；#30 替换 project.config.json appid；运维确认生产已 `pnpm add helmet`（代码就绪、依赖未装）；生产 `JWT_SECRET` 用 `openssl rand -base64 48`                                             |

> 已核验为「已修复/无需改动」、不进待办的项（仅备案）：下单库存超卖原子扣减、微信回调五要素、JWT `_r` 闭环、chat.gateway WS 越权校验、限流单桶+端点级、CORS/Swagger 生产关、订单分享白名单、`extraIncome` 有意保留列、`hideAmount`/`bioLock`/`mustReset` 已有消费方、四端无「前端孤儿调用」、admin-pc 11 模块管理页齐全、`.env` 未入库且生产 JWT 强校验。唯一运维待办：生产装 helmet。
