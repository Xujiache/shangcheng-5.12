# ACCEPTANCE · 经纬科技 5.0 实施记录

> 阶段：6A · 第 5 阶段 Automate
> 滚动更新 · 每个原子任务完成即记录

---

## S0 工程地基（2026-05-11 完成）

| 任务 ID | 任务 | 交付 | 状态 |
|---------|------|------|------|
| S0-01 | pnpm monorepo 初始化 | `package.json`、`pnpm-workspace.yaml`、`.gitignore`、`.editorconfig`、`tsconfig.base.json`、`.env.example`、`.npmrc` | ✅ |
| S0-02 | lint/format/commit | `.prettierrc`、`.prettierignore`、`commitlint.config.cjs` | ✅ |
| S0-03 | `packages/shared` 骨架 | `package.json`、`tsconfig.json`、`tsup.config.ts` | ✅ |
| S0-04 | Design Tokens | `colors.ts`、`spacing.ts`、`typography.ts`、`radius.ts`、`shadow.ts`、`z-index.ts`、`tokens.scss`、`tokens.css` | ✅ |
| S0-05 | TS 类型契约 | 15 个领域：`common/auth/merchant/product/order/commission/plaza/ad/member/feature-flag/audit/marketing/chat/stats/system` | ✅ |
| S0-06 | Mock 数据生成器 | faker 中文 locale + 7 个 factory + 25 条路由 + interceptor + paginate | ✅ |
| S0-07 | 业务 SVG 图标 | 暂跳过，按需补 | ⏳ |
| S0-08 | uni-app 三端 | `user-mp`（13 屏占位）+ `merchant-app`（21 屏占位 + 首页骨架）+ `platform-app`（16 页面占位） | ✅ |
| S0-09 | PC 两端 | `merchant-pc` + `platform-pc`（从 art-lnb 复制 + 业务化 + INTEGRATION 指南） | ✅ |
| S0-10 | NestJS 后端 | main + health + 异常 + 拦截 + Prisma 6 张核心表 + seed + Dockerfile | ✅ |
| S0-11 | Docker Compose | `docker-compose.yml`（含 server）+ `docker-compose.dev.yml`（仅依赖）+ Nginx | ✅ |

### S0 文件统计
- 根配置：11 个
- shared：49 个文件（6 tokens + 15 types + 8 mock + 6 utils + 14 配置/聚合/import）
- user-mp：22 个文件（13 屏占位 + 配置）
- merchant-app：30 个文件（首页骨架 + 20 屏占位 + 配置）
- merchant-pc：260 个文件（art-lnb 完整框架 + 业务化）
- platform-app：25 个文件（16 页面占位 + 配置）
- platform-pc：260 个文件（同 merchant-pc）
- server：13 个文件
- deploy：4 个文件（docker-compose + nginx）
- **总计 ~720 个文件**

### S0 启动验证
```bash
pnpm install
docker compose -f deploy/docker-compose.dev.yml up -d
pnpm dev:server                 # http://localhost:3000/api/docs
pnpm dev:merchant-app           # http://localhost:8080
pnpm dev:user-mp                # http://localhost:8081
pnpm dev:platform-app           # http://localhost:8082
pnpm dev:merchant-pc            # http://localhost:5173
pnpm dev:platform-pc            # http://localhost:5174
```

---

## S1 商家 APP 21 屏（进行中）

### MA-0 共享组件 + 基础设施（2026-05-11 完成）

| 任务 | 交付 |
|------|------|
| request 拦截器 | `utils/request.ts`（mock 切换 + token 注入 + 统一错误 + 401 自动登出） |
| Pinia user store | `store/user.ts`（登录/登出/角色判断/本地恢复） |
| Pinia feature-flag store | `store/feature-flag.ts` |
| services | `services/dashboard.ts` |
| NavBar | `components/nav-bar/nav-bar.vue` |
| StatusTag | `components/status-tag/status-tag.vue`（7 色 × 2 size × fill/ghost） |
| EmptyState | `components/empty-state/empty-state.vue` |
| ProductCard | `components/product-card/product-card.vue`（横/竖布局、选择态、平台推送角标、价格分级配色） |
| OrderCard | `components/order-card/order-card.vue`（状态化操作按钮） |
| StatCard | `components/stat-card/stat-card.vue`（支持暖橙渐变 accent） |
| Section | `components/section/section.vue`（卡片容器） |
| BarChart | `components/bar-chart/bar-chart.vue`（轻量柱图，零依赖） |

