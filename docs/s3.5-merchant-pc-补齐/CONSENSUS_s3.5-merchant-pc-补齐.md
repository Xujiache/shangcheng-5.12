# CONSENSUS · S3.5 商家 PC 补齐

> 用户答 Q1–Q5 全 OK。

## 必做

1. 9 屏 view 文件
2. 9 条新路由（嵌套到 7 个父分组）
3. 18 个 i18n key（zh/en 都补）
4. api/merchant-business.ts 追加 9~12 个 mock 接口
5. AC 12 条全过

## 技术约束

| 项 | 值 |
|---|---|
| UI | Element Plus + art-lnb |
| 数据 | `@jiujiu/shared/mock/factory`（genWithdraw / genCommission / genMemberPlans / genPromoteSummary）+ 自造 store/staff/decorate/chat |
| 表格 | ElTable + selection + pagination |
| Drawer | 右抽屉 480-540 |
| 三栏 | chat / decorate 用 360 + 1fr + 320 |
| 持久化 | commission / decorate / member 当前态写 localStorage |
| 主题 | #FF4D2D（已应用）|

## 字段对齐

| Shared 类型 | 字段口径 |
|---|---|
| `CommissionRule` | level1Percent / level2Percent / visibleToPromoter / allowOffline / enabled |
| `Withdraw` | no / applyAmount / actualAmount / method / account / status (pending/approved/rejected/paid/failed) |
| `MemberPlan` | type / name / price / period / periodCount / rights / hot / trialDays / status |

## 不做

- 真后端
- 真聊天 / 真支付
- 真拖拽装修
- 测试

## AC 同 ALIGNMENT §5
