<!-- 登录页面 · 经纬科技 -->
<template>
  <div class="flex w-full h-screen">
    <LoginLeftView />

    <div class="relative flex-1">
      <AuthTopBar />

      <div class="auth-right-wrap">
        <div class="form">
          <h3 class="title">{{ systemName }}</h3>
          <p class="sub-title">商家 / 平台一体化管理控制台 · 智能登录</p>
          <ElForm
            ref="formRef"
            :model="formData"
            :rules="rules"
            :key="formKey"
            @keyup.enter="handleSubmit"
            style="margin-top: 25px"
          >
            <ElFormItem prop="username">
              <ElInput
                class="custom-height"
                placeholder="请输入账号（如 merchant@demo）"
                v-model.trim="formData.username"
              />
            </ElFormItem>
            <ElFormItem prop="password">
              <ElInput
                class="custom-height"
                placeholder="请输入密码"
                v-model.trim="formData.password"
                type="password"
                autocomplete="off"
                show-password
              />
            </ElFormItem>

            <div class="flex-cb mt-2 text-sm">
              <ElCheckbox v-model="formData.rememberPassword">记住账号</ElCheckbox>
              <RouterLink class="text-theme" :to="{ name: 'ForgetPassword' }">
                忘记密码？
              </RouterLink>
            </div>

            <div style="margin-top: 30px">
              <ElButton
                class="w-full custom-height"
                type="primary"
                @click="handleSubmit"
                :loading="loading"
                v-ripple
              >
                登录
              </ElButton>
            </div>
          </ElForm>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import AppConfig from '@/config'
  import { useUserStore } from '@/store/modules/user'
  import { useI18n } from 'vue-i18n'
  import { HttpError } from '@/utils/http/error'
  import { fetchLogin, fetchGetUserInfo } from '@/api/auth'
  import { resetRouteInitState } from '@/router/guards/beforeEach'
  import { ElNotification, type FormInstance, type FormRules } from 'element-plus'

  defineOptions({ name: 'Login' })

  const { locale } = useI18n()
  const formKey = ref(0)
  watch(locale, () => {
    formKey.value++
  })

  const userStore = useUserStore()
  const router = useRouter()
  const route = useRoute()

  const systemName = AppConfig.systemInfo.name
  const formRef = ref<FormInstance>()

  const formData = reactive({
    username: '',
    password: '',
    rememberPassword: true
  })

  const rules = computed<FormRules>(() => ({
    username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
    password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
  }))

  const loading = ref(false)

  // 角色 → 工作台映射（与 user store 的 effectiveRole 计算口径保持一致）
  function pickWorkspace(roles: string[] = []): 'merchant' | 'platform' | null {
    if (roles.includes('super-admin')) {
      // 超管：保留上次工作台选择，首次默认 platform
      return userStore.currentWorkspace || 'platform'
    }
    if (roles.some((r) => r === 'merchant' || r === 'factory' || r === 'store')) {
      return 'merchant'
    }
    if (roles.some((r) => r === 'platform' || r === 'admin')) {
      return 'platform'
    }
    return null
  }

  // 登录
  async function handleSubmit() {
    if (!formRef.value) return
    try {
      const valid = await formRef.value.validate()
      if (!valid) return
      loading.value = true

      const { username, password } = formData
      const { token, refreshToken } = await fetchLogin({
        userName: username,
        password
      })
      if (!token) throw new Error('Login failed - no token received')

      userStore.setToken(token, refreshToken)
      userStore.setLoginStatus(true)

      // 拿到 token 后立即拉一次用户信息，依据真实后端返回的 roles 决定工作台
      let nickName: string | undefined
      try {
        const userInfo = await fetchGetUserInfo()
        userStore.setUserInfo(userInfo)
        nickName = (userInfo as any)?.nickName || (userInfo as any)?.userName
        const ws = pickWorkspace(userInfo.roles)
        if (ws) userStore.setCurrentWorkspace(ws)
      } catch (e) {
        // 拉用户信息失败不影响登录跳转；路由守卫会再尝试一次
        console.warn('[Login] fetchGetUserInfo 失败，留给路由守卫处理：', e)
      }

      // 重置上次失败留下的标记，确保新会话能跑动态路由初始化
      resetRouteInitState()
      showLoginSuccessNotice(nickName)

      const redirect = route.query.redirect as string
      router.push(redirect || '/')
    } catch (error) {
      if (error instanceof HttpError) {
        ElNotification({
          title: '登录失败',
          type: 'error',
          duration: 2500,
          zIndex: 10000,
          message: error.message
        })
      } else {
        console.error('[Login] Unexpected error:', error)
      }
    } finally {
      loading.value = false
    }
  }

  function showLoginSuccessNotice(nickName?: string) {
    setTimeout(() => {
      ElNotification({
        title: '登录成功',
        type: 'success',
        duration: 2500,
        zIndex: 10000,
        message: `${nickName ? `欢迎回来 ${nickName} · ` : ''}${systemName}`
      })
    }, 600)
  }
</script>

<style scoped>
  @import './style.css';
</style>
