import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

function key() {
  const value = process.env.CONVERSION_PASSWORD_KEY || ''
  if (!/^[0-9a-fA-F]{64}$/.test(value))
    throw new Error('CONVERSION_PASSWORD_KEY must be a 32-byte hex key')
  return Buffer.from(value, 'hex')
}

export function assertConversionPasswordKey() { key() }

export function encryptConversionPassword(password: string) {
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), nonce)
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()])
  return `v1:${nonce.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${encrypted.toString('base64url')}`
}

export function decryptConversionPassword(value: string) {
  const parts = value.split(':')
  if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('Invalid encrypted conversion password')
  const nonce = Buffer.from(parts[1], 'base64url')
  const tag = Buffer.from(parts[2], 'base64url')
  if (nonce.length !== 12 || tag.length !== 16) throw new Error('Invalid encrypted conversion password')
  const decipher = createDecipheriv('aes-256-gcm', key(), nonce)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64url')), decipher.final()]).toString('utf8')
}
