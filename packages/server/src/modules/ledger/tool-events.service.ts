import { Injectable } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { BizCode, BizException } from '../../common/exceptions/biz.exception'
import { PrismaService } from '../../prisma/prisma.service'

export const TOOL_KEYS = [
  'triangle', 'arc', 'cut', 'work-log', 'format',
  'rmb', 'retire', 'level', 'glass', 'glass-weight', 'luban', 'tide',
] as const
export type ToolKey = (typeof TOOL_KEYS)[number]
export type ToolStatus = 'open' | 'success' | 'failure'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const STATUSES = ['open', 'success', 'failure']

function invalid(): never {
  throw new BizException(BizCode.INVALID_PARAMS, '工具事件参数不正确')
}

function strictObject(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid()
  const record = value as Record<string, unknown>
  if (Object.keys(record).some((key) => !keys.includes(key))) invalid()
  return record
}

function dateInput(value: unknown): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(value)) invalid()
  const date = new Date(value)
  if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now() + 5 * 60_000) invalid()
  return date
}

export function serverEventId(tool: ToolKey, sourceId: string, status: ToolStatus): string {
  const hex = createHash('sha256').update(`${tool}:${sourceId}:${status}`).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

@Injectable()
export class ToolEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(userId: string, body: unknown) {
    const request = strictObject(body, ['events'])
    if (!Array.isArray(request.events) || !request.events.length || request.events.length > 100) invalid()
    const events = request.events.map((raw) => {
      const event = strictObject(raw, ['id', 'tool', 'status', 'occurredAt'])
      if (typeof event.id !== 'string' || !UUID.test(event.id)) invalid()
      if (!TOOL_KEYS.includes(event.tool as ToolKey) || !STATUSES.includes(event.status as string)) invalid()
      if (['format', 'glass', 'glass-weight'].includes(event.tool as string) && event.status !== 'open') invalid()
      return {
        id: event.id as string,
        userId,
        tool: event.tool as string,
        status: event.status as string,
        occurredAt: dateInput(event.occurredAt),
      }
    })
    if (new Set(events.map((event) => event.id)).size !== events.length) invalid()
    const created = await this.prisma.ledgerToolEvent.createMany({ data: events, skipDuplicates: true })
    return { accepted: events.length, inserted: created.count }
  }

  async recordServerEvent(userId: string, tool: ToolKey, status: ToolStatus, sourceId: string, occurredAt = new Date()) {
    const id = serverEventId(tool, sourceId, status)
    await this.prisma.ledgerToolEvent.createMany({
      data: [{ id, userId, tool, status, occurredAt }],
      skipDuplicates: true,
    })
  }

  async summary(userId: string) {
    await this.requireUser(userId)
    const now = new Date()
    const today = new Date(now.getTime() + 8 * 3600_000)
    today.setUTCHours(0, 0, 0, 0)
    today.setTime(today.getTime() - 8 * 3600_000)
    const d7 = new Date(now.getTime() - 7 * 86400_000)
    const d30 = new Date(now.getTime() - 30 * 86400_000)
    const [rows, todayRows, weekRows, monthRows] = await Promise.all([
      this.prisma.ledgerToolEvent.groupBy({ by: ['tool', 'status'], where: { userId }, _count: { _all: true } }),
      ...[today, d7, d30].map((date) => this.prisma.ledgerToolEvent.groupBy({
        by: ['tool'], where: { userId, occurredAt: { gte: date } }, _count: { _all: true },
      })),
    ])
    const tools = Object.fromEntries(TOOL_KEYS.map((tool) => [tool, {
      today: 0, last7Days: 0, last30Days: 0, all: 0,
      byStatus: { open: 0, success: 0, failure: 0 },
    }])) as Record<ToolKey, { today: number; last7Days: number; last30Days: number; all: number; byStatus: Record<ToolStatus, number> }>
    for (const row of rows) {
      const item = tools[row.tool as ToolKey]
      if (!item || !STATUSES.includes(row.status)) continue
      item.all += row._count._all
      item.byStatus[row.status as ToolStatus] += row._count._all
    }
    for (const [key, result] of [['today', todayRows], ['last7Days', weekRows], ['last30Days', monthRows]] as const) {
      for (const row of result) if (tools[row.tool as ToolKey]) tools[row.tool as ToolKey][key] = row._count._all
    }
    return { label: '已同步使用记录', timezone: 'Asia/Shanghai', tools }
  }

  async timeline(userId: string, query: Record<string, unknown>) {
    await this.requireUser(userId)
    const allowed = ['tool', 'status', 'from', 'to', 'page', 'pageSize']
    if (Object.keys(query).some((key) => !allowed.includes(key))) invalid()
    if (query.tool && !TOOL_KEYS.includes(query.tool as ToolKey)) invalid()
    if (query.status && !STATUSES.includes(query.status as string)) invalid()
    const page = query.page === undefined ? 1 : Number(query.page)
    const pageSize = query.pageSize === undefined ? 20 : Number(query.pageSize)
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) invalid()
    const from = query.from === undefined ? undefined : dateInput(query.from)
    const to = query.to === undefined ? undefined : dateInput(query.to)
    if (from && to && from > to) invalid()
    const where = {
      userId,
      ...(query.tool ? { tool: query.tool as string } : {}),
      ...(query.status ? { status: query.status as string } : {}),
      ...(from || to ? { occurredAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    }
    const [total, items] = await this.prisma.$transaction([
      this.prisma.ledgerToolEvent.count({ where }),
      this.prisma.ledgerToolEvent.findMany({ where, select: {
        id: true, tool: true, status: true, occurredAt: true, receivedAt: true,
      }, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
    ])
    return { label: '已同步使用记录', total, page, pageSize, items }
  }

  private async requireUser(userId: string) {
    if (!await this.prisma.ledgerUser.findUnique({ where: { id: userId }, select: { id: true } })) {
      throw new BizException(BizCode.NOT_FOUND, '账号不存在')
    }
  }
}
