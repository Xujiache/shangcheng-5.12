# ALIGNMENT · 管理后台合并（admin-pc）

> 6A 工作流 · 阶段 1：Align（对齐阶段）
> 创建时间：2026-05-11
> 任务名：`admin-pc-merge`

---

## 1. 项目上下文分析

### 1.1 现有目录摸底

| 路径                                                     | 现状                                   | 备注                                                  |
| -------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------- |
| `C:/Users/Administrator/Desktop/商城5.0/art-lnb-master/` | 原版 ArtDesign Pro / art-lnb 完整模板  | 带 `views/_examples/` 示例代码，最完整                |
| `packages/merchant-pc/`                                  | art-lnb 模板的拷贝（删了 `_examples`） | 业务零改造，与 art-lnb 仅差 \_examples                |
| `packages/platform-pc/`                                  | 同 `merchant-pc`，**完全一样的文件**   | `diff -q -r merchant-pc/src platform-pc/src` → 无差异 |

> **结论**：两个 PC 包目前是同一份模板的两份冗余拷贝，业务都没开始，合并成本接近零。

### 1.2 框架基座

| 项     | 现状                                                           |
| ------ | -------------------------------------------------------------- |
| 构建   | Vite 7 + Vue 3.5 + TypeScript 5.6 + vue-tsc                    |
| UI     | Element Plus 2.11 + Tailwind 4 + Iconify + ECharts 6           |
| 路由   | Vue Router 4（hash 模式）+ 静态路由 + 后端动态 asyncRoutes     |
| 状态   | Pinia 3 + `pinia-plugin-persistedstate`（localStorage 持久化） |
| 网络   | Axios + 自研拦截器（`utils/http`）                             |
| 富文本 | wangEditor 5                                                   |
| 国际化 | vue-i18n 9（中英双语已配）                                     |
| 杂项   | 锁屏、worktab 多标签、搜索历史、xlsx 导入导出、xgplayer        |

### 1.3 已具备的认证 / 权限能力

| 模块         | 文件                              | 关键能力                                                               |
| ------------ | --------------------------------- | ---------------------------------------------------------------------- |
| 登录 API     | `src/api/auth.ts`                 | `fetchLogin(params)` / `fetchGetUserInfo()`                            |
| 登录页       | `src/views/auth/login/index.vue`  | 账号密码表单 + 记住密码 + 找回密码链接                                 |
| 用户 Store   | `src/store/modules/user.ts`       | token / refreshToken / 用户信息 / 登出清理 / 锁屏 / 切换用户清 worktab |
| 路由守卫     | `src/router/guards/beforeEach.ts` | nprogress / 登录拦截 / 动态路由加载                                    |
| 菜单 Store   | `src/store/modules/menu.ts`       | 支持后端下发 routes 动态构建菜单                                       |
| 工作台 Store | `src/store/modules/worktab.ts`    | 多标签页 / keep-alive 排除                                             |

**关键发现**：A 方案（一处登录、按角色发不同菜单）**框架已经完全支持**，不需要重新发明，只需后端 `/auth/login` 返回里加 `role` 字段、`/api/user/menu` 按角色返回不同 asyncRoutes。

### 1.4 业务上下文（来自 5.0 商城项目）

- 移动端三端已完工：S1 商家 APP / S2 用户小程序 / S4 平台 APP（共 52 个 Vue 页面）
- `packages/shared/` 已有完整 Mock：商品 / SKU / 商户 / 订单 / 用户 / 广告 / 推送 等
- 商家端 21 屏 + 平台端 12 屏的产品形态在移动端已落地，PC 端只需把同一业务"放大"到桌面布局

---

## 2. 原始需求（用户原话）

> "我想把管理后台合并成一个有自动健全登录这个功能，然后并且你可以看一下管理后台的框架，目前已经有了"
>
> 后续追问 + 用户答复：
>
> - 看 `C:\Users\Administrator\Desktop\商城5.0\art-lnb-master`
> - "你直接挪动一下位置也可以"
> - 智能登录方案：**A 方案**（账号密码 + 后端识别身份自动跳转）
> - **支持超管切换**工作台
> - 先写 Align 文档

---

## 3. 任务边界确认

### 3.1 在范围内 ✅

