/**
 * 用户 Mock
 */
import type { User, UserRole } from '../../types/auth'
import { faker, chineseName, chinaPhone, placeholderImage } from '../faker'
import { genId } from '../../utils/id'

export function genUser(opts?: { role?: UserRole }): User {
  const now = new Date().toISOString()
  return {
    id: genId(),
    openid: faker.string.alphanumeric({ length: 28 }),
    phone: chinaPhone(),
    nickname: chineseName(),
    avatar: placeholderImage(100, 100),
    gender: faker.helpers.arrayElement([0, 1, 2] as const),
    role: opts?.role ?? 'customer',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }
}

export function genUsers(count: number, opts?: Parameters<typeof genUser>[0]): User[] {
  return Array.from({ length: count }).map(() => genUser(opts))
}
