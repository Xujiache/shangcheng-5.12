import { appFeedback } from '@jiujiu/shared'
/** 平台端 Android 更新检查协调器。下载与安装由独立更新中心页面处理。 */
import { ref } from 'vue'
import { shouldPresentAppUpdate } from '@jiujiu/shared/utils'
import { appService, type AppPlatform, type AppRelease } from '../services/app'

const CONTEXT_KEY = 'jiujiu_platform_update_context'
const LEGACY_IGNORE_KEYS = ['ignored_update_version_code', 'ignored_update_versionCode']
const UPDATE_PAGE = '/pages/update/index'

export type UpdateCheckResult = 'continue' | 'opened' | 'blocked'
export type UpdateCheckSource = 'startup' | 'foreground' | 'poll' | 'manual'

export interface UpdateCheckOptions {
  silent?: boolean
  source?: UpdateCheckSource
  nextRoute?: string
}

export interface RuntimeVersion {
  versionCode: number
  version: string
  os: 'android' | 'ios' | 'other'
}

export interface UpdateContext {
  platform: AppPlatform
  latest: AppRelease
  runtime: RuntimeVersion
  source: UpdateCheckSource
  nextRoute?: string
  returnRoute?: string
  createdAt: number
}

let checkInFlight: Promise<UpdateCheckResult> | null = null
let inFlightSource: UpdateCheckSource | null = null
let dismissedVersionThisSession = 0
let updatePageOpening = false
export const availableAppUpdate = ref<AppRelease | null>(null)

export function readRuntimeVersion(): RuntimeVersion {
  try {
    const sys = uni.getSystemInfoSync() as any
    const platform = String(sys.platform || '').toLowerCase()
    const os = platform === 'android' ? 'android' : platform === 'ios' ? 'ios' : 'other'
    let version = String(sys.appVersion || sys.appVersionName || '0.0.0')
    let versionCode = Number(sys.appVersionCode) || 0
    try {
      // @ts-ignore App-plus runtime
      if (typeof plus !== 'undefined' && plus?.runtime) {
        // @ts-ignore App-plus runtime
        version = String(plus.runtime.version || version)
        // @ts-ignore App-plus runtime
        versionCode = Number(plus.runtime.versionCode) || versionCode
      }
    } catch {
      // 非 App-plus 环境使用 systemInfo。
    }
    return { versionCode, version, os }
  } catch {
    return { versionCode: 0, version: '0.0.0', os: 'other' }
  }
}

export function formatUpdateBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '未知'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function clearLegacyIgnoredVersion() {
  try {
    LEGACY_IGNORE_KEYS.forEach((key) => uni.removeStorageSync(key))
  } catch {
    // ignore
  }
}

function currentRoute(): string {
  try {
    const pages = getCurrentPages?.() || []
    const top = pages[pages.length - 1] as any
    return String(top?.route || top?.$page?.route || '')
  } catch {
    return ''
  }
}

function saveContext(context: UpdateContext) {
  try {
    uni.setStorageSync(CONTEXT_KEY, JSON.stringify(context))
  } catch {
    // ignore
  }
}

export function readUpdateContext(): UpdateContext | null {
  try {
    const raw = uni.getStorageSync(CONTEXT_KEY)
    if (!raw) return null
    const value = (typeof raw === 'string' ? JSON.parse(raw) : raw) as UpdateContext
    if (!value?.latest?.url || !value.latest.versionCode || value.platform !== 'platform') return null
    return value
  } catch {
    return null
  }
}

export function clearUpdateContext() {
  try {
    uni.removeStorageSync(CONTEXT_KEY)
  } catch {
    // ignore
  }
}

export function dismissUpdateForSession(versionCode: number) {
  dismissedVersionThisSession = Math.max(0, Number(versionCode) || 0)
  clearUpdateContext()
}

function showMessage(title: string, content: string) {
  return new Promise<void>((resolve) => {
    appFeedback.showModal({
      title,
      content,
      showCancel: false,
      confirmText: '知道了',
      complete: () => resolve(),
    })
  })
}

function openUpdateCenter(context: UpdateContext): Promise<UpdateCheckResult> {
  if (currentRoute().includes('pages/update/')) return Promise.resolve('opened')
  if (updatePageOpening) return Promise.resolve('opened')
  updatePageOpening = true
  saveContext(context)

  return new Promise((resolve) => {
    const done = (result: UpdateCheckResult) => {
      updatePageOpening = false
      resolve(result)
    }
    uni.navigateTo({
      url: UPDATE_PAGE,
      success: () => done('opened'),
      fail: () => {
        uni.redirectTo({
          url: UPDATE_PAGE,
          success: () => done('opened'),
          fail: () => done(context.latest.force ? 'blocked' : 'continue'),
        })
      },
    })
  })
}

async function runCheck(
  platform: AppPlatform,
  options: UpdateCheckOptions,
): Promise<UpdateCheckResult> {
  const silent = options.silent ?? true
  const source = options.source ?? 'startup'
  const runtime = readRuntimeVersion()

  try {
    clearLegacyIgnoredVersion()
    const latest = await appService.getLatest(platform)
    if (!latest?.url || !latest.versionCode || latest.versionCode <= runtime.versionCode) {
      availableAppUpdate.value = null
      if (!silent) appFeedback.showToast({ title: `已是最新版本 v${runtime.version}`, icon: 'success' })
      return 'continue'
    }

    availableAppUpdate.value = latest
    if (!shouldPresentAppUpdate({
      currentVersionCode: runtime.versionCode,
      latestVersionCode: latest.versionCode,
      force: !!latest.force,
      source,
      dismissedVersionCode: dismissedVersionThisSession,
    })) {
      return 'continue'
    }

    if (runtime.os !== 'android') {
      if (!silent) await showMessage('发现新版本', `最新版本 v${latest.version}\n当前仅支持 Android 安装包更新。`)
      return 'continue'
    }

    const route = currentRoute()
    return await openUpdateCenter({
      platform,
      latest,
      runtime,
      source,
      nextRoute: options.nextRoute,
      returnRoute: route ? `/${route}` : undefined,
      createdAt: Date.now(),
    })
  } catch (error: any) {
    if (!silent) {
      await showMessage('检查更新失败', error?.message || '暂时无法获取版本信息，请检查网络后重试。')
    }
    return 'continue'
  }
}

export function checkAppUpdate(
  platform: AppPlatform,
  options: UpdateCheckOptions = {},
): Promise<UpdateCheckResult> {
  if (checkInFlight) {
    if (options.source === 'manual' && inFlightSource !== 'manual') {
      return checkInFlight.then((result) => {
        if (result !== 'continue') return result
        return checkAppUpdate(platform, options)
      })
    }
    return checkInFlight
  }
  inFlightSource = options.source ?? 'startup'
  checkInFlight = runCheck(platform, options).finally(() => {
    checkInFlight = null
    inFlightSource = null
  })
  return checkInFlight
}
