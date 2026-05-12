<!-- 超管工作台切换器（仅 role === 'super-admin' 时显示） -->
<template>
  <ElDropdown
    v-if="isSuperAdmin"
    trigger="click"
    placement="bottom-end"
    @command="handleSwitch"
    class="workspace-switcher"
  >
    <div class="ws-trigger" :class="{ active: isSwitching }">
      <ElIcon class="ws-icon"><component :is="currentIcon" /></ElIcon>
      <span class="ws-text">{{ currentLabel }}</span>
      <ElIcon class="ws-caret"><ArrowDown /></ElIcon>
    </div>
    <template #dropdown>
      <ElDropdownMenu class="workspace-switcher__menu">
        <ElDropdownItem
          command="merchant"
          :class="{ 'is-selected': currentWorkspace === 'merchant' }"
        >
          <ElIcon class="mr-2 text-base"><Shop /></ElIcon>
          <span>商家工作台</span>
          <ElIcon v-if="currentWorkspace === 'merchant'" class="ml-auto">
            <Check />
          </ElIcon>
        </ElDropdownItem>
        <ElDropdownItem
          command="platform"
          :class="{ 'is-selected': currentWorkspace === 'platform' }"
        >
          <ElIcon class="mr-2 text-base"><OfficeBuilding /></ElIcon>
          <span>平台工作台</span>
          <ElIcon v-if="currentWorkspace === 'platform'" class="ml-auto">
            <Check />
          </ElIcon>
        </ElDropdownItem>
      </ElDropdownMenu>
    </template>
  </ElDropdown>
</template>

<script setup lang="ts">
  import { useUserStore } from '@/store/modules/user'
  import { useMenuStore } from '@/store/modules/menu'
  import { resetRouterState } from '@/router/guards/beforeEach'
  import { ElMessage } from 'element-plus'
  import { ArrowDown, Check, OfficeBuilding, Shop } from '@element-plus/icons-vue'

  defineOptions({ name: 'WorkspaceSwitcher' })

  const userStore = useUserStore()
  const menuStore = useMenuStore()
  const router = useRouter()

  const isSuperAdmin = computed(() => userStore.role === 'super-admin')
  const currentWorkspace = computed(() => userStore.currentWorkspace)
  const currentLabel = computed(() =>
    currentWorkspace.value === 'merchant' ? '商家工作台' : '平台工作台'
  )
  const currentIcon = computed(() =>
    currentWorkspace.value === 'merchant' ? Shop : OfficeBuilding
  )

  const isSwitching = ref(false)

  /**
   * 切换工作台
   *
   * 1. 写 userStore.currentWorkspace（持久化由 user store pinia-plugin-persistedstate 处理）
   * 2. 卸载已注册的动态路由（resetRouterState → menuStore.removeAllDynamicRoutes）
   * 3. router.replace 到对应工作台首页 → beforeEach 自动重新拉菜单 + 注册路由
   */
  async function handleSwitch(target: 'merchant' | 'platform') {
    if (target === currentWorkspace.value) return
    isSwitching.value = true
    userStore.setCurrentWorkspace(target)
    // 立即清掉旧动态路由（resetRouterState 是异步的，把它的延时设为 0）
    resetRouterState(0)
    await nextTick()
    const homePath = target === 'merchant' ? '/merchant/dashboard' : '/platform/dashboard'
    await router.replace(homePath)
    ElMessage.success(`已切换至${target === 'merchant' ? '商家' : '平台'}工作台`)
    isSwitching.value = false
  }
</script>

<style scoped lang="scss">
  .workspace-switcher {
    margin-right: 6px;

    .ws-trigger {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 12px;
      border-radius: 8px;
      cursor: pointer;
      background: rgba(255, 77, 45, 0.08);
      color: var(--el-color-primary, #ff4d2d);
      font-size: 13px;
      font-weight: 500;
      transition: all 0.18s ease;

      &:hover,
      &.active {
        background: rgba(255, 77, 45, 0.16);
      }
    }

    .ws-icon {
      font-size: 16px;
    }

    .ws-caret {
      font-size: 12px;
      opacity: 0.7;
    }
  }
</style>

<style>
  .workspace-switcher__menu .el-dropdown-menu__item {
    display: flex;
    align-items: center;
    min-width: 160px;
  }

  .workspace-switcher__menu .el-dropdown-menu__item.is-selected {
    color: var(--el-color-primary, #ff4d2d);
    font-weight: 600;
  }
</style>
