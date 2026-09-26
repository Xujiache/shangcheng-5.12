import { MotionPage } from '../../../utils/page-transition'
import {
  Asset,
  Capabilities,
  conversionApi,
  chunkUpload,
  downloadAsset,
  WX_DOWNLOAD_MAX_BYTES,
  WX_SAVED_FILE_MAX_BYTES,
  Job,
  Operation,
} from '../api'
import { isLoggedIn, requireLogin } from '../../../utils/store'
import { LOCAL_CONVERSION_TEST } from '../../../config'

interface PickedFile {
  name: string
  size: number
  path: string
  thumbnailPath?: string
  mediaPath?: string
  visualKind?: string
  uploadId?: string
  sizeLabel?: string
  extensionLabel?: string
}
let pollTimer: ReturnType<typeof setInterval> | null = null
const ext = (name: string) => {
  const base = name.split('/').pop() || ''
  const dot = base.lastIndexOf('.')
  return dot > 0 && dot < base.length - 1 ? base.slice(dot + 1).toLowerCase() : ''
}
function visualKind(name: string) {
  const extension = ext(name)
  if (/^(png|jpe?g|webp|gif|bmp|tiff?|svg|heic|avif|ico|tga|jp2|jxl|qoi|ppm)$/.test(extension)) return 'image'
  if (/^(mp4|mov|mkv|webm|avi|wmv|flv|m4v|m4s|mpe?g|3gp|ts)$/.test(extension)) return 'video'
  if (/^(docx?|odt|rtf|txt|md|markdown|html?|epub|mobi|pages|json|xml|ya?ml|log|srt|vtt|ass|ssa)$/.test(extension)) return 'document'
  if (/^(xlsx?|ods|csv|tsv|numbers)$/.test(extension)) return 'sheet'
  if (/^(zip|rar|7z|tar|gz|bz2|xz)$/.test(extension)) return 'archive'
  if (/^(pptx?|odp|key)$/.test(extension)) return 'slide'
  if (extension === 'pdf') return 'pdf'
  if (/^(mp3|wav|flac|m4a|ogg|aac|opus|wma)$/.test(extension)) return 'audio'
  return 'other'
}
function visual(name: string, path = '', thumbnailPath = '') {
  const kind = visualKind(name)
  const extension = ext(name)
  return {
    visualKind: kind,
    thumbnailPath: thumbnailPath || (kind === 'image' && /^(png|jpe?g|webp|gif)$/.test(extension) ? path : ''),
    mediaPath: kind === 'video' && !thumbnailPath && /^(mp4|mov|webm)$/.test(extension) ? path : '',
  }
}
function canPreview(name: string, size: number) {
  if (size >= WX_DOWNLOAD_MAX_BYTES) return false
  const extension = ext(name)
  return /^(docx?|xlsx?|pptx?|pdf|png|jpe?g|webp|gif|mp4|mov|webm|mp3|wav|m4a|aac)$/.test(extension) ||
    (size < 256 * 1024 && /^(txt|md|markdown|csv|json|html|xml|yaml|yml|log|srt|vtt|ass|ssa)$/.test(extension))
}
const msg = (error: unknown) => (error instanceof Error ? error.message : String(error))
const sizeLabel = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : bytes < 1024 * 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
      : `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
const formatCategories = ['全部', '文档', '图片', '音频', '视频', '字幕', '其他']
function formatCategory(target: string) {
  if (
    /^(pdf|doc|docx|odt|rtf|txt|md|markdown|html|xlsx|xls|ods|csv|tsv|ppt|pptx|odp|epub|mobi|json|xml|yaml|yml|log)$/.test(target)
  )
    return '文档'
  if (/^(jpg|jpeg|png|webp|gif|bmp|tiff|tif|svg|ico|avif|heic|tga|jp2|jxl|qoi|ppm)$/.test(target)) return '图片'
  if (/^(mp3|wav|flac|m4a|ogg|aac|opus|wma)$/.test(target)) return '音频'
  if (/^(mp4|mov|mkv|webm|avi|wmv|flv|m4v|mpeg|mpg|3gp|ts)$/.test(target)) return '视频'
  if (/^(srt|vtt|ass|ssa)$/.test(target)) return '字幕'
  return '其他'
}
const codecOptions = ['H.264 · 兼容优先', 'H.265 · 更小体积', 'AV1 · 高压缩率']
const codecs = ['h264', 'h265', 'av1']
const backgroundOptions = ['白色', '黑色', '绿色', '洋红色']
const backgrounds = ['white', 'black', '0x00ff00', '0xff00ff']
const encodingOptions = ['自动识别', 'UTF-8', 'GBK / GB18030', 'UTF-16LE', 'UTF-16BE']
const encodings = ['auto', 'utf-8', 'gb18030', 'utf-16le', 'utf-16be']
const pdfActionOptions = ['拆分', '加密', '解密']
const pdfActions = ['', 'encrypt', 'decrypt']
const splitModeOptions = ['每页一个 PDF', '每 N 页一组']
const splitModes = ['page', 'group']
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
    operationLabel:
      job.operationId === 'images-to-pdf'
        ? '多图合成 PDF'
        : job.operationId === 'merge-pdfs'
          ? '合并 PDF'
          : job.operationId === 'convert:pdf' &&
              job.uploads.every((row) => ext(row.fileName) === 'pdf')
            ? job.options?.pdfAction === 'encrypt'
              ? '加密 PDF'
              : job.options?.pdfAction === 'decrypt'
                ? '解密 PDF'
                : '拆分 PDF'
            : `转为 ${job.operationId.split(':')[1]?.toUpperCase() || job.operationId}`,
    sourceLabel:
      job.uploads.length === 1
        ? job.uploads[0].fileName
        : `${job.uploads[0].fileName} 等 ${job.uploads.length} 个文件`,
    assets: job.assets.map((asset) => ({
      ...asset,
      localPath: localPaths[asset.id],
      sizeLabel: sizeLabel(asset.sizeBytes),
      extensionLabel: ext(asset.fileName).toUpperCase(),
      canPreview: canPreview(asset.fileName, asset.sizeBytes),
      ...visual(asset.fileName, localPaths[asset.id]),
    })),
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
function mediaSignature(data: ArrayBuffer, fileType: string) {
  const bytes = new Uint8Array(data)
  const at = (position: number, length: number) =>
    String.fromCharCode(...bytes.slice(position, position + length))
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpg'
  if (bytes[0] === 0x89 && at(1, 3) === 'PNG') return 'png'
  if (at(0, 3) === 'GIF') return 'gif'
  if (at(0, 4) === 'RIFF' && at(8, 4) === 'WEBP') return 'webp'
  if (at(0, 2) === 'BM') return 'bmp'
  if ((at(0, 2) === 'II' && bytes[2] === 42) || (at(0, 2) === 'MM' && bytes[3] === 42)) return 'tiff'
  if (bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0) return 'ico'
  if (at(0, 4) === 'qoif') return 'qoi'
  if (/^P[1-6]$/.test(at(0, 2))) return 'ppm'
  if (at(4, 4) === 'jP  ' || (bytes[0] === 0xff && bytes[1] === 0x4f)) return 'jp2'
  if (at(4, 4) === 'JXL ' || (bytes[0] === 0xff && bytes[1] === 0x0a)) return 'jxl'
  if (at(4, 4) === 'ftyp') {
    const brands = at(8, 32)
    if (/avif|avis/.test(brands)) return 'avif'
    if (/heic|heix|hevc|hevx/.test(brands)) return 'heic'
    if (fileType === 'video') return at(8, 4) === 'qt  ' ? 'mov' : 'mp4'
  }
  if (at(0, 4) === 'RIFF' && at(8, 4) === 'AVI ') return 'avi'
  if (at(0, 3) === 'FLV') return 'flv'
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3)
    return at(0, 64).includes('webm') ? 'webm' : 'mkv'
  return ''
}
async function pickedMedia(file: WechatMiniprogram.ChooseMediaSuccessCallbackResult['tempFiles'][number], index: number): Promise<PickedFile | null> {
  const base = file.tempFilePath.split('/').pop() || ''
  let detected = ''
  try {
    detected = mediaSignature(await readPart(file.tempFilePath, 0, 64), file.fileType)
  } catch {
    // 已知后缀仍可用于选择；未知格式不猜测容器类型。
  }
  const extension = detected || (visualKind(base) === file.fileType ? ext(base) : '')
  if (!extension) return null
  return {
    name: ext(base) === extension ? base : `媒体文件-${Date.now()}-${index}.${extension}`,
    size: file.size,
    path: file.tempFilePath,
    thumbnailPath: file.thumbTempFilePath || '',
  }
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
    filteredOperations: [] as Operation[],
    activeTab: 'convert',
    sourceOpen: false,
    settingsOpen: false,
    sortMode: false,
    totalSizeLabel: '',
    visibleFormatCategories: formatCategories,
    formatCategory: '全部',
    operation: null as Operation | null,
    formatOpen: false,
    formatQuery: '',
    codecOptions,
    backgroundOptions,
    encodingOptions,
    pdfActionOptions,
    splitModeOptions,
    showVideoOptions: false,
    showPdfOptions: false,
    showTextEncoding: false,
    visibleOptionKeys: {} as Record<string, boolean>,
    optionValues: {} as Record<string, string>,
    optionIndexes: {
      videoCodec: 0,
      alphaBackground: 0,
      textEncoding: 0,
      pdfAction: 0,
      splitMode: 0,
    },
    jobs: [] as Job[],
    hasMore: false,
    busy: false,
    busyText: '',
    uploadPercent: 0,
    error: '',
    previewText: '',
    previewVideo: '',
    previewAudio: '',
    localTest: LOCAL_CONVERSION_TEST,
  },

  onLoad() {
    if (!LOCAL_CONVERSION_TEST && !requireLogin('登录后可免费使用格式转换，文件保留 30 天。')) {
      this.setData({ loading: false })
      return
    }
    this.refresh()
  },
  onShow() {
    if (!LOCAL_CONVERSION_TEST && !isLoggedIn()) return
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
      const { maxFileBytes, maxFiles } = capabilities.limits
      const limitHint = `单个文件最大 ${sizeLabel(maxFileBytes)} · 最多 ${maxFiles} 个`
      this.setData({
        capabilities,
        limitHint,
        loading: false,
        pdfActionOptions:
          capabilities.features?.pdfEncryption === false
            ? pdfActionOptions.slice(0, 1)
            : pdfActionOptions,
      })
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
    const operations = (this.data.capabilities?.operations || [])
      .filter(
        (operation) =>
          files.length > 0 &&
          (operation.id !== 'merge-pdfs' || files.length >= 2) &&
          files.every((file) => operation.inputExtensions.includes(ext(file.name))),
      )
      .map((item) => ({
        ...item,
        extensionLabel: item.targetExtension.toUpperCase(),
        category: formatCategory(item.targetExtension),
        displayLabel:
          item.id === 'images-to-pdf'
            ? '图片合成 PDF'
            : item.id === 'merge-pdfs'
              ? '合并 PDF'
              : item.id === 'convert:pdf' && files.every((file) => ext(file.name) === 'pdf')
                ? '拆分 PDF'
                : item.targetExtension.toUpperCase(),
        label:
          item.id === 'convert:pdf' && files.every((file) => ext(file.name) === 'pdf')
            ? '拆分 / 处理 PDF（拆分结果为 ZIP）'
            : item.label,
      }))
    const operation = operations.find((item) => item.id === this.data.operation?.id) || null
    this.setData({
      operations,
      visibleFormatCategories: formatCategories.filter(
        (category) => category === '全部' || operations.some((item) => item.category === category),
      ),
      settingsOpen: operation ? this.data.settingsOpen : false,
      filteredOperations: operations,
      operation,
      totalSizeLabel: sizeLabel(files.reduce((sum, file) => sum + file.size, 0)),
      optionValues: operation?.id === this.data.operation?.id ? this.data.optionValues : {},
      optionIndexes:
        operation?.id === this.data.operation?.id
          ? this.data.optionIndexes
          : { videoCodec: 0, alphaBackground: 0, textEncoding: 0, pdfAction: 0, splitMode: 0 },
    })
    this.syncOptionVisibility()
  },
  switchTab(e: WechatMiniprogram.BaseEvent) {
    this.setData({ activeTab: String(e.currentTarget.dataset.tab) })
    wx.pageScrollTo({ scrollTop: 0, duration: 0 })
  },
  openSourcePicker() {
    if (!this.data.busy) this.setData({ sourceOpen: true })
  },
  closeSourcePicker() {
    this.setData({ sourceOpen: false })
  },
  toggleSettings() {
    if (!this.data.busy) this.setData({ settingsOpen: !this.data.settingsOpen })
  },
  toggleSort() {
    if (!this.data.busy) this.setData({ sortMode: !this.data.sortMode })
  },
  appendFiles(files: PickedFile[]) {
    const limits = this.data.capabilities?.limits
    if (!limits || !this.data.capabilities?.available) {
      wx.showToast({ title: '转换服务暂不可用', icon: 'none' })
      return
    }
    const supported = new Set<string>()
    this.data.capabilities.operations.forEach((operation) =>
      operation.inputExtensions.forEach((extension) => supported.add(extension)),
    )
    const accepted = files.filter((file) => supported.has(ext(file.name)))
    if (accepted.length !== files.length) {
      wx.showToast({
        title: files.length === 1 ? `暂不支持 ${ext(files[0].name).toUpperCase() || '该文件'} 格式` : '已跳过不支持的文件',
        icon: 'none',
      })
    }
    if (!accepted.length) return
    const combined = [...this.data.files, ...accepted]
    if (
      combined.length > limits.maxFiles ||
      combined.some((file) => file.size <= 0 || file.size > limits.maxFileBytes) ||
      combined.reduce((sum, file) => sum + file.size, 0) > limits.maxBatchBytes
    ) {
      wx.showToast({ title: '文件数量或大小超出当前限制', icon: 'none' })
      return
    }
    this.setData({
      files: combined.map((file) => ({
        ...file,
        ...visual(file.name, file.path, file.thumbnailPath),
        sizeLabel: sizeLabel(file.size),
        extensionLabel: ext(file.name).toUpperCase() || 'FILE',
      })),
    })
    this.updateOperations()
  },
  chooseMessage() {
    if (this.data.busy) return
    this.closeSourcePicker()
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
    this.closeSourcePicker()
    wx.chooseMedia({
      count: 9,
      mediaType: ['image', 'video'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const picked = await Promise.all(res.tempFiles.map(pickedMedia))
        if (picked.some((file) => !file))
          wx.showToast({ title: '无法识别媒体格式', icon: 'none' })
        const files = picked.filter((file): file is PickedFile => !!file)
        if (files.length) this.appendFiles(files)
      },
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
  clearFiles() {
    if (this.data.busy) return
    this.setData({ files: [], error: '' })
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
  openFormatPicker() {
    if (this.data.busy || !this.data.operations.length) return
    this.setData({
      formatOpen: true,
      formatQuery: '',
      formatCategory: '全部',
      filteredOperations: this.data.operations,
    })
  },
  closeFormatPicker() {
    this.setData({ formatOpen: false })
  },
  onFormatQuery(e: WechatMiniprogram.Input) {
    const query = String(e.detail.value || '')
      .trim()
      .toLowerCase()
    this.setData({ formatQuery: query })
    this.filterFormats()
  },
  chooseCategory(e: WechatMiniprogram.BaseEvent) {
    this.setData({ formatCategory: String(e.currentTarget.dataset.category) })
    this.filterFormats()
  },
  filterFormats() {
    const { formatQuery, formatCategory } = this.data
    this.setData({
      filteredOperations: this.data.operations.filter(
        (item) =>
          (formatCategory === '全部' || item.category === formatCategory) &&
          (!formatQuery ||
            item.label.toLowerCase().includes(formatQuery) ||
            item.targetExtension.includes(formatQuery)),
      ),
    })
  },
  chooseOperation(e: WechatMiniprogram.BaseEvent) {
    if (this.data.busy) return
    const operation = this.data.operations.find((item) => item.id === e.currentTarget.dataset.id)
    if (!operation) return
    this.setData({
      operation,
      error: '',
      settingsOpen: false,
      optionValues: {},
      optionIndexes: {
        videoCodec: 0,
        alphaBackground: 0,
        textEncoding: 0,
        pdfAction: 0,
        splitMode: 0,
      },
      formatOpen: false,
    })
    this.syncOptionVisibility()
  },
  syncOptionVisibility() {
    const operation = this.data.operation
    const target = operation?.targetExtension || ''
    const extensions = this.data.files.map((file) => ext(file.name))
    const options = new Set(operation?.options || [])
    const video = operation?.kind === 'convert' && ['mp4', 'mov', 'mkv', 'webm'].includes(target)
    const pdf = operation?.id === 'convert:pdf' && extensions.length > 0 &&
      extensions.every((item) => item === 'pdf')
    const visibleOptionKeys = {
      videoCodec: video && target !== 'webm' && options.has('videoCodec'),
      alphaBackground: video && options.has('alphaBackground'),
      textEncoding: options.has('textEncoding'),
      pdfAction: pdf && options.has('pdfAction'),
      splitMode: pdf && options.has('splitMode'),
      groupSize: pdf && options.has('groupSize'),
      password: pdf && options.has('password'),
    }
    this.setData({
      visibleOptionKeys,
      showVideoOptions: visibleOptionKeys.videoCodec || visibleOptionKeys.alphaBackground,
      showPdfOptions: visibleOptionKeys.pdfAction || visibleOptionKeys.splitMode ||
        visibleOptionKeys.groupSize || visibleOptionKeys.password,
      showTextEncoding: visibleOptionKeys.textEncoding,
    })
  },
  onOptionSelect(e: any) {
    if (this.data.busy) return
    const key = String(e.currentTarget.dataset.key)
    const index = Number(e.detail.value)
    const values: Record<string, string[]> = {
      videoCodec: codecs,
      alphaBackground: backgrounds,
      textEncoding: encodings,
      pdfAction: pdfActions,
      splitMode: splitModes,
    }
    const value = values[key]?.[index]
    if (value === undefined) return
    this.setData({
      optionValues: { ...this.data.optionValues, [key]: value },
      optionIndexes: { ...this.data.optionIndexes, [key]: index },
    })
  },
  onOptionInput(e: WechatMiniprogram.Input) {
    if (this.data.busy) return
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
    if (this.data.busy || !this.data.files.length) return
    if (!this.data.operation) {
      this.openFormatPicker()
      return
    }
    if (!LOCAL_CONVERSION_TEST && !requireLogin('登录后可免费使用格式转换。')) return
    if (
      this.data.showPdfOptions &&
      this.data.optionValues.pdfAction &&
      !this.data.optionValues.password?.trim()
    ) {
      this.setData({ error: '请输入 PDF 密码' })
      return
    }
    if (
      this.data.showPdfOptions &&
      this.data.optionValues.splitMode === 'group' &&
      !this.data.optionValues.pdfAction
    ) {
      const groupSize = Number(this.data.optionValues.groupSize)
      if (!Number.isSafeInteger(groupSize) || groupSize < 1 || groupSize > 999) {
        this.setData({ error: '每组页数请输入 1–999 的整数' })
        return
      }
    }
    this.setData({ busy: true, error: '', uploadPercent: 0, busyText: '准备上传' })
    try {
      const ids: string[] = []
      for (let i = 0; i < this.data.files.length; i++)
        ids.push(await this.uploadOne(this.data.files[i], i, this.data.files.length))
      const options: Record<string, string> = {}
      for (const [key, value] of Object.entries(this.data.optionValues)) {
        if (this.data.operation.options.includes(key) && value) options[key] = value
      }
      await conversionApi.createJob(this.data.operation.id, ids, options)
      this.setData({
        files: [],
        operation: null,
        operations: [],
        filteredOperations: [],
        busyText: '',
        uploadPercent: 0,
        activeTab: 'history',
        settingsOpen: false,
        sortMode: false,
      })
      wx.pageScrollTo({ scrollTop: 0, duration: 0 })
      await this.loadJobs()
      wx.showToast({ title: '转换任务已开始', icon: 'success' })
    } catch (error) {
      this.setData({ error: msg(error), activeTab: 'convert' })
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
  jobMenu(e: WechatMiniprogram.BaseEvent) {
    const job = this.data.jobs.find((item) => item.id === e.currentTarget.dataset.id)
    if (!job) return
    const actions = ['queued', 'running'].includes(job.status)
      ? ['取消任务']
      : job.status === 'failed' || job.status === 'cancelled'
        ? ['重新转换', '删除记录和文件']
        : ['删除记录和文件']
    wx.showActionSheet({
      itemList: actions,
      success: (res) => {
        const label = actions[res.tapIndex]
        this.jobAction({
          currentTarget: {
            dataset: {
              id: job.id,
              action: label === '取消任务' ? 'cancel' : label === '重新转换' ? 'retry' : 'delete',
            },
          },
        } as any)
      },
    })
  },
  exportAsset(e: WechatMiniprogram.BaseEvent) {
    wx.showActionSheet({
      itemList: ['转发到微信', '保存到小程序（保留文件）', '仅下载（临时文件）'],
      success: (res) => {
        if (res.tapIndex === 0) this.shareAsset(e)
        if (res.tapIndex === 1) this.saveAsset(e)
        if (res.tapIndex === 2) this.loadAsset(e)
      },
    })
  },
  async ensureAsset(jobId: string, assetId: string): Promise<Asset & { localPath: string }> {
    const job = this.data.jobs.find((item) => item.id === jobId)
    const asset = job?.assets.find((item) => item.id === assetId)
    if (!asset) throw new Error('结果文件不存在')
    if (asset.localPath) return asset as Asset & { localPath: string }
    const path = await downloadAsset(jobId, assetId, asset.sizeBytes)
    this.setData({
      jobs: this.data.jobs.map((item) =>
        item.id === jobId
          ? {
              ...item,
              assets: item.assets.map((row) =>
                row.id === assetId
                  ? { ...row, localPath: path, ...visual(row.fileName, path) }
                  : row,
              ),
            }
          : item,
      ),
    })
    return { ...asset, localPath: path }
  },
  async loadAsset(e: WechatMiniprogram.BaseEvent) {
    try {
      await this.ensureAsset(
        String(e.currentTarget.dataset.job),
        String(e.currentTarget.dataset.asset),
      )
      wx.showToast({ title: '已下载到小程序', icon: 'success' })
    } catch (error) {
      wx.showToast({ title: msg(error), icon: 'none' })
    }
  },
  async openAsset(e: WechatMiniprogram.BaseEvent) {
    const jobId = String(e.currentTarget.dataset.job)
    const assetId = String(e.currentTarget.dataset.asset)
    const selected = this.data.jobs.find((job) => job.id === jobId)?.assets.find((asset) => asset.id === assetId)
    if (selected && !canPreview(selected.fileName, selected.sizeBytes)) {
      wx.showToast({ title: '该格式请导出后打开', icon: 'none' })
      return
    }
    let asset: Asset & { localPath: string }
    try {
      asset = await this.ensureAsset(jobId, assetId)
    } catch (error) {
      wx.showToast({ title: msg(error), icon: 'none' })
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
      ['txt', 'md', 'markdown', 'csv', 'json', 'html', 'xml', 'yaml', 'yml', 'log', 'srt', 'vtt', 'ass', 'ssa'].includes(extension) &&
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
  async shareAsset(e: WechatMiniprogram.BaseEvent) {
    let asset: Asset & { localPath: string }
    try {
      asset = await this.ensureAsset(
        String(e.currentTarget.dataset.job),
        String(e.currentTarget.dataset.asset),
      )
    } catch (error) {
      wx.showToast({ title: msg(error), icon: 'none' })
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
  async saveAsset(e: WechatMiniprogram.BaseEvent) {
    const selected = this.data.jobs.find((job) => job.id === String(e.currentTarget.dataset.job))
      ?.assets.find((asset) => asset.id === String(e.currentTarget.dataset.asset))
    if (selected && selected.sizeBytes >= WX_SAVED_FILE_MAX_BYTES) {
      wx.showToast({ title: '达到微信本地保存上限（100 MB）', icon: 'none' })
      return
    }
    let asset: Asset & { localPath: string }
    try {
      asset = await this.ensureAsset(
        String(e.currentTarget.dataset.job),
        String(e.currentTarget.dataset.asset),
      )
    } catch (error) {
      wx.showToast({ title: msg(error), icon: 'none' })
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
