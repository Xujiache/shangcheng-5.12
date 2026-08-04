// ----------------------------------------------------------------------------
// 集成测试全局前置校验（安全闸）
//
// 集成测试会对数据库做 TRUNCATE 等破坏性操作，绝不允许指向远程 / 生产库。
// 这里在所有用例运行前硬性校验：
//   1. DATABASE_URL 必须已设置
//   2. 其 host 必须是 localhost 或 127.0.0.1
// 任一不满足立即抛错终止，不做其他任何事。
// ----------------------------------------------------------------------------
module.exports = async () => {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      '[集成测试安全校验失败] 未设置 DATABASE_URL。' +
        '请将其指向一次性本地测试库，例如 postgresql://test:test@localhost:5440/qa?schema=public，' +
        '严禁指向远程或生产数据库。',
    )
  }

  let host = ''
  try {
    host = new URL(url).hostname
  } catch {
    throw new Error(`[集成测试安全校验失败] DATABASE_URL 不是合法的连接串，无法解析 host：${url}`)
  }

  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error(
      `[集成测试安全校验失败] DATABASE_URL 指向了非本机地址「${host}」。` +
        '集成测试会清空数据表，只允许连接 localhost / 127.0.0.1 的一次性测试库，' +
        '严禁指向远程或生产数据库。',
    )
  }
}
