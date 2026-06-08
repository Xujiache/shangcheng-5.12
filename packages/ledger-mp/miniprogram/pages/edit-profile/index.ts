import { meApi } from '../../api/index'
import { getUser, setUser } from '../../utils/store'

const HUES = [
  { key: 'teal', grad: 'linear-gradient(140deg, #3ba58c 0%, #0e7c66 100%)' },
  { key: 'blue', grad: 'linear-gradient(140deg, #6fb7d2 0%, #4c9fbe 100%)' },
  { key: 'gold', grad: 'linear-gradient(140deg, #efc06a 0%, #dfa03a 100%)' },
  { key: 'rust', grad: 'linear-gradient(140deg, #e0917a 0%, #d2735a 100%)' },
  { key: 'olive', grad: 'linear-gradient(140deg, #a0bb84 0%, #84a06a 100%)' },
  { key: 'violet', grad: 'linear-gradient(140deg, #afa3cf 0%, #9488b8 100%)' },
]

function mask(phone: string): string {
  if (!phone || phone.length < 7) return phone || '—'
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

Page({
  data: {
    nickname: '',
    initial: '账',
    maskedPhone: '—',
    hues: HUES,
    hueKey: 'teal',
    hue: HUES[0],
    canSave: false,
    saving: false,
  },

  _origNickname: '',
  _origHue: 'teal',

  onLoad() {
    const u = getUser()
    const nickname = (u && u.nickname) || ''
    this._origNickname = nickname
    // avatar 字段持久化所选头像色（hue key）；非 hue 值则回退默认
    const stored = u && u.avatar ? u.avatar : ''
    const hueKey = HUES.some((h) => h.key === stored) ? stored : 'teal'
    this._origHue = hueKey
    const hue = HUES.find((h) => h.key === hueKey) || HUES[0]
    this.setData({
      nickname,
      maskedPhone: mask(u ? u.phone : ''),
      initial: this.firstChar(nickname),
      hueKey,
      hue,
    })
    this.refreshCanSave()
  },

  firstChar(s: string): string {
    const t = (s || '').trim()
    return t ? t.charAt(0).toUpperCase() : '账'
  },

  refreshCanSave() {
    const trimmed = this.data.nickname.trim()
    const changed = trimmed !== this._origNickname.trim() || this.data.hueKey !== this._origHue
    this.setData({ canSave: trimmed.length > 0 && changed })
  },

  onNickname(e: any) {
    const nickname = String(e.detail.value).slice(0, 20)
    this.setData({ nickname, initial: this.firstChar(nickname) }, () => this.refreshCanSave())
  },

  onHue(e: any) {
    const key = e.currentTarget.dataset.key
    const hue = HUES.find((h) => h.key === key) || HUES[0]
    this.setData({ hueKey: key, hue }, () => this.refreshCanSave())
  },

  async onSave() {
    const nickname = this.data.nickname.trim()
    if (!nickname || this.data.saving) return
    this.setData({ saving: true })
    try {
      await meApi.updateProfile({ nickname, avatar: this.data.hueKey })
      const u = getUser()
      if (u) {
        u.nickname = nickname
        u.avatar = this.data.hueKey
        setUser(u)
      }
      wx.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 600)
    } catch (e) {
      /* toast handled in request */
    } finally {
      this.setData({ saving: false })
    }
  },
})
