import { reactive } from 'vue'

type Callback<T> = (result: T) => void

interface NativeLikeOptions {
  title?: string
  content?: string
  icon?: string
  duration?: number
  mask?: boolean
  showCancel?: boolean
  cancelText?: string
  confirmText?: string
  itemList?: string[]
  success?: Callback<any>
  fail?: Callback<any>
  complete?: Callback<any>
  editable?: boolean
  placeholderText?: string
  confirmColor?: unknown
  cancelColor?: unknown
  [key: string]: unknown
}

interface WotToastLike {
  show(options: any): void
  success(options: any): void
  error(options: any): void
  info(options: any): void
  loading(options: any): void
  close(): void
}

interface WotMessageLike {
  alert(options: any): Promise<any>
  confirm(options: any): Promise<any>
  prompt(options: any): Promise<any>
}

let toastApi: WotToastLike | null = null
let messageApi: WotMessageLike | null = null
const pendingToasts: NativeLikeOptions[] = []

let actionResolve: ((index: number) => void) | null = null
let actionReject: (() => void) | null = null

export const appFeedbackState = reactive({
  actionVisible: false,
  actionItems: [] as Array<{ name: string }>,
  setActionVisible(value: boolean) {
    this.actionVisible = value
    if (!value && actionReject) {
      const reject = actionReject
      actionResolve = null
      actionReject = null
      reject()
    }
  },
  selectAction(event: { index?: number }) {
    const index = Number(event?.index ?? 0)
    this.actionVisible = false
    const resolve = actionResolve
    actionResolve = null
    actionReject = null
    resolve?.(index)
  },
  cancelAction() {
    this.actionVisible = false
    const reject = actionReject
    actionResolve = null
    actionReject = null
    reject?.()
  },
})

function toToastPayload(options: NativeLikeOptions) {
  return {
    msg: options.title || options.content || '',
    duration: options.duration ?? 2000,
    cover: options.mask === true,
  }
}

export function bindWotFeedback(apis: { toast: WotToastLike; message: WotMessageLike }) {
  toastApi = apis.toast
  messageApi = apis.message
  pendingToasts.splice(0).forEach((options) => appFeedback.showToast(options))
}

export const appFeedback = {
  showToast(options: NativeLikeOptions | string) {
    const normalized = typeof options === 'string' ? { title: options } : options
    if (!toastApi) {
      pendingToasts.push(normalized)
      return
    }
    const payload = toToastPayload(normalized)
    if (normalized.icon === 'success') toastApi.success(payload)
    else if (normalized.icon === 'error') toastApi.error(payload)
    else toastApi.info(payload)
    const result = { errMsg: 'showToast:ok' }
    normalized.success?.(result)
    normalized.complete?.(result)
  },
  showLoading(options: NativeLikeOptions | string) {
    const normalized = typeof options === 'string' ? { title: options } : options
    if (!toastApi) {
      pendingToasts.push({ ...normalized, duration: 0, mask: true })
      return
    }
    toastApi.loading({
      ...toToastPayload(normalized),
      duration: 0,
      cover: normalized.mask !== false,
    })
  },
  hideLoading() {
    toastApi?.close()
  },
  hideToast() {
    toastApi?.close()
  },
  async showModal(options: NativeLikeOptions) {
    try {
      if (!messageApi) throw new Error('message box is not ready')
      const method = options.editable
        ? messageApi.prompt
        : options.showCancel === false
          ? messageApi.alert
          : messageApi.confirm
      const result = await method({
        title: options.title || '',
        msg: options.content || '',
        confirmButtonText: options.confirmText || '确定',
        cancelButtonText: options.cancelText || '取消',
        inputPlaceholder: options.placeholderText || '',
      })
      const nativeResult = { confirm: true, cancel: false, content: result?.value ?? '' }
      options.success?.(nativeResult)
      options.complete?.(nativeResult)
      return nativeResult
    } catch (error) {
      const nativeResult = { confirm: false, cancel: true }
      options.success?.(nativeResult)
      options.complete?.(nativeResult)
      return nativeResult
    }
  },
  showActionSheet(options: NativeLikeOptions) {
    appFeedbackState.actionItems = (options.itemList ?? []).map((name) => ({ name }))
    appFeedbackState.actionVisible = true
    return new Promise<{ tapIndex: number }>((resolve, reject) => {
      actionResolve = (tapIndex) => {
        const result = { tapIndex }
        options.success?.(result)
        options.complete?.(result)
        resolve(result)
      }
      actionReject = () => {
        const result = { errMsg: 'showActionSheet:fail cancel' }
        options.fail?.(result)
        options.complete?.(result)
        reject(result)
      }
    })
  },
}

export type AppFeedbackState = typeof appFeedbackState
