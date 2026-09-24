import {
  excludedPlazaMerchantIds,
  filterOptionValues,
  internalTestMerchantIds,
} from '../src/modules/merchant/plaza-filter-options.util'

describe('plaza filter options', () => {
  it('excludes the current and internal-test merchants without duplicates', () => {
    const internal = internalTestMerchantIds({ merchantIds: ['qa-1', 'qa-2', 'qa-1'] })
    expect(excludedPlazaMerchantIds('current', internal)).toEqual(['current', 'qa-1', 'qa-2'])
  })

  it('returns unique, stable option objects', () => {
    expect(filterOptionValues(['广东', '', '浙江', '广东'])).toEqual([
      { value: '广东', label: '广东' },
      { value: '浙江', label: '浙江' },
    ])
  })
})
