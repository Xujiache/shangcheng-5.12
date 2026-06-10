# 后端接口覆盖矩阵（SSOT）

> 自动生成自四端 SSOT 审计。状态：✅ 已实现 / 🟡 进行中 / ⏳ 待实现

## 0. 全局约定

### 0.1 响应统一

- 后端实际返回：`{ code, data, message, msg, traceId, timestamp }`
  - `code`：业务码（0=成功，其余对应 `ErrorCode`）
  - `data`：业务负载
  - `message` / `msg`：同值，前者给 uni-app 三端，后者给 admin-pc（兼容）
  - `traceId`：请求追踪
- HTTP 状态码：成功一律 `200`；4xx/5xx 用于网络/系统层错误
- 业务码兼容 `ErrorCode`（packages/shared/src/types/common.ts）：0/1001/1002/2001/2002/2003/3002/4001/5001

### 0.2 前缀

- 后端：`/api/v1/*`（NestJS globalPrefix）
- uni-app `VITE_API_BASE_URL`：`http://localhost:3000`（不含 /api/v1，路径已写）
- admin-pc `VITE_API_URL`：`/`（Vite 代理到后端 3000）
- 双前缀风险已修复

### 0.3 鉴权

- Authorization header：`Bearer <token>`（uni-app）或裸 `<token>`（admin-pc，已兼容）
- 角色：`customer / promoter / factory / store / admin / merchant / platform / super-admin`
- merchant/store/factory → 商家工作台
- admin/platform → 平台工作台
- super-admin → 双工作台切换

---

## 1. Auth 认证（7）

| #   | 方法 | URL                       | 说明                                               | 实现 |
| --- | ---- | ------------------------- | -------------------------------------------------- | ---- |
| 1   | POST | /api/v1/auth/wechat-login | 微信小程序登录 `{ code?, encryptedData?, iv? }`    | ⏳   |
| 2   | POST | /api/v1/auth/phone-login  | 手机号验证码登录 `{ phone, code/smsCode }`         | ⏳   |
| 3   | POST | /api/v1/auth/sms-code     | 发送短信验证码 `{ phone }`                         | ⏳   |
| 4   | POST | /api/v1/auth/admin-login  | 后台账号密码登录 `{ username/userName, password }` | ⏳   |
| 5   | POST | /api/v1/auth/refresh      | Refresh Token 换 Access Token                      | ⏳   |
| 6   | POST | /api/v1/auth/logout       | 注销                                               | ⏳   |
| 7   | GET  | /api/v1/auth/user-info    | 获取当前用户信息                                   | ⏳   |

**兼容 admin-pc 旧路径**：

- POST `/api/auth/login` → 内部转发到 admin-login
- GET `/api/user/info` → 内部转发到 user-info

**种子账号**：

- `merchant@demo` / `$SEED_DEFAULT_PASSWORD` → `roles: ['merchant']`
- `admin@demo` / `$SEED_DEFAULT_PASSWORD` → `roles: ['platform']`
- `super@demo` / `$SEED_DEFAULT_PASSWORD` → `roles: ['super-admin']`

> 密码取 seed 时设置的 `SEED_DEFAULT_PASSWORD`（至少 8 位，无默认值）。

---

## 2. Files 文件上传（3）

| #   | 方法   | URL                        | 说明                                         |
| --- | ------ | -------------------------- | -------------------------------------------- |
| 1   | POST   | /api/v1/files/upload       | 单文件上传（multipart, field=file, bizType） |
| 2   | POST   | /api/v1/files/batch-upload | 批量上传（files[]）                          |
| 3   | DELETE | /api/v1/files/:key         | 删除                                         |

**支持业务**：商品 images/detailHtml、聊天 image、营业执照、qualifications[]、avatar、店铺 logo、装修 banners[].image、广告 creative、售后 evidence[]、工厂 logo/banner/资质

**校验**：jpg/png/webp/gif（图片）≤10MB；mp4/webm（视频）≤50MB

---

## 3. User-MP（用户端 22 接口）

