# CONSENSUS · 经纬科技 5.0 还原与企业级实现

> 阶段：6A · 第 1 阶段 Align 收尾
> 状态：✅ 已对齐，可进入 Architect

---

## 1. 明确需求

把 `原型图/经纬科技原型.html` 中的 **66 屏全量页面**，按 **产品级高保真** 标准在企业级真实可上线的代码工程中 1:1 还原，并完成全部业务功能闭环。

## 2. 技术方案（已敲定）

### 2.1 前端
| 端 | 技术 | 编译目标 |
|----|------|----------|
| 用户端 | uni-app + Vue3 + TS + uview-plus | 微信小程序 |
| 商家 APP | uni-app + Vue3 + TS + uview-plus | Android `.apk` + iOS `.ipa` |
| 商家 PC | **基于 art-lnb 框架**（Vue3 + Vite + TS + **Element Plus + Tailwind CSS**）+ Pinia | Web |
| 平台 APP | uni-app + Vue3 + TS + uview-plus | Android `.apk` + iOS `.ipa` |
| 平台 PC | **基于 art-lnb 框架**（Vue3 + Vite + TS + **Element Plus + Tailwind CSS**）+ Pinia | Web |
| 共享层 | TS 类型 + Mock 生成器 + Design Tokens + 通用工具 | 各端 import |

**PC 端框架沉淀**（来自用户提供的 `art-lnb-master/`）：
- 内置：登录鉴权、布局（侧栏+顶栏+面包屑）、菜单路由、用户管理、角色管理
- UI 库：Element Plus + Tailwind CSS
- 图表：ECharts；富文本：wangeditor；导出：xlsx；拖拽：vue-draggable-plus；裁图：vue-img-cutter；图标：@iconify/vue
- 工程链：husky + commitlint + cz-git + stylelint + prettier + eslint
- 示例库：`src/views/_examples/` 提供表单/表格/图表/上传/地图/视频/富文本/打印 等参考代码
- 复制策略：`art-lnb-master` 复制成两份骨架（`packages/merchant-pc`、`packages/platform-pc`），删除示例 + 替换业务模块 + 主题色覆盖为经纬科技暖橙

### 2.2 后端
- **框架**：NestJS（Node 18+ / TypeScript）
- **ORM**：Prisma
- **数据库**：PostgreSQL 16
- **缓存 / 队列**：Redis 7
- **对象存储**：MinIO（本地）→ 后期可平滑切阿里云 OSS
- **认证**：JWT + 微信小程序 code2session
- **支付**：微信支付（小程序 JSAPI）
- **短信**：阿里云 SMS（接口预留，先 mock）
- **接口文档**：Swagger（NestJS 自动生成）
- **校验**：class-validator + class-transformer

### 2.3 部署
- **本地开发**：Docker Compose 一键起 db / redis / minio / server
- **生产部署**：Docker Compose（同一份 compose 文件，env 切换）
- **未来云迁移**：服务全部容器化，可平滑迁阿里云 / 腾讯云 / k8s

### 2.4 Mock 策略
- 共享 Mock 数据生成器：`packages/shared/mock/`
- PC 端：`vite-plugin-mock` 拦截
- uni-app 端：自研 request 拦截器
- 环境变量：`VITE_USE_MOCK=true` 一键切换

### 2.5 视觉语言
- **主色**：`#FF4D2D`（经纬科技暖橙）
- **辅色 / 高亮 / 功能色**：见 ALIGNMENT 5.2 色板
- **字体**：HarmonyOS Sans SC（中）+ Inter（西）
- **图标**：Iconify + Remix Icon + 自绘 SVG

## 3. 工程结构（最终版）

```
商城5.0/
├── packages/
│   ├── shared/                # 共享层
│   │   ├── src/
│   │   │   ├── tokens/        # design tokens（colors / spacing / typography）
│   │   │   ├── types/         # API & domain TS 类型
│   │   │   ├── mock/          # mock 数据生成器
│   │   │   ├── utils/         # 工具方法
│   │   │   └── icons/         # 业务 SVG 图标
│   │   └── package.json
│   ├── user-mp/               # 用户端微信小程序
│   ├── merchant-app/          # 商家 APP
│   ├── merchant-pc/           # 商家 PC（基于 art-lnb：Element Plus + Tailwind）
│   ├── platform-app/          # 平台 APP
│   ├── platform-pc/           # 平台 PC（基于 art-lnb：Element Plus + Tailwind）
│   └── server/                # NestJS 后端
│       ├── src/
│       │   ├── modules/       # 业务模块（merchant / product / order / ...）
│       │   ├── common/        # 通用：guards / decorators / filters / interceptors
│       │   ├── prisma/        # Prisma 客户端封装
│       │   └── main.ts
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── seed.ts
│       └── package.json
├── docs/商城5.0还原/          # 6A 流程文档
├── deploy/
│   ├── docker-compose.yml     # 一键起：postgres + redis + minio + server
│   ├── docker-compose.dev.yml # 开发时仅依赖（前端本地跑）
│   └── nginx/                 # 反向代理配置
├── 原型图/                    # 原型源文件（已存在）
├── pnpm-workspace.yaml
├── package.json
├── .env.example
├── .gitignore
├── README.md
└── CLAUDE.md                  # 项目级 Claude 协作约定
```

