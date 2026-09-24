import { MotionPage } from '../../../utils/page-transition'
import { Capabilities, conversionApi, chunkUpload, downloadAsset, Job, Operation } from '../api'
import { isLoggedIn, requireLogin } from '../../../utils/store'

interface PickedFile {
  name: string
  size: number
  path: string
  uploadId?: string
}
let pollTimer: ReturnType<typeof setInterval> | null = null
const ext = (name: string) => name.split('.').pop()?.toLowerCase() || ''
const msg = (error: unknown) => (error instanceof Error ? error.message : String(error))
const statusLabels: Record<string, string> = {
  queued: '排队中',
  running: '转换中',
  succeeded: '已完成',
  failed: '失败',
  cancelled: '已取消',
}
const two = (value: number) => String(value).padStart(2, '0')
function displayJob(job: Job, localPaths: Record<string, string> = {}): Job {
  const date = new Date(job.createdAt)
  const createdLabel = Number.isNaN(date.getTime())
    ? job.createdAt
    : `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())} ${two(date.getHours())}:${two(date.getMinutes())}`
  return {
    ...job,
    statusLabel: statusLabels[job.status] || job.status,
    createdLabel,
    assets: job.assets.map((asset) => ({ ...asset, localPath: localPaths[asset.id] })),
  }
}

function readPart(filePath: string, position: number, length: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath,
      position,
      length,
      success: (res) => resolve(res.data as ArrayBuffer),
      fail: (error) => reject(new Error(error.errMsg)),
    })
  })
}
function writePart(data: ArrayBuffer): Promise<string> {
  const path = `${wx.env.USER_DATA_PATH}/conversion-part-${Date.now()}-${Math.random().toString(36).slice(2)}.bin`
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().writeFile({
      filePath: path,
      data,
      success: () => resolve(path),
      fail: (error) => reject(new Error(error.errMsg)),
    })
  })
}
function unlink(path: string): Promise<void> {
  return new Promise((resolve) => {
    wx.getFileSystemManager().unlink({ filePath: path, complete: () => resolve() })
  })
}

