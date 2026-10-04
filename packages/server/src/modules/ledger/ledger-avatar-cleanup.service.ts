import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'
import { FilesService } from '../files/files.service'
import { ledgerAvatarImageId } from './ledger-avatar.util'

@Injectable()
export class LedgerAvatarCleanupService {
  private readonly logger = new Logger(LedgerAvatarCleanupService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
  ) {}

  @Cron('0 17 * * * *')
  async cleanup() {
    try {
      const users = await this.prisma.ledgerUser.findMany({
        where: { avatar: { not: null } },
        select: { avatar: true },
      })
      const referenced = new Set(
        users.map((user) => ledgerAvatarImageId(user.avatar)).filter((id): id is string => !!id),
      )
      const removed = await this.files.cleanupOrphanLedgerAvatars(
        referenced,
        new Date(Date.now() - 60 * 60 * 1000),
      )
      if (removed) this.logger.log(`cleaned ${removed} orphan ledger avatar files`)
    } catch (error: any) {
      this.logger.warn(`ledger avatar cleanup failed: ${error?.message || error}`)
    }
  }
}
