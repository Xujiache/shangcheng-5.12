// Starts an isolated, loopback-only PostgreSQL cluster with synthetic data only.
// Usage: node scripts/verify-merchant-analytics.cjs "C:/Program Files/PostgreSQL/17/bin"
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const net = require('node:net')
const { Client } = require('pg')
process.env.TS_NODE_PROJECT = path.resolve(__dirname, '../tsconfig.json')
require('ts-node/register/transpile-only')
const { analyticsQuery } = require('../src/modules/merchant/merchant-analytics.service')
const { resolveAnalyticsRange } = require('../src/modules/merchant/analytics-range')
const bin = process.argv[2]
if (!bin || !path.isAbsolute(bin))
  throw new Error('Explicit local PostgreSQL bin directory required')
const dir = process.argv[3]
  ? path.resolve(process.argv[3])
  : fs.mkdtempSync(path.join(os.tmpdir(), 'jingwei-analytics-pg-'))
if (
  path.dirname(dir) !== path.resolve(os.tmpdir()) ||
  !path.basename(dir).startsWith('jingwei-analytics-pg-')
)
  throw new Error('Not an isolated analytics test directory')
const data = path.join(dir, 'data')
const run = (tool, args) => {
  const log = path.join(dir, `${tool}-command.log`)
  const fd = fs.openSync(log, 'a')
  // File handles avoid inherited anonymous pipes keeping pg_ctl waiting on Windows.
  try {
    execFileSync(path.join(bin, `${tool}.exe`), args, {
      windowsHide: true,
      stdio: ['ignore', fd, fd],
      timeout: 60000,
    })
    return fs.readFileSync(log, 'utf8')
  } finally {
    fs.closeSync(fd)
  }
}
async function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.once('error', reject)
    s.listen(0, '127.0.0.1', () => {
      const port = s.address().port
      s.close(() => resolve(port))
    })
  })
}
;(async () => {
  let started = false
  let client
  try {
    if (!fs.existsSync(data))
      fs.writeFileSync(
        path.join(dir, 'init.log'),
        run('initdb', [
          '-D',
          data,
          '-A',
          'trust',
          '-U',
          'analytics_test',
          '--encoding=UTF8',
          '--no-locale',
        ]),
      )
    const pidFile = path.join(data, 'postmaster.pid')
    const pidLines = fs.existsSync(pidFile) ? fs.readFileSync(pidFile, 'utf8').split(/\r?\n/) : []
    if (pidLines.length && path.resolve(pidLines[1]) !== path.resolve(data))
      throw new Error('Unexpected test cluster ownership')
    const port = pidLines.length ? Number(pidLines[3]) : await freePort()
    if (!pidLines.length)
      run('pg_ctl', [
        '-D',
        data,
        '-l',
        path.join(dir, 'postgres.log'),
        '-o',
        `-h 127.0.0.1 -p ${port}`,
        '-w',
        'start',
      ])
    started = true
    client = new Client({ host: '127.0.0.1', port, user: 'analytics_test', database: 'postgres' })
    await client.connect()
    await client.query(`
      CREATE TABLE "Order" (id text PRIMARY KEY, "merchantId" text, "payAmount" numeric(10,2), "paidAt" timestamp(3), "createdAt" timestamp(3), status text);
      CREATE TABLE "Category" (id text PRIMARY KEY, name text);
      CREATE TABLE "Product" (id text PRIMARY KEY, "categoryId" text);
      CREATE TABLE "OrderItem" (id text PRIMARY KEY, "orderId" text, "productId" text, "productName" text, quantity integer);
      CREATE TABLE "Refund" (id text PRIMARY KEY, "merchantId" text, "orderId" text, status text, "refundAmount" numeric(10,2), "completedAt" timestamp(3));
      INSERT INTO "Category" VALUES ('cat','Category'); INSERT INTO "Product" VALUES ('p','cat'),('q',NULL);
      INSERT INTO "Order" VALUES
        ('a','owner',12.34,'2026-09-06 16:00:00','2026-01-01','pending_shipment'),
        ('b','owner',7.66,'2026-09-08 16:00:00','2026-09-08','refunded'),
        ('c','owner',0.15,'2026-09-08 01:00:00','2025-01-01','completed'),
        ('unpaid','owner',100,NULL,'2026-09-08','pending_payment'),
        ('before','owner',99,'2026-09-06 15:59:59.999','2026-09-06','completed'),
        ('month','owner',20,'2026-08-31 16:00:00','2026-08-31','completed'),
        ('future','owner',100,'2026-09-09 11:00:00','2026-09-09','completed'),
        ('other','elsewhere',900,'2026-09-08','2026-09-08','completed');
      INSERT INTO "OrderItem" VALUES ('ia','a','p','Product P',2),('ib','b','p','Product P',1),('ic','c','q','Product Q',1),
        ('iu','unpaid','p','Product P',100),('io','other','p','Product P',100),('if','future','p','Product P',100);
      INSERT INTO "Refund" VALUES
        ('r1','owner','before','completed',1.25,'2026-09-09 04:00:00'),
        ('r2','owner','a','completed',2.75,'2026-09-07 00:00:00'),
        ('r3','owner','a','agreed',100,'2026-09-08'), ('r4','elsewhere','other','completed',777,'2026-09-08'),
        ('r5','owner','a','completed',500,'2026-09-06 15:59:59.999');
    `)
    const now = new Date('2026-09-09T10:23:00.000Z')
    async function get(period, extra = {}) {
      const q = analyticsQuery('owner', resolveAnalyticsRange({ period, ...extra }, now))
      return (await client.query(q.text, q.values)).rows[0]
    }
    const week = await get('week')
    assert.equal(Number(week.paidAmount), 20.15)
    assert.equal(Number(week.paidOrderCount), 3)
    assert.equal(Number(week.avgOrderValue), 6.72)
    assert.equal(Number(week.refundAmount), 4)
    assert.equal(Number(week.totalQuantity), 4)
    assert.equal(week.topProducts[0].quantity, '3')
    assert.equal(week.categories.find((c) => c.categoryId === '').quantity, '1')
    assert.equal(
      week.trend.reduce((sum, p) => sum + Math.round(Number(p.amount) * 100), 0),
      2015,
    )
    const day = await get('today')
    assert.equal(Number(day.paidAmount), 7.66)
    assert.equal(Number(day.refundAmount), 1.25)
    const month = await get('month')
    assert.equal(Number(month.paidAmount), 139.15)
    const year = await get('year')
    assert.equal(year.trend.length, 1)
    assert.equal(year.trend[0].bucketStart, '2026-08-31T16:00:00.000Z')
    const empty = await get('custom', { startDate: '2024-02-29', endDate: '2024-02-29' })
    assert.equal(empty.paidAmount, '0')
    assert.equal(empty.refundAmount, '0')
    assert.deepEqual(empty.trend, [])
    // Running in a non-UTC database session must not shift UTC-stored business timestamps.
    await client.query("SET TIME ZONE 'America/New_York'")
    assert.deepEqual(await get('week'), week)
    const result = {
      passed: true,
      assertions: [
        'unpaid exclusion',
        'payment-time attribution',
        'Beijing midnight boundaries',
        'gross sales retain refunded orders',
        'cross-period completed refunds',
        'partial refunds',
        'cents and rounding',
        'ownership isolation',
        'units not currency',
        'monthly buckets',
        'empty range',
        'database session timezone',
      ],
      directory: dir,
    }
    fs.writeFileSync(path.join(dir, 'verification.json'), JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result))
  } finally {
    if (client) await client.end()
    if (started || fs.existsSync(path.join(data, 'postmaster.pid')))
      run('pg_ctl', ['-D', data, '-w', '-m', 'fast', 'stop'])
    console.log(`Synthetic cluster artifacts: ${dir}`)
  }
})().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
