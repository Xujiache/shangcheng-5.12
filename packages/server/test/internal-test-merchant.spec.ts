import { describe, expect, it, jest } from '@jest/globals'
import {
  getInternalTestMerchantIds,
  parseInternalTestMerchantIds,
} from '../src/common/utils/internal-test-merchant.util'

describe('内部测试商户名单', () => {
  it('清理空值并去重字符串数组', () => {
    expect(parseInternalTestMerchantIds(['m1', ' m2 ', '', 'm1', 3])).toEqual(['m1', 'm2'])
  })

  it('兼容 merchantIds 对象并从 SystemConfig 读取', async () => {
    const findUnique = jest.fn(async (_args: any) => ({
      value: { merchantIds: ['qa-merchant'] },
    }))
    await expect(
      getInternalTestMerchantIds({ systemConfig: { findUnique } } as any),
    ).resolves.toEqual(['qa-merchant'])
    expect(findUnique).toHaveBeenCalledWith({ where: { key: 'internal_test_merchants' } })
  })

  it('异常配置默认视为空名单', () => {
    expect(parseInternalTestMerchantIds({ merchantIds: 'not-an-array' })).toEqual([])
    expect(parseInternalTestMerchantIds(null)).toEqual([])
  })
})
