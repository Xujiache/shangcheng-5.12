import { MotionPage, navigation } from '../../utils/page-transition'
import { meApi } from '../../api/index'
import { makeShareCover } from '../../utils/share-cover'
import { fmtDate } from '../../utils/format'
import { avatarImageSrc, isAvatarImage, ledgerAvatarLetter } from '../../config'
import {
  getUser,
  setUser,
  logout,
  glassCardStyle,
  goToLogin,
  isLoggedIn,
  requireLogin,
} from '../../utils/store'

const DEFAULT_NICKNAME = '门窗店主'
const DEFAULT_AVATAR_CHAR = '门'
const PROFILE_TAB_INDEX = 3

const PROFILE_ROWS = [
  {
    iconSrc: '/assets/profile/profile-invite.png',
    label: '邀请好友得会员',
    page: '/pages/invite/index',
  },
  {
    iconSrc: '/assets/profile/profile-settings.png',
    label: '设置',
    page: '/subpackages/settings/pages/settings/index',
  },
] as const

export interface ProfileUserView {
  nickname: string
  avatarChar: string
  avatarUrl: string
  avatarFailed: boolean
  accountText: string
  memberActive: boolean
  memberText: string
  memberSub: string
}

export function profileAccountText(user: Pick<LedgerUserInfo, 'accountCode' | 'id'>): string {
  return `微信账号 · ${(user.accountCode || user.id || '').slice(-8).toUpperCase()}`
}

export function profileMembershipView(
  membership: MembershipStatus | null | undefined,
): Pick<ProfileUserView, 'memberActive' | 'memberText' | 'memberSub'> {
  const value = membership || ({} as Partial<MembershipStatus>)
  const memberActive = !!value.active
  const memberText = memberActive ? '门窗利账 会员' : value.expired ? '会员已过期' : '未开通会员'
  const memberSub = memberActive
    ? `有效期至 ${fmtDate(value.expiresAt || null)} · 剩 ${value.daysLeft} 天`
    : value.expired
      ? '续费后恢复使用'
      : '点击开通，解锁全部功能'
  return { memberActive, memberText, memberSub }
}

export function profileUserView(user: LedgerUserInfo): ProfileUserView {
  const avatar = typeof user.avatar === 'string' ? user.avatar : ''
  const imageAvatar = isAvatarImage(avatar)
  return {
    nickname: user.nickname || DEFAULT_NICKNAME,
    avatarChar: ledgerAvatarLetter(user.nickname),
    avatarUrl: imageAvatar ? avatarImageSrc(avatar) : '',
    avatarFailed: false,
    accountText: profileAccountText(user),
    ...profileMembershipView(user.membership),
  }
}

interface ProfileTabBar {
  selectTab?: (index: number) => void
  syncTab?: (index: number) => void
  setData?: (data: Record<string, unknown>) => void
}

interface ProfilePageWithTabBar {
  getTabBar?: () => ProfileTabBar | null
}

function selectProfileTab(page: ProfilePageWithTabBar): void {
  const tabBar = page.getTabBar?.()
  if (!tabBar) return
  if (typeof tabBar.syncTab === 'function') tabBar.syncTab(PROFILE_TAB_INDEX)
  else if (typeof tabBar.selectTab === 'function') tabBar.selectTab(PROFILE_TAB_INDEX)
  else tabBar.setData?.({ selected: PROFILE_TAB_INDEX })
}

function statusBarTopSpace(): number {
  return (getApp<IAppOption>()?.globalData?.statusBarHeight || 20) + 18
}

MotionPage({
  _cover: '',
  data: {
    glassCard: glassCardStyle(), // 卡片玻璃通透度（随设置滑块，onShow 刷新）
    topSpace: 38, // 顶部留白 = 状态栏高度 + 18
    nickname: DEFAULT_NICKNAME,
    accountText: '',
    avatarChar: DEFAULT_AVATAR_CHAR,
    avatarUrl: '', // 上传的头像图片 URL；有则显示图片，否则显示字母头像
    avatarFailed: false,
    memberActive: false,
    memberText: '未开通会员',
    memberSub: '点击开通，解锁全部功能',
    rows: PROFILE_ROWS,
  },

  onReady() {
    this.genCover()
  },
  genCover() {
    if (this._cover) return
    makeShareCover(this, '#shareCover', {
      title: '门窗人的记账利器',
      subtitle: '记账 · 算利润 · 优化下料',
    }).then((p) => (this._cover = p))
  },
  onShow() {
    if (!isLoggedIn()) {
      goToLogin()
      return
    }
    this.setData({ glassCard: glassCardStyle() }) // 刷新卡片样式；页面过渡由 MotionPage 统一管理
    selectProfileTab(this as unknown as ProfilePageWithTabBar)
    this.setData({ topSpace: statusBarTopSpace() })
    this.load()
  },
  applyUser(user: LedgerUserInfo) {
    this.setData(profileUserView(user))
  },

  async load() {
    if (!isLoggedIn()) return
    // 先用登录时缓存的真实用户立即渲染，避免 me() 未返回/失败时闪现"未开通"默认值
    const cachedUser = getUser()
    if (cachedUser) this.applyUser(cachedUser)
    try {
      const user = (await meApi.me()) as LedgerUserInfo
      setUser(user)
      this.applyUser(user)
    } catch {
      /* me() 失败则保留缓存兜底显示 */
    }
  },

  onAvatarError() {
    this.setData({ avatarFailed: true })
  },

  toEdit() {
    if (!requireLogin()) return
    navigation.navigateTo({ url: '/pages/edit-profile/index' })
  },
  toMembership() {
    if (!requireLogin()) return
    navigation.navigateTo({ url: '/pages/membership/index' })
  },
  toRow(e: WechatMiniprogram.TouchEvent) {
    if (!requireLogin()) return
    navigation.navigateTo({ url: e.currentTarget.dataset.page })
  },
  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定退出当前账号？',
      success: (r) => {
        if (r.confirm) logout()
      },
    })
  },
  // 开启「转发给朋友」：分享游客首页，外部用户可先浏览公开页面。
  onShareAppMessage() {
    return {
      title: '我在用「门窗利账」记账算利润，门窗人的记账利器',
      path: '/pages/home/index',
      imageUrl: this._cover || undefined,
    }
  },
  // 开启「分享到朋友圈」
  onShareTimeline() {
    return { title: '门窗利账 · 门窗人的记账利器', imageUrl: this._cover || undefined }
  },
})
