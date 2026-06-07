Component({
  properties: {
    title: { type: String, value: '' },
    subtitle: { type: String, value: '' },
    back: { type: Boolean, value: true },
    large: { type: Boolean, value: false },
  },
  methods: {
    onBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        wx.navigateBack()
      } else {
        wx.reLaunch({ url: '/pages/home/index' })
      }
    },
  },
})
