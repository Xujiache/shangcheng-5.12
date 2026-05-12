# CONSENSUS · 管理后台合并（admin-pc）

> 6A 工作流 · 阶段 1 收尾：用户已确认默认决策 D1–D15 + Q1–Q10 全部 OK。
> 创建时间：2026-05-11
> 上游：`ALIGNMENT_admin-pc-merge.md`

---

## 1. 明确的需求描述

把 `merchant-pc` / `platform-pc` 两个 PC 包**合并为单一应用 `admin-pc`**，使用一个登录入口实现"智能登录"——后端按账号识别角色（商家 / 平台 / 超管），前端按角色拉取对应菜单并跳转工作台首页。超管支持顶部下拉**热切换工作台**。

---

## 2. 任务边界（最终版）

### ✅ 本期必做（10 项 + 1 验证）

1. **迁包**：`art-lnb-master/` → `packages/admin-pc/`（重命名移动），删除原 `art-lnb-master/`
2. **删旧包**：物理删除 `packages/merchant-pc/`、`packages/platform-pc/`
3. **workspace 维护**：根 `package.json` 脚本去掉旧两条，新增 `dev:admin-pc`；`pnpm-workspace.yaml` 模式 `packages/*` 自动覆盖（无需改）
4. **品牌覆盖**：主题色改 `#FF4D2D`、Logo 文字 "经纬科技"、登录文案中文化
5. **智能登录改造**：
   - `fetchLogin` mock 返回 `{ accessToken, refreshToken, user: { role, ... } }`
   - 登录成功后按 `user.role` 调 `/api/user/menu?role=X` 拉对应 asyncRoutes
   - 按角色映射跳到首页（`/merchant/dashboard` / `/platform/dashboard`）
6. **角色路由**：新建 `router/modules/merchant.ts` 与 `router/modules/platform.ts`，分别挂载 9 屏 + 11 屏路由（先骨架）
7. **路由守卫**：`beforeEach` 加角色校验，跨角色访问 → `/exception/403`
8. **超管切换器**：顶部 NavBar 加 `<ElDropdown>`，仅 `super-admin` 可见；切换 = 写 localStorage `admin_pc_workspace` + `await menuStore.refetch()` + `router.replace`
9. **Demo 账号**：3 个内置账号 + 登录页底部"测试账号"折叠面板可一键填充
10. **接 mock**：清掉 art-lnb 自带 mock，接 `@jiujiu/shared/mock`；登录、菜单、用户信息 3 个接口落地
11. **20 屏骨架页面 + 路由可达**（验证 AC-10）

### ❌ 不做

- 真后端实现 / SSO / OAuth
- 细粒度 RBAC（按钮级权限）
- 多租户、多门店切换
- 业务页面细节（留到下一期 S3 / S5 单独跑 6A）
- 保留 art-lnb 的 `_examples` 全量示例（仅保留 dashboard / system 骨架）

---

## 3. 技术实现方案

### 3.1 目录改造

```
packages/admin-pc/                    ← 由 art-lnb-master 重命名而来
├── package.json                      ← name 改 @jiujiu/admin-pc，加 @jiujiu/shared 依赖
├── vite.config.ts                    ← port 5173，alias @shared
├── src/
│   ├── views/
│   │   ├── auth/login/index.vue      ← 改：去掉 i18n 切换、加 demo 账号面板
│   │   ├── exception/{403,404,500}/  ← 保留
│   │   ├── merchant/                 ← 新增：S3 9 屏骨架
│   │   │   ├── dashboard/index.vue
│   │   │   ├── product/{list,add,category,agency-list}/index.vue  ← 4 屏
│   │   │   ├── order/{list,aftersale}/index.vue  ← 2 屏
│   │   │   ├── customer/list/index.vue
│   │   │   └── marketing/index.vue
│   │   ├── platform/                 ← 新增：S5 11 屏骨架
│   │   │   ├── dashboard/index.vue
│   │   │   ├── audit/{merchant,product}/index.vue  ← 2 屏
│   │   │   ├── ad/index.vue
│   │   │   ├── plaza/index.vue
│   │   │   ├── member/{plan,pay-orders}/index.vue  ← 2 屏
│   │   │   ├── permission/index.vue
│   │   │   ├── system/index.vue
│   │   │   ├── feature-flag/index.vue
│   │   │   └── data-center/index.vue
│   │   └── (删除 _examples 大部分)
│   ├── router/
│   │   ├── modules/merchant.ts       ← 新增
│   │   ├── modules/platform.ts       ← 新增
│   │   └── guards/beforeEach.ts      ← 增加 role 校验
│   ├── store/modules/user.ts         ← 增加 role / currentWorkspace
│   ├── store/modules/menu.ts         ← 支持按 role 重拉
│   ├── api/auth.ts                   ← mock 返回带 role
│   ├── api/menu.ts                   ← 新增：GET /api/user/menu?role=X
│   ├── components/core/topbar/
│   │   └── WorkspaceSwitcher.vue     ← 新增超管切换器
│   ├── mock/                         ← 接入 @jiujiu/shared
│   └── config/index.ts               ← logoText / themeColor / homeMap
└── ...
```

### 3.2 数据结构

