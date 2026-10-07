export type MembershipAccessState = 'guest' | 'checking' | 'active' | 'locked' | 'error'

export interface MembershipAccessView {
  accessState: MembershipAccessState
  accessChecking: boolean
  canUse: boolean
  gateTitle: string
  gateText: string
  gateButtonText: string
  actionText: string
}

const VIEWS: Record<MembershipAccessState, Omit<MembershipAccessView, 'accessState'>> = {
  guest: {
    accessChecking: false,
    canUse: true,
    gateTitle: '',
    gateText: '',
    gateButtonText: '',
    actionText: '计算',
  },
  checking: {
    accessChecking: true,
    canUse: false,
    gateTitle: '正在校验会员状态',
    gateText: '校验完成前不会开放输入和计算功能。',
    gateButtonText: '校验中…',
    actionText: '正在校验会员…',
  },
  active: {
    accessChecking: false,
    canUse: true,
    gateTitle: '',
    gateText: '',
    gateButtonText: '',
    actionText: '计算',
  },
  locked: {
    accessChecking: false,
    canUse: true,
    gateTitle: '',
    gateText: '',
    gateButtonText: '',
    actionText: '计算',
  },
  error: {
    accessChecking: false,
    canUse: false,
    gateTitle: '会员状态校验失败',
    gateText: '为防止会员功能被绕过，本次暂不解锁。请检查网络后重新校验。',
    gateButtonText: '重新校验',
    actionText: '重新校验会员',
  },
}

export function membershipAccessView(state: MembershipAccessState): MembershipAccessView {
  return { accessState: state, ...VIEWS[state] }
}

export function initialMembershipAccess(): MembershipAccessView {
  // 三角、圆弧属于公开计算工具，游客、有效会员和到期会员均可直接使用。
  return membershipAccessView('active')
}

export async function verifyMembershipAccess(): Promise<MembershipAccessState> {
  return 'active'
}
