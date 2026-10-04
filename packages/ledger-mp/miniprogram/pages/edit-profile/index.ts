import { MotionPage, navigation } from '../../utils/page-transition'
import { meApi } from '../../api/index'
import { avatarImageSrc, isAvatarImage, ledgerAvatarLetter } from '../../config'
import { getUser, setUser } from '../../utils/store'

const HUES: Array<{ key: string; grad: string }> = [
  { key: 'teal', grad: 'linear-gradient(140deg, #3ba58c 0%, #0e7c66 100%)' },
  { key: 'blue', grad: 'linear-gradient(140deg, #6fb7d2 0%, #4c9fbe 100%)' },
  { key: 'gold', grad: 'linear-gradient(140deg, #efc06a 0%, #dfa03a 100%)' },
  { key: 'rust', grad: 'linear-gradient(140deg, #e0917a 0%, #d2735a 100%)' },
  { key: 'olive', grad: 'linear-gradient(140deg, #a0bb84 0%, #84a06a 100%)' },
  { key: 'violet', grad: 'linear-gradient(140deg, #afa3cf 0%, #9488b8 100%)' },
]

MotionPage({
  data: {
    nickname: '',
    initial: '账',
    hues: HUES,
    hueKey: 'teal',
    hue: HUES[0],
    avatarMode: 'letter' as 'letter' | 'image',
    avatarUrl: '',
    avatarSrc: '',
    draftImagePath: '',
    avatarFailed: false,
    cropVisible: false,
    canSave: false,
    saving: false,
  },
  _origNickname: '',
  _origHue: 'teal',
  _origAvatarUrl: '',

  onLoad() {
    const u: any = getUser() || {}
    const nickname = String(u.nickname || '')
    const stored = typeof u.avatar === 'string' ? u.avatar : ''
    const isImg = isAvatarImage(stored)
    const hueKey = !isImg && HUES.some((h) => h.key === stored) ? stored : 'teal'
    const hue = HUES.find((h) => h.key === hueKey) || HUES[0]
    this._origNickname = nickname
    this._origHue = hueKey
    this._origAvatarUrl = isImg ? stored : ''
    this.setData({
      nickname,
      initial: this.firstChar(nickname),
      hueKey,
      hue,
      avatarMode: isImg ? 'image' : 'letter',
      avatarUrl: isImg ? stored : '',
      avatarSrc: isImg ? avatarImageSrc(stored) : '',
      avatarFailed: false,
      draftImagePath: '',
    }, () => this.refreshCanSave())
  },

  firstChar(s: string): string {
    return ledgerAvatarLetter(s)
  },

  refreshCanSave() {
    const nickname = this.data.nickname.trim()
    const imageChanged = this.data.avatarMode === 'image' && !!this.data.draftImagePath
    const avatarChanged = this.data.avatarMode === 'image'
      ? imageChanged || !this._origAvatarUrl
      : !!this._origAvatarUrl || this.data.hueKey !== this._origHue
    this.setData({ canSave: nickname.length > 0 && (nickname !== this._origNickname.trim() || avatarChanged) })
  },

  onNickname(e: any) {
    const nickname = String(e.detail.value || '').slice(0, 20)
    this.setData({ nickname, initial: this.firstChar(nickname) }, () => this.refreshCanSave())
  },

  onHue(e: any) {
    const key = e.currentTarget.dataset.key
    const hue = HUES.find((h) => h.key === key) || HUES[0]
    this.setData({ hueKey: key, hue, avatarMode: 'letter', draftImagePath: '', avatarFailed: false }, () => this.refreshCanSave())
  },

  onAvatarError() {
    this.setData({ avatarFailed: true })
    wx.showToast({ title: '头像图片加载失败，可重新选择', icon: 'none' })
  },

  onChangeAvatar() {
    if (this.data.saving || this.data.cropVisible) return
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const selected = res.tempFiles && res.tempFiles[0]
        const filePath = selected?.tempFilePath
        if (!filePath) {
          wx.showToast({ title: '未获取到图片，请重试', icon: 'none' })
          return
        }
        if (selected.size > 10 * 1024 * 1024) {
          wx.showToast({ title: '图片不能超过 10MB', icon: 'none' })
          return
        }
        this.setData({ cropVisible: true, draftImagePath: filePath })
      },
      fail: (error) => {
        if (!String(error.errMsg || '').includes('cancel')) wx.showToast({ title: '无法选取图片，请重试', icon: 'none' })
      },
    })
  },

  onCropCancel() {
    this.setData({ cropVisible: false, draftImagePath: '' }, () => this.refreshCanSave())
  },

  onCropConfirm(e: any) {
    const filePath = e.detail?.filePath
    if (!filePath) return this.onCropCancel()
    this.setData({ cropVisible: false, draftImagePath: filePath, avatarMode: 'image', avatarFailed: false }, () => this.refreshCanSave())
  },

  onUseLetter() {
    this.setData({ avatarMode: 'letter', draftImagePath: '', avatarFailed: false }, () => this.refreshCanSave())
  },

  async onSave() {
    if (this.data.saving || !this.data.canSave) return
    const nickname = this.data.nickname.trim()
    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    try {
      let user: any
      if (this.data.avatarMode === 'image' && this.data.draftImagePath) {
        user = await meApi.updateAvatar(this.data.draftImagePath, nickname)
      } else if (this.data.avatarMode === 'letter') {
        user = await meApi.updateProfile({ nickname, avatarMode: 'letter', avatarHue: this.data.hueKey as any })
      } else {
        user = await meApi.updateProfile({ nickname, avatarMode: 'keep' })
      }
      setUser(user)
      wx.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => navigation.navigateBack(), 600)
    } catch {
      this.setData({ saving: false })
    }
  },
})
