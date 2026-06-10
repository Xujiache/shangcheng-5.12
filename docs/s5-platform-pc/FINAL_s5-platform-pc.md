# FINAL · S5 平台 PC 业务实施

> 6A 阶段 6 收尾。

## 一句话

把 admin-pc 平台工作台从 **11 屏 placeholder** 全部换成完整业务，并补齐 platform-app 已有但 admin-pc 缺的 **2 屏**（merchant/list、order/list），共 **13 屏**。

## 验证

```
http://localhost:5173 → super@demo / $SEED_DEFAULT_PASSWORD → 切换 [平台工作台]
```

侧边菜单显示 **13 项**（旧 11 项 + 新增 2 项）：

| #   | 屏           | 备注                       |
| --- | ------------ | -------------------------- |
| 1   | 数据驾驶舱   | 4 KPI + 趋势 + 待办 + 入口 |
| 2   | **商户列表** | 新增                       |
| 3   | **平台订单** | 新增                       |
| 4   | 数据中心     | 4 周期切换 + 5 图表        |
| 5   | 商户审核     | 3 Tab + 资质图浏览         |
| 6   | 商品审核     | 自动通过 + 抽检            |
| 7   | 广告管理     | 3 Tab + 4 KPI              |
| 8   | 选品广场     | 5 列网格 + 推送 Drawer     |
| 9   | 会员套餐     | 4 Tab + HOT 套餐卡         |
| 10  | 缴费订单     | 4 Tab + 退款审批           |
| 11  | 权限管理     | 角色 + 管理员              |
| 12  | 系统配置     | 5 ElCard 分组              |
| 13  | 功能开关     | 灰度 + 3 列开关            |

## 代码地图

```
packages/admin-pc/src/
├── api/platform-business.ts           [新] ~440 行 · 30 个接口
├── router/modules/platform.ts         [改] +2 路由
├── locales/langs/{zh,en}.json         [改] +2 i18n keys
└── views/platform/
    ├── dashboard/index.vue            ~280 行
    ├── merchant/list/index.vue        [新] ~330 行
    ├── order/list/index.vue           [新] ~290 行
    ├── data-center/index.vue          ~210 行
    ├── audit/merchant/index.vue       ~320 行
    ├── audit/product/index.vue        ~380 行
    ├── ad/index.vue                   ~360 行
    ├── plaza/index.vue                ~420 行
    ├── member/plan/index.vue          ~350 行
    ├── member/orders/index.vue        ~290 行
    ├── permission/index.vue           ~390 行
    ├── system/index.vue               ~300 行
    └── feature-flag/index.vue         ~280 行
```

合计 ≈ **4300 行** 新增 / 替换。

## 关键技术点

| 点                                                       | 实现                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| 路由扩展                                                 | `router/modules/platform.ts` 11 → 13，meta.roles=['platform'] |
| ArtStatsCard / ArtLineChart / ArtBarChart / ArtRingChart | 使用 admin-pc 既有图表组件                                    |
| 资质图浏览                                               | ElImage + preview-src-list 大图弹层                           |
| 商品审核 dropdown 驳回                                   | ElDropdown + 5 个预定义原因                                   |
| 广告位卡布局                                             | grid auto-fill minmax(380px) + 4 统计 + 预览图                |
| 选品广场批量                                             | ElCheckbox 多选 + 推送 Drawer + ElDatePicker                  |
| HOT 套餐卡                                               | 绝对定位渐变标签 + box-shadow 加亮                            |
| 5 ElCard 系统设置                                        | 单页可滚 + 全表单 + 保存全部                                  |
| 灰度配置                                                 | ElRadioButton 4 受众 + ElInputNumber + ElRadioGroup 命中规则  |
| 23 项功能开关                                            | grid auto-fill + ElSwitch + 徽标                              |

## 决策回顾

ALIGNMENT D1-D18 全部按默认值落地：包名 / 13 路由 / 不分组 / API 单文件 / 主题 #FF4D2D / 全 keep-alive 除 dashboard / Drawer 详情 / Tab 切换 / 不真支付 / 不真灰度 / 中文文案为主。

## 范围对照

✅ **必做 14 项全做**（13 屏 + 路由 + i18n + API + smoke）
❌ **不做 8 项严守**（真后端 / 真支付 / 真退款 / 真导出 / 真灰度 / 单测 / 业务文案英译 / platform-app me 个人中心）

## 文档

7 份齐全：ALIGNMENT / CONSENSUS / DESIGN / TASK / ACCEPTANCE / FINAL / TODO。
