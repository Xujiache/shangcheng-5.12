import { Client } from 'minio'

/** Any anonymous allow policy makes the dedicated conversion bucket unsafe. */
export async function assertPrivateConversionBucket(storage: Client, bucket: string) {
  let raw: string
  try {
    raw = await storage.getBucketPolicy(bucket)
  } catch (error: any) {
    if (error?.code === 'NoSuchBucketPolicy') return
    throw error
  }
  const statements = JSON.parse(raw)?.Statement
  if (!Array.isArray(statements)) throw new Error('转换 bucket 策略无法校验')
  for (const statement of statements) {
    const principal = statement?.Principal
    const anonymous =
      principal === '*' ||
      principal?.AWS === '*' ||
      (Array.isArray(principal?.AWS) && principal.AWS.includes('*'))
    if (statement?.Effect === 'Allow' && anonymous) throw new Error('转换 bucket 存在匿名访问策略')
  }
}
