import { test } from 'node:test'
import assert from 'node:assert/strict'
import { preprocess } from './uni-processor.mjs'
test('checks H5, WeChat and App branches with preserved line numbers', () => {
  const input = '// #ifdef H5\nweb()\n// #endif\n// #ifndef H5\nnative()\n// #endif'
  const result = preprocess(input)
  assert(result[0].includes('web()') && !result[0].includes('native()'))
  assert(!result[1].includes('web()') && result[1].includes('native()'))
  assert(result.every((text) => text.split('\n').length === 6))
})
test('supports nested HTML directives and fails closed on unsupported conditions', () => {
  assert(
    preprocess(
      '<!-- #ifdef H5 -->\n<!-- #ifndef MP -->\na\n<!-- #endif -->\n<!-- #endif -->',
    )[0].includes('a'),
  )
  assert.throws(() => preprocess('// #ifdef H5'), /Unclosed/)
})