| #   | 方法   | URL                          | 数据契约                          |
| --- | ------ | ---------------------------- | --------------------------------- |
| 1   | GET    | /api/v1/u/products           | `Pagination<Product>`             |
| 2   | GET    | /api/v1/u/products/:id       | `Product & { skus: Sku[] }`       |
| 3   | GET    | /api/v1/u/categories         | `Category[]`                      |
| 4   | GET    | /api/v1/u/orders             | `Pagination<Order>`               |
| 5   | GET    | /api/v1/u/orders/:id         | `Order`                           |
| 6   | POST   | /api/v1/u/orders             | `{ orderId, orderNo, payAmount }` |
| 7   | POST   | /api/v1/u/orders/:id/pay     | `{ ok }`                          |
| 8   | POST   | /api/v1/u/orders/:id/confirm | `{ ok }`                          |
| 9   | POST   | /api/v1/u/orders/:id/cancel  | `{ ok }`                          |
| 10  | POST   | /api/v1/u/orders/:id/urge    | `{ ok }`                          |
| 11  | GET    | /api/v1/u/banners            | `Banner[]`                        |
| 12  | GET    | /api/v1/u/addresses          | `Address[]`                       |
| 13  | GET    | /api/v1/u/addresses/default  | `Address`                         |
| 14  | POST   | /api/v1/u/addresses          | `Address`                         |
| 15  | PUT    | /api/v1/u/addresses/:id      | `Address`                         |
| 16  | DELETE | /api/v1/u/addresses/:id      | `{ ok }`                          |
| 17  | GET    | /api/v1/u/favorites          | `Favorite[]`                      |
| 18  | POST   | /api/v1/u/favorites          | `{ ok }`                          |
| 19  | DELETE | /api/v1/u/favorites/:id      | `{ ok }`                          |
| 20  | POST   | /api/v1/u/booking            | `{ ok, ticketId }`                |
| 21  | GET    | /api/v1/u/promote/summary    | `PromoteSummary`                  |
| 22  | GET    | /api/v1/u/promote/orders     | `Pagination<Commission>`          |
| 23  | GET    | /api/v1/u/stores/nearby      | `NearbyStore[]`                   |
| 24  | POST   | /api/v1/u/merchant-apply     | `{ ok, applyId }`                 |

---

## 4. Merchant（商家端 60 接口）

### 4.1 Dashboard / Stats

| #   | 方法 | URL                 | 数据                |
| --- | ---- | ------------------- | ------------------- |
| 1   | GET  | /api/v1/m/dashboard | `MerchantDashboard` |
| 2   | GET  | /api/v1/m/stats     | `MerchantStats`     |

### 4.2 商品 + 分类（13）

| #   | 方法   | URL                                        |
| --- | ------ | ------------------------------------------ |
| 3   | GET    | /api/v1/m/products                         |
| 4   | GET    | /api/v1/m/products/:id                     |
| 5   | POST   | /api/v1/m/products                         |
| 6   | PUT    | /api/v1/m/products/:id                     |
| 7   | POST   | /api/v1/m/products/batch-online            |
| 8   | POST   | /api/v1/m/products/batch-offline           |
| 9   | POST   | /api/v1/m/products/batch-delete            |
| 10  | POST   | /api/v1/m/products/batch-status（PC 兼容） |
| 11  | DELETE | /api/v1/m/products （body { ids }）        |
| 12  | GET    | /api/v1/m/categories                       |
| 13  | POST   | /api/v1/m/categories                       |
| 14  | PUT    | /api/v1/m/categories/:id                   |
| 15  | DELETE | /api/v1/m/categories/:id                   |
| 16  | POST   | /api/v1/m/categories/sort                  |

### 4.3 订单 + 售后（6）

| #   | 方法 | URL                                        |
| --- | ---- | ------------------------------------------ |
| 17  | GET  | /api/v1/m/orders                           |
| 18  | GET  | /api/v1/m/orders/:id                       |
| 19  | POST | /api/v1/m/orders/:id/ship                  |
| 20  | POST | /api/v1/m/orders/batch-ship                |
| 21  | POST | /api/v1/m/orders/parse-address             |
| 22  | GET  | /api/v1/m/refunds                          |
| 23  | POST | /api/v1/m/refunds/:id/agree                |
| 24  | POST | /api/v1/m/refunds/:id/reject               |
| 25  | GET  | /api/v1/m/aftersales（PC 别名）            |
| 26  | POST | /api/v1/m/aftersales/:id/review（PC 别名） |

### 4.4 客户（3）

