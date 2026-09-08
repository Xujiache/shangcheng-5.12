import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import os from 'node:os'
import {
  applyOperation,
  emptyBook,
  summary,
  type Operation,
} from '../miniprogram/utils/workbook/domain'

const at = '2026-09-09T00:00:00.000Z'
const worker = {
  name: '合成工人',
  jobType: '安装',
  phone: '',
  mode: 'day',
  rateFen: 30000,
  status: 'active',
}
const entry = {
  workerId: 'w1',
  projectId: '',
  workDate: '2026-09-09',
  mode: 'day',
  quantity100: 100,
  rateFen: 30000,
  attendance: 'work',
  overtimeQuantity100: 0,
  overtimeRateFen: 0,
  bonusFen: 0,
  subsidyFen: 0,
  deductionFen: 0,
  note: '',
  tags: '',
  attachmentIds: [],
}
const output = []
for (const count of [1000, 5000, 10000]) {
  const seed: Operation = {
    id: 'seed',
    at,
    label: 'synthetic benchmark',
    changes: [
      { collection: 'workers', id: 'w1', baseVersion: 0, value: worker },
      ...Array.from({ length: count }, (_, i) => ({
        collection: 'entries' as const,
        id: 'e' + i,
        baseVersion: 0,
        value: entry,
      })),
    ],
  }
  const book = applyOperation(emptyBook(), seed)
  const saves: number[] = [],
    filters: number[] = []
  for (let i = 0; i < 22; i++) {
    let start = performance.now()
    const next = applyOperation(book, {
      id: 'edit-' + i,
      at,
      label: 'edit',
      changes: [
        { collection: 'entries', id: 'e0', baseVersion: 1, value: { ...entry, note: 'changed' } },
      ],
    })
    const save = performance.now() - start
    assert.equal(Object.keys(next.entries).length, count)
    start = performance.now()
    summary(next, { from: '2026-09-01', to: '2026-09-30' })
    const filter = performance.now() - start
    if (i >= 2) {
      saves.push(save)
      filters.push(filter)
    }
  }
  const p95 = (values: number[]) =>
    Number(values.sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1].toFixed(2))
  output.push({ entries: count, operationP95Ms: p95(saves), summaryP95Ms: p95(filters) })
}
console.log(
  JSON.stringify(
    {
      environment: {
        runtime: process.version,
        platform: process.platform,
        cpu: os.cpus()[0]?.model,
        cores: os.cpus().length,
      },
      evidenceLevel:
        'desktop pure domain only; not WeChat device, storage, network or release performance acceptance',
      samples: 20,
      output,
    },
    null,
    2,
  ),
)
