# 鸿蒙数据页重构与统计纠错

## 交付状态

日期：2026-09-09。基线：`709de9c74554d337d7aee8a0674f9f1cbc1afa08`，在现有未提交工作之上渐进修改，未提交或推送。

代码、本地针对性验证、后端构建和鸿蒙签名调试包构建已完成。**新后端接口没有部署；没有连接真机，因此真机交互、布局及在线统计仍待验证。** 不应把本记录视为上线放行。

## 页面改动

- 底部数据页与工作台完整数据页共用新看板：日期、四项概览、成交趋势、商品／品类排行。
- 手机单列；宽屏趋势与排行双列。卡片间距 12 vp，内边距 14–16 vp，主要按钮不小于 44 vp；两个入口分别处理底部导航与安全区。
- 默认本周。今日／本周／本月／本年等宽，显示真实起止日期；自定义单独高亮。
- 自定义为独立草稿日历：支持跨月跨年、单日与最多 366 天范围，禁止未来日期。点年月可快速换年／月；取消或关闭不修改生效条件，确认才请求。超限范围保留草稿并禁止确认，不偷偷缩短。
- 金额完整显示两位小数。排行以件数及占全部销量比例展示，默认五项，可展开其余商品／品类。
- 图表展示全部时间范围及坐标，点击对应位置查看准确金额；不需要横向拖动。
- 首次读取使用轻量占位；同范围刷新保留内容，失败保留上次成功数据并提示；切换范围立即清除不匹配结果。
- 请求编号与账号双重校验，丢弃过期响应，合并同范围并发请求。缺失必需字段显示校验错误，正常空数组安全渲染。
- 指标、按钮、日期面板、排行及图表直接订阅语言与主题；使用现有生成图片图标，无新手绘图标。Canvas 仅绘制业务趋势。

## 新接口与统计口径

`GET /api/v1/m/stats/overview`

保留原 `GET /api/v1/m/stats`，原方法未改。新接口继承商家鉴权，通过登录态解析商家归属，忽略客户端伪造商家身份。成功响应继续由全局拦截器包装。

请求示例：

```text
?period=week
?period=custom&startDate=2026-08-20&endDate=2026-09-09
```

快捷周期不能混入日期参数。默认 week；业务时区 Asia/Shanghai，周一开始；返回版本、周期、实际起止日期、截止时间、粒度及全部统计结果。

- 实付成交额：本商家订单 `paidAt` 落在范围内的 `payAmount`，每单只计一次。不计未付款订单；退款后不回减原成交。
- 已完成退款：本商家 `status=completed` 且 `completedAt` 落在范围内的实际 `refundAmount`。不计申请金额、同意或处理中金额。跨期退款按完成期间归属。
- 客单价：期间实付金额／实付订单数，零单为零。
- 销量：同一批已付款订单的购买数量，不推算退货件数。品类使用商品当前分类，缺失归未分类。
- 今日按小时；本周、本月按日；本年按月。自定义单日按小时，2–62 天按日，更长按月。首尾采用半开区间，当日以本次统计截止时刻为上界。
- 单条参数化 SQL 完成金额、退款、时间与排行聚合，所有部分同一语句快照。Decimal 与 PostgreSQL numeric 保留分；不读取完整订单／商品对象到应用内存。
- 客户端检查趋势金额合计与成交额一致、品类数量合计与总销量一致。服务未部署时明确提示不可用，绝不静默调用旧口径接口。

未修改数据库结构、历史订单金额、支付、退款或库存写入流程。

## 文件职责

- shared `types/stats.ts`：独立 MerchantAnalytics 契约，原契约保留。
- 后端 `analytics-range.ts`：北京业务日期、自然周期、分桶与参数边界。
- 后端 `merchant-analytics.service.ts`：数据库只读聚合与金额序列化。
- 原生 StatsPage：组合、生命周期、日期生效与请求状态。
- 原生 StatsPolicy／StatsRepository：日期策略、契约校验、格式化与接口读取。
- 原生 StatsDatePanel：范围草稿日历。
- 原生 StatsCards／StatsTrendChart：概览、数量排行和可点击趋势。

## 针对性验证

已完成：后端两套 16 个用例；原生业务控制器／策略 8 个用例；隔离 PostgreSQL 的 12 类断言；shared 与 server 类型检查；后端构建；本地 Hvigor 签名调试包构建。原生 API 源码检查覆盖 97 个操作，功能表源码检查 31/31；这些源码检查不代表真机功能已验收。

测试仅覆盖此次受影响模块，未运行无关全仓库测试。

在仓库根目录运行：

```powershell
pnpm --filter @jiujiu/server exec jest --runInBand test/merchant-analytics.spec.ts test/member-localization.controller.spec.ts
node native/harmony-merchant/scripts/test-stats.mjs
node packages/server/scripts/verify-merchant-analytics.cjs "C:/Program Files/PostgreSQL/17/bin"
pnpm --filter @jiujiu/server build
```

PostgreSQL 验证器创建独立临时集群、合成数据、随机本机端口，仅绑定回环地址，不读取正式连接配置。结束后关闭集群，保留日志；不应对现有正式数据库运行建表。脚本面向本机 Windows PostgreSQL 工具。

证据：`server-tests.txt`、`native-tests.txt`、`postgres-verification.json`、`server-build.txt`、`native-build-summary.txt`、`verification.json`。`implementation.patch.gz` 是相对本轮开始前备份的任务专属差异，不包含签名或凭据。

## DevEco 副本与构建

任务涉及的 10 个原生文件已逐一同步并做哈希对比：

`D:\DevEcoProjects\jingwei-workspace\native\harmony-merchant`

本地产物：

`D:\DevEcoProjects\jingwei-workspace\native\harmony-merchant\entry\build\default\outputs\default\entry-default-signed.hap`

产物 SHA-256 和构建时间记录在 verification.json。未覆盖签名配置，未重新申请证书，未安装／卸载手机应用。原有生成图标、商品与订单页、语言设置以及记工配置改动保留。

## 待验证与后续操作

1. 另行部署包含新只读接口的后端；本次不获得部署授权。上线后使用两个真实测试商家核对认证、隔离及统一响应壳。
2. 连接真机后做一次简测：中英文即时切换、深浅色、点击趋势、跨月跨年自定义确认／取消、两个入口底部遮挡、长金额、空数据、失败重试。
3. 签名调试安装只覆盖更新，不卸载、不清数据；若签名不一致应停止并另行确认。
4. 当前构建仍有既存 AdaptiveMaterialSurface 使用 API 26 而兼容基线 API 21 的警告，不属于本次统计改动；不能据构建成功声称所有系统版本均已验证。
5. 未做全量压测；历史较多时排行聚合及展开的大列表性能需要在真实测试数据下评估。本次无新老客分析或未经验证的利润指标。

## 数据保护与回退

本轮前置备份位于 `C:\Users\Administrator\AppData\Local\Temp\jingwei-stats-before-20260909`。记录已核对记工 project.config.json 和既有 merchant.service.ts 的哈希，均未改变。

如需撤销，只针对 implementation.patch.gz 的任务范围逐项恢复，并先核对是否存在后续编辑；不要重置整个仓库或覆盖当前签名。旧统计接口一直保留，因此旧客户端契约未替换；新页面回退应与本次原生文件整体一起处理。数据库无迁移或数据回滚步骤。
