# deploy/ 部署目录说明

经纬科技 5.0（NestJS + Prisma 的 pnpm monorepo）的部署相关产物：三套 Docker Compose、Nginx 反向代理配置，以及一组手工建表 / 数据迁移的 SQL 补丁。

---

## 1. 三套 Docker Compose

| 文件                         | 容器名前缀     | 起哪些服务                                                             | 端口                                          | 用途                                        |
| ---------------------------- | -------------- | ---------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------- |
| `docker-compose.yml`         | `jiujiu-*`     | postgres + redis + minio + minio-init + **server + nginx**（全栈）     | 全部映射到 `0.0.0.0` 默认端口                 | 本地全栈，连后端镜像一起跑                  |
| `docker-compose.dev.yml`     | `jiujiu-*-dev` | **仅依赖**：postgres + redis + minio（无 minio-init / server / nginx） | postgres 偏移到 `5433:5432`，redis/minio 默认 | 开发时只起依赖，server / 前端在宿主机本地跑 |
| `docker-compose.preview.yml` | `shangcheng-*` | **仅依赖**：postgres + redis + minio + minio-init（无 server / nginx） | 全部绑 `127.0.0.1` 且端口偏移                 | 服务器预览部署，与其他主机服务隔离          |

### 1.1 `docker-compose.yml` —— 本地全栈（含 server + nginx）

文件头注释明确两种用法：本文件 `up -d` 启动全部（含 server）；`docker-compose.dev.yml` 仅依赖。

services：

- **postgres**（`postgres:16-alpine`，容器 `jiujiu-postgres`）：用户/密码/库 `jiujiu / jiujiu_dev_pwd / jiujiu_mall`，`5432:5432`，带 `pg_isready` healthcheck，卷 `postgres_data`。
- **redis**（`redis:7-alpine`，容器 `jiujiu-redis`）：`6379:6379`，`redis-cli ping` healthcheck，卷 `redis_data`。
- **minio**（`minio/minio:latest`，容器 `jiujiu-minio`）：root 账号 `minioadmin / minioadmin_dev`，API `9000:9000`、控制台 `9001:9001`，卷 `minio_data`。
- **minio-init**（`minio/mc:latest`）：等 minio healthy 后创建桶 `jiujiu-mall` 并设为公开匿名读，完成即退出。
- **server**（由 `packages/server/Dockerfile` 构建，容器 `jiujiu-server`）：依赖 postgres/redis/minio 全部 healthy 后启动；`NODE_ENV=production`、`SERVER_PORT=3000`、`DATABASE_URL` 指向 `postgres:5432/jiujiu_mall`、`REDIS_URL=redis://redis:6379`、`S3_ENDPOINT=http://minio:9000`、桶 `jiujiu-mall`，`JWT_SECRET` 取环境变量（默认占位 `please-change-me-in-production`，生产务必覆盖）；`3000:3000`。
- **nginx**（`nginx:alpine`，容器 `jiujiu-nginx`）：依赖 server，`80:80`，挂载 `./nginx/nginx.conf` 与 `./nginx/conf.d`（均只读）。

### 1.2 `docker-compose.dev.yml` —— 仅依赖（开发用）

文件头注释：「仅依赖服务（开发时使用，前端 / 后端在宿主机本地跑）」。只有 postgres / redis / minio 三个容器，**没有** minio-init、server、nginx。

- 容器名带 `-dev` 后缀（`jiujiu-postgres-dev` 等），卷也独立（`postgres_data_dev` / `redis_data_dev` / `minio_data_dev`），与全栈那套互不冲突。
- 关键端口差异：**postgres 映射为 `5433:5432`**（避免与本机/其他 PG 占用 5432 冲突）；redis `6379:6379`、minio `9000/9001` 仍是默认。
- 没有 healthcheck（依赖服务，本地直接连即可）。

### 1.3 `docker-compose.preview.yml` —— 服务器预览部署（端口偏移 + 绑回环）

文件头注释：「与 o2o-preview / 主机服务隔离：全部绑 127.0.0.1 + 端口偏移」。同样**只起依赖**（postgres + redis + minio + minio-init），不含 server / nginx。

- 容器名前缀改为 `shangcheng-*`（`shangcheng-postgres` / `-redis` / `-minio` / `-minio-init`），库与账号也换成 `shangcheng / shangcheng_dev_pwd / shangcheng_mall`，minio 桶为 `shangcheng-mall`。
- 全部端口**绑定到 `127.0.0.1`** 并做偏移，避免暴露公网、避免与同机其它项目（如 o2o-preview）抢端口：
  - postgres：`127.0.0.1:5433` → 5432
  - redis：`127.0.0.1:6398` → 6379
  - minio：`127.0.0.1:9200`（API）/ `127.0.0.1:9201`（控制台）
