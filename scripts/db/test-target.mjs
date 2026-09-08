export function assertTestTarget(env = process.env, { requireRedis = false } = {}) {
  if (env.NODE_ENV === 'production' || env.ALLOW_DATABASE_TESTS !== '1')
    throw Error('Set ALLOW_DATABASE_TESTS=1 for an explicitly disposable test database')
  let url
  try {
    url = new URL(env.DATABASE_URL)
  } catch {
    throw Error('Invalid test database URL (redacted)')
  }
  if (
    !['postgresql:', 'postgres:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    !/\/(?:test|qa|[a-z0-9_]+_test)$/.test(url.pathname)
  )
    throw Error('Refusing non-local or non-test database')
  if (requireRedis && !env.REDIS_URL)
    throw Error('Full integration tests require explicit REDIS_URL')
  if (env.REDIS_URL) {
    let redis
    try {
      redis = new URL(env.REDIS_URL)
    } catch {
      throw Error('Invalid test Redis URL (redacted)')
    }
    if (
      !['redis:', 'rediss:'].includes(redis.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(redis.hostname) ||
      !/^\/(?:[1-9]|1[0-5])$/.test(redis.pathname)
    )
      throw Error('Tests require a local dedicated Redis database 1..15')
  }
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/test-target.mjs')) {
  assertTestTarget(process.env, { requireRedis: process.argv.includes('--with-redis') })
  console.log('Disposable database target confirmed (connection details not logged)')
}
