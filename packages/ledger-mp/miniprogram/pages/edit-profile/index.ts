import { meApi } from '../../api/index'
import { API_BASE } from '../../config'
import { getUser, setUser, getToken } from '../../utils/store'

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
    avatarUrl: '', // 上传的头像图片公网 URL；有则优先显示图片
    uploading: false,
    canSave: false,
    saving: false,
  },

  _origNickname: '',
  _origHue: 'teal',
  _origAvatarUrl: '',

  onLoad() {
    const u = getUser()
    const nickname = (u && u.nickname) || ''
    this._origNickname = nickname
    // avatar 字段：http(s) 开头=上传的图片 URL；否则当作头像底色 hue key
    const stored = u && u.avatar ? u.avatar : ''
    const isImg = /^https?:\/\//.test(stored)
    const hueKey = !isImg && HUES.some((h) => h.key === stored) ? stored : 'teal'
    this._origHue = hueKey
    this._origAvatarUrl = isImg ? stored : ''
    const hue = HUES.find((h) => h.key === hueKey) || HUES[0]
    this.setData({
      nickname,
      maskedPhone: mask(u ? u.phone : ''),
      initial: this.firstChar(nickname),
      hueKey,
      hue,
      avatarUrl: isImg ? stored : '',
    })
    this.refreshCanSave()
  },

  firstChar(s: string): string {
    const t = (s || '').trim()
    return t ? t.charAt(0).toUpperCase() : '账'
  },

  refreshCanSave() {
    const trimmed = this.data.nickname.trim()
    const changed =
      trimmed !== this._origNickname.trim() ||
      this.data.hueKey !== this._origHue ||
      this.data.avatarUrl !== this._origAvatarUrl
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

  // 选图 → 上传到对象存储 → 立即持久化(后端已存 avatar=url) + 更新本地缓存
  onChangeAvatar() {
    if (this.data.uploading) return
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const fp = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath
        if (!fp) return
        this.setData({ uploading: true })
        wx.uploadFile({
          url: API_BASE + '/api/v1/l/avatar',
          filePath: fp,
          name: 'file',
          header: { Authorization: 'Bearer ' + getToken() },
          success: (up) => {
            try {
              const body = JSON.parse(up.data)
              if (body && body.code === 0 && body.data && body.data.url) {
                const url = body.data.url
                this.setData({ avatarUrl: url })
                const u = getUser()
                if (u) {
                  u.avatar = url
                  setUser(u)
                }
                wx.showToast({ title: '头像已更新', icon: 'success' })
              } else {
                const msg = body && body.message
                wx.showToast({
                  title: (Array.isArray(msg) ? msg[0] : msg) || '上传失败',
                  icon: 'none',
                })
              }
            } catch (e) {
              wx.showToast({ title: '上传失败', icon: 'none' })
            }
          },
          fail: () => wx.showToast({ title: '上传失败', icon: 'none' }),
          complete: () => this.setData({ uploading: false }),
        })
      },
    })
  },

  // 改回字母头像（移除已上传图片，下次保存生效）
  onUseLetter() {
    this.setData({ avatarUrl: '' }, () => this.refreshCanSave())
  },

  toWechat() {
    wx.navigateTo({ url: '/pages/wechat-bind/index' })
  },

  async onSave() {
    const nickname = this.data.nickname.trim()
    if (!nickname || this.data.saving) return
    this.setData({ saving: true })
    try {
      // 有上传图片则存 URL，否则存所选底色 hue key
      const avatar = this.data.avatarUrl || this.data.hueKey
      await meApi.updateProfile({ nickname, avatar })
      const u = getUser()
      if (u) {
        u.nickname = nickname
        u.avatar = avatar
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
