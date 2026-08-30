import { PrismaClient } from '@prisma/client'
import { Client } from 'minio'
import {
  createSquareThumbnail,
  IMMUTABLE_CACHE_CONTROL,
  thumbnailKeyForObjectKey,
} from '../src/modules/files/image-thumbnail.util'

const prisma = new PrismaClient()
const endpoint = (process.env.S3_ENDPOINT || 'http://localhost:9000').replace(/^https?:\/\//, '')
const useSSL = (process.env.S3_ENDPOINT || '').startsWith('https')
const [host, port] = endpoint.split(':')
const client = new Client({
  endPoint: host,
  port: port ? Number(port) : useSSL ? 443 : 80,
  useSSL,
  accessKey: process.env.S3_ACCESS_KEY || '',
  secretKey: process.env.S3_SECRET_KEY || '',
})
const bucket = process.env.S3_BUCKET || 'jiujiu-mall'

async function streamBuffer(key: string): Promise<Buffer> {
  const stream = await client.getObject(bucket, key)
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}

async function processFile(file: { key: string }): Promise<'created' | 'skipped' | 'failed'> {
  const thumbnailKey = thumbnailKeyForObjectKey(file.key)
  if (!thumbnailKey) return 'skipped'
  const exists = await client
    .statObject(bucket, thumbnailKey)
    .then(() => true)
    .catch(() => false)
  if (exists) return 'skipped'
  try {
    const thumbnail = await createSquareThumbnail(await streamBuffer(file.key))
    await client.putObject(bucket, thumbnailKey, thumbnail, thumbnail.length, {
      'Content-Type': 'image/webp',
      'Cache-Control': IMMUTABLE_CACHE_CONTROL,
    })
    return 'created'
  } catch (error) {
    console.error(`[thumbnail] failed ${file.key}:`, error)
    return 'failed'
  }
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--confirm-production')) {
    throw new Error('生产环境回填必须显式传入 --confirm-production')
  }
  const files = await prisma.uploadedFile.findMany({
    where: { mimeType: { startsWith: 'image/' }, NOT: { key: { startsWith: 'thumb/' } } },
    select: { key: true },
    orderBy: { createdAt: 'asc' },
  })
  const counts = { created: 0, skipped: 0, failed: 0 }
  for (let index = 0; index < files.length; index += 3) {
    const results = await Promise.all(files.slice(index, index + 3).map(processFile))
    for (const result of results) counts[result] += 1
  }
  console.log(JSON.stringify({ total: files.length, ...counts }))
}

main().finally(() => prisma.$disconnect())
