# 全仓库优化实施与验收

基线：`461c097cb90ebbd77b8cdc91339343fa23a74fa6`。范围：七个 workspace 包和原生鸿蒙商家端。执行原则为保留业务、渐进重构、小规模稳定上线、真实上线验收。

**本目录是实施台账，不是全量完成证明。** 各端真机、第三方联调、容器启动、容灾和压力测试尚不能以本地单元测试替代。

## 文档与证据

- `ALIGNMENT.md`：范围、兼容边界与技术决策。
- `TASK.md`：按原方案分组的实施状态与剩余工作。
- `ACCEPTANCE.md`：实际验证结果及复测入口。
- `RUNBOOK.md`：数据库升级、测试环境、部署和恢复约束。
- `inventory.json`：自动提取的页面/视图与 Controller 端点清单；每项仍需运行时核对。
- `harmony-gap.json`：鸿蒙后端前置缺口，不连接正式服务。
- `acceptance.json`：真机、第三方与运维验收登记；缺证据必须阻止发布。

## 常用入口

1. `pnpm quality:check`：公共构建、契约、格式、lint、类型和记工镜像一致性。
2. `pnpm test:unit`：七个包的真实测试与门禁/迁移执行器测试。
3. `pnpm test:integration`：显式一次性 PostgreSQL/Redis 测试环境；未配置直接失败。
4. `pnpm build:verify`：后端、PC、已声明 uni-app 目标及微信原生模板编译。不代替安装包/真机验收。
5. `pnpm quality:inventory`：重新生成源码清单。
6. `pnpm release:check`：核对当前源码指纹、提交、日志校验和和外部验收，失败时列出阻塞；不会发布。
7. `node scripts/quality/harmony-backend.mjs`：只检查本仓库鸿蒙后端验证前置条件。

自动运行日志位于忽略提交的 `.quality/<mode>/`。代码变更期间运行的测试会记录 `source-changed`，必须冻结代码后重跑，不能沿用旧绿灯。

发布登记只允许填写真实执行者、环境和证据；不得手工补“通过”以绕过缺失的设备与第三方配置。
