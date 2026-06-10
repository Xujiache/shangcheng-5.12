# 后端开发交付总结

## 摘要

本次交付完整覆盖了四端（user-mp / merchant-app / platform-app / admin-pc）所需的 130+ 后端接口，全部基于 NestJS 10 + Prisma 5 + PostgreSQL + MinIO 构建，可立即接入。

### 文件清单（本次新增）

```
docs/
├─ backend-api-coverage.md          # 接口覆盖矩阵（130+ 条）
└─ backend/
   ├─ DESIGN.md                     # 架构设计
   ├─ MIGRATION.md                  # 启动/接入指南
   └─ FINAL.md                      # 本文件

packages/server/
├─ prisma/
│  ├─ schema.prisma                 # 40 模型完整 schema
│  └─ seed.ts                       # 完整种子数据
├─ scripts/
│  └─ smoke.ts                      # 50+ 接口冒烟脚本
└─ src/
   ├─ main.ts                       # 启动 + Swagger + 全局守卫
   ├─ app.module.ts                 # 模块聚合
   ├─ common/
   │  ├─ decorators/                # @Public @Roles @CurrentUser
   │  ├─ exceptions/                # BizException + BizCode
   │  ├─ filters/                   # GlobalExceptionFilter（兼容 msg）
   │  ├─ guards/                    # JwtAuthGuard + RolesGuard
   │  ├─ interceptors/              # ResponseInterceptor（兼容 msg）
   │  └─ utils/                     # pagination / id / decimal
   └─ modules/
      ├─ auth/                      # 7 接口 + admin-pc 兼容
      ├─ files/                     # MinIO 上传 3 接口
      ├─ user-mp/                   # 24 接口
      ├─ merchant/                  # 60+ 接口（含 PC 别名）
      └─ platform/                  # 45+ 接口

packages/admin-pc/src/
├─ utils/http/index.ts              # 拦截器兼容 code=0/200
└─ api/
   ├─ auth.ts                       # 加 USE_MOCK 切换真后端
   └─ system-manage.ts              # 路径迁移到 /api/v1/p/*

.env.example                        # 修复双前缀（去掉 /api/v1）

packages/shared/src/mock/faker.ts   # 修复 typecheck 错误（faker 类型）
```

### 接口实现统计

| 模块     | 接口数                                                                                         | 文件                 |
| -------- | ---------------------------------------------------------------------------------------------- | -------------------- |
| Auth     | 7 + 4 admin-pc 别名                                                                            | `modules/auth/*`     |
| Files    | 3 (MinIO 真实接入)                                                                             | `modules/files/*`    |
| User-MP  | 24                                                                                             | `modules/user-mp/*`  |
| Merchant | 60+（含 batch-status / aftersales / commission-rule / staff / chat-messages 等 admin-pc 别名） | `modules/merchant/*` |
| Platform | 45+                                                                                            | `modules/platform/*` |
| **合计** | **130+**                                                                                       |                      |

### 验收结果

| 检查项                                   | 结果                        |
| ---------------------------------------- | --------------------------- |
| `pnpm --filter @jiujiu/shared typecheck` | ✅ 通过                     |
| `pnpm --filter @jiujiu/server typecheck` | ✅ 通过                     |
| `pnpm --filter @jiujiu/server build`     | ✅ 通过                     |
| `prisma generate`                        | ✅ 通过（5.22.0）           |
| `prisma migrate`                         | ⏳ 需启动 PostgreSQL 后执行 |
| `prisma seed`                            | ⏳ 需 migrate 后执行        |
| Smoke 测试（50+ 接口）                   | ⏳ 需后端启动后执行         |

## 接口覆盖报告

完整矩阵见 `docs/backend-api-coverage.md`。覆盖前端：

- **uni-app 三端**（user-mp / merchant-app / platform-app）
- **admin-pc**（含 5 个旧路径兼容映射）
- **shared mock 路由**（52 条均有对应实现）

## 响应兼容方案

| 维度              | 方案                                                                                  | 文件                           |
| ----------------- | ------------------------------------------------------------------------------------- | ------------------------------ |
| **响应字段**      | 同时返回 `message` 和 `msg`（同值），前者给 uni-app，后者给 admin-pc                  | `response.interceptor.ts`      |
| **响应 code**     | 后端固定返回 `code: 0`；admin-pc 拦截器升级为 `code === 0 \|\| code === 200` 均算成功 | `admin-pc/utils/http/index.ts` |
| **HTTP 状态**     | 业务异常返回 200（前端通过 code 判断），鉴权类返回 401/403                            | `biz.exception.ts`             |
| **Authorization** | 同时支持 `Bearer xxx`（uni-app）和裸 `xxx`（admin-pc）                                | `jwt.guard.ts`                 |

## 双前缀修复

| 端                          | 修改前                                           | 修改后                                                                  |
| --------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| uni-app `.env.example`      | `VITE_API_BASE_URL=http://localhost:3000/api/v1` | `VITE_API_BASE_URL=http://localhost:3000`（service URL 已含 `/api/v1`） |
| admin-pc `.env.development` | `VITE_API_URL=/`（代理）                         | 不变（开发走代理，生产填完整后端地址）                                  |

## 种子账号

| 账号            | 密码                     | 角色        | UserInfo.roles    | 工作台 |
| --------------- | ------------------------ | ----------- | ----------------- | ------ |
| `merchant@demo` | `$SEED_DEFAULT_PASSWORD` | factory     | `['factory']`     | 商家   |
| `admin@demo`    | `$SEED_DEFAULT_PASSWORD` | platform    | `['platform']`    | 平台   |
| `super@demo`    | `$SEED_DEFAULT_PASSWORD` | super-admin | `['super-admin']` | 双切换 |

> 密码取 seed 时设置的 `SEED_DEFAULT_PASSWORD`（至少 8 位，无默认值）。

## 启动 4 步

```powershell
# 1. 启依赖
cd deploy && docker compose -f docker-compose.dev.yml up -d

# 2. 复制 env
cd .. && copy .env.example .env

# 3. 初始化数据库
pnpm --filter @jiujiu/server prisma:migrate
pnpm --filter @jiujiu/server prisma:seed

# 4. 启动后端
pnpm --filter @jiujiu/server start:dev
```

## 已知限制（生产前需替换）

| 模块           | 当前实现           | 生产建议                        |
| -------------- | ------------------ | ------------------------------- |
| **微信登录**   | 任意 code 创建用户 | 接入 jscode2session             |
| **手机验证码** | dev 接受 0000      | 接入阿里云/腾讯云 SMS           |
| **微信支付**   | mock 直接成功      | 接入微信支付 SDK + 回调         |
| **聊天 IM**    | HTTP 短轮询        | 加 `@nestjs/websockets` Gateway |
| **物流追踪**   | 仅存单号           | 接入快递鸟/顺丰开放平台         |
| **CDN/OSS**    | MinIO 本地         | 生产换阿里云 OSS / 七牛         |
| **业务测试**   | 0 单测/e2e         | 补 jest 单测                    |

## 下一步建议

1. 启动依赖 → 运行 migrate + seed → 跑 smoke 脚本，确认 50+ 接口全通过
2. uni-app 三端把 `.env` 中 `VITE_USE_MOCK=false`，逐屏联调
3. admin-pc 同样切换 `VITE_USE_MOCK=false`，验证 31 屏均正常加载数据
4. 补充微信登录、微信支付、SMS、WebSocket 等真实第三方接入
