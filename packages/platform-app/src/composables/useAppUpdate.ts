/**
 * APP 自更新（平台端 · 仅 Android）
 *
 * 与 merchant-app 同名 composable 行为一致，差别只在 platform=platform。
 * 详细注释见 merchant-app/src/composables/useAppUpdate.ts。
 */
import { appService, type AppPlatform } from '../services/app'

const IGNORE_KEY = 'ignored_update_versionCode'

interface RuntimeVersion {
  versionCode: number
  version: string
  os: 'android' | 'ios' | 'other'
}

function readRuntimeVersion(): RuntimeVersion {
  try {
    const sys = uni.getSystemInfoSync() as any
    const os = (sys.platform || '').toLowerCase() === 'android'
      ? 'android'
      : (sys.platform || '').toLowerCase() === 'ios'
      ? 'ios'
      : 'other'
    const version = sys.appVersion || sys.appVersionName || '0.0.0'
    let versionCode = Number(sys.appVersionCode) || 0
    try {
      // @ts-expect-error plus only on App-plus
      if (typeof plus !== 'undefined' && plus?.runtime?.versionCode) {
        // @ts-expect-error
        versionCode = Number(plus.runtime.versionCode) || versionCode
      }
    } catch {}
    return { versionCode, version, os }
  } catch {
    return { versionCode: 0, version: '0.0.0', os: 'other' }
  }
}

function getIgnored(): number {
  try { return Number(uni.getStorageSync(IGNORE_KEY)) || 0 } catch { return 0 }
}
function setIgnored(code: number) {
  try { uni.setStorageSync(IGNORE_KEY, String(code)) } catch {}
}

function downloadAndInstall(url: string, onProgress?: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // @ts-expect-error App-plus only
      if (typeof plus === 'undefined' || !plus.downloader) {
        reject(new Error('plus.downloader 不可用'))
        return
      }
      // @ts-expect-error
      const dtask = plus.downloader.createDownload(
        url,
        { method: 'GET' },
        (d: any, status: number) => {
          if (status === 200) {
            try {
              // @ts-expect-error
              plus.runtime.install(
                d.filename,
                { force: false },
                () => resolve(),
                (err: any) => reject(new Error(err?.message || '安装失败')),
              )
            } catch (e: any) {
              reject(e)
            }
          } else {
            reject(new Error(`下载失败 status=${status}`))
          }
        },
      )
      dtask.addEventListener('statechanged', (task: any) => {
        if (task.state === 3 && task.totalSize > 0 && onProgress) {
          onProgress(Math.round((task.downloadedSize / task.totalSize) * 100))
        }
      })
      dtask.start()
    } catch (e: any) {
      reject(e)
    }
  })
}

function showUpdatePrompt(
  url: string,
  version: string,
  versionCode: number,
  changelog: string,
  force: boolean,
) {
  const content =
    `最新版本：v${version}\n` +
    (changelog ? `\n更新内容：\n${changelog}\n` : '\n')

  uni.showModal({
    title: force ? '需要更新（强制）' : '发现新版本',
    content,
    showCancel: !force,
    confirmText: '立即下载',
    cancelText: '忽略本版本',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '准备下载…', mask: true })
        try {
          await downloadAndInstall(url, (pct) => {
            uni.showLoading({ title: `下载 ${pct}%`, mask: true })
          })
          uni.hideLoading()
        } catch (e: any) {
          uni.hideLoading()
          uni.showModal({
            title: '下载失败',
            content: `${e?.message || '未知错误'}\n是否用系统浏览器下载？`,
            confirmText: '去浏览器',
            success: (rr) => {
              if (rr.confirm) {
                try {
                  // @ts-expect-error App-plus only
                  plus.runtime.openURL(url)
                } catch {}
              }
            },
          })
        }
      } else if (res.cancel && !force) {
        setIgnored(versionCode)
        uni.showToast({ title: `已忽略 v${version}`, icon: 'none' })
      }
    },
  })
}

export async function checkAppUpdate(
  platform: AppPlatform,
  opts: { silent?: boolean } = {},
): Promise<void> {
  const silent = opts.silent ?? true
  const rt = readRuntimeVersion()
  try {
    const latest = await appService.getLatest(platform)
    if (!latest?.url || !latest.versionCode) {
      if (!silent) uni.showToast({ title: '已是最新版本', icon: 'none' })
      return
    }
    if (latest.versionCode <= rt.versionCode) {
      if (!silent) uni.showToast({ title: `已是最新版本 v${rt.version}`, icon: 'success' })
      return
    }
    const ig = getIgnored()
    if (ig && ig < latest.versionCode) setIgnored(0)
    if (getIgnored() === latest.versionCode && !latest.force) return
    if (rt.os !== 'android') {
      if (!silent) {
        uni.showModal({
          title: '发现新版本',
          content: `v${latest.version}\n\niOS 用户请前往 App Store 更新。`,
          showCancel: false,
        })
      }
      return
    }
    showUpdatePrompt(latest.url, latest.version, latest.versionCode, latest.changelog, latest.force)
  } catch (e: any) {
    if (!silent) uni.showToast({ title: e?.message || '检查更新失败', icon: 'none' })
  }
}