### MA-01 商家首页（产品级高保真，2026-05-11 完成）

视觉与交互：
- ✅ 暖橙渐变顶栏（品牌 + 会员状态 + 消息气泡 + 待办计数 badge）
- ✅ 今日数据三宫格（订单 / 新客 / 销售额，销售额用渐变 accent 卡）
- ✅ 快捷入口 4×2 网格（**功能开关 store 控制显隐**——平台 PA-10 灰度配置生效）
- ✅ 选品广场入口卡（渐变描边 + 横滚推荐 + CTA 按钮）
- ✅ 本周销售柱图（自动高亮最大值）
- ✅ 待办列表（彩点 + 数量 + 跳转箭头）
- ✅ 全程 mock 数据驱动

### MA-02 数据统计（2026-05-11 完成）
- ✅ 顶部暖橙渐变 + 时段 Tab（今日/本周/本月/本年，胶囊变体）
- ✅ 概览三宫格（销售额渐变 accent / 订单 / 客单价）
- ✅ 销售趋势 LineChart（SVG，自动高亮最大点 + 数值标注 + 渐变填充）
- ✅ 热销 TOP（前 3 大卡 + 后 7 简表，进度条 + 1/2/3 名渐变奖牌）
- ✅ 客户分析 DonutChart（新/老占比 + 中心 % + 左右图例）
- ✅ 分类销量分布 BarChart
- ✅ 新增共享组件：LineChart、DonutChart、Tabs

### MA-03 我的（2026-05-11 完成）
- ✅ 暖橙渐变顶头（头像 + 店名 + 角色徽章 + 设置入口）
- ✅ 金色会员卡（剩余天数 + 进度条 + 4 项核心权益 + 续费 CTA）
- ✅ 三组设置列表（商家中心 / 应用 / 账户，圆角分组）
- ✅ 退出登录二次确认

### MA-04 会员套餐开通（2026-05-11 完成）
- ✅ 深棕金渐变 hero
- ✅ 月费 / 年费双卡（选中态 + "最划算"角标 + 原价删除线）
- ✅ 权益对比表（月/年并排 ✓/—）
- ✅ 广告推广套餐 2×2 卡（HOT 角标，对应 PA 端套餐数据源）
- ✅ 增值单项列表（首屏 Banner / 热推标签 / 分类首屏）
- ✅ 底部固定 CTA + 确认弹窗 + 模拟支付反馈

### MA-05 商品列表（2026-05-11 完成）
- ✅ 顶部胶囊搜索 + 圆形渐变 ＋ 按钮（→ 添加商品）
- ✅ 状态 Tab 下划线（全部/在售/已下架/审核中/已驳回）
- ✅ 商品卡 + 标签 + 销量 + 库存
- ✅ 批量模式（圆形选中态、全选、上架/下架/删除三动作 fixed 底栏）
- ✅ 上拉加载更多 + 空态

### MA-06 添加商品（2026-05-11 完成，核心交互）
- ✅ 主图 9 宫格上传（首张主图徽章 + 删除 + 占位卡）
- ✅ 商品名称 / 分类（弹底选择器，平台二级分类）/ 简介
- ✅ 标签胶囊多选 + 物流多选
- ✅ SKU 卡列表（尺寸/颜色/库存/批发价/零售价/会员价，新增/删除）
- ✅ SKU 汇总（总库存 + 批发价区间）
- ✅ **价格显示规则（核心）**：访客可见开关 + 客户/门店/会员 4 行 ABx 选项
- ✅ 底部"存草稿 / 提交审核"双 CTA

### MA-07 分类管理（2026-05-11 完成）
- ✅ Tab 切换（厂家自定义 / 平台分类）
- ✅ 树形展开（▶/▼ caret + 二级缩进）
- ✅ 厂家分类 CRUD（新增顶级 / 子分类、编辑、删除、上移/下移）
- ✅ 平台分类只读 + 提示文案
- ✅ 居中弹窗编辑器
- ✅ Mock CRUD 路由全部落地

### MA-02~07 新增 Mock 路由
- `/api/v1/m/stats` · `/api/v1/m/categories`（GET/POST/PUT/DELETE/sort）
- `/api/v1/m/products`（GET 支持 status/keyword 过滤 + POST + batch-online/offline/delete）

### MA-08 订单列表（2026-05-11 完成）
- ✅ 顶部胶囊搜索 + 标题/总数双行
- ✅ 6 状态 Tab（含全部 badge）+ 横向滚动适配
- ✅ OrderCard 复用（状态化操作：发货 / 查物流 / 处理售后 / 详情）
- ✅ 发货走 uni.showModal editable 收集运单号
- ✅ 下拉刷新 + 上拉加载

