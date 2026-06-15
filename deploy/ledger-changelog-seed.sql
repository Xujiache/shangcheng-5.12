-- 门窗利账 · 更新日志初始内容（1.0.1 ~ 1.0.2）
-- 部署：生产库执行一次（依赖 ledger-changelog-init.sql 已建表）。可重复执行（按 version 幂等覆盖）。

INSERT INTO "LedgerChangelog" ("id","version","title","content","published","createdAt","updatedAt")
VALUES (
  'clog_1_0_1',
  '1.0.1',
  '正式上线',
  E'· 门窗订单记账：客户、报价明细、定金/收款一键记录\n· 成本利润自动核算：营收、成本、利润、利润率一目了然\n· 经营报表：日/月/年趋势、成本构成、高利润订单\n· 型材优化下料：一维切割排版，省料省成本\n· 会员与邀请：套餐开通、邀请好友得会员\n· 账户安全：验证码/密码登录、生物解锁、隐私设置',
  true, now(), now()
)
ON CONFLICT ("version") DO UPDATE
  SET "title" = EXCLUDED."title", "content" = EXCLUDED."content", "updatedAt" = now();

INSERT INTO "LedgerChangelog" ("id","version","title","content","published","createdAt","updatedAt")
VALUES (
  'clog_1_0_2',
  '1.0.2',
  '沉浸光感大版本',
  E'· 全新「沉浸光感」界面：磨砂质感、发光描边、3D 悬浮与流体流光\n· 首页重构：经营概览一屏掌握，信息更聚合有层次\n· 报表各月明细可折叠，快速定位当月\n· 优化下料结果独立成页，操作更清爽\n· 分享带品牌封面图，邀请页焕新\n· 意见反馈支持上传图片\n· 图标全面升级，更具立体层次感\n· 设置新增「特效模式」：普通/性能自由切换\n· 所有选择条支持按住拖动，切换更丝滑\n· 新增数据加密导出与导入，备份更安心\n· 一批安全与稳定性优化',
  true, now(), now()
)
ON CONFLICT ("version") DO UPDATE
  SET "title" = EXCLUDED."title", "content" = EXCLUDED."content", "updatedAt" = now();
