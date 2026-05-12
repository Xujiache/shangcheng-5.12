# 后端 TODO（生产前完成）

## 1. 启动依赖（必须）
```powershell
cd deploy && docker compose -f docker-compose.dev.yml up -d
```
确认 5432 / 6379 / 9000 / 9001 端口可访问。

## 2. 数据库初始化（必须）
```powershell
copy .env.example .env  # 第一次
pnpm --filter @jiujiu/server prisma:migrate
pnpm --filter @jiujiu/server prisma:seed
```

## 3. 第三方 SDK 接入（生产前）
- [ ] 微信小程序登录：替换 `auth.service.ts wechatLogin` 为真实 `jscode2session` 调用
- [ ] 微信支付：在 `user-mp.service.ts payOrder` 接入 wxpay SDK 生成预支付单
- [ ] 阿里云/腾讯云 SMS：替换 `sendSmsCode` 中 dev mode 的 0000
- [ ] OSS 替换 MinIO：生产环境改 `S3_ENDPOINT` 为 oss-cn-shanghai.aliyuncs.com 或类似

## 4. 业务能力补强
- [ ] WebSocket 客服：把 `m/chat/sessions/:id/messages` POST 加 `@nestjs/websockets` 推送
- [ ] 微信支付回调：补 `POST /api/v1/payments/wechat/notify` 控制器
- [ ] 物流单号实时查询：接入快递鸟 API

## 5. 安全加固
- [ ] `JWT_SECRET` 替换为强随机串（32+ 字符）
- [ ] Redis 加密码
- [ ] PostgreSQL 加 SSL
- [ ] MinIO 改强密码

## 6. CI / 测试
- [ ] 写 jest 单测（modules/auth, files, user-mp 关键业务）
- [ ] e2e 测试（每个 controller 至少一条）
- [ ] GitHub Actions / Jenkins 流水线

## 7. 部署
- [ ] 生产 `docker-compose.yml` 中后端镜像构建 + 推送
- [ ] Nginx 反代 + SSL（Let's Encrypt）
- [ ] 域名 + ICP 备案
- [ ] 监控（Prometheus + Grafana）

## 8. uni-app / 小程序上架
- [ ] user-mp：微信小程序 AppID + 备案 + 体验版 → 提审
- [ ] merchant-app / platform-app：HBuilderX 打包 iOS/Android