### MA-09 订单详情（2026-05-11 完成，含一键识别地址）
- ✅ 状态条按订单状态切换 6 套渐变色 + 待付款倒计时
- ✅ 收货地址卡 + **「📋 一键识别」弹底，调用 shared/utils/address 解析**
- ✅ 解析结果可视化 4 格（姓名/手机/地区/详细）→ 应用按钮覆盖订单地址
- ✅ 商品多件列表 + 费用明细表（含优惠/运费/实付高亮）
- ✅ 订单信息复制订单号 + 联系客户拨号
- ✅ 底部状态化双 CTA

### MA-10 售后处理（2026-05-11 完成）
- ✅ 6 状态 Tab + 退款单卡
- ✅ 退货退款/仅退款 标签 + 申请金额高亮 + 凭证图组（点击预览）
- ✅ "同意退款" 二次确认 + "拒绝" editable 收集理由
- ✅ Mock 18 条多状态数据

### MA-11 客户管理（2026-05-11 完成）
- ✅ 搜索 + 4 类 Tab（全部/分佣/会员/普通）
- ✅ 客户卡：头像 + 名称 + 分群标签 + 拨号 + 3 项统计（订单/累消/最近下单 dayjs 相对时间）
- ✅ **价格层级选择浮层**：零售/批发/会员 3 选 1，含说明文案
- ✅ **价格授权 switch**（暖橙）调用接口
- ✅ 手机号脱敏

### MA-12 佣金设置（2026-05-11 完成）
- ✅ 暖橙渐变总开关卡
- ✅ 一级/二级佣金 ± 步进按钮（每次 0.5%）+ 累计提示
- ✅ 高级选项：对分佣客户可见 + 允许线下结算
- ✅ 商品自定义列表（含编辑浮层 + 移除二次确认）
- ✅ 顶栏"保存"按钮

### MA-13 提现处理（2026-05-11 完成，**核心交互**）
- ✅ 5 状态 Tab + 提现单卡（申请→实际双块 + 标签）
- ✅ 处理浮层暖橙 ghost 申请金额展示
- ✅ **巨型金额输入** + 圆形 −/＋ 步进按钮（暖橙阴影）
- ✅ **6 档快速调整**（−10/−1/−0.1/+0.1/+1/+10）
- ✅ 差额行（实时计算，正/负配色）
- ✅ **5 个快捷扣减标签**：扣减税费 −3% / 非订单佣金 −100% / 客户违规 −50% / 尾差圆整 / 保留 1 元手续费 −1
- ✅ 标签点击即应用金额（toggle + 视觉反馈）
- ✅ 备注 textarea（100 字，客户可见）+ 字数计数
- ✅ 通过按钮内嵌打款金额 + 大于申请额二次确认
- ✅ "驳回" editable 收集理由

### MA-08~13 新增 Mock 路由
- `/api/v1/m/orders/:id/ship` · `/api/v1/m/orders/parse-address`
- `/api/v1/m/refunds/:id/agree` · `/api/v1/m/refunds/:id/reject`
- `/api/v1/m/customers` · `/api/v1/m/customers/:id/price-tier|authorize`
- `/api/v1/m/commission/rules`（GET/POST）
- `/api/v1/m/withdraws/:id/review|reject`

### MA-14 门店列表（2026-05-11 完成）
- ✅ 暖橙渐变 3 段统计卡（合作门店 / 已授权 / 待审核）
- ✅ 搜索 + 4 状态 Tab
- ✅ 门店卡：A/B/C 等级 64×64 渐变徽章 + 状态标签 + 联系人 + 地址 + 授权有效期
- ✅ 状态化操作：pending 通过/驳回 · active 联系/授权设置

### MA-15 门店授权设置（2026-05-11 完成）
- ✅ 3 段等级卡（A 旗舰 / B 普通 / C 体验，含价格策略文案）
- ✅ 可见价格 3 选 N（批发/零售/会员，色彩点 + ✓ 视觉）
- ✅ 可上架商品（按平台一级分类列表 + switch + 加价 ± 步进 5%）
- ✅ 全选/取消全选
- ✅ 授权有效期 picker
- ✅ 跨页参数（id/name/level）

