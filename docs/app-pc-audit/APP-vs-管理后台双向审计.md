# APP ↔ 管理后台 · 双向功能审计

> 目标：保证管理后台没有虚构功能，且 APP 全部功能都能在管理后台查看/导出/更改。

## 商家端对照（merchant-app 21 屏 → admin-pc 18 屏，部分合并）

| # | merchant-app 屏 | admin-pc 屏 | 差异 | 处理 |
|---|---|---|---|---|
| 1 | tabbar/home | merchant/dashboard | ✅ 等效 | — |
| 2 | tabbar/product | merchant/product/list | ✅ 等效 | — |
| 3 | product/add | merchant/product/add | ⚠ 缺**价格显示规则** | ✅ 已补：4 客户层级 × 4 价格策略 矩阵 + 可购买开关 |
| 4 | product/category | merchant/product/category | ⚠ 缺**平台/自定义切换** | ✅ 已补：平台分类只读 + 自定义可编辑（localStorage） |
| 5 | product/agency-list | merchant/product/agency | ⚠ 缺**自动同步价格开关** | ✅ 已补：全店总开关 + 加价率 + 一键应用 |
| 6 | tabbar/order | merchant/order/list | ✅ 等效（含详情 Drawer） | — |
| 7 | order/detail | 合并到 order/list Drawer | ✅ 合并 | — |
| 8 | order/aftersale | merchant/order/aftersale | ✅ 已含证据图片 | — |
| 9 | tabbar/stats | merchant/stats | ✅ 等效 | — |
| 10 | member/index | merchant/member | ✅ 已升级为真生效 | — |
| 11 | customer/index | merchant/customer | ⚠ 缺**三层级筛选** | ✅ 已补：普通/会员/分佣 三 Tab + 客户层级列 |
| 12 | withdraw/index | merchant/withdraw | ✅ 等效 | — |
| 13 | marketing/index | merchant/marketing | ❌ 我之前加了"首屏 Banner"勾选（虚构） | ✅ 已删除虚构选项 |
| 14 | store/index | merchant/store | ⚠ 缺**门店授权 5 字段**（等级/价格/分类/加价/有效期） | ✅ 已补：授权管理 Tab 重写 |
| 15 | store/auth | 合并到 store 的授权 Tab | ✅ 合并 | — |
| 16 | staff/index | merchant/staff | ✅ 等效 | — |
| 17 | shop/decorate | merchant/decorate | ⚠ 缺**主题色 / 字体** | ✅ 已补：6 主题色 + 3 字体 + 3 圆角风格 + 实时预览 |
| 18 | commission/setting | merchant/commission | ⚠ 缺**商品自定义佣金** | ✅ 已补：单品规则覆盖全店默认 |
| 19 | chat/index | merchant/chat | ✅ 等效 | — |
| 20 | plaza/index | merchant/plaza | ✅ 等效 + 配额联动 + 联系厂家 | — |
| 21 | plaza/factory | 合并到 plaza 的 FactoryDrawer + 联系 Dialog | ✅ 合并 | — |

## 平台端对照（platform-app 12 屏 → admin-pc 13 屏，多 1 屏）

| # | platform-app 屏 | admin-pc 屏 | 差异 | 处理 |
|---|---|---|---|---|
| 1 | tabbar/home | platform/dashboard | ✅ 等效 | — |
| 2 | audit/merchant | platform/audit/merchant | ✅ 等效 | — |
| 3 | audit/product | platform/audit/product | ✅ 等效 | — |
| 4 | tabbar/merchant | platform/merchant/list | ✅ 等效 | — |
| 5 | ad/index | platform/ad | ✅ 等效（3 Drawer 真编辑） | — |
| 6 | plaza/index + plaza/push | platform/plaza | ✅ 合并 | — |
| 7 | member/index | platform/member/plan | ✅ 等效 + 订阅商家 Tab | — |
| 8 | member/pay-orders | platform/member/orders | ⚠ 缺**导出 CSV** | ✅ 已补：按当前 Tab 范围导出 CSV |
| 9 | permission/index | platform/permission | ✅ 等效 | — |
| 10 | system/index | platform/system | ✅ 等效 | — |
| 11 | feature-flag/index | platform/feature-flag | ✅ 等效 | — |
| 12 | tabbar/stats | platform/data-center | ✅ 等效（拆为独立屏 + CSV 导出） | — |
| 13 | tabbar/order | platform/order/list | ✅ 等效 | — |

