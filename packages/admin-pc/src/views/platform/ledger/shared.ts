/**
 * 门窗利账 · 账号管理 / 会员管理 共享逻辑
 *
 * 账号页与会员页共用同一张账号表 + 同一套「会员状态」展示 / 「明文密码」一次性弹窗，
 * 这里抽出纯函数与弹窗工具，保持两页 DRY 又不破坏「逻辑内联在 view」的项目风格。
 */
import { ElMessage, ElMessageBox } from 'element-plus'
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

/**
 * 一次性明文密码弹窗（新建账号生成密码 / 重置密码共用）
 *
 * 与权限管理页 `onReset` 的风格保持一致：HTML 弹窗 + 「复制密码」按钮，
 * 明确提示「仅显示一次」。复制走 navigator.clipboard，不可用时降级提示手动复制。
 */
export async function showPasswordDialog(opts: {
  title: string
  /** 顶部说明（HTML 片段，可含账号信息） */
  intro: string
  password: string
}) {
  const { title, intro, password } = opts
  try {
    await ElMessageBox.alert(
      `<div style="font-size:13px;color:#6b7280;margin-bottom:10px">${intro}</div>` +
        `<div style="font-family:monospace;font-size:18px;font-weight:600;padding:12px;background:#fafbfc;border:1px dashed #e5e7eb;border-radius:8px;text-align:center;letter-spacing:1px;color:#ff4d2d">${password}</div>` +
        `<div style="font-size:12px;color:#f56c6c;margin-top:10px"><b>仅显示一次</b>，请立即复制并通知用户，本窗口关闭后无法再次查看。</div>`,
      title,
      {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '复制密码',
        showClose: true,
        callback: async (action: string) => {
          if (action === 'confirm') {
            try {
              await navigator.clipboard.writeText(password)
              ElMessage.success('密码已复制到剪贴板')
            } catch {
              ElMessage.warning('剪贴板不可用，请手动复制')
            }
          }
        }
      }
    )
  } catch {
    /* 用户关闭弹窗，忽略 */
  }
}
