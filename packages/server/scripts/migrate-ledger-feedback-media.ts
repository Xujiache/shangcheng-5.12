import { PrismaClient } from '@prisma/client'
import { Client } from 'minio'
import { createHash } from 'node:crypto'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const verify = process.argv.includes('--verify')
if (apply && !process.argv.includes('--backup-confirmed'))
  throw new Error('--apply requires --backup-confirmed')

const publicBucket = process.env.S3_BUCKET || 'jiujiu-mall'
const privateBucket = process.env.S3_PRIVATE_BUCKET || ''
const publicPrefix = (process.env.S3_PUBLIC_URL || '').replace(/\/$/, '') + '/feedback/'
if (!process.env.S3_PUBLIC_URL || !privateBucket || privateBucket === publicBucket)
  throw new Error('S3_PUBLIC_URL and distinct S3_PRIVATE_BUCKET are required')

const endpoint = new URL(process.env.S3_ENDPOINT || 'http://localhost:9000')
const client = new Client({
  endPoint: endpoint.hostname,
  port: Number(endpoint.port) || (endpoint.protocol === 'https:' ? 443 : 80),
  useSSL: endpoint.protocol === 'https:',
  accessKey: process.env.S3_ACCESS_KEY || '',
  secretKey: process.env.S3_SECRET_KEY || '',
})

async function hashObject(bucket: string, key: string) {
  const hash = createHash('sha256')
  const stream = await client.getObject(bucket, key)
  for await (const chunk of stream) hash.update(chunk)
  return hash.digest('hex')
}

async function sameObject(sourceKey: string, privateKey: string, size: number) {
  const copied = await client.statObject(privateBucket, privateKey)
  return (
    copied.size === size &&
    (await hashObject(publicBucket, sourceKey)) === (await hashObject(privateBucket, privateKey))
  )
}

async function main() {
  if (apply && !(await client.bucketExists(privateBucket))) await client.makeBucket(privateBucket)
  if (verify && !(await client.bucketExists(privateBucket)))
    throw new Error('private bucket missing')
  let cursor: string | undefined
  let scanned = 0
  let legacy = 0
  let migrated = 0
  let errors = 0
  for (;;) {
    const feedbacks = await prisma.ledgerFeedback.findMany({
      orderBy: { id: 'asc' },
      take: 200,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, userId: true, images: true },
    })
    if (!feedbacks.length) break
    for (const feedback of feedbacks) {
      const images = Array.isArray(feedback.images) ? feedback.images : []
      const next: string[] = []
      let changed = false
      for (const imageValue of images) {
        const image = String(imageValue || '')
        if (image.startsWith('feedback-private:')) {
          const id = image.slice('feedback-private:'.length)
          const file = await prisma.uploadedFile.findFirst({
            where: { id, ownerId: feedback.userId, bizType: 'ledger-feedback-private' },
          })
          let valid = !!file
          if (verify && file) {
            try {
              valid = (await client.statObject(privateBucket, file.key)).size === file.size
              const legacyId = file.key.match(/^ledger-feedback-private\/legacy\/([^/]+)\//)?.[1]
              if (valid && legacyId) {
                const original = await prisma.uploadedFile.findFirst({
                  where: { id: legacyId, ownerId: feedback.userId, bizType: 'feedback' },
                })
                valid = !!original && (await sameObject(original.key, file.key, original.size))
              }
            } catch {
              valid = false
            }
          }
          if (!valid) {
            errors++
            console.error(`invalid private media feedback=${feedback.id} file=${id}`)
          }
          next.push(image)
          continue
        }
        if (!image.startsWith(publicPrefix)) {
          errors++
          console.error(`unsupported media origin feedback=${feedback.id}`)
          next.push(image)
          continue
        }
        legacy++
        let key: string
        try {
          key = decodeURIComponent(
            image.slice((process.env.S3_PUBLIC_URL || '').replace(/\/$/, '').length + 1),
          )
        } catch {
          errors++
          console.error(`invalid source encoding feedback=${feedback.id}`)
          next.push(image)
          continue
        }
        if (!/^feedback\/[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|gif|webp)$/.test(key)) {
          errors++
          console.error(`unsafe key feedback=${feedback.id}`)
          next.push(image)
          continue
        }
        const oldFile = await prisma.uploadedFile.findFirst({
          where: { key, ownerId: feedback.userId, bizType: 'feedback' },
        })
        if (!oldFile) {
          errors++
          console.error(`unowned source feedback=${feedback.id}`)
          next.push(image)
          continue
        }
        if (!apply) {
          next.push(image)
          continue
        }
        const newKey = `ledger-feedback-private/legacy/${oldFile.id}/${key.split('/').pop()}`
        let privateFile = await prisma.uploadedFile.findUnique({ where: { key: newKey } })
        if (!privateFile) {
          const source = await client.getObject(publicBucket, key)
          await client.putObject(privateBucket, newKey, source, oldFile.size, {
            'Content-Type': oldFile.mimeType,
          })
          if (!(await sameObject(key, newKey, oldFile.size)))
            throw new Error(`byte mismatch feedback=${feedback.id}`)
          privateFile = await prisma.uploadedFile.create({
            data: {
              key: newKey,
              url: `feedback-private:${newKey}`,
              size: oldFile.size,
              mimeType: oldFile.mimeType,
              bizType: 'ledger-feedback-private',
              ownerId: feedback.userId,
            },
          })
        }
        if (!(await sameObject(key, newKey, oldFile.size)))
          throw new Error(`existing private copy mismatch feedback=${feedback.id}`)
        next.push(`feedback-private:${privateFile.id}`)
        changed = true
        migrated++
      }
      if (apply && changed)
        await prisma.ledgerFeedback.update({
          where: { id: feedback.id },
          data: { images: next },
        })
      scanned++
    }
    cursor = feedbacks[feedbacks.length - 1].id
    console.log(`feedbacks=${scanned} legacy=${legacy} migrated=${migrated} errors=${errors}`)
  }
  if (errors || (verify && legacy)) process.exitCode = 1
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
