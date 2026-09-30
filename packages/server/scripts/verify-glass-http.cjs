// Run on the server after building, with LEDGER_GLASS_PYTHON pointing to pyWinCalc 3.6.2.
const assert = require('node:assert/strict')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { Test } = require('@nestjs/testing')
const { ValidationPipe } = require('@nestjs/common')
const { Reflector } = require('@nestjs/core')
const { JwtService } = require('@nestjs/jwt')
const { GlassToolController } = require('../dist/modules/ledger/glass-tool.controller')
const { GlassToolService } = require('../dist/modules/ledger/glass-tool.service')
const { LedgerJwtGuard } = require('../dist/modules/ledger/guards/ledger-jwt.guard')
const { ToolEventsService } = require('../dist/modules/ledger/tool-events.service')
const { PrismaService } = require('../dist/prisma/prisma.service')
const { GlobalExceptionFilter } = require('../dist/common/filters/global-exception.filter')
const { ResponseInterceptor } = require('../dist/common/interceptors/response.interceptor')

async function main() {
  assert(process.env.LEDGER_GLASS_PYTHON, 'Set LEDGER_GLASS_PYTHON to the installed 3.6.2 engine')
  const events = [], checks = []
  const user = { id: 'glass-http-fixture', status: 'active', membership: null }
  const jwt = new JwtService({ secret: 'glass-http-fixture-only-not-a-production-secret' })
  const module = await Test.createTestingModule({
    controllers: [GlassToolController],
    providers: [GlassToolService, LedgerJwtGuard,
      { provide: JwtService, useValue: jwt },
      { provide: PrismaService, useValue: { ledgerUser: { findUnique: async ({ where }) => where.id === user.id ? user : null } } },
      { provide: ToolEventsService, useValue: { recordServerEvent: async (userId, tool, status, sourceId) => { events.push({ userId, tool, status, sourceId }) } } },
    ],
  }).compile()
  const app = module.createNestApplication({ logger: false })
  app.setGlobalPrefix('api/v1')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.useGlobalFilters(new GlobalExceptionFilter())
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)))
  await app.listen(0, '127.0.0.1')
  const token = jwt.sign({ sub: user.id, scope: 'ledger' }, { expiresIn: '2m' })
  const base = `http://127.0.0.1:${app.getHttpServer().address().port}/api/v1/l/tools/glass/`
  const post = async (name, data, authorization = token) => {
    const response = await fetch(base + name, { method: 'POST', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}) }, body: JSON.stringify(data) })
    return { status: response.status, body: await response.json() }
  }
  const stack = (count) => ({ panes: Array.from({ length: count }, () => ({ thicknessMm: 6 })), gaps: Array.from({ length: count - 1 }, () => ({ type: 'hollow', thicknessMm: 12, gas: 'air' })) })
  const legacy = { type: 'hollow', outerMm: 6, innerMm: 6, gapMm: 12, gas: 'air', coating: 'none' }
  try {
    assert.equal((await post('weight', {}, '')).status, 401)
    assert.equal((await post('weight', {}, jwt.sign({ sub: user.id, scope: 'merchant' }))).status, 401)
    assert.equal((await post('weight', {}, jwt.sign({ sub: 'unknown-account', scope: 'ledger' }))).status, 401)
    checks.push('JWT: guest, wrong scope and missing account rejected; non-member accepted')
    const coated = stack(3)
    coated.panes[0].backEmissivity = .1; coated.panes[2].frontEmissivity = .04
    const mixed = stack(3)
    mixed.panes[0].backEmissivity = .1
    mixed.gaps[0] = { type: 'vacuum', thicknessMm: .2, vacuumPressurePa: .1, pillarDiameterMm: .5, pillarPitchMm: 25 }
    const cases = [legacy, { ...legacy, gas: 'argon' }, ...[2, 3, 4, 6, 20].map(stack), coated, mixed]
    for (const input of cases) {
      const response = await post('estimate', input)
      assert.equal(response.status, 200, JSON.stringify(response.body))
      assert.equal(response.body.code, 0)
      const direct = JSON.parse(execFileSync(process.env.LEDGER_GLASS_PYTHON, [path.join(__dirname, '../dist/modules/ledger/glass-engine.py')], {
        input: JSON.stringify({ ...input, outsideH: 25, insideH: 7.7 }), encoding: 'utf8', timeout: 15000,
      }))
      assert(Math.abs(response.body.data.uValue - direct.uValue) < 1e-8)
      checks.push({ name: `K ${input.panes?.length || 2} panes`, uValue: response.body.data.uValue, directEngineIdentical: true })
    }
    for (const [thicknessesMm, expected] of [[[6, 6], 168], [[19, 19], 532], [[4, 6, 8], 252], [Array(20).fill(6), 1680]]) {
      const response = await post('weight', { heightMm: 1600, widthMm: 3500, thicknessesMm })
      assert.equal(response.status, 200, JSON.stringify(response.body))
      assert.equal(response.body.data.weightKg, expected)
      checks.push({ name: 'weight', layers: thicknessesMm.length, weightKg: expected })
    }
    for (const input of [
      { panes: [], gaps: [] }, { panes: null, gaps: [] }, { ...stack(3), gaps: [] },
      { ...stack(2), outerMm: 6 }, { ...stack(2), gaps: [{ type: 'hollow', thicknessMm: 3, gas: 'air' }] },
      { ...stack(2), panes: [{ thicknessMm: 6, frontEmissivity: null }, { thicknessMm: 6 }] },
      { ...stack(2), gaps: [{ type: 'vacuum', thicknessMm: .3 }] }, stack(21),
    ]) assert.equal((await post('estimate', input)).status, 400)
    for (const input of [
      { heightMm: 0, widthMm: 3500, thicknessesMm: [6] },
      { heightMm: 1600, widthMm: 3500, thicknessesMm: [] },
      { heightMm: 1600, widthMm: 3500, thicknessesMm: [null] },
      { heightMm: 1600, widthMm: 3500, thicknessesMm: Array(21).fill(6) },
    ]) assert.equal((await post('weight', input)).status, 400)
    assert.equal(events.filter(event => event.tool === 'glass-weight' && event.status === 'success').length, 4)
    assert(events.every(event => Object.keys(event).sort().join() === 'sourceId,status,tool,userId'))
    checks.push('12 invalid bodies rejected; event metadata contains no dimensions, parameters or results')
    console.log(JSON.stringify({ checks, actualPinnedEngine: true, databaseUsed: false }, null, 2))
  } finally { await app.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
