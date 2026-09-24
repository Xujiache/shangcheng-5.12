# 主分支整合记录（2026-09-24）

- 基线：`origin/main` `5ad46141585166e94308afadfd90a32bf89ef865`。
- 整合：`feat/ledger-mp` 两个本地提交、`codex/flyingmouse-mp` 至 `e2625c4c041afdf65820e2aed215864b78777c33`、`codex/harmony-snapshot-20260924` 至 `1ca550e164a76f43542123748daaeabea55cc8da`。
- FlyingMouse v0.7.10 原始源码及 SHA-256 清单位于 `vendor/flyingmouse-format/v0.7.10`；转换功能按能力清单逐项开放，未宣称完整迁移。
- `native/harmony-merchant/third_party/ibest-ui` 指向独立仓库已推送的 `aae2efe7c766e03c06e10b124e272f0186d85481`。
- 91 个冲突路径已逐文件处理。订单/工具/设置旧主包页保留转发器，原 Harmony 页面动效、骨架及订单编辑加载保护已迁入新分包页；同时保留格式转换与记工分包。商家和平台端以当前 Wot UI 实现替代旧原生控件；后端保留会员双语、广场筛选、缩略图、工作簿、格式转换与原子刷新令牌消费。pnpm 锁文件按合并后的 manifests 重新生成。

## 验证

- `pnpm typecheck`、`pnpm lint`：通过。
- `pnpm test:unit`：通过；后端 Jest 49 suites / 466 tests。
- `pnpm --filter @jiujiu/server build`、商家端和平台端 `build:h5`：通过。
- 鸿蒙二级页审计 35 routes / 81 anchors，测试 12/12：通过。子模块提交可拉取。
- `gitleaks git --staged`：未发现泄漏。
- `pnpm quality:check`：格式、lint、类型、工作簿契约、密钥边界均通过；鸿蒙 `audit-i18n.mjs --strict` 因 159 个既存未本地化字面量失败。该失败在 Harmony 源分支同样复现，未通过降低或删除门禁掩盖。
- 未完成独立数据库集成测试、微信开发者工具/真机及鸿蒙真机验收；不将静态检查视作端到端上线验收。
