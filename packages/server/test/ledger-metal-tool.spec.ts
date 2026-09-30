import { describe, expect, it, jest } from '@jest/globals'
jest.mock('nanoid', () => ({ customAlphabet: () => () => 'test-id' }))
import { MetalToolController } from '../src/modules/ledger/metal-tool.controller'
import { METAL_MATERIALS, normalizeMetalConfig } from '../src/modules/ledger/metal.config'
import { LedgerAdminService } from '../src/modules/ledger/ledger-admin.service'
import { MetalQuoteService } from '../src/modules/ledger/metal-quote.service'
import { calculateMetalQuoteItem } from '../src/modules/ledger/metal.calc'
import { LedgerMembershipGuard } from '../src/modules/ledger/guards/ledger-membership.guard'

describe('金属计算器配置', () => {
  it('65 个材料有完整的离线/服务端默认值', () => {
    const config = normalizeMetalConfig(null)
    expect(METAL_MATERIALS).toHaveLength(65)
    expect(Object.keys(config.prices)).toHaveLength(65)
    expect(config.prices['plate.carbon.hot']).toBe(3306)
    expect(config.densities['plate.ss.316']).toBe(7.98)
    expect(config.defaults).toEqual({ quoteFactor: 1, processingFeeFen: 0 })
  })

  it('脏数据、未知 id、越界值收口，缺字段回落默认', () => {
    const config = normalizeMetalConfig({
      prices: { 'plate.carbon.hot': 20000000, 'unknown.id': 9, 'plate.cu.t2': null },
      densities: { 'plate.ss.316': -1, 'unknown.id': 99 },
      priceMode: { 'plate.carbon.hot': 'nonsense' },
      defaults: { quoteFactor: 999, processingFeeFen: -2 },
      updatedAt: 'invalid',
    })
    expect(config.prices['plate.carbon.hot']).toBe(10_000_000)
    expect(config.prices['plate.cu.t2']).toBe(114730)
    expect(config.densities['plate.ss.316']).toBe(0.01)
    expect(config.priceMode['plate.carbon.hot']).toBe('live')
    expect(config.defaults).toEqual({ quoteFactor: 100, processingFeeFen: 0 })
    expect(config.updatedAt).toBe('')
    expect(config.prices).not.toHaveProperty('unknown.id')
    const oversized = Object.fromEntries(Array.from({ length: 201 }, (_, index) => [`unknown-${index}`, 1]))
    oversized['plate.carbon.hot'] = 1
    expect(normalizeMetalConfig({ prices: oversized }).prices['plate.carbon.hot']).toBe(3306)
  })

  it('GET config 免用户鉴权且按 metal 行返回', async () => {
    const prisma = { ledgerConfig: { findUnique: jest.fn(async (..._args: any[]) => ({ value: { prices: { 'plate.carbon.hot': 3510 } } })) } }
    const result = await new MetalToolController(prisma as any, {} as any).config()
    expect(prisma.ledgerConfig.findUnique).toHaveBeenCalledWith({ where: { key: 'metal' } })
    expect(result.prices['plate.carbon.hot']).toBe(3510)
    expect(result.materials).toHaveLength(65)
    const guards = Reflect.getMetadata('__guards__', MetalToolController)
    expect(guards).toBeUndefined()
  })

  it('平台更新只写 metal 行，不改 global 配置', async () => {
    const prisma = { ledgerConfig: {
      findUnique: jest.fn(async () => null as any),
      upsert: jest.fn(async (args: any) => args),
    } }
    const result = await new LedgerAdminService(prisma as any).updateConfig({ metal: { prices: { 'plate.carbon.hot': 3456 } } } as any)
    expect(prisma.ledgerConfig.upsert).toHaveBeenCalledTimes(1)
    expect(prisma.ledgerConfig.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { key: 'metal' } }))
    expect(result.metal.prices['plate.carbon.hot']).toBe(3456)
  })

  it('报价金额用服务端吨价重算，不信任前端金额', () => {
    const item = calculateMetalQuoteItem({
      materialId: 'section.carbon.angle', category: 'section',
      spec: { model: '50*5', thicknessMm: 5, lengthM: 10 },
      density: 7.85, quoteFactor: 1.2, processingFeeFen: 2000,
      tonPriceFen: 1, amountFen: 1,
    } as any, normalizeMetalConfig({ prices: { 'section.carbon.angle': 4000 } }))
    expect(item.weightKg).toBe(37.7)
    expect(item.tonPriceFen).toBe(400000)
    expect(item.amountFen).toBe(20096)
  })

  it('报价单保存和查询按账号隔离', async () => {
    const prisma = {
      ledgerConfig: { findUnique: jest.fn(async () => null) },
      ledgerMetalQuote: {
        create: jest.fn(async (args: any) => args.data),
        findMany: jest.fn(async (..._args: any[]) => []),
        deleteMany: jest.fn(async (..._args: any[]) => ({ count: 0 })),
      },
    }
    const service = new MetalQuoteService(prisma as any)
    await service.create('account-a', {
      title: '样品', items: [{
        materialId: 'plate.carbon.hot', category: 'plate',
        spec: { lengthMm: 1000, widthMm: 2000, thicknessMm: 5, quantity: 1 },
        density: 7.85, quoteFactor: 1, processingFeeFen: 0,
      }],
    })
    expect(prisma.ledgerMetalQuote.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 'account-a', totalWeightKg: 78.5 }),
    }))
    await service.list('account-a', 0, 50)
    expect(prisma.ledgerMetalQuote.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'account-a' } }))
    await expect(service.remove('account-a', 'other-quote')).rejects.toThrow()
    expect(prisma.ledgerMetalQuote.deleteMany).toHaveBeenCalledWith({ where: { id: 'other-quote', userId: 'account-a' } })
    await expect(service.create('account-a', {
      title: '大单', items: Array.from({ length: 200 }, () => ({
        materialId: 'plate.carbon.hot', category: 'plate',
        spec: { model: '甲'.repeat(80), lengthMm: 1000, widthMm: 2000, thicknessMm: 5, quantity: 1 },
        density: 7.85, quoteFactor: 1, processingFeeFen: 0,
      })),
    })).rejects.toThrow('报价单超过 20KB')
  })

  it('会员到期后报价单只读，写入仍返回 6001', () => {
    const guard = new LedgerMembershipGuard()
    const context = (method: string, path: string) => ({
      switchToHttp: () => ({ getRequest: () => ({
        method, originalUrl: path, ledgerUser: { membership: { active: false, expired: true } },
      }) }),
    }) as any
    expect(guard.canActivate(context('GET', '/api/v1/l/tools/metal/quotes'))).toBe(true)
    expect(() => guard.canActivate(context('POST', '/api/v1/l/tools/metal/quote')))
      .toThrow(expect.objectContaining({ response: expect.objectContaining({ code: 6001 }) }))
  })
})
