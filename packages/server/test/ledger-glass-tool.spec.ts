import { BadRequestException, ServiceUnavailableException } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { GlassToolService } from '../src/modules/ledger/glass-tool.service'
import { GlassEstimateDto } from '../src/modules/ledger/dto/glass-estimate.dto'
import { GlassWeightDto } from '../src/modules/ledger/dto/glass-weight.dto'
import { GlassToolController } from '../src/modules/ledger/glass-tool.controller'
import { ToolEventsService } from '../src/modules/ledger/tool-events.service'

jest.mock('../src/modules/ledger/guards/ledger-jwt.guard', () => ({ LedgerJwtGuard: class {} }))

const hollow: GlassEstimateDto = {
  type: 'hollow', outerMm: 6, innerMm: 6, gapMm: 12,
  gas: 'air', coating: 'none',
}
const layered: GlassEstimateDto = {
  panes: [{ thicknessMm: 4 }, { thicknessMm: 6 }, { thicknessMm: 8, frontEmissivity: 0.1 }],
  gaps: [{ type: 'hollow', thicknessMm: 12, gas: 'air' }, { type: 'hollow', thicknessMm: 16, gas: 'argon' }],
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

  it('accepts the legacy and multi-pane DTOs including distinct surface emissivities', async () => {
    expect(await validate(plainToInstance(GlassEstimateDto, hollow))).toEqual([])
    expect(await validate(plainToInstance(GlassEstimateDto, layered))).toEqual([])
    expect(await validate(plainToInstance(GlassEstimateDto, {
      ...layered, panes: [{ thicknessMm: 6, frontEmissivity: .05, backEmissivity: .15 }, { thicknessMm: 6 }, { thicknessMm: 6 }],
    }))).toEqual([])
  })

  it.each([
    { panes: [], gaps: [] },
    { panes: null, gaps: layered.gaps },
    { panes: layered.panes },
    { panes: [{ thicknessMm: 6 }, { thicknessMm: Infinity }], gaps: layered.gaps },
    { panes: [{ thicknessMm: 6, frontEmissivity: null }, { thicknessMm: 6 }], gaps: layered.gaps },
    { ...layered, gaps: [{ type: 'hollow', thicknessMm: 12 }] },
    { ...layered, panes: Array(21).fill({ thicknessMm: 6 }) },
    { ...layered, outsideH: null },
  ])('rejects invalid nested parameters: %j', async input => {
    expect((await validate(plainToInstance(GlassEstimateDto, input))).length).toBeGreaterThan(0)
  })

  it.each([
    { ...layered, gaps: [] },
    { ...layered, panes: [{ thicknessMm: 6 }, null, { thicknessMm: 6 }] },
    { ...layered, gaps: [{ type: 'hollow', thicknessMm: 3, gas: 'air' }, layered.gaps![1]] },
    { ...layered, gaps: [{ type: 'vacuum', thicknessMm: .3 }, layered.gaps![1]] },
    { ...layered, outerMm: 6 },
  ])('rejects count mismatches, missing physical inputs and mixed API shapes: %j', async input => {
    await expect(service.estimate(input as GlassEstimateDto)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('reproduces the screenshot: 1600 × 3500 × 6 mm × 2 layers = 168 kg', () => {
    expect(service.weight({ heightMm: 1600, widthMm: 3500, thicknessesMm: [6, 6] })).toMatchObject({
      weightKg: 168, areaM2: 5.6, totalThicknessMm: 12, weightPerM2: 30, densityCoefficient: 2.5, layerWeightsKg: [84, 84],
    })
  })

  it('sums unequal glass thicknesses and scales area once', () => {
    expect(service.weight({ heightMm: 1000, widthMm: 1000, thicknessesMm: [4, 6, 8] })).toMatchObject({ weightKg: 45, layerWeightsKg: [10, 15, 20] })
    expect(service.weight({ heightMm: 1600, widthMm: 3500, thicknessesMm: [19, 19] }).weightKg).toBe(532)
  })

  it('preserves small positive masses and the supported layer count', () => {
    expect(service.weight({ heightMm: 1, widthMm: 1, thicknessesMm: [.1] }).weightKg).toBeCloseTo(.00000025, 12)
    expect(service.weight({ heightMm: 1000, widthMm: 1000, thicknessesMm: Array(20).fill(6) }).weightKg).toBe(300)
  })

  it.each([
    { heightMm: 0, widthMm: 1000, thicknessesMm: [6] },
    { heightMm: Infinity, widthMm: 1000, thicknessesMm: [6] },
    { heightMm: 1000, widthMm: 1000, thicknessesMm: [] },
    { heightMm: 1000, widthMm: 1000, thicknessesMm: [null] },
    { heightMm: 1000, widthMm: 1000, thicknessesMm: [-6] },
    { heightMm: 1000, widthMm: 1000, thicknessesMm: [NaN] },
    { heightMm: 1000, widthMm: 1000, thicknessesMm: Array(21).fill(6) },
  ])('rejects invalid weight inputs in the DTO and service: %j', async input => {
    expect((await validate(plainToInstance(GlassWeightDto, input))).length).toBeGreaterThan(0)
    expect(() => service.weight(input as GlassWeightDto)).toThrow(BadRequestException)
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

  it('records glass weight independently without including dimensions or results', async () => {
    const service = new GlassToolService()
    const events = { recordServerEvent: jest.fn().mockResolvedValue(undefined) }
    const controller = new GlassToolController(service, events as unknown as ToolEventsService)
    await expect(controller.weight(user, { heightMm: 1600, widthMm: 3500, thicknessesMm: [6, 6] })).resolves.toMatchObject({ weightKg: 168 })
    expect(events.recordServerEvent).toHaveBeenCalledWith(user.id, 'glass-weight', 'success', expect.any(String))
  })
})
