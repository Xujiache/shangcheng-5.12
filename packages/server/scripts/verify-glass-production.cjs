// Run on the server with its environment file. Creates and removes one disposable ledger account.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const { execFileSync } = require('node:child_process')
const { PrismaClient } = require('@prisma/client')
const { JwtService } = require('@nestjs/jwt')
const writeReport = value => { if (process.env.GLASS_VERIFICATION_REPORT) fs.writeFileSync(process.env.GLASS_VERIFICATION_REPORT, JSON.stringify(value, null, 2)) }
const db = new PrismaClient()
const id = 'glass-verification-' + randomUUID()
const checks = []
const base = 'https://ewsn.top/api/v1/l/tools/glass/'
const python = process.env.LEDGER_GLASS_PYTHON || 'python3'
async function main() {
  assert(process.env.JWT_SECRET)
  const jwt = new JwtService({ secret: process.env.JWT_SECRET })
  const token = jwt.sign({ sub: id, scope: 'ledger' }, { expiresIn: '2m' })
  const post = async (name, input, authorized = true) => {
    const r = await fetch(base + name, { method: 'POST', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json', ...(authorized ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(input) })
    const body = await r.json()
    return { status: r.status, body }
  }
  let created = false
  try {
    await db.ledgerUser.create({ data: { id, nickname: '玻璃工具验收', status: 'active' } }); created = true
    assert.equal((await post('weight', {}, false)).status, 401)
    const legacy = { type: 'hollow', outerMm: 6, innerMm: 6, gapMm: 12, gas: 'air', coating: 'none' }
    const stack = count => ({ panes: Array.from({ length: count }, () => ({ thicknessMm: 6 })), gaps: Array.from({ length: count - 1 }, () => ({ type: 'hollow', thicknessMm: 12, gas: 'air' })) })
    const mixed = stack(3)
    mixed.panes[0].backEmissivity = .1
    mixed.gaps[0] = { type: 'vacuum', thicknessMm: .2, vacuumPressurePa: .1, pillarDiameterMm: .5, pillarPitchMm: 25 }
    for (const input of [legacy, stack(3), stack(20), mixed]) {
      const r = await post('estimate', input)
      assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.code, 0)
      const direct = JSON.parse(execFileSync(python, [path.join(__dirname, '../dist/modules/ledger/glass-engine.py')], { input: JSON.stringify(r.body.data.input), encoding: 'utf8', timeout: 15000 }))
      assert(Math.abs(r.body.data.uValue - direct.uValue) < 1e-8)
      checks.push({ type: 'K', panes: input.panes?.length || 2, uValue: r.body.data.uValue, engineIdentical: true })
    }
    for (const [input, expected] of [
      [{ heightMm: 1600, widthMm: 3500, thicknessesMm: [6, 6] }, 168],
      [{ heightMm: 1600, widthMm: 3500, thicknessesMm: [19, 19] }, 532],
      [{ heightMm: 1000, widthMm: 1000, thicknessesMm: [4, 6, 8] }, 45],
      [{ heightMm: 1600, widthMm: 3500, thicknessesMm: Array(20).fill(6) }, 1680],
    ]) {
      const r = await post('weight', input)
      assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.code, 0); assert.equal(r.body.data.weightKg, expected)
      checks.push({ type: 'weight', layers: input.thicknessesMm.length, weightKg: expected })
    }
    assert.equal((await post('estimate', { ...stack(3), gaps: [] })).status, 400)
    assert.equal((await post('weight', { heightMm: 0, widthMm: 3500, thicknessesMm: [6] })).status, 400)
    const events = await db.ledgerToolEvent.findMany({ where: { userId: id }, select: { tool: true, status: true } })
    assert.equal(events.filter(e => e.tool === 'glass-weight' && e.status === 'success').length, 4)
    assert.equal(events.filter(e => e.tool === 'glass' && e.status === 'success').length, 4)
    checks.push('JWT, non-member free access, bad body rejection and per-tool accounting verified')
    writeReport({ base, checks, ready: true, testAccountRemoved: false })
  } finally {
    if (created) {
      await db.ledgerToolEvent.deleteMany({ where: { userId: id } })
      await db.ledgerUser.delete({ where: { id } })
    }
    await db.$disconnect()
  }
  const report = { base, checks, ready: true, testAccountRemoved: true }
  writeReport(report)
  console.log(JSON.stringify(report, null, 2))
}
main().catch(e => { console.error(e); process.exitCode = 1 })