| #   | 方法 | URL                                |
| --- | ---- | ---------------------------------- |
| 27  | GET  | /api/v1/m/customers                |
| 28  | POST | /api/v1/m/customers/:id/price-tier |
| 29  | POST | /api/v1/m/customers/:id/authorize  |

### 4.5 佣金 + 提现（7）

| #   | 方法 | URL                            |
| --- | ---- | ------------------------------ |
| 30  | GET  | /api/v1/m/commission/rules     |
| 31  | POST | /api/v1/m/commission/rules     |
| 32  | GET  | /api/v1/m/withdraws            |
| 33  | POST | /api/v1/m/withdraws            |
| 34  | POST | /api/v1/m/withdraws/:id/review |
| 35  | POST | /api/v1/m/withdraws/:id/reject |
| 36  | GET  | /api/v1/m/balance              |

### 4.6 门店 + 员工 + 装修（10）

| #   | 方法   | URL                       |
| --- | ------ | ------------------------- |
| 37  | GET    | /api/v1/m/stores          |
| 38  | POST   | /api/v1/m/stores          |
| 39  | DELETE | /api/v1/m/stores/:id      |
| 40  | GET    | /api/v1/m/stores/:id/auth |
| 41  | POST   | /api/v1/m/stores/:id/auth |
| 42  | GET    | /api/v1/m/staffs          |
| 43  | POST   | /api/v1/m/staffs          |
| 44  | PUT    | /api/v1/m/staffs/:id      |
| 45  | DELETE | /api/v1/m/staffs/:id      |
| 46  | GET    | /api/v1/m/shop/decorate   |
| 47  | POST   | /api/v1/m/shop/decorate   |

### 4.7 营销 + 聊天 + 广场（11）

| #   | 方法 | URL                                  |
| --- | ---- | ------------------------------------ |
| 48  | GET  | /api/v1/m/marketing/overview         |
| 49  | GET  | /api/v1/m/marketing/coupons          |
| 50  | GET  | /api/v1/m/chat/sessions              |
| 51  | GET  | /api/v1/m/chat/sessions/:id/messages |
| 52  | POST | /api/v1/m/chat/sessions/:id/messages |
| 53  | GET  | /api/v1/m/chat/quick-replies         |
| 54  | GET  | /api/v1/m/plaza/products             |
| 55  | GET  | /api/v1/m/plaza/factories            |
| 56  | GET  | /api/v1/m/plaza/factories/:id        |
| 57  | POST | /api/v1/m/plaza/factories/:id/follow |
| 58  | POST | /api/v1/m/plaza/agency               |

### 4.8 功能开关 + 会员（8）

| #   | 方法 | URL                                |
| --- | ---- | ---------------------------------- |
| 59  | GET  | /api/v1/m/feature-flags            |
| 60  | GET  | /api/v1/m/membership/plans         |
| 61  | GET  | /api/v1/m/membership               |
| 62  | GET  | /api/v1/m/membership/quota         |
| 63  | GET  | /api/v1/m/membership/payments      |
| 64  | GET  | /api/v1/m/membership/notices       |
| 65  | POST | /api/v1/m/membership/subscribe     |
| 66  | POST | /api/v1/m/membership/cancel        |
| 67  | POST | /api/v1/m/membership/auto-renew    |
| 68  | POST | /api/v1/m/membership/quota/use     |
| 69  | POST | /api/v1/m/membership/quota/release |

---

## 5. Platform（平台端 35 接口）

