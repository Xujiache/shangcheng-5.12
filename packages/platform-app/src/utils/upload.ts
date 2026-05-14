/**
 * 文件上传公共 helper · platform-app
 *
 * 平台端上传 APK / 图片均走真实接口,不再保留 mock。
 *
 * 已使用此 helper 的页面:
 *   - pages/app-release/index.vue   uploadApk()
 *   - pages/ad/index.vue            uploadImage() — 广告位预览 / 创意素材
 *
 * 与 merchant-app/utils/upload.ts 的差别:
 *   - 走平台端 token (jiujiu_admin_token)
 *   - uploadApk 直接 POST /api/v1/p/app-releases (multipart),
 *     带 platform/version/versionCode/changelog/force 一起上传
 *   - uploadImage 走通用 /api/v1/files/upload, bizType 走后端白名单
 *     ('product' / 'avatar' / 'idcard' / 'apk' / 'chat' / 'misc')
 */
import { BASE_URL, PLATFORM_TOKEN_KEY } from './request'

function getToken(): string {
  try {
    return uni.getStorageSync(PLATFORM_TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export interface UploadApkParams {
  filePath: string
  platform: 'merchant' | 'platform'
  version: string
  versionCode: number
  changelog?: string
  force?: boolean
  onProgress?: (percent: number) => void
}

export interface UploadApkResult {
  id: string
  platform: string
  version: string
  versionCode: number
  url: string
  size: number
}

/**
 * 上传 APK 并创建发布记录。
 *
 * 返回后端 AppRelease 行。失败时抛 Error,调用方自行 toast。
 */
export function uploadApk(params: UploadApkParams): Promise<UploadApkResult> {
  const token = getToken()
  return new Promise((resolve, reject) => {
    const task = uni.uploadFile({
      url: BASE_URL + '/api/v1/p/app-releases',
      filePath: params.filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      formData: {
        platform: params.platform,
        version: params.version,
        versionCode: String(params.versionCode),
        changelog: params.changelog || '',
        force: params.force ? 'true' : 'false',
      },
      success: (res) => {
        try {
          const raw = (res as { data: string | object }).data
          const body: any = typeof raw === 'string' ? JSON.parse(raw) : raw
          if (body?.code === 0 && body?.data) {
            resolve(body.data as UploadApkResult)
          } else {
            reject(new Error(body?.message || `上传失败 (HTTP ${(res as any)?.statusCode || '?'})`))
          }
        } catch (e: any) {
          reject(e instanceof Error ? e : new Error('上传响应解析失败'))
        }
      },
      fail: (err: any) =>
        reject(err instanceof Error ? err : new Error(err?.errMsg || '上传失败,请检查网络')),
    })
    if (task && typeof task.onProgressUpdate === 'function' && params.onProgress) {
      task.onProgressUpdate((p: any) => {
        if (typeof p?.progress === 'number') params.onProgress!(p.progress)
      })
    }
  })
}

/**
 * 移动端选 APK 文件 — H5 走 <input type=file>,APP/小程序走 uni.chooseMessageFile。
 *
 * 返回 { tempPath, size, name } 给上层用,size 用来做上传前体积校验。
 */
export interface PickedApk {
  tempPath: string
  size: number
  name: string
}

export function pickApk(): Promise<PickedApk> {
  // #ifdef H5
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.apk,application/vnd.android.package-archive'
    input.style.display = 'none'
    input.onchange = () => {
      const f = input.files && input.files[0]
      document.body.removeChild(input)
      if (!f) {
        reject(new Error('未选择文件'))
        return
      }
      resolve({
        tempPath: URL.createObjectURL(f),
        size: f.size,
        name: f.name,
      })
    }
    document.body.appendChild(input)
    input.click()
  })
  // #endif

  // #ifndef H5
  return new Promise((resolve, reject) => {
    if (typeof uni.chooseMessageFile !== 'function') {
      reject(new Error('当前环境不支持选择 APK 文件'))
      return
    }
    uni.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['.apk'],
      success: (res: any) => {
        const f = res?.tempFiles?.[0]
        if (!f) {
          reject(new Error('未选择文件'))
          return
        }
        resolve({
          tempPath: f.path,
          size: f.size || 0,
          name: f.name || 'app.apk',
        })
      },
      fail: (err: any) => reject(new Error(err?.errMsg || '选择文件失败')),
    })
  })
  // #endif
}

/**
 * 选 1 张图片(返回临时路径) → 调 /api/v1/files/upload → 拿 https URL
 *
 * 后端 files.controller 强制走 BIZ_TYPE_WHITELIST,广告素材没有独立类目,
 * 统一使用 'misc' 兜底(已在白名单里)。后端如果以后开 'ad' 类目,改一个常量即可。
 *
 * 用法:
 *   const url = await pickAndUploadImage()
 *   form.preview = url
 *
 * 失败时抛 Error,调用方自行 toast。已选图但上传中网络断开,会走 fail。
 */
export interface PickedImageOptions {
  bizType?: 'misc' | 'avatar' | 'product'
  sizeType?: ('original' | 'compressed')[]
  sourceType?: ('album' | 'camera')[]
}

export function pickAndUploadImage(options: PickedImageOptions = {}): Promise<string> {
  const bizType = options.bizType || 'misc'
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count: 1,
      sizeType: options.sizeType || ['compressed'],
      sourceType: options.sourceType || ['album', 'camera'],
      success: (chosen: any) => {
        const tempPath: string | undefined = chosen?.tempFilePaths?.[0]
        if (!tempPath) {
          reject(new Error('未选择图片'))
          return
        }
        const token = getToken()
        uni.showLoading({ title: '上传中…', mask: true })
        uni.uploadFile({
          url: BASE_URL + '/api/v1/files/upload',
          filePath: tempPath,
          name: 'file',
          formData: { bizType },
          header: token ? { Authorization: `Bearer ${token}` } : {},
          success: (res) => {
            uni.hideLoading()
            try {
              const raw = (res as { data: string | object }).data
              const body: any = typeof raw === 'string' ? JSON.parse(raw) : raw
              if (body?.code === 0 && body?.data?.url) {
                resolve(body.data.url as string)
              } else {
                reject(
                  new Error(body?.message || `上传失败 (HTTP ${(res as any)?.statusCode || '?'})`),
                )
              }
            } catch (e: any) {
              reject(e instanceof Error ? e : new Error('上传响应解析失败'))
            }
          },
          fail: (err: any) => {
            uni.hideLoading()
            reject(err instanceof Error ? err : new Error(err?.errMsg || '上传失败,请检查网络'))
          },
        })
      },
      fail: (err: any) => {
        const msg = err?.errMsg || ''
        if (/cancel/i.test(msg)) {
          reject(new Error('已取消选图'))
        } else {
          reject(new Error(msg || '选择图片失败'))
        }
      },
    })
  })
}
