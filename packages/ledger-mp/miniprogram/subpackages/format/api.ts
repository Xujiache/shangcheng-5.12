import { API_BASE } from '../../config'
import { request, handleUnauthorized } from '../../utils/request'
import { getToken } from '../../utils/store'

const ROOT = '/l/conversions'
export interface Operation {
  id: string
  label: string
  inputExtensions: string[]
  targetExtension: string
  kind: string
  options: string[]
}
export interface Capabilities {
  available: boolean
  operations: Operation[]
  limits: {
    maxFileBytes: number
    maxBatchBytes: number
    maxFiles: number
    chunkBytes: number
    retentionDays: number
    deviceVerified: boolean
  }
}
export interface Asset {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: number
  localPath?: string
}
export interface Job {
  id: string
  status: string
  progress: number
  error?: string
  operationId: string
  createdAt: string
  expiresAt?: string
  uploads: { id: string; fileName: string; totalBytes: number }[]
  assets: Asset[]
  statusLabel?: string
  createdLabel?: string
}

export const conversionApi = {
  capabilities: () => request<Capabilities>({ url: ROOT + '/capabilities', silent: true }),
  startUpload: (fileName: string, sizeBytes: number) =>
    request<{ id: string; chunkBytes: number; chunkCount: number }>({
      url: ROOT + '/uploads',
      method: 'POST',
      data: { fileName, sizeBytes },
    }),
  uploadStatus: (id: string) =>
    request<{ uploadedParts: number[]; chunkBytes: number; chunkCount: number }>({
      url: ROOT + '/uploads/' + id,
    }),
  completeUpload: (id: string) =>
    request({ url: ROOT + '/uploads/' + id + '/complete', method: 'POST' }),
  createJob: (operationId: string, uploadIds: string[], options: Record<string, string>) =>
    request<{ id: string }>({
      url: ROOT + '/jobs',
      method: 'POST',
      data: { operationId, uploadIds, options },
    }),
  listJobs: (skip = 0) => request<Job[]>({ url: ROOT + '/jobs', params: { skip }, silent: true }),
  cancel: (id: string) => request({ url: ROOT + '/jobs/' + id + '/cancel', method: 'POST' }),
  retry: (id: string) => request({ url: ROOT + '/jobs/' + id + '/retry', method: 'POST' }),
  remove: (id: string) => request({ url: ROOT + '/jobs/' + id, method: 'DELETE' }),
}

export function chunkUpload(
  uploadId: string,
  index: number,
  filePath: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const task = wx.uploadFile({
      url: `${API_BASE}/api/v1${ROOT}/uploads/${uploadId}/chunks`,
      filePath,
      name: 'file',
      formData: { index: String(index) },
      header: { Authorization: 'Bearer ' + getToken() },
      timeout: 120_000,
      success: (res) => {
        let body: any
        try {
          body = JSON.parse(res.data)
        } catch {
          body = null
        }
        if (res.statusCode === 401 || body?.code === 401) {
          handleUnauthorized()
          reject(new Error('登录已失效'))
          return
        }
        if (res.statusCode >= 200 && res.statusCode < 300 && body?.code === 0) resolve()
        else reject(new Error(body?.message || body?.msg || '分片上传失败'))
      },
      fail: (error) => reject(new Error(error.errMsg || '网络上传失败')),
    })
    task.onProgressUpdate?.((res) => onProgress?.(res.progress))
  })
}

export function downloadAsset(jobId: string, assetId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url: `${API_BASE}/api/v1${ROOT}/jobs/${jobId}/assets/${assetId}`,
      header: { Authorization: 'Bearer ' + getToken() },
      timeout: 120_000,
      success: (res) => {
        if (res.statusCode === 401) {
          handleUnauthorized()
          reject(new Error('登录已失效'))
          return
        }
        if (res.statusCode === 200 && res.tempFilePath) resolve(res.tempFilePath)
        else reject(new Error(`下载失败：HTTP ${res.statusCode}`))
      },
      fail: (error) => reject(new Error(error.errMsg || '下载失败')),
    })
  })
}