- 卷名为通用的 `postgres_data` / `redis_data` / `minio_data`（在该 compose 工程命名空间内独立）。

> 注意：`dev` 与 `preview` 的 postgres 宿主端口都是 `5433`，但 `dev` 绑 `0.0.0.0`、`preview` 绑 `127.0.0.1`，且容器名/卷名不同，不要在同一台机器上同时启用这两套。

---

## 2. SQL 补丁脚本

`deploy/` 下的 `*.sql` 是**手工建表 / 数据迁移补丁**（原因见第 3 节）。按职责分两类：

### 2.1 商城主域迁移（一次性补表 + 回填，幂等可重复）

| 文件                   | 类型          | 作用                                                                                                                                                                                                                   |
| ---------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `order-share-init.sql` | 一次性 / 幂等 | 新建 `OrderShare` 表 + 索引，并从旧 `SystemConfig`（key=`order_share:<shareCode>`）回填；`IF NOT EXISTS` / `ON CONFLICT DO NOTHING`。文件末尾附**默认注释掉**的清理旧 `SystemConfig` 行的 `DELETE`。                   |
| `user-coupon-init.sql` | 一次性 / 幂等 | 新建 `UserCoupon` 表 + 索引，并从旧 `SystemConfig`（领取记录 `user_coupon:<userId>:<couponId>` + 核销流水 `user_coupon_used:<userId>:<no>`）回填，按 `ids[]` 展开成多行。文件末尾附**默认注释掉**的两条清理 `DELETE`。 |

### 2.2 门窗利账（ledger）域建表 / 补列

| 文件                            | 类型                           | 作用                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ledger-prod-init.sql`          | **新库必跑的初始化（合并版）** | ledger 域首次上线的总建表脚本：建 9 张核心 `Ledger*` 表（LedgerUser / Membership / MembershipLog / Customer / Order / Goal / Notification / Feedback / Setting），外加 `LedgerAd`、`LedgerConfig`，并对老库做一批 `ADD COLUMN IF NOT EXISTS`（wxOpenid、extraIncome、customCosts、items、discount、deposit、inviteCode、invitedById、cutFirstUsedAt 等）+ 索引 + 幂等外键。校验应返回 9 张 Ledger 表。 |
| `ledger-payment-order-init.sql` | 一次性补表                     | 新建 `LedgerPaymentOrder`（会员在线支付订单，v1.0.3：用户直接付款 → 微信回调自动开通会员）+ 索引 + 指向 `LedgerUser` 的级联外键。                                                                                                                                                                                                                                                                      |
| `ledger-cutplan-init.sql`       | 一次性补表 / 幂等              | 新建 `LedgerCutPlan`（优化下料「云端历史方案」）+ `(userId, updatedAt)` 索引 + `LedgerUser` 级联外键。                                                                                                                                                                                                                                                                                                 |
| `ledger-changelog-init.sql`     | **init（建表）**               | 新建 `LedgerChangelog`（版本更新日志，v1.0.2）+ 索引。**必须先于 seed 执行。**                                                                                                                                                                                                                                                                                                                         |
| `ledger-changelog-seed.sql`     | **seed（初始数据）**           | 写入 1.0.1 ~ 1.0.2 的更新日志内容；**依赖 `ledger-changelog-init.sql` 已建表**；按 `version` `ON CONFLICT DO UPDATE` 幂等覆盖。                                                                                                                                                                                                                                                                        |
| `ledger-received-init.sql`      | 一次性补列 / 幂等              | 给 `LedgerOrder` 增加 `received`（收款）列（未收 = total − deposit − received，收款不计入利润/营收）。注释说明旧 `extraIncome` 列保留、文件末尾附默认注释掉的 `DROP COLUMN`。                                                                                                                                                                                                                          |
| `ledger-recycle-init.sql`       | 一次性补列 / 幂等              | 给 `LedgerOrder` 增加 `recycle`（回收：拆旧窗折抵，从总价再减）列。                                                                                                                                                                                                                                                                                                                                    |
| `ledger-feedback-images.sql`    | 一次性补列 / 幂等              | 给 `LedgerFeedback` 增加 `images`（JSONB，意见反馈附图，v1.0.2）列。                                                                                                                                                                                                                                                                                                                                   |

> 所有脚本都做了 `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` / 外键存在性判断等幂等处理，可安全重复执行；多数对现有表零改动、零风险（纯新增表/列/索引）。

### 2.3 建议执行顺序

唯一的硬性依赖是 **changelog：init 必须先于 seed**；ledger 的补列脚本都建立在 `LedgerOrder` / `LedgerFeedback` 已由 `ledger-prod-init.sql` 建好的前提上。建议顺序：

1. `ledger-prod-init.sql` （ledger 9 张核心表 + Ad/Config + 补列，先建主表）
2. `ledger-payment-order-init.sql`（依赖 `LedgerUser`）
3. `ledger-cutplan-init.sql`（依赖 `LedgerUser`）
4. `ledger-received-init.sql`（给 `LedgerOrder` 补列）
5. `ledger-recycle-init.sql`（给 `LedgerOrder` 补列）
6. `ledger-feedback-images.sql`（给 `LedgerFeedback` 补列）
7. `ledger-changelog-init.sql`（建表）
8. `ledger-changelog-seed.sql`（**必须在 changelog-init 之后**，写初始日志）
9. `order-share-init.sql`（商城主域：建 `OrderShare` + 回填）
10. `user-coupon-init.sql`（商城主域：建 `UserCoupon` + 回填）

执行方式（任一种）：

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f deploy/ledger-prod-init.sql
# 或
docker exec -i <pg容器> psql -U <user> -d <db> < deploy/ledger-prod-init.sql
```

