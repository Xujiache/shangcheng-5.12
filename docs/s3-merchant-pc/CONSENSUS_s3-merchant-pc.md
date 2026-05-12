# CONSENSUS · S3 商家 PC 业务实施

> 用户答 Q1–Q6 全 OK。本文固化决策、版本化。

---

## 1. 必做（9 项）

1. `/merchant/dashboard` · 4 KPI + 3 图表 + 5 待办 + 6 入口
2. `/merchant/product/list` · ElTable 选择 + 批量 + Tab + 搜索筛选
3. `/merchant/product/add` · 三段式表单 + 图片 CRUD + 按尺寸定价 + SKU 矩阵
4. `/merchant/product/category` · ElTree 拖拽 + 详情
5. `/merchant/product/agency` · 4 状态 Tab + 表格 + 5 个操作
6. `/merchant/order/list` · 6 状态 Tab + 抽屉详情 + 批量发货
7. `/merchant/order/aftersale` · 工单列表 + 详情 Drawer + 时间轴
8. `/merchant/customer` · 表格 + 3 层 Tab + 抽屉 + 标签
9. `/merchant/marketing` · 5 类活动卡片 + 任一类活动列表

## 2. 技术约束

| 项 | 值 |
|---|---|
| UI | Element Plus 2.11 + art-lnb 业务组件（Art*Card / Art*Chart）|
| 表格 | ElTable + 自研薄包装（pagination / selection / loading）|
| 详情 | ElDrawer 右抽屉 |
| 拖拽 | vue-draggable-plus（art-lnb 已带）|
| 图表 | ECharts 6 via Art*Chart 组件 |
| Mock | `@jiujiu/shared/mock/factory/*` + api/ 层 Promise 实现 |
| 图片 | mock 阶段 `URL.createObjectURL`，留 upload hook |
| 主题 | 沿用 `#FF4D2D`（已应用） |

## 3. 数据源映射

| 屏 | mock 工厂 |
|---|---|
| dashboard | `genMerchantDashboard` + `genMerchantStats('week')` |
| product/list | `genProducts(50)` |
| product/add | 提交后 `console.log` + push list（mock 不持久化）|
| product/category | `genMerchantCategories('m-001', 6)` + localStorage 持久化 |
| product/agency | localStorage `jiujiu_agency_applications` + `genProducts(8)` 兜底 |
| order/list | `genOrders(60)` |
| order/aftersale | `genRefund(orderId)` × 20 |
| customer | `genUsers(40, { role: 'customer' })` |
| marketing | 静态卡片 + 简单活动列表 mock |

## 4. 文件结构

```
packages/admin-pc/src/views/merchant/
├── dashboard/
│   ├── index.vue
│   └── modules/{KpiRow,TrendChart,TodoList,QuickEntries}.vue
├── product/
│   ├── list/{index.vue, modules/SearchBar.vue}
│   ├── add/{index.vue, modules/{BasicForm,SpecsBuilder,SkuMatrix,PricingMode,ImageManager}.vue}
│   ├── category/{index.vue, modules/{CategoryTree,CategoryDetail}.vue}
│   └── agency/{index.vue}
├── order/
│   ├── list/{index.vue, modules/{OrderDetailDrawer}.vue}
│   └── aftersale/{index.vue, modules/{AftersaleDetailDrawer}.vue}
├── customer/{index.vue, modules/CustomerDetailDrawer.vue}
└── marketing/{index.vue}
```

## 5. 不做

- 真后端
- 按钮级 RBAC
- 单元/E2E 测试
- WebSocket 实时
- 多门店
- 英文 i18n

## 6. 12 条 AC（同 ALIGNMENT §6，固化）
