Page({
  onLoad(options: Record<string, string>) {
    const query = Object.keys(options || {})
      .map((key) => encodeURIComponent(key) + '=' + encodeURIComponent(options[key]))
      .join('&')
    wx.redirectTo({
      url: '/subpackages/orders/pages/order-edit/index' + (query ? '?' + query : ''),
    })
  },
})
