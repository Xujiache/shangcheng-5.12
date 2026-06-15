// 全局动态背景层（样式驱动）。两种模式都常驻流动；性能模式(max)更鲜亮(lz-bg--max)。
// 用 .js 免编译：微信开发者工具不会即时编译会话中新增的 .ts 组件。
const store = require('../../utils/store')
Component({
  data: { max: false },
  lifetimes: {
    attached() {
      this.sync()
    },
  },
  pageLifetimes: {
    show() {
      this.sync()
    },
  },
  methods: {
    sync() {
      try {
        const max = (store.getFxMode && store.getFxMode()) === 'max'
        if (max !== this.data.max) this.setData({ max: max })
      } catch (e) {
        /* 忽略 */
      }
    },
  },
})
