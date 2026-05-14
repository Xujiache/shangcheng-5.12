<!--
  忘记密码 · 联系超管重置提示页
  -------------------------------------------------
  原 `register` 函数是 `async () => {}` 空实现，点击「找回密码」毫无反馈。
  产品决策：自助重置需要先有登录态超管才能调 `/p/admins/:id/reset-password`，
  不适合「忘记密码」这种无登录态场景，因此前端走「联系超管」提示页是最合理设计。
  视觉上和 login / register 保持一致（LoginLeftView + AuthTopBar + 同色调）。
-->
<template>
  <div class="flex w-full h-screen">
    <LoginLeftView />

    <div class="relative flex-1">
      <AuthTopBar />

      <div class="auth-right-wrap">
        <div class="form">
          <h3 class="title">找回密码</h3>
          <p class="sub-title">B 端账号密码由平台超管统一管理</p>

          <div class="notice-card">
            <div class="notice-icon">
              <ArtSvgIcon icon="ri:lock-password-line" />
            </div>
            <div class="notice-body">
              <div class="notice-title">忘记密码了？</div>
              <p class="notice-desc">
                出于安全考虑，平台不开放自助重置入口。<br />
                请联系平台超级管理员重置密码，超管会在「权限管理 → 管理员账号」中为你
                生成新密码或重置链接。
              </p>
              <ul class="notice-list">
                <li>说明你的登录账号 / 手机号</li>
                <li>提供身份核实信息（所属商户、角色）</li>
                <li>收到新密码后请立即登录修改</li>
              </ul>
              <div class="notice-contact">
                <div class="contact-row">
                  <ArtSvgIcon icon="ri:mail-line" class="text-theme" />
                  <span class="contact-label">超管邮箱</span>
                  <b class="contact-value">admin@ewsn.top</b>
                  <ElButton link type="primary" size="small" @click="copy('admin@ewsn.top')">
                    复制
                  </ElButton>
                </div>
              </div>
            </div>
          </div>

          <div style="margin-top: 24px">
            <ElButton class="w-full custom-height" type="primary" @click="toLogin" v-ripple>
              返回登录
            </ElButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'

  defineOptions({ name: 'ForgetPassword' })

  const router = useRouter()

  function toLogin() {
    router.push({ name: 'Login' })
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      ElMessage.success('已复制：' + text)
    } catch {
      ElMessage.warning('复制失败，请手动选中文本')
    }
  }
</script>

<style scoped>
  @import '../login/style.css';

  .notice-card {
    display: flex;
    gap: 14px;
    padding: 18px;
    margin-top: 18px;
    background: linear-gradient(135deg, rgb(255 77 45 / 6%), rgb(255 122 69 / 3%));
    border: 1px solid rgb(255 77 45 / 15%);
    border-radius: 12px;
  }

  .notice-icon {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    font-size: 22px;
    color: #fff;
    background: var(--el-color-primary, #ff4d2d);
    border-radius: 10px;
  }

  .notice-body {
    flex: 1;
    min-width: 0;
  }

  .notice-title {
    margin-bottom: 8px;
    font-size: 15px;
    font-weight: 600;
    color: var(--art-gray-800, #1f2937);
  }

  .notice-desc {
    margin: 0 0 10px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--art-gray-600, #4b5563);
  }

  .notice-list {
    padding-left: 18px;
    margin: 0 0 12px;
    font-size: 12px;
    line-height: 1.8;
    color: var(--art-gray-500, #6b7280);
  }

  .notice-contact {
    padding-top: 10px;
    border-top: 1px dashed rgb(255 77 45 / 20%);
  }

  .contact-row {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 13px;
  }

  .contact-label {
    color: var(--art-gray-500, #6b7280);
  }

  .contact-value {
    font-family: ui-monospace, 'SF Mono', Consolas, monospace;
    font-weight: 600;
    color: var(--art-gray-800, #1f2937);
  }

  .text-theme {
    color: var(--el-color-primary, #ff4d2d);
  }
</style>
