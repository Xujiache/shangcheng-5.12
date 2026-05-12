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
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use '@shared/tokens/tokens.scss' as *;`,
      },
    },
  },
  server: {
    port: 8081,
    host: '0.0.0.0',
  },
})