- 把 `art-lnb-master/` 整体迁入 `packages/admin-pc/`，并把它纳入 pnpm workspace
- 删除冗余的 `packages/merchant-pc/` 与 `packages/platform-pc/`
- 改造登录流程：账号密码 → 后端返回 `role` → 前端按 role 拉对应菜单 → 跳对应工作台首页
- 角色路由分组：`/merchant/*` / `/platform/*` / 公共页面
- 超级管理员：登录后能在顶部"切换工作台"下拉里切到任一角色
- 路由守卫：跨角色访问 → 403
- 主题色 / Logo / 文案对齐 5.0 商城品牌
- 接入 `@jiujiu/shared` 的 mock，给 3 个 demo 账号
- S3 商家 PC 9 屏 + S5 平台 PC 11 屏的页面骨架（业务页面留到后续阶段细做）

### 3.2 不在本期范围 ❌

- 后端真实接口实现（仍走前端 Mock）
- 单点登录 / OAuth / 第三方登录
- 复杂 RBAC 权限矩阵（先用 role 字段粗粒度区分；细到按钮级权限留待二期）
- 多租户切换（一个商家账号可能管理多家门店）—— 该需求归到 S3 业务页面
- 把 art-lnb-master 的 `_examples` 示例代码全量保留 —— 仅保留有借鉴价值的几屏，其余删除

---

## 4. 需求理解

### 4.1 "智能登录"的精确定义（A 方案）

```
用户输入 username + password
        ↓
POST /api/auth/login
        ↓
后端校验 → 返回 { accessToken, refreshToken, user: { id, name, role, avatar, ... } }
        ↓
前端 setToken + setUserInfo
        ↓
GET /api/user/menu  ← 后端按 user.role 返回该角色可见的 asyncRoutes
        ↓
menuStore.setMenu(asyncRoutes) + 动态 addRoute
        ↓
router.push(roleHomeMap[user.role])
        ↓
进入对应工作台首页（商家 → /merchant/dashboard，平台 → /platform/dashboard，超管 → /platform/dashboard 并显示切换器）
```

### 4.2 三种角色定义

| role 值       | 中文名     | 默认落地              | 可见菜单                | 顶部切换器                                    |
| ------------- | ---------- | --------------------- | ----------------------- | --------------------------------------------- |
| `merchant`    | 商家管理员 | `/merchant/dashboard` | 仅 `/merchant/*` + 公共 | 不显示                                        |
| `platform`    | 平台运营   | `/platform/dashboard` | 仅 `/platform/*` + 公共 | 不显示                                        |
| `super-admin` | 超级管理员 | `/platform/dashboard` | 全部                    | **显示**（下拉切「商家工作台 / 平台工作台」） |

### 4.3 跨角色访问

`merchant` 账号粘贴 `/platform/audit/merchant` 到地址栏 → 路由守卫拦截 → 跳 `/exception/403`

### 4.4 超管"切换工作台"交互

- 顶部 NavBar 右侧加一个 `<ElDropdown>`，仅 `role === 'super-admin'` 时显示
- 下拉项：`【🏬 商家工作台】` / `【🛠 平台工作台】`，当前态高亮
- 切换 = 在 user store 中保存 `currentWorkspace: 'merchant' | 'platform'`，重新拉对应 menu，`router.replace(roleHomeMap[currentWorkspace])`
- 该切换状态写入 localStorage，刷新保留

### 4.5 Demo 账号（Mock 阶段）

| 账号            | 密码                     | role          | 中文名         |
| --------------- | ------------------------ | ------------- | -------------- |
| `merchant@demo` | `$SEED_DEFAULT_PASSWORD` | `merchant`    | 王老板（商家） |
| `admin@demo`    | `$SEED_DEFAULT_PASSWORD` | `platform`    | 李运营（平台） |
| `super@demo`    | `$SEED_DEFAULT_PASSWORD` | `super-admin` | 张总（超管）   |

---

## 5. 智能决策策略（已自动作答）

> 以下决策基于现有项目内容、art-lnb 框架惯例和行业最佳实践自动作出，**用户在第 7 节有任何不同看法可直接指出**。

