import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assertTestTarget } from './test-target.mjs'
import { upgrade } from './migrate.mjs'

test('database guard rejects remote, real local databases and Redis DB zero', () => {
  const base = { ALLOW_DATABASE_TESTS: '1', DATABASE_URL: 'postgresql://test@127.0.0.1/qa_test' }
  assert.doesNotThrow(() => assertTestTarget(base))
  assert.throws(() => assertTestTarget(base, { requireRedis: true }), /REDIS_URL/)
  for (const change of [
    { ALLOW_DATABASE_TESTS: '' },
    { NODE_ENV: 'production' },
    { DATABASE_URL: 'postgresql://secret@example.com/qa_test' },
    { DATABASE_URL: 'postgresql://test@localhost/business' },
    { REDIS_URL: 'redis://localhost:6379' },
    { REDIS_URL: 'redis://localhost:6379/0' },
  ]) {
    assert.throws(() => assertTestTarget({ ...base, ...change }))
  }
})
test('dry run never creates tables or inserts tracking rows', async () => {
  const queries = []
  const db = {
    query: async (sql) => {
      queries.push(sql)
      if (sql.includes('pg_try_advisory_lock')) return { rows: [{ acquired: true }] }
      return sql.includes('to_regclass') ? { rows: [{ relation: null }] } : { rows: [] }
    },
  }
  const r = await upgrade(db)
  assert.equal(r.dryRun, true)
  assert.equal(r.action, 'apply')
  assert(!queries.some((q) => /CREATE|INSERT|BEGIN/.test(q)))
  assert(queries.at(-1).includes('unlock'))
})
test('a modified executed SQL version is rejected before any mutation', async () => {
  const db = {
    query: async (sql) => ({
      rows: sql.includes('pg_try_advisory_lock')
        ? [{ acquired: true }]
        : sql.includes('to_regclass')
          ? [{ relation: '_SchemaUpgrade' }]
          : sql.includes('SELECT checksum')
            ? [{ checksum: 'other' }]
            : [],
    }),
  }
  await assert.rejects(upgrade(db, { apply: true }), /checksum changed/)
})

test('concurrent migration fails fast without touching schema', async () => {
  const queries = []
  await assert.rejects(
    upgrade({
      query: async (sql) => {
        queries.push(sql)
        return { rows: [{ acquired: false }] }
      },
    }),
    /Another upgrade/,
  )
  assert.equal(queries.length, 1)
})