## 4. 业务边界

### 4.1 包含
- 全部 66 屏 UI + 完整交互
- 用户登录（微信授权）、商家入驻审核、商品管理、价格分级显示、订单全流程、售后、客户管理、分佣推广、提现、门店授权、员工管理、店铺装修、营销活动、在线客服、选品广场、广告管理、会员套餐、平台审核、商家端功能开关（含灰度）、数据分析、权限管理、系统设置
- 微信支付集成（小程序 JSAPI）
- OSS 上传（资质、商品图、广告创意）
- WebSocket 在线客服
- 接口文档（Swagger）
- 单元测试（核心服务 ≥ 60% 覆盖）
- 部署文档与脚本

### 4.2 不包含（如需可后续追加）
- i18n 国际化
- 多商户白标 / SaaS
- BI 大屏 / 数据仓库
- IoT / 直播 / 短视频
- AR 量房

## 5. 验收标准

### 5.1 视觉验收
- [ ] 每屏与原型布局结构 1:1（按钮位置、信息密度、横滚/瀑布流等关键交互形式一致）
- [ ] 商业级视觉语言替换手稿风（色板、字体、图标、阴影、圆角）
- [ ] 适配主流屏幕（iPhone SE → 15 PM；PC 1280 → 1920）

### 5.2 功能验收
- [ ] 每个按钮 / Tab / 表单可点 / 可提交
- [ ] 状态机完整（订单、审核、退款、会员、推送各状态可流转）
- [ ] mock 模式下完整 CRUD 可工作
- [ ] 真实后端模式下接口对齐、可上线

### 5.3 工程验收
- [ ] pnpm install 后一条命令可起任一端
- [ ] `docker compose up -d` 起依赖 + 后端
- [ ] Swagger 接口文档可访问
- [ ] CI 流程通过（lint + test + build）
- [ ] README 中含部署、开发、测试章节

## 6. 风险与对策

| 风险 | 对策 |
|------|------|
| uni-app 与 Vue3 + Vite PC 共用组件难度 | 共享层只放 TS 类型 + tokens + mock，组件分端实现 |
| 微信小程序 API 与 H5/APP 差异 | 用 uni-app 条件编译 `#ifdef MP-WEIXIN` 隔离 |
| 66 屏工作量大 | 按"先共享层 → 商家 APP 21 屏 → 用户端 → 平台 → 商家 PC → 平台 PC"顺序串行交付 |
| mock 切真后端时接口不对齐 | 接口契约用 TS 类型 + Swagger，前后端共用 `shared/types` |
| 高保真设计可能偏离原型 | 每屏完成后用 git 截图与原型对照，差异 ≥ 20% 重做 |

## 7. 交付节奏（建议）

| Sprint | 周期 | 交付物 |
|--------|------|--------|
| S0 | 1 周 | DESIGN / TASK 文档定稿 + monorepo 骨架 + shared 层 + Mock 框架 + Docker Compose 跑通 |
| S1 | 2 周 | 商家 APP 21 屏（产品级高保真）+ mock 全量数据 |
| S2 | 2 周 | 用户端微信小程序 13 屏 |
| S3 | 2 周 | 平台 APP 12 屏 + 平台 PC 11 屏 |
| S4 | 2 周 | 商家 PC 9 屏 |
| S5 | 2 周 | NestJS 后端实现 + 接口替换 mock |
| S6 | 1 周 | 测试 + 部署 + 文档完善 |

**总计：12 周（约 3 个月）至 MVP 上线**

## 8. 不确定性清单（全部已解决 ✅）

- [x] 仓库结构（pnpm monorepo）
- [x] 视觉语言（暖橙系商业色 + HarmonyOS Sans）
- [x] mock 工具（vite-plugin-mock + 自研 request 拦截器）
- [x] 商家 APP 范围（21 屏全做）
- [x] 后端栈（NestJS + Prisma + PostgreSQL）
- [x] 小程序平台（仅微信）
- [x] APP 形态（uni-app 原生包）
- [x] 部署目标（Docker Compose 本地）

---

**文档版本**：v1.0 定稿
**创建时间**：2026-05-11
**作者**：Claude
**下一步**：进入 Architect 阶段，写 `DESIGN_商城5.0还原.md`
