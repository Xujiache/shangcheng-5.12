import { BadRequestException, ServiceUnavailableException } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { GlassToolService } from '../src/modules/ledger/glass-tool.service'
import { GlassEstimateDto } from '../src/modules/ledger/dto/glass-estimate.dto'
import { GlassToolController } from '../src/modules/ledger/glass-tool.controller'
import { ToolEventsService } from '../src/modules/ledger/tool-events.service'

jest.mock('../src/modules/ledger/guards/ledger-jwt.guard', () => ({ LedgerJwtGuard: class {} }))

const hollow: GlassEstimateDto = {
  type: 'hollow', outerMm: 6, innerMm: 6, gapMm: 12,
  gas: 'air', coating: 'none',
}

describe('GlassToolService', () => {
  const service = new GlassToolService()

  it('rejects incomplete vacuum model parameters', async () => {
    await expect(service.estimate({ ...hollow, type: 'vacuum', gapMm: 0.2 }))
      .rejects.toBeInstanceOf(BadRequestException)
  })

  it('validates finite pane, gap, coating and vacuum parameters', async () => {
    const invalid = plainToInstance(GlassEstimateDto, {
      ...hollow, type: 'vacuum', outerMm: -1, innerMm: Infinity,
      gapMm: 0, coating: 'surface2', emissivity: 1,
      vacuumPressurePa: -1, pillarDiameterMm: 0,
      pillarPitchMm: 0,
    })
    const fields = (await validate(invalid)).map((error) => error.property)
    expect(fields).toEqual(expect.arrayContaining([
      'outerMm', 'innerMm', 'gapMm', 'emissivity',
      'vacuumPressurePa', 'pillarDiameterMm', 'pillarPitchMm',
    ]))
  })

  it('rejects an unphysical pillar grid', async () => {
    await expect(service.estimate({
      ...hollow, type: 'vacuum', gapMm: 0.2,
      vacuumPressurePa: 0.1, pillarDiameterMm: 25, pillarPitchMm: 25,
    })).rejects.toBeInstanceOf(BadRequestException)
  })

  it('fails closed when the pinned engine is unavailable', async () => {
    const previous = process.env.LEDGER_GLASS_PYTHON
    process.env.LEDGER_GLASS_PYTHON = '/no/such/python'
    try {
      await expect(service.estimate(hollow)).rejects.toBeInstanceOf(ServiceUnavailableException)
    } finally {
      if (previous === undefined) delete process.env.LEDGER_GLASS_PYTHON
      else process.env.LEDGER_GLASS_PYTHON = previous
    }
  })
})

describe('GlassToolController accounting', () => {
  const user = { id: 'ledger-user-1' } as any

  it('records backend success only after calculation', async () => {
    const service = { estimate: jest.fn().mockResolvedValue({ uValue: 1.8 }) }
    const events = { recordServerEvent: jest.fn().mockResolvedValue(undefined) }
    const controller = new GlassToolController(service as unknown as GlassToolService, events as unknown as ToolEventsService)
    await expect(controller.estimate(user, hollow)).resolves.toEqual({ uValue: 1.8 })
    expect(events.recordServerEvent).toHaveBeenCalledWith(user.id, 'glass', 'success', expect.any(String))
  })

  it('records backend failure when the engine fails', async () => {
    const service = { estimate: jest.fn().mockRejectedValue(new Error('engine down')) }
    const events = { recordServerEvent: jest.fn().mockResolvedValue(undefined) }
    const controller = new GlassToolController(service as unknown as GlassToolService, events as unknown as ToolEventsService)
    await expect(controller.estimate(user, hollow)).rejects.toThrow('engine down')
    expect(events.recordServerEvent).toHaveBeenCalledWith(user.id, 'glass', 'failure', expect.any(String))
  })
})
