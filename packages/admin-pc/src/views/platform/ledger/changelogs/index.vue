<!-- 平台 PC · 门窗利账更新日志管理 -->
<template>
  <div class="pf-clog">
    <div class="pf-page-header">
      <div>
        <h2 class="m-0 text-xl font-semibold">更新日志</h2>
        <p class="mt-1 text-sm text-g-500">按版本管理更新日志；客户端首次打开对应版本时自动弹窗</p>
      </div>
      <ElButton type="primary" @click="openCreate">新增日志</ElButton>
    </div>

    <ElCard shadow="never" class="pf-card">
      <ElTable :data="list" v-loading="loading" stripe>
        <ElTableColumn prop="version" label="版本" width="120" />
        <ElTableColumn prop="title" label="标题" min-width="160" />
        <ElTableColumn label="发布" width="90">
          <template #default="{ row }">
            <ElTag :type="row.published ? 'success' : 'info'" size="small">{{
              row.published ? '已发布' : '草稿'
            }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="更新时间" width="180">
          <template #default="{ row }">{{ fmt(row.updatedAt) }}</template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
            <ElButton link type="danger" @click="remove(row)">删除</ElButton>
          </template>
        </ElTableColumn>
        <template #empty>暂无更新日志</template>
      </ElTable>
    </ElCard>

    <ElDialog
      v-model="dialog"
      :title="editing ? '编辑更新日志' : '新增更新日志'"
      width="560px"
      destroy-on-close
    >
      <ElForm :model="form" label-position="top">
        <ElFormItem label="版本号" required>
          <ElInput v-model="form.version" placeholder="如 1.0.3（须与小程序版本一致才会弹窗）" />
        </ElFormItem>
        <ElFormItem label="标题" required>
          <ElInput v-model="form.title" placeholder="如 体验优化" />
        </ElFormItem>
        <ElFormItem label="更新内容（每行一条）">
          <ElInput
            v-model="form.content"
            type="textarea"
            :rows="8"
            placeholder="· 新增 xxx&#10;· 修复 xxx&#10;· 优化 xxx"
          />
        </ElFormItem>
        <ElFormItem label="立即发布">
          <ElSwitch v-model="form.published" />
          <span class="text-xs text-g-500 ml-2">关闭则为草稿，客户端不可见</span>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialog = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="submit">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import {
    fetchLedgerChangelogs,
    createLedgerChangelog,
    updateLedgerChangelog,
    deleteLedgerChangelog,
    type LedgerChangelog
  } from '@/api/ledger'

  defineOptions({ name: 'PlatformLedgerChangelogs' })

  const list = ref<LedgerChangelog[]>([])
  const loading = ref(false)
  const dialog = ref(false)
  const submitting = ref(false)
  const editing = ref('')
  const form = reactive({ version: '', title: '', content: '', published: true })

  function fmt(s: string) {
    if (!s) return '-'
    const d = new Date(s)
    return isNaN(d.getTime()) ? '-' : d.toLocaleString()
  }

  async function load() {
    loading.value = true
    try {
      list.value = await fetchLedgerChangelogs()
    } finally {
      loading.value = false
    }
  }

  function openCreate() {
    editing.value = ''
    form.version = ''
    form.title = ''
    form.content = ''
    form.published = true
    dialog.value = true
  }
  function openEdit(row: LedgerChangelog) {
    editing.value = row.id
    form.version = row.version
    form.title = row.title
    form.content = row.content
    form.published = row.published
    dialog.value = true
  }

  async function submit() {
    if (!form.version.trim() || !form.title.trim()) {
      ElMessage.warning('请填写版本号与标题')
      return
    }
    submitting.value = true
    try {
      if (editing.value) {
        await updateLedgerChangelog(editing.value, { ...form })
        ElMessage.success('已保存')
      } else {
        await createLedgerChangelog({ ...form })
        ElMessage.success('已新增')
      }
      dialog.value = false
      load()
    } catch (e: any) {
      ElMessage.error(e?.message || '保存失败')
    } finally {
      submitting.value = false
    }
  }

  async function remove(row: LedgerChangelog) {
    try {
      await ElMessageBox.confirm(`确定删除版本 ${row.version} 的更新日志？`, '删除确认', {
        type: 'warning'
      })
    } catch {
      return
    }
    try {
      await deleteLedgerChangelog(row.id)
      ElMessage.success('已删除')
      load()
    } catch (e: any) {
      ElMessage.error(e?.message || '删除失败')
    }
  }

  onMounted(load)
</script>

<style scoped lang="scss">
  .pf-clog {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
  }

  .pf-page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .text-g-500 {
    color: #6b7280;
  }

  .pf-card {
    border-radius: 12px;
  }
</style>
