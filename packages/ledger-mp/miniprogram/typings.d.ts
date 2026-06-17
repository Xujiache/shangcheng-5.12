// 全局类型声明（门窗利账）

interface MembershipStatus {
  active: boolean
  expired: boolean
  never: boolean
  expiresAt: string | null
  daysLeft: number
  expiringSoon: boolean
  lastPlanKey: string | null
  perpetual?: boolean
  trialClaimed?: boolean
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
    /** 网络在线态（请求层离线兜底/页面提示用） */
    online: boolean
    /** 应用版本号（onLaunch 写入：release/trial 取真实版本，develop 兜底 VERSION） */
    version: string
  }
  setToken?: (token: string) => void
  clearAuth?: () => void
}
