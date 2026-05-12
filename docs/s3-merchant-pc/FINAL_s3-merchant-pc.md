# FINAL · S3 商家 PC 业务实施

> 6A 阶段 6 收尾。

---

## 一句话总结

把 admin-pc 的 9 屏商家 placeholder 变成完整桌面级业务页面：表格 + Drawer + 多列 Dashboard + 拖拽分类 + 商品三段式表单 + 营销卡片网格。

## 你能验证

```bash
pnpm dev:admin-pc   # 5173
```

登录 `merchant@demo / 123456` → 落地商家工作台 → 依次点 9 条菜单：

| 菜单 | 你会看到 |
|---|---|
| 数据概览 | 4 KPI（销售/订单/新客/在售）+ 销售趋势折线 + 类目环形 + Top10 横条 + 5 待办 + 6 快捷 |
| 在售商品 | 50 条 mock 商品 · 6 Tab · 多选 · 批量上下架/删除 · 搜索 · 导出 |
| 添加商品 | 三段卡片：基础信息（含 9 张图片 CRUD）→ 规格 SKU（笛卡尔积矩阵 + 批量填）→ 价格（标准 OR 按尺寸） |
| 分类管理 | 6 个分类树，可拖拽 / 加子分类 / 重命名 / 删除，右侧详情面板 |
| 代理商品 | 8 条申请 · 4 状态 Tab · 操作随状态变化（取消/调整加价/下架/重新上架）|
| 订单管理 | 60 条订单 · 7 状态 Tab · 批量发货 · 详情抽屉（金额明细 + 收货 + 物流）|
| 售后处理 | 20 单 · 6 状态 Tab · 同意/拒绝带处理意见 · 时间轴抽屉 |
| 客户管理 | 40 客户 · 4 层 Tab · VIP 徽标 · 黑名单切换 · 消费统计 + 标签抽屉 |
| 营销中心 | 5 类活动卡片入口（优惠券/满减/拼团/秒杀/分销）· 5 个 mock 活动 · 启用/暂停 |

## 代码地图

```
packages/admin-pc/src/
├── api/merchant-business.ts                 [+] 380 行 · 9 mock 接口
└── views/merchant/
    ├── dashboard/index.vue                  [✏] 400 行
    ├── product/
    │   ├── list/index.vue                   [✏] 470 行
    │   ├── add/index.vue                    [✏] 690 行（最复杂屏）
    │   ├── category/index.vue               [✏] 290 行
    │   └── agency/index.vue                 [✏] 320 行
    ├── order/
    │   ├── list/index.vue                   [✏] 470 行
    │   └── aftersale/index.vue              [✏] 360 行
    ├── customer/index.vue                   [✏] 410 行
    └── marketing/index.vue                  [✏] 460 行
```

合计 1 个新 api + 9 屏被重写 ≈ 4250 行 Vue/TS。

## 关键技术点

| 点 | 实现 |
|---|---|
| 桌面表格 | ElTable + selection + sortable + fixed='right' + min-width |
| 详情交互 | ElDrawer + ElDescriptions + ElTimeline，不嵌套 |
| 商品图片 CRUD | URL.createObjectURL · 9 张上限 · 编号 badge · 主图标识 · 上下移 |
| SKU 笛卡尔积 | rebuildSku() 用 reduce 累积组合，老 SKU 通过 Map 保留价格库存 |
| 按尺寸定价 | pricingMode 切换 + 实时公式预览 |
| 分类拖拽 | ElTree draggable + onDrop 触发 dirty + saveOrder 写 localStorage |
| 批量操作 | selection-change + 横幅展示选中数 + 二次确认 |
| 数据派生 | User 无会员字段，用 id 末位哈希派生 VIP / 标签 / 消费统计 |

## 决策回顾（D1–D12 全部落地）

ALIGNMENT 第 5 节 12 项决策实施零偏差。

## 文档

- ALIGNMENT_s3-merchant-pc.md
- CONSENSUS_s3-merchant-pc.md
- DESIGN_s3-merchant-pc.md
- TASK_s3-merchant-pc.md
- ACCEPTANCE_s3-merchant-pc.md
- FINAL_s3-merchant-pc.md
- TODO_s3-merchant-pc.md

## 范围对照

| 必做 9 项 | 状态 |
|---|---|
| dashboard | ✅ |
| product/list | ✅ |
| product/add | ✅ |
| product/category | ✅ |
| product/agency | ✅ |
| order/list | ✅ |
| order/aftersale | ✅ |
| customer | ✅ |
| marketing | ✅ |

| 不做 6 项 | 状态 |
|---|---|
| 真后端 | 未做 ✅ |
| SSO/OAuth | 未做 ✅ |
| 按钮级 RBAC | 未做 ✅ |
| 单元/E2E 测试 | 未做 ✅ |
| WebSocket 实时 | 未做 ✅ |
| 英文 i18n | 未做 ✅ |
