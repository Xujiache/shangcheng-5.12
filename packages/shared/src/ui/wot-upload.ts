/**
 * 让 Wot Upload 负责稳定的上传入口与交互外壳，同时把选图和上传继续交给
 * 现有业务上传流程。业务流程会保留原来的鉴权、压缩、进度和返回值解析。
 */
export function delegateWotUploadChoose(
  option: { resolve: (passed: boolean) => void },
  choose: () => void | Promise<void>,
): void {
  option.resolve(false)
  void choose()
}
