# 软件自更新（#7）操作手册

> 商家版 / 平台版 APP 在 Android 上的「应用内自更新」功能。
> iOS 暂不支持（弹窗会提示用户去 App Store）。

---

## 一、整体架构

```
admin-pc (运营)        server (NestJS)         APP (商家/平台)
─────────────         ───────────────         ──────────────
[新建发布]            POST /p/app-releases     onLaunch +2.5s
  ↑选 APK     ───→    ├─ FilesService          ├─ checkAppUpdate
  ↑填版本             │   .uploadApk           │   GET /m/app/latest
  ↑勾选强制            │   存 MinIO             ├─ 比 versionCode
                     └─ 写 AppRelease 表      ├─ 有更新 → showModal
[列表/删除]           GET /p/app-releases       ├─ 同意 → plus.downloader
                     DELETE /p/app-releases   └─ 完成 → plus.runtime.install
```

---

## 二、首次部署清单

### 1. 应用数据库 schema

```sh
cd packages/server
npx prisma db push      # 把 AppRelease 表推到数据库
# 或在生产环境
npx prisma migrate deploy
```

### 2. 重启后端

```sh
cd packages/server
pnpm build && pm2 restart jiujiu-server   # 或你的部署脚本
```

### 3. 检查 MinIO 公网可达

APP 下载 APK 不会带 token，所以 MinIO 的 `S3_PUBLIC_URL` 必须是**公网域名**且可匿名 GET。
检查环境变量：
- `S3_ENDPOINT`：MinIO 服务地址
- `S3_PUBLIC_URL`：公开可访问的 URL（例：`https://cdn.ewsn.top/jiujiu-mall`）
- `S3_BUCKET`：bucket 名（默认 `jiujiu-mall`）

如果你之前只在内网用 MinIO，需要：
1. 在 nginx 暴露一个公网域名指向 MinIO 9000 端口
2. 给 bucket 加 readonly anonymous 策略：
   ```sh
   mc anonymous set download local/jiujiu-mall
   ```

### 4. 部署 admin-pc

```sh
cd packages/admin-pc
pnpm build
# dist/ 拷贝到你的静态托管
```

---

## 三、发布一个新版本（业务方操作）

### 1. 在 HBuilderX 里改版本号

打开 `packages/merchant-app`（或 `platform-app`）→ HBuilderX → manifest → 基础配置：
- **应用名称**：经纬科技 · 商家版
- **应用版本名称**：`1.0.1`（用户能看到的）
- **应用版本号**：`101`（端上比较用，**严格自增**，下次再发要 +1）

### 2. 构建 APK

HBuilderX → 发行 → 原生 App-云打包 → 选 Android → 提交（约 2–10 分钟）。
完成后从云打包记录下载 .apk 文件到本地。

或者本地构建：
```sh
cd packages/merchant-app
pnpm build:app
# 然后用 HBuilderX 离线打包
```

### 3. 上传到 admin-pc

1. 登录平台后台 → 左侧菜单「系统配置」→「APP 发布」
2. 上方切换 Tab 到「商家版 APP」或「平台版 APP」
3. 点「新建发布」：
   - **版本号**：`1.0.1`（要和 manifest 里一致）
   - **versionCode**：`101`（同上）
   - **更新说明**：会显示在端上弹窗里，建议按行列要点
   - **强制更新**：除非这版修复了严重 bug，否则**不要勾**
   - **APK 文件**：选刚才下载的 .apk
4. 点「发布」，等待上传完成（300MB 以内通常 1–2 分钟）

### 4. 验证

- 平台后台列表能看到新发布
- 用旧版本 APP 打开应用，等 2.5 秒应该弹窗
- 点「立即下载」→ 进度条 → 完成后自动调起 Android 安装器

---

## 四、端上行为说明

### 启动检查

| 场景 | 行为 |
|---|---|
| 后台无发布 / 无新版本 | 静默不打扰 |
| 有新版本，用户上次「忽略本版本」 | 静默不打扰（除非新一版又比它高） |
| 有新版本，未被忽略 | 弹窗：版本号 + changelog + 立即下载 / 忽略 |
| 强制更新（force=true） | 弹窗无「忽略」按钮，只能下载 |
| iOS / H5 | 显示「请去 App Store」 |

### 手动「检查更新」按钮

- 商家端：me 页 → 检查更新
  - 已是最新：toast 提示
  - 有新版本：同启动检查的弹窗

### 「忽略本版本」是什么意思

- 只对当前 versionCode 生效（存在本地 storage）
- 后端再发更高的 versionCode，自动失效，重新弹窗
- 强制更新无视此设置

---

## 五、运维 / 排错

### Q1：用户反馈「点了下载没反应」

通常是 MinIO 公网不可达。在浏览器直接打开 admin 列表里复制的 URL，看能否下载。
如果不行：
- 检查 nginx 反代规则
- 检查 bucket 策略：`mc anonymous get local/jiujiu-mall` 应返回 `download`

### Q2：「versionCode 必须 > 当前最大版本」报错

后端做了 unique 约束 `(platform, versionCode)`。
要么改大 versionCode，要么先把旧的同号发布删了再重新发。

### Q3：APP 弹窗但点确定没反应

可能：
- Android 没给「未知来源安装」权限：设置 → 安全 → 允许此应用安装应用
- HBuilderX 打包时漏配 `<uses-permission REQUEST_INSTALL_PACKAGES />`
  - 这个权限默认包含在 uni-app 的 App 模板里，一般不用手加

### Q4：iOS 用户怎么办

当前只做 Android。iOS 上弹窗会显示「请前往 App Store 更新」但不会自动跳转。
后续如果上 App Store：
- 后端 latest 接口加 `iosUrl` 字段
- composable 加 `plus.runtime.openURL(latest.iosUrl)` 即可跳应用商店

---

## 六、相关代码位置

| 角色 | 路径 |
|---|---|
| 数据库表 | `packages/server/prisma/schema.prisma` → `model AppRelease` |
| 后端模块 | `packages/server/src/modules/app-release/` |
| APK 上传 | `packages/server/src/modules/files/files.service.ts` → `uploadApk()` |
| admin 页面 | `packages/admin-pc/src/views/platform/app-release/index.vue` |
| admin API | `packages/admin-pc/src/api/platform-business.ts` → `fetchAppReleases / uploadAppRelease / deleteAppRelease` |
| 商家端 composable | `packages/merchant-app/src/composables/useAppUpdate.ts` |
| 平台端 composable | `packages/platform-app/src/composables/useAppUpdate.ts` |
| 启动注入 | 两端 `App.vue` 的 `onLaunch` 末尾 |
| 手动入口 | `packages/merchant-app/src/pages/tabbar/me/index.vue` → `handle('update')` |
