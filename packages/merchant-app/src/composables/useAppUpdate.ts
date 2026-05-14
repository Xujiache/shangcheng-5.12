/**
 * APP 自更新（#7）· 仅 Android
 *
 * 流程：
 *   onLaunch / 手动检查 → GET /api/v1/m/app/latest?platform=merchant →
 *   versionCode > 当前 → 弹更新提示（changelog / 下载 / 跳过 / 忽略本版本） →
 *   下载 APK（plus.downloader 流式 + 进度） → 调起系统安装器
 *
 * iOS / H5：当前业务只做 Android，发现新版本时仅 toast 提示「请去 App Store」。
 *
 * 「忽略此版本」 → 存 storage：ignored_update_versionCode
 *   下次启动时若 latest.versionCode === ignored 则不再弹；
 *   再有更新就自动清掉。
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
    const os =
      (sys.platform || '').toLowerCase() === 'android'
        ? 'android'
        : (sys.platform || '').toLowerCase() === 'ios'
          ? 'ios'
          : 'other'
    const version = sys.appVersion || sys.appVersionName || '0.0.0'
    let versionCode = Number(sys.appVersionCode) || 0
    // App-plus：通过 plus.runtime 取更准确的 versionCode
    try {
      if (typeof plus !== 'undefined' && plus?.runtime?.versionCode) {
        versionCode = Number(plus.runtime.versionCode) || versionCode
      }
    } catch {}
    return { versionCode, version, os }
  } catch {
    return { versionCode: 0, version: '0.0.0', os: 'other' }
  }
}

function getIgnored(): number {
  try {
    return Number(uni.getStorageSync(IGNORE_KEY)) || 0
  } catch {
    return 0
  }
}
function setIgnored(code: number) {
  try {
    uni.setStorageSync(IGNORE_KEY, String(code))
  } catch {}
}
function clearIgnoredIfStale(latestCode: number) {
  const ig = getIgnored()
  if (ig && ig < latestCode) setIgnored(0)
}

/**
 * 下载并安装 APK（plus.downloader 实现）
 * - 流式下载，可中途看进度
 * - 失败时直接打开浏览器下载（用户自行安装）
 */
function downloadAndInstall(url: string, onProgress?: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof plus === 'undefined' || !plus.downloader) {
        reject(new Error('plus.downloader 不可用'))
        return
      }
      const dtask = plus.downloader.createDownload(
        url,
        { method: 'GET' },
        (d: any, status: number) => {
          if (status === 200) {
            try {
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

/** 显示更新弹窗 */
function showUpdatePrompt(
  url: string,
  version: string,
  versionCode: number,
  changelog: string,
  force: boolean,
) {
  const content = `最新版本：v${version}\n` + (changelog ? `\n更新内容：\n${changelog}\n` : '\n')

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

/**
 * 检查更新
 *  - silent=true：没新版时不提示（用于启动时静默检查）
 *  - silent=false：没新版会 toast「已是最新版本」（用于"我的-检查更新"按钮）
 */
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
    // 有新版本：先把比本版本旧的"忽略记录"清掉
    clearIgnoredIfStale(latest.versionCode)
    if (getIgnored() === latest.versionCode && !latest.force) {
      // 用户已忽略本版本，且非强制 → 不打扰
      return
    }
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
    if (!silent) {
      uni.showToast({ title: e?.message || '检查更新失败', icon: 'none' })
    }
  }
}
