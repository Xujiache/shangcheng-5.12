// ----------------------------------------------------------------------------
// Jest 集成测试配置（与单测 jest.config.js 分离）
//
//   - 只匹配 test-integration/**/*.it.spec.ts，与单测 test/**/*.spec.ts 互不干扰
//   - globalSetup 做安全校验：DATABASE_URL 必须存在且指向 localhost/127.0.0.1，
//     防止集成测试误连远程 / 生产库
//   - 运行方式见 test-integration/README.md（需 --runInBand，避免并发互踩数据）
// ----------------------------------------------------------------------------
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  // [\\/] 兼容 Windows 反斜杠路径分隔符
  testRegex: 'test-integration[\\\\/].*\\.it\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  globalSetup: '<rootDir>/test-integration/global-setup.ts',
}
