/**
 * 法律协议 · 服务
 *
 * 单一真源：SystemConfig（key=legal_agreements）的 value 字段。
 * 后台未配置时返回默认企业级文本。
 * 用户端公开读取，平台端管理员可写。
 */
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import {
  DEFAULT_LEGAL_AGREEMENTS,
  LEGAL_AGREEMENTS_KEY,
  type LegalAgreements,
} from './legal.defaults'

@Injectable()
export class LegalService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<LegalAgreements> {
    const row = await this.prisma.systemConfig.findUnique({
      where: { key: LEGAL_AGREEMENTS_KEY },
    })
    const stored = (row?.value as Partial<LegalAgreements>) || {}
    // 与默认值做 deep merge，避免后台只更了一项时其他两项为空
    return {
      user: { ...DEFAULT_LEGAL_AGREEMENTS.user, ...(stored.user || {}) },
      privacy: { ...DEFAULT_LEGAL_AGREEMENTS.privacy, ...(stored.privacy || {}) },
      collect: { ...DEFAULT_LEGAL_AGREEMENTS.collect, ...(stored.collect || {}) },
    }
  }

  async save(dto: Partial<LegalAgreements>): Promise<{ ok: true }> {
    const current = await this.list()
    const merged: LegalAgreements = {
      user: { ...current.user, ...(dto.user || {}) },
      privacy: { ...current.privacy, ...(dto.privacy || {}) },
      collect: { ...current.collect, ...(dto.collect || {}) },
    }
    // 写入时记录更新时间（按 key 单独刷新）
    const today = new Date().toISOString().slice(0, 10)
    for (const k of ['user', 'privacy', 'collect'] as const) {
      if (dto[k] && (dto[k]!.body || dto[k]!.title)) merged[k].updatedAt = today
    }
    await this.prisma.systemConfig.upsert({
      where: { key: LEGAL_AGREEMENTS_KEY },
      update: { value: merged as any },
      create: { key: LEGAL_AGREEMENTS_KEY, value: merged as any },
    })
    return { ok: true }
  }
}
