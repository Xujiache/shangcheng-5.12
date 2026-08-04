// ----------------------------------------------------------------------------
// Jest 配置（Wave3 占位版）
//
// 当前 test/ 下全部用例为 describe.skip / it.todo 占位模板，
// 用于在 CI 中跑通"jest 能找到测试 + 不报错"链路，避免阻塞主流程；
// 实测用例补全后保留同一份配置即可（无需切 preset）。
//
// 关键选择：
//   - preset: 'ts-jest'        TS 直接跑，无需先 build
//   - testEnvironment: 'node'  NestJS 后端无浏览器环境
//   - testRegex                只认 test/**/*.spec.ts，避免误抓 src 同名文件
//   - collectCoverageFrom      仅统计业务源码覆盖率
// ----------------------------------------------------------------------------
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: 'test/.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts'],
}
