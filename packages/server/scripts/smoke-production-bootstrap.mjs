#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import process from 'node:process'
import { WebSocket } from 'ws'

const host = '127.0.0.1'

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, host, () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close((error) => (error ? reject(error) : resolve(port)))
    })
  })
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  let body = null
  try {
    body = await response.json()
  } catch {
    // The assertion below reports invalid JSON without dumping response data.
  }
  return { status: response.status, body }
}

async function documentRequest(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Accept: 'text/html' },
  })
  return {
    status: response.status,
    contentType: response.headers.get('content-type') || '',
    body: await response.text(),
  }
}

function waitForHarmonySocket(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url)
    const timeout = setTimeout(() => {
      socket.terminate()
      reject(new Error('Harmony WebSocket did not send connection.ready'))
    }, 5_000)
    socket.once('message', (raw) => {
      clearTimeout(timeout)
      try {
        const envelope = JSON.parse(raw.toString())
        if (envelope.v !== 1 || envelope.event !== 'connection.ready') {
          throw new Error('unexpected Harmony WebSocket greeting')
        }
        socket.close()
        resolve()
      } catch (error) {
        socket.terminate()
        reject(error)
      }
    })
    socket.once('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
  })
}

async function waitForHealth(baseUrl, child, output) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`production server exited during bootstrap\n${output.value.slice(-4_000)}`)
    }
    try {
      const response = await fetch(`${baseUrl}/health`)
      if (response.status === 200) return
    } catch {
      // The server may still be compiling its route graph or connecting Prisma.
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`production server did not become healthy\n${output.value.slice(-4_000)}`)
}

const port = await freePort()
const baseUrl = `http://${host}:${port}`
const output = { value: '' }
const child = spawn(process.execPath, ['dist/main.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'production',
    SERVER_HOST: host,
    SERVER_PORT: String(port),
    CORS_ORIGIN: process.env.CORS_ORIGIN || baseUrl,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})
for (const stream of [child.stdout, child.stderr]) {
  stream.setEncoding('utf8')
  stream.on('data', (chunk) => {
    output.value = `${output.value}${chunk}`.slice(-20_000)
  })
}

try {
  await waitForHealth(baseUrl, child, output)
  // A valid phone plus deliberately invalid scene must fail ONLY scene validation.
  // This exercises JSON parsing without invoking the SMS sender or writing a code.
  const smsBody = await request(baseUrl, '/api/v1/auth/sms-code', {
    method: 'POST', body: JSON.stringify({ phone: '13800000000', scene: 17 }),
  })
  const validation = JSON.stringify(smsBody.body?.message || '')
  if (smsBody.status !== 400 || !validation.includes('scene') || validation.includes('phone') || validation.includes('手机号')) {
    throw new Error('SMS JSON body parsing regression')
  }
  const latest = await request(baseUrl, '/api/v1/m/app/latest?platform=merchant-harmony')
  if (latest.status !== 200 || Number(latest.body?.code) !== 0
    || (latest.body?.data !== null && latest.body?.data?.platform !== 'merchant-harmony')) {
    throw new Error(`Harmony update route failed: HTTP ${latest.status}`)
  }
  const push = await request(baseUrl, '/api/v1/m/push/preferences')
  if (push.status !== 401) throw new Error(`Harmony Push route is not protected: HTTP ${push.status}`)
  const iap = await request(baseUrl, '/api/v1/m/membership/iap/prepare', {
    method: 'POST',
    body: JSON.stringify({ planId: '__readiness_probe__' }),
  })
  if (iap.status !== 401) throw new Error(`Harmony IAP route is not protected: HTTP ${iap.status}`)
  const privacy = await documentRequest(baseUrl, '/api/v1/u/legal/merchant-harmony/privacy')
  const collection = await documentRequest(baseUrl, '/api/v1/u/legal/merchant-harmony/collect')
  if (privacy.status !== 200 || !privacy.contentType.includes('text/html')
    || !privacy.body.includes('经纬科技商家端隐私政策')
    || !privacy.body.includes('辽宁经纬建筑装饰有限公司')) {
    throw new Error(`Harmony privacy document failed: HTTP ${privacy.status}`)
  }
  if (collection.status !== 200 || !collection.contentType.includes('text/html')
    || !collection.body.includes('经纬科技商家端个人信息收集清单')
    || !collection.body.includes('Huawei IAP')) {
    throw new Error(`Harmony collection document failed: HTTP ${collection.status}`)
  }
  await waitForHarmonySocket(`ws://${host}:${port}/ws/harmony/merchant`)
  process.stdout.write(
    `Production bootstrap smoke passed: health, Harmony update/legal, protected Push/IAP and JSON WebSocket on ${host}:${port}\n`,
  )
} finally {
  if (child.exitCode === null) child.kill('SIGTERM')
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 3_000)),
  ])
  if (child.exitCode === null) child.kill('SIGKILL')
}
