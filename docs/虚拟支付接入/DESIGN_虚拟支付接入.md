# 门窗利账 · 小程序虚拟支付接入方案（DESIGN）

> 起因：微信小程序审核「失败原因 1」——会员属虚拟商品，购买/支付必须接入官方
> **「小程序虚拟支付」**，不能用普通微信支付 v3（即 e1eb06c「会员全自动开通—用户直接微信支付」被拒）。
> 目标：用合规的虚拟支付替换会员购买链路，覆盖 Android + iOS 全终端，过审上线。
> 状态：**待账号侧开通后方可落地编码**（见第 2 节，前置条件只能由你在公众平台完成）。

---

## 1. 现状（被拒链路）

- 前端 `packages/ledger-mp/miniprogram/pages/membership/index.ts`：`payEnabled` 为真时
  `payNow()` → `meApi.createMembershipPay()` 拿普通微信支付参数 → `wx.requestPayment()` → 回调自动开通。
- 后端：会员下单（普通微信支付 v3）+ `/api/v1/l/pay/notify` 回调验签解密后行级幂等发放会员
  （`grantedAt` 标记）。
- 已有合规回退：`payEnabled=false` 时走「联系管理员/去留言」，会员由 admin-pc 后台开通。

**违规点**：`wx.requestPayment`（普通微信支付）用于虚拟商品（会员）。需替换为 `wx.requestVirtualPayment`。

---

## 2. 账号侧前置条件（⛔ 阻塞项，须先在微信公众平台完成）

代码无法绕过以下步骤，全部完成并拿到密钥/道具号后才能联调：

1. **开通「虚拟支付」**：公众平台 → 功能 → 虚拟支付，提交开通（受类目限制，需符合资质）。
2. **签约**：完成虚拟支付服务协议签约。
3. **基础设置**：虚拟支付 → 基础设置，填「应用名」（满足 Apple 展示名要求，iOS 必需）。
4. **配置道具（道具直购 short_series_goods）**：为各会员套餐建道具，拿到 `offerId`（应用/项目号）、
   各套餐 `productId` 与价格梯度（**iOS 价格必须用 Apple 审定的价格梯度**，不能任意定价）。
5. **取密钥**：拿到虚拟支付 `AppKey`（服务端签名用），妥善放入 `.env`（勿提交 git）。

> 产出后请把 `offerId`、各套餐 `productId`、`AppKey`（占位即可，真值运维注入）告诉我，我据此完成编码。

---

## 3. 计费与 iOS 约束（先知会，影响定价/产品）

- **费率**：约 17%（iOS = 12% Apple + 5% 腾讯；**腾讯 5% 减免至 2026 年底**，故 iOS 当前约 12%）。
  Android/鸿蒙走微信侧虚拟支付。定价时需把抽成算进利润。
- **iOS 仅现网**：Apple Pay 不支持沙箱，只能用现网真机联调（开发者工具/沙箱测不了 iOS 实付）。
- **退款**：iOS 退款由用户在 App Store 申请，开发者不能主动退；须实现
  「iOS 退款询问回调」(`xpay_subscribe_ios_refund_query_notify`，**3 秒内**应答 approve/reject)
  与「退款结果回调」(`xpay_refund_notify`) 以同步会员状态。
- **门槛**：iOS 15+、微信 8.0.68+、单笔 ≥ 1 元。
- 平台自动按端路由：iOS → Apple Pay，Android/鸿蒙/Windows → 微信支付，前端调用一致。

---

## 4. 目标架构与流程（道具直购 short_series_goods）

```
用户选套餐
  → 后端「下单」：生成 signData(JSON) + paySig(服务端签名) + signature(用户态签名)
  → 前端 wx.requestVirtualPayment({ mode:'short_series_goods', signData, paySig, signature, mode... })
  → 平台收银台(iOS:Apple Pay / 安卓:微信支付) 完成支付
  → 后端收「发货回调」xpay_goods_deliver_notify（权威）→ 校验 → 幂等发放会员 + 写日志
  → 前端「支付成功」仅弱确认 → 轮询/查单 query_order 确认 active
```

### 4.1 前端 API（`wx.requestVirtualPayment`）

