# 鸿蒙后端整合部署 · 2026-09-09

## 对齐与方案

- 基线：`feat/harmony-live-i18n` 的 `709de9c74554d337d7aee8a0674f9f1cbc1afa08`，与交接 revision、远端及加密包 SHA-256 一致。
- 独立 worktree：`/root/shangcheng-huawei-release-20260909`，本地发布分支 `deploy/huawei-20260909`。
- 将旧 `feat/ledger-mp` 工作区的配套后端实现三方合并，旧目录不修改；保留新版 refresh 原子轮换、禁用账号检查、双语套餐、workbook 版本升级。
- 不发布 HAP，不创建账号/收费商品，不进行支付、不发送推送，不更改任何云平台角色。

## 任务与实现

- 商家密码/SMS 登录、短信近期验证标记；Push 设备/偏好；IAP 准备/验证/恢复/通知；法律文档；原生 JSON WS。
- 整合商家统计/聊天/售后/会员/更新及关联 DTO、共享类型、Prisma 模型和测试。
- 冲突处理：刷新使用数据库最新角色/商户归属并保留 amr；套餐保留中英字段并增 Huawei 映射；新版广场筛选与缩略图继续有效。
- 显式拒绝跨域/refresh 访问令牌，WS 拒绝跨账号续接并检查事件时的当前身份；IAP 配置缺失时禁止准备订单。
- Push 只记录脱敏状态，不打印服务账号、JWT、token 或完整供应商响应。

## 数据保护及数据库

备份目录：`/root/jiujiu-deploy-backups/huawei-20260909/`（私有，不入 Git）。含旧未提交 diff、后端源文件、当前依赖补丁、PM2 状态、运行配置、数据库 custom dump、MinIO 数据归档。数据库 TOC 与归档 gzip 完整性检查通过。

- database.dump SHA-256：`cd420da617c2c2725719515f2c261b324aaa8448899781edaf9a77b71f39b126`
- minio-data.tgz SHA-256：`9aa9a319a2709e9d6a057bfd930e13fa06c4b29d0937cb418cc29c1f58d6fb04`
- 生产库已具备整合 schema 的全部 scalar 字段；没有执行 DDL、db push 或数据清理。
- 版本执行器 dry-run：`20260909_001_ledger_workbook` / `already-applied`，checksum `7139ec8ae8a87e98a302bfcb2628ada5d27f426cdba28d768a96c3ad988fc13a`。
- 同步旧 Harmony/统计索引 SQL 作为历史结构来源，本次不执行；其他环境须先结构核对并纳入版本化执行流程，不能直接假设完整基线。

## 重点验收

- Node 24.19.0、pnpm 9.0.0；shared 构建、Prisma generate、server build/typecheck 通过。
- 15 个重点 Jest 文件、120 项测试通过（auth、写入鉴权、Push、WS、IAP、更新/协议、商家聊天/统计/会员、ledger 只读边界）。
- 隔离生产启动：健康、更新/法律文档、Push/IAP 匿名拒绝、JSON WS 握手通过。
- 测试账号：30 个只读 REST 响应契约及 WS auth/chat 归属检查通过；没有修改账号或制造交易。
- nginx 配置检查通过，`/ws/` 已传递 Upgrade；TLS 证书有效至 2026-10-17。

## Push 与 IAP 待办（不能按全部完成验收）

- 服务账号文件权限 0600、RSA 可解析、项目一致；运行配置引用私有路径，并强制 `HUAWEI_PUSH_TEST_MESSAGE=1`。NTP 同步正常。
- 一次真实 OAuth 换令牌请求：本地 PS256 签名、iss/aud/时效核验通过；云端 HTTP 400 / error `1203`，没有得到 access token，没有发送消息；不可宣称云端鉴权通过。
- [华为 Push Kit 官方 JWT 文档](https://developer.huawei.com/consumer/en/doc/harmonyos-guides/push-jwt-token) 说明服务账号 JWT 直接放入 Push REST Authorization。此次检索据此保留直接 JWT 实现，不擅自改成未经验证的 token 交换，也不将 1203 推断成管理员权限不足。实际推送云端鉴权/测试设备送达需后续专门授权验证。
- IAP 商户入驻/协议、应用开通、issuer/key/private key、验签公钥及商品映射缺失；当前不可购买，不发放权益。APP ID 不能代替这些条件。
- 真机地图/定位授权展示、通知授权与送达、端到端购买不在本次通过项内。

## 切换与回退

配置：`deploy/huawei-20260909.ecosystem.config.cjs`；只切换 `jiujiu-server`，保持 127.0.0.1:3001。其他服务不变，旧构建不删除。

若发布后健康/关键路由异常，使用以下配置回退旧后端，无需恢复数据库（本次没有迁移）：

```sh
pm2 delete jiujiu-server
pm2 start /root/jiujiu-deploy-backups/1d07d6d/ecosystem.config.cjs --only jiujiu-server
pm2 save
```

不要自动 pg_restore 覆盖发布后数据。若需灾难恢复，先停止写入并另存最新数据，再人工核对备份。

磁盘余量风险：仅将可重建 pnpm metadata 缓存移到 `/dev/shm/jingwei-huawei-pnpm-metadata-20260909` 腾挪空间；无业务数据删除。内存盘重启会丢缓存但可由包管理器重建；长期应扩容。

线上切换结果及实际提交/产物哈希记录到同名私有备份目录的 deployment-verification.json。

## 追加修复：普通 JSON 请求体未解析

真机反馈 SMS 接口在手机号已填写时返回 `phone must be a string`。线上用有效字符串 phone 和故意错误的数字 scene 复现同一错误，且不会调用短信服务。

根因：main.ts 把 Express 的 `jsonParser` 直接挂在 workbook 子路径上，Nest ExpressAdapter 按函数名判断已存在 JSON parser，从而跳过全局 parser。之前的 GET/空参数冒烟未发现这一写入链路缺口。

修复：以独立命名的 `workbookBodyParser` 包装局部解析器，保留 Nest 自动注册的全局 JSON/rawBody 解析。4 项真实 Nest HTTP 回归覆盖正常 DTO 解析、数值手机号拒绝、支付 rawBody 字节一致、大 workbook 及普通路由大小限制。生产启动冒烟同时增加 SMS 请求体断言（使用非法 scene，绝不发送短信）。修复前 dist 已额外备份到 `pre-body-parser-fix-dist.tgz`。
