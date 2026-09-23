# 量窗助手加载优化与网络安全加固：实施与上线记录

范围：原生小程序 `packages/ledger-mp`、`/api/v1/l/*` 和必要部署链路。基线为 `feat/ledger-mp` 的 `a5bf9a8a358ae4ddb3974af022bea21332a9772d`。本文件不代表生产发布验收。

## 已落地代码

- 36 个历史路由、4 个 Tab 保留；12 个订单/工具/设置页面搬入 3 个分包，旧路径用跳转页透传查询参数。10 张只由设置分包使用的图片随分包移动，未删素材。主包**源文件**体积由 1,585,870 B 降至 1,047,559 B（-33.9%）；这不是开发者工具实际编译包，也不是启动时间。三个分包源文件分别为 94,224 B、77,169 B、376,231 B。
- 首页会员请求与只读统计并行；同一 token/URL 的并发 GET 合并；订单首批 50→20，滚动分页、总数和汇总接口不变。GET 缓存按 token 摘要隔离，写入/退出/换号失效；会员、认证与支付不缓存；首页和订单页明确显示离线旧数据。
- 订单新增 nullable `BIGINT` 营收/成本/利润派生列，新建、修改、导入双写；历史回填调用现有 `revenueOf/totalCost`，保留 `extraIncome` 废弃口径。`LEDGER_FAST_READS=1` 且该账号无空派生值时，列表利润筛选/排序/分页/汇总及客户列表聚合下推数据库；空值自动回退旧路径。列表/客户汇总的 `revenue` 仍为 `total`，不含 extras；单订单利润仍含 extras。统计查询只取实际展示的日期窗。
- 支付回调原始报文缺失、验签失败、实付金额无效/非正数时不发放；失败订单不能重入发放，重复通知保留幂等。虚拟支付推送增加 ±5 分钟时间戳与恒时签名比较；因推送 URL 签名不覆盖报文，发放前再调用微信 `/xpay/query_order`，确认微信订单号、已支付状态、正数且与锁单一致的订单额/实付额和环境；查单失败则不发放并要求重试。停止记录完整回调和查询参数。
- ledger 图片先校验实际魔数、声明 MIME、字节数/大小，再做内容安全检测；反馈图新增独立私有桶、按所有权保存引用、1 小时签名读地址。`LEDGER_PRIVATE_FEEDBACK` 默认关闭，必须先配置桶并迁移/核验历史图，再收紧旧公开 `feedback/` 前缀匿名读取；不能撤销广告/头像仍需的公开读取。
- API 不依赖可选 helmet 即下发 `nosniff`、`X-Frame-Options`、`Referrer-Policy`，生产下发 HSTS；ledger API `private, no-store`，隐藏 `X-Powered-By`。仓库生产 Compose 改为必填数据库/Redis/MinIO 密码，端口仍只绑定回环；**未修改现网**。
- 生产依赖审计发现 Nest 上传链路实际解析 `multer@2.0.2`，命中可经 multipart 触发的高危 DoS（`GHSA-wc9g-mqfw-jrwm` 等）；只对 `@nestjs/platform-express>multer` 增加 pnpm override 至 `2.4.0`，并用 `pnpm why multer` 确认后端实际解析为 `2.4.0`。其余 monorepo 审计结果不能直接当作 ledger 可达漏洞，未做无依据的全仓升级。

## 当前现网只读核验（2026-09-23 21:59 UTC）

`https://ewsn.top/health` 返回 200、`@jiujiu/server` 版本 `0.0.1`，不含 commit/build ID，故**不能确认现网代码与仓库一致**。`http://ewsn.top/health` 返回 301 到 HTTPS；TLS 校验通过；`curl` 协商为 HTTP/1.1。响应仍有 `X-Powered-By: Express`，未见 HSTS 或 `nosniff`；不可信 Origin 请求 `/api/v1/l/auth/config` 未获 `Access-Control-Allow-Origin`。仓库的 `deploy/docker-compose.production.yml` 只起依赖，不能当作现网有效配置。未获得现网 Nginx/PM2/容器/证书续期/对象权限/密钥来源与线上 1 千、1 万单账号，因此未改生产配置、未声称 P0/P1 清零。

本机 Docker daemon 对 `docker ps` 无响应（命令已中断），因此未启动临时 PostgreSQL、未执行 SQL/回填集成验证；临时容器 `codex-ledger-check-20260924` 是否创建也无法确认，待 daemon 恢复后仅核查该名称，避免触碰其他容器。

尚未执行：微信开发者工具实际编译/瀑布图与真机视觉对比、静态图片压缩、1 千/1 万单真实 PostgreSQL 对账与 p95 基线/复测、Wi‑Fi/4G p75、现网 Nginx 压缩/HTTP/2/连接复用/证书/对象策略与凭据轮换。上述项目不是本地单测通过的替代项，生产配置需另行审批。

