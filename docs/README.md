# docs/ 文档索引

> 经纬科技商城 5.0（pnpm monorepo / NestJS + 4 前端 + 原生小程序）全部任务文档总览。
> 每个子目录对应一次任务的 6A 流程产物（ALIGNMENT / CONSENSUS / DESIGN / TASK / ACCEPTANCE / FINAL / TODO 等）。

| 目录 / 文件               | 用途                                                                                      | 状态     | 对应包 / 分支                                     |
| ------------------------- | ----------------------------------------------------------------------------------------- | -------- | ------------------------------------------------- |
| `商城5.0还原/`            | 主站「原型还原 + 企业级实现」6A 全流程文档                                                | 历史归档 | 全站 / main                                       |
| `backend/`                | 后端 6A 任务文档：架构设计 / 接入指南 / 迁移说明 / 交付总结                               | 历史归档 | `packages/server` / main                          |
| `s3-merchant-pc/`         | S3：admin-pc 商家工作台 9 屏 placeholder → 完整业务页                                     | 历史归档 | `packages/admin-pc` / main                        |
| `s3.5-merchant-pc-补齐/`  | S3.5：商家工作台 9→18 屏，对齐 merchant-app 全功能                                        | 历史归档 | `packages/admin-pc` / main                        |
| `s5-platform-pc/`         | S5：admin-pc 平台工作台 11→13 屏业务页                                                    | 历史归档 | `packages/admin-pc` / main                        |
| `admin-pc-merge/`         | merchant-pc + platform-pc + art-lnb 合并为单一 admin-pc，按角色智能登录                   | 历史归档 | `packages/admin-pc` / main                        |
| `app-pc-audit/`           | APP ↔ 管理后台双向功能审计（后台无虚构功能、APP 功能可在后台查看/导出/更改）              | 历史归档 | merchant-app / platform-app ↔ admin-pc / main     |
| `小程序发布/`             | 微信小程序提审材料（可直接复制到 mp.weixin.qq.com 的最终文案）                            | 操作手册 | user-mp / main                                    |
| `软件自更新/`             | 商家版 / 平台版 APP 在 Android 上的应用内自更新操作手册                                   | 操作手册 | merchant-app / platform-app + server / main       |
| `门窗利账/`               | ledger-mp 原生小程序 + 后端 ledger 域 + admin-pc 会员管理的 6A 全流程文档                 | 进行中   | ledger 域 / `packages/ledger-mp` / feat/ledger-mp |
| `全面提升整理/`           | 全量审查清单（8 维度实跑核验，按 P0/P1/P2/P3 分级，已剔除证伪项）                         | 进行中   | 全站 / feat/ledger-mp                             |
| `backend-api-coverage.md` | 后端接口覆盖矩阵（统一响应 / 路由约定 + 接口实现状态）。**注：尚未覆盖 ledger（`/l`）域** | 待更新   | `packages/server` / main                          |

> 6A 文档约定详见根 [`CLAUDE.md`](../) 与「个人工作规则」，所有产物按 `docs/任务名/` 目录组织。
> 部署与建表见 [`deploy/README.md`](../deploy/README.md)。
