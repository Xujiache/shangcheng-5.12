import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': path.resolve('src'), '@imgs': path.resolve('src/assets/images') } },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    restoreMocks: true,
    clearMocks: true,
    maxWorkers: 2,
    passWithNoTests: false,
  },
})
