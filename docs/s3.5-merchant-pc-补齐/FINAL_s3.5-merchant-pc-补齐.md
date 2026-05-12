# FINAL · S3.5 商家 PC 补齐

> 6A 阶段 6 收尾。

## 一句话

把 admin-pc 商家工作台从 9 屏扩到 **18 屏**，覆盖 merchant-app 移动端的全部业务功能。

## 验证

```
http://localhost:5173 → merchant@demo / 123456
```

侧边菜单从 9 项 → **18 项**：

| 旧 9 项 | 新增 9 项 |
|---|---|
| 数据概览 | 数据中心 |
| 在售商品 | 选品广场 |
| 添加商品 | 在线客服 |
| 分类管理 | 门店管理 |
| 代理商品 | 员工管理 |
| 订单管理 | 店铺装修 |
| 售后处理 | 佣金设置 |
| 客户管理 | 提现处理 |
| 营销中心 | 会员开通 |

## 代码地图

```
packages/admin-pc/src/
├── api/merchant-business.ts            [+~12 mock 接口 ≈ 380 行]
├── router/modules/merchant.ts          [+9 路由]
├── locales/langs/{zh,en}.json          [+9 i18n keys]
└── views/merchant/
    ├── stats/index.vue                 ~210 行
    ├── plaza/index.vue                 ~440 行（含厂家 Drawer）
    ├── store/index.vue                 ~310 行
    ├── staff/index.vue                 ~300 行
    ├── decorate/index.vue              ~520 行（三栏 + CSS 手机壳）
    ├── chat/index.vue                  ~430 行（IM 三栏）
    ├── commission/index.vue            ~330 行
    ├── withdraw/index.vue              ~340 行
    └── member/index.vue                ~420 行（3 套餐 + 增值包）
```

合计 ≈ **3700 行** 新增。

## 关键技术点

| 点 | 实现 |
|---|---|
| 网格商品卡 | grid auto-fill minmax(220px, 1fr)，hover 抬升 |
| 厂家 Drawer | fetchFactoryDetail(factoryId) 取主营商品 + 资质 |
| 三栏布局（decorate/chat） | grid-template-columns 320 + 1fr + 280/300 |
| 手机壳预览 | CSS 12px border + 38px border-radius + 内部 phone-body 滚动 |
| IM 消息流 | self class 翻转布局 + 自动 scrollToBottom |
| 步进调整 | 0.5% 间隔 + 30% 警告条 |
| 余额 Hero | linear-gradient + 白色透明按钮 |
| 套餐对比 | 3 卡 grid + HOT 卡 transform: translateY(-6px) + 阴影 |

## 决策回顾

ALIGNMENT D1-D14 全部按默认落地：包名 / 路由前缀 / 不拆 modules / API 单文件 / 主题 #FF4D2D / localStorage 持久化 / Drawer / 三栏 / 非真拖拽 / 单卡录入 / 3 套餐 / 一批做完。

## 范围对照

✅ 必做 11 项全做（9 屏 + 路由 + i18n + api + smoke）
❌ 不做 7 项遵守（真后端 / WebSocket / 真拖拽 / 真支付 / 测试 / 英文业务文案 / 真聊天）

## 文档

7 份齐全：ALIGNMENT / CONSENSUS / DESIGN / TASK / ACCEPTANCE / FINAL / TODO。
