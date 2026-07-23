import { meApi } from '../api/index'
import { hasActiveMembership, isLoggedIn, setMembership } from './store'

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
    canUse: false,
    gateTitle: '会员功能尚未解锁',
    gateText: '当前页面可免登录查看；输入参数、计算和查看结果需要登录并开通有效会员。',
    gateButtonText: '登录后解锁',
    actionText: '登录后解锁计算',
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
    canUse: false,
    gateTitle: '仅限有效会员使用',
    gateText: '当前账号尚未开通会员或会员已到期，开通或续费后即可使用计算功能。',
    gateButtonText: '查看会员',
    actionText: '会员解锁计算',
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
  return membershipAccessView(isLoggedIn() ? 'checking' : 'guest')
}

export async function verifyMembershipAccess(): Promise<MembershipAccessState> {
  if (!isLoggedIn()) return 'guest'
  try {
    const membership = (await meApi.refreshMembership()) as MembershipStatus
    setMembership(membership)
    return hasActiveMembership(membership) ? 'active' : 'locked'
  } catch (e) {
    return isLoggedIn() ? 'error' : 'guest'
  }
}
