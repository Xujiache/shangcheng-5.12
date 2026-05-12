import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import path from 'node:path'

export default defineConfig({
  plugins: [uni()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, '../shared/src'),
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