| #   | 决策点                         | 选项                                           | 决策                                                       | 理由                                                   |
| --- | ------------------------------ | ---------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| D1  | 包名                           | `admin-pc` / `console-pc` / 沿用 `platform-pc` | **`admin-pc`**                                             | 命名中性，"管理后台"语义匹配，平台与商家共用           |
| D2  | art-lnb-master 处理            | 复制 / 移动 / 软链                             | **重命名移动**（`art-lnb-master/` → `packages/admin-pc/`） | 用户原话"直接挪动一下位置"，避免源副本漂移             |
| D3  | 删除 merchant-pc / platform-pc | 删 / 留作 archive / 改 README 引导             | **直接删除**                                               | src 完全是 art-lnb 拷贝、业务零改造，留着只会让人误用  |
| D4  | 路由模式                       | hash / history                                 | **沿用 hash**（art-lnb 默认）                              | 部署到任何 nginx 子路径都不用配 try_files              |
| D5  | 角色路由前缀                   | `/merchant/*` `/platform/*` / `/m/*` `/p/*`    | **`/merchant/*` `/platform/*`**                            | 可读性、URL 即文档                                     |
| D6  | role 字段位置                  | login response 顶级 / user 嵌套内              | **`response.user.role`**                                   | 与 `fetchGetUserInfo()` 返回结构保持一致，避免两处口径 |
| D7  | 菜单数据源                     | 前端写死 / 后端 mock 下发                      | **后端 mock 下发**（GET `/api/user/menu?role=X`）          | 跟 art-lnb asyncRoutes 设计契合，未来切真后端零改      |
| D8  | 工作台切换持久化               | localStorage / sessionStorage                  | **localStorage**（key: `admin_pc_workspace`）              | 刷新保留体验更好，登出时清理                           |
| D9  | 跨角色访问                     | 403 / 跳登录 / 隐藏不报错                      | **403 异常页**                                             | art-lnb 已有 `/exception/403`，复用                    |
| D10 | i18n                           | 保留中英 / 砍掉英文                            | **保留中英双语**                                           | 框架已配齐，砍了反而要改文件                           |
| D11 | 主题色                         | art-lnb 默认蓝 / 5.0 品牌橙 `#FF4D2D`          | **5.0 品牌橙**                                             | 与移动端三端视觉统一                                   |
| D12 | Logo / 文案                    | art-lnb 默认 / 改 "经纬科技"                   | **"经纬科技"**                                             | 与移动端 `经纬科技` `经纬科技` 品牌呼应                |
| D13 | mock 复用                      | 重写 / 复用 `@jiujiu/shared`                   | **复用 `@jiujiu/shared`**                                  | 已有商品 / 订单 / 商户 / 广告等完整 Mock，避免重写     |
| D14 | 删 art-lnb 的 \_examples       | 全删 / 全留 / 选留                             | **全删**（保留 dashboard / system 作为参考骨架）           | 干净起步，需要时随时从 git 历史里捡                    |
| D15 | 端口                           | 5173 / 8089 / 沿用 art-lnb 默认                | **5173**（vite 默认）                                      | 避开已占用的 8080–8088，且与原 art-lnb 一致            |

---

## 6. 验收标准（草案，CONSENSUS 阶段会固化）

| #     | 验收项                                                                                    | 判定方式     |
| ----- | ----------------------------------------------------------------------------------------- | ------------ |
| AC-01 | `pnpm --filter @jiujiu/admin-pc dev` 可启动，HTTP 200                                     | curl 检查    |
| AC-02 | 登录页只有账号密码两个字段，没有"我是商家/平台"切换                                       | 视觉检查     |
| AC-03 | 用 `merchant@demo` 登录 → 落地 `/merchant/dashboard`，菜单只显示商家项                    | 手动登录     |
| AC-04 | 用 `admin@demo` 登录 → 落地 `/platform/dashboard`，菜单只显示平台项                       | 手动登录     |
| AC-05 | 用 `super@demo` 登录 → 顶部有「切换工作台」下拉，能在两端切换                             | 手动登录     |
| AC-06 | `merchant` 账号访问 `/platform/audit/merchant` → 跳 403 页                                | 改地址栏     |
| AC-07 | 登出后再登录，token / 用户信息 / 工作台选择全部清理重置                                   | 手动验证     |
| AC-08 | `packages/merchant-pc` 和 `packages/platform-pc` 目录已删除，`pnpm-workspace.yaml` 已更新 | 文件系统检查 |
| AC-09 | 主题色为 5.0 商城品牌橙 `#FF4D2D`，logo 文字为"经纬科技"                                  | 视觉检查     |
| AC-10 | S3 商家 9 屏 + S5 平台 11 屏 = 20 屏路由可达（页面可以是骨架，但不能 404）                | 路由扫描     |

