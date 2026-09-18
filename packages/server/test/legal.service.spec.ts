import { describe, expect, it, jest } from '@jest/globals'
import { LegalService } from '../src/modules/legal/legal.service'
import { LEGAL_AGREEMENTS_EN_KEY } from '../src/modules/legal/legal.defaults.en'
import { LEGAL_AGREEMENTS_KEY } from '../src/modules/legal/legal.defaults'
import {
  MERCHANT_HARMONY_LEGAL_EN_KEY,
  MERCHANT_HARMONY_LEGAL_KEY,
} from '../src/modules/legal/legal.merchant-harmony'

function makeService(row: unknown = null) {
  const prisma: any = {
    systemConfig: {
      findUnique: jest.fn<any>().mockResolvedValue(row),
      upsert: jest.fn<any>(),
    },
  }
  return { service: new LegalService(prisma), prisma }
}

describe('LegalService language negotiation', () => {
  it('returns complete English HarmonyOS disclosures for an English locale', async () => {
    const { service, prisma } = makeService()

    const result = await service.list('en-US')

    expect(prisma.systemConfig.findUnique).toHaveBeenCalledWith({
      where: { key: LEGAL_AGREEMENTS_EN_KEY },
    })
    expect(result.user.title).toBe('Jingwei Technology Terms of Service')
    expect(result.privacy.body).toContain('Asset Store')
    expect(result.collect.body).toContain('Huawei Push Kit')
    expect(result.collect.body).toContain('Huawei IAP Kit')
    expect(result.collect.body).toContain('Huawei Map Kit / Location Kit')
    expect(result.collect.body).toContain('Huawei AppGallery')
  })

  it('deep-merges a partial English administrator override with English defaults', async () => {
    const { service } = makeService({
      value: {
        privacy: {
          title: 'Custom English Privacy Notice',
        },
      },
    })

    const result = await service.list('EN-gb,en;q=0.9')

    expect(result.privacy.title).toBe('Custom English Privacy Notice')
    expect(result.privacy.body).toContain('personal information')
    expect(result.user.title).toBe('Jingwei Technology Terms of Service')
    expect(result.collect.title).toBe('Jingwei Technology Personal Information Collection List')
  })

  it('keeps the existing Chinese agreement key and defaults for Chinese clients', async () => {
    const { service, prisma } = makeService()

    const result = await service.list('zh-CN,zh;q=0.9')

    expect(prisma.systemConfig.findUnique).toHaveBeenCalledWith({
      where: { key: LEGAL_AGREEMENTS_KEY },
    })
    expect(result.user.title).toBe('《经纬科技用户服务协议》')
    expect(result.privacy.title).toBe('《经纬科技隐私政策》')
  })

  it('returns a dedicated minimum-collection notice for the native Harmony merchant client', async () => {
    const { service, prisma } = makeService()
    prisma.systemConfig.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.key === 'system_settings') {
        return {
          value: {
            service: {
              phone: '400-123-4567',
              email: 'privacy@example.com',
              workTime: '9:00-18:00',
            },
          },
        }
      }
      return null
    })

    const result = await service.list('zh-CN', 'merchant-harmony')

    expect(prisma.systemConfig.findUnique).toHaveBeenCalledWith({
      where: { key: MERCHANT_HARMONY_LEGAL_KEY },
    })
    expect(result.privacy.title).toBe('《经纬科技商家端隐私政策》')
    expect(result.privacy.body).toContain('辽宁经纬建筑装饰有限公司')
    expect(result.privacy.body).toContain('privacy@example.com')
    expect(result.privacy.body).toContain('Asset Store')
    expect(result.collect.body).toContain('Huawei IAP')
    expect(result.collect.body).toContain('不读取通讯录')
    expect(result.collect.body).toContain('不接入微信登录/微信支付/腾讯定位')
    expect(result.collect.body).not.toContain('WIFI 列表')
  })

  it('supports an independently overridable English Harmony merchant notice', async () => {
    const { service, prisma } = makeService()
    prisma.systemConfig.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.key === MERCHANT_HARMONY_LEGAL_EN_KEY) {
        return { value: { privacy: { title: 'Approved merchant privacy notice' } } }
      }
      if (where.key === 'system_settings') {
        return { value: { service: { email: 'privacy@example.com' } } }
      }
      return null
    })

    const result = await service.list('en-US', 'merchant-harmony')

    expect(result.privacy.title).toBe('Approved merchant privacy notice')
    expect(result.privacy.body).toContain('does not read contacts')
    expect(result.collect.body).toContain('Huawei Push Kit')
    expect(result.user.title).toBe('Jingwei Merchant Terms of Service')
  })
})
