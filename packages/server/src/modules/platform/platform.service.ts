import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import { buildPage, parsePage } from '../../common/utils/pagination.util'
import { decimalToNumber } from '../../common/utils/decimal.util'
import * as argon2 from 'argon2'

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  // ========== Dashboard ==========
  async dashboard() {
    const today0 = new Date(); today0.setHours(0, 0, 0, 0)
    const yesterday0 = new Date(today0.getTime() - 86400_000)

    const [
      merchants, merchantsYday,
      orderAgg, todayOrderAgg, ydayOrderAgg,
      users, usersYday,
      pendingMerchants, pendingProducts,
      pendingAds, complaints, pendingWithdraws,
      factoryCount, storeCount,
      ymCount, yyCount, trialCount,
    ] = await Promise.all([
      this.prisma.merchant.count({ where: { status: 'active' } }),
      this.prisma.merchant.count({ where: { status: 'active', createdAt: { lt: today0 } } }),
      this.prisma.order.aggregate({ _sum: { payAmount: true }, _count: true }),
      this.prisma.order.aggregate({ where: { createdAt: { gte: today0 } }, _sum: { payAmount: true }, _count: true }),
      this.prisma.order.aggregate({ where: { createdAt: { gte: yesterday0, lt: today0 } }, _sum: { payAmount: true }, _count: true }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { lt: today0 } } }),
      this.prisma.merchant.count({ where: { status: 'pending' } }),
      this.prisma.product.count({ where: { status: 'auditing' } }),
      this.prisma.adCreative.count({ where: { status: 'pending' } }),
      this.prisma.refund.count({ where: { status: 'pending' } }),
      this.prisma.withdraw.count({ where: { status: 'pending' } }),
      this.prisma.merchant.count({ where: { type: 'factory', status: 'active' } }),
      this.prisma.merchant.count({ where: { type: 'store', status: 'active' } }),
      this.prisma.merchantMembership.count({ where: { status: { in: ['active'] }, plan: { period: 'yearly' } } }),
      this.prisma.merchantMembership.count({ where: { status: { in: ['active'] }, plan: { period: 'monthly' } } }),
      this.prisma.merchantMembership.count({ where: { status: 'trial' } }),
    ])

    const totalGmv = Number(orderAgg._sum.payAmount || 0)
    const todayGmv = Number(todayOrderAgg._sum.payAmount || 0)
    const ydayGmv = Number(ydayOrderAgg._sum.payAmount || 0)
    const gmvDelta = ydayGmv > 0 ? Math.round(((todayGmv - ydayGmv) / ydayGmv) * 100) : 0

    // 近 7 日注册趋势
    const registrationTrend: { date: string; value: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000)
      d.setHours(0, 0, 0, 0)
      const end = new Date(d.getTime() + 86400_000)
      const count = await this.prisma.user.count({ where: { createdAt: { gte: d, lt: end } } })
      registrationTrend.push({
        date: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        value: count,
      })
    }

    // 分类销量（取近 30 天订单聚合）
    const orderItems = await this.prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: new Date(Date.now() - 30 * 86400_000) } } },
      include: { product: { include: { category: true } } },
    })
    const catMap = new Map<string, number>()
    for (const it of orderItems) {
      const c = it.product?.category?.name || '其它'
      catMap.set(c, (catMap.get(c) || 0) + Number(it.unitPrice) * it.quantity)
    }
    const categorySales = Array.from(catMap.entries()).map(([category, value]) => ({ category, value: Math.round(value) }))

    return {
      overview: {
        merchants,
        merchantsDelta: merchants - merchantsYday,
        orders: orderAgg._count,
        ordersDelta: todayOrderAgg._count - ydayOrderAgg._count,
        gmv: Math.round(totalGmv),
        gmvDelta,
        users,
        usersDelta: users - usersYday,
      },
      registrationTrend,
      todos: {
        pendingMerchants,
        pendingProducts,
        pendingAds,
        complaints,
        pendingWithdraws,
      },
      merchantTypeDistribution: { factory: factoryCount, store: storeCount },
      categorySales,
      memberPlanDistribution: {
        yearly: yyCount,
        monthly: ymCount,
        trial: trialCount,
      },
    }
  }
  async stats(q: any) {
    return { period: q.period || 'today', salesTrend: [], topMerchants: [] }
  }

  // ========== 商户 ==========
  async merchants(q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = {}
    if (q.status && q.status !== 'all') where.status = q.status
    if (q.type && q.type !== 'all') where.type = q.type
    if (q.keyword) where.OR = [{ name: { contains: q.keyword } }, { legalName: { contains: q.keyword } }]
    const [list, total] = await Promise.all([
      this.prisma.merchant.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.merchant.count({ where }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }
  async auditMerchants(q: any) { return this.merchants({ ...q, status: 'pending' }) }
  async approveMerchant(id: string) {
    await this.prisma.merchant.update({ where: { id }, data: { status: 'active' } })
    await this.prisma.auditRecord.create({ data: { type: 'merchant', targetId: id, status: 'approved' } })
    return { ok: true }
  }
  async rejectMerchant(id: string, reason: string) {
    await this.prisma.merchant.update({ where: { id }, data: { status: 'rejected', rejectReason: reason } })
    await this.prisma.auditRecord.create({ data: { type: 'merchant', targetId: id, status: 'rejected', reason } })
    return { ok: true }
  }
  async pauseMerchant(id: string) {
    await this.prisma.merchant.update({ where: { id }, data: { status: 'disabled' } })
    return { ok: true }
  }
  async resumeMerchant(id: string) {
    await this.prisma.merchant.update({ where: { id }, data: { status: 'active' } })
    return { ok: true }
  }

  // ========== 订单 ==========
  async orders(q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = {}
    if (q.status && q.status !== 'all') where.status = q.status
    if (q.keyword) where.no = { contains: q.keyword }
    const [list, total] = await Promise.all([
      this.prisma.order.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { merchant: true, user: true } }),
      this.prisma.order.count({ where }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }

  // ========== 商品审核 ==========
  async auditProducts(q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const status = q.status || 'pending'
    const where: any = status === 'pending' ? { status: 'auditing' } : { status }
    if (q.keyword) where.name = { contains: q.keyword }
    const [list, total] = await Promise.all([
      this.prisma.product.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { merchant: true } }),
      this.prisma.product.count({ where }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }
  async getAuditConfig() {
    const v = await this.prisma.systemConfig.findUnique({ where: { key: 'audit_product_config' } })
    return v?.value || {
      autoApprove: false,
      conditions: [
        { key: 'vip', label: 'VIP 商家', enabled: true },
        { key: 'credit', label: '信用 A/B', enabled: true },
        { key: 'rejectRate', label: '驳回率 < 5%', enabled: true },
        { key: 'category', label: '常见品类', enabled: false },
      ],
      samplingRate: 10,
    }
  }
  async saveAuditConfig(dto: any) {
    await this.prisma.systemConfig.upsert({
      where: { key: 'audit_product_config' },
      update: { value: dto },
      create: { key: 'audit_product_config', value: dto },
    })
    return { ok: true }
  }
  async approveProduct(id: string) {
    await this.prisma.product.update({ where: { id }, data: { status: 'active' } })
    await this.prisma.auditRecord.create({ data: { type: 'product', targetId: id, status: 'approved' } })
    return { ok: true }
  }
  async rejectProduct(id: string, reason: string) {
    await this.prisma.product.update({ where: { id }, data: { status: 'rejected', rejectReason: reason } })
    await this.prisma.auditRecord.create({ data: { type: 'product', targetId: id, status: 'rejected', reason } })
    return { ok: true }
  }

  // ========== 广告 ==========
  async adSlots() { return decimalToNumber(await this.prisma.adSlot.findMany({ orderBy: { sort: 'asc' } })) }
  async createAdSlot(dto: any) { return decimalToNumber(await this.prisma.adSlot.create({ data: dto })) }
  async updateAdSlot(id: string, dto: any) { return decimalToNumber(await this.prisma.adSlot.update({ where: { id }, data: dto })) }
  async deleteAdSlot(id: string) { await this.prisma.adSlot.delete({ where: { id } }); return { ok: true } }
  async adCreatives(q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = {}
    if (q.slotId) where.slotId = q.slotId
    const [list, total] = await Promise.all([
      this.prisma.adCreative.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.adCreative.count({ where }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }
  async createAdCreative(dto: any) { return decimalToNumber(await this.prisma.adCreative.create({ data: dto })) }
  async updateAdCreative(id: string, dto: any) { return decimalToNumber(await this.prisma.adCreative.update({ where: { id }, data: dto })) }
  async deleteAdCreative(id: string) { await this.prisma.adCreative.delete({ where: { id } }); return { ok: true } }

  // ========== 选品广场推送 ==========
  async plazaPushes(q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = {}
    if (q.status) where.status = q.status
    const [list, total] = await Promise.all([
      this.prisma.plazaPush.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.plazaPush.count({ where }),
    ])
    return buildPage(list, total, page, pageSize)
  }
  async createPlazaPush(dto: any) {
    return this.prisma.plazaPush.create({
      data: {
        ...dto,
        scheduledStart: new Date(dto.scheduledStart || Date.now()),
        scheduledEnd: new Date(dto.scheduledEnd || Date.now() + 7 * 86400_000),
      },
    })
  }
  async plazaProductsAll(q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const [list, total] = await Promise.all([
      this.prisma.product.findMany({ where: { status: 'active' }, skip, take, include: { merchant: true } }),
      this.prisma.product.count({ where: { status: 'active' } }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }
  async plazaFactoriesAll() {
    return this.prisma.merchant.findMany({ where: { type: 'factory', status: 'active' }, take: 200 })
  }
  async plazaRecords(q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const [list, total] = await Promise.all([
      this.prisma.agencyApplication.findMany({ skip, take, orderBy: { createdAt: 'desc' }, include: { merchant: true } }),
      this.prisma.agencyApplication.count(),
    ])
    return buildPage(list, total, page, pageSize)
  }

  // ========== 会员套餐 ==========
  async memberPlans() {
    return decimalToNumber(await this.prisma.memberPlan.findMany({ orderBy: { sort: 'asc' } }))
  }
  async saveMemberPlan(dto: any) {
    if (dto.id) {
      const { id, ...data } = dto
      return decimalToNumber(await this.prisma.memberPlan.update({ where: { id }, data }))
    }
    return decimalToNumber(await this.prisma.memberPlan.create({ data: { ...dto, code: dto.code || `plan_${Date.now()}` } }))
  }
  async deleteMemberPlan(id: string) {
    await this.prisma.memberPlan.delete({ where: { id } })
    return { ok: true }
  }
  async planSubscriptions(planId: string) {
    return decimalToNumber(await this.prisma.merchantMembership.findMany({ where: { planId }, include: { merchant: true } }))
  }

  // ========== 会员缴费订单 ==========
  async memberPayOrders(q: any) {
    const { skip, take, page, pageSize } = parsePage(q)
    const where: any = {}
    if (q.status) where.status = q.status
    const [list, total] = await Promise.all([
      this.prisma.paymentRecord.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { merchant: true } }),
      this.prisma.paymentRecord.count({ where }),
    ])
    return buildPage(list.map(decimalToNumber), total, page, pageSize)
  }
  async updatePayStatus(id: string, status: string) {
    await this.prisma.paymentRecord.update({ where: { id }, data: { status } })
    return { ok: true }
  }
  async approveRefund(id: string) {
    await this.prisma.paymentRecord.update({ where: { id }, data: { status: 'refunded' } })
    return { ok: true }
  }
  async rejectRefund(id: string, reason: string) {
    await this.prisma.paymentRecord.update({ where: { id }, data: { status: 'paid', refundReason: reason } })
    return { ok: true }
  }

  // ========== 功能开关 ==========
  async featureFlags() { return this.prisma.featureFlag.findMany({ orderBy: { group: 'asc' } }) }
  async toggleFeatureFlag(id: string, enabled: boolean) {
    await this.prisma.featureFlag.update({ where: { id }, data: { defaultEnabled: enabled } })
    return { ok: true }
  }
  async featureFlagGray() {
    const flags = await this.prisma.featureFlag.findMany()
    return flags.map((f) => ({ key: f.key, label: f.label, grayPercent: f.grayPercent, grayWhitelist: f.grayWhitelist, audience: f.audience, scheduledAt: f.scheduledAt }))
  }
  async setFeatureFlagGray(dto: any) {
    await this.prisma.featureFlag.update({
      where: { key: dto.key },
      data: { grayPercent: dto.grayPercent ?? 100, grayWhitelist: dto.grayWhitelist || [], audience: dto.audience, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null },
    })
    return { ok: true }
  }
  async resetFeatureFlags() {
    await this.prisma.featureFlag.updateMany({ data: { grayPercent: 100, grayWhitelist: [] } })
    await this.prisma.merchantFeatureOverride.deleteMany({})
    return { ok: true }
  }

  // ========== 管理员 / 角色 ==========
  async admins() {
    const list = await this.prisma.user.findMany({
      where: { role: { in: ['admin', 'platform', 'super-admin'] } },
      include: { adminRole: true },
      orderBy: { createdAt: 'desc' },
    })
    return list.map((u) => ({
      id: u.id,
      username: u.username,
      nickname: u.nickname,
      avatar: u.avatar,
      email: u.email,
      role: u.role,
      roleName: u.adminRole?.name,
      status: u.status,
      lastLoginAt: u.lastLoginAt,
    }))
  }
  async createAdmin(dto: any) {
    const hash = await argon2.hash(dto.password || '123456')
    const u = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        nickname: dto.nickname || dto.username,
        passwordHash: hash,
        role: dto.role || 'platform',
        adminRoleId: dto.roleId,
        avatar: dto.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${dto.username}`,
      },
    })
    return { id: u.id, username: u.username }
  }
  async updateAdmin(id: string, dto: any) {
    const data: any = { ...dto }
    delete data.id
    if (dto.password) data.passwordHash = await argon2.hash(dto.password)
    delete data.password
    await this.prisma.user.update({ where: { id }, data })
    return { ok: true }
  }
  async deleteAdmin(id: string) { await this.prisma.user.delete({ where: { id } }); return { ok: true } }
  async toggleAdmin(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id } })
    if (!u) throw new BizException(BizCode.NOT_FOUND, '账号不存在')
    await this.prisma.user.update({ where: { id }, data: { status: u.status === 'active' ? 'disabled' : 'active' } })
    return { ok: true }
  }

  async roles() { return this.prisma.adminRole.findMany({ orderBy: { createdAt: 'asc' } }) }
  async saveRole(dto: any) {
    if (dto.id) {
      const { id, ...data } = dto
      return this.prisma.adminRole.update({ where: { id }, data })
    }
    return this.prisma.adminRole.create({ data: { ...dto, code: dto.code || `role_${Date.now()}` } })
  }
  async updateRole(id: string, dto: any) {
    return this.prisma.adminRole.update({ where: { id }, data: dto })
  }
  async deleteRole(id: string) { await this.prisma.adminRole.delete({ where: { id } }); return { ok: true } }

  // ========== 系统配置 ==========
  async systemSettings() {
    const v = await this.prisma.systemConfig.findUnique({ where: { key: 'system_settings' } })
    return v?.value || {
      site: { name: '经纬科技', logo: '', icp: '' },
      payment: { wechat: { enabled: true }, alipay: { enabled: false }, balance: { enabled: true } },
      logistics: { providers: ['顺丰', '京东', '中通'], defaultFreight: 10 },
      service: { phone: '400-000-0000', email: 'support@jiujiu.com', workTime: '9:00-18:00' },
      security: { passwordPolicy: { minLength: 8, requireUppercase: true }, ipWhitelist: [] },
    }
  }
  async saveSystemSettings(dto: any) {
    await this.prisma.systemConfig.upsert({
      where: { key: 'system_settings' },
      update: { value: dto },
      create: { key: 'system_settings', value: dto },
    })
    return { ok: true }
  }
}
