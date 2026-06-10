# 后端启动 & 接入指南

## 0. 前置依赖

- Node.js >= 20.19
- pnpm >= 8.8
- Docker (用于 PostgreSQL + Redis + MinIO)

## 1. 启动依赖服务

```powershell
cd deploy
docker compose -f docker-compose.dev.yml up -d
```

会启动：

- PostgreSQL @ `localhost:5432` (用户名 jiujiu / 密码 jiujiu_dev_pwd / 库 jiujiu_mall)
- Redis @ `localhost:6379`
- MinIO @ `localhost:9000` (控制台 `localhost:9001`，账号 minioadmin / minioadmin_dev)

## 2. 初始化数据库

```powershell
# 复制环境变量
copy .env.example .env

# 生成 Prisma Client
pnpm --filter @jiujiu/server prisma:generate

# 创建表结构（首次运行）
pnpm --filter @jiujiu/server prisma:migrate

# 种子数据（3 个账号 + 6 个商户 + 12 个商品 + 6 套餐 + 8 功能开关）
pnpm --filter @jiujiu/server prisma:seed
```

## 3. 启动后端

```powershell
pnpm --filter @jiujiu/server start:dev
```

- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api/docs
- Health: http://localhost:3000/health

## 4. 种子账号

| 账号            | 密码                     | 角色        | 工作台       |
| --------------- | ------------------------ | ----------- | ------------ |
| `merchant@demo` | `$SEED_DEFAULT_PASSWORD` | factory     | 商家工作台   |
| `admin@demo`    | `$SEED_DEFAULT_PASSWORD` | platform    | 平台工作台   |
| `super@demo`    | `$SEED_DEFAULT_PASSWORD` | super-admin | 双工作台切换 |

> 密码取 seed 时设置的 `SEED_DEFAULT_PASSWORD`（至少 8 位，无默认值）。

## 5. 前端切换到真后端

各端在 `.env.local` 或 `.env.development` 中设置：

```
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:3000
```

admin-pc 由于走 Vite 代理，需配置 `.env.development`：

```
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:3000
```

## 6. 跑 Smoke 测试（验证 50+ 接口）

```powershell
pnpm --filter @jiujiu/server tsx scripts/smoke.ts
```

预期输出：50+ ✓ 全通过。

## 7. 已知限制

| 项             | 限制                          | 解决路径                                      |
| -------------- | ----------------------------- | --------------------------------------------- |
| 微信小程序登录 | mock 实现（任意 code 都通过） | 接入 WX_MINIAPP_APPID/SECRET + jscode2session |
| 微信支付       | mock（成功后直接 paid）       | 接入微信支付 SDK                              |
| 短信验证码     | dev 模式接受 0000             | 接入阿里云/腾讯云 SMS                         |
| WebSocket 客服 | 当前 HTTP 短轮询              | 加 `@nestjs/websockets` Gateway               |
| 文件上传       | 已接 MinIO，需启动容器        | docker-compose.dev.yml 已包含                 |
| 移动端打包     | uni-app 未打包                | `pnpm --filter merchant-app build:mp-weixin`  |
