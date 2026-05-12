/**
 * 商家端功能开关 store（从平台拉取后端计算好的结果）
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ResolvedFeatureFlags } from '@jiujiu/shared/types'
import { http } from '../utils/request'

export const useFeatureFlagStore = defineStore('featureFlag', () => {
  const flags = ref<ResolvedFeatureFlags>({
    homeEntry: {},
    roleButton: {},
    sideMenu: {},
  })

  async function fetchFlags() {
    try {
      const data = await http.get<ResolvedFeatureFlags>('/api/v1/m/feature-flags', undefined, { silent: true })
      flags.value = data
    } catch {
      // 失败时保持默认（全部启用），避免阻塞用户操作
    }
  }

  function isHomeEntryEnabled(key: string): boolean {
    return flags.value.homeEntry[key] !== false
  }
  function isRoleButtonEnabled(key: string): boolean {
    return flags.value.roleButton[key] !== false
  }
  function isSideMenuEnabled(key: string): boolean {
    return flags.value.sideMenu[key] !== false
  }

  return {
    flags,
    fetchFlags,
    isHomeEntryEnabled,
    isRoleButtonEnabled,
    isSideMenuEnabled,
  }
})
