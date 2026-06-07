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
  }
  setToken?: (token: string) => void
  clearAuth?: () => void
}
