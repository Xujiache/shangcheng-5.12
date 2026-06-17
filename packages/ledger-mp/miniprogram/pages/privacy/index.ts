import { settingApi } from '../../api/index'
import { setBioLock, setHideAmount } from '../../utils/store'

interface ToggleItem {
  key: string
  settingKey: string
  icon: string
  label: string
  sub: string
  on: boolean
}

const DEFS: ToggleItem[] = [
  {
    key: 'hideAmount',
    settingKey: 'hideAmount',
    icon: 'eyeoff',
    label: '隐藏金额',
    sub: '列表中以星号隐藏敏感金额',
    on: false,
  },
  {
    key: 'bio',
    settingKey: 'bioLock',
    icon: 'finger',
    label: '生物解锁',
    sub: '打开应用时需指纹 / 面容验证',
    on: false,
  },
]

// 隐私与安全：隐私开关（隐藏金额 / 生物解锁）+ 账户安全 / 协议 / 注销账户 入口
Page({
  data: {
    items: DEFS.map((it) => ({ ...it })),
    links: [
      {
        icon: 'shield',
        label: '账户安全',
        sub: '修改密码 · 换绑手机',
        page: '/pages/account-security/index',
      },
      {
        icon: 'doc',
        label: '隐私政策',
        sub: '我们如何收集与保护你的信息',
        page: '/pages/doc/index?key=privacy',
      },
      {
        icon: 'doc',
        label: '用户协议',
        sub: '服务条款与使用约定',
        page: '/pages/doc/index?key=terms',
      },
      {
        icon: 'trash',
        label: '注销账户',
        sub: '永久删除账号与全部数据',
        page: '/pages/delete-account/index',
      },
    ],
  },

  onLoad() {
    this.load()
  },

  async load() {
    try {
      const s: any = await settingApi.get()
      this.setData({ items: DEFS.map((it) => ({ ...it, on: !!s[it.settingKey] })) })
      // 同步本地镜像（app 锁屏 / 金额掩码读本地，避免每次启动等接口）
      setHideAmount(!!s.hideAmount)
      setBioLock(!!s.bioLock)
    } catch (e) {
      /* 保留默认值 */
    }
  },

  /** 设备是否支持指纹 / 面容 */
  checkSoter(): Promise<boolean> {
    return new Promise((resolve) => {
      wx.checkIsSupportSoterAuthentication({
        success: (r) =>
          resolve((r.supportMode || []).some((m) => m === 'fingerPrint' || m === 'facial')),
        fail: () => resolve(false),
      })
    })
  },

  async onToggle(e: any) {
    const key = e.currentTarget.dataset.key
    const cur = this.data.items.find((it) => it.key === key)
    if (!cur) return
    const next = !cur.on
    if (key === 'bio' && next && !(await this.checkSoter())) {
      wx.showToast({ title: '当前设备不支持指纹/面容', icon: 'none' })
      return
    }
    this.setData({
      items: this.data.items.map((it) => (it.key === key ? { ...it, on: next } : it)),
    })
    try {
      await settingApi.update({ [cur.settingKey]: next })
      if (cur.settingKey === 'bioLock') setBioLock(next)
      if (cur.settingKey === 'hideAmount') setHideAmount(next)
    } catch (e) {
      this.setData({
        items: this.data.items.map((it) => (it.key === key ? { ...it, on: !next } : it)),
      })
    }
  },

  toLink(e: any) {
    wx.navigateTo({ url: e.currentTarget.dataset.page })
  },
})
