import { freeWorkerMemoryBytes } from '../src/workers/conversion.capacity'

describe('conversion worker memory capacity', () => {
  const GiB = 1024 ** 3

  test('uses the smaller Linux container available memory', () => {
    expect(freeWorkerMemoryBytes(12 * GiB, 'linux', () => 4 * GiB)).toBe(4 * GiB)
    expect(freeWorkerMemoryBytes(4 * GiB, 'linux', () => 12 * GiB)).toBe(4 * GiB)
    expect(freeWorkerMemoryBytes(12 * GiB, 'linux', () => 0)).toBe(0)
  })

  test('keeps macOS host reading and tolerates missing or invalid Linux readings', () => {
    expect(freeWorkerMemoryBytes(12 * GiB, 'darwin', () => 4 * GiB)).toBe(12 * GiB)
    expect(freeWorkerMemoryBytes(12 * GiB, 'linux', null)).toBe(12 * GiB)
    expect(freeWorkerMemoryBytes(12 * GiB, 'linux', () => Number.NaN)).toBe(12 * GiB)
    expect(freeWorkerMemoryBytes(12 * GiB, 'linux', () => { throw new Error('unavailable') })).toBe(12 * GiB)
  })
})
