import { MotionPage, navigation } from '../../utils/page-transition'
import { getUser } from '../../utils/store'

MotionPage({
  data: {
    accountCode: '—',
  },

  onShow() {
    const u = getUser()
    this.setData({ accountCode: (u && u.accountCode) || '—' })
  },
  toDelete() {
    navigation.navigateTo({ url: '/pages/delete-account/index' })
  },
})