MotionPage({
  data: {
    loading: true,
    capabilities: null as Capabilities | null,
    limitHint: '',
    files: [] as PickedFile[],
    operations: [] as Operation[],
    operation: null as Operation | null,
    optionValues: {} as Record<string, string>,
    jobs: [] as Job[],
    hasMore: false,
    busy: false,
    busyText: '',
    uploadPercent: 0,
    error: '',
    previewText: '',
    previewVideo: '',
    previewAudio: '',
  },

  onLoad() {
    if (!requireLogin('登录后可免费使用格式转换，文件保留 30 天。')) {
      this.setData({ loading: false })
      return
    }
    this.refresh()
  },
  onShow() {
    if (!isLoggedIn()) return
    if (!this.data.capabilities && !this.data.loading) this.refresh()
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = setInterval(() => this.loadJobs(), 4000)
    this.loadJobs()
  },
  onHide() {
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = null
  },
  onUnload() {
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = null
  },

  async refresh() {
    this.setData({ loading: true, error: '' })
    try {
      const capabilities = await conversionApi.capabilities()
      const { maxFileBytes, maxBatchBytes, maxFiles } = capabilities.limits
      const limitHint = `当前服务端限制：单文件 ${Math.round(maxFileBytes / 1024 / 1024)} MB，单批 ${Math.round(maxBatchBytes / 1024 / 1024)} MB / ${maxFiles} 个；真机大文件上限尚待验证。`
      this.setData({ capabilities, limitHint, loading: false })
      this.updateOperations()
      await this.loadJobs()
    } catch (error) {
      this.setData({ loading: false, error: msg(error) })
    }
  },
  async loadJobs() {
    try {
      const paths: Record<string, string> = {}
      this.data.jobs.forEach((job) =>
        job.assets.forEach((asset) => {
          if (asset.localPath) paths[asset.id] = asset.localPath
        }),
      )
      const latest = (await conversionApi.listJobs()).map((job) => displayJob(job, paths))
      const fresh = new Set(latest.map((job) => job.id))
      const older = latest.length === 30 ? this.data.jobs.filter((job) => !fresh.has(job.id)) : []
      this.setData({
        jobs: [...latest, ...older],
        hasMore: latest.length === 30 || older.length > 0,
      })
    } catch {
      /* 保留已有历史，不打断上传 */
    }
  },
  async loadMore() {
    try {
      const next = (await conversionApi.listJobs(this.data.jobs.length)).map((job) =>
        displayJob(job),
      )
      const known = new Set(this.data.jobs.map((job) => job.id))
      this.setData({
        jobs: [...this.data.jobs, ...next.filter((job) => !known.has(job.id))],
        hasMore: next.length === 30,
      })
    } catch (error) {
      wx.showToast({ title: msg(error), icon: 'none' })
    }
  },
  updateOperations() {
    const files = this.data.files
    const operations = (this.data.capabilities?.operations || []).filter(
      (operation) =>
        files.length > 0 &&
        files.every((file) => operation.inputExtensions.includes(ext(file.name))),
    )
    const operation =
      operations.find((item) => item.id === this.data.operation?.id) || operations[0] || null
    this.setData({
      operations,
      operation,
      optionValues: operation?.id === this.data.operation?.id ? this.data.optionValues : {},
    })
  },
  appendFiles(files: PickedFile[]) {
    const limits = this.data.capabilities?.limits
    if (!limits || !this.data.capabilities?.available) {
      wx.showToast({ title: '转换服务暂不可用', icon: 'none' })
      return
    }
    const combined = [...this.data.files, ...files]
    if (
      combined.length > limits.maxFiles ||
      combined.some((file) => file.size <= 0 || file.size > limits.maxFileBytes) ||
      combined.reduce((sum, file) => sum + file.size, 0) > limits.maxBatchBytes
    ) {
      wx.showToast({ title: '文件数量或大小超出当前限制', icon: 'none' })
      return
    }
    this.setData({ files: combined })
    this.updateOperations()
  },
  chooseMessage() {
    if (this.data.busy) return
    wx.chooseMessageFile({
      count: 100,
      type: 'all',
      success: (res) =>
        this.appendFiles(
          res.tempFiles.map((file) => ({ name: file.name, size: file.size, path: file.path })),
        ),
      fail: (error) => {
        if (!/cancel/i.test(error.errMsg)) wx.showToast({ title: '选择文件失败', icon: 'none' })
      },
    })
  },
  chooseMedia() {
    if (this.data.busy) return
    wx.chooseMedia({
      count: 9,
      mediaType: ['image', 'video'],
      sourceType: ['album', 'camera'],
      success: (res) =>
        this.appendFiles(
          res.tempFiles.map((file, index) => ({
            name:
              file.tempFilePath.split('/').pop() ||
              `媒体文件-${index}.${file.fileType === 'video' ? 'mp4' : 'jpg'}`,
            size: file.size,
            path: file.tempFilePath,
          })),
        ),
      fail: (error) => {
        if (!/cancel/i.test(error.errMsg)) wx.showToast({ title: '选择媒体失败', icon: 'none' })
      },
    })
  },
  removeFile(e: WechatMiniprogram.BaseEvent) {
    if (this.data.busy) return
    const index = Number(e.currentTarget.dataset.index)
    this.setData({ files: this.data.files.filter((_file, i) => i !== index) })
    this.updateOperations()
  },
  moveFile(e: WechatMiniprogram.BaseEvent) {
    if (this.data.busy) return
    const index = Number(e.currentTarget.dataset.index)
    const direction = Number(e.currentTarget.dataset.direction)
    const next = index + direction
    if (next < 0 || next >= this.data.files.length) return
    const files = [...this.data.files]
    ;[files[index], files[next]] = [files[next], files[index]]
    this.setData({ files })
  },
  chooseOperation() {
    if (!this.data.operations.length) {
      wx.showToast({ title: '所选格式暂无已验证的转换方式', icon: 'none' })
      return
    }
    wx.showActionSheet({
      itemList: this.data.operations.map((item) => item.label),
      success: (res) =>
        this.setData({ operation: this.data.operations[res.tapIndex], optionValues: {} }),
    })
  },
  onOptionInput(e: WechatMiniprogram.Input) {
    const key = String(e.currentTarget.dataset.key)
    this.setData({ optionValues: { ...this.data.optionValues, [key]: e.detail.value } })
  },
  async uploadOne(file: PickedFile, index: number, count: number) {
    let uploadId = file.uploadId
    let status: { uploadedParts: number[]; chunkBytes: number; chunkCount: number }
    if (uploadId) {
      try {
        status = await conversionApi.uploadStatus(uploadId)
      } catch {
        uploadId = undefined
      }
    }
    if (!uploadId) {
      const created = await conversionApi.startUpload(file.name, file.size)
      uploadId = created.id
      file.uploadId = uploadId
      status = { uploadedParts: [], chunkBytes: created.chunkBytes, chunkCount: created.chunkCount }
      this.setData({ files: [...this.data.files] })
    }
    const uploaded = new Set(status!.uploadedParts)
    for (let part = 0; part < status!.chunkCount; part++) {
      if (uploaded.has(part)) continue
      const position = part * status!.chunkBytes
      const bytes = await readPart(
        file.path,
        position,
        Math.min(status!.chunkBytes, file.size - position),
      )
      const temp = await writePart(bytes)
      try {
        await chunkUpload(uploadId!, part, temp, (pct) =>
          this.setData({
            busyText: `上传 ${index + 1}/${count}：${file.name}`,
            uploadPercent: Math.floor(
              ((index + (part + pct / 100) / status!.chunkCount) / count) * 100,
            ),
          }),
        )
      } finally {
        await unlink(temp)
      }
    }
    await conversionApi.completeUpload(uploadId!)
    return uploadId!
  },
  async start() {
    if (this.data.busy || !this.data.operation || !this.data.files.length) return
    if (!requireLogin('登录后可免费使用格式转换。')) return
    this.setData({ busy: true, error: '', uploadPercent: 0, busyText: '准备上传' })
    try {
      const ids: string[] = []
      for (let i = 0; i < this.data.files.length; i++)
        ids.push(await this.uploadOne(this.data.files[i], i, this.data.files.length))
      const job = await conversionApi.createJob(this.data.operation.id, ids, this.data.optionValues)
      this.setData({ files: [], operation: null, operations: [], busyText: '', uploadPercent: 0 })
      await this.loadJobs()
      wx.showToast({ title: `任务已提交 ${job.id.slice(-6)}`, icon: 'success' })
    } catch (error) {
      this.setData({ error: msg(error) })
    } finally {
      this.setData({ busy: false, busyText: '' })
    }
  },
  async jobAction(e: WechatMiniprogram.BaseEvent) {
    const id = String(e.currentTarget.dataset.id)
    const action = String(e.currentTarget.dataset.action)
    try {
      if (action === 'cancel') await conversionApi.cancel(id)
      if (action === 'retry') await conversionApi.retry(id)
      if (action === 'delete') {
        const confirmed = await new Promise<boolean>((resolve) => {
          wx.showModal({
            title: '删除任务和文件？',
            content: '删除后无法恢复。',
            success: (res) => resolve(res.confirm),
            fail: () => resolve(false),
          })
        })
        if (!confirmed) return
        await conversionApi.remove(id)
        this.setData({ jobs: this.data.jobs.filter((job) => job.id !== id) })
      }
      await this.loadJobs()
    } catch (error) {
      wx.showToast({ title: msg(error), icon: 'none' })
    }
  },
  async loadAsset(e: WechatMiniprogram.BaseEvent) {
    const jobId = String(e.currentTarget.dataset.job)
    const assetId = String(e.currentTarget.dataset.asset)
    const job = this.data.jobs.find((item) => item.id === jobId)
    const asset = job?.assets.find((item) => item.id === assetId)
    if (!asset) return
    try {
      const path = asset.localPath || (await downloadAsset(jobId, assetId))
      const jobs = this.data.jobs.map((item) =>
        item.id === jobId
          ? {
              ...item,
              assets: item.assets.map((row) =>
                row.id === assetId ? { ...row, localPath: path } : row,
              ),
            }
          : item,
      )
      this.setData({ jobs })
      wx.showToast({ title: '已下载，可预览或转发', icon: 'success' })
    } catch (error) {
      wx.showToast({ title: msg(error), icon: 'none' })
    }
  },
  openAsset(e: WechatMiniprogram.BaseEvent) {
    const asset = this.data.jobs
      .find((item) => item.id === e.currentTarget.dataset.job)
      ?.assets.find((row) => row.id === e.currentTarget.dataset.asset)
    if (!asset?.localPath) {
      wx.showToast({ title: '请先下载结果', icon: 'none' })
      return
    }
    const extension = ext(asset.fileName)
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf'].includes(extension)) {
      wx.openDocument({
        filePath: asset.localPath,
        fileType: extension as any,
        fail: () => wx.showToast({ title: '当前设备无法预览', icon: 'none' }),
      })
    } else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension)) {
      wx.previewImage({ urls: [asset.localPath] })
    } else if (['mp4', 'mov', 'webm'].includes(extension)) {
      this.setData({ previewVideo: asset.localPath })
    } else if (['mp3', 'wav', 'm4a', 'aac'].includes(extension)) {
      this.setData({ previewAudio: asset.localPath })
    } else if (
      ['txt', 'md', 'csv', 'json', 'html', 'xml', 'srt', 'vtt', 'ass', 'ssa'].includes(extension) &&
      asset.sizeBytes < 256 * 1024
    ) {
      wx.getFileSystemManager().readFile({
        filePath: asset.localPath,
        encoding: 'utf8',
        success: (res) => this.setData({ previewText: String(res.data).slice(0, 8000) }),
        fail: () => wx.showToast({ title: '文本预览失败', icon: 'none' }),
      })
    } else wx.showToast({ title: '该格式请转发至其他应用打开', icon: 'none' })
  },
  closePreview() {
    this.setData({ previewText: '', previewVideo: '', previewAudio: '' })
  },
  noop() {},
  shareAsset(e: WechatMiniprogram.BaseEvent) {
    const asset = this.data.jobs
      .find((item) => item.id === e.currentTarget.dataset.job)
      ?.assets.find((row) => row.id === e.currentTarget.dataset.asset)
    if (!asset?.localPath) {
      wx.showToast({ title: '请先下载结果', icon: 'none' })
      return
    }
    const share = (wx as any).shareFileMessage
    if (typeof share !== 'function') {
      wx.showToast({ title: '当前微信版本不支持文件转发', icon: 'none' })
      return
    }
    share({
      filePath: asset.localPath,
      fileName: asset.fileName,
      fail: () => wx.showToast({ title: '转发失败', icon: 'none' }),
    })
  },
  saveAsset(e: WechatMiniprogram.BaseEvent) {
    const asset = this.data.jobs
      .find((item) => item.id === e.currentTarget.dataset.job)
      ?.assets.find((row) => row.id === e.currentTarget.dataset.asset)
    if (!asset?.localPath) {
      wx.showToast({ title: '请先下载结果', icon: 'none' })
      return
    }
    wx.getFileSystemManager().saveFile({
      tempFilePath: asset.localPath,
      success: (res) => {
        const jobs = this.data.jobs.map((item) => ({
          ...item,
          assets: item.assets.map((row) =>
            row.id === asset.id ? { ...row, localPath: res.savedFilePath } : row,
          ),
        }))
        this.setData({ jobs })
        wx.showToast({ title: '已保存至小程序本地', icon: 'success' })
      },
      fail: () => wx.showToast({ title: '保存失败，请尝试转发', icon: 'none' }),
    })
  },
})
