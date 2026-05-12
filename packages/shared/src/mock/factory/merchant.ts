/**
 * 商家 / 门店 / 员工 Mock
 */
import type { Merchant, Store, Staff } from '../../types/merchant'
import { faker, chineseName, chinaPhone, CITIES, BUSINESS_CATEGORIES, pickN, chance, placeholderImage } from '../faker'
import { genId } from '../../utils/id'

/** 商家 */
export function genMerchant(opts?: { type?: 'factory' | 'store' }): Merchant {
  const now = new Date().toISOString()
  const type = opts?.type ?? (chance(40) ? 'factory' : 'store')
  const city = faker.helpers.arrayElement(CITIES)

  return {
    id: genId(),
    userId: genId(),
    type,
    name: type === 'factory' ? `${city}经纬科技` : `${city}${faker.helpers.arrayElement(['望京', '国贸', '南山', '天府'])}店`,
    legalName: `${city}${chineseName().slice(0, 1)}${type === 'factory' ? '家具有限公司' : '商贸有限公司'}`,
    creditCode: '91' + faker.string.alphanumeric({ length: 16, casing: 'upper' }),
    legalRep: chineseName(),
    contact: chineseName(),
    contactPhone: chinaPhone(),
    region: `${city} · ${faker.helpers.arrayElement(['朝阳', '海淀', '丰台', '南山', '天府'])}`,
    address: faker.location.streetAddress(),
    businessLicense: placeholderImage(600, 800),
    qualifications: Array.from({ length: faker.number.int({ min: 2, max: 4 }) }).map(() => placeholderImage(600, 800)),
    categories: pickN(BUSINESS_CATEGORIES, faker.number.int({ min: 1, max: 3 })),
    status: faker.helpers.arrayElement(['pending', 'active', 'active', 'active'] as const),
    level: faker.helpers.arrayElement(['A', 'B', 'C'] as const),
    credit: faker.helpers.arrayElement(['A', 'A', 'B', 'B', 'C'] as const),
    rejectRate: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
    totalGmv: faker.number.int({ min: 10000, max: 10_000_000 }),
    createdAt: now,
    updatedAt: now,
  }
}

/** 门店 */
export function genStore(merchantId: string): Store {
  const now = new Date().toISOString()
  const city = faker.helpers.arrayElement(CITIES)
  return {
    id: genId(),
    merchantId,
    name: `${city}${faker.helpers.arrayElement(['旗舰店', '体验店', '形象店'])}`,
    contact: chineseName(),
    phone: chinaPhone(),
    region: city,
    address: faker.location.streetAddress(),
    longitude: faker.number.float({ min: 100, max: 122, fractionDigits: 4 }),
    latitude: faker.number.float({ min: 25, max: 41, fractionDigits: 4 }),
    level: faker.helpers.arrayElement(['A', 'B', 'C'] as const),
    status: faker.helpers.arrayElement(['active', 'active', 'pending', 'cancelled'] as const),
    authValidFrom: '2025-05-01',
    authValidTo: '2026-05-01',
    createdAt: now,
    updatedAt: now,
  }
}

/** 员工 */
export function genStaff(merchantId: string): Staff {
  const now = new Date().toISOString()
  return {
    id: genId(),
    merchantId,
    name: chineseName(),
    phone: chinaPhone(),
    role: faker.helpers.arrayElement(['sales', 'cs', 'manager'] as const),
    status: chance(85) ? 'active' : 'left',
    permissions: pickN(['product:read', 'order:read', 'customer:read', 'chat:write'], 3),
    monthlyPerformance: faker.number.int({ min: 5000, max: 50000 }),
    createdAt: now,
    updatedAt: now,
  }
}

export function genMerchants(count: number, opts?: Parameters<typeof genMerchant>[0]): Merchant[] {
  return Array.from({ length: count }).map(() => genMerchant(opts))
}
