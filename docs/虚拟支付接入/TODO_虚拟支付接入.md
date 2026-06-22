# 门窗利账 · 虚拟支付上线清单（TODO / 运维交接）

> 代码已就绪（feat/ledger-mp）：下单 `/l/membership/xpay-order`、发货回调 `/l/xpay/deliver-notify`、
> 前端 `wx.requestVirtualPayment`。配置开关式：`.env` 配齐才启用，否则自动回退「留言开通」。

## 已就绪（账号侧）

- 虚拟支付已开通；AppID = `wxe8ed8b7d9d154165`（与 ledger-mp project.config 一致）。
- **OfferID = `1450532317`**。
- 苹果 IAP 支付：已开通；平台路径：已启用。

## ⛔ 待办

### 1. 配置道具（道具直购）—— 阻塞项

公众平台 → 虚拟支付 → 基本配置 → **道具配置**：给每个会员套餐建道具，记录每个 `productId`，
iOS 设价格梯度（只能选 Apple 审定档位）。产出「套餐 key → productId」对应表。

### 2. 配置发货回调地址

填：`https://ewsn.top/api/v1/l/xpay/deliver-notify`

### 3. 服务器 .env（在 ewsn.top 设置后重启后端）

```
LEDGER_XPAY_OFFER_ID=1450532317
LEDGER_XPAY_APP_KEY=<现网AppKey>        # 密钥！只填服务器，勿入库/勿发对话
LEDGER_XPAY_ENV=0                       # 联调先 1=沙箱，正式改 0=现网
LEDGER_XPAY_PRODUCTS={"month":"<productId>","year":"<productId>"}  # 第 1 步产出后填
# 确认（虚拟支付签名/换 session_key 用）：
LEDGER_WX_APPID=wxe8ed8b7d9d154165
LEDGER_WX_SECRET=<该小程序 AppSecret>
```

### 4. 联调顺序

1. 沙箱 + 安卓真机/开发者工具（`LEDGER_XPAY_ENV=1` + 沙箱AppKey）：跑通 下单→调起→发货回调→发会员，
   核对签名拼接与回调字段名（代码已留 TODO，按官方示例校准 `ledger-xpay.service`）。
2. 现网 + iOS 真机（`LEDGER_XPAY_ENV=0` + 现网AppKey，iOS 无沙箱）：用最便宜套餐真机验一笔。
3. 通过后重新提审。

### 5. 安全

- 现网 AppKey 若曾外发（对话/截图），上线前**重置 AppKey**并更新 .env。
- iOS 退款回调（`xpay_subscribe_ios_refund_query_notify` / `xpay_refund_notify`）本期未接，
  作为后续硬化项（退款时同步会员状态）。
