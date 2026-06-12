import { customerApi } from '../../api/index'

Page({
  data: {
    editing: false,
    id: '',
    fromOrder: false,
    name: '',
    phone: '',
    address: '',
    note: '',
    canSave: false,
    saving: false,
    loadError: false, // 编辑模式加载失败：隐藏表单，避免把空表单保存覆盖客户资料
  },

  onLoad(opt: any) {
    this.setData({ fromOrder: opt.fromOrder === '1' })
    if (opt.id) {
      this.setData({ editing: true, id: opt.id })
      this.load()
    } else if (opt.name) {
      this.setData({ name: decodeURIComponent(opt.name) }, () => this.refresh())
    }
  },

  async load() {
    try {
      const c: any = await customerApi.get(this.data.id)
      this.setData(
        {
          name: c.name || '',
          phone: c.phone || '',
          address: c.address || '',
          note: c.note || '',
          loadError: false,
        },
        () => this.refresh(),
      )
    } catch (e) {
      // 加载失败必须挡住表单：空表单一旦保存会把客户资料覆盖为空（同目标页口径）
      this.setData({ loadError: true })
    }
  },
  retry() {
    this.setData({ loadError: false }, () => this.load())
  },

  onName(e: any) {
    this.setData({ name: e.detail.value }, () => this.refresh())
  },
  onPhone(e: any) {
    this.setData({ phone: e.detail.value }, () => this.refresh())
  },
  onAddress(e: any) {
    this.setData({ address: e.detail.value }, () => this.refresh())
  },
  onNote(e: any) {
    this.setData({ note: e.detail.value }, () => this.refresh())
  },
  refresh() {
    this.setData({ canSave: !!String(this.data.name).trim() })
  },

  async save() {
    if (this.data.saving) return
    if (!this.data.canSave) {
      // 与登录/订单页同模式：禁用态点按给出缺什么的提示，而非静默无反馈
      wx.showToast({ title: '请填写客户姓名', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    const { editing, id, fromOrder, name, phone, address, note } = this.data
    const data = {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      note: note.trim(),
    }
    try {
      const c: any = editing ? await customerApi.update(id, data) : await customerApi.create(data)
      if (fromOrder) {
        wx.setStorageSync('ledger_pending_customer', { id: c.id, name: c.name })
      }
      wx.showToast({ title: editing ? '已保存' : '已新增', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 500)
    } catch (e) {
      this.setData({ saving: false }) // 失败允许重试
    }
  },
})
