<!-- 用户菜单 -->
<template>
  <ElPopover
    ref="userMenuPopover"
    placement="bottom-end"
    :width="240"
    :hide-after="0"
    :offset="10"
    trigger="hover"
    :show-arrow="false"
    popper-class="user-menu-popover"
    popper-style="padding: 5px 16px;"
  >
    <template #reference>
      <img
        class="size-8.5 mr-5 c-p rounded-full max-sm:w-6.5 max-sm:h-6.5 max-sm:mr-[16px]"
        src="@imgs/user/avatar.webp"
        alt="avatar"
      />
    </template>
    <template #default>
      <div class="pt-3">
        <div class="flex-c pb-1 px-0">
          <img
            class="w-10 h-10 mr-3 ml-0 overflow-hidden rounded-full float-left"
            src="@imgs/user/avatar.webp"
          />
          <div class="w-[calc(100%-60px)] h-full">
            <span class="block text-sm font-medium text-g-800 truncate">{{
              userInfo.userName
            }}</span>
          </div>
        </div>
        <ul class="py-4 mt-3 border-t border-g-300/80">
          <div class="security-row c-p" @click="openPwd">修改密码</div>
          <div class="security-row c-p" @click="openPhone">修改手机号</div>
          <div class="log-out c-p" @click="loginOut">
            {{ $t('topBar.user.logout') }}
          </div>
        </ul>
      </div>
    </template>
  </ElPopover>

  <ElDialog
    v-model="pwdDialogVisible"
    title="修改密码"
    width="420px"
    :close-on-click-modal="false"
    @closed="resetPwd"
  >
    <ElForm :model="pwdForm" label-width="100px" @submit.prevent>
      <ElFormItem label="当前密码">
        <ElInput
          v-model="pwdForm.old"
          :type="pwdShow ? 'text' : 'password'"
          placeholder="留空表示首次设置"
          autocomplete="current-password"
        />
      </ElFormItem>
      <ElFormItem label="新密码">
        <ElInput
          v-model="pwdForm.new1"
          :type="pwdShow ? 'text' : 'password'"
          placeholder="至少 6 位"
          autocomplete="new-password"
        />
      </ElFormItem>
      <ElFormItem label="确认新密码">
        <ElInput
          v-model="pwdForm.new2"
          :type="pwdShow ? 'text' : 'password'"
          placeholder="再输入一次"
          autocomplete="new-password"
        />
      </ElFormItem>
      <ElFormItem label-width="100px">
        <ElCheckbox v-model="pwdShow">显示密码</ElCheckbox>
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="pwdDialogVisible = false">取消</ElButton>
      <ElButton type="primary" :loading="pwdSubmitting" @click="submitPwd">确认修改</ElButton>
    </template>
  </ElDialog>

  <ElDialog
    v-model="phoneDialogVisible"
    title="修改手机号"
    width="460px"
    :close-on-click-modal="false"
    @closed="resetPhone"
  >
    <ElForm :model="phoneForm" label-width="110px" @submit.prevent>
      <template v-if="currentPhone">
        <ElFormItem label="原手机号">
          <ElInput :model-value="maskedCurrent" disabled />
        </ElFormItem>
        <ElFormItem label="原手机验证码">
          <div class="flex gap-2 w-full">
            <ElInput v-model="phoneForm.oldCode" placeholder="6 位验证码" />
            <ElButton
              :disabled="phoneForm.oldCountdown > 0 || phoneForm.oldSending"
              @click="sendOldCode"
            >
              {{
                phoneForm.oldCountdown > 0
                  ? `${phoneForm.oldCountdown}s`
                  : phoneForm.oldSending
                    ? '发送中…'
                    : '获取'
              }}
            </ElButton>
          </div>
        </ElFormItem>
      </template>
      <ElFormItem label="新手机号">
        <ElInput v-model="phoneForm.newPhone" placeholder="11 位手机号" maxlength="11" />
      </ElFormItem>
      <ElFormItem label="新手机验证码">
        <div class="flex gap-2 w-full">
          <ElInput v-model="phoneForm.newCode" placeholder="6 位验证码" />
          <ElButton
            :disabled="phoneForm.newCountdown > 0 || phoneForm.newSending"
            @click="sendNewCode"
          >
            {{
              phoneForm.newCountdown > 0
                ? `${phoneForm.newCountdown}s`
                : phoneForm.newSending
                  ? '发送中…'
                  : '获取'
            }}
          </ElButton>
        </div>
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="phoneDialogVisible = false">取消</ElButton>
      <ElButton type="primary" :loading="phoneSubmitting" @click="submitPhone">确认修改</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useUserStore } from '@/store/modules/user'
  import { changePassword, changePhone, sendSmsCode } from '@/api/auth'

  defineOptions({ name: 'ArtUserMenu' })

  const { t } = useI18n()
  const userStore = useUserStore()

  const { getUserInfo: userInfo } = storeToRefs(userStore)
  const userMenuPopover = ref()

  /* ====== 修改密码 ====== */
  const pwdDialogVisible = ref(false)
  const pwdShow = ref(false)
  const pwdSubmitting = ref(false)
  const pwdForm = reactive({ old: '', new1: '', new2: '' })
  function resetPwd() {
    pwdForm.old = ''
    pwdForm.new1 = ''
    pwdForm.new2 = ''
    pwdShow.value = false
  }
  function openPwd() {
    closeUserMenu()
    pwdDialogVisible.value = true
  }
  async function submitPwd() {
    if (!pwdForm.new1 || pwdForm.new1.length < 6) {
      ElMessage.warning('新密码至少 6 位')
      return
    }
    if (pwdForm.new1 !== pwdForm.new2) {
      ElMessage.warning('两次输入的新密码不一致')
      return
    }
    pwdSubmitting.value = true
    try {
      await changePassword({ oldPassword: pwdForm.old, newPassword: pwdForm.new1 })
      ElMessage.success('密码已修改')
      pwdDialogVisible.value = false
    } catch (e: any) {
      ElMessage.error(e?.message || '修改失败')
    } finally {
      pwdSubmitting.value = false
    }
  }

  /* ====== 修改手机号 ====== */
  const phoneDialogVisible = ref(false)
  const phoneSubmitting = ref(false)
  const phoneForm = reactive({
    newPhone: '',
    oldCode: '',
    newCode: '',
    oldCountdown: 0,
    newCountdown: 0,
    oldSending: false,
    newSending: false,
  })
  const currentPhone = computed(() => (userInfo.value as any)?.phone || '')
  const maskedCurrent = computed(() =>
    currentPhone.value
      ? currentPhone.value.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
      : '',
  )
  function resetPhone() {
    phoneForm.newPhone = ''
    phoneForm.oldCode = ''
    phoneForm.newCode = ''
    phoneForm.oldCountdown = 0
    phoneForm.newCountdown = 0
  }
  function openPhone() {
    closeUserMenu()
    phoneDialogVisible.value = true
  }
  async function sendOldCode() {
    if (!currentPhone.value) return
    phoneForm.oldSending = true
    try {
      await sendSmsCode(currentPhone.value)
      ElMessage.success('验证码已发到原手机号')
      phoneForm.oldCountdown = 60
      const t = setInterval(() => {
        phoneForm.oldCountdown--
        if (phoneForm.oldCountdown <= 0) clearInterval(t)
      }, 1000)
    } catch (e: any) {
      ElMessage.error(e?.message || '发送失败')
    } finally {
      phoneForm.oldSending = false
    }
  }
  async function sendNewCode() {
    if (!/^1[3-9]\d{9}$/.test(phoneForm.newPhone)) {
      ElMessage.warning('请输入正确的新手机号')
      return
    }
    phoneForm.newSending = true
    try {
      await sendSmsCode(phoneForm.newPhone)
      ElMessage.success('验证码已发送')
      phoneForm.newCountdown = 60
      const t = setInterval(() => {
        phoneForm.newCountdown--
        if (phoneForm.newCountdown <= 0) clearInterval(t)
      }, 1000)
    } catch (e: any) {
      ElMessage.error(e?.message || '发送失败')
    } finally {
      phoneForm.newSending = false
    }
  }
  async function submitPhone() {
    if (!/^1[3-9]\d{9}$/.test(phoneForm.newPhone)) {
      ElMessage.warning('新手机号格式不正确')
      return
    }
    if (!/^\d{4,6}$/.test(phoneForm.newCode)) {
      ElMessage.warning('请输入新手机号验证码')
      return
    }
    if (currentPhone.value && !/^\d{4,6}$/.test(phoneForm.oldCode)) {
      ElMessage.warning('请输入原手机号验证码')
      return
    }
    phoneSubmitting.value = true
    try {
      await changePhone({
        oldSmsCode: currentPhone.value ? phoneForm.oldCode : undefined,
        newPhone: phoneForm.newPhone,
        newSmsCode: phoneForm.newCode,
      })
      ElMessage.success('手机号已修改')
      phoneDialogVisible.value = false
      // 重拉一次 user-info，让顶栏 / 其它页拿到最新 phone
      userStore.getUserInfo?.()
    } catch (e: any) {
      ElMessage.error(e?.message || '修改失败')
    } finally {
      phoneSubmitting.value = false
    }
  }

  /**
   * 用户登出确认
   */
  const loginOut = (): void => {
    closeUserMenu()
    setTimeout(() => {
      ElMessageBox.confirm(t('common.logOutTips'), t('common.tips'), {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        customClass: 'login-out-dialog'
      }).then(() => {
        userStore.logOut()
      })
    }, 200)
  }

  /**
   * 关闭用户菜单弹出层
   */
  const closeUserMenu = (): void => {
    setTimeout(() => {
      userMenuPopover.value.hide()
    }, 100)
  }
</script>

<style scoped>
  @reference '@styles/core/tailwind.css';

  @layer components {
    .btn-item {
      @apply flex items-center p-2 mb-3 select-none rounded-md cursor-pointer last:mb-0;

      span {
        @apply text-sm;
      }

      .art-svg-icon {
        @apply mr-2 text-base;
      }

      &:hover {
        background-color: var(--art-gray-200);
      }
    }
  }

  .security-row {
    @apply py-2 px-2 text-xs rounded-md transition-all duration-150 hover:bg-g-100;
  }

  .log-out {
    @apply py-1.5
    mt-5
    text-xs
    text-center
    border
    border-g-400
    rounded-md
    transition-all
    duration-200
    hover:shadow-xl;
  }
</style>
