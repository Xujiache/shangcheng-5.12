# 经纬科技 5.0

> 多端电商平台：用户小程序 + 商家 APP / PC + 平台 APP / PC
> 基于 [`原型图/经纬科技原型.html`](./原型图/经纬科技原型.html) 1:1 还原 + 企业级实现

## 项目结构

```
商城5.0/
├── packages/
│   ├── shared/          # 共享层：design tokens、TS 类型、Mock、工具、图标
│   ├── user-mp/         # 用户端微信小程序（uni-app）
│   ├── merchant-app/    # 商家 APP（uni-app → Android+iOS）
│   ├── platform-app/    # 平台 APP（uni-app → Android+iOS）
│   ├── admin-pc/        # 管理后台（商家 / 平台 / 超管 一体化 · 智能登录）
│   └── server/          # NestJS 后端
├── docs/                # 6A 流程文档
├── deploy/              # Docker Compose / Nginx 配置
├── 原型图/              # 原型源文件
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── .env.example
```

## 技术栈

| 端                   | 技术                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| 用户端               | uni-app + Vue3 + TS + uview-plus → 微信小程序                                                     |
| 商家 APP / 平台 APP  | uni-app + Vue3 + TS + uview-plus → Android+iOS                                                    |
| 管理后台（admin-pc） | Vue3 + Vite + TS + Element Plus + Tailwind CSS（基于 art-lnb，商家 / 平台 / 超管 智能登录三合一） |
| 共享层               | TS 类型 + Mock 生成器（faker） + Design Tokens                                                    |
| 后端                 | NestJS + Prisma + PostgreSQL + Redis + MinIO                                                      |
| 部署                 | Docker Compose（本地一键起全栈）                                                                  |

## 快速开始

> **后端统一入口：`https://ewsn.top`** —— 4 端前端默认都连这个 URL，本地无需起 server / postgres / redis / minio。
>
> 如果要本地起后端调试，再按下面"本地全栈"段执行；只跑前端的开发者直接跳到"前端单跑"。

### 前端单跑（推荐，开箱即用）

```bash
pnpm install

pnpm dev:merchant-app   # 商家 APP（H5 预览，8080）
pnpm dev:user-mp        # 用户端小程序（H5 预览，8086）
pnpm dev:platform-app   # 平台 APP（H5 预览，8087）
pnpm dev:admin-pc       # 管理后台（5173 · 智能登录）
```

每个端的 `.env` 已写好 `VITE_API_BASE_URL=https://ewsn.top`，启动即可联调真实接口。

### 本地全栈（需要改后端时）

```bash
pnpm install
cp .env.example .env

# 启动后端依赖（postgres + redis + minio）
docker compose -f deploy/docker-compose.yml up -d

# 跑后端
pnpm dev:server

# 切前端到本地后端（覆盖各端 .env 里的 VITE_API_BASE_URL）
echo "VITE_API_BASE_URL=http://localhost:3001" > packages/platform-app/.env.local
# user-mp / merchant-app / admin-pc 同理
```

## 开发流程（6A）

按 [`docs/商城5.0还原/`](./docs/商城5.0还原/) 中文档执行：

1. **Align** → `ALIGNMENT_*.md`（已完成）
2. **Architect** → `DESIGN_*.md`（已完成）
3. **Atomize** → `TASK_*.md`（已完成）
4. **Approve** → 用户审批
5. **Automate** → 按 TASK 逐项实施
6. **Assess** → `FINAL_*.md` + `TODO_*.md`

## 文档目录

| 文档                                                     | 说明                                   |
| -------------------------------------------------------- | -------------------------------------- |
| [ALIGNMENT](./docs/商城5.0还原/ALIGNMENT_商城5.0还原.md) | 需求对齐                               |
| [CONSENSUS](./docs/商城5.0还原/CONSENSUS_商城5.0还原.md) | 技术共识                               |
| [DESIGN](./docs/商城5.0还原/DESIGN_商城5.0还原.md)       | 架构设计（架构图 / ER / API / 数据流） |
| [TASK](./docs/商城5.0还原/TASK_商城5.0还原.md)           | 原子任务拆分（131 个）                 |

## License

私有项目，未经授权禁止使用。
