import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals'
jest.mock('nanoid', () => ({ customAlphabet: () => () => 'test-id' }))
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { APP_GUARD, Reflector } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { JwtAuthGuard } from '../src/common/guards/jwt.guard'
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor'
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter'
import { PrismaService } from '../src/prisma/prisma.service'
import { MetalToolController } from '../src/modules/ledger/metal-tool.controller'
import { MetalQuoteService } from '../src/modules/ledger/metal-quote.service'
import { LedgerJwtGuard } from '../src/modules/ledger/guards/ledger-jwt.guard'
import { LedgerMembershipGuard } from '../src/modules/ledger/guards/ledger-membership.guard'

describe('金属工具真实 HTTP 鉴权与限流', () => {
  let app: INestApplication
  let base: string
  let quotes: any[] = []
  const call = async (path: string, token = '', method = 'GET', body?: unknown) => {
    const response = await fetch(base + path, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: response.status, body: await response.json() as any }
  }
  const input = {
    title: '六类材料样品', items: [{
      materialId: 'plate.carbon.hot', category: 'plate',
      spec: { lengthMm: 1000, widthMm: 2000, thicknessMm: 5, quantity: 1 },
      density: 7.85, quoteFactor: 1, processingFeeFen: 0,
      amountFen: 1, tonPriceFen: 1,
    }],
  }

  beforeAll(async () => {
    const prisma = {
      ledgerConfig: { findUnique: async () => null },
      ledgerUser: { findUnique: async ({ where }: any) => ({
        id: where.id, nickname: '测试', status: 'active',
        membership: { expiresAt: new Date(where.id === 'expired' ? '2000-01-01' : '2099-01-01') },
      }) },
      ledgerMetalQuote: {
        create: async ({ data }: any) => {
          const quote = { ...data, id: 'quote-' + quotes.length, createdAt: new Date().toISOString() }
          quotes.push(quote)
          return quote
        },
        findMany: async ({ where, skip, take }: any) => quotes.filter(row => row.userId === where.userId).slice(skip, skip + take),
        findFirst: async ({ where }: any) => quotes.find(row => row.id === where.id && row.userId === where.userId) || null,
        deleteMany: async ({ where }: any) => {
          const count = quotes.filter(row => row.id === where.id && row.userId === where.userId).length
          quotes = quotes.filter(row => row.id !== where.id || row.userId !== where.userId)
          return { count }
        },
      },
    }
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ name: 'default', limit: 100, ttl: 60_000 }])],
      controllers: [MetalToolController],
      providers: [
        MetalQuoteService, LedgerJwtGuard, LedgerMembershipGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { verifyAsync: async (token: string) => ({
          sub: token, scope: token === 'mall' ? 'mall' : 'ledger',
        }) } },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()
    app = module.createNestApplication()
    app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)))
    app.useGlobalFilters(new GlobalExceptionFilter())
    await app.listen(0, '127.0.0.1')
    base = await app.getUrl() + '/api/v1/l/tools/metal/'
  })
  afterAll(async () => { await app?.close() })

  it('游客读配置；未登录、商城 token 和无会员写操作被拒绝', async () => {
    const config = await call('config')
    expect(config.status).toBe(200)
    expect(config.body.code).toBe(0)
    expect(config.body.data.materials).toHaveLength(65)
    const guestWrite = await call('quote', '', 'POST', input)
    expect(guestWrite.status).toBe(200)
    expect(guestWrite.body.code).toBe(2001)
    expect((await call('quote', 'mall', 'POST', input)).body.code).toBe(2001)
    const expired = await call('quote', 'expired', 'POST', input)
    expect(expired.status).toBe(200)
    expect(expired.body.code).toBe(6001)
  })

  it('会员保存重算，账号隔离，到期仍可读自己的数据，导出与删除被拦截', async () => {
    const saved = await call('quote', 'member', 'POST', input)
    expect(saved.status).toBe(200)
    expect(saved.body.data.totalWeightKg).toBe(78.5)
    expect(saved.body.data.totalAmountFen).toBe(25952)
    expect(saved.body.data.items[0].tonPriceFen).toBe(330600)
    const id = saved.body.data.id
    expect((await call('quotes', 'other')).body.data).toEqual([])
    quotes.push({ ...saved.body.data, id: 'expired-history', userId: 'expired' })
    expect((await call('quotes', 'expired')).body.data).toHaveLength(1)
    expect((await call('quotes/expired-history/export', 'expired', 'POST')).body.code).toBe(6001)
    expect((await call('quotes/expired-history', 'expired', 'DELETE')).body.code).toBe(6001)
    expect((await call('quotes/' + id + '/export', 'member', 'POST')).body.data.id).toBe(id)
    expect((await call('quotes/' + id + '/export', 'other', 'POST')).body.code).toBe(1002)
    expect((await call('quotes/' + id, 'other', 'DELETE')).body.code).toBe(1002)
  })

  it('每页最多 50，嵌套非法输入拒绝，配置第 61 次触发单桶限流', async () => {
    const invalidQuery = await call('quotes?take=51', 'member')
    expect(invalidQuery.status).toBe(200)
    expect(invalidQuery.body.code).toBe(1001)
    const invalidItem = await call('quote', 'member', 'POST', { ...input, items: [{ ...input.items[0], density: -1 }] })
    expect(invalidItem.status).toBe(200)
    expect(invalidItem.body.code).toBe(1001)
    for (let index = 0; index < 59; index++) expect((await call('config')).status).toBe(200)
    const limited = await call('config')
    expect(limited.status).toBe(200)
    expect(limited.body.code).toBe(429)
    expect(limited.body).toEqual(expect.objectContaining({ data: null, message: expect.any(String), msg: expect.any(String), traceId: expect.any(String), timestamp: expect.any(Number) }))
  })
})
