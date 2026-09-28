import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const version = '20260928_001_ledger_tool_events'
const sql = readFileSync(path.join(root, 'deploy/upgrades', `${version}.sql`), 'utf8')
const checksum = createHash('sha256').update(sql).digest('hex')

async function tableState(db) {
  const columns = await db.query(
    `SELECT column_name, data_type, is_nullable FROM information_schema.columns
     WHERE table_schema=current_schema() AND table_name='LedgerToolEvent'`,
  )
  if (!columns.rows.length) return 'missing'
  const expected = {
    id: 'uuid', userId: 'text', tool: 'text', status: 'text',
    occurredAt: 'timestamp without time zone', receivedAt: 'timestamp without time zone',
  }
  for (const [name, type] of Object.entries(expected)) {
    if (!columns.rows.some((row) => row.column_name === name && row.data_type === type && row.is_nullable === 'NO'))
      throw Error(`Tool event schema mismatch: ${name}`)
  }
  if (columns.rows.length !== Object.keys(expected).length) throw Error('Tool event schema has unexpected columns')
  const constraints = await db.query(
    `SELECT conname FROM pg_constraint WHERE conrelid='"LedgerToolEvent"'::regclass`,
  )
  for (const name of ['LedgerToolEvent_pkey', 'LedgerToolEvent_userId_fkey',
    'LedgerToolEvent_tool_check', 'LedgerToolEvent_status_check']) {
    if (!constraints.rows.some((row) => row.conname === name)) throw Error(`Tool event constraint missing: ${name}`)
  }
  return 'complete'
}

export async function upgradeLedgerToolEvents(db, { apply = false } = {}) {
  const lock = await db.query('SELECT pg_try_advisory_lock(20260928, 1) AS acquired')
  if (!lock.rows[0]?.acquired) throw Error('Another tool event upgrade is running')
  try {
    const tracked = await db.query(`SELECT to_regclass('"_SchemaUpgrade"') AS relation`)
    const previous = tracked.rows[0].relation
      ? await db.query('SELECT checksum FROM "_SchemaUpgrade" WHERE version=$1', [version])
      : { rows: [] }
    if (previous.rows.length && previous.rows[0].checksum !== checksum)
      throw Error('Executed SQL checksum changed')
    const state = await tableState(db)
    if (previous.rows.length && state !== 'complete') throw Error('Executed tool event schema drifted')
    if (!previous.rows.length && state !== 'missing') throw Error('Untracked tool event table exists; review manually')
    if (!apply || previous.rows.length) return { version, checksum, action: previous.rows.length ? 'already-applied' : 'pending', dryRun: !apply }
    await db.query('BEGIN')
    try {
      await db.query("SET LOCAL lock_timeout = '5s'")
      await db.query("SET LOCAL statement_timeout = '60s'")
      await db.query(`CREATE TABLE IF NOT EXISTS "_SchemaUpgrade" (
        version TEXT PRIMARY KEY, checksum TEXT NOT NULL, "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT now())`)
      await db.query(sql)
      if (await tableState(db) !== 'complete') throw Error('Post-upgrade verification failed')
      await db.query('INSERT INTO "_SchemaUpgrade"(version,checksum) VALUES($1,$2)', [version, checksum])
      await db.query('COMMIT')
      return { version, checksum, action: 'applied', dryRun: false }
    } catch (error) {
      await db.query('ROLLBACK')
      throw error
    }
  } finally {
    await db.query('SELECT pg_advisory_unlock(20260928, 1)')
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).some((arg) => arg !== '--apply')) throw Error('Unknown argument')
  if (!process.env.DATABASE_URL) throw Error('DATABASE_URL must be explicitly supplied')
  const apply = process.argv.includes('--apply')
  if (apply && (!process.env.DB_UPGRADE_BACKUP_ID || process.env.DB_UPGRADE_CONFIRM !== 'reviewed-backup'))
    throw Error('Applying requires DB_UPGRADE_BACKUP_ID and DB_UPGRADE_CONFIRM=reviewed-backup')
  const require = createRequire(path.join(root, 'packages/server/package.json'))
  const { Client } = require('pg')
  const db = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 })
  try {
    await db.connect()
    console.log(JSON.stringify(await upgradeLedgerToolEvents(db, { apply })))
  } catch (error) {
    console.error(error.code ? `Database upgrade failed; SQLSTATE=${error.code}` : error.message)
    process.exitCode = 1
  } finally {
    await db.end()
  }
}
