import { MerchantService } from '../src/modules/merchant/merchant.service'
import { PrismaService } from '../src/prisma/prisma.service'
import { WxPayService } from '../src/modules/payment/wxpay.service'
import { ChatGateway } from '../src/modules/chat/chat.gateway'
jest.mock('nanoid', () => ({ customAlphabet: () => () => 'test-id' }))

describe('merchant product thumbnails', () => {
  const oldUrl = process.env.S3_PUBLIC_URL
  afterEach(() => {
    if (oldUrl === undefined) delete process.env.S3_PUBLIC_URL
    else process.env.S3_PUBLIC_URL = oldUrl
  })
  it.each([
    [['https://ewsn.top/oss/product/a.jpg'], 'https://ewsn.top/oss/thumb/v1/product/a.jpg.webp'],
    [[], undefined],
    [['https://other.example/a.jpg'], undefined],
    [undefined, undefined],
  ])('keeps originals and adds only eligible thumbnails', async (images, expected) => {
    process.env.S3_PUBLIC_URL = 'https://ewsn.top/oss'
    const findMany = jest.fn().mockResolvedValue([{ id: 'p1', images, priceRetailMin: 12 }])
    const prisma = { product: { findMany, count: jest.fn().mockResolvedValue(1) } }
    const service = new MerchantService(
      prisma as unknown as PrismaService,
      {} as WxPayService,
      {} as ChatGateway,
    )
    const result = await service.listProducts('owner-a', {
      status: 'active',
      keyword: 'window',
      page: 1,
    })
    expect(result.list[0].imageThumbnailUrl).toBe(expected)
    expect(result.list[0].images).toEqual(images)
    expect(result.list[0].priceRetailMin).toBe(12)
    expect(findMany.mock.calls[0][0].where).toEqual({
      merchantId: 'owner-a',
      status: 'active',
      name: { contains: 'window', mode: 'insensitive' },
    })
  })
})
