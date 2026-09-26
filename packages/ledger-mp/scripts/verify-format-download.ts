import assert from 'node:assert/strict'
import { downloadAsset, WX_DOWNLOAD_MAX_BYTES } from '../miniprogram/subpackages/format/api'

const calls: any[] = []
const removed: string[] = []
;(globalThis as any).getApp = () => ({ globalData: { token: 'local-test-token' } })
;(globalThis as any).wx = {
  downloadFile: (options: any) => calls.push(options),
  getFileSystemManager: () => ({ unlink: ({ filePath }: { filePath: string }) => removed.push(filePath) }),
}

async function main() {
  await assert.rejects(downloadAsset('job', 'asset', WX_DOWNLOAD_MAX_BYTES), /200 MB/)
  await assert.rejects(downloadAsset('job', 'asset', -1), /文件大小无效/)
  assert.equal(calls.length, 0, 'oversized files must not start an unsupported WeChat download')

  const pending = downloadAsset('job', 'asset', WX_DOWNLOAD_MAX_BYTES - 1)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].header.Authorization, 'Bearer local-test-token')
  calls[0].success({ statusCode: 200, tempFilePath: '/temp/result.pdf' })
  assert.equal(await pending, '/temp/result.pdf')

  const failed = downloadAsset('job', 'asset', 12)
  calls[1].success({ statusCode: 416, tempFilePath: '/temp/error' })
  await assert.rejects(failed, /HTTP 416/)
  assert.deepEqual(removed, ['/temp/error'])
  console.log('format download verified: size guard, authenticated request, success and HTTP error')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