跑完补表脚本后，务必在后端目录执行 `prisma generate` 重新生成客户端，再 build + 重启服务。

---

## 3. 为什么是手工 SQL 补丁

根 `.gitignore` 第 69 行忽略了 `packages/server/prisma/migrations/`，因此：

- 服务器 `git pull main` **拿不到 Prisma 迁移文件**，无法 `prisma migrate deploy`；
- 也不建议在生产盲跑 `prisma db push`——它会按 schema 对齐结构，若库已有 drift 可能做出意外改动。

因此这些 `deploy/*.sql` 是「对现有表零改动、零风险的纯新增补丁」，用来在不依赖迁移目录的情况下把生产/新库的表结构补齐。

> 顺带：`.gitignore` 还忽略了 `deploy/data/`（MinIO 数据目录）、`.env*`（生产凭据）、`secrets/` / `backups/` / 各类证书（`*.p12`、`apiclient_cert.pem`、`wxpay_public_key.pem` 等），这些都不入库。

### 生产 / 新库建表的正确姿势

1. 先用 Prisma 对齐 schema（不带迁移目录的推送）：

   ```bash
   pnpm --filter @jiujiu/server db:push:test
   ```

   （等价于在 `packages/server` 下执行 `prisma db push --skip-generate`，见 `packages/server/package.json`。也可直接用 `prisma db push`。）

2. 再按需跑第 2 节的补丁 SQL（changelog 记得 init 先于 seed）。
3. 最后 `prisma generate` + build + 重启。

---

## 4. Nginx 配置（`deploy/nginx/`）

供 `docker-compose.yml` 的 nginx 服务挂载（`./nginx/nginx.conf` → `/etc/nginx/nginx.conf`，`./nginx/conf.d` → `/etc/nginx/conf.d`，均只读）。

### 4.1 `nginx.conf`（http 全局）

- `worker_connections 1024`、`client_max_body_size 50M`（允许较大上传，如反馈附图）、`keepalive_timeout 65`。
- 开启 `gzip`（text/plain、css、json、javascript、xml），`sendfile` / `tcp_nopush` / `tcp_nodelay`。
- 通过 `include /etc/nginx/conf.d/*.conf;` 引入站点配置。

### 4.2 `conf.d/default.conf`（站点 server，监听 80）

upstream `jiujiu_api` 指向 `server:3000`。各 location：

- **`/api/`** —— 反代到后端 `http://jiujiu_api/api/`，`proxy_http_version 1.1`，透传 `Host` / `X-Real-IP` / `X-Forwarded-For` / `X-Forwarded-Proto`。
- **`/api/docs`** —— Swagger 文档，反代到 `http://jiujiu_api/api/docs`。
- **`/ws/`** —— 在线客服 WebSocket，反代到 `http://jiujiu_api/ws/`，带 `Upgrade` / `Connection 'upgrade'` 升级头与 `proxy_read_timeout 86400s`（长连接）。
- **`/health`** —— 健康检查，反代到后端 `/api/v1/health`。
- **`/`** —— 默认页，直接返回 `{"service":"jiujiu-mall","status":"ok"}`（注释标明后期可挂载 PC 端构建产物作为静态根）。

> 当前 `default.conf` 尚未为各前端（admin-pc 等）配置独立静态资源 location，根路径仅返回占位 JSON；server 块顶部注释「默认页（后期可挂载 PC 端构建产物）」即指此处预留。
