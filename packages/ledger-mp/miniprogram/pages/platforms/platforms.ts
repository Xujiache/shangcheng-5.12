import { MotionPage, navigation } from '../../utils/page-transition'

MotionPage({
  data: { moreOpen: false },
  toggleMore() { this.setData({ moreOpen: !this.data.moreOpen }) },
  goBack() { navigation.navigateBack() },
})
