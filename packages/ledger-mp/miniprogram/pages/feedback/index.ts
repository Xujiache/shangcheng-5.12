import { feedbackApi } from '../../api/index'
import { API_BASE } from '../../config'
import { handleUnauthorized } from '../../utils/request'
import { getToken } from '../../utils/store'

const MAX_IMG = 9

Page({
  data: {
    content: '',
    contact: '',
    images: [] as string[], // 已上传公网 URL
    canSubmit: false,
    submitting: false,
    uploading: false,
  },

  refreshCanSubmit() {
    this.setData({ canSubmit: this.data.content.trim().length > 0 })
  },
  onContent(e: any) {
    this.setData({ content: String(e.detail.value).slice(0, 500) }, () => this.refreshCanSubmit())
  },
  onContact(e: any) {
    this.setData({ contact: String(e.detail.value).slice(0, 40) })
  },

  chooseMedia() {
    if (this.data.uploading) return
    const left = MAX_IMG - this.data.images.length
    if (left <= 0) {
      wx.showToast({ title: `最多 ${MAX_IMG} 张`, icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: left,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const files = (res.tempFiles || []).map((f: any) => f.tempFilePath).filter(Boolean)
        if (files.length) this.uploadSeq(files)
      },
    })
  },
  // 逐张上传到对象存储，拿回公网 URL（uploadFile 不走 request 层，需手动处理登录失效）
  uploadSeq(files: string[]) {
    this.setData({ uploading: true })
    let i = 0
    const next = () => {
      if (i >= files.length) {
        this.setData({ uploading: false })
        return
      }
      wx.uploadFile({
        url: API_BASE + '/api/v1/l/feedback-media',
        filePath: files[i],
        name: 'file',
        header: { Authorization: 'Bearer ' + getToken() },
        success: (up) => {
          try {
            const body = JSON.parse(up.data)
            if (body && body.code === 0 && body.data && body.data.url) {
              this.setData({ images: this.data.images.concat(body.data.url) })
            } else if (
              up.statusCode === 401 ||
              (body && (body.code === 2001 || body.code === 2002))
            ) {
              this.setData({ uploading: false })
              handleUnauthorized()
              return
            } else {
              wx.showToast({ title: '图片上传失败', icon: 'none' })
            }
          } catch (e) {
            wx.showToast({ title: '上传失败', icon: 'none' })
          }
          i++
          next()
        },
        fail: () => {
          wx.showToast({ title: '上传失败', icon: 'none' })
          i++
          next()
        },
      })
    }
    next()
  },
  removeImage(e: any) {
    const idx = Number(e.currentTarget.dataset.index)
    const images = this.data.images.slice()
    images.splice(idx, 1)
    this.setData({ images })
  },
  previewImage(e: any) {
    const idx = Number(e.currentTarget.dataset.index)
    wx.previewImage({ current: this.data.images[idx], urls: this.data.images })
  },

  async onSubmit() {
    if (!this.data.content.trim()) {
      wx.showToast({ title: '请先填写反馈内容', icon: 'none' })
      return
    }
    if (this.data.uploading) {
      wx.showToast({ title: '图片上传中，请稍候', icon: 'none' })
      return
    }
    if (this.data.submitting) return
    this.setData({ submitting: true })
    try {
      await feedbackApi.submit({
        content: this.data.content.trim(),
        contact: this.data.contact.trim() || undefined,
        images: this.data.images.length ? this.data.images : undefined,
      })
      wx.showToast({ title: '已提交', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 600)
      // 成功后不重置 submitting：返回前防重复提交
    } catch (e) {
      this.setData({ submitting: false })
    }
  },
})
