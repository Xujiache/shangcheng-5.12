import { settingApi } from '../../api/index'

Page({
  data: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },

  onLoad() {
    this.load()
  },

  async load() {
    try {
      const s: any = await settingApi.get()
      this.setData({
        enabled: !!s.dndEnabled,
        start: s.dndStart || '22:00',
        end: s.dndEnd || '08:00',
      })
    } catch (e) {
      /* 保留默认值 */
    }
  },

  save(patch: Record<string, any>) {
    settingApi.update(patch).catch(() => {
      /* toast handled in request */
    })
  },

  onToggle() {
    const enabled = !this.data.enabled
    this.setData({ enabled })
    this.save({ dndEnabled: enabled })
  },
  onStart(e: any) {
    this.setData({ start: e.detail.value })
    this.save({ dndStart: e.detail.value })
  },
  onEnd(e: any) {
    this.setData({ end: e.detail.value })
    this.save({ dndEnd: e.detail.value })
  },
})
