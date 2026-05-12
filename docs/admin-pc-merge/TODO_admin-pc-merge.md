# TODO · 管理后台合并（admin-pc）

> 本期已完成本身的 CONSENSUS 范围。本文列出**遗留事项**与**配置说明**，供下一阶段决策。

---

## ⚠ 待你确认的 1 件事

### TODO-1 · 旧 `views/dashboard/`、`views/system/` 是否删？

**现状**：admin-pc 的 `src/views/` 下仍保留 art-lnb 自带的 `dashboard/console/`、`system/user/`、`system/role/`、`system/user-center/`。
本期 CONSENSUS §8 决议是"作为视觉样板保留"，但路由模块已经不引用它们了。

**影响**：
- ⬆ vite 编译时仍会扫描这些文件（增加少量构建时间）
- ⬇ 删了之后 S3 / S5 实施时少一个可参考的"art-lnb 原生卡片样式"对照

**建议**：先留着，等 S3 第一屏 dashboard 实施后立刻删，省得长期占位。
**等你拍板**：保留 / 立删 / 现在不管。

---

## 🔧 必须的配置（接真后端时）

### CFG-1 · 接真后端 `/api/auth/login`

`src/api/auth.ts` 当前是 mock 实现。接真后端时：
```ts
// 删除 mock 分支，恢复 axios 调用：
export function fetchLogin(params: Api.Auth.LoginParams) {
  return request.post<Api.Auth.LoginResponse>({ url: '/api/auth/login', params })
}
export function fetchGetUserInfo() {
  return request.get<Api.Auth.UserInfo>({ url: '/api/user/info' })
}
```
后端协议要求：
- POST `/api/auth/login` → `{ token, refreshToken }`
- GET `/api/user/info` → `{ userId, userName, email, avatar, roles: string[], buttons: string[] }`
  - `roles` 必须含且仅含一个：`merchant` / `platform` / `super-admin`
- `.env.development` 的 `VITE_API_PROXY_URL` 已配 apifox mock，改成真后端地址即可

### CFG-2 · 删除 `src/api/mock-accounts.ts` + `localStorage` 兼容

接真后端后：
- 删除 `src/api/mock-accounts.ts`
- 浏览器 localStorage 中 `admin_pc_mock_active_user` key 仅 mock 用，可清

### CFG-3 · 主题持久化（如发现主题色没变）

art-lnb 的 settingStore 用 localStorage 持久化用户选过的主题色。如果之前在 art-lnb-master 跑过，localStorage 里可能还存着蓝色 `#5D87FF`，首次登录看着不像橙色。
**清理方式**：浏览器 DevTools → Application → Local Storage → 删 `sys-v* 主题`相关 key，或 hard refresh + 隐身窗口。

### CFG-4 · 端口冲突

admin-pc 占用 5173。若你本机 5173 被占（如另一个 Vue 项目），改 `packages/admin-pc/.env` 的 `VITE_PORT`。

---

## 📋 下一阶段建议路径

按 6A 流程，把骨架变完整业务，建议拆 2 个独立任务：

### 任务 A · S3 商家 PC 业务实施（9 屏）
- 复用移动端 `merchant-app` 同名屏的业务逻辑
- 关键点：商品 CRUD（含按尺寸定价 / 自定义 SKU / 图片 CRUD）需要桌面级表格交互
- 估时：1–2 天

### 任务 B · S5 平台 PC 业务实施（11 屏）
- 复用移动端 `platform-app` 同名屏
- 关键点：商户审核 / 商品审核 / 广告位 / 选品广场推送 需要桌面级列表 + Drawer 详情
- 估时：1.5–2.5 天

两个任务可并行，独立验收。

---

## 🐞 已知小问题（不影响交付）

| # | 问题 | 优先级 | 处理建议 |
|---|---|---|---|
| K1 | uni-app alpha 包在 monorepo 触发 vite peer warning | 低 | 等 uni-app 升正式版自动解决 |
| K2 | art-lnb 自带的"快速入口"配置（fastEnter）仍是默认值，应换成商家 / 平台常用入口 | 中 | S3 / S5 阶段顺手改 |
| K3 | i18n 英文翻译仅做了 menus.merchant / menus.platform，登录页 / 顶部栏其它键还是 art-lnb 原文 | 低 | 若客户不要求英文可保留现状 |
| K4 | 顶部"国际化按钮"和"通知按钮"对于 admin-pc 暂未配业务，沿用 art-lnb 占位 | 低 | 商业化时关掉或接通 |

---

## 📁 相关文档

- ALIGNMENT_admin-pc-merge.md · 需求对齐
- CONSENSUS_admin-pc-merge.md · 技术共识
- DESIGN_admin-pc-merge.md · 架构设计
- TASK_admin-pc-merge.md · 原子任务拆分
- ACCEPTANCE_admin-pc-merge.md · 实施 + 验收
- FINAL_admin-pc-merge.md · 总结与交付
- TODO_admin-pc-merge.md · 本文档