本地验证：`@jiujiu/server` build/typecheck/lint、Prisma schema validate、迁移/回填脚本独立 TypeScript 检查通过；Jest 37 套 399 例通过；`@jiujiu/ledger-mp` typecheck、`test:routes`、`test:request` 通过；`git diff --check` 通过。以上均不是实际微信编译、数据库回填或线上性能验收。

## 预发布顺序（每一步留存日志与行数）

1. 核对运行中的 Nginx/服务进程、commit/build ID、监听端口、TLS 证书及自动续期、CORS、Swagger、MinIO 匿名策略和凭据来源。先备份 Postgres、MinIO 元数据与对象，记录恢复演练结果；不要从仓库 Compose 推断生产。
2. 用 `psql` 对目标库执行 `deploy/ledger-order-amounts.sql`。单独、**不在事务内**执行 `deploy/ledger-order-amounts-index.sql`。先保持 `LEDGER_FAST_READS=0`，再部署双写服务。不得用全库 `prisma db push` 代替增量 SQL。
3. 在目标服务环境注入 `DATABASE_URL`，于 `packages/server` 执行：
   ```bash
   pnpm exec tsx scripts/backfill-ledger-order-amounts.ts
   pnpm exec tsx scripts/backfill-ledger-order-amounts.ts --apply --batch-size=200
   pnpm exec tsx scripts/backfill-ledger-order-amounts.ts --verify
   ```
   `--verify` 必须 0 mismatch；抽样逐单核对 extras、自定义成本、折扣、回收、退款/未收及客户名聚合。预发布用 1 千/1 万单账号分别对比旧/新列表所有过滤、排序、分页和统计金额。仅在等价后打开 `LEDGER_FAST_READS=1`。
4. 私有反馈图单独灰度：配置不同于 `S3_BUCKET` 的 `S3_PRIVATE_BUCKET`，确认匿名 GET 返回拒绝；配置至少 32 字符随机 `LEDGER_MEDIA_SIGN_SECRET` 和 HTTPS `LEDGER_MEDIA_BASE_URL=https://ewsn.top/api/v1/l/feedback-media/view`。先以旧模式部署支持新旧引用的服务，再设置 `LEDGER_PRIVATE_FEEDBACK=1`。旧客户端拿短时 URL 仍能提交，服务端按上传者校验并转为私有引用。
5. 反馈图迁移前再次备份数据库和公开/私有桶。在 `packages/server` 执行：
   ```bash
   pnpm exec tsx scripts/migrate-ledger-feedback-media.ts
   pnpm exec tsx scripts/migrate-ledger-feedback-media.ts --apply --backup-confirmed
   pnpm exec tsx scripts/migrate-ledger-feedback-media.ts --verify
   ```
   迁移按对象大小和 SHA-256 核验复制后才更新引用；脚本不删除旧对象。处理所有异常来源/跨账号旧引用，真机核验新旧反馈图及后台查看；旧版本灰度结束后才调整公开桶策略，仅撤销 `feedback/` 前缀匿名读取并清理旧对象。**不得整桶关闭公开读取**，广告/头像仍需展示。
6. 与现网 Nginx 配置 diff 后，单独审批并启用 TLS 入口 HTTP/2、连接复用及按实测启用压缩。HSTS、`nosniff`、无 `X-Powered-By`、CORS 白名单、Swagger 关闭和私有/API `Cache-Control` 均从外部重测。仅版本化**公开**图片长缓存；反馈/账本/支付不共享缓存。生产凭据若曾采用仓库旧固定口令，应轮换数据库、Redis 和 MinIO，同时更新服务连接串；先演练再切换。
7. 用虚拟支付沙箱真实订单复核[微信官方查单接口](https://developers.weixin.qq.com/miniprogram/dev/server/API/VirtualPayment/api_query_order)的签名、`status/paid_fee/order_fee/env_type` 字段和[推送 `ErrCode` ACK](https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment.html#推送响应格式说明)；当前回调仅支持 JSON，若实际推送配置为 XML，必须先补齐解析和 XML ACK 才能开启。检查 Nginx 访问日志不记录 `access_token/pay_sig/signature` 等查询参数。
8. 微信开发者工具实际编译后记录主包/分包体积与启动瀑布图；Android/iOS 真机同设备、同 Wi‑Fi/4G、同 1 千/1 万单账号各至少 30 次冷/热样本，记录冷启动、首页可操作、订单/报表 p75、请求数/字节数、接口 p95/5xx。目标：p75 至少 -30%，大账号订单/统计 p95 至少 -50%，36 页/旧分享路由/金额全部等价。未达到则不放量。

## 回退

- 查询性能或金额异常：先关 `LEDGER_FAST_READS`，保持新增列和双写，不做破坏性 SQL 回滚。小程序可退回上一审核版本；旧路径跳转页须保留。
- 私有图异常：停止 `LEDGER_PRIVATE_FEEDBACK` 新上传，**保留新服务对私有引用的读取和签名能力**，不要退回不识别私有引用的旧二进制；已迁移对象与引用不删除。仅在备份和专项恢复验证后处理。
- 生产 Nginx/Compose 变更另行审批；当前未执行。所有线上指标和真机编译结果待补。
