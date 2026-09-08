import { Injectable } from '@nestjs/common'
import { createHash, randomUUID } from 'crypto'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../../prisma/prisma.service'
import { BizCode, BizException } from '../../../common/exceptions/biz.exception'
import {
  applyOperation,
  check,
  clone,
  emptyBook,
  Entity,
  Operation,
  rows,
  Workbook,
} from './domain'

const digest = (v: string | Buffer) => createHash('sha256').update(v).digest('hex')
@Injectable()
export class WorkbookService {
  constructor(private readonly prisma: PrismaService) {}
  private async ensure(tx: Prisma.TransactionClient, userId: string) {
    let account = await tx.ledgerWorkbook.findUnique({ where: { userId } })
    if (account) return account
    const legacy = await tx.ledgerWorkLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    })
    const book = emptyBook()
    for (const r of legacy) {
      const workerId = 'old_' + digest(JSON.stringify([r.workerName, r.jobType || ''])).slice(0, 24)
      const updatedAt = r.updatedAt.toISOString()
      book.workers[workerId] = {
        id: workerId,
        version: 1,
        deleted: false,
        updatedAt,
        name: r.workerName,
        jobType: r.jobType || '',
        phone: '',
        mode: r.unit,
        rateFen: r.unitPrice * 100,
        status: 'active',
      }
      book.entries[r.id] = {
        id: r.id,
        version: 1,
        deleted: false,
        updatedAt,
        workerId,
        projectId: '',
        workDate: r.workDate.toISOString().slice(0, 10),
        mode: r.unit,
        quantity100: Math.round(Number(r.quantity) * 100),
        rateFen: r.unitPrice * 100,
        attendance: 'work',
        overtimeQuantity100: 0,
        overtimeRateFen: 0,
        bonusFen: 0,
        subsidyFen: 0,
        deductionFen: 0,
        note: r.note || '',
        tags: '',
        attachmentIds: [],
        amountFen: r.amount * 100,
        legacyAmountFen: r.amount * 100,
      }
    }
    // Historical rows are imported without recalculating rounded integer-yuan wages.
    account = await tx.ledgerWorkbook.create({ data: { userId, data: book as any } })
    return account
  }
  private async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(fn, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 30000,
        })
      } catch (e: any) {
        if (['P2034', 'P2002'].includes(e?.code) && attempt < 3) continue
        throw e
      }
    }
  }
  async snapshot(userId: string) {
    return this.transaction(async (tx) => {
      const a = await this.ensure(tx, userId)
      const receipts = await tx.ledgerWorkbookOperation.findMany({
        where: { userId },
        select: { operationId: true },
      })
      return { book: a.data, revision: a.revision, applied: receipts.map((r) => r.operationId) }
    })
  }
  async changes(userId: string, cursor: number) {
    const changes = await this.prisma.ledgerWorkbookOperation.findMany({
      where: { userId, revision: { gt: cursor } },
      orderBy: { revision: 'asc' },
      take: 100,
    })
    return {
      changes: changes.map((c) => ({ revision: c.revision, operation: c.operation })),
      cursor: changes.length ? changes[changes.length - 1].revision : cursor,
      hasMore: changes.length === 100,
    }
  }
  async sync(userId: string, operation: Operation) {
    try {
      check(operation && typeof operation.id === 'string', '操作格式错误')
      const hash = digest(JSON.stringify(operation))
      return await this.transaction(async (tx) => {
        const previous = await tx.ledgerWorkbookOperation.findUnique({
          where: { userId_operationId: { userId, operationId: operation.id } },
        })
        if (previous) {
          check(previous.digest === hash, '同一操作编号不能提交不同内容')
          return { revision: previous.revision, replayed: true }
        }
        const current = await this.ensure(tx, userId)
        const next = applyOperation(current.data as unknown as Workbook, clone(operation))
        const revision = current.revision + 1
        await tx.ledgerWorkbook.update({ where: { userId }, data: { revision, data: next as any } })
        await tx.ledgerWorkbookOperation.create({
          data: {
            userId,
            operationId: operation.id,
            revision,
            digest: hash,
            operation: operation as any,
          },
        })
        return { revision, replayed: false }
      })
    } catch (e: any) {
      if (e instanceof BizException) throw e
      if (e?.code) throw e
      throw new BizException(BizCode.INVALID_PARAMS, e.message || '台账保存失败')
    }
  }
  async upload(userId: string, id: string, file: any) {
    check(
      /^[a-zA-Z0-9_-]{1,100}$/.test(id) && !['__proto__', 'constructor', 'prototype'].includes(id),
      '凭证编号错误',
    )
    check(file?.buffer?.length > 0 && file.size <= 5 * 1024 * 1024, '请选择不超过 5MB 的图片')
    const b: Buffer = file.buffer
    const mime =
      b[0] === 0xff && b[1] === 0xd8
        ? 'image/jpeg'
        : b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? 'image/png'
          : b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP'
            ? 'image/webp'
            : ''
    check(!!mime, '凭证不是有效图片')
    const hash = digest(b)
    const old = await this.prisma.ledgerWorkbookAttachment.findUnique({
      where: { userId_id: { userId, id } },
    })
    if (old) {
      check(old.digest === hash, '凭证不可覆盖，请新增图片')
      return { id, mime, size: b.length }
    }
    await this.prisma.ledgerWorkbookAttachment.create({
      data: { id, userId, mime, size: b.length, digest: hash, content: b },
    })
    return { id, mime, size: b.length }
  }
  async attachment(userId: string, id: string) {
    const a = await this.prisma.ledgerWorkbookAttachment.findUnique({
      where: { userId_id: { userId, id } },
    })
    if (!a) throw new BizException(BizCode.NOT_FOUND, '凭证不存在')
    return a
  }
  private compatible(e: Entity) {
    return (
      ['day', 'hour'].includes(e.mode) &&
      e.rateFen % 100 === 0 &&
      e.amountFen % 100 === 0 &&
      !e.overtimeQuantity100 &&
      !e.bonusFen &&
      !e.subsidyFen &&
      !e.deductionFen &&
      e.attendance === 'work'
    )
  }
  private oldRow(e: Entity, b: Workbook) {
    return {
      id: e.id,
      workDate: e.workDate,
      workerName: b.workers[e.workerId].name,
      jobType: b.workers[e.workerId].jobType,
      unit: e.mode,
      quantity: e.quantity100 / 100,
      unitPrice: e.rateFen / 100,
      amount: e.amountFen / 100,
      note: e.note,
    }
  }
  async legacyList(userId: string, month: string) {
    const { book: raw } = await this.snapshot(userId)
    const b = raw as unknown as Workbook
    const es = rows(b, 'entries')
      .filter((e) => e.workDate.startsWith(month) && this.compatible(e))
      .sort((a, b) => b.workDate.localeCompare(a.workDate))
    return {
      month,
      list: es.map((e) => this.oldRow(e, b)),
      summary: {
        totalAmount: es.reduce((n, e) => n + e.amountFen / 100, 0),
        dayQuantity: es
          .filter((e) => e.mode === 'day')
          .reduce((n, e) => n + e.quantity100 / 100, 0),
        hourQuantity: es
          .filter((e) => e.mode === 'hour')
          .reduce((n, e) => n + e.quantity100 / 100, 0),
        count: es.length,
      },
    }
  }
  async legacyWrite(userId: string, id: string | undefined, dto: any, remove = false) {
    const { book: raw } = await this.snapshot(userId)
    const b = raw as unknown as Workbook
    const old = id ? b.entries[id] : undefined
    if (id) check(old && !old.deleted && this.compatible(old), '请使用新版记工查看和编辑该记录')
    const merged = { ...(old ? this.oldRow(old, b) : {}), ...dto }
    const changes: any[] = []
    const workerName = merged.workerName
    let worker = rows(b, 'workers').find(
      (w) => w.name === workerName && w.jobType === (merged.jobType || ''),
    )
    if (!worker) {
      const wid = randomUUID()
      worker = {
        id: wid,
        version: 1,
        deleted: false,
        updatedAt: new Date().toISOString(),
        name: workerName,
        jobType: merged.jobType || '',
        phone: '',
        mode: merged.unit,
        rateFen: merged.unitPrice * 100,
        status: 'active',
      }
      changes.push({ collection: 'workers', id: wid, baseVersion: 0, value: worker })
    }
    const entryId = id || randomUUID()
    const value = {
      ...old,
      workerId: worker.id,
      projectId: old?.projectId || '',
      workDate: merged.workDate.slice(0, 10),
      mode: merged.unit,
      quantity100: Math.round(merged.quantity * 100),
      rateFen: merged.unitPrice * 100,
      attendance: 'work',
      overtimeQuantity100: 0,
      overtimeRateFen: 0,
      bonusFen: 0,
      subsidyFen: 0,
      deductionFen: 0,
      note: merged.note || '',
      tags: old?.tags || '',
      attachmentIds: old?.attachmentIds || [],
      deleted: remove,
    }
    changes.push({ collection: 'entries', id: entryId, baseVersion: old?.version || 0, value })
    await this.sync(userId, {
      id: randomUUID(),
      at: new Date().toISOString(),
      label: remove ? '旧端删除记工' : '旧端保存记工',
      changes,
    })
    if (remove) return { id: entryId }
    const { book } = await this.snapshot(userId)
    return this.oldRow((book as any).entries[entryId], book as unknown as Workbook)
  }
}
