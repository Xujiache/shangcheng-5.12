import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import path from 'node:path'

// mp-weixin 主包 2MB 限制：生产构建里 stub 掉 @jiujiu/shared/mock
// (内含 @faker-js/faker ~1MB 中文 locale 数据，uni-app 不拆 dynamic import chunk)
const IS_PROD_MP_WEIXIN =
  process.env.NODE_ENV === 'production' && process.env.UNI_PLATFORM === 'mp-weixin'

export default defineConfig({
  plugins: [uni()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, '../shared/src'),
      debug: path.resolve(__dirname, 'src/utils/debugShim.ts'),
      nanoid: path.resolve(__dirname, 'src/utils/nanoidShim.ts'),
      ...(IS_PROD_MP_WEIXIN
        ? { '@jiujiu/shared/mock': path.resolve(__dirname, 'src/utils/mockStub.ts') }
        : {}),
    },
  },
  // SCSS tokens 由 src/uni.scss 全局注入（uni-app 自动加载），不要在这里再注一遍，
  // 否则 SCSS 模块系统会把同一文件当成两个模块，触发 "available from multiple global modules"
  css: {},
  // mp-weixin 开发者工具的内置转译器对 ?. / ?? / 私有字段等 ES2020+ 语法支持不稳定，
  // 在 Vite 这一步就降到 es2015，所有现代语法都转译掉，dev tools 收到纯 ES5/2015。
  build: {
    target: 'es2015',
  },
  server: {
    port: 8081,
    host: '0.0.0.0',
  },
})
