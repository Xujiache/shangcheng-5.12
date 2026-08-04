import { Injectable, Logger } from '@nestjs/common'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import { PrismaService } from '../../prisma/prisma.service'
import { BizException, BizCode } from '../../common/exceptions/biz.exception'
import { sanitizeExtras, sanitizeCustomCosts, sanitizeOrderItems } from './ledger.constants'

// 导出包对称密钥：优先专用 env，缺省回退 JWT_SECRET 派生（务必生产配置 LEDGER_EXPORT_SECRET）
const EXPORT_SECRET =
  process.env.LEDGER_EXPORT_SECRET || process.env.JWT_SECRET || 'ledger-export-fallback'
const EXPORT_KEY = scryptSync(EXPORT_SECRET, 'ledger-export-salt-v1', 32)
const PKG_PREFIX = 'LJBK1.' // 数据包前缀标识
const MAX_IMPORT_ORDERS = 5000

const int = (x: unknown) => Math.max(0, Math.round(Number(x) || 0))

@Injectable()
export class LedgerExtraService {
  private readonly logger = new Logger('LedgerExtra')
  constructor(private readonly prisma: PrismaService) {}

  // ── 更新日志 ─────────────────────────────────────────────
  /** 客户端：全部已发布更新日志（更新日志页）。 */
  async changelogList() {
    const rows = await this.prisma.ledgerChangelog.findMany({
      where: { published: true },
      orderBy: { version: 'desc' },
    })
    return rows.map((r) => ({
      version: r.version,
      title: r.title,
      content: r.content,
      date: r.createdAt,
    }))
  }

  /** 客户端：某版本的更新日志（用于首开弹窗，按版本定向）。无则返回 null。 */
  async changelogByVersion(version: string) {
    const v = String(version || '').trim()
    if (!v) return null
    const r = await this.prisma.ledgerChangelog.findFirst({
      where: { version: v, published: true },
    })
    if (!r) return null
    return { version: r.version, title: r.title, content: r.content, date: r.createdAt }
  }

