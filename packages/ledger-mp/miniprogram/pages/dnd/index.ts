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

  save(patch: Record<string, any>, rollback: () => void) {
    settingApi.update(patch).catch(() => {
      // 失败回滚（request 层已 toast），避免页面与服务端不一致
      rollback()
    })
  },

  onToggle() {
    const prev = this.data.enabled
    this.setData({ enabled: !prev })
    this.save({ dndEnabled: !prev }, () => this.setData({ enabled: prev }))
  },
  onStart(e: any) {
    const prev = this.data.start
    this.setData({ start: e.detail.value })
    this.save({ dndStart: e.detail.value }, () => this.setData({ start: prev }))
  },
  onEnd(e: any) {
    const prev = this.data.end
    this.setData({ end: e.detail.value })
    this.save({ dndEnd: e.detail.value }, () => this.setData({ end: prev }))
  },
})
