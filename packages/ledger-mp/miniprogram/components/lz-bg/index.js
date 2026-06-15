// 全局动态背景层（样式驱动）。默认常驻流动动效；
// 性能模式(store.getPerf)下冻结动画(lz-bg--still)，老旧手机不再持续合成全屏模糊。
// 用 .js 免编译：微信开发者工具不会即时编译会话中新增的 .ts 组件。
const store = require('../../utils/store')
Component({
  data: { still: false },
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
        const still = !!(store.getPerf && store.getPerf())
        if (still !== this.data.still) this.setData({ still: still })
      } catch (e) {
        /* 忽略 */
      }
    },
  },
})
