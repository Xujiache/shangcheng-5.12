export type AppUpdateCheckSource = 'startup' | 'foreground' | 'poll' | 'manual'

export interface AppUpdatePolicyInput {
  currentVersionCode: number
  latestVersionCode: number
  force: boolean
  source: AppUpdateCheckSource
  dismissedVersionCode?: number
}

/** 纯策略函数：手动和强制更新永远不受本进程“稍后更新”影响。 */
export function shouldPresentAppUpdate(input: AppUpdatePolicyInput): boolean {
  if (!Number.isFinite(input.latestVersionCode) || input.latestVersionCode <= input.currentVersionCode) {
    return false
  }
  if (input.force || input.source === 'manual') return true
  return input.dismissedVersionCode !== input.latestVersionCode
}
