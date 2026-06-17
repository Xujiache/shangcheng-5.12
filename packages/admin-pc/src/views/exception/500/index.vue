<!--
  500 页面 · 增强版
  - 展示详细错误信息（便于排查菜单/路由/权限初始化失败原因）
  - 提供 3 个恢复入口：重新尝试 / 重新登录 / 返回首页
-->
<template>
  <div class="page-content !border-0 !bg-transparent min-h-screen flex-cc">
    <div class="flex-cc max-md:!block max-md:text-center" style="gap: 60px">
      <ThemeSvg :src="imgUrl" size="100%" class="!w-100" />
      <div class="w-100 max-md:mx-auto max-md:mt-10 max-md:w-full max-md:text-center">
        <p class="text-2xl font-bold mb-2 max-md:text-xl" style="color: #ff4d2d"
          >抱歉，服务器出错了</p
        >
        <p class="text-sm leading-6 text-g-500 mb-4">
          管理后台在初始化路由或拉取菜单时遇到错误，可以选择以下任一方式恢复：
        </p>

        <!-- 错误详情（折叠展示） -->
        <div v-if="errInfo" class="err-card">
          <div class="err-head" @click="errOpen = !errOpen">
            <ElIcon class="err-icon"><Warning /></ElIcon>
            <span class="err-title">{{ errInfo.message }}</span>
            <span class="err-code" v-if="errInfo.code != null">code: {{ errInfo.code }}</span>
            <ElIcon class="err-toggle" :class="{ open: errOpen }"><ArrowDown /></ElIcon>
          </div>
          <pre v-if="errOpen && errInfo.stack" class="err-stack">{{ errInfo.stack }}</pre>
        </div>

        <div class="flex gap-3 mt-6 max-md:justify-center" style="flex-wrap: wrap">
          <ElButton type="primary" size="large" @click="retryInit" v-ripple :loading="retrying">
            <ElIcon class="mr-1"><Refresh /></ElIcon>
            重新尝试
          </ElButton>
          <ElButton type="warning" size="large" @click="relogin" v-ripple>
            <ElIcon class="mr-1"><SwitchButton /></ElIcon>
            重新登录
          </ElButton>
          <ElButton size="large" @click="backHome" v-ripple>
            <ElIcon class="mr-1"><HomeFilled /></ElIcon>
            返回首页
          </ElButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { ArrowDown, HomeFilled, Refresh, SwitchButton, Warning } from '@element-plus/icons-vue'
  import imgUrl from '@imgs/svg/500.svg'
  import { useCommon } from '@/hooks/core/useCommon'
  import { useUserStore } from '@/store/modules/user'
  import { getLastRouteInitError, resetRouteInitState } from '@/router/guards/beforeEach'
  defineOptions({ name: 'Exception500' })

  const router = useRouter()
  const { homePath } = useCommon()
  const userStore = useUserStore()

  const errInfo = ref<{ message: string; code?: number; stack?: string } | null>(null)
  const errOpen = ref(false)
  const retrying = ref(false)

  onMounted(() => {
    errInfo.value = getLastRouteInitError()
  })

  /** 重新尝试：清除失败标记后重新跳到首页 / 用户原目标路径 */
  const retryInit = async () => {
    retrying.value = true
    resetRouteInitState()
    // 给冷却清理一点缓冲，避免守卫还在 cooldown 内
    await new Promise((r) => setTimeout(r, 100))
    const target = homePath.value || '/'
    router.replace(target).finally(() => {
      retrying.value = false
    })
  }

  /** 重新登录：清空所有 token / 用户信息，回到登录页 */
  const relogin = () => {
    resetRouteInitState()
    userStore.logOut()
  }

  /** 返回首页（会触发守卫重新初始化） */
  const backHome = () => {
    resetRouteInitState()
    router.replace(homePath.value || '/')
  }
</script>

<style scoped>
  .err-card {
    padding: 12px 16px;
    margin-top: 12px;
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
    background: rgb(255 77 45 / 6%);
    border: 1px solid rgb(255 77 45 / 20%);
    border-radius: 12px;
  }

  .err-head {
    display: flex;
    gap: 8px;
    align-items: center;
    cursor: pointer;
    user-select: none;
  }

  .err-icon {
    flex-shrink: 0;
    font-size: 18px;
    color: #ff4d2d;
  }

  .err-title {
    flex: 1;
    font-size: 13px;
    color: #c30;
    word-break: break-word;
  }

  .err-code {
    padding: 2px 8px;
    font-size: 11px;
    color: #999;
    background: rgb(0 0 0 / 4%);
    border-radius: 4px;
  }

  .err-toggle {
    flex-shrink: 0;
    color: #999;
    transition: transform 0.2s ease;
  }

  .err-toggle.open {
    transform: rotate(180deg);
  }

  .err-stack {
    max-height: 200px;
    padding: 8px;
    margin-top: 8px;
    overflow: auto;
    font-size: 11px;
    color: #666;
    word-break: break-all;
    white-space: pre-wrap;
    background: #fff;
    border-radius: 8px;
  }
</style>
