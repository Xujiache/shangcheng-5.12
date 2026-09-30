# 金属计算器 · 小程序 UI 重构

## 竞品参考

查看以下官方产品页及界面截图，提取实际布局：

| 产品 | 观察到的布局 | 本次采用 |
| --- | --- | --- |
| [亿昌盛 · 原材料计算器](https://apps.apple.com/cn/app/id1259003914) | 规格、长度、数量采用紧凑表格；重量和金额直接列出；保存、截图、清空就近操作 | 参数成组、结果对齐、减少说明型大卡片 |
| [材料计算器 · 钢材计算器与合金材料计算器](https://apps.apple.com/cn/app/id6775713912) | 类型宫格、分段参数、同时显示重量与成本的历史列表 | 3×2 分类宫格；记录直接显示规格、重量、金额 |
| [型钢大师](https://apps.apple.com/cn/app/id1247264708) | 分类列表、截面示意、尺寸和重量对齐表格 | 用截面区分类型；型号/实厚与查表来源放在同一区域 |
| [耕飞钢材重量计算器](https://gengfeisteel.com/zh/calculator/steel-weight-calculator/) | 材质 → 形状 → 尺寸 → 重量，高级参数与常规输入区分 | 材质 → 参数 → 吨价 → 结果；系数/加工费放到结果之后 |
| [青山金属重量计算器](https://www.qs-wiremesh.com/cn/service/profile-metal-weight-calculator.html) | 紧凑尺寸表单、截面与结果联动 | 输入单位就近展示，结果自动更新 |

小程序使用原有淡绿底色、主绿色、首页圆角和公共导航组件。没有引入竞品品牌或图片素材。

## 页面范围

| 页面 | 重构后的结构 |
| --- | --- |
| 分类 | 记录/报价快捷入口、6 类分隔宫格、紧凑计算说明 |
| 6 类计算 | 材质组 Tab、牌号选择、双列参数、密度、吨价来源、重量/金额、高级报价设置、底部主操作 |
| 历史/常用 | 数量页签、材料/类别、完整规格、重量/金额、保存时间、重新计算与删除 |
| 报价 | 当前草稿、云端列表、已保存详情三个状态；材料明细与吨价对齐；底部合计及保存/导出；错误重试、加载、空状态 |

普通结果以双列展示。长数字改为整行显示，保持金额小数和重量完整；正文留出底部操作栏滚动空间。键盘出现时收起计算/报价底部栏。导出仍先生成、再点击分享，保持微信用户手势要求。

本次只改布局、展示数据和对应回归检查；计算公式、65 材质、207 条规格、账号隔离、会员规则、报价接口和完整导出逻辑保持原契约。入口仍仅在“更多 → 其他工具”。

## 验证结果

以下命令在项目根目录执行，全部通过：

```sh
corepack pnpm --filter @jiujiu/ledger-mp typecheck
corepack pnpm exec eslint packages/ledger-mp/miniprogram/subpackages/metal/index/index.ts packages/ledger-mp/miniprogram/subpackages/metal/calc/index.ts packages/ledger-mp/miniprogram/subpackages/metal/history/index.ts packages/ledger-mp/miniprogram/subpackages/metal/quote/index.ts packages/ledger-mp/scripts/verify-metal-flow.ts --config eslint.config.mjs
corepack pnpm exec tsx packages/ledger-mp/scripts/verify-metal-flow.ts
corepack pnpm exec tsx packages/ledger-mp/scripts/verify-metal.ts
node packages/ledger-mp/scripts/verify-routes.mjs
node scripts/verify-workbook-templates.cjs
node scripts/preview-metal-pages.cjs
git diff --check
```

- 原生页面事件回归：6 类游客计算、输入更新、重量校对、离线价格、复制、价格/密度复位、账号记录、键盘状态、报价保存/读取、BOM CSV、200 行完整长图压缩和到期只读。
- 数据与计算：65 材质、207 规格、前后端一致性、已知重量、别名与数值边界。
- 路由：65 页、12 个旧路由 shim、4 个 Tab。
- 官方微信编译器：78 个 WXML、87 个 WXSS 通过；只调用编译器，没有打开微信开发者工具。
- 静态布局：23 状态 × 320/375/430px，共 69 个页面/宽度组合无横向溢出、无页面脚本错误。额外断言普通板材结果首屏不被底栏遮挡、大数字保持整行、滚动到底后正文末尾在底栏上方。另有 2 个安全区场景：顶部状态区 60px、底部 34px；结果和正文末尾均不被遮挡，共 71 条场景检查。

测试调用微信 API 替身。`preview-metal-pages.cjs` 用真实 WXML/WXSS 和原生页面处理器生成隔离样本，在一个无界面的浏览器进程中核查布局；不连接后端。运行它需要小程序依赖 `tsx`、Playwright 及可用 Chromium 浏览器，可用 `CODEX_NODE_MODULES`、`PREVIEW_BROWSER` 指定路径。

## 查看布局

- [全部 23 个状态](ui-preview/pages.html)：本地打开后可切换状态。
- [分类](ui-preview/categories-375.png)
- [板材计算](ui-preview/calc-plate-375.png)
- [记录](ui-preview/history-375.png)
- [报价草稿](ui-preview/quote-draft-375.png)
- [云端列表](ui-preview/quote-history-375.png)
- [报价详情](ui-preview/quote-saved-375.png)
- [长名称/大合计](ui-preview/quote-long-375.png)
- [长数字结果](ui-preview/calc-large-375.png)
- [布局检查数据](ui-preview/visual-checks.json)

以上为静态样式核查图，不是微信运行截图。系统胶囊、状态栏、真实键盘推顶和 iOS/Android 字体差异尚需真机验证，未计为通过。

## 环境

小程序 `API_BASE` 仍是 `https://ewsn.top`，`LOCAL_CONVERSION_TEST=false`。本轮未启动本地后端、未打开微信预览、未改动生产后端；微信版本未上传发布。
