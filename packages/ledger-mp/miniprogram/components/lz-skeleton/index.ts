import { pageMotionEnabled } from '../../utils/page-transition'
Component({
  properties: {
    variant: { type: String, value: 'list' },
    label: { type: String, value: '正在加载' },
  },
  data: { moving: false, rows: [0, 1, 2] },
  lifetimes: {
    attached() {
      this.syncMotion()
    },
  },
  pageLifetimes: {
    show() {
      this.syncMotion()
    },
    hide() {
      if (this.data.moving) this.setData({ moving: false })
    },
  },
  methods: {
    syncMotion() {
      const moving = pageMotionEnabled()
      if (this.data.moving !== moving) this.setData({ moving })
    },
  },
})
