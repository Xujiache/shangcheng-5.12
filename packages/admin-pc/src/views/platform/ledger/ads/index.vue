<!--
  平台 PC · 门窗利账 · 首页广告管理（#2）
  ─────────────────────────────────────────────
  对接后端 /api/v1/p/ledger/ads（增删改查）。
  运营在此维护小程序首页的广告轮播图：图片地址、跳转、排序、启停。
-->
<template>
  <div class="pf-ledger">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">首页广告</h2>
        <p class="mt-1 text-sm text-g-500">门窗利账小程序首页轮播 banner · 启用中的按排序展示</p>
      </div>
      <div class="pf-actions">
        <ElButton :icon="Refresh" plain @click="load">刷新</ElButton>
        <ElButton type="primary" :icon="Plus" @click="openCreate">新增广告</ElButton>
      </div>
    </div>

    <ElCard shadow="never">
      <ElTable
        v-loading="loading"
        :data="list"
        stripe
        :header-cell-style="{ background: '#FAFBFC', fontWeight: 600 }"
        empty-text="暂无广告，点击右上角新增"
      >
        <ElTableColumn label="图片" width="160">
          <template #default="{ row }">
            <ElImage
              v-if="row.image"
              :src="row.image"
              fit="cover"
              class="pf-ad-thumb"
              :preview-src-list="[row.image]"
              preview-teleported
            />
            <span v-else class="text-g-500">—</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="标题" min-width="160">
          <template #default="{ row }">
            <span>{{ row.title || '—' }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="跳转" min-width="200">
          <template #default="{ row }">
            <span v-if="row.link" class="pf-mono">{{ row.link }}</span>
            <span v-else class="text-g-500">无</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="排序" width="90" align="center" prop="sort" />
        <ElTableColumn label="状态" width="100" align="center">
          <template #default="{ row }">
            <ElSwitch
              :model-value="row.enabled"
              @change="(v: string | number | boolean) => toggleEnabled(row, Boolean(v))"
            />
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
            <ElButton link type="danger" @click="onDelete(row)">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <!-- 新增 / 编辑 -->
    <ElDialog
      v-model="dialogOpen"
      :title="editing ? '编辑广告' : '新增广告'"
      width="520px"
      align-center
      destroy-on-close
    >
      <ElForm :model="form" label-position="top">
        <ElFormItem label="图片地址（公网 URL）" required>
          <ElInput v-model="form.image" placeholder="如 https://cdn.example.com/banner.png" />
        </ElFormItem>
        <div v-if="form.image" class="pf-ad-preview">
          <ElImage :src="form.image" fit="cover" class="pf-ad-preview-img" />
        </div>
        <ElFormItem label="标题（选填）">
          <ElInput
            v-model="form.title"
            maxlength="40"
            show-word-limit
            placeholder="仅后台标识，App 不展示"
          />
        </ElFormItem>
        <ElFormItem label="跳转地址（选填，仅支持站内 /pages/ 路径）">
          <ElInput v-model="form.link" placeholder="如 /pages/membership/index" />
        </ElFormItem>
        <div class="pf-form-row">
          <ElFormItem label="排序（小在前）" class="flex-1">
            <ElInputNumber v-model="form.sort" :min="0" :max="9999" controls-position="right" />
          </ElFormItem>
          <ElFormItem label="启用" class="flex-1">
            <ElSwitch v-model="form.enabled" />
          </ElFormItem>
        </div>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogOpen = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="submit">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Refresh, Plus } from '@element-plus/icons-vue'
  import {
    fetchLedgerAds,
    createLedgerAd,
    updateLedgerAd,
    deleteLedgerAd,
    type LedgerAd
  } from '@/api/ledger'

  defineOptions({ name: 'PlatformLedgerAds' })

  const list = ref<LedgerAd[]>([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    try {
      list.value = await fetchLedgerAds()
    } catch (e: any) {
      ElMessage.error(e?.message || '加载广告列表失败')
    } finally {
      loading.value = false
    }
  }

  // ====== 新增 / 编辑 ======
  const dialogOpen = ref(false)
  const editing = ref(false)
  const editingId = ref('')
  const submitting = ref(false)
  const form = reactive({ image: '', title: '', link: '', sort: 0, enabled: true })

  function resetForm() {
    form.image = ''
    form.title = ''
    form.link = ''
    form.sort = 0
    form.enabled = true
  }

  function openCreate() {
    editing.value = false
    editingId.value = ''
    resetForm()
    dialogOpen.value = true
  }

  function openEdit(row: LedgerAd) {
    editing.value = true
    editingId.value = row.id
    form.image = row.image
    form.title = row.title || ''
    form.link = row.link || ''
    form.sort = row.sort
    form.enabled = row.enabled
    dialogOpen.value = true
  }

  async function submit() {
    if (!form.image.trim()) {
      ElMessage.warning('请填写图片地址')
      return
    }
    submitting.value = true
    try {
      const payload = {
        image: form.image.trim(),
        title: form.title.trim() || undefined,
        link: form.link.trim() || undefined,
        sort: form.sort,
        enabled: form.enabled
      }
      if (editing.value) await updateLedgerAd(editingId.value, payload)
      else await createLedgerAd(payload)
      ElMessage.success('已保存')
      dialogOpen.value = false
      await load()
    } catch (e: any) {
      ElMessage.error(e?.message || '保存失败，请稍后重试')
    } finally {
      submitting.value = false
    }
  }

  async function toggleEnabled(row: LedgerAd, v: boolean) {
    try {
      await updateLedgerAd(row.id, { enabled: v })
      row.enabled = v
      ElMessage.success(v ? '已启用' : '已停用')
    } catch (e: any) {
      ElMessage.error(e?.message || '操作失败')
    }
  }

  async function onDelete(row: LedgerAd) {
    try {
      await ElMessageBox.confirm('确定删除这条广告？删除后不可恢复。', '删除广告', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      })
    } catch {
      return
    }
    try {
      await deleteLedgerAd(row.id)
      ElMessage.success('已删除')
      await load()
    } catch (e: any) {
      ElMessage.error(e?.message || '删除失败')
    }
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .pf-ledger {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
  }

  .pf-page-header {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }

  .pf-actions {
    display: flex;
    gap: 10px;
  }

  .text-g-500 {
    color: #6b7280;
  }

  .pf-mono {
    font-family: SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
    font-size: 13px;
    color: var(--art-gray-700, #374151);
  }

  .pf-ad-thumb {
    width: 120px;
    height: 56px;
    background: #f3f4f6;
    border-radius: 6px;
  }

  .pf-ad-preview {
    margin: -4px 0 12px;
  }

  .pf-ad-preview-img {
    width: 100%;
    height: 130px;
    background: #f3f4f6;
    border-radius: 8px;
  }

  .pf-form-row {
    display: flex;
    gap: 20px;
  }

  .flex-1 {
    flex: 1;
  }
</style>