---

## 7. 待用户确认的问题

下列每个问题，我都已经在第 5 节给出**默认答案**。如果你都同意，直接说"全 OK，下一步出 CONSENSUS"即可；有要改的，逐条告诉我哪条要换。

| #   | 问题                                                                                  | 默认答案                                                                   |
| --- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Q1  | 新包就叫 `admin-pc` 吗？还是 `console`、`backend`、`mall-admin` 之类的别名？          | `admin-pc`                                                                 |
| Q2  | `art-lnb-master/` 直接重命名搬到 `packages/admin-pc/`，原位置不再保留？               | 是                                                                         |
| Q3  | `merchant-pc` 和 `platform-pc` 两个包**直接物理删除**？（src 都是空模板，无业务损失） | 是                                                                         |
| Q4  | 顶部"切换工作台"是下拉菜单，还是改成左侧菜单顶端一个 Segment 控件？                   | 下拉（节省空间）                                                           |
| Q5  | 超管登录默认落地哪个工作台？平台 / 商家 / 上次用的那个                                | 上次用的，首次默认平台                                                     |
| Q6  | Demo 账号要不要在登录页底部加一个"测试账号"折叠面板可一键填充？                       | **建议要**，方便演示和验收，你点头我就加                                   |
| Q7  | i18n：保留英文翻译还是这期先砍掉只做中文（后面要补也容易）？                          | 保留（框架已配齐，留着不亏）                                               |
| Q8  | 路由模式：hash（`/#/merchant/...`）vs history（`/merchant/...`）？                    | hash（部署最省心）                                                         |
| Q9  | 20 屏业务页面这一期就**全部做完**，还是只做骨架 + 智能登录，业务页留下一期？          | **本期只到能跑通智能登录 + 20 屏路由可达（骨架）**，业务细节按 6A 走 S3/S5 |
| Q10 | 顶部 NavBar 是否保留 art-lnb 自带的搜索框 / 锁屏 / 全屏 / 主题切换 / i18n 切换图标？  | 全部保留（已经做好的不砍）                                                 |

---

## 8. 风险与依赖

| 风险                                                                                     | 影响                             | 缓解                                                                          |
| ---------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------- |
| `art-lnb-master/` 体积大、依赖多，迁入 workspace 后 `pnpm install` 时间增加              | 一次性                           | 接受，迁完后 hoist 命中率高                                                   |
| art-lnb 用 `pinia 3` 而 mobile 包用 `pinia 2`，monorepo 内并存可能                       | 低（packages 独立 node_modules） | pnpm hoist 已隔离，无需统一                                                   |
| 删 merchant-pc/platform-pc 后，根 `pnpm-workspace.yaml` 或 `package.json` 脚本可能仍引用 | 中                               | 删包同时全文搜索引用并清理                                                    |
| 5.0 品牌橙覆盖 Element Plus 主色，可能与 art-lnb 蓝紫风格产生违和                        | 低                               | 仅改 SCSS 变量、按钮/链接主色，不动整体灰阶                                   |
| 超管切换工作台时菜单 / 路由需要热替换（不刷新页面），实现细节有坑                        | 中                               | 切换时强制 `router.replace` + `await menuStore.refetch()`，必要时退一步刷整页 |

---

## 9. 文件产物清单（本任务）

```
docs/admin-pc-merge/
├── ALIGNMENT_admin-pc-merge.md   ← 本文档
├── CONSENSUS_admin-pc-merge.md   ← 用户确认 Q1-Q10 后产出
├── DESIGN_admin-pc-merge.md      ← 架构设计（含智能登录时序图、菜单热替换流程）
├── TASK_admin-pc-merge.md        ← 子任务拆分（含 20 屏的原子任务）
├── ACCEPTANCE_admin-pc-merge.md  ← 实施过程的验收记录
├── FINAL_admin-pc-merge.md       ← 完成总结
└── TODO_admin-pc-merge.md        ← 遗留 TODO 与配置说明
```

---

## 10. 下一步

→ **等用户答 Q1-Q10**（或一句"全 OK"通过默认答案）
→ 进 **Align 阶段质量门控自检** → 通过 → 进 **CONSENSUS 文档**
→ CONSENSUS 通过 → 进 **DESIGN（架构）阶段**
