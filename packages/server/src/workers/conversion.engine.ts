import { randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, stat } from 'node:fs/promises'
import http from 'node:http'
import { basename, join, resolve } from 'node:path'

interface Request {
  operationId: string
  files: string[]
  options: Record<string, string>
  outputDir: string
}

async function multipart(url: URL, fields: Record<string, string>, files: string[], fieldName: string, progressId: string) {
  const boundary = `----ledger-flyingmouse-${randomUUID()}`
  const parts = Object.entries(fields)
    .filter(([, value]) => value !== '')
    .map(([key, value]) => Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`))
  const uploads = await Promise.all(files.map(async (file) => {
    const name = basename(file).replace(/["\r\n]/g, '_')
    const header = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${name}"\r\nContent-Type: application/octet-stream\r\n\r\n`)
    return { file, header, size: (await stat(file)).size }
  }))
  const closing = Buffer.from(`--${boundary}--\r\n`)
  const length = parts.reduce((sum, part) => sum + part.length, 0) +
    uploads.reduce((sum, item) => sum + item.header.length + item.size + 2, 0) + closing.length
  return new Promise<any>((done, fail) => {
    const request = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': length,
        'x-flyingmouse-progress-id': progressId,
      },
    }, async (response) => {
      try {
        const chunks: Buffer[] = []
        for await (const chunk of response) chunks.push(Buffer.from(chunk))
        const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        if ((response.statusCode || 500) >= 400)
          throw new Error(payload.messages?.zhCN || payload.error || `HTTP ${response.statusCode}`)
        done(payload)
      } catch (error) { fail(error) }
    })
    request.once('error', fail)
    const write = async (chunk: Buffer) => {
      if (!request.write(chunk)) await new Promise<void>((drain) => {
        request.once('drain', drain)
      })
    }
    ;(async () => {
      for (const part of parts) await write(part)
      for (const item of uploads) {
        await write(item.header)
        for await (const chunk of createReadStream(item.file)) await write(Buffer.from(chunk))
        await write(Buffer.from('\r\n'))
      }
      request.end(closing)
    })().catch((error) => request.destroy(error))
  })
}

async function main() {
  const sourceDir = process.env.FLYINGMOUSE_SOURCE_DIR
  if (!sourceDir) throw new Error('FLYINGMOUSE_SOURCE_DIR is required')
  const request = JSON.parse(await readFile(process.argv[2], 'utf8')) as Request
  if (!Array.isArray(request.files) || !request.files.length) throw new Error('No input files')
  const { startServer } = require(join(sourceDir, 'server.js'))
  const { saveConvertedResult } = require(join(sourceDir, 'save-converted-result.js'))
  const started = await startServer(0)
  try {
    await mkdir(request.outputDir, { recursive: true })
    const results: any[] = []
    if (request.operationId === 'images-to-pdf' || request.operationId === 'merge-pdfs') {
      const route = request.operationId === 'images-to-pdf' ? 'convert-images-to-pdf' : 'merge-pdfs'
      results.push(await runOne(new URL(`/api/${route}`, started.url), {}, request.files, 'files', started.url))
    } else {
      const target = /^convert:([a-z0-9]{2,8})$/.exec(request.operationId)?.[1]
      if (!target) throw new Error('Invalid conversion operation')
      for (const file of request.files) {
        results.push(await runOne(new URL('/api/convert', started.url), {
          targetFormat: target, ...request.options,
        }, [file], 'file', started.url))
      }
    }
    const outputs: any[] = []
    for (let index = 0; index < results.length; index++) {
      const result = results[index]
      if (request.operationId === 'convert:docx' &&
        result.warnings?.some((warning: { code?: string }) => warning.code === 'PDF_DOCX_LAYOUT_FALLBACK'))
        throw new Error('PDF 转 Word 版式处理失败，已阻止降级结果。')
      const name = basename(String(result.fileName || '')).replace(/[\x00-\x1f\x7f]/g, '')
      if (!name || name === '.' || name === '..') throw new Error('Invalid engine output name')
      const destination = resolve(request.outputDir, `${index}-${name}`)
      const base = new URL(started.url)
      const resolveUrl = (value: string) => {
        const url = new URL(value, base)
        if (url.origin !== base.origin || !url.pathname.startsWith('/downloads/'))
          throw new Error('Engine output URL escaped loopback server')
        return url.href
      }
      await saveConvertedResult(result, destination, { resolveUrl, overwrite: false, resolveRedirect: resolveUrl })
      outputs.push({ path: destination, fileName: name, mimeType: result.mimeType, warnings: result.warnings || [] })
    }
    process.stdout.write(`@@LEDGER_CONVERSION_RESULT@@${JSON.stringify({ ok: true, outputs })}\n`)
  } finally {
    await new Promise<void>((done) => {
      started.server.close(() => done())
    })
  }
}

async function runOne(url: URL, fields: Record<string, string>, files: string[], fieldName: string, baseUrl: string) {
  const id = randomUUID()
  let busy = true
  const timer = setInterval(async () => {
    if (!busy) return
    try {
      const response = await fetch(new URL(`/api/conversion-progress/${id}`, baseUrl))
      if (response.ok) process.stderr.write(`@@PROGRESS@@${JSON.stringify(await response.json())}\n`)
    } catch { /* The engine response reports terminal errors. */ }
  }, 1000)
  timer.unref()
  try { return await multipart(url, fields, files, fieldName, id) }
  finally { busy = false; clearInterval(timer) }
}

main().catch((error) => {
  process.stderr.write(`${String(error?.message || error)}\n`)
  process.exitCode = 1
})
