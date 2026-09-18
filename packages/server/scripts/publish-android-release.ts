import { readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { JwtService } from '@nestjs/jwt'
import { PrismaClient } from '@prisma/client'

function parseArgs() {
  const input = process.argv.slice(2)
  const get = (name: string) => {
    const at = input.indexOf(`--${name}`)
    return at >= 0 ? input[at + 1] : undefined
  }
  return {
    phone: get('phone'),
    platform: get('platform'),
    version: get('version'),
    versionCode: Number(get('version-code')),
    apk: get('apk'),
    changelog: get('changelog') || '',
    apiBase: get('api-base') || 'http://127.0.0.1:3001',
    confirmed: input.includes('--confirm-production'),
  }
}

async function loadEnvFile(file: string) {
  const content = await readFile(file, 'utf8')
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const split = line.indexOf('=')
    if (split <= 0) continue
    const key = line.slice(0, split).trim()
    let value = line.slice(split + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

async function main() {
  const option = parseArgs()
  if (!option.confirmed) throw new Error('生产发布必须显式传入 --confirm-production')
  if (!/^1[3-9]\d{9}$/.test(option.phone || '')) throw new Error('必须提供有效 --phone')
  if (option.platform !== 'merchant' && option.platform !== 'platform') throw new Error('--platform 仅支持 merchant/platform')
  if (!/^\d+\.\d+\.\d+$/.test(option.version || '')) throw new Error('必须提供 x.y.z 格式 --version')
  if (!Number.isInteger(option.versionCode) || option.versionCode <= 0) throw new Error('--version-code 必须为正整数')
  if (!option.apk) throw new Error('必须提供 --apk')

  await loadEnvFile(resolve(process.cwd(), '.env'))
  const secret = process.env.JWT_SECRET || ''
  if (secret.length < 16) throw new Error('JWT_SECRET 不可用，拒绝发布')

  const prisma = new PrismaClient()
  try {
    const user = await prisma.user.findUnique({
      where: { phone: option.phone },
      select: { id: true, role: true, status: true, merchantId: true },
    })
    if (!user || user.status !== 'active') throw new Error('发布账号不存在或已停用')
    if (!['admin', 'platform', 'super-admin'].includes(user.role)) throw new Error('发布账号没有平台发布权限')

    const latest = await prisma.appRelease.findFirst({
      where: { platform: option.platform },
      orderBy: { versionCode: 'desc' },
      select: { versionCode: true },
    })
    if (latest && option.versionCode <= latest.versionCode) throw new Error(`versionCode 必须大于线上 ${latest.versionCode}`)

    const token = await new JwtService({ secret }).signAsync(
      { sub: user.id, role: user.role, merchantId: user.merchantId || undefined, jti: randomUUID() },
      { expiresIn: 600 },
    )
    const apkPath = resolve(option.apk)
    const bytes = await readFile(apkPath)
    const form = new FormData()
    form.append('file', new Blob([bytes], { type: 'application/vnd.android.package-archive' }), basename(apkPath))
    form.append('platform', option.platform)
    form.append('version', option.version || '')
    form.append('versionCode', String(option.versionCode))
    form.append('changelog', option.changelog)
    form.append('force', 'false')

    const response = await fetch(`${option.apiBase.replace(/\/$/, '')}/api/v1/p/app-releases`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    const body = (await response.json()) as any
    if (!response.ok || body?.code !== 0 || !body?.data) throw new Error(body?.message || `发布失败（HTTP ${response.status}）`)
    const row = body.data
    if (row.platform !== option.platform || row.versionCode !== option.versionCode || row.size !== bytes.length) {
      throw new Error('服务端发布记录与本地 APK 不一致')
    }
    console.log(JSON.stringify({
      id: row.id,
      platform: row.platform,
      version: row.version,
      versionCode: row.versionCode,
      url: row.url,
      size: row.size,
      force: row.force,
    }))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