- `mode`：`short_series_goods`（道具直购，会员用此）/ `short_series_coin`（代币充值，不用）。
- `signData`（JSON 字符串）公共字段：`offerId / buyQuantity / env(0 现网,1 沙箱) / currencyType('CNY') / outTradeNo / attach`；
  道具直购另需：`productId / goodsPrice(分) / activitySellingPrice?`。
- `paySig`、`signature`：见 4.3。
- 成功仅作弱确认，**最终以后端回调/查单为准**（与现有「回调发放」原则一致，可复用 grant 逻辑）。

### 4.2 后端服务端 API（xpay）

- 查询：`query_order`（按支付渠道查单）、`query_user_balance`（代币用，可不接）。
- 回调（需在公众平台配回调地址）：`xpay_goods_deliver_notify`（道具发货，**会员在此发放**）、
  iOS 退款相关 `xpay_subscribe_ios_refund_query_notify` / `xpay_refund_notify`。

### 4.3 签名

- 服务端签名：`pay_sig = HMAC_SHA256(AppKey, uri + '&' + post_body)`。
- 用户态签名 `signature`：用会话 `session_key` 计算（`wx.login` code 换 session）。
- 具体字段顺序/拼接以官方《小程序虚拟支付接入指引》为准（编码前再核对一遍官方最新文档）。

---

## 5. 代码改造清单（账号侧就绪后执行）

**后端 `packages/server/src/modules/ledger/`**

- 新增 `ledger-xpay.service.ts`：`buildVirtualPayOrder(planKey, session)` 生成 signData/paySig/signature；
  `verifyXpaySig()`；`query_order` 封装。密钥读 `process.env.LEDGER_XPAY_APP_KEY`、道具 `LEDGER_XPAY_OFFER_ID`。
- 新增回调路由 `POST /api/v1/l/xpay/deliver-notify`（`@Public + @SkipResponseWrap`，验签 → 幂等发放会员，
  **复用现有 grant + grantedAt 幂等**）；按需加 iOS 退款两个回调。
- 套餐 → `productId`/价格映射（沿用 `ledger.constants` 的 plans，新增 productId 字段）。
- 原普通微信支付的会员下单/回调：**保留但不再供小程序调用**（admin-pc 或他端如需另议），或下线。

**前端 `packages/ledger-mp/miniprogram/`**

- `pages/membership/index.ts`：`payNow()` 改为 → 取后端 signData/paySig/signature → `wx.requestVirtualPayment(...)`
  → 成功后 `pollMembership()`（已存在）。删除 `wx.requestPayment` 调用（消除审核违规点）。
- `api/index.ts`：`createMembershipPay` 换成 `createVirtualPay(planKey, code)` 打新下单接口。
- `.env.example` 增 `LEDGER_XPAY_OFFER_ID` / `LEDGER_XPAY_APP_KEY`（敏感，占位）。

**回退**：`payEnabled`（虚拟支付是否就绪）为假时，仍走现有「联系管理员/去留言 + 后台开通」，保证未配置时不暴露半成品。

---

## 6. 测试与灰度

- Android：可现网真机走通（微信侧虚拟支付）。
- iOS：仅现网真机（Apple Pay 无沙箱），需正式开通后用真机验。
- 后端回调用日志 + `query_order` 对账；发放严格幂等（`grantedAt`）。
- 灰度：先以 `LEDGER_XPAY_*` 配置开关控制是否启用，未配置自动回退留言。

---

## 7. 风险 / 未决

- ⛔ 账号侧开通/签约/类目资质是硬前置，且开通本身需审核时间。
- iOS 价格梯度受 Apple 限制，套餐定价可能要按梯度调整（如 ¥29 → 最接近的梯度价）。
- 抽成 ~12%（iOS）影响利润测算。
- 签名字段细节以官方最新文档为准，编码前复核。

> ⚠️ 当前小程序处于「被拒」状态。虚拟支付开通+联调周期较长；若需**尽快过审上线**，
> 可先临时按「移除小程序内购买、改后台/客服开通」过审，待虚拟支付就绪后再上线内购。

---

## 8. 参考（官方）

- iOS 接入：https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment/ios.html
- 接入指引（社区，含 signData/paySig/回调）：https://developers.weixin.qq.com/community/develop/article/doc/00006845ce4860bedcb4d5eed61813
- 审核拒因详情指引：https://developers.weixin.qq.com/community/minihome/doc/00002cf077cd4810fee42f4b865c01
