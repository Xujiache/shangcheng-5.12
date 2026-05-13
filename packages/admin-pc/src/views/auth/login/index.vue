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
  import { fetchLogin } from '@/api/auth'
  import { resetRouteInitState } from '@/router/guards/beforeEach'
  import { MOCK_ACCOUNTS } from '@/api/mock-accounts'
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

      // 超管首次登录默认进平台工作台（CONSENSUS · Q5）
      const acc = MOCK_ACCOUNTS.find((a) => a.userName === username)
      if (acc?.roleKey === 'super-admin') {
        // 保留上次工作台选择，首次默认 platform
        if (!userStore.currentWorkspace) {
          userStore.setCurrentWorkspace('platform')
        }
      } else if (acc?.roleKey === 'merchant') {
        userStore.setCurrentWorkspace('merchant')
      } else if (acc?.roleKey === 'platform') {
        userStore.setCurrentWorkspace('platform')
      }

      userStore.setToken(token, refreshToken)
      userStore.setLoginStatus(true)
      // 重置上次失败留下的标记，确保新会话能跑动态路由初始化
      resetRouteInitState()
      showLoginSuccessNotice(acc?.nickName)

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

  .demo-panel {
    margin-top: 22px;
    padding-top: 18px;
    border-top: 1px dashed var(--art-border-color, #e5e7eb);
  }

  :deep(.el-collapse) {
    --el-collapse-border-color: transparent;
    border: none;
  }

  :deep(.el-collapse-item__header),
  :deep(.el-collapse-item__wrap) {
    background: transparent;
    border: none;
  }

  :deep(.el-collapse-item__content) {
    padding-bottom: 0;
  }

  .demo-title {
    display: inline-flex;
    align-items: center;
    font-size: 13px;
    color: var(--art-gray-600, #6b7280);
  }

  .demo-cards {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    margin-top: 4px;
  }

  .demo-card {
    padding: 10px 14px;
    border-radius: 10px;
    border: 1px solid var(--art-border-color, #e5e7eb);
    background: var(--art-bg-color, #fff);
    cursor: pointer;
    transition: all 0.18s ease;
  }

  .demo-card:hover {
    border-color: var(--el-color-primary, #ff4d2d);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px -8px rgba(255, 77, 45, 0.35);
  }

  .demo-card__row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
  }

  .demo-card__sub {
    margin-top: 4px;
    font-size: 12px;
    color: var(--art-gray-500, #9ca3af);
  }

  .demo-card__role {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    background: rgba(255, 77, 45, 0.1);
    color: var(--el-color-primary, #ff4d2d);
  }

  .demo-card.platform .demo-card__role {
    background: rgba(64, 158, 255, 0.1);
    color: #409eff;
  }

  .demo-card.super-admin .demo-card__role {
    background: rgba(146, 84, 222, 0.1);
    color: #9254de;
  }

  .demo-card__name {
    font-weight: 600;
    color: var(--art-gray-800, #1f2937);
  }

  .demo-card__pwd {
    color: var(--art-gray-500, #9ca3af);
  }
</style>
