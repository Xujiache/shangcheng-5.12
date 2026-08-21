// 设置总入口：分类导航到各设置子页（分别调整）
Page({
  data: {
    rows: [
      {
        iconSrc: '/assets/settings/settings-data.png',
        label: '成本分类',
        sub: '自定义名称 · 常用项 · 展示排序',
        page: '/pages/cost-categories/index',
      },
      {
        iconSrc: '/assets/settings/settings-appearance.png',
        label: '外观与个性化',
        sub: '沉浸光感 · 玻璃通透度 · 特效模式',
        page: '/pages/appearance/index',
      },
      {
        iconSrc: '/assets/profile/profile-message.png',
        label: '通知提醒',
        sub: '订单 · 报表 · 目标 · 系统通知',
        page: '/pages/notifications/index',
      },
      {
        iconSrc: '/assets/settings/settings-privacy.png',
        label: '隐私与安全',
        sub: '隐藏金额 · 生物解锁 · 协议 · 账户',
        page: '/pages/privacy/index',
      },
      {
        iconSrc: '/assets/settings/settings-data.png',
        label: '数据管理',
        sub: '导出 · 导入 · 清除缓存',
        page: '/pages/data-backup/index',
      },
      {
        iconSrc: '/assets/settings/settings-about.png',
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
