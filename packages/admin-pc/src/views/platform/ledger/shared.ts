/**
 * 门窗利账 · 账号管理 / 会员管理 共享逻辑
 *
 * 账号页与会员页共用同一张账号表和同一套会员/账号状态展示。
 * 这里抽出纯函数，保持两页 DRY 又不破坏「逻辑内联在 view」的项目风格。
 */
import type { LedgerMembership } from '@/api/ledger'

/** 会员状态 ElTag type（有效=success / 临期=warning / 过期=danger / 未开通=info） */
export function membershipTagType(m?: LedgerMembership): 'success' | 'warning' | 'danger' | 'info' {
  if (!m || m.never) return 'info'
  if (m.expired) return 'danger'
  if (m.expiringSoon) return 'warning'
  if (m.active) return 'success'
  return 'info'
}

/** 会员状态文案 */
export function membershipLabel(m?: LedgerMembership): string {
  if (!m || m.never) return '未开通'
  if (m.perpetual) return '永久会员'
  if (m.expired) return '已过期'
  if (m.active) return `有效 · 剩 ${Math.max(0, m.daysLeft)} 天`
  return '未开通'
}

/** 账号状态 ElTag type */
export function accountStatusTagType(status: 'active' | 'disabled'): 'success' | 'info' {
  return status === 'active' ? 'success' : 'info'
}

/** 账号状态文案 */
export function accountStatusLabel(status: 'active' | 'disabled'): string {
  return status === 'active' ? '启用' : '停用'
}
