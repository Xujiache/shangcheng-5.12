import { MotionPage, navigation } from '../../utils/page-transition'
import { settingApi } from '../../api/index'

interface ToggleItem {
  key: string
  settingKey: string
  iconSrc: string
  label: string
  sub: string
  on: boolean
}

const DEFS: ToggleItem[] = [
  {
    key: 'order',
    settingKey: 'notifyOrder',
    iconSrc: '/assets/settings/notification-order.png',
    label: '订单提醒',
    sub: '新订单保存与变更通知',
    on: true,
  },
  {
    key: 'report',
    settingKey: 'notifyReport',
    iconSrc: '/assets/settings/notification-report.png',
    label: '报表提醒',
    sub: '周报 / 月报生成提醒',
    on: true,
  },
  {
    key: 'goal',
    settingKey: 'notifyGoal',
    iconSrc: '/assets/profile/profile-goal.png',
    label: '目标提醒',
    sub: '经营目标进度与达成提醒',
    on: true,
  },
  {
    key: 'system',
    settingKey: 'notifySystem',
    iconSrc: '/assets/profile/profile-message.png',
    label: '系统通知',
    sub: '会员、安全与版本通知',
    on: false,
  },
]

MotionPage({
  data: {
    items: DEFS.map((it) => ({ ...it })),
  },

  onLoad() {
    this.load()
  },

  async load() {
    try {
      const s: any = await settingApi.get()
      this.setData({ items: DEFS.map((it) => ({ ...it, on: !!s[it.settingKey] })) })
    } catch (e) {
      /* 保留默认值 */
    }
  },

  async onToggle(e: any) {
    const key = e.currentTarget.dataset.key
    const cur = this.data.items.find((it) => it.key === key)
    if (!cur) return
    const prev = cur.on
    this.setData({
      items: this.data.items.map((it) => (it.key === key ? { ...it, on: !prev } : it)),
    })
    try {
      await settingApi.update({ [cur.settingKey]: !prev })
    } catch (e) {
      // 失败回滚到快照值（直接取反会在快速连点时与服务端错位）
      this.setData({
        items: this.data.items.map((it) => (it.key === key ? { ...it, on: prev } : it)),
      })
    }
  },

  toMsgCenter() {
    navigation.navigateTo({ url: '/pages/message-center/index' })
  },
  toDnd() {
    navigation.navigateTo({ url: '/pages/dnd/index' })
  },
})
