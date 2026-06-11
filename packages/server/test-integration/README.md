# 集成测试（test-integration）

与 `test/` 下的单元测试分离，直连真实 Postgres 验证数据层行为。
用例命名约定：`*.it.spec.ts`（由 `jest.integration.config.js` 匹配）。

## 本地运行

1. 准备一个**一次性**本地 Postgres（如 Docker），并设置环境变量（PowerShell 示例）：

   ```powershell
   $env:DATABASE_URL = "postgresql://test:test@localhost:5440/qa?schema=public"
   ```

2. 推送 schema 建表（不重新生成 client）：

   ```powershell
   pnpm --filter @jiujiu/server db:push:test
   ```

3. 运行集成测试（串行执行，避免互踩数据）：

   ```powershell
   pnpm --filter @jiujiu/server test:integration
   ```

## 安全须知

- **严禁**把 `DATABASE_URL` 指向生产或任何远程数据库——集成测试会 TRUNCATE 数据表。
- `global-setup.ts` 会硬性校验 host 必须为 `localhost` / `127.0.0.1`，否则直接报错退出。
- 工具函数（建 client、清库、夹具）见 `helpers/db.ts`。
