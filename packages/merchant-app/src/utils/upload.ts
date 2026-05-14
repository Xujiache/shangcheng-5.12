/**
 * 文件上传公共 helper · merchant-app
 *
 * 把"先选图后立即上传换 https URL"的样板提到一处，
 * 后端落库前所有图片字段必须是 http(s) URL —— 直接把 tempFilePaths
 * 提交给后端会造成"只在原选图设备能看一次，刷新就 404"的脏数据。
 *
 * 已替换的调用点：
 *   - pages/product/add.vue           bizType=product
 *   - pages/shop/decorate.vue         bizType=decorate
 * 后续新增上传场景请直接引用此处的 uploadImage / uploadImages。
 */
import { BASE_URL } from './request'

const TOKEN_KEY = 'jiujiu_token'

function getToken(): string {
  try {
    return uni.getStorageSync(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

/** 单张本地临时路径 → 远端 https URL */
export function uploadImage(tempPath: string, bizType = 'common'): Promise<string> {
  const token = getToken()
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: BASE_URL + '/api/v1/files/upload',
      filePath: tempPath,
      name: 'file',
      formData: { bizType },
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        try {
          const raw = (res as { data: string | object }).data
          const data: any = typeof raw === 'string' ? JSON.parse(raw) : raw
          if (data?.code === 0 && data?.data?.url) {
            resolve(data.data.url as string)
          } else {
            reject(new Error(data?.message || '上传失败'))
          }
        } catch (e: unknown) {
          reject(e instanceof Error ? e : new Error('上传失败'))
        }
      },
      fail: (err: any) => reject(err instanceof Error ? err : new Error(err?.errMsg || '上传失败')),
    })
  })
}

/**
 * 串行上传一批本地路径
 *
 * - 任一失败时：之前成功的 URL 不丢，向上抛出剩余失败原因，调用方决定是否提示
 * - 显示带进度的 loading（多张时形如 "上传中 2/5"）
 */
export async function uploadImages(tempPaths: string[], bizType = 'common'): Promise<string[]> {
  if (tempPaths.length === 0) return []
  const total = tempPaths.length
  uni.showLoading({ title: total > 1 ? `上传中 0/${total}` : '上传中…', mask: true })
  const urls: string[] = []
  try {
    for (let i = 0; i < tempPaths.length; i++) {
      if (total > 1) uni.showLoading({ title: `上传中 ${i + 1}/${total}`, mask: true })
      urls.push(await uploadImage(tempPaths[i], bizType))
    }
    uni.hideLoading()
    return urls
  } catch (e: any) {
    uni.hideLoading()
    if (urls.length > 0) {
      uni.showToast({
        title: `已上传 ${urls.length}/${total}，剩余失败: ${e?.message || '未知错误'}`,
        icon: 'none',
        duration: 2500,
      })
      return urls
    }
    throw e
  }
}
