import 'reflect-metadata'
import { PrismaClient } from '@prisma/client'
import { WorkbookService } from '../src/modules/ledger/workbook/workbook.service'
async function main() {
  if (!process.env.DATABASE_URL)
    throw Error('DATABASE_URL is required; no implicit production environment is loaded')
  const apply = process.argv.includes('--apply')
  const all = process.argv.includes('--all')
  const arg = process.argv.find((x) => x.startsWith('--user='))
  const userId = arg?.slice(7)
  if (apply && !all && !userId) throw Error('Apply requires --all or --user=<ledger-user-id>')
  const db = new PrismaClient()
  const svc = new WorkbookService(db as any)
  let checked = 0,
    created = 0
  try {
    let cursor: string | undefined
    for (;;) {
      const users = await db.ledgerUser.findMany({
        where: userId ? { id: userId } : {},
        orderBy: { id: 'asc' },
        take: 100,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          workbook: { select: { userId: true } },
          _count: { select: { workLogs: true } },
        },
      })
      if (!users.length) break
      for (const u of users) {
        checked++
        if (!u.workbook) {
          created++
          if (apply) await svc.snapshot(u.id)
        }
      }
      cursor = users[users.length - 1].id
      if (userId) break
    }
    console.log(
      JSON.stringify({
        mode: apply ? 'apply' : 'dry-run',
        checked,
        accountsRequiringBackfill: created,
      }),
    )
  } finally {
    await db.$disconnect()
  }
}
main().catch((e) => {
  console.error(e.message)
  process.exitCode = 1
})
