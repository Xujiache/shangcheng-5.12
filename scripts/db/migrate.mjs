import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { root } from '../quality/source.mjs'

const version = '20260909_001_ledger_workbook'
const tables = ['LedgerWorkbook', 'LedgerWorkbookOperation', 'LedgerWorkbookAttachment']
const columns = {
  LedgerWorkbook: {
    userId: 'text',
    revision: 'integer',
    data: 'jsonb',
    updatedAt: 'timestamp without time zone',
  },
  LedgerWorkbookOperation: {
    id: 'integer',
    userId: 'text',
    operationId: 'text',
    revision: 'integer',
    digest: 'text',
    operation: 'jsonb',
    createdAt: 'timestamp without time zone',
  },
  LedgerWorkbookAttachment: {
    id: 'text',
    userId: 'text',
    mime: 'text',
    size: 'integer',
    digest: 'text',
    content: 'bytea',
    createdAt: 'timestamp without time zone',
  },
}
export async function workbookState(db) {
  const result = await db.query(
    'SELECT table_name, column_name, data_type, is_nullable, column_default, is_identity FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=ANY($1)',
    [tables],
  )
  const present = new Set(result.rows.map((r) => r.table_name))
  if (!present.size) return 'missing'
  if (present.size !== tables.length)
    throw Error('Partial workbook schema; restore or repair before upgrading')
  for (const [table, fields] of Object.entries(columns)) {
    for (const [column, type] of Object.entries(fields)) {
      if (
        !result.rows.some(
          (r) =>
            r.table_name === table &&
            r.column_name === column &&
            r.data_type === type &&
            r.is_nullable === 'NO',
        )
      )
        throw Error('Workbook column mismatch: ' + table + '.' + column)
    }
  }
  const revision = result.rows.find(
    (r) => r.table_name === 'LedgerWorkbook' && r.column_name === 'revision',
  )
  const operationId = result.rows.find(
    (r) => r.table_name === 'LedgerWorkbookOperation' && r.column_name === 'id',
  )
  if (!['0', "'0'::integer"].includes(revision?.column_default))
    throw Error('Workbook revision default mismatch')
  if (!operationId?.column_default?.startsWith('nextval(') && operationId?.is_identity !== 'YES')
    throw Error('Workbook operation sequence missing')
  const constraints = await db.query(
    `SELECT t.relname AS table_name, c.contype, c.conkey, pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid WHERE t.relnamespace=current_schema()::regnamespace AND t.relname=ANY($1)`,
    [tables],
  )
  const expected = {
    LedgerWorkbook: [
      'PRIMARY KEY ("userId")',
      'FOREIGN KEY ("userId") REFERENCES "LedgerUser"(id) ON UPDATE CASCADE ON DELETE CASCADE',
    ],
    LedgerWorkbookOperation: [
      'PRIMARY KEY (id)',
      'FOREIGN KEY ("userId") REFERENCES "LedgerUser"(id) ON UPDATE CASCADE ON DELETE CASCADE',
    ],
    LedgerWorkbookAttachment: [
      'PRIMARY KEY ("userId", id)',
      'FOREIGN KEY ("userId") REFERENCES "LedgerUser"(id) ON UPDATE CASCADE ON DELETE CASCADE',
    ],
  }
  for (const [table, definitions] of Object.entries(expected))
    for (const definition of definitions) {
      if (!constraints.rows.some((r) => r.table_name === table && r.definition === definition))
        throw Error('Workbook constraint mismatch: ' + table)
    }
  const indexes = await db.query(
    'SELECT indexdef FROM pg_indexes WHERE schemaname=current_schema() AND tablename=$1',
    ['LedgerWorkbookOperation'],
  )
  if (
    !indexes.rows.some(
      (r) =>
        /CREATE UNIQUE INDEX/.test(r.indexdef) && r.indexdef.endsWith('("userId", "operationId")'),
    )
  )
    throw Error('Missing operation idempotency index')
  if (!indexes.rows.some((r) => r.indexdef.endsWith('("userId", revision)')))
    throw Error('Missing incremental cursor index')
  return 'complete'
}

/** Only immutable, reviewed SQL runs here. No arbitrary SQL supplied by the CLI. */
export async function upgrade(db, { apply = false, adoptExisting = false, sql } = {}) {
  sql ??= readFileSync(path.join(root, 'deploy/upgrades/20260909_001_ledger_workbook.sql'), 'utf8')
  const checksum = createHash('sha256').update(sql).digest('hex')
  const lock = await db.query('SELECT pg_try_advisory_lock(20260909, 1) AS acquired')
  if (!lock.rows[0]?.acquired) throw Error('Another upgrade is running; retry after it finishes')
  try {
    const tracking = await db.query(`SELECT to_regclass('"_SchemaUpgrade"') AS relation`)
    if (tracking.rows[0].relation) {
      const previous = await db.query('SELECT checksum FROM "_SchemaUpgrade" WHERE version=$1', [
        version,
      ])
      if (previous.rows.length) {
        if (previous.rows[0].checksum !== checksum)
          throw Error('Executed SQL checksum changed; refusing upgrade')
        if ((await workbookState(db)) !== 'complete') throw Error('Executed schema has drifted')
        return { version, checksum, action: 'already-applied' }
      }
    }
    const state = await workbookState(db)
    const action = state === 'complete' ? 'adopt-existing' : 'apply'
    if (!apply) return { version, checksum, action, dryRun: true }
    if (state === 'complete' && !adoptExisting)
      throw Error('Matching existing schema requires --adopt-existing after backup')
    await db.query('BEGIN')
    try {
      await db.query("SET LOCAL lock_timeout = '5s'")
      await db.query("SET LOCAL statement_timeout = '60s'")
      await db.query(
        'CREATE TABLE IF NOT EXISTS "_SchemaUpgrade" (version TEXT PRIMARY KEY, checksum TEXT NOT NULL, "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT now())',
      )
      if (state === 'missing') await db.query(sql)
      if ((await workbookState(db)) !== 'complete')
        throw Error('Post-upgrade schema verification failed')
      await db.query('INSERT INTO "_SchemaUpgrade"(version,checksum) VALUES($1,$2)', [
        version,
        checksum,
      ])
      await db.query('COMMIT')
    } catch (error) {
      await db.query('ROLLBACK')
      throw error
    }
    return { version, checksum, action, dryRun: false }
  } finally {
    await db.query('SELECT pg_advisory_unlock(20260909, 1)')
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const allowed = new Set(['--apply', '--adopt-existing'])
  if (process.argv.slice(2).some((a) => !allowed.has(a))) throw Error('Unknown migration argument')
  if (!process.env.DATABASE_URL) throw Error('DATABASE_URL must be explicitly supplied')
  const apply = process.argv.includes('--apply')
  if (
    apply &&
    (!process.env.DB_UPGRADE_BACKUP_ID || process.env.DB_UPGRADE_CONFIRM !== 'reviewed-backup')
  )
    throw Error('Applying requires DB_UPGRADE_BACKUP_ID and DB_UPGRADE_CONFIRM=reviewed-backup')
  const require = createRequire(path.join(root, 'packages/server/package.json'))
  const { Client } = require('pg')
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  })
  try {
    await db.connect()
    console.log(
      JSON.stringify(
        await upgrade(db, { apply, adoptExisting: process.argv.includes('--adopt-existing') }),
        null,
        2,
      ),
    )
  } catch (error) {
    // Driver messages may contain addresses or credentials; only controlled errors are public.
    console.error(error.code ? 'Database upgrade failed; SQLSTATE=' + error.code : error.message)
    process.exitCode = 1
  } finally {
    await db.end()
  }
}
