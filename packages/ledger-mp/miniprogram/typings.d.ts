// 全局类型声明（门窗利账）

interface MembershipStatus {
  active: boolean
  expired: boolean
  never: boolean
  expiresAt: string | null
  daysLeft: number
  expiringSoon: boolean
  lastPlanKey: string | null
}

interface LedgerUserInfo {
  id: string
  phone: string
  nickname: string
  avatar: string | null
  mustReset?: boolean
  membership: MembershipStatus
}

interface IAppOption {
  globalData: {
    token: string
    user: LedgerUserInfo | null
    membership: MembershipStatus | null
    /** 系统状态栏高度(px)。安卓 env(safe-area-inset-top)=0，必须用它做顶部留白 */
    statusBarHeight: number
  }
  setToken?: (token: string) => void
  clearAuth?: () => void
}
