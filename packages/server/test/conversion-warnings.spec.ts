import {
  collectConversionWarnings,
  CONVERSION_WARNINGS_OPTION_KEY,
  publicConversionWarnings,
} from '../src/modules/ledger-conversion/conversion.warnings'

describe('conversion warnings', () => {
  test('keeps distinct Chinese OCR and experimental warnings without details or passwords', () => {
    const outputs = [
      { warnings: [
        { code: 'OCR_REVIEW_RECOMMENDED', messages: { zhCN: '请核对金额 secret\n和编号。' }, details: { password: 'secret' } },
        { code: 'EXPERIMENTAL_INPUT', messages: { zhCN: '此输入仍属实验性，请复核转换结果。' } },
      ] },
      { warnings: [
        { code: 'OCR_REVIEW_RECOMMENDED', messages: { zhCN: '请核对金额 secret\n和编号。' } },
        { code: 'INVALID', messages: { enUS: 'Only English' } },
        'unstructured warning',
      ] },
    ]
    const warnings = collectConversionWarnings(outputs, { password: 'secret' })
    expect(warnings).toEqual(['请核对金额 *** 和编号。', '此输入仍属实验性，请复核转换结果。'])
    expect(JSON.stringify(warnings)).not.toContain('secret')
  })

  test('bounds stored warning count and size, and tolerates older jobs', () => {
    const outputs = [{ warnings: Array.from({ length: 15 }, (_, index) => ({
      code: 'EXPERIMENTAL_INPUT',
      messages: { zhCN: `第${index}条${'很'.repeat(250)}` },
    })) }]
    const warnings = collectConversionWarnings(outputs, {})
    expect(warnings).toHaveLength(12)
    expect(warnings.every((warning) => warning.length <= 180)).toBe(true)
    expect(publicConversionWarnings({})).toEqual([])
    expect(publicConversionWarnings(null)).toEqual([])
    expect(publicConversionWarnings({ [CONVERSION_WARNINGS_OPTION_KEY]: ['密码 secret'], password: 'secret' })).toEqual(['密码 ***'])
  })
})
