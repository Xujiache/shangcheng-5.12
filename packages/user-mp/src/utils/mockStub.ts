/**
 * mp-weixin 生产构建专用 mock stub
 *
 * uni-app 的 mp 编译器不拆 dynamic import，会把 @jiujiu/shared/mock（含 @faker-js/faker ~1MB+
 * 中文 locale 数据）整个塞进主包，撑爆 2MB 限制。
 *
 * 通过 vite.config.ts 的 alias 在 NODE_ENV=production && UNI_PLATFORM=mp-weixin 时
 * 把整个模块替换成这里的空实现。运行时若误调 mockMatch（应该不会，因为 USE_MOCK 被
 * 锁成 false）会显式抛错，便于在 console 立刻发现配置错乱。
 */

export const mockRoutes: any[] = []

export function registerMockRoutes(_routes?: any[]): void {
  // no-op
}

export function mockMatch<T>(_req: { method: string; url: string; data?: unknown }): Promise<T> {
  throw new Error(
    '[mock-stub] mock 模块在生产构建已被 stub，不应被调用。检查 VITE_USE_MOCK 配置。',
  )
}