### MA-16 员工管理（2026-05-11 完成）
- ✅ 暖橙概览卡（在职人数 + 本月业绩）
- ✅ 4 角色 Tab（全部/销售/客服/店长）
- ✅ 员工卡：头像 + 角色标签 + 离职态 + 拨号
- ✅ 业绩进度条（按 top 业绩归一化）
- ✅ 权限胶囊（最多 4 个 + 计数）
- ✅ 邀请/编辑浮层 + 离职二次确认

### MA-17 店铺装修（2026-05-11 完成，**实时预览核心**）
- ✅ 顶部深色 mini 手机预览（含状态栏 / 顶栏 / Banner 轮播 / Tab / 商品网格）
- ✅ 主题色 4×2 调色板（8 色含品牌暖橙），切换实时同步 header / 价格 / Tab 颜色
- ✅ 4 种字体卡（现代/雅致/俏皮/极简），切换实时同步预览字体
- ✅ Banner 上传 2×N 网格（首张标记 + 删除）
- ✅ 3 种展示风格（瀑布流/双列/单列大图），含 SVG mock 缩略图
- ✅ 切换布局后预览实时切换 grid-template-columns

### MA-18 营销中心（2026-05-11 完成）
- ✅ 3 大渐变工具卡（优惠券/限时购/团购，含进行中计数）
- ✅ 4 宫格概览（领取/已用/限时购销量/已成团）
- ✅ 优惠券双联区设计（红色金额区 + 白色信息区，6 个圆点分割线 + 上下挖孔）
- ✅ 满减 / 折扣 / 固定金额 3 种价值展示
- ✅ 状态过滤 + 已结束置灰
- ✅ ActionSheet 编辑/暂停/复制/删除

### MA-19 在线客服（2026-05-11 完成）
- ✅ 左右分栏布局（会话列表 300rpx + 消息流）
- ✅ 会话项：头像 + 在线绿点 + 未读红 badge + 最近一句 + 相对时间
- ✅ 消息气泡左右分布（客户白 + 商家暖橙）+ 头像/时间
- ✅ 文本 + 图片消息类型（图片点击预览）
- ✅ **6 条快捷回复**面板（弹起式，含标签 + 内容）
- ✅ 输入框 + 图片按钮 + 发送按钮（输入态高亮）
- ✅ 客户上线/离线状态显示

### MA-20 选品广场（2026-05-11 完成）
- ✅ 暖橙顶部 hero（搜索 + 3 Tab fill）
- ✅ 商品 Tab：横滚标签筛选 + **真瀑布流双列**（左右独立列）
- ✅ 商品卡：平台推送角标 + 厂家名 + ¥起价 + 代理数 + **建议加价 / 佣金双色胶囊** + 标签 + 申请代理 CTA
- ✅ 厂家 Tab：12 家工厂列表（logo + 地区 + 年限 + 商品 / 代理数 + 标签）
- ✅ "我的代理" Tab 占位空态

### MA-21 厂家详情（2026-05-11 完成）
- ✅ Banner 蒙层 hero（logo + 名称 + 标签 + 地区/年限/代理数）
- ✅ 透明 NavBar 漂浮在 hero 上
- ✅ 数据三宫格上浮卡（在售/代理/月 GMV 形万元）
- ✅ 厂家介绍 + 详细地址
- ✅ 资质 4 宫格（点击预览大图）
- ✅ 主推商品 3×N grid（含推送角标）
- ✅ 底部 关注 / 联系 / **申请代理** 三段固定栏
- ✅ **申请代理弹层**：加价 ± 步进 5% + 56pt 巨字显示 + 价格自动同步 switch + 申请留言（120 字）+ 提交 CTA

### MA-14~21 新增 Mock 路由（11 条）
- 门店：stores/:id/auth（GET/POST）+ staffs CRUD
- 装修：shop/decorate（GET/POST）
- 营销：marketing/coupons + overview
- 客服：chat/sessions + sessions/:id/messages（GET/POST）+ quick-replies
- 广场：plaza/factories（list/:id）+ follow + agency

### 商家 APP 完成里程碑（S1 阶段交付）
- 共享组件 11 个：NavBar / StatusTag / EmptyState / ProductCard / OrderCard / StatCard / Section / BarChart / **LineChart / DonutChart / Tabs**
- 服务层 5 个：dashboard / member / product / order / customer / store
- 21 屏页面 100% 产品级完成
- 50+ mock 路由全链路驱动
- Pinia store：user / featureFlag
- 端到端可演示流程：登录 → 首页 → 21 屏全功能操作 → 提现处理 / 一键识别 / 选品广场 → 我的

---

**最后更新**：2026-05-11
