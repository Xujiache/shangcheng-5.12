import { pageMotionEnabled } from '../../utils/page-transition'

Component({
  properties: { busy: Boolean, slow: Boolean, top: { type: Number, value: 72 } },
  data: { moving: false },
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