```ts
// user info
interface UserInfo {
  userId: string
  username: string
  nickname: string
  avatar: string
  role: 'merchant' | 'platform' | 'super-admin'
}

// login response
interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: UserInfo
}

// menu response (按 role 区分)
type MenuResponse = AppRouteRecord[]   // 走 art-lnb 现有动态路由结构

// 工作台映射
const ROLE_HOME_MAP = {
  merchant: '/merchant/dashboard',
  platform: '/platform/dashboard',
  'super-admin': '/platform/dashboard',  // 超管默认平台
} as const

// 超管切换
type Workspace = 'merchant' | 'platform'
const WORKSPACE_KEY = 'admin_pc_workspace'
```

### 3.3 智能登录时序

```
1. Login.handleSubmit() → fetchLogin({ username, password })
2. mock 命中：
   - merchant@demo → { user: { role: 'merchant' } }
   - admin@demo    → { user: { role: 'platform' } }
   - super@demo    → { user: { role: 'super-admin' } }
3. userStore.setToken + setUserInfo
4. userStore.role 计算属性 → menuStore.fetchMenu(role) → GET /api/user/menu?role=X
5. addRoute(merchant 或 platform routes)
6. router.push(ROLE_HOME_MAP[role])
7. 若是超管：读 localStorage[WORKSPACE_KEY]，决定走 merchant 还是 platform；首次默认 platform
```

### 3.4 超管切换工作台

```ts
async function switchWorkspace(target: Workspace) {
  localStorage.setItem(WORKSPACE_KEY, target)
  userStore.setCurrentWorkspace(target)
  await menuStore.refetch(target)         // 重拉菜单 + 替换动态路由
  router.replace(ROLE_HOME_MAP[target])
}
```

### 3.5 跨角色路由守卫

```ts
// beforeEach 增量
if (to.path.startsWith('/merchant/') && userStore.role === 'platform') {
  return next('/exception/403')
}
if (to.path.startsWith('/platform/') && userStore.role === 'merchant') {
  return next('/exception/403')
}
// super-admin 不拦截，但用 currentWorkspace 决定菜单显示
```

---

## 4. 技术约束

| 约束 | 说明 |
|---|---|
| 不改框架版本 | 沿用 art-lnb 的 Vue 3.5 / Element Plus 2.11 / Pinia 3 / Vue Router 4 / Vite 7 |
| 复用 art-lnb 资产 | login 页 / 守卫 / store / nprogress / worktab 全部保留，只做**增量改造** |
| Mock 在 `@jiujiu/shared/mock` | 不在 admin-pc 本地写 mock，避免散落 |
| 端口 5173 | 避开移动端 8080–8088 |
| hash 路由 | 部署免 nginx 改配 |
| 主题色 | `#FF4D2D` 覆盖 Element Plus `--el-color-primary`，仅改 SCSS 变量 |

---

## 5. 集成方案

| 集成点 | 方式 |
|---|---|
| `@jiujiu/shared` | `pnpm add @jiujiu/shared --workspace` |
| Mock 拦截 | art-lnb 已有 mock 拦截器（`src/mock/`），替换为 `registerMockRoutes(mockRoutes)` |
| Token 持久化 | `pinia-plugin-persistedstate` 已配，无需动 |
| 国际化 | 沿用 vue-i18n，仅 login 页加几行中文文案 |

---

## 6. 验收标准（与 ALIGNMENT §6 一致，固化）

| # | 验收项 | 判定 |
|---|---|---|
| AC-01 | `pnpm dev:admin-pc` 启动成功，访问首页 200 | curl |
| AC-02 | 登录页字段：username + password + remember + 测试账号面板 | 视觉 |
| AC-03 | `merchant@demo/123456` 登录 → `/merchant/dashboard`，菜单仅商家 | 手测 |
| AC-04 | `admin@demo/123456` 登录 → `/platform/dashboard`，菜单仅平台 | 手测 |
| AC-05 | `super@demo/123456` 登录 → 顶部下拉，能切换工作台 | 手测 |
| AC-06 | 商家访问 `/platform/*` → 403 | 改 URL |
| AC-07 | 登出后所有状态清空 | 手测 |
| AC-08 | `packages/merchant-pc` `packages/platform-pc` `art-lnb-master` 全部删除 | ls |
| AC-09 | 主题色橙、Logo "经纬科技" | 视觉 |
| AC-10 | 商家 9 屏 + 平台 11 屏 = 20 屏路由可达，无 404 | 路由扫描 |

---

## 7. 所有疑问已闭环

| 来源 | 疑问 | 答复 |
|---|---|---|
| Q1 | 包名 | `admin-pc` |
| Q2 | 迁移方式 | 重命名移动 |
| Q3 | 删旧包 | 物理删除 |
| Q4 | 切换器形态 | 下拉 |
| Q5 | 超管落地 | 上次用的，首次平台 |
| Q6 | demo 账号面板 | 加 |
| Q7 | i18n | 保留 |
| Q8 | 路由模式 | hash |
| Q9 | 业务页面 | 本期仅骨架 |
| Q10 | NavBar 图标 | 全部保留 |

---

## 8. 下一步

→ 进 **Architect 阶段**，产出 `DESIGN_admin-pc-merge.md`（含 mermaid 架构图、模块依赖、关键流程时序）
→ 然后 **Atomize**，产出 `TASK_admin-pc-merge.md`（原子任务拆分 + 依赖图）
→ 然后 **Automate** 实施
