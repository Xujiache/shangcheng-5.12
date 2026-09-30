# 玻璃 K 值与重量估算

## 交付范围

- 「更多工具」中的「玻璃 K 值计算」「玻璃重量估算」相邻，同一行展示；两个页面可互相跳转。
- K 值支持 2–20 片玻璃、对应的 1–19 个腔体。每片厚度和两个表面的 Low-E 发射率分别设置；每个腔体可独立选择空气、氩气或真空。保留旧版双玻请求兼容。
- 重量支持 1–20 层、毫米尺寸、常用厚度、自定义厚度优先、逐层不同厚度、计算与重置。展示总重量、面积、每平方米重量、玻璃总厚和公式；不同厚度时展示每层重量。
- 两项均登录后免费。服务端分别记账，只保存用户、工具、状态和时间等事件元数据，不保存计算尺寸、参数或结果。
- 小程序连接 `https://ewsn.top`，本次未在 Mac 启动后端，未启动微信开发者工具。

## 计算口径

重量 = 高（m）× 宽（m）× 各层玻璃厚度之和（mm）× 2.5 kg/(m²·mm)。

截图样例：1600 × 3500 mm、6 mm、2 层，结果 **168 kg**。该值估算普通玻璃自重，胶片、窗框、间隔条和配件不计入。

K 值采用服务器原生 **pyWinCalc 3.6.2**，计算玻璃中心传热系数 Ug，不是含窗框与边缘热桥的整窗 Uw。默认竖直安装、室外 0℃、室内 20℃、无太阳辐照；表面换热系数仍可调整。真空腔使用原有支撑柱模型。

输入范围：K 值玻璃厚度 2–25 mm，中空腔 4–30 mm，真空腔 0.1–1 mm，表面发射率 0.01–0.84；重量工具每层厚度 0.1–100 mm，尺寸 0.001–100000 mm。超过 20 层明确拒绝，不静默截断。

## UI 参考与实现

- [小米计算器官方产品页面](https://play.google.com/store/apps/details?id=com.miui.calculator&hl=zh)：参考输入区与结果区的主次关系、紧凑参数行、辅助数值的层级。
- [Glass Technology Services 玻璃重量计算器](https://www.glass-ts.com/resources/glass-weight-calculator/)：参考常用厚度、不同玻璃层厚度和分层结果的组织。
- [Quattrolifts 玻璃重量计算器](https://quattrolifts.com/glass-weight-calculator)：核对玻璃重量密度系数。
- [LBNL pyWinCalc](https://github.com/lbnl-eta/pywincalc)：核对多固体层与间隔层的建模方式。

沿用首页淡绿色背景和 18 px 卡片圆角。尺寸横向并排、玻璃/腔体逐行排列、进阶参数折叠，底部固定计算与重置。计算完成后表单继续可编辑，修改参数即清除旧结果；忽略修改、重置或离开页面前发出的迟到请求结果。

## 验收证据

- 服务器构建通过；完整后端测试 **57 个套件、527 项通过、2 项跳过**。跳过的是原有转换输出测试缺少 `yazl` 条件，与玻璃工具无关。
- 原生引擎验证覆盖 2–20 片、旧版兼容、空气/氩气、Low-E、不同厚度和真空结构；真实 HTTP 接入结果与直接引擎调用误差小于 1e-8。
- 小程序类型检查、更多工具路由/相邻入口、实际页面事件处理、错误输入、混合厚度草稿、重置与迟到请求验证通过；66 个路由检查通过。
- 微信原生 WXML/WXSS 编译器通过。**尚未完成微信模拟器与手机视觉/触控验收，也未上传发布新的小程序版本。** Mac 锁定且本次浏览器禁止打开本地 HTML，未绕过限制启动预览服务。
- 公网 JWT 鉴权、无会员免费访问、错误输入拒绝、两项工具分别记账与验收账号清理均通过。详见 [公网接口验收](./production-checks.json)。
- 管理端构建与类型检查通过，公网首页、8 个入口资源、重量标签延迟加载文件均通过检查，详见 [管理端部署验收](./admin-checks.json)。

## 部署与回滚

- 活跃后端：`jiujiu-server-metal-20260930`，目录 `/root/projects/jiujiu-metal-20260930/packages/server`。保留原工作目录、上传文件位置及 PM2 环境。
- 验收源码隔离目录：`/root/projects/jiujiu-glass-20260930`；在现有生产代码与金属工具改动上增量更新。
- 发布备份与日志：`/root/deployment-verification/glass-tools-20260930`，仅服务器管理员可读。包含原源码、`original-dist`、原工具约束、构建/测试记录。
- 必须先执行 [工具事件约束升级](../../deploy/upgrades/20260930_002_glass_tools.sql)，否则新增工具的记录会被旧数据库约束拒绝。此次已验证约束，未删除或修改历史事件。
- 后端回滚：恢复备份 `original-dist` 和原源码，重启同一个 PM2 进程。保留已扩展的工具键约束，避免删除新工具使用记录。
- 管理端构建需要 `VITE_BASE_URL=/admin/`；验证首页与入口资源、重量工具标签对应的延迟加载文件。静态文件原目录备份为 `original-admin-static`，恢复该目录即可回滚；保留旧哈希资源供已打开的页面使用。
- 公网验证脚本：`packages/server/scripts/verify-glass-production.cjs`。只在服务器运行，读取受限环境文件，使用实际 Python 路径；创建一次性验收账号，结束后删除其事件和账号。不会打印 JWT 或数据库凭据。

```bash
LEDGER_GLASS_PYTHON=/opt/jiujiu/glass-py-3.6.2/bin/python \
node --env-file=/etc/jiujiu/server.env \
  packages/server/scripts/verify-glass-production.cjs
```

## 图标

使用内置 `image_gen` 模式，以既有 K 值/潮汐图标为风格参考；透明 RGBA，256 × 256，90,475 字节。

保存位置：`packages/ledger-mp/miniprogram/subpackages/more-tools/assets/tool-glass-weight.png`。

最终提示词：

```text
Use case: stylized-concept.
Asset type: one standalone transparent PNG app tool icon for 量窗助手, glass weight calculator.
Input images: Image 1 is the EXISTING glass K-value icon and Image 2 is the existing tide icon; BOTH are STYLE REFERENCES ONLY. Create a NEW subject in exactly the same icon family.
Subject: a compact mint-green platform weighing scale with two small stacked translucent glass panes resting flat on its top. Simple recognizable weighing silhouette, a tiny warm-yellow weight indicator accent. Glass edges are thick, rounded jade green with cream-white diagonal highlights.
Style: friendly glossy rounded mint-green 3D molded object, softly translucent jade edges, restrained clean product render. Match the references' shading, mint palette, highlight quality and icon proportions. Three-quarter isometric front view, upper-left soft light.
Composition: one centered compact object, even padding, strong silhouette legible at 44 pixels, subject occupies about 75 percent of square canvas.
Background: genuinely transparent RGBA, preserve alpha. No backdrop tile, no ground plane, no environment.
Avoid: captions, letters, numbers, brand logos, watermark, decorative particles, gradients behind the subject, excessive shadows. Do not redraw the existing reference subjects; show glass being weighed.
```
