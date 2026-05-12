# DESIGN · S3.5 商家 PC 补齐

> 6A 阶段 2

## 1. 路由树（重组后）

```
/merchant
├── /merchant/dashboard          [现存]
├── /merchant/stats              [新]
├── /merchant/product
│   ├── list, add, category, agency  [现存]
│   └── plaza                    [新, 含 Drawer]
├── /merchant/order
│   ├── list, aftersale          [现存]
├── /merchant/customer           [现存]
├── /merchant/chat               [新]
├── /merchant/marketing          [现存]
├── /merchant/store              [新]
├── /merchant/staff              [新]
├── /merchant/decorate           [新]
├── /merchant/commission         [新]
├── /merchant/withdraw           [新]
└── /merchant/member             [新]
```

由于 merchant-app 没用嵌套 children 分组（路由都是平铺，仅菜单显示分组），改造方案：

**保持现有路由扁平**（不嵌套 children 重构），改用 **meta.group** 字段标识分组，让 MenuProcessor 渲染时按 group 聚合。

或者**最小侵入**：直接为新路由加上 `meta.group`，UI 渲染由 art-lnb 的菜单组件根据 group 自动分组——但 art-lnb 默认按 children 嵌套。

**选定方案**：维持扁平 + meta.group 字段。art-lnb 不支持自动按 group 分组的话，菜单依然扁平 18 项。如果用户对 18 项平铺不满，再做 children 嵌套重构。

实施时**先按扁平 18 项**做，验收时再决定是否要嵌套。

## 2. 9 屏布局

### stats 数据中心
```
[周期选择: 今日 / 本周 / 本月 / 本年]   [导出]
[KPI × 4]
[销售趋势折线 全宽]
[Top10 商品横条 (1/2)] [类目占比环 (1/2)]
[新老客户柱状 (1/2)] [小时分布柱状 (1/2)]
```

### plaza 选品广场
```
[Tab: 推荐 / 分类 / 搜索]
[商品卡网格 5 列]
[卡内: 图 + 名 + 出厂价 + 加价率 + 已申请徽章 + 申请按钮]

→ 点商品/厂家名 → 右侧 540 Drawer:
  [厂家头像 + 名 + 评分]
  [Tab: 主营商品 / 资质 / 评价]
  [商品列表]
  [申请代理 CTA]
```

### store 门店
```
[Tab: 我的门店 / 授权管理]
门店列表 Tab:
  [+ 新建门店]
  [ElTable: 门店名 / 地址 / 联系人 / 状态 / 操作]
  [Drawer: 编辑表单]
授权管理 Tab:
  [ElTable: 员工 / 关联门店 / 角色 / 授权时间 / 操作]
```

### staff 员工
```
[Tab: 全部 / 店长 / 收银 / 导购 / 离职]
[+ 添加员工]
[ElTable: 头像+名 / 手机 / 角色 / 门店 / 业绩 / 状态 / 操作]
[Drawer: 添加/编辑表单]
```

### decorate 店铺装修
```
三栏:
  左 340: 模板选择 + 模块列表（开关 + 上下排序）
  中 1fr:  手机壳 375×667 实时预览
  右 320: 当前选中模块的属性配置
```

### chat 在线客服
```
三栏:
  左 320: 会话列表（搜索 + 客户头像 + 最后消息 + 未读徽章）
  中 1fr: 消息流 + 输入框 + 快捷回复
  右 280: 客户档案（基本信息 + 历史订单 + 标签）
```
1100 以下隐藏右栏。

### commission 佣金
```
[卡片: 总开关 + 一级佣金 + 二级佣金 + 适用 + 可见性 + 线下结算]
[ElTable: 商品自定义佣金（商品 / 一级 / 二级 / 操作）]
[新增/编辑 Drawer]
```

### withdraw 提现
```
[Hero 卡: 可提现余额 ¥X / 累计提现 ¥X / 待结算 ¥X / [申请提现]]
[Tab: 全部 / 待审核 / 已通过 / 已驳回 / 已打款]
[ElTable: 单号 / 金额 / 方式 / 状态 / 时间 / 操作]
[Drawer: 申请表单 (金额 + 银行卡 + 备注)]
```

### member 会员开通
```
[当前套餐进度条: 旗舰版 · 剩 280 天]
[3 套餐卡片对比: 基础 / 标准 / 旗舰]
  - 价格 / 周期 / 权益列表 / 当前 / 升级
[增值包列表 (4 个)]
```

## 3. 数据流

```
view --> api/merchant-business.ts --> @jiujiu/shared/mock/factory
                                  OR
                                  自造 mock（store/staff/decorate/chat）
```

## 4. 关键算法

| 屏 | 算法 |
|---|---|
| stats | 复用 fetchMerchantDashboard(period) |
| plaza | shared 已有 genPlazaCard / genPlazaPush |
| commission | level1+level2 求和不能超过 50%，UI 实时校验 |
| withdraw | 提现金额 ≤ 可提余额 |
| decorate | 模块顺序用 splice 操作；模板切换 = 加载预设 modules 数组 |
| chat | 发送消息追加到当前会话 messages 数组 + 自动滚到底 |

## 5. 异常处理

| 场景 | 处理 |
|---|---|
| 提现金额 > 余额 | ElForm rules 校验 + 红框 |
| 删门店时还有员工绑定 | ElMessageBox 二次确认 |
| chat 输入空消息 | 禁用发送按钮 |
| decorate 删最后一个模块 | 至少保留 1 个 |
