jest.mock('nanoid', () => ({ customAlphabet: () => () => 'TEST00000001' }))
jest.mock('sharp', () => ({ __esModule: true, default: jest.fn() }), { virtual: true })

import { isEnglishLocale, localizeMemberPlan } from '../src/modules/merchant/merchant.service'

describe('merchant member-plan localization', () => {
  const plan = {
    id: 'plan-1',
    name: '基础月会员',
    nameEn: 'Core Monthly Membership',
    rights: ['店铺装修', '客服'],
    rightsEn: ['Store design', 'Customer support'],
  }

  it('recognizes English language negotiation case-insensitively', () => {
    expect(isEnglishLocale('en-US')).toBe(true)
    expect(isEnglishLocale('EN-gb')).toBe(true)
    expect(isEnglishLocale('zh-CN')).toBe(false)
  })

  it('returns localized display fields without mutating the source', () => {
    const result = localizeMemberPlan(plan, 'en-US')
    expect(result).toMatchObject({
      name: 'Core Monthly Membership',
      rights: ['Store design', 'Customer support'],
    })
    expect(plan.name).toBe('基础月会员')
    expect(plan.rights).toEqual(['店铺装修', '客服'])
  })

  it('keeps Chinese for Chinese and falls back safely when English is incomplete', () => {
    expect(localizeMemberPlan(plan, 'zh-CN')).toBe(plan)
    expect(localizeMemberPlan({ ...plan, nameEn: '', rightsEn: [] }, 'en-US')).toMatchObject({
      name: '基础月会员',
      rights: ['店铺装修', '客服'],
    })
  })
})