| #   | 方法   | URL                                            | 说明 |
| --- | ------ | ---------------------------------------------- | ---- |
| 1   | GET    | /api/v1/p/dashboard                            |      |
| 2   | GET    | /api/v1/p/stats                                |      |
| 3   | GET    | /api/v1/p/merchants                            |      |
| 4   | GET    | /api/v1/p/audit/merchants                      |      |
| 5   | POST   | /api/v1/p/merchants/:id/approve                |      |
| 6   | POST   | /api/v1/p/merchants/:id/reject                 |      |
| 7   | POST   | /api/v1/p/merchants/:id/pause                  |      |
| 8   | POST   | /api/v1/p/merchants/:id/resume                 |      |
| 9   | GET    | /api/v1/p/orders                               |      |
| 10  | GET    | /api/v1/p/audit/products                       |      |
| 11  | GET    | /api/v1/p/audit/products/config                |      |
| 12  | POST   | /api/v1/p/audit/products/config                |      |
| 13  | POST   | /api/v1/p/products/:id/approve                 |      |
| 14  | POST   | /api/v1/p/products/:id/reject                  |      |
| 15  | GET    | /api/v1/p/ads/slots                            |      |
| 16  | POST   | /api/v1/p/ads/slots                            |      |
| 17  | PUT    | /api/v1/p/ads/slots/:id                        |      |
| 18  | DELETE | /api/v1/p/ads/slots/:id                        |      |
| 19  | GET    | /api/v1/p/ads/creatives                        |      |
| 20  | POST   | /api/v1/p/ads/creatives                        |      |
| 21  | PUT    | /api/v1/p/ads/creatives/:id                    |      |
| 22  | DELETE | /api/v1/p/ads/creatives/:id                    |      |
| 23  | GET    | /api/v1/p/plaza/pushes                         |      |
| 24  | POST   | /api/v1/p/plaza/pushes                         |      |
| 25  | GET    | /api/v1/p/plaza/products                       |      |
| 26  | GET    | /api/v1/p/plaza/factories                      |      |
| 27  | GET    | /api/v1/p/plaza/records                        |      |
| 28  | GET    | /api/v1/p/member-plans                         |      |
| 29  | POST   | /api/v1/p/member-plans                         |      |
| 30  | DELETE | /api/v1/p/member-plans/:id                     |      |
| 31  | GET    | /api/v1/p/member-plans/:id/subscriptions       |      |
| 32  | GET    | /api/v1/p/member-pay-orders                    |      |
| 33  | PATCH  | /api/v1/p/member-pay-orders/:id/status         |      |
| 34  | POST   | /api/v1/p/member-pay-orders/:id/approve-refund |      |
| 35  | POST   | /api/v1/p/member-pay-orders/:id/reject-refund  |      |
| 36  | GET    | /api/v1/p/feature-flags                        |      |
| 37  | POST   | /api/v1/p/feature-flags/:id/toggle             |      |
| 38  | GET    | /api/v1/p/feature-flags/gray                   |      |
| 39  | POST   | /api/v1/p/feature-flags/gray                   |      |
| 40  | POST   | /api/v1/p/feature-flags/reset                  |      |
| 41  | GET    | /api/v1/p/admins                               |      |
| 42  | POST   | /api/v1/p/admins                               |      |
| 43  | PUT    | /api/v1/p/admins/:id                           |      |
| 44  | DELETE | /api/v1/p/admins/:id                           |      |
| 45  | POST   | /api/v1/p/admins/:id/toggle                    |      |
| 46  | GET    | /api/v1/p/roles                                |      |
| 47  | POST   | /api/v1/p/roles                                |      |
| 48  | PUT    | /api/v1/p/roles/:id                            |      |
| 49  | DELETE | /api/v1/p/roles/:id                            |      |
| 50  | GET    | /api/v1/p/system/settings                      |      |
| 51  | POST   | /api/v1/p/system/settings                      |      |

---

## 6. admin-pc 旧接口兼容（3）

| #   | 方法 | URL                  | 实际转发                      |
| --- | ---- | -------------------- | ----------------------------- |
| 1   | GET  | /api/user/list       | /api/v1/p/admins              |
| 2   | GET  | /api/role/list       | /api/v1/p/roles               |
| 3   | GET  | /api/v3/system/menus | 内部固定菜单（按 roles 过滤） |
| 4   | POST | /api/auth/login      | /api/v1/auth/admin-login      |
| 5   | GET  | /api/user/info       | /api/v1/auth/user-info        |

---

## 7. 字段补齐

### Product 扩展字段（user-mp/详情页用）

- `pricingMode?: 'standard' | 'by-size'`
- `pricePerSqm?: number`
- `minLength?, minWidth?, maxLength?, maxWidth?: number`
- `baseFee?: number`
- `sizeUnit?: 'cm' | 'm'`

### Order 创建 DTO

- `items: { skuId, quantity, productId? }[]`
- `addressId: string`
- `couponId?: string`
- `remark?: string`
- `shippingMethod: 'factory'|'local'|'pickup'`

### FeatureFlag 解析（ResolvedFeatureFlags）

```
{
  homeEntry: Record<string, boolean>,
  roleButton: Record<string, boolean>,
  sideMenu: Record<string, boolean>
}
```

后端按 `merchantId` hash + 灰度比例 + 白名单计算后返回。
