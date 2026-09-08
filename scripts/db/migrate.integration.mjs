import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import { root } from '../quality/source.mjs'
import { assertTestTarget } from './test-target.mjs'
import { upgrade } from './migrate.mjs'
assertTestTarget()
const { Client } = createRequire(path.join(root, 'packages/server/package.json'))('pg')

test('real PostgreSQL: failure rollback, retry, repeat, checksum and existing data', async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  const schema = 'optimization_test_' + Date.now()
  await db.connect()
  try {
    const competing = new Client({ connectionString: process.env.DATABASE_URL })
    await competing.connect()
    try {
      await competing.query('SELECT pg_advisory_lock(20260909, 1)')
      await assert.rejects(upgrade(db), /Another upgrade/)
    } finally {
      await competing.query('SELECT pg_advisory_unlock(20260909, 1)')
      await competing.end()
    }
    await db.query('CREATE SCHEMA ' + schema)
    await db.query('SET search_path TO ' + schema)
    await db.query('CREATE TABLE "LedgerUser" (id TEXT PRIMARY KEY)')
    await db.query('INSERT INTO "LedgerUser" VALUES (\'preserved\')')
    assert.equal((await upgrade(db)).dryRun, true)
    await assert.rejects(
      upgrade(db, {
        apply: true,
        sql: 'CREATE TABLE broken (id int); SELECT missing_column FROM broken;',
      }),
    )
    assert.equal((await db.query("SELECT to_regclass('broken') AS t")).rows[0].t, null)
    assert.equal((await upgrade(db, { apply: true })).action, 'apply')
    assert.equal((await upgrade(db, { apply: true })).action, 'already-applied')
    await assert.rejects(upgrade(db, { apply: true, sql: 'SELECT 1' }), /checksum/)
    assert.equal((await db.query('SELECT count(*)::int AS n FROM "LedgerUser"')).rows[0].n, 1)
    await db.query('DELETE FROM "_SchemaUpgrade"')
    await assert.rejects(upgrade(db, { apply: true }), /adopt-existing/)
    assert.equal((await upgrade(db, { apply: true, adoptExisting: true })).action, 'adopt-existing')
    await db.query('ALTER TABLE "LedgerWorkbook" ALTER COLUMN revision DROP NOT NULL')
    await assert.rejects(upgrade(db), /column mismatch/)
  } finally {
    // Schema is generated here; never drop an operator supplied name.
    assert(/^optimization_test_\d+$/.test(schema))
    await db.query('DROP SCHEMA ' + schema + ' CASCADE')
    await db.end()
  }
})
