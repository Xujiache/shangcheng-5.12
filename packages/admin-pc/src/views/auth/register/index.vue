<!--
  注册页 · B 端管理后台不开放自助注册
  -------------------------------------------------
  原本是 setTimeout 假成功流程，任何人随便输几个字段就能进系统。
  产品决策：B 端后台不应公开注册，统一改为"联系超管"提示页。
  视觉上仍保留 LoginLeftView + AuthTopBar 的整体布局，避免和 login/forget-password
  风格脱节；如果以后接入企业邀请码注册，再恢复表单 UI 即可。
-->
<template>
  <div class="flex w-full h-screen">
    <LoginLeftView />

    <div class="relative flex-1">
      <AuthTopBar />

      <div class="auth-right-wrap">
        <div class="form">
          <h3 class="title">账号申请</h3>
          <p class="sub-title">本系统为 B 端管理后台，不开放自助注册</p>

          <div class="notice-card">
            <div class="notice-icon">
              <ArtSvgIcon icon="ri:shield-user-line" />
            </div>
            <div class="notice-body">
              <div class="notice-title">需要管理员账号？</div>
              <p class="notice-desc">
                出于安全与合规要求，平台账号统一由超级管理员开通。<br />
                请将以下信息提交给平台超管，由超管在「权限管理」中为你开通账号：
              </p>
              <ul class="notice-list">
                <li>申请人姓名 / 手机号</li>
                <li>所属商户 / 部门</li>
                <li>预期角色（厂家 / 门店 / 平台运营 / 审核员）</li>
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

          <div class="mt-5 text-sm text-g-600 text-center">
            <span>已有账号？</span>
            <RouterLink class="text-theme" :to="{ name: 'Login' }">立即登录</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'

  defineOptions({ name: 'Register' })

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
