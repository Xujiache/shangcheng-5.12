# 微信小程序内容安全整改说明

## 整改目标

处理微信版本审核中“头像功能缺少内容安全校验”的问题。服务端现在在把用户生成内容写入对象存储或数据库**之前**调用微信内容安全接口，并依据接口结果决定是否继续提交。

## 已接入的接口与拦截点

| 内容类型                       | 微信接口                            | 代码入口                                                           | 行为                                                                             |
| ------------------------------ | ----------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| 用户头像及上传图片             | `wxa/img_sec_check`                 | `FilesService.upload` / `batchUpload`                              | 图片未通过、接口报错或生产凭据缺失时，不上传 MinIO、不创建 `UploadedFile` 记录。 |
| 昵称、订单备注、反馈、聊天消息 | `wxa/msg_sec_check`（`version: 2`） | `UserMpService`、`LedgerService`、`PlatformService`、`ChatGateway` | 仅 `result.suggest === "pass"` 时继续写数据库。                                  |
| 商户商品与店铺资料             | `wxa/msg_sec_check`（分段检测）     | `MerchantService`                                                  | 商品名、描述、详情和店铺资料在持久化前检测。                                     |

`ContentSecurityService` 是唯一微信内容安全调用入口，位于 `packages/server/src/modules/content-security/`。商城小程序使用 `WX_MINIAPP_APPID` / `WX_MINIAPP_SECRET`，利账小程序使用 `LEDGER_WX_APPID` / `LEDGER_WX_SECRET`，两套 token 分别缓存。

## 生产配置

部署环境必须配置对应小程序的真实 AppID 和 Secret：

```dotenv
WX_MINIAPP_APPID=<商城小程序 AppID>
WX_MINIAPP_SECRET=<商城小程序 AppSecret>
LEDGER_WX_APPID=<利账小程序 AppID>
LEDGER_WX_SECRET=<利账小程序 AppSecret>
WX_CONTENT_SECURITY_TIMEOUT_MS=10000
```

生产环境采用 **fail closed**：缺少凭据、获取 token 失败、微信检测接口超时/异常、或检测结果不是 `pass`，都会拒绝本次用户内容提交。开发和测试环境未配置凭据时仅跳过远程调用，避免离线开发被阻断；该行为不适用于生产。

## 审核复现步骤

1. 在部署环境写入上述环境变量并重启后端；不要将 AppSecret 提交到仓库。
2. 使用小程序登录后，在“我的/个人资料”更换头像。
3. 后端先请求 `https://api.weixin.qq.com/wxa/img_sec_check`；只有微信返回通过，才得到上传成功响应和新头像 URL。
4. 提交违规文本或风险图片时，应收到“内容未通过安全检测”或“内容安全服务暂不可用”的业务错误，且数据库与对象存储中没有新内容。
5. 在微信公众平台重新提交版本审核，并在审核说明中注明“头像上传已接入微信 `img_sec_check`，昵称/UGC 已接入 `msg_sec_check`，检测结果会阻断持久化”。

## 本地验证

```powershell
pnpm --filter @jiujiu/server prisma:generate
pnpm --filter @jiujiu/server typecheck
pnpm --filter @jiujiu/server test -- content-security.service.spec.ts --runInBand
pnpm --filter @jiujiu/server build
```

单元测试覆盖：安全文本放行、风险文本阻断、生产环境缺凭据阻断、头像图片调用 `img_sec_check`，以及风险头像**不会**写入对象存储或 `UploadedFile`。实际调用微信接口仍需使用部署环境的有效小程序凭据完成联调。
