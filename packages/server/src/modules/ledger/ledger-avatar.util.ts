export const LEDGER_AVATAR_HUES = ['teal', 'blue', 'gold', 'rust', 'olive', 'violet'] as const
export type LedgerAvatarHue = (typeof LEDGER_AVATAR_HUES)[number]

const LEDGER_AVATAR_IMAGE_RE = /^\/api\/v1\/l\/avatar-image\/([a-zA-Z0-9_-]{8,64})$/

export function isLedgerAvatarHue(value: unknown): value is LedgerAvatarHue {
  return typeof value === 'string' && (LEDGER_AVATAR_HUES as readonly string[]).includes(value)
}

export function ledgerAvatarImageId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const match = LEDGER_AVATAR_IMAGE_RE.exec(value.trim())
  return match ? match[1] : null
}

/** 数据库只保存固定字母色或本站相对头像路径。历史外链一律回退为 null。 */
export function sanitizeLedgerAvatar(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  if (isLedgerAvatarHue(v)) return v
  return ledgerAvatarImageId(v) ? v : null
}

export function ledgerAvatarPath(id: string): string {
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(id)) throw new Error('invalid ledger avatar id')
  return `/api/v1/l/avatar-image/${id}`
}
