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
        { name: c.name || '', phone: c.phone || '', address: c.address || '', note: c.note || '' },
        () => this.refresh(),
      )
    } catch (e) {
      /* handled */
    }
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
    if (!this.data.canSave || this.data.saving) return
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