## 本轮改动汇总（10 处）

### 虚构清理（1）
- ❌→✅ `merchant/marketing` 删除 "投放首屏 Banner" 勾选 — Banner 配额联动迁移到 `decorate` 屏（merchant-app 真有 Banner 上传业务）

### 字段补齐（9）

| # | 屏 | 新增字段 / 功能 |
|---|---|---|
| 1 | `merchant/product/add` | 价格显示规则表（4 客户层级 × 4 价格策略 + 可购买开关） |
| 2 | `merchant/product/category` | 平台分类（只读）/ 自定义分类（可编辑）切换，自定义 localStorage 持久化 |
| 3 | `merchant/product/agency` | 自动同步全店开关 + 统一加价率 + 一键应用，开关切换时批量改 syncStatus |
| 4 | `merchant/customer` | 三层级筛选 Tab（普通/会员/分佣）+ 表格"客户层级"列 + 见价提示 |
| 5 | `merchant/store` 授权 Tab | 重写为门店授权配置：等级 A/B/C + 可见价格 + 分类权限 + 加价率 + 有效期 + Drawer 编辑 |
| 6 | `merchant/decorate` | 全局样式条：6 主题色 + 3 字体（系统/圆体/衬线）+ 3 圆角（直角/轻圆/大圆）+ 实时预览 |
| 7 | `merchant/decorate` | Banner 配额联动：添加 Banner 模块时消耗 bannerLimit 配额 |
| 8 | `merchant/commission` | 商品自定义佣金 Tab：单品独立佣金率覆盖全店，从产品列表中选 |
| 9 | `platform/member/orders` | 顶部 "导出 CSV" 按钮，按当前 Tab 筛选范围生成下载（带 UTF-8 BOM 支持 Excel 中文）|

## 验证

- **31 屏 HTTP 全 200**
- **9 个改动 SFC 全编译通过**
- 全文 grep 关键词 `虚构 | 待开发 | mock 模拟` = 0 处

## 结论

**双向对照已完全闭合**：

| 维度 | 状态 |
|---|---|
| 管理后台**无虚构**功能（APP 没有的不要凭空加） | ✅ 已清理 marketing 唯一虚构项 |
| APP 所有功能在管理后台**都可查看/编辑** | ✅ 9 处缺失字段已补 |
| 管理后台**真生效持久化**（不是纯展示） | ✅ 通过 localStorage / member-service 双端共享 |
| 管理后台**导出能力** | ✅ data-center + member/orders 双导出 |

## 持久化清单

| localStorage Key | 用途 | 写入屏 | 读取屏 |
|---|---|---|---|
| `jj_member_state_v1` | 套餐 + 订阅 + 配额 + 缴费 | platform/member/plan, merchant/member, merchant/plaza, merchant/decorate | 同左 + merchant/dashboard |
| `jj_merchant_category_custom_v1` | 商家自定义分类 | merchant/product/category | 同 |
| `jj_agency_sync_v1` | 代理商品自动同步配置 | merchant/product/agency | 同 |
| `jj_commission_custom_v1` | 商品自定义佣金规则 | merchant/commission | 同 |
| `jj_store_auth_v1` | 门店授权配置 | merchant/store | 同 |
| `jj_decorate_style_v1` | 店铺装修主题色/字体/圆角 | merchant/decorate | 同 |
