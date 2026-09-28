# 更多工具上线记录（2026-09-29）

## 版本与范围

- GitHub：`Xujiache/shangcheng-5.12`，分支 `codex/ledger-original-engine-rebuild`，源码 `98cec46`。服务器后端与 worker 构建自 `b7041af`；后续的 `98cec46` 仅将小程序开发版 API 地址改为线上域名。
- 后端：`jiujiu-server-b7041af`（PM2，`127.0.0.1:3003`）；Nginx 的 `ewsn.top` API、WebSocket 和健康检查代理已切换到该端口。旧 `jiujiu-server-f39ea43` 已停止，保留供回滚。
- 转换 worker：`jiujiu-conversion-worker:b7041af`。旧容器以 `jiujiu-conversion-worker-before-b7041af-20260929` 保留。
- 玻璃引擎：pyWinCalc `3.6.2`，上游源码固定提交 `49e3316a17d08715b96a5245a4bb656fcd914310`，Linux 解释器位于 `/opt/jiujiu/glass-py-3.6.2/bin/python`。
- 后台管理页静态文件已更新至 `/var/www/ewsn.top/admin/`；小程序源码已推送并生成开发版预览，**尚未正式上传或发布微信版本**。

## 验证结果

- Mac：小程序类型检查、ESLint、路由检查、五个新工具逻辑与离线事件队列测试通过；后台管理页构建和类型检查通过；后端构建、类型检查、相关 9 项 Jest 测试及玻璃参考算例通过。微信开发者工具中检查了更多工具、搜索与新工具页面。
- Linux：同版本后端构建、类型检查、9 项 Jest 测试和 pyWinCalc 参考算例通过。
- 公网真实链路：`wx.login → /api/v1/l/auth/wechat-login` 返回 201；分块上传 HTML、排队转换 Markdown、鉴权下载、跨账号拒绝和清理通过。转换能力接口报告 46 类操作、1217 个组合；本次公网抽测 **仅验证 HTML→Markdown**，这些数量不等于逐组合验收。
- 公网玻璃计算：中空参考结果 `2.799173839470436`，真空参考结果 `1.1245329998389604` W/(m²·K)；无效参数返回 400。工具事件提交重复 ID 去重，测试账号和事件已清理。后台静态页与健康检查返回 200；未登录访问使用记录和玻璃计算接口返回 401。
- 线上 worker 心跳正常；新版 PM2 进程无重启。旧后端停止后重新运行公网转换与玻璃抽测，结果仍通过。
- 后台更新保留了旧版哈希静态资源，缓存中的旧页面请求抽测返回 200。
- 微信开发者工具预览上传通过；主包 `2097048` 字节（距 2 MiB 上限仅 104 字节），总包 `3162766` 字节。预览码保存在本机 `~/Downloads/量窗助手-更多工具预览-20260929.png`。打包后复查了五列工具图标、三角与圆弧示意图；后续增加主包内容前须继续迁移资源。

## 当前资源与限制

- Worker：内存上限 4 GiB、2 CPU、只读根文件系统、`/tmp` 3 GiB。Nginx 单请求体上限 50 MiB；转换上传使用分块请求。
- 能力接口当时返回单文件和批次上限约 `715825152` 字节、1000 个文件。该值随可用磁盘动态变化，不保证任意文件都能成功转换。
- 未完成 iOS、Android 真机传感器、滑尺、登录与后台记录联动验收；微信版本未正式上传/发布。勿将开发者工具验证当作真机验收。

## 备份与回滚

- 数据库备份：`/root/backups/jiujiu-before-more-tools-20260928.dump`（权限 600；Mac 副本 `/Users/mac/.local/share/jiujiu/backups/jiujiu-before-more-tools-20260928.dump`）。本次数据库迁移仅新增工具事件表与版本记录。恢复整库前须停写并单独评估上线后的新增业务数据。
- Nginx 旧配置：`/etc/nginx/backups/ewsn-top.conf.before-b7041af-20260929`。将其复制回 `/etc/nginx/sites-enabled/ewsn-top.conf`，执行 `nginx -t` 与 `systemctl reload nginx`。
- 旧 API：`pm2 restart jiujiu-server-f39ea43`。切回旧 Nginx 上游后再停止 `jiujiu-server-b7041af`，随后 `pm2 save`。
- 旧 worker：先停止并重命名当前 `jiujiu-conversion-worker-production`，再将 `jiujiu-conversion-worker-before-b7041af-20260929` 改回生产容器名并启动。切换前检查在途任务。
- 旧后台静态文件：`/root/backups/jiujiu-admin/admin-before-b7041af-dir`；另有压缩备份 `/root/backups/jiujiu-admin/admin-before-b7041af-20260929.tar.gz`。
- 原有受限环境文件备份：`/etc/jiujiu/server.env.before-more-tools-20260929` 与 `/etc/jiujiu/conversion-worker.env.before-more-tools-20260929`。新旧环境文件及备份均不得公开。
