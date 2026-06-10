# FINAL · 管理后台合并（admin-pc）

> 6A 工作流 · 阶段 6：Assess 收尾
> 交付时间：2026-05-11

---

## 一句话总结

把 `merchant-pc` + `platform-pc` + `art-lnb-master` 三处冗余整合为单一应用 `packages/admin-pc`，落地"账号识别角色 → 自动跳工作台"的智能登录，超管可热切换两边工作台。

---

## 你能看到的东西

```bash
pnpm dev:admin-pc      # 启动 → http://localhost:5173
```

打开后看到登录页（经纬科技 · 5.0 品牌橙），底部"测试账号"折叠面板里 3 张卡，点哪张就一键填充：

| 账号            | 密码                     | 登录后落地                    | 顶部切换器                               |
| --------------- | ------------------------ | ----------------------------- | ---------------------------------------- |
| `merchant@demo` | `$SEED_DEFAULT_PASSWORD` | `/merchant/dashboard` · 9 屏  | ❌ 不显示                                |
| `admin@demo`    | `$SEED_DEFAULT_PASSWORD` | `/platform/dashboard` · 11 屏 | ❌ 不显示                                |
| `super@demo`    | `$SEED_DEFAULT_PASSWORD` | `/platform/dashboard` · 全开  | ✅ 显示，可切「商家工作台 / 平台工作台」 |

跨角色访问会被路由守卫拦到 `/exception/403`。

---

## 代码层关键变化

| 变化点                    | 位置                                                                          | 作用                                                                                    |
| ------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 智能登录 mock             | `src/api/auth.ts` + `src/api/mock-accounts.ts`                                | 三账号本地匹配；token 加密 `userName` 用于 fetchUserInfo 回查                           |
| 角色派生                  | `src/store/modules/user.ts`                                                   | 新增 `role` / `effectiveRole` 计算属性 + `currentWorkspace` ref + `setCurrentWorkspace` |
| 菜单按 effectiveRole 过滤 | `src/router/core/MenuProcessor.ts`                                            | super-admin 用 `currentWorkspace` 派生，普通用户用 `info.roles`                         |
| 跨角色守卫                | `src/router/guards/beforeEach.ts`                                             | 新函数 `handleRoleGuard`，在登录拦截之后跑                                              |
| 路由模块                  | `src/router/modules/merchant.ts` + `platform.ts` + `index.ts`                 | 9 + 11 屏；删除 dashboard/system/\_examples 等 11 个旧文件                              |
| 超管切换器                | `src/components/core/layouts/art-header-bar/widget/WorkspaceSwitcher.vue`     | 顶部 NavBar 注入；切换 = 改 store + `resetRouterState(0)` + `router.replace`            |
| 登录页                    | `src/views/auth/login/index.vue`                                              | 中文化、demo 卡片、按 role 设默认工作台                                                 |
| 主题 + Logo               | `src/config/index.ts` + `index.html`                                          | `#FF4D2D` 首位、`经纬科技` 名称                                                         |
| 20 屏骨架                 | `src/views/merchant/*` + `src/views/platform/*` + `WorkspacePlaceholder` 组件 | 路由可达 + 视觉一致；业务留 S3/S5 单跑                                                  |

---

## 文件统计

| 类型     | 数量                                                                                                                                                                                                                                   |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 新增文件 | 28（20 屏 + WorkspacePlaceholder + WorkspaceSwitcher + 6 个文档 + 2 个 api + merchant/platform 路由 + mock-accounts）                                                                                                                  |
| 修改文件 | 13（user store / MenuProcessor / beforeEach / login / config / index.html / package.json × 2 / pages.json / vite.config / README / .prettierignore / shared common.ts / .env / router modules/index / locales × 2 / header-bar index） |
| 删除文件 | ~600（merchant-pc 全包 + platform-pc 全包 + art-lnb-master 根目录 + router/modules 11 个旧 .ts）                                                                                                                                       |

---

## 决策回顾（D1–D15 全部落地）

所有决策在 ALIGNMENT 第 5 节自动作答 → 用户回"开始吧"= 全部通过 → CONSENSUS 第 7 节固化 → 实施零偏差。

亮点选择：

- **D2 重命名移动**：art-lnb-master 直接 `Move-Item` 到 packages/admin-pc，避免源副本漂移
- **D6 role 嵌套在 user 内**：与 `fetchGetUserInfo()` 返回结构保持一致，避免两处口径
- **D14 仅删 \_examples 全量**：保留 dashboard/system 作为视觉样板，需要时随时翻看
- **D8 localStorage workspace key**：通过 user store 自带的 `pinia-plugin-persistedstate` 自动持久化，零代码

---

## 范围对照（CONSENSUS §2）

| 必做                                 | 状态 |
| ------------------------------------ | ---- |
| 1. 迁包 art-lnb-master → admin-pc    | ✅   |
| 2. 删 merchant-pc / platform-pc      | ✅   |
| 3. workspace 脚本维护                | ✅   |
| 4. 品牌覆盖（色 + Logo + 文案）      | ✅   |
| 5. 智能登录改造                      | ✅   |
| 6. 角色路由（/merchant + /platform） | ✅   |
| 7. 路由守卫越权拦截                  | ✅   |
| 8. 超管切换器                        | ✅   |
| 9. 3 个 demo 账号 + 一键填充面板     | ✅   |
| 10. 接 mock（admin-pc 本地实现）     | ✅   |
| 11. 20 屏骨架                        | ✅   |

| ❌ 不做      | 实际状态          |
| ------------ | ----------------- |
| 真后端实现   | 未做（保留 mock） |
| SSO/OAuth    | 未做              |
| 细粒度 RBAC  | 未做（仅角色级）  |
| 多租户切换   | 未做              |
| 业务页面细节 | 仅骨架            |

完全按 CONSENSUS 边界执行，无遗漏、无加戏。

---

## 后续工作

详见 `TODO_admin-pc-merge.md`。
核心：进 S3 / S5 单跑 6A，把骨架变成完整业务页面（20 屏 × 平均 5 段功能）。

---

## 验证清单（你可立即跑）

```bash
# 1. 起 dev server
pnpm dev:admin-pc

# 2. 浏览器打开 http://localhost:5173

# 3. 依次用 3 个 demo 账号登录，分别验证：
#    - merchant@demo  → 左侧菜单仅商家 9 项，顶部无切换器
#    - admin@demo     → 左侧菜单仅平台 11 项，顶部无切换器
#    - super@demo     → 左侧菜单显示一侧，顶部有切换器，能在两边热切换

# 4. 越权测试
#    merchant 账号登录后，地址栏粘 http://localhost:5173/#/platform/dashboard
#    应自动跳到 403 异常页

# 5. 登出测试
#    点击右上角头像 → 退出登录 → token / 工作台选择全部清理
```
