import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import { CreateMetalQuoteDto } from './dto/metal-quote.dto'
import { normalizeMetalConfig } from './metal.config'
import { calculateMetalQuoteItem } from './metal.calc'

const fail = (message: string): never => { throw new BizException(BizCode.INVALID_PARAMS, message) }
const rounded = (value: number, digits: number) => Math.round((value + Number.EPSILON) * 10 ** digits) / 10 ** digits

@Injectable()
export class MetalQuoteService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateMetalQuoteDto) {
    if (Buffer.byteLength(JSON.stringify(dto), 'utf8') > 20 * 1024) fail('报价单超过 20KB')
    const title = dto.title.trim()
    if (!title) fail('请填写报价单标题')
    if (dto.customerId) {
      const customer = await this.prisma.ledgerCustomer.findFirst({ where: { id: dto.customerId, userId }, select: { id: true } })
      if (!customer) fail('客户不存在')
    }
    const row = await this.prisma.ledgerConfig.findUnique({ where: { key: 'metal' } })
    const config = normalizeMetalConfig(row?.value)
    const items = dto.items.map(item => calculateMetalQuoteItem(item, config))
    const totalWeightKg = rounded(items.reduce((sum, item) => sum + item.weightKg, 0), 6)
    const totalAmountFen = items.reduce((sum, item) => sum + item.amountFen, 0)
    if (totalAmountFen > 2_147_483_647) fail('报价单金额超出范围')
    if (Buffer.byteLength(JSON.stringify(items), 'utf8') > 20 * 1024) fail('报价单结果超过 20KB，请分单保存')
    return this.prisma.ledgerMetalQuote.create({
      data: { userId, title, customerId: dto.customerId, items, totalWeightKg, totalAmountFen },
    })
  }

  async list(userId: string, skip = 0, take = 20) {
    return this.prisma.ledgerMetalQuote.findMany({
      where: { userId }, orderBy: { createdAt: 'desc' }, skip, take,
    })
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.ledgerMetalQuote.deleteMany({ where: { id, userId } })
    if (!result.count) throw new BizException(BizCode.NOT_FOUND, '报价单不存在')
    return { deleted: true }
  }

  async get(userId: string, id: string) {
    const quote = await this.prisma.ledgerMetalQuote.findFirst({ where: { id, userId } })
    if (!quote) throw new BizException(BizCode.NOT_FOUND, '报价单不存在')
    return quote
  }
}
