import assert from 'node:assert/strict'
import test from 'node:test'
import { TOOL_CATALOG, searchTools } from './tool-catalog.mjs'

test('empty query preserves both groups and original order', () => {
  assert.deepEqual(searchTools(' 　').map(tool => tool.id), TOOL_CATALOG.map(tool => tool.id))
  assert.equal(TOOL_CATALOG.filter(tool => tool.group === 'popular').length, 5)
  assert.equal(TOOL_CATALOG.filter(tool => tool.group === 'other').length, 5)
})

test('Chinese names and curated synonyms locate tools', () => {
  for (const [query, id] of [
    ['大写 金额', 'rmb'], ['养老', 'retire'], ['倾角', 'level'],
    ['传热', 'glass'], ['门尺 吉数', 'luban'], ['PDF 图片', 'format'],
    ['triangle', 'triangle'], ['切割', 'cut'], ['工资', 'work-log'], ['圆弧', 'arc'],
  ]) {
    assert.deepEqual(searchTools(query).map(tool => tool.id), [id], query)
  }
})

test('search ignores case and extra whitespace, requires all terms', () => {
  assert.deepEqual(searchTools('  K   VALUE  ').map(tool => tool.id), ['glass'])
  assert.deepEqual(searchTools('玻璃   传热').map(tool => tool.id), ['glass'])
  assert.deepEqual(searchTools('鲁班 退休'), [])
  assert.deepEqual(searchTools('不存在的工具'), [])
})
