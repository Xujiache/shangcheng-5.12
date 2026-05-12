# 后端架构设计（NestJS）

## 1. 总览

```
packages/server/src/
├─ main.ts                    # bootstrap + Swagger + 全局拦截器
├─ app.module.ts              # 聚合
├─ config/                    # 配置（env、constants）
├─ common/
│  ├─ decorators/             # @CurrentUser / @Roles / @Public / @ClientType
│  ├─ filters/                # GlobalExceptionFilter（已有）
│  ├─ interceptors/           # ResponseInterceptor（已有，需加 msg 字段）
│  ├─ guards/                 # JwtGuard / RolesGuard
│  ├─ pipes/                  # ParseIntPipe / ParsePagePipe
│  └─ utils/                  # 分页/ID/Hash/Decimal 转换
├─ prisma/                    # PrismaModule + PrismaService（已有）
├─ modules/
│  ├─ auth/                   # 登录/Token/微信/短信
│  ├─ files/                  # MinIO 上传
│  ├─ user-mp/                # /api/v1/u/*
│  ├─ merchant/               # /api/v1/m/*（分子模块）
│  │  ├─ dashboard/
│  │  ├─ products/
│  │  ├─ categories/
│  │  ├─ orders/
│  │  ├─ refunds/
│  │  ├─ customers/
│  │  ├─ commission/
│  │  ├─ withdraws/
│  │  ├─ stores/
│  │  ├─ staffs/
│  │  ├─ decorate/
│  │  ├─ marketing/
│  │  ├─ chat/
│  │  ├─ plaza/
│  │  ├─ membership/
│  │  └─ feature-flags/
│  ├─ platform/               # /api/v1/p/*（分子模块）
│  └─ admin-pc-compat/        # /api/auth/login etc
└─ health.controller.ts
```

## 2. 响应/异常

### 响应拦截器
返回结构：
```ts
{
  code: 0,              // 业务码（兼容 ErrorCode）
  data: T,              // 业务数据
  message: 'ok',        // uni-app 三端读
  msg: 'ok',            // admin-pc 读
  traceId: 't-xxxx',
  timestamp: 1234567890
}
```

### 业务异常类
```ts
class BizException extends HttpException {
  constructor(code: ErrorCode, message: string, status = 200) { ... }
}
```
HTTP 状态：业务异常一律 200（让前端拦截器看 code）；系统异常 500。

## 3. 双前缀修复
- `.env.example` 中 `VITE_API_BASE_URL=http://localhost:3000`（不含 `/api/v1`）
- service 中 URL 保留 `/api/v1/*`
- admin-pc 已经是 `/`（开发走 Vite 代理）

## 4. admin-pc 拦截器兼容
修改 `packages/admin-pc/src/utils/http/index.ts`：
- `code === ApiStatus.success` 改为 `code === 0 || code === 200`
- 读取 `msg` 字段（已存在，后端会回写）
- 401 仍触发自动登出

## 5. JWT + RBAC
- AccessToken：7200s
- RefreshToken：604800s
- Payload：`{ sub, role, merchantId?, permissions?, exp, iat }`
- `@CurrentUser()` decorator 从 req.user 取
- `@Roles('merchant','platform','super-admin')` + RolesGuard

## 6. MinIO 上传
- 直连 MinIO（dev：localhost:9000，prod：内网/OSS endpoint）
- 路径规则：`{bizType}/{yyyy}/{mm}/{nanoid}.{ext}`
- 返回 `{ url, key, size, mimeType }`

## 7. 状态枚举（与 shared/types 对齐）
- UserRole: customer/promoter/factory/store/admin（+ merchant 别名 → factory|store；platform 别名 → admin）
- ProductStatus: draft/auditing/active/offline/rejected
- OrderStatus: pending_payment/pending_shipment/shipped/completed/cancelled/after_sale/refunded
- RefundStatus: pending/agreed/rejected/in_progress/completed
- MerchantStatus: pending/active/rejected/disabled

## 8. 阶段实施顺序

| Phase | 模块 | 说明 |
|---|---|---|
| BE-A | 基础（响应/异常/JWT/Files） | 拦截器升级 + Auth/Files 模块 |
| BE-B | Prisma schema 扩展 + seed | 40+ 模型 + 种子账号 |
| BE-C | User-MP（22） | 商品/分类/订单/地址/收藏/预约/广场 |
| BE-D | Merchant 核心（30） | dashboard/products/orders/refunds/customers |
| BE-E | Merchant 周边（20） | 佣金/提现/门店/员工/装修/营销 |
| BE-F | Merchant 高级（15） | 聊天/广场/会员/feature-flag |
| BE-G | Platform 核心（20） | dashboard/audit/orders/merchants |
| BE-H | Platform 周边（15） | ads/plaza/member/feature-flag/admin/role/system |
| BE-I | admin-pc 兼容（5） | 旧路径转发 |
| BE-J | 验收 | typecheck + build + prisma + smoke |

