import {
  isLedgerAvatarHue,
  ledgerAvatarImageId,
  ledgerAvatarPath,
  sanitizeLedgerAvatar,
} from '../src/modules/ledger/ledger-avatar.util'

describe('ledger avatar values', () => {
  it('accepts only the fixed letter-avatar hues', () => {
    expect(isLedgerAvatarHue('teal')).toBe(true)
    expect(isLedgerAvatarHue('violet')).toBe(true)
    expect(isLedgerAvatarHue('custom')).toBe(false)
    expect(sanitizeLedgerAvatar(' teal ')).toBe('teal')
  })

  it('accepts only a valid internal immutable image path', () => {
    expect(sanitizeLedgerAvatar('/api/v1/l/avatar-image/abc12345')).toBe(
      '/api/v1/l/avatar-image/abc12345',
    )
    expect(ledgerAvatarImageId('/api/v1/l/avatar-image/abc12345')).toBe('abc12345')
    expect(ledgerAvatarPath('abc12345')).toBe('/api/v1/l/avatar-image/abc12345')
  })

  it('rejects absolute, legacy, forged and malformed values', () => {
    expect(sanitizeLedgerAvatar('https://ewsn.top/api/v1/l/avatar-image/abc12345')).toBeNull()
    expect(sanitizeLedgerAvatar('https://ewsn.top/oss/avatar/a.jpg')).toBeNull()
    expect(sanitizeLedgerAvatar('/api/v1/l/avatar-image/short')).toBeNull()
    expect(sanitizeLedgerAvatar('/api/v1/l/avatar-image/abc12345/extra')).toBeNull()
    expect(sanitizeLedgerAvatar('teal<script>')).toBeNull()
    expect(sanitizeLedgerAvatar(null)).toBeNull()
    expect(sanitizeLedgerAvatar(undefined)).toBeNull()
  })

  it('rejects invalid ids when creating a path', () => {
    expect(() => ledgerAvatarPath('short')).toThrow()
    expect(() => ledgerAvatarPath('a'.repeat(65))).toThrow()
  })
})
