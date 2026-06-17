<!--
  平台 PC · APP 发布管理（#7 软件自更新）
  ─────────────────────────────────────────────
  上传 .apk 到对象存储 + 入库，端上启动时自动检查更新。
  双 Tab：商家版 / 平台版。
-->
<template>
  <div class="pf-app-release">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">APP 发布管理</h2>
        <p class="mt-1 text-sm text-g-500">
          上传商家版 / 平台版 Android APK；端上启动时自动比对 versionCode 触发更新弹窗
        </p>
      </div>
      <ElButton type="primary" :icon="UploadFilled" @click="openCreate"> 新建发布 </ElButton>
    </div>

    <ElTabs v-model="active" class="pf-tabs" @tab-change="reload">
      <ElTabPane label="商家版 APP" name="merchant" />
      <ElTabPane label="平台版 APP" name="platform" />
    </ElTabs>

    <ElCard shadow="never" class="pf-card">
      <ElTable :data="list" stripe v-loading="loading" empty-text="暂无发布">
        <ElTableColumn label="版本" prop="version" width="120">
          <template #default="{ row }">
            <span class="font-medium">v{{ row.version }}</span>
            <ElTag v-if="row.force" type="danger" size="small" class="ml-2">强制</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="versionCode" prop="versionCode" width="130" />
        <ElTableColumn label="包大小" width="120">
          <template #default="{ row }">{{ humanSize(row.size) }}</template>
        </ElTableColumn>
        <ElTableColumn label="更新说明" prop="changelog" show-overflow-tooltip />
        <ElTableColumn label="发布时间" width="180">
          <template #default="{ row }">{{ fmtDate(row.publishedAt) }}</template>
        </ElTableColumn>
        <ElTableColumn label="下载链接" width="120">
          <template #default="{ row }">
            <ElButton link type="primary" @click="copyUrl(row.url)">复制</ElButton>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <ElPopconfirm
              title="确认删除此发布？端上仍在用此版本的用户不会受影响。"
              @confirm="onDelete(row)"
            >
              <template #reference>
                <ElButton link type="danger">删除</ElButton>
              </template>
            </ElPopconfirm>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <!-- 创建发布弹窗 -->
    <ElDialog
      v-model="dialogOpen"
      :title="`新建 ${active === 'merchant' ? '商家版' : '平台版'} 发布`"
      width="560px"
      :close-on-click-modal="!uploading"
    >
      <ElForm :model="form" label-width="100px" :disabled="uploading">
        <ElFormItem label="版本号" required>
          <ElInput v-model="form.version" placeholder="例：1.2.0" maxlength="20" />
        </ElFormItem>
        <ElFormItem label="versionCode" required>
          <ElInputNumber v-model="form.versionCode" :min="1" :step="1" placeholder="120" />
          <div class="text-xs text-g-500 mt-1">
            端上用它比较，必须严格大于当前线上最大版本（{{ maxVersionCode }}）
          </div>
        </ElFormItem>
        <ElFormItem label="更新说明">
          <ElInput
            v-model="form.changelog"
            type="textarea"
            :rows="4"
            placeholder="本次更新内容（端上弹窗会显示）"
            maxlength="400"
            show-word-limit
          />
        </ElFormItem>
        <ElFormItem label="强制更新">
          <ElSwitch v-model="form.force" />
          <div class="text-xs text-g-500 ml-3 inline"> 开启后端上无法跳过此版本 </div>
        </ElFormItem>
        <ElFormItem label="APK 文件" required>
          <ElUpload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            accept=".apk"
            :on-change="onFileChange"
            :on-exceed="onExceed"
          >
            <template #trigger>
              <ElButton>选择 APK</ElButton>
            </template>
            <template #tip>
              <div class="text-xs text-g-500 mt-1">
                仅 .apk · 最大 300MB；上传后会自动保存到对象存储
              </div>
            </template>
          </ElUpload>
        </ElFormItem>
        <ElFormItem v-if="uploading" label="上传进度">
          <ElProgress :percentage="uploadPct" :stroke-width="14" />
        </ElFormItem>
      </ElForm>

      <template #footer>
        <ElButton @click="dialogOpen = false" :disabled="uploading">取消</ElButton>
        <ElButton type="primary" :loading="uploading" @click="onSubmit">
          {{ uploading ? `上传中 ${uploadPct}%` : '发布' }}
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { UploadFilled } from '@element-plus/icons-vue'
  import {
    fetchAppReleases,
    uploadAppRelease,
    deleteAppRelease,
    type AppReleaseRow,
    type AppPlatformKind
  } from '@/api/platform-business'

  defineOptions({ name: 'PlatformAppRelease' })

  const active = ref<AppPlatformKind>('merchant')
  const list = ref<AppReleaseRow[]>([])
  const loading = ref(false)

  const dialogOpen = ref(false)
  const uploading = ref(false)
  const uploadPct = ref(0)
  const pickedFile = ref<File | null>(null)
  const uploadRef = ref<any>(null)

  const form = ref({
    version: '',
    versionCode: 1,
    changelog: '',
    force: false
  })

  const maxVersionCode = computed(() => list.value.reduce((m, r) => Math.max(m, r.versionCode), 0))

  async function reload() {
    loading.value = true
    try {
      list.value = await fetchAppReleases(active.value)
    } finally {
      loading.value = false
    }
  }

  function openCreate() {
    form.value = {
      version: '',
      versionCode: maxVersionCode.value + 1,
      changelog: '',
      force: false
    }
    pickedFile.value = null
    uploadPct.value = 0
    dialogOpen.value = true
    uploadRef.value?.clearFiles?.()
  }

  function onFileChange(file: any) {
    pickedFile.value = file?.raw || null
  }
  function onExceed() {
    ElMessage.warning('一次只能上传一个 APK')
  }

  async function onSubmit() {
    if (!form.value.version.trim()) {
      ElMessage.warning('请填写版本号')
      return
    }
    if (!form.value.versionCode || form.value.versionCode <= maxVersionCode.value) {
      ElMessage.warning(`versionCode 必须 > 当前最大版本（${maxVersionCode.value}）`)
      return
    }
    if (!pickedFile.value) {
      ElMessage.warning('请选择 APK 文件')
      return
    }

    uploading.value = true
    uploadPct.value = 0
    try {
      await uploadAppRelease(
        pickedFile.value,
        {
          platform: active.value,
          version: form.value.version.trim(),
          versionCode: form.value.versionCode,
          changelog: form.value.changelog.trim(),
          force: form.value.force
        },
        (pct) => (uploadPct.value = pct)
      )
      ElMessage.success('发布成功')
      dialogOpen.value = false
      reload()
    } catch (e: any) {
      ElMessage.error(e?.message || '上传失败')
    } finally {
      uploading.value = false
    }
  }

  async function onDelete(row: AppReleaseRow) {
    try {
      await deleteAppRelease(row.id)
      ElMessage.success('已删除')
      reload()
    } catch (e: any) {
      ElMessage.error(e?.message || '删除失败')
    }
  }

  function copyUrl(url: string) {
    navigator.clipboard
      .writeText(url)
      .then(() => ElMessage.success('已复制下载链接'))
      .catch(() => ElMessage.error('复制失败'))
  }

  function humanSize(bytes: number): string {
    if (!bytes) return '--'
    const mb = bytes / (1024 * 1024)
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`
    return `${mb.toFixed(2)} MB`
  }

  function fmtDate(iso: string): string {
    if (!iso) return '--'
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  onMounted(reload)
</script>

<style scoped lang="scss">
  .pf-app-release {
    padding: 24px;
  }

  .pf-page-header {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .pf-tabs {
    margin-bottom: 16px;
  }

  .pf-card {
    border-radius: 12px;
  }

  .text-g-500 {
    color: var(--art-text-gray-500);
  }
</style>