  /** 后台：全部（含未发布）。 */
  async changelogAll() {
    return this.prisma.ledgerChangelog.findMany({ orderBy: { version: 'desc' } })
  }
  async changelogCreate(dto: {
    version: string
    title: string
    content: string
    published?: boolean
  }) {
    const version = String(dto.version || '').trim()
    const title = String(dto.title || '').trim()
    const content = String(dto.content || '').trim()
    if (!version) throw new BizException(BizCode.INVALID_PARAMS, '请填写版本号')
    if (!title) throw new BizException(BizCode.INVALID_PARAMS, '请填写标题')
    const dup = await this.prisma.ledgerChangelog.findUnique({ where: { version } })
    if (dup) throw new BizException(BizCode.CONFLICT, `版本 ${version} 的更新日志已存在`)
    return this.prisma.ledgerChangelog.create({
      data: {
        version: version.slice(0, 20),
        title: title.slice(0, 60),
        content: content.slice(0, 4000),
        published: dto.published !== false,
      },
    })
  }
  async changelogUpdate(
    id: string,
    dto: { version?: string; title?: string; content?: string; published?: boolean },
  ) {
    const exist = await this.prisma.ledgerChangelog.findUnique({ where: { id } })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '更新日志不存在')
    const data: any = {}
    if (dto.version !== undefined) {
      const v = String(dto.version).trim()
      if (!v) throw new BizException(BizCode.INVALID_PARAMS, '版本号不能为空')
      if (v !== exist.version) {
        const dup = await this.prisma.ledgerChangelog.findUnique({ where: { version: v } })
        if (dup) throw new BizException(BizCode.CONFLICT, `版本 ${v} 已存在`)
      }
      data.version = v.slice(0, 20)
    }
    if (dto.title !== undefined) data.title = String(dto.title).trim().slice(0, 60)
    if (dto.content !== undefined) data.content = String(dto.content).trim().slice(0, 4000)
    if (dto.published !== undefined) data.published = !!dto.published
    return this.prisma.ledgerChangelog.update({ where: { id }, data })
  }
  async changelogRemove(id: string) {
    const exist = await this.prisma.ledgerChangelog.findUnique({ where: { id } })
    if (!exist) throw new BizException(BizCode.NOT_FOUND, '更新日志不存在')
    await this.prisma.ledgerChangelog.delete({ where: { id } })
    return { ok: true }
  }

  // ── 加密数据导出 / 导入 ──────────────────────────────────
  private encrypt(obj: unknown): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', EXPORT_KEY, iv)
    const plain = Buffer.from(JSON.stringify(obj), 'utf8')
    const enc = Buffer.concat([cipher.update(plain), cipher.final()])
    const tag = cipher.getAuthTag()
    // iv(12) + tag(16) + enc
    return PKG_PREFIX + Buffer.concat([iv, tag, enc]).toString('base64')
  }
  private decrypt(token: string): any {
    const t = String(token || '').trim()
    if (!t.startsWith(PKG_PREFIX))
      throw new BizException(BizCode.INVALID_PARAMS, '数据包格式不正确')
    let raw: Buffer
    try {
      raw = Buffer.from(t.slice(PKG_PREFIX.length), 'base64')
    } catch (e) {
      throw new BizException(BizCode.INVALID_PARAMS, '数据包已损坏')
    }
    if (raw.length < 29) throw new BizException(BizCode.INVALID_PARAMS, '数据包已损坏')
    const iv = raw.subarray(0, 12)
    const tag = raw.subarray(12, 28)
    const enc = raw.subarray(28)
    try {
      const decipher = createDecipheriv('aes-256-gcm', EXPORT_KEY, iv)
      decipher.setAuthTag(tag)
      const dec = Buffer.concat([decipher.update(enc), decipher.final()]) // 篡改/换密钥 → 抛错
      return JSON.parse(dec.toString('utf8'))
    } catch (e) {
      throw new BizException(BizCode.INVALID_PARAMS, '数据包无效或已被篡改')
    }
  }

  /** 导出该用户全部订单+客户为加密数据包。allowShare 决定他人能否导入。 */
  async exportData(userId: string, allowShare: boolean) {
    const [orders, customers] = await Promise.all([
      this.prisma.ledgerOrder.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
      this.prisma.ledgerCustomer.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    ])
    const payload = {
      v: 1,
      owner: userId,
      allowShare: !!allowShare,
      exportedAt: new Date().toISOString(),
      data: {
        customers: customers.map((c) => ({
          name: c.name,
          phone: c.phone,
          address: c.address,
          note: c.note,
        })),
        orders: orders.map((o) => ({
          date: o.date,
          customerName: o.customerName,
          total: o.total,
          received: o.received,
          deposit: o.deposit,
          discount: o.discount,
          recycle: o.recycle,
          costProfile: o.costProfile,
          costGlass: o.costGlass,
          costHardware: o.costHardware,
          costLabor: o.costLabor,
          costScreen: o.costScreen,
          extras: o.extras,
          customCosts: o.customCosts,
          items: o.items,
          note: o.note,
        })),
      },
    }
    return {
      package: this.encrypt(payload),
      orders: orders.length,
      customers: customers.length,
      allowShare: !!allowShare,
    }
  }

  /** 导入加密数据包到当前用户。非本人导出且 allowShare=false 时拒绝。 */
  async importData(userId: string, token: string) {
    const pkg = this.decrypt(token)
    if (!pkg || pkg.v !== 1 || !pkg.data)
      throw new BizException(BizCode.INVALID_PARAMS, '数据包格式不支持')
    if (pkg.owner !== userId && !pkg.allowShare)
      throw new BizException(BizCode.FORBIDDEN, '该数据包未开启共享，不允许被他人导入')
    const data = pkg.data || {}
    const customers: any[] = Array.isArray(data.customers) ? data.customers : []
    const orders: any[] = Array.isArray(data.orders) ? data.orders : []
    if (orders.length > MAX_IMPORT_ORDERS)
      throw new BizException(BizCode.INVALID_PARAMS, '数据包过大，无法导入')

    // 客户：按名称去重（已存在则复用），建立 名称→id 映射
    const existing = await this.prisma.ledgerCustomer.findMany({
      where: { userId },
      select: { id: true, name: true },
    })
    const nameMap = new Map<string, string>(existing.map((c) => [c.name, c.id]))
    let custAdded = 0
    for (const c of customers) {
      const name = String(c?.name || '').trim()
      if (!name || nameMap.has(name)) continue
      const created = await this.prisma.ledgerCustomer.create({
        data: {
          userId,
          name: name.slice(0, 40),
          phone: c.phone ? String(c.phone).slice(0, 20) : null,
          address: c.address ? String(c.address).slice(0, 200) : null,
          note: c.note ? String(c.note).slice(0, 500) : null,
        },
      })
      nameMap.set(name, created.id)
      custAdded++
    }

    let orderAdded = 0
    for (const o of orders) {
      const customerName = String(o?.customerName || '').trim()
      const customerId =
        customerName && nameMap.has(customerName) ? nameMap.get(customerName)! : null
      const d = o?.date ? new Date(o.date) : new Date()
      await this.prisma.ledgerOrder.create({
        data: {
          userId,
          customerId,
          customerName,
          date: isNaN(d.getTime()) ? new Date() : d,
          total: int(o.total),
          received: int(o.received),
          deposit: int(o.deposit),
          discount: int(o.discount),
          recycle: int(o.recycle),
          costProfile: int(o.costProfile),
          costGlass: int(o.costGlass),
          costHardware: int(o.costHardware),
          costLabor: int(o.costLabor),
          costScreen: int(o.costScreen),
          extras: sanitizeExtras(o.extras) as any,
          customCosts: sanitizeCustomCosts(o.customCosts) as any,
          items: sanitizeOrderItems(o.items) as any,
          note: o.note ? String(o.note).slice(0, 500) : null,
        },
      })
      orderAdded++
    }
    return { ok: true, customers: custAdded, orders: orderAdded }
  }
}
