import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pipeline } from 'node:stream'

const prefix = 'ledger-conversion-chunk-'

export const conversionUploadStorage = {
  _handleFile(_request: unknown, file: { stream: NodeJS.ReadableStream; path?: string }, callback: (error?: Error | null, info?: { path: string; size: number }) => void) {
    const path = join(tmpdir(), `${prefix}${randomUUID()}`)
    const output = createWriteStream(path, { flags: 'wx', mode: 0o600 })
    file.path = path
    pipeline(file.stream, output, (error) => {
      if (error) {
        rm(path, { force: true }).finally(() => callback(error))
        return
      }
      callback(null, { path, size: output.bytesWritten })
    })
  },
  _removeFile(_request: unknown, file: { path?: string }, callback: (error?: Error | null) => void) {
    const path = file.path
    if (!path || !path.startsWith(join(tmpdir(), prefix))) {
      callback(new Error('无效的上传临时文件路径'))
      return
    }
    rm(path, { force: true }).then(() => callback(null), callback)
  },
}
