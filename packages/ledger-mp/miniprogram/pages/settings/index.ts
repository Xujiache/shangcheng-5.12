// 设置总入口：分类导航到各设置子页（分别调整）
Page({
  data: {
    rows: [
      {
        icon: 'cube',
        label: '外观与个性化',
        sub: '沉浸光感 · 玻璃通透度 · 特效模式',
        page: '/pages/appearance/index',
      },
      {
        icon: 'bell',
        label: '通知提醒',
        sub: '订单 · 报表 · 目标 · 系统通知',
        page: '/pages/notifications/index',
      },
      {
        icon: 'shield',
        label: '隐私与安全',
        sub: '隐藏金额 · 生物解锁 · 协议 · 账户',
        page: '/pages/privacy/index',
      },
      {
        icon: 'download',
        label: '数据管理',
        sub: '导出 · 导入 · 清除缓存',
        page: '/pages/data-backup/index',
      },
      {
        icon: 'info',
        label: '关于门窗利账',
        sub: '版本 · 更新日志 · 意见反馈',
        page: '/pages/about/index',
      },
    ],
  },

  toRow(e: any) {
    wx.navigateTo({ url: e.currentTarget.dataset.page })
  },
})
